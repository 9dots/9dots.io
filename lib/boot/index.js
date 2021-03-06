/**
 * Module dependencies.
 */

var build = require('build');
var express = require('express');
var app = module.exports = express();

app.set('views', __dirname);
app.set('title', '9dots.io');


var config = require('../config');
app.set('config', config);

// middleware

app.use(express.favicon(__dirname + '/images/favicon.ico'));

/**
 * GET index page.
 */

app.get('*', build, function(req, res){
  res.render('index');
});