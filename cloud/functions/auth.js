"use strict";
/* global Parse*/
const smsService = require("../service/sms");

//根据code获取openid
Parse.Cloud.define('wxLogin', function (request, response) {

  console.log('wxLogin:', request);
  const params = request.params;
  const wxMiniLogin = require("../service/wx-mini-login");
  // var data = await wxMiniLogin.wxLogin(params.code);
  wxMiniLogin.wxLogin(params.code).then(function (res) {
    response.success(res);
  }).catch(function (res) {
    response.error(res);
  })

});

//根据code获取OpenID，然后根据OpenID判断是否已注册账号，未注册则自动注册，已注册则自动登录，此模式创建的账号不支持密码修改
Parse.Cloud.define('mpMiniLogin', async function (request, response) {

  // console.log('mpMiniLogin :', request);
  const params = request.params;
  const wxMiniLogin = require("../service/wx-mini-login");
  const userWxLoginData = await wxMiniLogin.wxLogin(params.code);
  console.log("userWxLoginData:", userWxLoginData);
  if (!("openid" in userWxLoginData)) {
    //输出获取失败的信息
    response.error(userWxLoginData);
    return
  }
  const query = new Parse.Query(Parse.User);
  query.equalTo("mpMiniOpenid", userWxLoginData.openid);

  query.find().then((users) => {
    console.log(users);
    if (users.length === 0) {
      // 注册
      const user = new Parse.User();
      user.set("username", userWxLoginData.openid);
      user.set("password", userWxLoginData.openid);
      user.set("mpMiniOpenid", userWxLoginData.openid);
      // user.set("", "415-392-0202");

      user.signUp(null, {
        success: function (user) {
          // 注册成功.
          response.success(user);
        },
        error: function (user, error) {
          // Show the error message somewhere and let the user try again.
          // alert("Error: " + error.code + " " + error.message);
          response.error(error);
        }
      });

    } else if (users.length === 1) {
      const username = users[0].get("username");
      const password = users[0].get("username");
      Parse.User.logIn(username, password, {
        success: function (user) {
          // Do stuff after successful login.
          response.success(user);
        },
        error: function (user, error) {
          // The login failed. Check error to see why.
          // response.error(error.message);
          response.error(error);
        }
      });
    } else {
      response.error("该用户绑定了多个账号，数据异常");
    }


  }).catch((res) => {
    console.log(res);
    response.error(res);
  })
});

Parse.Cloud.define('mobilePWLogin', async function (request, response) {

  // console.log('mobileLogin :', request);
  const {mobile, password} = request.params;

  const query = new Parse.Query(Parse.User);
  query.equalTo("mobile", mobile);

  query.find().then((users) => {
    console.log(users);
    if (users.length === 0) {
      // 未注册
      response.error("该手机号码尚未注册，如需登录请先注册");
    } else if (users.length === 1) {
      const username = users[0].get("username");
      Parse.User.logIn(username, password, {
        success: function (user) {
          // Do stuff after successful login.
          response.success(user);
        },
        error: function (user, error) {
          // The login failed. Check error to see why.
          // response.error(error.message);
          response.error(error);
        }
      });
    } else {
      response.error("该用户绑定了多个账号，数据异常");
    }


  }).catch((res) => {
    console.log(res);
    response.error(res);
  })
});

Parse.Cloud.define('requestBindMobile', function (request, response) {
  console.log(request);
  const mobile = request.params.mobile;

  const {user} = request;
  if (!user) {
    response.error('非法用户');
    return;
  }

  const sessionToken = user.getSessionToken();
  const userObjectId = user.id;

  const query = new Parse.Query(Parse.User);
  query.equalTo("mobile", mobile);

  query.find().then((users) => {
    if (users.length === 0) {

      const queryCurrentUser = new Parse.Query(Parse.User);
      queryCurrentUser.get(userObjectId, {sessionToken}).then((user) => {
        //检查当前用户是否绑定了手机号码
        if (user.get("mobile") !== undefined && user.get("mobile") !== "") {
          //当前用户已绑定手机号码
          response.error(`该账户已经绑定了手机号码${user.get("mobile")}，如要绑定新的手机号码，请先解绑`);
        } else {
          //	当前用户没有绑定手机号码
          //1.发送手机验证码


          const code = smsService.randomString(4, smsService.randomType.NUMBER);
          const content = `验证码：${code}，十分钟内有效，如非本人操作请忽略。`;
          const invalidAt = new Date();
          invalidAt.setMinutes(invalidAt.getMinutes() + 10);

          smsService.requestSms(mobile, code, content, invalidAt, smsService.contentType.BindMobile).then((res) => {
            //2.返回信息：token
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
        }
      }).catch(function (res) {
        console.log("查询当前用户信息异常：", res);
        response.error("查询当前用户信息异常");
      });

    } else if (users.length === 1) {
      // 该手机号已注册了会员账号，请输入登录密码进行登录
      if (users[0].id === userObjectId) {
        response.error(`该账户已经绑定了手机号码`);
      } else {
        response.error("该手机号已经注册会员账号，请输入登录密码进行登录");
      }
    } else {
      // 异常情况：一个手机号绑定了多个账号
      response.error("该手机号已注册了会员账号");
    }
  }).catch((res) => {
    console.log(res);
    response.error(res);
  })

});


Parse.Cloud.define('smsAcceptBindMobile', function (request, response) {
  const params = request.params;
  const {mobile, code, token} = params;

  const {user} = request;
  if (!user) {
    response.error('非法用户');
    return;
  }

  const sessionToken = user.getSessionToken();
  const userObjectId = user.id;

  if (mobile && code && token) {
    //1.短信校验
    smsService.getVerifySms(mobile, code, token, smsService.contentType.BindMobile).then(function (objSms) {
      //2.绑定当前用户
      const query = new Parse.Query(Parse.User);
      query.equalTo("mobile", mobile);
      query.find().then((users) => {
        //2.检测手机号码是否已被别的账号绑定
        if (users.length === 0) {
          //2.1没有被绑定，检查当前用户是否绑定了手机号码
          const queryCurrentUser = new Parse.Query(Parse.User);
          queryCurrentUser.get(userObjectId, {sessionToken}).then((user) => {
            if (user.get("mobile") !== undefined && user.get("mobile") !== "") {
              //2.1.1当前用户已绑定手机号码
              response.error(`该账户已经绑定了手机号码${user.get("mobile")}，如要绑定新的手机号码，请先解绑`);
            } else {
              //2.1.2没有绑定手机号码，校验通过
              //绑定手机号码
              user.save({mobile}, {
                sessionToken: sessionToken,
                success: function (user) {
                  //2.1.2.1绑定成功
                  objSms.save({verified: true}); // 回写短信记录已验证字段
                  response.success({updatedAt: user.updatedAt});
                },
                error: function () {
                  //2.1.2.1绑定失败
                  response.error('网络异常');
                }
              });
            }
          }).catch(function (res) {
            // 2.1.3查询当前用户信息异常
            console.log("查询当前用户信息异常：", res);
            response.error("查询当前用户信息异常");
          });

        } else if (users.length === 1) {
          // 该手机号已注册了会员账号，请输入登录密码进行登录
          if (users[0].id === userObjectId) {
            response.error(`该账户已经绑定了手机号码`);
          } else {
            response.error("该手机号已经注册会员账号，请输入登录密码进行登录");
          }

        } else {
          // 异常情况：一个手机号绑定了多个账号
          response.error("该手机号已注册了会员账号");
        }
      }).catch((res) => {
        console.log(res);
        response.error(res);
      })

    }).catch(function (res) {
      response.error(res);
    })
  } else {
    response.error('非法请求');
  }


});

Parse.Cloud.define('smsRequestRegister', (request, response) => {
  const params = request.params;
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
          //当前手机号码已绑定用户
          response.error("该手机号码已经注册");
        } else {
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

Parse.Cloud.define('smsAcceptRegister', (request, response) => {
  const params = request.params;
  const {mobile, code, token, password} = params;
  if (mobile && code && token && password) {
    smsService.getVerifySms(mobile, code, token, smsService.contentType.ResetPassword).then(function (objSms) {
      const queryUser = new Parse.Query(Parse.User);
      queryUser.equalTo('mobile', mobile);
      queryUser.find({
        success: function (users) {
          if (users.length > 0) {
            response.error('该手机号码已经注册');
          } else {
            const user = new Parse.User();
            user.set("username", mobile);
            user.set("mobile", mobile);
            user.set("password", password);

            user.signUp(null, {
              success: function (user) {
                // 注册成功.
                objSms.save({verified: true}); // 回写短信记录已验证字段
                response.success(user);
              },
              error: function (user, error) {
                // Show the error message somewhere and let the user try again.
                // alert("Error: " + error.code + " " + error.message);
                response.error(error);
              }
            });
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
