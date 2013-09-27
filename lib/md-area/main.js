var CodeMirror = require('codemirror');
var npm = require('npm');
var _ = npm.underscore;

function Controller($scope, $element, $attrs, $timeout, $parse) {
  var onChangeGet = $parse($attrs.onChange);
  var placeholder = $attrs.placeholder && $scope.$eval($attrs.placeholder);

  this.onChangeCb = function() {
    return onChangeGet($scope.$parent);
  };

	this.keyMap = function() {
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
  };

  this.init = false;

  this.initEditor = function(content) {
    var view = this;
    this.init = true

    view.editor = CodeMirror($element.find('.code')[0], {
      mode: 'gfm',
      value: content || '',
      lineWrapping: true,
      extraKeys: view.keyMap(),
      matchBrackets: true,
      dragDrop: false,
      placeholder: placeholder,
      theme: 'prose-bright'
    });

    // XXX emit dirty
    view.editor.on('change', view.onChange); 
    //view.editor.on('change', _.bind(view.makeDirty, view));
    view.editor.on('focus', _.bind(function() {
      // If a dialog window is open and the editor is in focus, close it.
      $('.toolbar .group a', this.el).removeClass('on');
      //$('#dialog', view.el).empty().removeClass();
      this.hideDialog();
    }, view));
    view.refreshCodeMirror();

  };

  this.setContent = function(content) {
    this.editor.setValue(content);
  };

  this.getContent = function() {
    return this.editor.getValue();
  }

  this.refreshCodeMirror = function() {
    this.editor && this.editor.refresh();
  };

  this.hideDialog = function() {
    var self = this;
    $scope.$safeApply(function() {
      self.dialog = '';
    });
  };

  this.dialogClass = function() {
    var cls = {};
    if (this.dialog) {
      cls.dialog = true;
      cls[this.dialog] = true;
    } else {
      cls.dialog = false;
    }
    return cls;
  };

  this.markdownSnippet = function(e) {
    var view = this;
    var $target = $(e.target, this.el).closest('a');
    var $dialog = $('#dialog', this.el);
    var $snippets = $('.toolbar .group a', this.el);
    var key = $target.data('key');
    var snippet = $target.data('snippet');
    var offset = $target.data('offset');
    var selection = this.editor.getSelection();

    this.hideDialog();

    if (snippet) {
      $snippets.removeClass('on');

      this.editor.replaceSelection(snippet, 'end');
      if (offset) {
        var c = this.editor.getCursor();
        offset = parseInt(offset);
        c.ch -= offset;
        this.editor.setCursor(c);
      }
      view.editor.focus();

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
        }
      }
    }

    e.preventDefault();
  };

  this.dialogInsert = function(e) {
    var $dialog = $('#dialog', this.el);
    var $target = $(e.target, this.el);
    var type = $target.data('type');

    if (type === 'link') {
      var href = $('input[name="href"]').val();
      var text = $('input[name="text"]').val();
      var title = $('input[name="title"]').val();

      if (!text) text = href;

      if (title) {
        this.editor.replaceSelection('[' + text + '](' + href + ' "' + title + '") ', 'end');
      } else {
        this.editor.replaceSelection('[' + text + '](' + href + ') ', 'end');
      }

      this.editor.focus();
    }

    return false;
  };

  this.dialogInsertImage = function(src) {
    var alt = $('input[name="alt"]').val();
    this.editor.replaceSelection('![' + alt + '](' + src + ') ', 'end');
    this.editor.focus();
  };

  this.heading = function(s) {
    if (s.charAt(0) === '#' && s.charAt(2) !== '#') {
      this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
    } else {
      this.editor.replaceSelection('## ' + s.replace(/#/g, ''), 'end');
    }
  };

  this.subHeading = function(s) {
    if (s.charAt(0) === '#' && s.charAt(3) !== '#') {
      this.editor.replaceSelection(_.lTrim(s.replace(/#/g, '')));
    } else {
      this.editor.replaceSelection('### ' + s.replace(/#/g, ''));
    }
  };

  this.italic = function(s) {
    if (s.charAt(0) === '_' && s.charAt(s.length - 1 === '_')) {
      this.editor.replaceSelection(s.replace(/_/g, ''));
    } else {
      this.editor.replaceSelection('_' + s.replace(/_/g, '') + '_');
    }
  };

  this.bold = function(s) {
    if (s.charAt(0) === '*' && s.charAt(s.length - 1 === '*')) {
      this.editor.replaceSelection(s.replace(/\*/g, ''));
    } else {
      this.editor.replaceSelection('**' + s.replace(/\*/g, '') + '**');
    }
  };

  this.quote = function(s) {
    if (s.charAt(0) === '>') {
      this.editor.replaceSelection(_.lTrim(s.replace(/\>/g, '')));
    } else {
      this.editor.replaceSelection('> ' + s.replace(/\>/g, ''));
    }
  };


  $scope.md = this;
}

Controller.$inject = ['$scope', '$element', '$attrs', '$timeout', '$parse'];

function link(scope, element, attrs, ctrls) {
  var ctrl = ctrls[0];
  var ngModel = ctrls[1];
  var suppressCb = false;

  ctrl.onChange = function() {
    scope.$safeApply(function() {
      var newValue = ctrl.getContent();
      if (newValue !== scope.$eval(attrs.value)) {
        ngModel.$setViewValue(newValue);
        if (!suppressCb)
          ctrl.onChangeCb();
      }
    });
    
  };

  ngModel.$formatters.push(function (value) {
    if (_.isUndefined(value) || value === null) {
      return '';
    } else {
      return value;
    }
  });

  ngModel.$render = function () {
    if (ctrl.init) {
      suppressCb = true;
      ctrl.setContent(ngModel.$viewValue);
      suppressCb = false;
    } else {
      ctrl.initEditor(ngModel.$viewValue);
    }
    
  };
}

module.exports = function() {
	return {
    require: ['mdArea', 'ngModel'],
		controller: Controller,
    link: link,
		template: require('./template')
	};
};