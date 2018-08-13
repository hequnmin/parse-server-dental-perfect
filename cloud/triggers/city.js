Parse.Cloud.beforeSave('City', function (request, response) {
  const query = new Parse.Query('City');

  const user = request.user;
  if (user === undefined) {
    response.error('无效用户.');
    return;
  }

  if (request.object.get('cityName') === undefined) {
    response.error('请求中没有城市名称.');
  } else {
    query.equalTo('cityName', request.object.get('cityName'));
    query.find()
      .then((results) => {
        if (results.length > 0) {
          response.error('已经存在相同的城市名称.')
        } else {
          response.success();
          return;
        }
      })
      .catch(() => {
        response.error('保存城市信息失败.');
      });
  }
});
