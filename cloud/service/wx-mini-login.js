"use strict";

/* global Parse*/

function wxLogin(code) {
  return new Promise(async (resolve, reject) => {
    const config = require('../service/config');
    const base = await config.getConfigByKeys(["miniAppid", "miniSecret"]);

    if (base.miniAppid === null || base.miniSecret === null) {
      reject({error: "配置参数缺失,请联系管理员"});
      return
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${base.miniAppid}&secret=${base.miniSecret}&js_code=${code}&grant_type=authorization_code`;

    Parse.Cloud.httpRequest({
      method: 'GET',
      url: url
    }).then(function (httpResponse) {
      resolve(JSON.parse(httpResponse.text));
    }, function (httpResponse) {
      console.error('Request failed with response code ' + httpResponse.status);
      // return {error: "登录失败"};
      reject(JSON.parse(httpResponse));
    });
  })
}

module.exports = {
  wxLogin: wxLogin

}
