var templates = require('editor-templates');
var controllers = require('editor-controllers');
var oauth = require('./oauth');
var cookie = require('cookie');
var Emitter = require('emitter');

//TODO: get rid of this
window.app = {}

var app = angular.module('app')
.factory('editorEvents', function() {
  return new Emitter;
})
.factory('editorModels', function() {
  return require('./models');
})
.factory('editorState', function() {
  return {};
})
.factory('editorUserData', function() {
  var data = {};
  return data;
})
.factory('editorAuth', ['editorModels', function(models) {
  window.Models = models;
  var auth = {};
  auth.id = oauth.clientId;
  auth.url = oauth.gatekeeperUrl;
  auth.repo = oauth.repo;
  auth.userRepo = oauth.userRepo;
  if (SETTINGS.env === 'development') {
    _.extend(auth.userRepo, oauth.userRepoDev);
  } 
  auth.authenticated = models.authenticated;
  auth.username = cookie('username');

  if (auth.authenticated()) {
    models.loadApplication(function(err, data) {
      if (err) {
        throw err;
      } else {
        auth.username = data.login;
        auth.avatar = data.avatar_url;
      }
    });
  }
  return auth;
}])
.factory('setupUserRepo', ['editorAuth', 'editorModels', function(auth, models) {
  return function() {
    models.createIfNotExist(auth.username, auth.userRepo.name, {
        homepage: auth.userRepo.homepage,
        description: auth.userRepo.description
      }, function(err) {
        if (err)
          throw err;
        var hook = oauth.hook;

        var server = null;
        if (SETTINGS.env === 'development')
          server = SETTINGS.config.devServer;
        else
          server = SETTINGS.config.server;
        hook.config.url = server + '/webhook';
        console.log('hook', hook);
        models.createHookIfNotExist(auth.username, auth.userRepo.name, hook, function(err) {
          if (err)
            throw err;
        });
    });
  }
  
}])
.run(['$rootScope', '$location', 'editorAuth', 'setupUserRepo', 
  function($rootScope, $location, auth, setupUserRepo) {

  if (auth.authenticated()) {
    setupUserRepo();
  }

  $rootScope.$on('$routeChangeStart', function(event, next) {
    if (next.restricted && !auth.authenticated()) {
      $location.search('redirect_uri', $location.path());
      $location.path('/login');
    }
  });
}]);


// add controllers
_.each(controllers, function(controller, name) {
  var controllerName = 'editor' + name[0].toUpperCase() + name.slice(1) + 'Ctrl';
  app.controller(controllerName, controller);
});

// add tempates
app.run(['$templateCache', function($templateCache) {
  _.each(templates, function(template, name) {
    $templateCache.put('editor/' + name + '.html', template);
  });

  TemplateCache = $templateCache;
  
}]);

module.exports = {
  route: function($routeProvider) {
    $routeProvider
      .when('/edit/u/:user/*path', {
        templateUrl: 'editor/post.html',
        restricted: true
      })
      .when('/edit/*path', {
        templateUrl: 'editor/post.html',
        restricted: true
      })
      .when('/new', {
        templateUrl: 'editor/post.html',
        restricted: true
      })
      .when('/login', {
        template: templates.login
      })
      .when('/logout', {
        template: 'null',
        controller: controllers.logout
      })
  },
  vertTemplateUrl: 'editor/vert.html'
}

var upload = require('upload');
app.controller('uploadCtrl', upload.controller);


//TODO: add back in
// Prevent exit when there are unsaved changes
/*window.onbeforeunload = function() {
  if (window.app.instance.mainView && window.app.instance.mainView.dirty)
    return 'You have unsaved changes. Are you sure you want to leave?';
};

window.confirmExit = function() {
  if (window.app.instance.mainView && window.app.instance.mainView.dirty)
    return confirm('You have unsaved changes. Are you sure you want to leave?');
  return true;
};*/

// Bootup

