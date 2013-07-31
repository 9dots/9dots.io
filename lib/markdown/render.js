var marked = require('marked');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');

marked.setOptions({breaks: true});

_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g,
  escape: /\{\{\{(.+?)\}\}\}/g
};


module.exports = function(metadata, cb) {
	if (!metadata.layout)
		return cb(new Error('no layout'));
	metadata.content = marked(metadata.content);

	var layout = 'layouts' + metadata.layout[0].toUpperCase() + metadata.layout.slice(1);
	fs.readFile(path.join(__dirname, layout + '.html'), function(err, data) {
		if (err)
			return cb(err);
		cb(null, _.template(data.toString())({data: metadata}));
	});
}