// Example express application adding the parse-server module to expose Parse
// compatible API routes.

const express = require("express");
const ParseServer = require('parse-server').ParseServer;
const path = require('path');

const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/dental-perfect';   // Mongodb
// const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'postgres://postgres:123456@localhost:5432/dental-perfect';   // Postgres
const serverURL = process.env.SERVER_URL || 'http://localhost:1338/dental-perfect';   // Don't forget to change to https if needed

// const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://192.168.1.166:27017/admin';   // Mongodb

// const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://admin:admin113692@ds113692.mlab.com:13692/dental-perfect';   // Mongodb
// const serverURL = process.env.SERVER_URL || 'https://parse-server-dental-perfect.herokuapp.com/dental-perfect';   // Don't forget to change to https if needed

const appId = process.env.APP_ID || 'dental-perfect';
const appName = process.env.APP_NAME || 'Dental-Perfect';      // 本应用名称
const masterKey = process.env.MASTER_KEY || 'Dental-Perfect-2018';      // 主密匙. 保密!
const cloud = process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/index.js';
const verifyUserEmails = true;                            // 是否开启邮件验证
const publicServerURL = serverURL;                        // 验证邮件链接URL
const emailAdapter = {                                    // 邮件验证适配器
  module: "@parse/simple-mailgun-adapter",        // https://www.mailgun.com，UID:hequnmin@gmail.com
  options: {
    fromAddress: "no-reply@becheer.com",
    domain: "sandbox2f47f9fb0c1b4832a27f7a7e069ff5fb.mailgun.org",
    apiKey: "key-235b37dd69d4eac162215380aac51a22"
  }
};

const FSFilesAdapter = require('@parse/fs-files-adapter');
// const fsAdapter = new FSFilesAdapter({
//   "filesSubDirectory": "my/files/folder" // optional
// });
const fsAdapter = new FSFilesAdapter();

const liveQuery = {
  classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
};
const push = JSON.parse(process.env.PARSE_SERVER_PUSH || "{}");

const passwordPolicy = {
  resetTokenValidityDuration: 24 * 60 * 60, // 1天Token有效期
};

// if (!databaseUri) {
//   console.log('DATABASE_URI not specified, falling back to localhost.');
// }
console.log('DATABASE_URI :' + databaseUri);

const api = new ParseServer({
  databaseURI: databaseUri,
  cloud: cloud,
  appId: appId,
  appName: appName,
  masterKey: masterKey,
  serverURL: serverURL,
  verifyUserEmails: verifyUserEmails,
  publicServerURL: publicServerURL,
  emailAdapter: emailAdapter,
  liveQuery: liveQuery,
  push: push,
  filesAdapter: fsAdapter,
  passwordPolicy: passwordPolicy,
  oauth: {
    google: true
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

const app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Get Client IP
app.use(function (req, res, next) {
  // console.log("headers = " + JSON.stringify(req.headers));// 包含了各种header，包括x-forwarded-for(如果被代理过的话)
  // console.log("x-forwarded-for = " + req.header('x-forwarded-for'));// 各阶段ip的CSV, 最左侧的是原始ip
  // console.log("ips = " + JSON.stringify(req.ips));// 相当于(req.header('x-forwarded-for') || '').split(',')
  // console.log("remoteAddress = " + req.connection.remoteAddress);// 未发生代理时，请求的ip
  // console.log("ip = " + req.ip);// 同req.connection.remoteAddress, 但是格式要好一些
  // 本地无法获取客户端IP（本地服务器可能无法获取到请求x-forwarded-for头部）
  // heroku.com云平台测试可以获取得到客户端IP
  req.headers['X-Parse-Real-Ip'] = req.header('x-forwarded-for');
  next();
});

//文件上传 multipart/form-data

const multer = require('multer');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './files/');
  },
  filename: function (req, file, cb) {
    crypto.pseudoRandomBytes(16, function (err, raw) {
      if (err) return cb(err);
      cb(null, raw.toString('hex') + Date.now() + path.extname(file.originalname))
    })
    // cb(null, file.originalname);
  }
});
const upload = multer({storage: storage});

// const upload = multer({dest: 'files/'});
app.post('/parse/uploadFile', upload.single('file'), function (req, res, next) {
  // req.file is array of `photos` files
  // req.body will contain the text fields, if there were any
  // console.log(req.file);
  const data = {url: serverURL + '/files/' + appId + '/' + req.file.filename, name: req.file.filename};

  const uploadFile = require("./cloud/service/uploadFile");
  const dst = req.file.filename;

  uploadFile.uploadFileToOss(dst, req.file.path).then(function (result) {
    console.log(result);
    data.ossPath = result.url;
    res.status(200).send(data);
  }).catch(function (result) {
    console.log(result);
    res.status(200).send(data);
  });
});

// Serve the Parse API on the /parse URL prefix
// const mountPath = process.env.PARSE_MOUNT || '/parse';
const mountPath = process.env.PARSE_MOUNT || '/dental-perfect';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function (req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// app.get('/WxPayNotify', function(req, res) {
//     res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
// });

app.post('/WxPayNotify', function (req, res) {
  // res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
  req.rawBody = '';//添加接收变量
  req.setEncoding('utf8');
  req.on('data', function (chunk) {
    req.rawBody += chunk;
  });
  req.on('end', function () {
    // console.log(req.rawBody);
    var wxPay = require("./cloud/service/wx-pay");
    wxPay.onWxPayNotify(req.rawBody).then(function (result) {
      res.status(200).send(result);
    }).catch(function (result) {
      console.log(result);
      res.status(200).send(result);
    });
  });
});

// //WebSocket Server
// const WebSocket = require('ws');
// const wss = new WebSocket.Server({ port: 1339 });
// console.log('bee websocket-server running on ws://localhost:1339');
//
// wss.on('connection', function connection(ws, req) {
//   ws.on('message', function incoming(data) {
//     // Broadcast to everyone else.
//     wss.clients.forEach(function each(client) {
//       if (client !== ws && client.readyState === WebSocket.OPEN) {
//         client.send(data);
//       }
//     });
//   });
//   if (req.url && req.url === '/notice') {
//     wss.clients.forEach(function each(client) {
//       // client.send(data);
//       let data = { count: 0};
//       setInterval(() => {
//         var now = new Date();
//         data = { count: data.count + 1, sendDatetime: now.toLocaleTimeString()};
//         if (client.readyState === WebSocket.OPEN) {
//           client.send(JSON.stringify(data));
//         }
//       }, 6000);
//     });
//   }
// });


// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

const port = process.env.PORT || 1338;
const httpServer = require('http').createServer(app);

httpServer.listen(port, function () {
  console.log('bee parse-server running on ' + serverURL + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
