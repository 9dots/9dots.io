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
		return cb(new Error('no layout'));
	console.log('layout', metadata.layout);
	metadata.content = marked(metadata.content);
	var layout = './layouts' + metadata.layout[0].toUpperCase() + metadata.layout.slice(1);
	var template = require(layout);
	return _.template(template)({data: metadata});
}