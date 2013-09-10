var npm = require('npm');
var shoe = npm.shoe;
var streamPages = shoe('http://localhost:3001/pages');
var streamUnpubPages = shoe('http://localhost:3001/unpubPages');
var streamRender = shoe('http://localhost:3001/render');
var Emitter = require('emitter');
var _ = npm.underscore;
var sep = '\xff';


var pages = new Emitter;
var views = {};
function addPage(type, page, value, live) {
	if (type === 'matter') {
		try {
			pages[page] = JSON.parse(value);
		} catch(e) {
			console.log('error', value);
			throw e;
		}
		
		var p = pages[page];
		p.id = page;
		p.views = views[page] || 0;
		p.recent = + new Date(p.date);
		p.type = p.type || 'lesson';
	} else if (type === 'views') {
		var vs = parseInt(value);
		views[page] = vs;
		if (pages[page])
			pages[page].views = vs;
	} else 
		throw Error('unknown type', type);

	if (pages[page])
		pages.emit('update', pages[page], live);
		
}

streamPages.on('data', function(data) {
	data = JSON.parse(data);
	var split = data.key.split(sep);
	var type = split[0];
	var page = split[1];
	if (data.value)
		addPage(type, page, data.value, data.live);
	else if (data.type === 'del') {
		delete pages[page];
		pages.emit('remove', {id: page});
	} else {
		console.log('data', data);
		throw new Error('unknow type', data.type);
	}
});

var unpublished = {};
var user;
streamUnpubPages.on('data', function(data) {
	data = JSON.parse(data);
	var split = data.key.split(sep);
	var u = split[0];
	if (user != u)
		return;
	var page = split[1];
	if (data.value)
		addPage('matter', page, data.value, data.live);
	else if (data.type === 'del') {
		delete pages[page];
		pages.emit('remove', {id: page});
	} else
		throw new Error('unknown type', data.type)
	unpublished[page] = page;
})

function userUnpublished(u) {
	user = u;
	_.each(unpublished, function(page) {
		if (pages[page] && !pages[page].published) {
			delete pages[page];
			pages.emit('remove', {id: page});
		}
	});
	unpublished = {};
	if (user)
		streamUnpubPages.write(user);
	pages.emit('reset');
}

function sendRender(owner, file, content) {
	streamRender.write(JSON.stringify({owner: owner, file: file, content: content}));
}

module.exports = {
	template: require('./template'),	
	controller: ['$scope', '$routeParams',
	 function($scope, $routeParams) {
		$scope.params = $routeParams;
		$scope.page = '/markdown/' + $routeParams.path + '.html';
	}],
	pages: pages,
	render: require('./renderClient'),
	userUnpublished: userUnpublished,
	sendRender: sendRender
};

var app = angular.module('app');
app.directive('blur', require('blur'));
app.run(['editorEvents', 'editorAuth', '$templateCache', '$rootScope',
	function(events, auth, $templateCache, $rootScope) {
	if (auth.authenticated()) {
		userUnpublished(auth.username);
	}
	events.on('login', userUnpublished);
	events.on('logout', userUnpublished);
	pages.on('update', function(page) {
		$templateCache.remove('/markdown/' + page.id + '.html');
	});
	$rootScope.$pages = pages;
	var digest = _.throttle(function (){
		$rootScope.$digest();
	}, 50, {leading: false});
	pages.on('update', digest);
}]);