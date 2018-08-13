# parse-server-bee
a parse-server instance for bee project

## API

### Config
|Parameter|Type|Value|
|----|----|----|
|smsProvider|String|'17int'|
|smsProviders|Array|[{"providerId":"17int","url":"http://...","body":{...}}]|

* smsProviders

```javascript
  // 短信提供商数据格式
  const smsProviders = [{
    providerId: '17int',
    url: 'http://www.17int.cn/xxsmsweb/smsapi/send.json',
    body: {
      account: 's11050003',
      password: '5D93CEB70E2BF5DAA84EC3D0CD2C731A',
      requestId: '',
      extno: '',
      mobile: '',
      content: '',
    },
  }, {
    providerId: 'submail',
    url: 'https://api.mysubmail.com/message/send.json',
    body: {
      appid: '23548',
      signature: '8396f90936416d41c544e9e49d3e262f',
      to: '',
      content: '【Becheer】',
    }
  }];
```

### Functions

#### sms

* SmsSend

```curl
curl -X POST \
  http://localhost:1338/parse/functions/SmsSend \
  -H 'Content-Type: application/json' \
  -H 'X-Parse-Application-Id: bee' \
  -d '{
	"mobile":"13927301011",
	"content": "验证码：0934，十分钟内有效，如非本人操作请忽略。"
}'
```

* SmsRequestResetPassword

```curl
curl -X POST \
  http://localhost:1338/parse/functions/SmsRequestResetPassword \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: cef19ee3-0cd4-4226-844f-78e3200be084' \
  -H 'X-Parse-Application-Id: bee' \
  -d '{
	"mobile":"13927301011"
}'
```

* SmsAcceptResetPassword

```curl
curl -X POST \
  http://localhost:1338/parse/functions/SmsAcceptResetPassword \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: c797f675-d3e0-4887-9f78-182f4c6a2caf' \
  -H 'X-Parse-Application-Id: bee' \
  -d '{
	"mobile":"13927301011",
	"code": "7093",
	"token": "eLrNsocVE3UXoVYPaiZ0ahPUk",
	"password": "e10adc3949ba59abbe56e057f20f883e"
}'
```

#### Order

* Order

```curl
curl -X POST \
  http://localhost:1338/parse/functions/Order \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: f54f8897-ddab-4b9a-8ef0-be281c3b985a' \
  -H 'X-Parse-Application-Id: bee' \
  -H 'X-Parse-Session-Token: r:2db117e2ccc64b51ae88692f98347515' \
  -d '{
	"addressRealName": "廖健宏",
	"addressMobile": "15802027253",
	"addressProvince": "广东省",
	"addressCity": "广州市",
	"addressArea": "天河区",
	"addressAddress": "达维商务中心",
	"buyerRemark": "请尽快发货",
	"sellerRemark": "多谢关顾本店",
	"status": 0,
	"orderItem": [
    {
      "pointerGoods": {
        "__type": "Pointer",
        "className": "Goods",
        "objectId": "60kbexlWgB"
      },
      "pointerGoodsSku": {
        "__type": "Pointer",
        "className": "GoodsSku",
        "objectId": "rG5GRAQZiR"
      },
      "total": 100,
      "buyerRemark": "注意按指定规格发货",
      "sellerRemark": "请放心购买，竭力为您服务！",
      "isComment": 0
    },{
      "pointerGoods": {
        "__type": "Pointer",
        "className": "Goods",
        "objectId": "TKCgIQYc9O"
      },
      "pointerGoodsSku": {
        "__type": "Pointer",
        "className": "GoodsSku",
        "objectId": "rG5GRAQZiR"
      },
      "total": 2
    }
  ]
}'
```

* Order.status

|状态值|状态名|
|----|----|
|0|普通状态|
|1|已付款|
|2|已发货|
|3|交易完成|
|-1|取消状态|
|-2|退款中|
|-3|换货中|
|-4|退货中|
|-5|已退货|
|-6|已退款|

#### 微信支付

* 统一下单(小程序)

在小程序调wx.login接口获取code，orderObjectId是Order表的objectId

```bash
curl -X POST http://localhost:1338/parse/functions/wx-pay \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"code":"",
     "orderObjectId":""
    }'
``` 

统一下单成功输出结果

```json
{
  "result": {
    "appId": "wx02ddc79fff83e515",
    "timeStamp": "1530172402",
    "nonceStr": "nwgYzBP0S4dWasZR",
    "package": "prepay_id=wx2815532237829524fb0c15913542414073",
    "signType": "MD5",
    "paySign": "F529B48018B6077A06E9ADC91BB24CB3"
  }
}
```

* 支付成功通知

```bash
curl -X POST http://localhost:1338/WxPayNotify \
-H 'Content-Type: text/xml' \
-d '<xml>
      <appid><![CDATA[wx2421b1c4370ec43b]]></appid>
      <attach><![CDATA[支付测试]]></attach>
      <bank_type><![CDATA[CFT]]></bank_type>
      <fee_type><![CDATA[CNY]]></fee_type>
      <is_subscribe><![CDATA[Y]]></is_subscribe>
      <mch_id><![CDATA[10000100]]></mch_id>
      <nonce_str><![CDATA[5d2b6c2a8db53831f7eda20af46e531c]]></nonce_str>
      <openid><![CDATA[oUpF8uMEb4qRXf22hE3X68TekukE]]></openid>
      <out_trade_no><![CDATA[1409811653]]></out_trade_no>
      <result_code><![CDATA[SUCCESS]]></result_code>
      <return_code><![CDATA[SUCCESS]]></return_code>
      <sign><![CDATA[B552ED6B279343CB493C5DD0D78AB241]]></sign>
      <sub_mch_id><![CDATA[10000100]]></sub_mch_id>
      <time_end><![CDATA[20140903131540]]></time_end>
      <total_fee>1</total_fee>
    <coupon_fee><![CDATA[10]]></coupon_fee>
    <coupon_count><![CDATA[1]]></coupon_count>
    <coupon_type><![CDATA[CASH]]></coupon_type>
    <coupon_id><![CDATA[10000]]></coupon_id>
    <coupon_fee><![CDATA[100]]></coupon_fee>
      <trade_type><![CDATA[JSAPI]]></trade_type>
      <transaction_id><![CDATA[1004400740201409030005092168]]></transaction_id>
    </xml>'
```

处理成功输出结果
```xml
<xml>
  <return_code><![CDATA[SUCCESS]]></return_code>
  <return_msg><![CDATA[OK]]></return_msg>
</xml>

```

#### 微信小程序wx.login登录code换取OpenID

```bash
curl -X POST http://localhost:1338/parse/functions/wxLogin \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"code":"xxx"}'
```

#### 微信小程序快捷登录parse平台

* 根据code获取OpenID，然后根据OpenID判断是否已注册账号，未注册则自动注册，已注册则自动登录，如果账号的默认密码被修改过则无法再使用快捷登录功能

```bash
curl -X POST http://localhost:1338/parse/functions/mpMiniLogin \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"code":"xxx"}'
```

#### 使用手机+密码登录
```bash
curl -X POST http://localhost:1338/parse/functions/mobilePWLogin \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"mobile":"xxx","password":""}'
```

#### 绑定手机号码

* 请求绑定手机号码xxx

需携带用户sessionToken
允许绑定的前提条件：手机号码未被其他用户绑定，且当前用户未绑定手机号码。
满足条件则返回token凭证，且发送短信验证码。

```bash
curl -X POST http://localhost:1338/parse/functions/requestBindMobile \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-H 'X-Parse-Session-Token: r:2db117e2ccc64b51ae88692f98347515' \
-d '{"mobile":"xxx"}'
```

* 校验绑定手机

输入手机号码、token、code短信验证码、用户sessionToken

```bash
curl -X POST http://localhost:1338/parse/functions/smsAcceptBindMobile \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-H 'X-Parse-Session-Token: r:2db117e2ccc64b51ae88692f98347515' \
-d '{"mobile":"xxx","token":"","code":""}'
```

#### 手机号码注册

* 手机号码校验
要求：该手机号码尚未绑定其他用户

满足条件则返回token凭证，且发送短信验证码。

```bash
curl -X POST http://localhost:1338/parse/functions/smsRequestRegister \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"mobile":"xxx"}'
```

* 校验绑定手机

输入手机号码、token、code短信验证码、密码
校验成功则注册用户

```bash
curl -X POST http://localhost:1338/parse/functions/smsAcceptRegister \
-H "X-Parse-Application-Id: bee" \
-H "X-Parse-REST-API-Key: 1" \
-H 'Content-Type: application/json' \
-d '{"mobile":"xxx","token":"","code":"","password":""}'
```

#### multipart模式上传文件+对接OSS

注：微信小程序只支持multipart模式上传文件，无法使用parse自带的上传文件接口。
已初步实现对接OSS的功能，后续再考虑改为可配置模式

```bash
curl -F "name=file" -F "filepath=@file.tar.gz" http://localhost:1338/parse/uploadFile
```




 