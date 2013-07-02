/* Author:

*/

var socket = require('engine.io')('ws://localhost:3000');


var tagRegExp = /(?:#([a-zA-Z0-9]+))/g
	, authorRegExp = /(?:@([a-zA-Z0-9]+))/g;

angular.module('app', [])
.factory('filter', function() {
	return function(query) {
		if (!query)
			return;

		var filter = {};
		filter.tags = [];

		var words = query
			.replace(tagRegExp, function(_, match) {
				filter.tags.push(match);
				return '';
			})
			.replace(authorRegExp, function(_, match) {
				filter.author = match;
				return '';
			})
			.replace('#', '')
			.replace('@', '')
			.split(' ');

		for (var i = 0, len = words.length; i < len; i++) {
			if (words[i]) {
				if (!filter.words)
					filter.words = {$in: []};
				filter.words.$in.push([words[i]]);
			}
				
		}
		return filter;
		
	}
})
.factory('allPages', function() {
	var Emitter = require('emitter');
	allPages = new Emitter;

	var hashTagReg = /#[a-zA-z]+/g;

	var pages = {};

	lunr.tokenizer = function (str) {
	  if (!str) return []
	  if (Array.isArray(str)) return str

	  var str = str.replace(/^\s+/, '')

	  for (var i = str.length - 1; i >= 0; i--) {
	    if (/\S/.test(str.charAt(i))) {
	      str = str.substring(0, i + 1)
	      break
	    }
	  }

	  return str
	    .split(/\s+/)
	    .map(function (token) {
	    	if (token[0] !== '#') {
	    		token = token.replace(/^\W+/, '')
	    	}
	      return token.replace(/\W+$/, '').toLowerCase();
	    });
	}

	var index = allPages.index = lunr(function() {
		this.field('title');
    this.field('blurb');
    this.field('tags', {boost: 10});
    this.ref('relativeOutPath');

    this.pipeline.remove(lunr.stemmer);
    this.pipeline.after(lunr.stopWordFilter, function(token, tokenIndex, tokens) {
    	if (token.match(hashTagReg)) {
    		return token;
    	} else
    		return lunr.stemmer(token, tokenIndex, tokens);
    });


	});

	// request pages
	socket.send(JSON.stringify({req: 'pages'}));
	socket.on('message', function(message) {
		var data = JSON.parse(message);
		if (data.res === 'pages') {
			allPages.pages = data.body;
			allPages.emit('update');
		}
	});

	function getTags() {
		allPages.tags = {};
		_.each(allPages.pages, function(page) {
			if (!page.blurb)
				return;
			var hashTags = page.blurb.match(hashTagReg);
			page.tags = hashTags;
			_.each(page.tags, function(tag) {
				tag = tag.slice(1);
				if (!allPages.tags[tag])
					allPages.tags[tag] = 0;
				allPages.tags[tag]++;
			});
		});
	}

	allPages.on('update', getTags);

	function addToIndex() {
		_.each(allPages.pages, function(page, idx) {
			pages[page.relativeOutPath] = page;
			index.add(page);
		});
	}

	allPages.on('update', addToIndex);

	allPages.query = function(query) {
		var search = index.search(query);
		return _.map(search, function(res) {
			return pages[res.ref];
		});
	};

	return allPages;


})
.controller('pages', ['$scope', 'allPages', 'filter', 
	function($scope, allPages, filter) {

	$scope.select2Options = {
		tags: []
	};

	// pages
	$scope.pages = [];

	allPages.on('update', function() {
		$scope.$apply(function() {
			$scope.pages = allPages.pages;

			var queryEl = $('#query');

			queryEl.atwho({
				at: '#',
				data: _.keys(allPages.tags)
			});

			queryEl.on('inserted.atwho', function() {
				queryEl.trigger('input');
			});
		});
	});

	$scope.$watch('query', function(query) {
		if (!query)
			$scope.pages = allPages.pages;
		else
			$scope.pages = allPages.query(query);
	});

	


}]);




