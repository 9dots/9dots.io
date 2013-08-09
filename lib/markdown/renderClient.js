var npm = require('npm');
var marked = npm.marked;
var _ = npm.underscore;
marked.setOptions({breaks: true});


_.templateSettings = {
  interpolate : /\{\{(.+?)\}\}/g,
  escape: /\{\{\{(.+?)\}\}\}/g
};


module.exports = function(metadata) {
	if (!metadata.layout)
		metadata.layout = 'post';
	metadata.content = marked(metadata.content);
	var layout = './layouts' + metadata.layout[0].toUpperCase() + metadata.layout.slice(1);
	var template = require(layout);
	return _.template(template)({data: metadata});
}