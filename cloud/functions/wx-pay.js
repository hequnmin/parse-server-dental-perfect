"use strict";
/* global Parse*/

Parse.Cloud.define('wx-pay', async function (request, response) {
  console.log('wx-pay :', request);
  var params = request.params;
  var orderObjectId = params.orderObjectId;

  //1.获取当前用户的openid
  const wxMiniLogin = require("../service/wx-mini-login");
  const userWxLoginData = await wxMiniLogin.wxLogin(params.code);
  // console.log("userWxLoginData:", userWxLoginData);
  if (!("openid" in userWxLoginData)) {
    //输出获取失败的信息
    response.error(userWxLoginData);
    return
  }
  const openid = userWxLoginData.openid;
  //2.获取订单数据
  const serviceOrder = require('../service/order');

  const order = await serviceOrder.getOrderByObjectId(orderObjectId);
  //3.统一下单
  const config = require('../service/config');
  const base = await config.getConfigByKeys(["miniAppid", "mchId", "mchPartnerKey"]);

  var payInfo = {
    openid: openid,
    body: '订单编号：' + order.get("orderSn"),
    out_trade_no: order.get("orderSn"),
    //TODO total_fee: order.get("orderAmount"),
    total_fee: parseInt(1),
    spbill_create_ip: ''
  };
  const wxPay = require('../service/wx-pay');
  // var result = await wxPay.createUnifiedOrder(base, payInfo);

  wxPay.createUnifiedOrder(base, payInfo).then(function (res) {
    const returnParams = {
      'appId': res.appid,
      'timeStamp': parseInt(Date.now() / 1000) + '',
      'nonceStr': res.nonce_str,
      'package': 'prepay_id=' + res.prepay_id,
      'signType': 'MD5'
    };
    returnParams.paySign = wxPay.getSign(returnParams, base.mchPartnerKey);
    response.success(returnParams);
  }).catch(function (res) {
    console.log("支付失败", res);
    response.error("支付失败");
  });


});
