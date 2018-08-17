"use strict";
/* global Parse*/

const _ = require("lodash");

Parse.Cloud.define('clientip', function(request, response) {
  var clientIP = request.headers['X-Parse-Real-Ip'];
  response.success(clientIP);
});


// 模仿.../parse/roles接口，关联users、roles输出
// 目前仍不通用，后续完善

Parse.Cloud.define('Query', function (request, response) {
  const { user } = request;
  const sessionToken = user.getSessionToken();

  const { params, params: { related, where, order } } = request;

  const className = params.classname;
  delete params.classname;

  const data = new Array();

  const theClass = Parse.Object.extend(className);
  const theQuery = new Parse.Query(theClass);

  // 排序参数
  const orders = order === undefined ? [] : order.split(',');
  if (orders.length > 0) {
    orders.forEach(item => {
      if (item.indexOf('-') < 0) {
        theQuery.ascending(item);
      } else {
        theQuery.descending(item.substring(1));
      }
    });
  }

  // 条件参数
  if (where) {
    const objWhere = JSON.parse(where);
    if (Array.isArray(objWhere)) {
      objWhere.forEach(item => {
        for (let i in item) {
          theQuery.equalTo(i, item[i]);
        }
      });
    } else {
      for (let i in objWhere) {
        theQuery.equalTo(i, objWhere[i]);
      }
    }
  }

  // 关联参数
  const relateds = related ? related.split(',') : [];
  theQuery.find({ sessionToken }).then((theObjects) => {
    if (theObjects.length <=0) {
      response.success(data);
      return;
    }
    const _after = _.after(theObjects.length, () => {
      if (orders.length > 0) {
        orders.forEach(item => {
          if (item.indexOf('-') < 0) {
            data.sort((a, b) => a[item] - b[item]);
          } else {
            data.sort((a, b) => b[item] - a[item]);
          }
        });
      }
      response.success(data);
    });
    _.each(theObjects, async (theObject) => {
      const theJson = theObject.toJSON();

      //grab relations
      if (related) {

        for (let index = 0; index < relateds.length; index++) {
          const relationName = relateds[index];
          const theRelations = theObject.relation(relationName);

          const findRelations = await theRelations.query().find({sessionToken});

          findRelations.map((r) => { r.toJSON()});
          theJson[relationName] = findRelations;
        }

        data.push({...theJson});
        _after();
      } else {
        data.push({...theJson});
        _after();
      }
    });
  });
});

function QueryRelation(objectMain, relationName, sessionToken) {
  return Promise((resolve, reject) => {
    const theRelations = objectMain.relation(relationName);
    theRelations.query().find({sessionToken}).then(
      (findRelations) => {
        findRelations.map((r) => {
          return r.toJSON();
        });
        resolve(findRelations);
      },
      (error) => {
        reject(error);
      });
  });
}
