var marked = require('marked');
var fs = require('fs');
var path = require('path');
var Mustache = require('mustache');
var type2Layout = require('./type2Layout');

marked.setOptions({breaks: true});

module.exports = function(metadata, cb) {
	if (!metadata.layout)
		metadata.layout = 'post';
	metadata.content = marked(metadata.content);

	var layout = type2Layout(metadata.type);
	fs.readFile(path.join(__dirname, layout + '.html'), function(err, data) {
		if (err)
			return cb(err);
		cb(null, Mustache.render(data.toString(),{data: metadata}));
	});
}