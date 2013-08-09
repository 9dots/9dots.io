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

	if (!pages[page]) {
		pages[page] = {};
		pages[page].id = page;
	}
	if (type === 'matter') {
		_.extend(pages[page], JSON.parse(data.value));
		pages[page].views = pages[page].views || 0;
		pages[page].recent = + new Date(pages[page].date);
	} else if (type === 'views') {
		pages[page].views = parseInt(data.value);
	} else 
		throw Error('unknown type', type);
	
	pages.emit('update', pages[page]);
});

module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams',
	 function($scope, $routeParams) {
		$scope.params = $routeParams;
		$scope.page = '/markdown/' + $routeParams.path + '.html';
		console.log('page', $scope.page);
		
	}],
	pages: pages,
	render: require('./renderClient')
};

var app = angular.module('app');
app.directive('blur', require('blur'));