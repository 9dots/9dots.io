var url = require('url');
var store = require('store');


module.exports = ['$scope', 'editorAuth', '$routeParams', '$location', 'editorAuth', 'setupUserRepo', 'editorEvents',
	function($scope, editorAuth, $routeParams, $location, auth, setupUserRepo, events) {
	$scope.clientId = editorAuth.id;

	var parse = url.parse(window.location.href);
	$scope.redirectUri = 'http://' + parse.host + '/login?redirect_uri=' + $routeParams.redirect_uri

	var search = $location.search();
  var code = search.code;
  var redirect = search.redirect_uri;
  console.log('auth code', code);
  // Handle Code
  if (code) {
  	$scope.loggingIn = true;
    console.log('authenticate', auth.url);
    $.getJSON(auth.url + '/authenticate/' + code, function (data) {
      store.set('oauth-token', data.token);
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


