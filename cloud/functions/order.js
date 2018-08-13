"use strict";
/* global Parse*/

// Cloud code function demo
// Parse.Cloud.define('hello', function(req, res) {
//   res.success('Hi');
// });

function DateType(theDate) {
  return {
    __type: 'Date',
    iso: theDate.toISOString(),
  }
}

// 校验订单明细
function VerifyOrderItem(data, user) {

  return new Promise((resolve, reject) => {
    if (data.total === undefined) {
      reject('数量有误');
      return;
    }

    if (data.pointerGoods === undefined) {
      reject('订单明细没有商品信息(pointerGoods)');
      return;
    }

    const goodsObjectId = data.pointerGoods.objectId;
    const Goods = Parse.Object.extend('Goods');
    const queryGoods = new Parse.Query(Goods);
    queryGoods.equalTo('objectId', goodsObjectId);
    queryGoods.first({ sessionToken: user.getSessionToken() }).then(
      (goods) => {
        if (goods) {
          // 整理订单明细字段
          data.price = goods.get('price');
          if (data.total === undefined) { // 无数量数据默认1
            data.total = 1;
          }
          data.amount = goods.get('price') * data.total;

          // const snapshot = goods.toJSON();
          // data.snapshot = snapshot;
          // resolve(data);
          const GoodsSku = Parse.Object.extend('GoodsSku');
          const queryGoodsSku = new Parse.Query(GoodsSku);
          const pointerGoods = {
            __type: 'Pointer',
            className: 'Goods',
            objectId: goodsObjectId
          }
          queryGoodsSku.equalTo('pointerGoods', pointerGoods);
          queryGoodsSku.find({ sessionToken: user.getSessionToken() }).then(
            (results) => {
              if (results && results.length > 0) {
                const GoodsSkus = results.map(i => i.toJSON());
                data.snapshot = {...goods.toJSON(), GoodsSkus}; // Goods 和 GoodsSkus 合并JSON 快照
                resolve(data);
              } else {
                data.snapshot = goods.toJSON();
                resolve(data);
              }
            },
            (error) => {
              reject(error);
            }
          );

        } else {
          reject(`商品(Id:${goodsObjectId})不存在`);
        }
      },
      (error) => {
        reject(error);
      });
  });
}

// 校验订单
function VerifyOrder(data, user) {
  const order = {};
  return new Promise((resolve, reject) => {
    if (!data) {
      reject('无效数据');
      return;
    }
    if (!user) {
      reject('非法用户');
      return;
    }

    // 整理即将保存的订单单据所有字段
    try {
      const pointerUser = {
        __type: 'Pointer',
        className: '_User',
        objectId: user.id,
      };
      const dateNow = new Date();
      order.orderSn = data.orderSn || dateNow.getTime().toString(); // 订单号为时间戳
      order.orderDate = DateType(dateNow);
      order.pointerUser = pointerUser;
      order.addressRealName = data.addressRealName;
      order.addressMobile = data.addressMobile;
      order.addressProvince = data.addressProvince;
      order.addressCity = data.addressCity;
      order.addressArea = data.addressArea;
      order.addressAddress = data.addressAddress;
      order.buyerRemark = data.buyerRemark;
      order.sellerRemark = data.sellerRemark;
      order.expressCompany = data.expressCompany;
      order.expressNumber = data.expressNumber;
      order.expressAmount = data.expressAmount || 0;
      order.status = 0; //-6已退款 -5已退货 -4退货中， -3换货中， -2退款中，-1取消状态，0普通状态，1为已付款，2为已发货，3为成功
      order.goodsTotal = 0;
      order.goodsAmount = 0;
      order.orderAmount = order.expressAmount + 0;
    } catch (error) {
      reject(error);
    }

    if (!data.orderItem) {
      reject('无订单明细');
      return;
    }

    order.orderItem = [];
    data.orderItem.forEach((item) => {
      VerifyOrderItem(item, user).then(
        (result) => {
          item.price = result.price;
          item.amount = result.amount;
          order.orderItem.push(item);
          if (data.orderItem.length <= order.orderItem.length) {
            resolve(order);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  });
}

// 保存订单
function SaveOrder(data, user) {
  return new Promise((resolve, reject) => {
    const dataOrder = Object.assign({}, data);
    const dataOrderItem = dataOrder.orderItem;
    delete dataOrder.orderItem;
    const Order = Parse.Object.extend('Order');
    const order = new Order;

    order.save(dataOrder, { sessionToken: user.getSessionToken() }).then(
      (resultOrder) => {
        const pointerOrder = {
          __type: 'Pointer',
          className: 'Order',
          objectId: resultOrder.id,
        };

        // OrderItem 加上 pointerOrder 字段
        dataOrderItem.map((item) => {
          item.pointerOrder = pointerOrder;
          return item;
        });

        setTimeout(() => {
          const OrderItem = Parse.Object.extend('OrderItem');

          dataOrderItem.map((item) => {
            setTimeout(() => {
              const orderItem = new OrderItem();
              orderItem.save(item, { sessionToken: user.getSessionToken() }).then(
                (resultOrderItem) => {
                  item.objectId = resultOrderItem.id;
                  return item;
                },
                (error) => {
                  reject(error);
                }
              );
            });
          });
        });
        resolve(resultOrder);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

Parse.Cloud.define('Order', function (request, response) {
  const { user } = request;
  if (!user) {
    response.error('非法用户');
    return;
  }

  const { params } = request;
  VerifyOrder(params, user).then((order) => {
    SaveOrder(order, user).then((orderSaveResult) => {
      response.success(orderSaveResult);
    }, (error) => {
      response.error(error);
    });
  }, (error) => {
    response.error(error);
  });
});
