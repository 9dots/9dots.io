module.exports = function() {
	return {
		controller: Controller,
		compile: function(element) {
			var transcludeHtml = element.html();
			element.html(require('./template'));
			element.find('.transclude-here').html(transcludeHtml);
		},
		scope: {
			search: '&',
			selectFn: '&select',
			placeholder: '@',
			onChange: '&'
		}
	}
};

function Controller($scope, $element) {
	
	// init
	var select = this;
	select.idx = 0;
	select.results = [];
	select.query = '';

	// event handlers
	function focusOut(e) {
		if (! $element.has(e.relatedTarget).length) {
			$scope.$apply(function() {
				select.focus = false;
			});
		}
	}

	$element.on('focusout', focusOut);
	$scope.$on('$destroy', function() {
		$element.off('focusout', focusOut);
	});

	function focusIn() {
		$scope.$apply(function() {
			select.focus = true;
		});
		
	}
	$element.find('#select-query').on('focus', focusIn);
	$scope.$on('$destroy', function() {
		$element.find('#select-query').off('focus', focusIn);
	})

	// methods
	select.reset = function() {
		this.idx = 0;
	};
	select.change = function() {
		console.log('change');
		this.reset();
		this.results = $scope.search({query: this.query});
	};
	select.up = function() {
		if (this.idx === this.results.length - 1)
			this.idx = 0;
		else
			this.idx++;		
	};
	select.down = function() {
		if (this.idx === 0)
			this.idx = this.results.length - 1;
		else
			this.idx--;
	};
	select.keypress = function(event) {
		if (event.keyCode === 40) {
			this.up();
			event.preventDefault();
		} else if (event.keyCode === 38) {
			this.down();
			event.preventDefault();
		}
		this.focus = true;
	};

	select.submit = function(idx) {
		idx = idx === undefined ? this.idx : idx;
		$scope.selectFn({result: this.results[idx]});
		$scope.onChange();
		this.query = '';
		this.focus = false;
		this.reset();
	};

	$scope.select = this;
}

Controller.$inject = ['$scope', '$element'];