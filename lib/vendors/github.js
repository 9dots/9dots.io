// Github.js 0.7.0
// (c) 2012 Michael Aufreiter, Development Seed
// Github.js is freely distributable under the MIT license.
// For all details and documentation:
// http://substance.io/michael/github

var _ = require('npm').underscore;

(function() {
  var Github;
  var API_URL = 'https://api.github.com';

  

  Github = window.Github = function(options) {

    // HTTP Request Abstraction
    // =======
    // 
    // I'm not proud of this and neither should you be if you were responsible for the XMLHttpRequest spec.

    function _request(method, path, data, cb, raw, sync, headers) {
      function getURL() {
        return url = API_URL + path;
      }

      var xhr = new XMLHttpRequest();
      if (!raw) {xhr.dataType = "json";}

      xhr.open(method, getURL(), !sync);
      if (!sync) {
        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {
            var parsedResponse = raw ? this.responseText : this.responseText ? JSON.parse(this.responseText) : true;
            if (this.status >= 200 && this.status < 300 || this.status === 304) {
              cb(null, parsedResponse, this);
            } else {
              cb({request: this, error: this.status, response: parsedResponse});
            }
          }
        };
      }
      xhr.setRequestHeader('Accept','application/vnd.github.raw');
      xhr.setRequestHeader('Content-Type','application/json');

      if (headers) {
        for (var i = 0; i < headers.length; i++) {
          header = headers[i];
          xhr.setRequestHeader(header[0], header[1]);
        }
      }

      if (
         (options.auth == 'oauth' && options.token) ||
         (options.auth == 'basic' && options.username && options.password)
         ) {
           xhr.setRequestHeader('Authorization',options.auth == 'oauth'
             ? 'token '+ options.token
             : 'Basic ' + Base64.encode(options.username + ':' + options.password)
           );
         }
      data ? xhr.send(JSON.stringify(data)) : xhr.send();
      if (sync) return xhr.response;
    }

    function _parseLinkHeader(err, response, xhr, cb) {
      var link = xhr.getResponseHeader('link');

      if (!err && link) {
        var parts = link.split(',');
        var length = parts.length;

        var links = {};

        var section;
        var url;
        var name;

        for (var i = 0; i < length; i++) {
          section = parts[i].split(';');

          if (section.length !== 2) {
            throw new Error("section could not be split on ';'");
          }

          url = section[0].replace(/<(.*)>/, '$1').trim();
          name = section[1].replace(/rel="(.*)"/, '$1').trim();

          links[name] = url;
        }

        if (links['next']) {
          _request('GET', links['next'].split(API_URL)[1], null, function(err, res, xhr) {
            if (typeof response.concat === 'function') {
              response = response.concat(res);
            } else if (typeof response === 'string') {
              response += res;
            }

            _parseLinkHeader(err, response, xhr, cb);
          });
        } else {
          cb(err, response);
        }
      } else {
        cb(err, response);
      }
    }
      
    // User API
    // =======

    Github.User = function() {
      this.repos = function(cb) {
        _request("GET", "/user/repos?type=all&per_page=1000&sort=updated", null, function(err, res) {
          cb(err, res);
        });
      };

      // List user organizations
      // -------

      this.orgs = function(cb) {
        _request("GET", "/user/orgs", null, function(err, res) {
          cb(err, res);
        });
      };

      // List authenticated user's gists
      // -------

      this.gists = function(cb) {
        _request("GET", "/gists", null, function(err, res) {
          cb(err,res);
        });
      };

      // Show user information
      // -------

      this.show = function(username, cb) {
        var command = username ? "/users/"+ username : "/user";

        _request("GET", command, null, function(err, res) {
          cb(err, res);
        });
      };

      // List user repositories
      // -------

      this.userRepos = function(username, cb) {
        _request("GET", "/users/"+username+"/repos?type=all&per_page=1000&sort=updated", null, function(err, res) {
          cb(err, res);
        });
      };

      this.createRepo = function(options, cb) {
        _request("POST", "/user/repos", options, cb);
      };

      this.createOrgRepo = function(org, options, cb) {
        _request("POST", "/orgs/" + org + '/repos', options, cb);
      };

      // List a user's gists
      // -------

      this.userGists = function(username, cb) {
        _request("GET", "/users/"+username+"/gists", null, function(err, res) {
          cb(err,res);
        });
      };

      // List organization repositories
      // -------

      this.orgRepos = function(orgname, cb) {
        _request("GET", "/orgs/"+orgname+"/repos?type=all&per_page=1000&sort=updated&direction=desc", null, function(err, res, xhr) {
          _parseLinkHeader(err, res, xhr, cb);
        });
      };

      // Follow user
      // -------

      this.follow = function(username, cb) {
        _request("PUT", "/user/following/"+username, null, function(err, res) {
          cb(err, res);
        });
      };

      // Unfollow user
      // -------

      this.unfollow = function(username, cb) {
        _request("DELETE", "/user/following/"+username, null, function(err, res) {
          cb(err, res);
        });
      };
    };


    // Repository API
    // =======

    Github.Repository = function(options) {
      var repo = options.name;
      var user = options.user;      
      var that = this;
      var repoPath = "/repos/" + user + "/" + repo;

      var currentTree = {
        "branch": null,
        "sha": null
      };

      var store = window.sessionStorage;
      var key = 'github:commits:' + user + ':' + repo;

      function storedCurrentTree(sha, branch) {
        var commits = JSON.parse(store.getItem(key));
        var find = _.find(commits, function(commit) {
          return commit.sha === sha && commit.branch === branch;
        });
        if (find) {
          currentTree = _.last(commits);
          return currentTree.sha;
        } else {
          currentTree = {sha: sha, branch: branch};
          pushCurrentTree();
          return sha;
        }
          
      }

      function pushCurrentTree() {
        var commits = JSON.parse(store.getItem(key));
        if (!commits)
          commits = [];
        commits.push(currentTree);
        commits = commits.slice(-50);
        store.setItem(key, JSON.stringify(commits));
      }

      // Uses the cache if branch has not been changed
      // -------

      function updateTree(branch, cb, force) {
        if (! force && branch === currentTree.branch && currentTree.sha) return cb(null, currentTree.sha);
        that.getRef("heads/"+branch, function(err, sha) {
          cb(err, storedCurrentTree(sha, branch));
        });
      }

      // Get a particular reference
      // -------

      this.getRef = function(ref, cb) {
        _request("GET", repoPath + "/git/refs/" + ref, null, function(err, res) {
          if (err) return cb(err);
          cb(null, res.object.sha);
        });
      };

      // Create a new reference
      // --------
      //
      // {
      //   "ref": "refs/heads/my-new-branch-name",
      //   "sha": "827efc6d56897b048c772eb4087f854f46256132"
      // }

      this.createRef = function(options, cb) {
        _request("POST", repoPath + "/git/refs", options, cb);
      };

      // Delete a reference
      // --------
      // 
      // repo.deleteRef('heads/gh-pages')
      // repo.deleteRef('tags/v1.0')

      this.deleteRef = function(ref, cb) {
        _request("DELETE", repoPath + "/git/refs/"+ref, options, cb);
      };

      // List all branches of a repository
      // -------

      this.listBranches = function(cb) {
        _request("GET", repoPath + "/git/refs/heads", null, function(err, heads) {
          if (err) return cb(err);
          cb(null, _.map(heads, function(head) { return _.last(head.ref.split('/')); }));
        });
      };

      // Retrieve the contents of a blob
      // -------

      this.getBlob = function(sha, cb) {
        _request("GET", repoPath + "/git/blobs/" + sha, null, cb, 'raw');
      };

      // For a given file path, get the corresponding sha (blob for files, tree for dirs)
      // -------

      this.getSha = function(branch, path, cb) {
        // Just use head if path is empty
        if (path === "") return that.getRef("heads/"+branch, cb);
        that.getTree(branch+"?recursive=true", function(err, tree) {
          var file = _.select(tree, function(file) {
            return file.path === path;
          })[0];
          cb(null, file ? file.sha : null);
        });
      };

      // Retrieve the tree a commit points to
      // -------

      this.getTree = function(tree, cb) {
        _request("GET", repoPath + "/git/trees/"+tree, null, function(err, res) {
          if (err) return cb(err);
          cb(null, res.tree);
        });
      };

      // Post a new blob object, getting a blob SHA back
      // -------

      this.postBlob = function(content, cb) {
        if (typeof(content) === "string") {
          content = {
            "content": content,
            "encoding": "utf-8"
          };
        }

        _request("POST", repoPath + "/git/blobs", content, function(err, res) {
          if (err) return cb(err);
          cb(null, res.sha);
        });
      };

      // Update an existing tree adding a new blob object getting a tree SHA back
      // -------

      this.updateTree = function(baseTree, path, blob, cb) {
        var data = {
          "base_tree": baseTree,
          "tree": [
            {
              "path": path,
              "mode": "100644",
              "type": "blob",
              "sha": blob
            }
          ]
        };
        _request("POST", repoPath + "/git/trees", data, function(err, res) {
          if (err) return cb(err);
          cb(null, res.sha);
        });
      };

      // Post a new tree object having a file path pointer replaced
      // with a new blob SHA getting a tree SHA back
      // -------

      this.postTree = function(tree, cb) {
        _request("POST", repoPath + "/git/trees", { "tree": tree }, function(err, res) {
          if (err) return cb(err);
          cb(null, res.sha);
        });
      };

      // Create a new commit object with the current commit SHA as the parent
      // and the new tree SHA, getting a commit SHA back
      // -------

      this.commit = function(parent, tree, message, cb) {
        var data = {
          "message": message,
          "parents": [
            parent
          ],
          "tree": tree
        };

        _request("POST", repoPath + "/git/commits", data, function(err, res) {
          if (err) return cb(err);
          cb(null, res.sha);
        });
      };

      // Update the reference of your head to point to the new commit SHA
      // -------

      this.updateHead = function(head, commit, cb) {
        _request("PATCH", repoPath + "/git/refs/heads/" + head, { "sha": commit }, function(err, res) {
          if (! err)
            storedCurrentTree(commit, currentTree.branch); //update latest commit
          cb(err, commit);
        });
      };

      // Show repository information
      // -------

      this.show = function(cb) {
        _request("GET", repoPath, null, cb);
      };

      // Get commits
      // --------

      this.getCommit = function(sha, cb) {
        _request("GET", repoPath + "/commits/" + sha, null, cb);
      };

      this.getCommits = function(branch, lastModified, cb) {
        _request("GET", repoPath + "/commits" + "?sha=" + branch, null, cb, false, false, [
          ['If-Modified-Since', lastModified]
        ]);
      };

      // Get contents
      // --------

      this.contents = function(branch, path, cb) {
        _request("GET", repoPath + "/contents/" + path + "?ref=" + branch, null, cb, 'raw');
      };

      this.contentsSync = function(branch, path) {
        return _request("GET", repoPath + "/contents/" + path + "?ref=" + branch, null, null, 'raw', true);
      };

      // Fork repository
      // -------

      this.fork = function(cb) {
        _request("POST", repoPath + "/forks", null, cb);
      };

      // Create pull request
      // --------

      this.createPullRequest = function(options, cb) {
        _request("POST", repoPath + "/pulls", options, cb);
      };

      // Read file at given path
      // -------

      this.read = function(branch, path, cb) {
        that.getSha(branch, path, function(err, sha) {
          if (!sha) return cb("not found", null);
          that.getBlob(sha, function(err, content) {
            cb(err, content, sha);
          });
        });
      };

      // Remove a file from the tree
      // -------

      this.remove = function(branch, path, cb) {
        updateTree(branch, function(err, latestCommit) {
          that.getTree(latestCommit+"?recursive=true", function(err, tree) {
            // Update Tree
            var newTree = _.reject(tree, function(ref) { return ref.path === path; });
            _.each(newTree, function(ref) {
              if (ref.type === "tree") delete ref.sha;
            });

            that.postTree(newTree, function(err, rootTree) {
              that.commit(latestCommit, rootTree, 'Deleted '+path , function(err, commit) {
                that.updateHead(branch, commit, function(err) {
                  cb(err);
                });
              });
            });
          });
        });
      };

      // Move a file to a new location
      // -------

      this.move = function(branch, path, newPath, cb) {
        updateTree(branch, function(err, latestCommit) {
          that.getTree(latestCommit+"?recursive=true", function(err, tree) {
            // Update Tree
            _.each(tree, function(ref) {
              if (ref.path === path) ref.path = newPath;
              if (ref.type === "tree") delete ref.sha;
            });

            that.postTree(tree, function(err, rootTree) {
              that.commit(latestCommit, rootTree, 'Deleted '+path , function(err, commit) {
                that.updateHead(branch, commit, function(err) {
                  cb(err);
                });
              });
            });
          });
        });
      };

      // Write file contents to a given branch and path
      // -------

      this.write = function(branch, path, content, message, cb) {
        updateTree(branch, function(err, latestCommit) {
          if (err) console.log('error after update Tree')
          if (err) return cb(err);
          that.postBlob(content, function(err, blob) {
            if (err) console.log('error after post blob')
            if (err) return cb(err);
            that.updateTree(latestCommit, path, blob, function(err, tree) {
              if (err) console.log('error after second update tree')
              if (err) return cb(err);
              that.commit(latestCommit, tree, message, function(err, commit) {
                if (err) console.log('error after commit')
                if (err) return cb(err);
                that.updateHead(branch, commit, cb);
              });
            });
          });
        }, true);
      };

      this.createHook = function(options, cb) {
        _request("POST", repoPath + "/hooks", options, cb);
      };

      this.listHooks = function(cb) {
        _request("GET", repoPath + "/hooks", null, cb);
      };

      this.isCollaborator = function(user, cb) {
        _request("GET", repoPath + "/collaborators/" + user, null, cb);
      }

    };

    // Gists API
    // =======

    Github.Gist = function(options) {
      var id = options.id;
      var gistPath = "/gists/"+id;

      // Read the gist
      // --------

      this.read = function(cb) {
        _request("GET", gistPath, null, function(err, gist) {
          cb(err, gist);
        });
      };

      // Create the gist
      // --------
      // {
      //  "description": "the description for this gist",
      //    "public": true,
      //    "files": {
      //      "file1.txt": {
      //        "content": "String file contents"
      //      }
      //    }
      // }
      
      this.create = function(options, cb){
        _request("POST","/gists", options, cb);
      };

      // Delete the gist
      // --------

      this.removeGist = function(cb) {
        _request("DELETE", gistPath, null, function(err,res) {
          cb(err,res);
        });
      };

      // Fork a gist
      // --------

      this.fork = function(cb) {
        _request("POST", gistPath+"/fork", null, function(err,res) {
          cb(err,res);
        });
      };

      // Update a gist with the new stuff
      // --------

      this.update = function(options, cb) {
        _request("PATCH", gistPath, options, function(err,res) {
          cb(err,res);
        });
      };
    };

    // Top Level API
    // -------

    this.getRepo = function(user, repo) {
      return new Github.Repository({user: user, name: repo});
    };

    this.getUser = function() {
      return new Github.User();
    };

    this.getGist = function(id) {
      return new Github.Gist({id: id});
    };
  };

  module.exports = Github;
}).call(this);
