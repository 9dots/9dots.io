module.exports = {
	template: require('./template'),
	controller: ['$scope', '$routeParams',
	 function($scope, $routeParams) {
		$scope.params = $routeParams;

		// set iframe height
		$('iframe').height($(document).height());
		$(document).resize(function() {
			$('iframe').height($(document).height());
		});
		
	}]
};