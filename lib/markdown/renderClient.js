var npm = require('npm');
var marked = npm.marked;
var Mustache = npm.mustache;
var type2Layout = require('./type2Layout');

marked.setOptions({breaks: true});

module.exports = function(metadata) {
	if (!metadata.layout)
		metadata.layout = 'post';

	if(metadata.type == 'lesson')
		metadata.objective = metadata.objective.map(function(obj) {return {name: obj}});
	metadata.content = metadata.content && marked(metadata.content);
	metadata.blurb = marked(metadata.blurb);

	var layout = './' + type2Layout(metadata.type);
	var template = require(layout);
	return Mustache.render(template, {data: metadata});
}