"use strict";
/* global Parse*/

const _ = require("lodash");

Parse.Cloud.define('clientip', function(request, response) {
  var clientIP = request.headers['X-Parse-Real-Ip'];
  response.success(clientIP);
});


// 模仿.../parse/roles接口，关联users、roles输出
// 目前仍不通用，后续完善
/*
curl -X POST \
  'http://localhost:1338/parse/functions/Query?classname=_Role&include=users,roles' \
  -H 'X-Parse-Application-Id: bee' \
  -H 'X-Parse-Session-Token: r:6bb8b47246112bf299b7df733248807e'
*/
// Parse.Cloud.define('Query', function (request, response) {
//   const { user } = request;
//   const sessionToken = user.getSessionToken();
//
//   const { params, params: { relation } } = request;
//
//   const className = params.classname;
//   delete params.classname;
//
//   const data = new Array();
//
//   const theClass = Parse.Object.extend(className);
//   const theQuery = new Parse.Query(theClass);
//   // theQuery.limit(5);
//   theQuery.descending("createdAt");
//
//   const relations = relation ? relation.split(',') : [];
//   theQuery.find({ sessionToken }).then((theObjects) => {
//     const _after = _.after(theObjects.length, () => {
//       response.success(data);
//     });
//     _.each(theObjects, (theObject) => {
//       const theJson = theObject.toJSON();
//
//       //grab relations
//       if (relation) {
//         const theRelations1 = theObject.relation(relations[0]);
//         const theRelations2 = theObject.relation(relations[1]);
//
//         theRelations1.query().find({sessionToken}).then((relations1) => {
//           theRelations2.query().find({sessionToken}).then((relations2) => {
//             Parse.Promise.all(relations1.map((r) => {
//               return r.toJSON();
//             })).then((relations1) => {
//               Parse.Promise.all(relations2.map((r) => {
//                 return r.toJSON();
//               })).then((relations2) => {
//                 theJson[relations[0]] = relations1;
//                 theJson[relations[1]] = relations2;
//                 data.push({...theJson});
//                 _after();
//               });
//             });
//           });
//         });
//       } else {
//         data.push({...theJson});
//         _after();
//       }
//     });
//   });
// });

Parse.Cloud.define('Query', function (request, response) {
  const { user } = request;
  const sessionToken = user.getSessionToken();

  const { params, params: { related } } = request;

  const className = params.classname;
  delete params.classname;

  const data = new Array();

  const theClass = Parse.Object.extend(className);
  const theQuery = new Parse.Query(theClass);
  theQuery.descending("createdAt");

  const relateds = related ? related.split(',') : [];
  theQuery.find({ sessionToken }).then((theObjects) => {
    const _after = _.after(theObjects.length, () => {
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
