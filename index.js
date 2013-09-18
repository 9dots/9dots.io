
/**
 * Module dependencies.
 */

var express = require('express');
var app = module.exports = express();

// settings

app.set('view engine', 'jade');

// middleware

app.use(express.logger('dev'));
app.use(express.static(__dirname + '/public'));



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

