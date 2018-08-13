"use strict";
/* global Parse*/

function getConfigByKey(key) {
  return new Promise((resolve, reject) => {
    Parse.Config.get().then(function (config) {
      const value = config.get(key);
      console.log(key, value);
      resolve(value);
    }, function (error) {
      // Something went wrong (e.g. request timed out)
      resolve(null);
    });
  });
}

function getConfigByKeys(keys) {

  return new Promise((resolve, reject) => {

    Parse.Config.get().then(function (config) {
      var result = {};
      keys.forEach(key => {
        result[key] = config.get(key);
      });

      // let value = config.get(key);
      // console.log(key, value);
      resolve(result);
    }, function (error) {
      // Something went wrong (e.g. request timed out)
      resolve(null);
    });
  });
}

module.exports = {
  getConfigByKey: getConfigByKey,
  getConfigByKeys: getConfigByKeys
};
