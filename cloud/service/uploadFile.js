const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-cn-shenzhen',
  accessKeyId: 'LTAIoLVb8c5WrTK7',
  accessKeySecret: 'P7FkSS4wV0fJ33NjRNfPLiQW5dsYrD',
  bucket: 'becheer-bee'
});
//
//
// function uploadFileToOss(dst,filePath) {
//   return new Promise(async (resolve, reject) => {
//     let result = await client.put(dst, filePath);
//     resolve(result);
//   })
// }

function uploadFileToOss(dst, filePath) {
  return new Promise((resolve, reject) => {
    client.put(dst, filePath).then(function (res) {
      console.log(res);
      resolve(res);

    }).catch(function (res) {
      console.log(res);
      reject(res);
    });

  })
}


module.exports = {
  uploadFileToOss: uploadFileToOss
};
