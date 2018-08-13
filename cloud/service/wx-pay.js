"use strict";
/* global Parse*/

// const crypto = require('crypto');

const xml2js = require('xml2js');

function createUnifiedOrder(base, payInfo) {
  return new Promise(async (resolve, reject) => {

    const url = `https://api.mch.weixin.qq.com/pay/unifiedorder`;
    const notifyUrl = 'https://api.becheer.com.cn/WxPayNotify';

    var params = {
      appid: base.miniAppid,
      mch_id: base.mchId,
      nonce_str: "123",
      sign: "",
      body: payInfo.body,
      out_trade_no: payInfo.out_trade_no,
      total_fee: payInfo.total_fee,
      spbill_create_ip: payInfo.spbill_create_ip,
      notify_url: notifyUrl,
      trade_type: "JSAPI",
      openid: payInfo.openid, // 用户openid
    };
    //计算签名
    params.sign = getSign(params, base.mchPartnerKey);

    //json转xml
    var builder = new xml2js.Builder();  // JSON->xml

    Parse.Cloud.httpRequest({
      method: 'POST',
      url: url,
      body: builder.buildObject(params)
    }).then(function (httpResponse) {
      console.log(httpResponse.text);
      var xmlParser = new xml2js.Parser({explicitArray: false, ignoreAttrs: true}); // xml -> json
      xmlParser.parseString(httpResponse.text, function (err, res) {
        if (res.xml.return_code === "SUCCESS") {
          resolve(res.xml);
        } else {
          reject(res);
        }
      });
    }, function (httpResponse) {
      console.error('Request failed with response code ' + httpResponse.status);
      reject(httpResponse);
    }).catch(function (res) {
      reject(res);
    });
  })
}

function getSign(obj, partnerKey) {
  var arr = [];
  for (const key in obj) {
    if (obj[key] != '' && key != "sign") {
      arr.push(`${key}=${obj[key]}`);
    }
  }
  arr = arr.sort();
  var str = arr.join("&") + `&key=${partnerKey}`;
  const md5 = require('md5');
  console.log("签名：", str, md5(str).toUpperCase());
  return md5(str).toUpperCase();
}


function onWxPayNotify(data) {
  return new Promise((resolve, reject) => {

    const xmlParser = new xml2js.Parser({explicitArray: false, ignoreAttrs: true}); // xml -> json
    xmlParser.parseString(data, async function (err, res) {
      console.log(res);
      if (res.xml.return_code === "SUCCESS" && res.xml.result_code === "SUCCESS") {
        // resolve(res.xml);
        const object = res.xml;
        const config = require('./config');
        const base = await config.getConfigByKeys(["miniAppid", "mchId", "mchPartnerKey"]);
        //1.校验签名
        //TODO 根据appid区分支付来源：小程序、公众号、APP，获取对应的mchPartnerKey
        if (!(getSign(object, base.mchPartnerKey) === object.sign)) {
          console.log("签名校验失败");
          reject(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名校验失败]]></return_msg></xml>`);
          return
        }
        //2.保存通知记录
        const WxPayNotify = Parse.Object.extend('WxPayNotify');
        const wxPayNotify = new WxPayNotify();
        const result = await wxPayNotify.save(object);
        console.log(result);
        //3.匹配商户订单号out_trade_no，反写订单支付状态
        const queryOrder = new Parse.Query('Order');

        queryOrder.equalTo("orderSn", object.out_trade_no).find().then(function (results) {
          if (results.length !== 1) {
            reject(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`);
            return
          }
          const order = results[0];
          console.log("查询订单:", order);
          // 3.1判断订单是否已支付
          if (order.get("status") !== 0) {
            // TODO 用户短时间内在多个支付渠道进行该订单的支付
            // 如：小程序的商户是m1,App的商户m2,用户极短时间内在小程序和APP上均对此订单进行了支付，导致订单出现重复支付的情况。
            // 如果小程序的商户和App的商户使用的是同一个商户，就不会出现重复支付的情况。
            reject(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单重复支付]]></return_msg></xml>`);
            return
          }
          // 3.2反写支付状态
          order.set("isPaid", 1);
          order.set("status", 1);
          order.set("paidAt", stringToDate(object.time_end));
          order.save().then(function (res) {
            console.log("反写订单:", res);
            //3.3回复微信成功
            resolve(`<xml><return_code><![CDATA[SUCCESS]]></return_code> <return_msg><![CDATA[OK]]></return_msg></xml>`);
            return

          }).catch(function (res) {
            console.log("反写订单失败:", res);
            reject(`<xml><return_code><![CDATA[FAIL]]></return_code> <return_msg><![CDATA[订单不存在]]></return_msg></xml>`);
            return
          })
        });
      } else {
        reject(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[]]></return_msg></xml>`);
      }
    });

  })
}

/*
 *字符串时间格式yyyyMMddHHmmss转为Date类型
 * */
function stringToDate(date) {
  const year = date.substring(0, 4);
  const month = date.substring(4, 6);
  const day = date.substring(6, 8);
  const hour = date.substring(8, 10);
  const minute = date.substring(10, 12);
  const second = date.substring(12, 14);
  const date2 = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  // console.log(date2);
  return new Date(date2);
}

module.exports = {
  createUnifiedOrder: createUnifiedOrder,
  getSign: getSign,
  onWxPayNotify: onWxPayNotify
};

