// Cloud code function demo
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

Parse.Cloud.define('helloworld', function (request, response) {
  const query = new Parse.Query("Customer");
  const user = request.user;  ``
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
