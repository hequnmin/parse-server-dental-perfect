"use strict";
/* global Parse*/

// 保存订单明细，关联更改订单单据数据（更改字段：商品总数量、商品总金额、订单总金额）
Parse.Cloud.beforeSave('OrderItem', (request, response) => {
  const { user } = request;
  if (!user) {
    response.error('非法用户');
    return;
  }
  const sessionToken = user.getSessionToken();

  const createdAt = request.object.get('createdAt');

  // 新建订单明细
  if (!createdAt) {
    const total = request.object.get('total');
    const amount = request.object.get('amount');

    const queryOrder = new Parse.Query('Order');
    queryOrder.get(request.object.get('pointerOrder').id, {sessionToken}).then(
      (order) => {
        order.increment('goodsTotal', total);
        order.increment('goodsAmount', amount);
        order.increment('orderAmount', amount);
        order.save().then(
          () => {
            // 改写库存
            if (request.object.get('pointerGoodsSku')) {
              const queryGoodsSku = new Parse.Query('GoodsSku');
              queryGoodsSku.get(request.object.get('pointerGoodsSku').id, {sessionToken}).then(
                (goodsSku) => {
                  goodsSku.increment('stock', 0 - total);
                  goodsSku.save(null, {sessionToken}).then(
                    () => {
                      response.success();
                    },
                  );
                },
              );
            } else {
              response.success();
            }
          },
        );
      },
    );
  } else {
    // 修改订单明细
    let total = request.object.get('total');
    let amount = request.object.get('amount');
    if (total) {
      const queryOrderItem = new Parse.Query('OrderItem');
      // 修改操作时取修改前后的差异
      queryOrderItem.get(request.object.id, {sessionToken}).then(
        (orderitem) => {
          total = total - orderitem.get('total');
          amount = amount - orderitem.get('amount');
        },
        (error) => {
          response.error(error);
        }
      );

      const queryOrder = new Parse.Query('Order');
      queryOrder.get(request.object.get('pointerOrder').id, {sessionToken}).then(
        (order) => {
          order.increment('goodsTotal', total);
          order.increment('goodsAmount', amount);
          order.increment('orderAmount', amount);
          order.save(null, {sessionToken}).then(
            () => {
              // response.success();
              // 改写库存
              if (request.object.get('pointerGoodsSku')) {
                const queryGoodsSku = new Parse.Query('GoodsSku');
                queryGoodsSku.get(request.object.get('pointerGoodsSku').id, {sessionToken}).then(
                  (goodsSku) => {
                    goodsSku.increment('stock', 0 - total);
                    goodsSku.save(null, {sessionToken}).then(
                      () => {
                        response.success();
                      },
                    );
                  },
                );
              } else {
                response.success();
              }
            },
          );
        },
      );
    }
  }
});

Parse.Cloud.afterDelete('OrderItem', (request, response) => {
  const total = request.object.get('total');
  const amount = request.object.get('amount');
  const queryOrder = new Parse.Query('Order');
  queryOrder.get(request.object.get('pointerOrder').id).then(
    (order) => {
      order.increment('goodsTotal', 0 - total);
      order.increment('goodsAmount', 0 - amount);
      order.increment('orderAmount', 0 - amount);
      return order.save();
    },
    (error) => {
      response.error(error);
    }
  );
});

Parse.Cloud.beforeDelete('Order', (request, response) => {
  const query = new Parse.Query('OrderItem');
  query.equalTo('pointerOrder', request.object);
  query.count().then(
    (count) => {
      if (count > 0) {
        response.error("该订单单据存在订单明细，禁止删除！");
      } else {
        response.success();
      }
    },
    (error) => {
      response.error(error);
    }
  );
});


