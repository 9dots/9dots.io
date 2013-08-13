var send = require('send');
var utils = require('connect').utils;
var parse = utils.parseUrl;


module.exports = function(root, success, options) {
  options = options || {};

  return function (req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    
    var pause = utils.pause(req);

    function sendChain() {
      var path = parse(req).pathname;
      send(req, path)
        .maxage(options.maxAge || 0)
        .root(root)
        .index(options.index || 'index.html')
        .hidden(options.hidden)
        .on('error', error)
        .on('directory', directory)
        .on('file', success)
        .pipe(res);
    }

    function error(err) {
      console.log('err', req.url);
      if (404 == err.status && req.url !== '/p/404.html') {
        req.url = '/p/404.html';
        sendChain();
      } else {
        next(err);
      }
    }

    function directory() {
      req.url = '/p/404.html';
      sendChain();
    }

    sendChain();
  }
};
