module.exports = {
	template: require('./template'),
	controller: 'searchCtrl'
};


var markdown = require('markdown');
var npm = require('npm');
var _ = npm.underscore;

var tagRegExp = /(?:#([a-zA-Z0-9\-]+))/g
	, authorRegExp = /(?:@([a-zA-Z0-9]+))/g;

angular.module('app')
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
.factory('pages', ['$rootScope', function($rootScope) {
	var pages = {};
	pages.pages = markdown.pages;
	pages.tags = {};
	pages.tagsBy = {};
	pages.authors = {};

	var hashTagReg = /#([a-zA-z0-9\-]+)/g;


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

	var index = pages.index = lunr(function() {
		this.field('title');
    this.field('blurbSearch');
    this.field('tags', {boost: 10});
    this.field('author', {boost: 10});
    this.ref('id');

    this.pipeline.remove(lunr.stemmer);
    this.pipeline.after(lunr.stopWordFilter, function(token, tokenIndex, tokens) {
    	if (token.match(hashTagReg)) {
    		return token;
    	} else
    		return lunr.stemmer(token, tokenIndex, tokens);
    });


	});

	function getTags(page) {
		// remove old tags
		_.each(pages.tagsBy[page.id] || [], function(tag) {
			tag = tag.slice(1);
			pages.tags[tag]--;
		});

		if (!page.blurb)
			page.tags = [];
		else {
			var hashTags = page.blurb.match(hashTagReg);
			page.tags = hashTags;
			page.blurbSearch = page.blurb.replace(hashTagReg, '$1').replace('-', ' ');
		}
			
		_.each(page.tags, function(tag) {
			tag = tag.slice(1);
			if (!pages.tags[tag])
				pages.tags[tag] = 0;
			pages.tags[tag]++;
		});

		pages.tagsBy[page.id] = page.tags;

	}

	pages.pages.on('update', getTags);
	_.each(pages.pages, getTags);
	pages.pages.on('remove', getTags);

	function getAuthor(page) {
		if (page.author)
			pages.authors[page.author] = true;
	}
	pages.pages.on('update', getAuthor);
	_.each(pages.pages, getAuthor);

	function addToIndex(page) {
		index.update(page);
	}

	pages.pages.on('update', addToIndex);
	_.each(pages.pages, addToIndex);

	pages.pages.on('remove', function(page) {
		index.remove(page);
	});

	pages.query = function(query) {
		var search = index.search(query);
		return _.map(search, function(res) {
			return pages.pages[res.ref];
		});
	};

	pages.get = function(id) {
		return pages.pages[id];
	};

	return pages;


}])
.controller('searchCtrl', ['$scope', 'pages', 'filter', 'users',
	function($scope, pages, filter, users) {

	$scope.select2Options = {
		tags: []
	};

	// pages
	$scope.pages = pages.pages;

	function setupAtWho() {
		var queryEl = $('#query');
		queryEl
			.atwho({
				at: '#',
				data: _.keys(pages.tags)
			})
			.atwho({
				at: '@',
				data: _.keys(pages.authors)
			});

		queryEl.on('inserted.atwho', function() {
			queryEl.trigger('input');
		});
	}

	// XXX clean this up
	function resetPages() {
		$scope.$safeApply(function() {
			$scope.pages = _.filter(pages.pages, function(page) {
				if (page.id)
					return true;
			});
		});
	}

	var throttledReset = _.throttle(resetPages, 50, {leading: false});

	pages.pages.on('reset', throttledReset);

	function maybeReset(page, live) {
		if (!live) {
			throttledReset();
		}
	}
	
	pages.pages.on('update', setupAtWho);
	setupAtWho();

	pages.pages.on('update', maybeReset);

	$scope.$on('$destroy', function() {
		pages.pages.off('update', setupAtWho);
		pages.pages.off('update', maybeReset)
	});

	var delayTimeout = null;
	var lastQuery = null;
	function delayQuery(fn) {
		function call() {
			$scope.$apply(function() {
				delayTimeout = null;
				fn(lastQuery);
			});
		}

		return function(query) {
			lastQuery = query;
			if (delayTimeout)
				clearTimeout(delayTimeout);
			delayTimeout = setTimeout(call, 100);
		}
	}

	$scope.$watch('query', delayQuery(function(query) {
		query = query && query.replace(/#$/,'').replace(/@$/, '');
		if (!query)
			resetPages();
		else {
			$scope.pages = pages.query(query);
		}
			
	}));


	$scope.sort = '-recent';
	$scope.type = 'lesson';
	$scope.link = function(page) {
		if (page.published)
			return page.id;
		else 
			return 'edit/' + page.type + '/' + page.id;

	};


}]);




