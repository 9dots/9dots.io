var templates = require('editor-templates');
var controllers = require('editor-controllers');
var cookie = require('cookie');
var Emitter = require('emitter');
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
    console.log('create if not exist');
    models.createIfNotExist(auth.username, auth.userRepo.name, {
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
        console.log('hook', hook);
        models.createHookIfNotExist(auth.username, auth.userRepo.name, hook, function(err) {
          if (err)
            throw err;
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
  }

  if (auth.authenticated()) {
    console.log('get user info');
    getUserInfo();
  }
  events.on('login', getUserInfo);

  return user;
}])
.factory('users', ['user', function(user) {
  var users = {};
  var authorsStream = shoe('http://localhost:3001/authors');
  authorsStream.on('data', function(data) {
    data = JSON.parse(data);
    users[data.key] = data.value;
  });
  user.on('loaded', function() {
    console.log('loaded');
    if (user.gravatar_id && users[user.login] !== user.gravatar_id) {
      authorsStream.write(JSON.stringify({key: user.login, value: user.gravatar_id}));
      console.log('write');
    }

  });
  return users;
}])
.filter('avatar', ['users', function(users) {
  return function(user) {
    return "http://www.gravatar.com/avatar/" + users[user] + "?s=29";
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
      .when('/edit/lesson/u/:user/*path', {
        templateUrl: 'editor/lesson-post.html',
        restricted: true,
      })
      .when('/edit/unit/u/:user/*path', {
        templateUrl: 'editor/unit-post.html',
        restricted: true,
      })
      .when('/edit/p/*path', {
        templateUrl: 'editor/lesson-post.html',
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

