var templates = require('editor-templates');
var controllers = require('editor-controllers');
var Emitter = require('emitter');
var store = require('store');
var npm = require('npm');
var shoe = npm.shoe;

//TODO: get rid of this
window.app = {};

var app = angular.module('app')
.factory('editorEvents', function() {
  return new Emitter();
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

  var config = SETTINGS.config;
  auth.id = config.clientId;
  auth.url = config.gatekeeperUrl;
  auth.repo = config.repo;
  auth.userRepo = config.userRepo;
  auth.authenticated = models.authenticated;
  auth.username = store.get('username');

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
  return function(owner, cb) {
    var func = null;
    if (owner && auth.username !== owner) {
      func = 'orgCreateIfNotExist';
    } else {
      func = 'createIfNotExist';
    }
    owner = owner || auth.username;
    models[func](owner, auth.userRepo.name, {
        homepage: auth.userRepo.homepage,
        description: auth.userRepo.description,
        auto_init: true,
      }, function(err) {
        if (err)
          throw err;

        var config = SETTINGS.config;
        var hook = config.hook;
        var server = config.server;

        hook.config.url = server + '/webhook';
        models.createHookIfNotExist(owner, auth.userRepo.name, hook, function(err) {
          cb && cb(err);
        });
      });
    };
}])
.factory('user', ['editorAuth', 'editorModels', 'editorEvents', function(auth, models, events) {
  var user = new Emitter;

  function getUserInfo() {
    models.user(function(err, res) {
      _.extend(user, res);
      user.emit('loaded');
    });

    models.orgs(function(err, res) {
      user.orgs = res;
      user.emit('orgs');
    });
  }

  if (auth.authenticated()) {
    getUserInfo();
  }
  events.on('login', getUserInfo);

  return user;
}])
.factory('users', ['user', '$http', function(user, $http) {
  //XXX fix
  var users = {};
  $http.get(SETTINGS.config.backend + '/user/all')
    .success(function(res) {
      _.each(res, function(user) {
        users[user.id] = user;
      });
    });

  user.on('loaded', function() {
    var userData = {id: user.login, gravatar: user.gravatar_id};
    if (user.gravatar_id && !users[user.login]) {
      $http.post(SETTINGS.config.backend + '/user', 
        userData)
        .success(function() {
          users[userData.id] = userData;
        })
    } else if (user.gravatar_id && (users[user.login].gravatar !== user.gravatar_id)) {
      $http.put(SETTINGS.config.backend + '/user/' + userData.id, 
        userData)
        .success(function() {
          users[userData.id] = userData;
        })
    }

  });
  return users;
}])
.filter('avatar', ['users', function(users) {
  return function(user) {
    return "http://www.gravatar.com/avatar/" + ((users[user] && users[user].gravatar) || '') + "?s=29";
  };
}])
.run(['$rootScope', '$location', 'editorAuth', 'setupUserRepo', 'user', 'editorEvents',
  function($rootScope, $location, auth, setupUserRepo, user, events) {

  if (auth.authenticated()) {
    setupUserRepo();
  }
  events.on('login', setupUserRepo);

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

// add directives

app.directive('editorMenu', function() {
  return {
    controller: controllers.vert,
    template: templates.vert
  };
});

app.directive('post', function() {
  return {
    replace: true,
    controller: ['$scope', '$element', '$attrs', '$injector', 
      function($scope, $element, $attrs, $injector) {
        var ctrl = $attrs.controller;
        $injector.invoke(controllers[ctrl], this, {$scope: $scope, $element: $element, $attrs: $attrs});
    }],
    template: templates.post
  }
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
      .when('/edit/lesson/:user/:path*', {
        templateUrl: 'editor/lesson-post.html',
        restricted: true,
      })
      .when('/edit/unit/:user/:path*', {
        templateUrl: 'editor/unit-post.html',
        restricted: true,
      })
      .when('/new/lesson', {
        templateUrl: 'editor/lesson-post.html',
        restricted: true,
      })
      .when('/new/unit', {
        templateUrl: 'editor/unit-post.html',
        restricted: true
      })
      .when('/edit/wiki/:user/:path*', {
        templateUrl: 'editor/wiki-post.html',
        restricted: true
      })
      .when('/new/wiki', {
        templateUrl: 'editor/wiki-post.html',
        restricted: true
      })
      .when('/new', {
        templateUrl: 'editor/new.html',
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






