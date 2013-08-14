module.exports.post = require('./post');
module.exports.login = require('./start');
module.exports.vert = require('./vert');

module.exports.logout = ['editorModels', '$location', '$scope', 'editorEvents',
function(models, $location, $scope, events) {
	models.logout();
  events.emit('logout');
  setTimeout(function() {
    $location.path('/');
    $scope.$apply();
  });
	
}];


var cookie = require('cookie');
module.exports.auth = ['$location', 'editorAuth', '$scope', function($location, auth, $scope) {
	var search = $location.search();
  var code = search.code;
  var redirect = search.redirect_uri;
  console.log('code', code, redirect);
  // Handle Code
  if (code) {
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

