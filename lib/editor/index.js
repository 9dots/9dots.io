var express = require('express')
	, app = module.exports = express();

app.use(express.static(__dirname + '/public'));
