var marked = require('marked');
var fs = require('fs');
var path = require('path');
var Mustache = require('mustache');

marked.setOptions({breaks: true});

/*_.templateSettings = {
  interpolate: /\{\{\=(.+?)\}\}/g,
  evaluate: /\{\{\!(.+?)\}\}/g
};*/


module.exports = function(metadata, cb) {
	if (!metadata.layout)
		metadata.layout = 'post';
	metadata.content = marked(metadata.content);

	var layout = 'layouts' + metadata.layout[0].toUpperCase() + metadata.layout.slice(1);
	fs.readFile(path.join(__dirname, layout + '.html'), function(err, data) {
		if (err)
			return cb(err);
		console.log('data', data.toString());
		cb(null, Mustache.render(data.toString(),{data: metadata}));
	});
}