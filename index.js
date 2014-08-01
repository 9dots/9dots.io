/**
 * Module dependencies.
 */

var express = require('express');
var app = module.exports = express();

// settings

app.set('view engine', 'jade');

// middleware

app.use(express.logger('dev'));
app.use(express.compress());
app.use(express.static(__dirname + '/public'));

//app.use(require('prerender-node').set('prerenderServiceUrl', 'http://prerender.9dots.io'));

app.use(function(req, res, next) {
  var fragment = req.query._escaped_fragment_;
  console.log('fragment', fragment);
  // If there is no fragment in the query params
  // then we're not serving a crawler
  if (!fragment) return next();

  // If the fragment is empty, serve the
  // index page
  if (fragment === "" || fragment === "/")
    next();


  // Serve the static html snapshot
  try {
    var file = __dirname + "/snapshots" + fragment;
    console.log('file', file);
    res.sendfile(file);
  } catch (err) {
    res.send(404);
  }
});

app.use(require('prerender-node').set('prerenderToken', 'toId3gs33teeQt7Ln7XR'));

// mount

// serves markdown pages at /markdown/pages
// app.use(require('./lib/markdown'));

// github auth
app.use(require('./lib/auth'));

// markdown editor
app.use('/editor', require('./lib/editor'));

app.use(require('./lib/upload'));
//app.post('/upload', function() {
//	console.log('upload');
//})
// boot app
app.use(require('boot'));