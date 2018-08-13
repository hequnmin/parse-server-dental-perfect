Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.define('helloworld', function (request, response) {
  const query = new Parse.Query("Customer");
  const user = request.user;
  if (user === undefined) {
    response.error('Invalid user.');
    return;
  }
  query.equalTo("customerMobile", request.params.customerMobile);
  query.find()
    .then((results) => {
      if (results.length <= 0) {
        response.success('Hello!Not found customer info.');
      } else {
        results.forEach((item) => {
          response.success(`Hello!${item.get('customerName')}.`);
        });
      }
    })
    .catch(() => {
      response.success('Oh! Say Hello Fail.');
    });
});

Parse.Cloud.beforeSave(Parse.User, function(request, response) {
  const user = request.user;
  debugger;
  if (!request.object.get("email")) {
    response.error("email is required for signup");
  } else {
    response.success();
  }
});

Parse.Cloud.beforeSave('City', function (request, response) {
  const query = new Parse.Query('City');
  if (request.object.get('cityName') === undefined) {
    response.error('请求中没有城市名称.');
  } else {
    query.equalTo('cityName', request.object.get('cityName'));
    query.find()
      .then((results) => {
        if (results.length > 0) {
          response.error('已经存在相同的城市名称.')
        }
      })
      .catch(() => {
        response.success('保存城市信息失败.');
      });
  }
});
