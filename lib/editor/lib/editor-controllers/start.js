var url = require('url');
var cookie = require('cookie');


module.exports = ['$scope', 'editorAuth', '$routeParams', '$location', 'editorAuth', 'setupUserRepo', 'editorEvents',
	function($scope, editorAuth, $routeParams, $location, auth, setupUserRepo, events) {
	$scope.clientId = editorAuth.id;

	var parse = url.parse(window.location.href);
	$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $routeParams.redirect_uri

	var search = $location.search();
  var code = search.code;
  var redirect = search.redirect_uri;

  // Handle Code
  if (code) {
  	$scope.loggingIn = true;
    $.getJSON(auth.url + '/authenticate/' + code, function (data) {
      cookie('oauth-token', data.token);
      window.authenticated = true;
      $scope.$apply(function() {
        $location.replace();
      	$location.search('code', null);
      	$location.search('redirect_uri', null);	
      	$location.path(redirect);
      });

      events.emit('login', auth.username);

      setupUserRepo();

    });

  }

}];


