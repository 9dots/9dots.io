var url = require('url');
var cookie = require('cookie');

module.exports = ['$scope', 'editorAuth', '$routeParams', '$location', 'editorAuth',
	function($scope, editorAuth, $routeParams, $location, auth) {
	$scope.clientId = editorAuth.id;

	var parse = url.parse(window.location.href);
	$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $routeParams.redirect_uri
	console.log('redirect uri', $scope.redirectUri);

	var search = $location.search();
  var code = search.code;
  var redirect = search.redirect_uri;

  // Handle Code
  if (code) {
  	$scope.loggingIn = true;
    $.getJSON(auth.url + '/authenticate/' + code, function (data) {
      console.log('set oauth');
      cookie('oauth-token', data.token);
      window.authenticated = true;
      $scope.$apply(function() {
        $location.replace();
      	$location.search('code', null);
      	$location.search('redirect_uri', null);	
      	$location.path(redirect);
      });

    });
  }

}];


