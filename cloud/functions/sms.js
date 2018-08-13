"use strict";
/* global Parse*/

const _ = require("lodash");
const smsService = require("../service/sms");

// const randomNumber = require('parse-server').randomNumber;

// 短信提供商数据格式
// "smsProvider": "17int",
// "smsProviders": [
// {
//   "providerId": "17int",
//   "url": "http://www.17int.cn/xxsmsweb/smsapi/send.json",
//   "body": {
//     "account": "s11050003",
//     "password": "5D93CEB70E2BF5DAA84EC3D0CD2C731A",
//     "requestId": "",
//     "extno": "",
//     "mobile": "",
//     "content": ""
//   }
// },
// {
//   "providerId": "submail",
//   "url": "https://api.mysubmail.com/message/send.json",
//   "body": {
//     "appid": "23548",
//     "signature": "8396f90936416d41c544e9e49d3e262f",
//     "to": "",
//     "content": "【Becheer】"
//   }
// }
// ]


// function randomString(size) {
//   if (size === 0) {
//     throw new Error('Zero-length randomString is useless.');
//   }
//   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';
//   let objectId = '';
//   const bytes = (0, _crypto.randomBytes)(size);
//   for (let i = 0; i < bytes.length; ++i) {
//     objectId += chars[bytes.readUInt8(i) % chars.length];
//   }
//   return objectId;
// }

// function randomString(size, type) {
//   size = size || 32;
//   const chars = randomChars(type);
//   const maxPos = chars.length;
//   let rnd = '';
//   for (let i = 0; i < size; i++) {
//     rnd += chars.charAt(Math.floor(Math.random() * maxPos));
//   }
//   return rnd;
// }

/*
* 随机字符串类型
* 英文大小写+数字（默认）
* type = 1：纯数字
* */
// const NUMBER = 1;
//
// function randomChars(type) {
//   switch (type) {
//   case NUMBER :
//     return '0123456789';
//   default:
//     return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';
//   }
// }


// function randomNumber(n) {
//   let rnd = '';
//   for (let i = 0; i < n; i++) {
//     rnd += Math.floor(Math.random() * 10);
//   }
//   return rnd;
// }


Parse.Cloud.define('SmsSend', (request, response) => {
  const params = request.params;
  smsService.smsSend(params).then((res) => {
    response.success(res);
  }, (rej) => {
    response.error(rej);
  });
});

Parse.Cloud.define('SmsRequestResetPassword', (request, response) => {
  const params = request.params;
  // const { mobile, code, content, invalidAt } = params;
  const {mobile} = params;

  const code = smsService.randomString(4, smsService.randomType.NUMBER);
  const content = `验证码：${code}，十分钟内有效，如非本人操作请忽略。`;
  const invalidAt = new Date();

  invalidAt.setMinutes(invalidAt.getMinutes() + 10);

  if (mobile && code && content && invalidAt) {
    const query = new Parse.Query(Parse.User);
    query.equalTo('mobile', mobile);
    query.find({
      success: (users) => {
        //判断是否存在用户绑定了当前手机号码
        if (users.length > 0) {
          smsService.requestSms(mobile, code, content, invalidAt, smsService.contentType.ResetPassword).then((res) => {
            //TODO res.createdAt 返回的格式
            response.success({
              createdAt: res.createdAt,
              objectId: res.id,
              token: res.get("token"),
              mobile: res.get("mobile")
            });
          }).catch((res) => {
            response.error(res);
          });
        } else {
          //没有用户绑定当前的手机号码
          response.error("该账号不存在");
        }
      },
      error: (error) => {
        response.error(error);
      }
    });

  } else {
    response.error('非法请求');
  }
});

Parse.Cloud.define('SmsAcceptResetPassword', (request, response) => {
  const params = request.params;
  const {mobile, code, token, password} = params;
  if (mobile && code && token && password) {
    smsService.getVerifySms(mobile, code, token, smsService.contentType.ResetPassword).then(function (objSms) {
      const queryUser = new Parse.Query(Parse.User);
      queryUser.equalTo('mobile', mobile);
      queryUser.find({
        success: function (users) {
          if (users.length > 0) {
            const objUser = users[0];
            objUser.save({password}, {
              useMasterKey: true, // 带MasterKey
              success: function (user) {
                objSms.save({verified: true}); // 回写短信记录已验证字段
                response.success({updatedAt: user.updatedAt});
              },
              error: function () {
                response.error('网络异常');
              }
            });
          } else {
            response.error('该账号不存在');
          }
        },
        error: function () {
          response.error('网络异常');
        }
      });
    }).catch(function (res) {
      response.error(res);
    })
  } else {
    response.error('非法请求');
  }
});

Parse.Cloud.define('SmsRequestLogin', (request, response) => {
  const params = request.params;
  const {mobile} = params;

  const rnd = _.random(0, 1, true);
  const code = parseInt(rnd * 10000000).toString().slice(-6);

  const content = `验证码：${code}，十分钟内有效，如非本人操作请忽略。`;

  const dateType = (theDate) => {
    return {__type: 'Date', iso: theDate};
  };
  const addMinuts = (theDate, minutes) => {
    return new Date(theDate.getTime() + (minutes * 60 * 1000));
  };
  const dateNow = new Date();
  const dateInvalid = addMinuts(dateNow, 10);
  const invalidAt = dateType(dateInvalid.toISOString());

  if (mobile) {
    const query = new Parse.Query(Parse.User);
    query.equalTo('mobile', mobile);
    query.find({
      success: () => {
        const Sms = new Parse.Object.extend('Sms');
        const sms = new Sms();

        const token = smsService.randomString(25);

        sms.save({mobile, code, content, verified: false, invalidAt, token}, {
          success: function (sms) {
            // 发送短信
            smsService.smsSend({...params, code, content}).then(() => {
              response.success(sms);
            }, (err) => {
              response.error(err);
            });
          },
          error: function (sms, error) {
            response.error(error);
          }
        });

      },
      error: (error) => {
        response.error(error);
      }
    });

  } else {
    response.error('非法请求');
  }
});

Parse.Cloud.define('SmsAcceptLogin', (request, response) => {
  const params = request.params;
  const {mobile, code, token} = params;

  if (mobile && code && token) {
    const Sms = Parse.Object.extend('Sms');
    const querySms = new Parse.Query(Sms);
    querySms.equalTo('mobile', mobile);
    querySms.equalTo('code', code);
    querySms.equalTo('token', token);
    querySms.find({
      success: function (smses) {
        if (smses && smses.length > 0) {
          if (smses.length > 0) {
            const objSms = smses[0];
            const invalidAt = objSms.get('invalidAt');
            const now = new Date().toISOString();
            if (invalidAt) {
              const invalid = invalidAt.toISOString();
              if (invalid < now) {
                response.error('有效期已失效。');
                return;
              }
            }
            const queryUser = new Parse.Query(Parse.User);
            queryUser.equalTo('mobile', objSms.get('mobile'));
            queryUser.find({
              success: function (users) {
                if (users.length > 0) {
                  // 回写短信记录已验证字段
                  objSms.save({verified: true}).then((result) => {
                    response.success({updatedAt: result.updatedAt});
                  });
                }
              },
              error: function () {
                response.error('网络异常');
              }
            });
          }
        } else {
          response.error('网络异常');
        }
      },
      error: function () {
        response.error('网络异常');
      }
    });
  } else {
    response.error('非法请求');
  }
});
