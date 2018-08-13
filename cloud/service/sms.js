"use strict";

/* global Parse*/
/*
* contentType:2
* */
const contentType = {
  ResetPassword: 2,
  BindMobile:3
};

/*
* 随机字符串类型
* 英文大小写+数字（默认）
* type = 1：纯数字
* */
const randomType = {
  NUMBER: 1
}


function randomChars(type) {
  switch (type) {
  case randomType.NUMBER :
    return '0123456789';
  default:
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';
  }
}

function randomString(size, type) {
  size = size || 32;
  const chars = randomChars(type);
  const maxPos = chars.length;
  let rnd = '';
  for (let i = 0; i < size; i++) {
    rnd += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return rnd;
}

function smsSend(params) {
  return new Promise(
    (resolve, reject) => {
      if (!params.mobile) {
        reject('请求参数 mobile 无效！');
        return;
      }

      if (!params.content) {
        reject('请求参数 content 无效！');
        return;
      }

      if (params) {
        Parse.Config.get().then((config) => {
          const smsProviders = config.get("smsProviders");
          const smsProvider = config.get("smsProvider");
          if (smsProviders && smsProvider) {
            const provider = smsProviders.find(p => p.providerId === smsProvider);
            if (provider) {

              // 兼容各短信提供商短信接口字段，合并mobile,to字段
              const mobile = params.mobile ? params.mobile : '' || params.to ? params.to : '';
              params.mobile = mobile;
              params.to = mobile;
              // content字段
              if (provider.body.content && provider.body.content.length > 0) {
                params.content = provider.body.content + params.content;
              }

              const body = {...provider.body, ...params};

              Parse.Cloud.httpRequest({
                method: 'POST',
                url: provider.url,
                headers: {
                  'Content-Type': 'application/json',
                },
                body,
              }).then((httpResponse) => {
                resolve(httpResponse.text);
              }, (httpResponse) => {
                reject('请求失败！响应错误代码：' + httpResponse.status);
              });
            } else {
              reject('非法短信提供者参数或参数设置错误，请联系系统管理员。');
            }
          } else {
            reject('未配置短信提供者参数，请联系系统管理员。');
          }
        }, () => {
          reject('网络异常。');
        });
      } else {
        reject('请求无数据，请求失败！');
      }
    }
  );
}

/*
* 发送短信验证码
* 根据mobile, code, content, invalidAt, contentType信息写入短信表并发送短信验证码
* 成功：返回短信表记录
* 失败：返回失败原因
* */
function requestSms(mobile, code, content, invalidAt, contentType) {
  return new Promise(
    (resolve, reject) => {
      const Sms = new Parse.Object.extend('Sms');
      const sms = new Sms();

      const token = randomString(25);

      sms.save({mobile, code, content, verified: false, contentType, invalidAt, token}, {
        success: function (sms) {
          // 发送短信
          smsSend({mobile, code, content}).then(() => {
            resolve(sms);
          }, (err) => {

            console.log("短信发送失败", mobile, code, content, err);
            // response.error(err);
            reject(err);
          });
        },
        error: function (sms, error) {
          // response.error(error);
          reject(error);
        }
      });
    })
}

/*
* 校验短信验证码
* 根据mobile, code, token, contentType，invalidAt匹配有效的验证码
* 有则返回验证码记录对象
* 无则返回错误信息
* */

function getVerifySms(mobile, code, token, contentType) {
  return new Promise(
    (resolve, reject) => {
      const Sms = Parse.Object.extend('Sms');
      const querySms = new Parse.Query(Sms);
      querySms.equalTo('mobile', mobile);
      querySms.equalTo('code', code);
      querySms.equalTo('verified', false);
      querySms.equalTo('token', token);
      querySms.equalTo('contentType', contentType);
      querySms.find({
        success: function (smses) {
          // console.log(smses);
          if (smses && smses.length > 0) {
            const objSms = smses[0];
            const invalidAt = objSms.get('invalidAt');
            const now = new Date().toISOString();
            if (invalidAt) {
              const invalid = invalidAt.toISOString();
              if (invalid < now) {
                reject("该验证码已失效，请重新获取验证码");
              }
            }
            //验证码有效，更新验证码为已验证
            // objSms.save({verified: true});
            resolve(objSms);
          } else {
            reject("该验证码不正确");
          }
        },
        error: function () {
          reject("网络异常");
        }
      });
    })
}

module.exports = {
  smsSend: smsSend,
  requestSms: requestSms,
  contentType: contentType,
  getVerifySms: getVerifySms,
  randomString: randomString,
  randomType: randomType
};
