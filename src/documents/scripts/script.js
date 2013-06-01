/* Author:

*/

var socket = require('engine.io')('ws://localhost:3000');


angular.module('app', [])
.controller('pages', ['$scope', function($scope) {
	console.log('pages');
	socket.send(JSON.stringify({req: 'pages'}));
	$scope.pages = [];
	socket.on('message', function(data) {
		console.log('got message');
		$scope.$apply(function() {
			$scope.pages = JSON.parse(data);
		});
		
		console.log('pages', $scope.pages);
	});
}]);




