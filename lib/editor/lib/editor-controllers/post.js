

//var chosen = require('chosen-jquery-browserify');

var npm = require('npm');
var _ = npm.underscore;
var jsyaml = npm['js-yaml'];
var key = npm.keymaster;
var marked = npm.marked;
var diff = npm.diff;
var Backbone = npm.backbone;
var utils = require('util');
var CodeMirror = require('codemirror');
var path = npm.path;
var markdown = require('markdown');

/*
events: {
      'click .markdown-snippets a': 'markdownSnippet',
      'click .save-action': 'updateFile',
      'click button': 'toggleButton',
      'click .unpublished-flag': 'meta',
      'change input': 'makeDirty'
    },

this.eventRegister = app.eventRegister;

      // Listen for button clicks from the vertical nav
 _.bindAll(this, 'edit', 'preview', 'deleteFile', 'save', 'hideDiff', 'translate', 'updateFile', 'meta', 'remove');
this.eventRegister.bind('edit', this.edit);
this.eventRegister.bind('preview', this.preview);
this.eventRegister.bind('deleteFile', this.deleteFile);
this.eventRegister.bind('save', this.save);
this.eventRegister.bind('hideDiff', this.hideDiff);
this.eventRegister.bind('updateFile', this.updateFile);
this.eventRegister.bind('translate', this.translate);
this.eventRegister.bind('meta', this.meta);
this.eventRegister.bind('remove', this.remove);

this.eventRegister.trigger('documentTitle', context + pathTitle + '/' + app.state.file + ' at ' + app.state.branch);
      this.eventRegister.trigger('sidebarContext', this.data, 'post');
*/

module.exports = ['$scope', '$routeParams', '$element', 'editorUserData', 'editorModels', 'editorState', "editorAuth", 'editorEvents', 'pages', '$location',
  function($scope, $routeParams, $element, userData, models, state, auth, events, pages, $location) {

    var callbacks = ['edit', 'preview', 'cancel', 'save', 'updateFile', 'deleteFile'];

    _.extend(this, {

      init: function() {
        var self = this;
        this.events = events;

        // setup callbacks
        _.each(callbacks, function(callback) {
          events.on(callback, self[callback]);
        });

        var file = $routeParams.page.split('.')[0] + '.md';
        this.file = file;
        this.filepath = path.join(auth.repo.path, file);

        this.newFile = $routeParams.mode === 'new';

        var repo = this.repo = auth.repo;

        this.edit('edit');

        var destroyed = false;
        $scope.$on('$destroy', function() {
          destroyed = true;
        });

        var ctrl = this;
        if (!this.newFile) {
          models.loadPost('9dots', repo.name, repo.branch, repo.path, file, _.bind(function(err, data) {
            if (err) 
              throw new Error('This file does not exist.');
            if (destroyed)
              return;

            this.data = data;
            data.repo.getSha(auth.repo.branch, auth.repo.path + '/' + file, function(err, sha) {
              data.sha = sha;
              ctrl.stashApply();
            });
            this.prevFile = this.serialize();
            this.initEditor();
            $scope.$safeApply();

          }, this));
        } else {
          this.data = {
            content: '',
            metadata: {
              created: new Date(),
              published: false,
            },
            writeable: true,
            persisted: false,
            repo: models.getRepo('9dots', repo.name)
          };

          this.initEditor();
          
        }
        

        // initialize
        $scope.post = this;

        this.model = userData;

        // TODO: remove listener
        $(window).on('pagehide', _.bind(this.stashFile, this));
        $scope.$on('$locationChangeStart', function() {
          ctrl.stashFile();
        });
        
      },
      setMode: function(mode) {
        this.lastMode = this.mode;
        this.mode = mode;
        events.emit('editMode', this.mode);
      },
      serialize: function() {
        var metadata = jsyaml.dump(this.data.metadata);
        return ['---', metadata, '---'].join('\n') + '\n\n' + this.data.content;
      },
      stashFile: function(e) {
        if (e) e.preventDefault();
        if (!window.sessionStorage) return false;

        var store = window.sessionStorage;
        var filepath = this.file;

        // Don't stash if filepath is undefined
        if (filepath) {
          try {
            store.setItem(filepath, JSON.stringify({
              sha: this.data.sha,
              content: this.editor ? this.editor.getValue() : null,
              metadata: this.data.metadata
            }));
          } catch (err) {
            console.log(err);
          }
        }
      },
      stashApply: function() {
        if (!window.sessionStorage) return false;
        
        var store = window.sessionStorage;
        var filepath = this.file;
        var item = store.getItem(filepath);
        var stash = JSON.parse(item);

        if (stash && stash.sha === this.data.sha) {
          // Restore from stash if file sha hasn't changed
          if (this.editor && this.editor.setValue && stash.content && this.data.content !== stash.content) {
            this.editor.setValue(stash.content);
          }
          this.data.metadata = stash.metadata;
        } else if (item) {
          // Remove expired content
          store.removeItem(filepath);
        }
      },

      edit: function(e) {
        var view = this;

        view.setMode('edit');
        view.setupMeta();

        return false;
      },

      preview: function(e) {
        this.setMode('preview');

        var metadata = _.clone(this.data.metadata);
        metadata.content = this.data.content;
        this.html =  markdown.render(metadata);
      },

      compilePreview: function(content) {
        // Scan the content search for ![]()
        // grab the path and file and form a RAW github aboslute request for it
        var scan = /\!\[([^\[]*)\]\(([^\)]+)\)/g;
        var image = /\!\[([^\[]*)\]\(([^\)]+)\)/;
        var titleAttribute = /".*?"/;

        // Build an array of found images
        var result = content.match(scan);

        // Iterate over the results and replace
        _(result).each(function(r) {
            var parts = (image).exec(r);

            if (parts !== null) {
              var path = parts[2];

              if (!_.absolutePath(path)) {
                // Remove any title attribute in the image tag is there is one.
                if (titleAttribute.test(path)) {
                  path = path.split(titleAttribute)[0];
                }

                var raw = auth.raw + '/' + app.state.user + '/' + app.state.repo + '/' + app.state.branch + '/' + path;
                if (app.state.isPrivate) {
                  // append auth param
                  raw += '?login=' + cookie.get('username') + '&token=' + cookie.get('oauth-token');
                }

                content = content.replace(r, '![' + parts[1] + '](' + raw + ')');
              }
            }
        });

        return content;
      },

      setupMeta: function() {

        setTimeout(function() {
          var queryEl = $('#blurb');

          pages.pages.on('update', _.throttle(function() {
            queryEl.atwho({
              at: '#',
              data: _.keys(pages.tags)
            });
          }));
          

          queryEl.on('inserted.atwho', function() {
            queryEl.trigger('input');
          });
        })
        
      },

      published: function() {
        return this.data && this.data.metadata.published;
      },

      publishedText: function() {
        return this.data && this.data.metadata.published ? 'Published' : 'Unpublished';
      },

      togglePublish: function() {
        this.data.metadata.published = !this.data.metadata.published;
        this.makeDirty();
      },

      deleteFile: function() {
        var repo = auth.repo;
        var file = this.file;
        var view = this;
        if (confirm('Are you sure you want to delete this file?')) {
          models.deletePost('9dots', repo.name, repo.branch, repo.path, file, function (err) {
            if (err) 
              return alert('Error during deletion. Please wait 30 seconds and try again.');
            $scope.$safeApply(function() {
              view.events.emit('deleted');
            });
          });
        }
        return false;
      },

      makeDirty: function(e) {
        this.dirty = true;
        if (this.editor && this.editor.getValue) this.data.content = this.editor.getValue();

        this.events.emit('updateSaveState', 'Changes to Save', 'dirty');

        // Pass a popover span to the avatar icon
        //$('.save-action', this.el).find('.popup').html(this.data.alterable ? 'save' : 'submit');
      },

      toggleButton: function(e) {
        // Check whether this.model.metadata.published exists
        // if it does unpublish and vice versa
        var $target = $(e.target);
        var value = $target.val();

        if (value === 'true') {
          $target.val(false).html($target.data('off'));
        } else if (value === 'false') {
          $target.val(true).html($target.data('on'));
        }

        this.makeDirty();
        return false;
      },

      computeDiff: function() {
        //TODO: text 1 '' if new file
        var text1 = _.escape(this.prevFile);
        var text2 = _.escape(this.serialize());
        var d = diff.diffWords(text1, text2);
        var compare = '';

        for (var i = 0; i < d.length; i++) {
          if (d[i].removed) {
            compare += '<del>' + d[i].value + '</del>';
          } else if (d[i].added) {
            compare += '<ins>' + d[i].value + '</ins>';
          } else {
            compare += d[i].value;
          }
        }

        this.html = '<pre>' + compare + '</pre>';
      },

      save: function() {
        this.setMode('save');
        this.computeDiff();
      },

      refreshCodeMirror: function() {
        this.editor.refresh();
      },

      sendPatch: function(filepath, filename, filecontent, message) {
        // Submits a patch (fork + pull request workflow)

        var view = this;

        function patch() {
          view.model.content = view.prevFile;
          view.editor.setValue(view.prevFile);

          models.patchFile(app.state.user, app.state.repo, app.state.branch, filepath, filecontent, message, function (err) {
            if (err) {
              _.delay(function () {
                view.events.emit('updateSaveState', 'Submit Change', '');
              }, 3000);

              view.events.emit('updateSaveState', '!&nbsp;Try&nbsp;again&nbsp;in 30&nbsp;seconds', 'error');
              return;
            }

            view.dirty = false;
            view.model.persisted = true;
            view.model.file = filename;
            view.updateURL();
            view.prevFile = filecontent;
            view.events.emit('Change Submitted', 'saved');
          });

        }

        view.events.emit('updateSaveState', 'Submitting Change', 'saving');
        patch();

        return false;
      },

      saveFile: function(filecontent, message) {
        var view = this;
        var repo = this.repo;
        models.saveFile('9dots', repo.name, repo.branch, view.filepath, filecontent, message, function(err) {
          $scope.$safeApply(function() {
            if (err) {
              view.events.emit('updateSaveState', 'error', 'error');
              return;
            }
            view.dirty = false;
            view.data.persisted = true;

            if (view.newFile) {
              $location.path('/edit/' + $routeParams.page);
            }

            /*if (app.state.mode === 'new') {
              app.state.mode = 'edit';
              view.events.emit('renderNav');
            }*/

            //view.renderHeading();
            //view.updateURL();
            view.prevFile = filecontent;
            view.events.emit('close');
            //view.closeSettings();
            //view.updatePublishState();
            view.events.emit('updateSaveState', 'saved', 'saved', true);
          });

        });


        view.events.emit('updateSaveState', 'saving', 'saving');
      },


      updateFile: function(method, message) {
        var filecontent = this.serialize();
        this.data.content = this.editor.getValue();
        this[method](filecontent, message);
      },

      keyMap: function() {
        var view = this;

        return {
          'Ctrl-S': function(codemirror) {
            view.updateFile();
          },
          'Cmd-B': function(codemirror) {
            if (view.editor.getSelection() !== '') view.bold(view.editor.getSelection());
          },
          'Ctrl-B': function(codemirror) {
            if (view.editor.getSelection() !== '') view.bold(view.editor.getSelection());
          },
          'Cmd-I': function(codemirror) {
            if (view.editor.getSelection() !== '') view.italic(view.editor.getSelection());
          },
          'Ctrl-I': function(codemirror) {
            if (view.editor.getSelection() !== '') view.italic(view.editor.getSelection());
          }
        };
      },

      cancel: function() {
        events.emit(this.lastMode);
      },

      initEditor: function() {
        var view = this;

        view.editor = CodeMirror(document.getElementById('code'), {
          mode: 'gfm',
          value: view.data.content,
          lineWrapping: true,
          lineNumbers: true,
          extraKeys: view.keyMap(),
          matchBrackets: true,
          dragDrop: false,
          theme: 'prose-bright'
        });

        view.editor.focus();

        var $snippetLinks = $('.toolbar .group a', view.el);
        view.editor.on('cursorActivity', _.bind(function() {

          var selection = _.trim(view.editor.getSelection());
          $snippetLinks.removeClass('active');

          var match = {
            lineBreak: /\n/,
            h1: /^#{1}/,
            h2: /^#{2}/,
            h3: /^#{3}/,
            h4: /^#{4}/,
            strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
            italic: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
            isNumber: parseInt(selection.charAt(0), 10)
          };

          if (!match.isNumber) {
            switch (selection.charAt(0)) {
              case '#':
                if (!match.lineBreak.test(selection)) {
                  if (match.h3.test(selection) && !match.h4.test(selection)) {
                    $('[data-key="sub-heading"]').addClass('active');
                  } else if (match.h2.test(selection) && !match.h3.test(selection)) {
                    $('[data-key="heading"]').addClass('active');
                  }
                }
                break;
              case '>':
                $('[data-key="quote"]').addClass('active');
                break;
              case '*':
              case '_':
                if (!match.lineBreak.test(selection)) {
                  if (match.strong.test(selection)) {
                    $('[data-key="bold"]').addClass('active');
                  } else if (match.italic.test(selection)) {
                    $('[data-key="italic"]').addClass('active');
                  }
                }
                break;
              case '!':
                if (!match.lineBreak.test(selection) &&
                    selection.charAt(1) === '[' &&
                    selection.charAt(selection.length - 1) === ')') {
                  $('[data-key="media"]').addClass('active');
                }
                break;
              case '[':
                if (!match.lineBreak.test(selection) &&
                    selection.charAt(selection.length - 1) === ')') {
                  $('[data-key="link"]').addClass('active');
                }
                break;
              case '-':
                if (selection.charAt(1) === ' ') {
                  $('[data-key="list"]').addClass('active');
                }
              break;
            }
          } else {
            if (selection.charAt(1) === '.' && selection.charAt(2) === ' ') {
              $('[data-key="numbered-list"]').addClass('active');
            }
          }
        }, view));

        view.editor.on('change', _.bind(view.makeDirty, view));
        view.editor.on('focus', _.bind(function() {

          // If an upload queue is set, we want to clear it.
          this.queue = undefined;

          // If a dialog window is open and the editor is in focus, close it.
          $('.toolbar .group a', this.el).removeClass('on');
          //$('#dialog', view.el).empty().removeClass();
          this.hideDialog();
        }, view));
        view.refreshCodeMirror();

      },

      hideDialog: function() {
        var self = this;
        $scope.$safeApply(function() {
          self.dialog = '';
        });
      },

      dialogClass: function() {
        var cls = {};
        if (this.dialog) {
          cls.dialog = true;
          cls[this.dialog] = true;
        } else {
          cls.dialog = false;
        }
        return cls;
      },

      markdownSnippet: function(e) {
        var view = this;
        var $target = $(e.target, this.el).closest('a');
        var $dialog = $('#dialog', this.el);
        var $snippets = $('.toolbar .group a', this.el);
        var key = $target.data('key');
        var snippet = $target.data('snippet');
        var selection = _.trim(this.editor.getSelection());

        this.hideDialog();

        if (snippet) {
          $snippets.removeClass('on');

          if (selection) {
            switch (key) {
            case 'bold':
              this.bold(selection);
              break;
            case 'italic':
              this.italic(selection);
              break;
            case 'heading':
              this.heading(selection);
              break;
            case 'sub-heading':
              this.subHeading(selection);
              break;
            case 'quote':
              this.quote(selection);
              break;
            default:
              this.editor.replaceSelection(snippet);
              break;
            }
            view.editor.focus();
            
          } else {
            this.editor.replaceSelection(snippet);
            view.editor.focus();
          }
        } else if ($target.data('dialog')) {

          // This condition handles the link and media link in the toolbar.
          if ($target.hasClass('on')) {
            $target.removeClass('on');
            //$dialog.removeClass().empty();
          } else {
            $snippets.removeClass('on');
            $target.addClass('on');

            switch(key) {
              case 'link':
                view.dialog = 'link';

                if (view.relativeLinks) {
                  $('.chzn-select', $dialog).chosen().change(function() {
                    $('.chzn-single span').text(t('dialogs.link.insertLocal'));

                    var parts = $(this).val().split(',');
                    $('input[name=href]', $dialog).val(parts[0]);
                    $('input[name=text]', $dialog).val(parts[1]);
                  });
                }

                if (selection) {
                  // test if this is a markdown link: [text](link)
                  var link = /\[([^\]]+)\]\(([^)]+)\)/;
                  var quoted = /".*?"/;

                  var text = selection;
                  var href;
                  var title;

                  if (link.test(selection)) {
                    var parts = link.exec(selection);
                    text = parts[1];
                    href = parts[2];

                    // Search for a title attrbute within the url string
                    if (quoted.test(parts[2])) {
                      href = parts[2].split(quoted)[0];

                      // TODO could be improved
                      title = parts[2].match(quoted)[0].replace(/"/g, '');
                    }
                  }

                  $('input[name=text]', $dialog).val(text);
                  if (href) $('input[name=href]', $dialog).val(href);
                  if (title) $('input[name=title]', $dialog).val(title);
                }
              break;
              case 'media':
                view.dialog = 'media';

                if (selection) {
                  var image = /\!\[([^\[]*)\]\(([^\)]+)\)/;
                  var src;
                  var alt;

                  if (image.test(selection)) {
                    var imageParts = image.exec(selection);
                    alt = imageParts[1];
                    src = imageParts[2];

                    $('input[name=url]', $dialog).val(src);
                    if (alt) $('input[name=alt]', $dialog).val(alt);
                  }
                }
              break;
              case 'help':
                tmpl = _(app.templates.helpDialog).template();
                $dialog.append(tmpl({
                  help: toolbar.help
                }));

                // Page through different help sections
                var $mainMenu = $('.main-menu a', this.el);
                var $subMenu = $('.sub-menu', this.el);
                var $content = $('.help-content', this.el);

                $mainMenu.on('click', function() {
                  if (!$(this).hasClass('active')) {

                    $mainMenu.removeClass('active');
                    $content.removeClass('active');
                    $subMenu
                        .removeClass('active')
                        .find('a')
                        .removeClass('active');

                    $(this).addClass('active');

                    // Add the relavent sub menu
                    var parent = $(this).data('id');
                    $('.' + parent).addClass('active');

                    // Add an active class and populate the
                    // content of the first list item.
                    var $firstSubElement = $('.' + parent + ' a:first', this.el);
                    $firstSubElement.addClass('active');

                    var subParent = $firstSubElement.data('id');
                    $('.help-' + subParent).addClass('active');
                  }
                  return false;
                });

                $subMenu.find('a').on('click', function() {
                  if (!$(this).hasClass('active')) {

                    $subMenu.find('a').removeClass('active');
                    $content.removeClass('active');
                    $(this).addClass('active');

                    // Add the relavent content section
                    var parent = $(this).data('id');
                    $('.help-' + parent).addClass('active');
                  }

                  return false;
                });

              break;
            }
          }
        }

        e.preventDefault();
      },

      dialogInsert: function(e) {
        var $dialog = $('#dialog', this.el);
        var $target = $(e.target, this.el);
        var type = $target.data('type');

        if (type === 'link') {
          var href = $('input[name="href"]').val();
          var text = $('input[name="text"]').val();
          var title = $('input[name="title"]').val();

          if (!text) text = href;

          if (title) {
            this.editor.replaceSelection('[' + text + '](' + href + ' "' + title + '")');
          } else {
            this.editor.replaceSelection('[' + text + '](' + href + ')');
          }

          this.editor.focus();
        }

        return false;
      },

      dialogInsertImage: function(src) {
        var alt = $('input[name="alt"]').val();
        this.editor.replaceSelection('\n![' + alt + '](' + src + ')');
        this.editor.focus();
      },

      heading: function(s) {
        if (s.charAt(0) === '#' && s.charAt(2) !== '#') {
          this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
        } else {
          this.editor.replaceSelection('## ' + s.replace(/#/g, ''));
        }
      },

      subHeading: function(s) {
        if (s.charAt(0) === '#' && s.charAt(3) !== '#') {
          this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
        } else {
          this.editor.replaceSelection('### ' + s.replace(/#/g, ''));
        }
      },

      italic: function(s) {
        if (s.charAt(0) === '_' && s.charAt(s.length - 1 === '_')) {
          this.editor.replaceSelection(s.replace(/_/g, ''));
        } else {
          this.editor.replaceSelection('_' + s.replace(/_/g, '') + '_');
        }
      },

      bold: function(s) {
        if (s.charAt(0) === '*' && s.charAt(s.length - 1 === '*')) {
          this.editor.replaceSelection(s.replace(/\*/g, ''));
        } else {
          this.editor.replaceSelection('**' + s.replace(/\*/g, '') + '**');
        }
      },

      quote: function(s) {
        if (s.charAt(0) === '>') {
          this.editor.replaceSelection(_.lTrim(s.replace(/\>/g, '')));
        } else {
          this.editor.replaceSelection('> ' + s.replace(/\>/g, ''));
        }
      },

      remove: function () {
        console.log('remove');
        // remove listeners
        _.each(callbacks, function(callback) {
          events.off(callback, this[callback]);
        });

        $(window).unbind('pagehide');
      }
    });

    
    _.bindAll.apply(_,[this].concat(callbacks));
    $scope.$on('$destroy', this.remove());

    this.init();

  }
];

