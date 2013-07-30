var npm = require('npm');
var shoe = npm.shoe;
var stream = shoe('http://localhost:3001/pages');
var Emitter = require('emitter');

var pages = new Emitter;
stream.on('data', function(data) {
	data = JSON.parse(data);
	var key = data.key.split(':')[1];
	pages[key] = JSON.parse(data.value);
	pages[key].id = key;
	pages.emit('update', pages[key]);
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