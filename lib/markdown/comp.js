var npm = require('npm');
var shoe = npm.shoe;
var stream = shoe('http://localhost:3001/pages');
var Emitter = require('emitter');
var _ = npm.underscore;
var sep = '\xff';


var pages = new Emitter;
stream.on('data', function(data) {
	data = JSON.parse(data);
	var split = data.key.split(sep);
	var type = split[0];
	var page = split[1];

	console.log('data', type, page);

	if (!pages[page]) {
		pages[page] = {};
		pages[page].id = page;
	}
	if (type === 'matter') {
		_.extend(pages[page], JSON.parse(data.value));
	} else if (type === 'views') {
		pages[page].views = data.value;
	} else 
		throw Error('unknown type', type);
	
	pages.emit('update', pages[page]);
});


module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams',
	 function($scope, $routeParams) {
		$scope.params = $routeParams;
		$scope.page = '/markdown/pages/' + $routeParams.page + '.html';
		// set iframe height
		/*$('iframe').height($(document).height());
		$(document).resize(function() {
			$('iframe').height($(document).height());
		});*/
		
	}],
	pages: pages,
	render: require('./renderClient')
};