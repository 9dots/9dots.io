var npm = require('npm');
var shoe = npm.shoe;
var streamPages = shoe('http://localhost:3001/pages');
var streamUnpubPages = shoe('http://localhost:3001/unpubPages');
var Emitter = require('emitter');
var _ = npm.underscore;
var sep = '\xff';


var pages = new Emitter;
var views = {};
function addPage(type, page, value) {
	if (type === 'matter') {
		pages[page] = JSON.parse(value);
		pages[page].id = page;
		pages[page].views = views[page] || 0;
		pages[page].recent = + new Date(pages[page].date);
	} else if (type === 'views') {
		var vs = parseInt(value);
		views[page] = vs;
		if (pages[page])
			pages[page].views = vs;
	} else 
		throw Error('unknown type', type);

	if (pages[page])
		pages.emit('update', pages[page]);
}

streamPages.on('data', function(data) {
	data = JSON.parse(data);
	var split = data.key.split(sep);
	var type = split[0];
	var page = split[1];
	addPage(type, page, data.value);
});

var unpublished = {};
var user;
streamUnpubPages.on('data', function(data) {
	console.log('unpublished', data);
	data = JSON.parse(data);
	var split = data.key.split(sep);
	var u = split[0];
	if (user != u)
		return;
	var page = split[1];
	addPage('matter', page, data.value);
	unpublished[page] = page;
})

function userUnpublished(u) {
	user = u;
	_.each(unpublished, function(page) {
		console.log('delete', page);
		if (pages[page] && !pages[page].published) {
			delete pages[page];
			pages.emit('remove', {id: page});
		}
	});
	unpublished = {};
	console.log('write', user);
	if (user)
		streamUnpubPages.write(user);
}

module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams',
	 function($scope, $routeParams) {
		$scope.params = $routeParams;
		$scope.page = '/markdown/' + $routeParams.path + '.html';
		console.log('page', $scope.page);
		
	}],
	pages: pages,
	render: require('./renderClient'),
	userUnpublished: userUnpublished
};

var app = angular.module('app');
app.directive('blur', require('blur'));
app.run(['editorEvents', 'editorAuth', function(events, auth) {
	if (auth.authenticated()) {
		userUnpublished(auth.username);
	}
	events.on('login', userUnpublished);
	events.on('logout', userUnpublished);
}]);