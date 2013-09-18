var npm = require('npm');
var marked = npm.marked;
var Mustache = npm.mustache;
var type2Layout = require('./type2Layout');

marked.setOptions({breaks: true});

module.exports = function(metadata) {
	if (!metadata.layout)
		metadata.layout = 'post';
	metadata.content = metadata.content && marked(metadata.content);
	var layout = './' + type2Layout(metadata.type);
	var template = require(layout);
	return Mustache.render(template, {data: metadata});
}