"use strict";
/* global Parse*/

function bindUserMiniOpenId(miniOpenid, user) {
  return new Promise((resolve, reject) => {
    Parse.User.get(user.objectId, {
      //TODO 绑定用户小程序OpenID

    })
  });
}
module.exports = {
  bindUserMiniOpenId: bindUserMiniOpenId
};
