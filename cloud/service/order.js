"use strict";
/* global Parse*/

function getOrderByObjectId(objectId) {
  return new Promise((resolve, reject) => {
    const query = new Parse.Query("Order");
    query.get(objectId, {
      success: function (object) {
        // The object was retrieved successfully.
        // console.log('object :', object);
        resolve(object);
      },
      error: function (object, error) {
        // The object was not retrieved successfully.
        // error is a Parse.Error with an error code and message.
        reject(error);
      }
    })


  })
}


module.exports = {
  getOrderByObjectId: getOrderByObjectId,
};
