(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.vex = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Tests for browser support.
 */

var innerHTMLBug = false;
var bugTestDiv;
if (typeof document !== 'undefined') {
  bugTestDiv = document.createElement('div');
  // Setup
  bugTestDiv.innerHTML = '  <link/><table></table><a href="/a">a</a><input type="checkbox"/>';
  // Make sure that link elements get serialized correctly by innerHTML
  // This requires a wrapper element in IE
  innerHTMLBug = !bugTestDiv.getElementsByTagName('link').length;
  bugTestDiv = undefined;
}

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  // for script/link/style tags to work in IE6-8, you have to wrap
  // in a div with a non-whitespace character in front, ha!
  _default: innerHTMLBug ? [1, 'X<div>', '</div>'] : [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.polyline =
map.ellipse =
map.polygon =
map.circle =
map.text =
map.line =
map.path =
map.rect =
map.g = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return a DOM Node instance, which could be a TextNode,
 * HTML DOM Node of some kind (<div> for example), or a DocumentFragment
 * instance, depending on the contents of the `html` string.
 *
 * @param {String} html - HTML string to "domify"
 * @param {Document} doc - The `document` instance to create the Node for
 * @return {DOMNode} the TextNode, DOM Node, or DocumentFragment instance
 * @api private
 */

function parse(html, doc) {
  if ('string' != typeof html) throw new TypeError('String expected');

  // default to the global `document` object
  if (!doc) doc = document;

  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return doc.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = doc.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = doc.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = doc.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

},{}],2:[function(require,module,exports){
// get successful control from form and assemble into object
// http://www.w3.org/TR/html401/interact/forms.html#h-17.13.2

// types which indicate a submit action and are not successful controls
// these will be ignored
var k_r_submitter = /^(?:submit|button|image|reset|file)$/i;

// node names which could be successful controls
var k_r_success_contrls = /^(?:input|select|textarea|keygen)/i;

// Matches bracket notation.
var brackets = /(\[[^\[\]]*\])/g;

// serializes form fields
// @param form MUST be an HTMLForm element
// @param options is an optional argument to configure the serialization. Default output
// with no options specified is a url encoded string
//    - hash: [true | false] Configure the output type. If true, the output will
//    be a js object.
//    - serializer: [function] Optional serializer function to override the default one.
//    The function takes 3 arguments (result, key, value) and should return new result
//    hash and url encoded str serializers are provided with this module
//    - disabled: [true | false]. If true serialize disabled fields.
//    - empty: [true | false]. If true serialize empty fields
function serialize(form, options) {
    if (typeof options != 'object') {
        options = { hash: !!options };
    }
    else if (options.hash === undefined) {
        options.hash = true;
    }

    var result = (options.hash) ? {} : '';
    var serializer = options.serializer || ((options.hash) ? hash_serializer : str_serialize);

    var elements = form && form.elements ? form.elements : [];

    //Object store each radio and set if it's empty or not
    var radio_store = Object.create(null);

    for (var i=0 ; i<elements.length ; ++i) {
        var element = elements[i];

        // ingore disabled fields
        if ((!options.disabled && element.disabled) || !element.name) {
            continue;
        }
        // ignore anyhting that is not considered a success field
        if (!k_r_success_contrls.test(element.nodeName) ||
            k_r_submitter.test(element.type)) {
            continue;
        }

        var key = element.name;
        var val = element.value;

        // we can't just use element.value for checkboxes cause some browsers lie to us
        // they say "on" for value when the box isn't checked
        if ((element.type === 'checkbox' || element.type === 'radio') && !element.checked) {
            val = undefined;
        }

        // If we want empty elements
        if (options.empty) {
            // for checkbox
            if (element.type === 'checkbox' && !element.checked) {
                val = '';
            }

            // for radio
            if (element.type === 'radio') {
                if (!radio_store[element.name] && !element.checked) {
                    radio_store[element.name] = false;
                }
                else if (element.checked) {
                    radio_store[element.name] = true;
                }
            }

            // if options empty is true, continue only if its radio
            if (!val && element.type == 'radio') {
                continue;
            }
        }
        else {
            // value-less fields are ignored unless options.empty is true
            if (!val) {
                continue;
            }
        }

        // multi select boxes
        if (element.type === 'select-multiple') {
            val = [];

            var selectOptions = element.options;
            var isSelectedOptions = false;
            for (var j=0 ; j<selectOptions.length ; ++j) {
                var option = selectOptions[j];
                var allowedEmpty = options.empty && !option.value;
                var hasValue = (option.value || allowedEmpty);
                if (option.selected && hasValue) {
                    isSelectedOptions = true;

                    // If using a hash serializer be sure to add the
                    // correct notation for an array in the multi-select
                    // context. Here the name attribute on the select element
                    // might be missing the trailing bracket pair. Both names
                    // "foo" and "foo[]" should be arrays.
                    if (options.hash && key.slice(key.length - 2) !== '[]') {
                        result = serializer(result, key + '[]', option.value);
                    }
                    else {
                        result = serializer(result, key, option.value);
                    }
                }
            }

            // Serialize if no selected options and options.empty is true
            if (!isSelectedOptions && options.empty) {
                result = serializer(result, key, '');
            }

            continue;
        }

        result = serializer(result, key, val);
    }

    // Check for all empty radio buttons and serialize them with key=""
    if (options.empty) {
        for (var key in radio_store) {
            if (!radio_store[key]) {
                result = serializer(result, key, '');
            }
        }
    }

    return result;
}

function parse_keys(string) {
    var keys = [];
    var prefix = /^([^\[\]]*)/;
    var children = new RegExp(brackets);
    var match = prefix.exec(string);

    if (match[1]) {
        keys.push(match[1]);
    }

    while ((match = children.exec(string)) !== null) {
        keys.push(match[1]);
    }

    return keys;
}

function hash_assign(result, keys, value) {
    if (keys.length === 0) {
        result = value;
        return result;
    }

    var key = keys.shift();
    var between = key.match(/^\[(.+?)\]$/);

    if (key === '[]') {
        result = result || [];

        if (Array.isArray(result)) {
            result.push(hash_assign(null, keys, value));
        }
        else {
            // This might be the result of bad name attributes like "[][foo]",
            // in this case the original `result` object will already be
            // assigned to an object literal. Rather than coerce the object to
            // an array, or cause an exception the attribute "_values" is
            // assigned as an array.
            result._values = result._values || [];
            result._values.push(hash_assign(null, keys, value));
        }

        return result;
    }

    // Key is an attribute name and can be assigned directly.
    if (!between) {
        result[key] = hash_assign(result[key], keys, value);
    }
    else {
        var string = between[1];
        // +var converts the variable into a number
        // better than parseInt because it doesn't truncate away trailing
        // letters and actually fails if whole thing is not a number
        var index = +string;

        // If the characters between the brackets is not a number it is an
        // attribute name and can be assigned directly.
        if (isNaN(index)) {
            result = result || {};
            result[string] = hash_assign(result[string], keys, value);
        }
        else {
            result = result || [];
            result[index] = hash_assign(result[index], keys, value);
        }
    }

    return result;
}

// Object/hash encoding serializer.
function hash_serializer(result, key, value) {
    var matches = key.match(brackets);

    // Has brackets? Use the recursive assignment function to walk the keys,
    // construct any missing objects in the result tree and make the assignment
    // at the end of the chain.
    if (matches) {
        var keys = parse_keys(key);
        hash_assign(result, keys, value);
    }
    else {
        // Non bracket notation can make assignments directly.
        var existing = result[key];

        // If the value has been assigned already (for instance when a radio and
        // a checkbox have the same name attribute) convert the previous value
        // into an array before pushing into it.
        //
        // NOTE: If this requirement were removed all hash creation and
        // assignment could go through `hash_assign`.
        if (existing) {
            if (!Array.isArray(existing)) {
                result[key] = [ existing ];
            }

            result[key].push(value);
        }
        else {
            result[key] = value;
        }
    }

    return result;
}

// urlform encoding serializer
function str_serialize(result, key, value) {
    // encode newlines as \r\n cause the html spec says so
    value = value.replace(/(\r)?\n/g, '\r\n');
    value = encodeURIComponent(value);

    // spaces should be '+' rather than '%20'.
    value = value.replace(/%20/g, '+');
    return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + value;
}

module.exports = serialize;

},{}],3:[function(require,module,exports){
/*global window*/

/**
 * Check if object is dom node.
 *
 * @param {Object} val
 * @return {Boolean}
 * @api public
 */

module.exports = function isNode(val){
  if (!val || typeof val !== 'object') return false;
  if (window && 'object' == typeof window.Node) return val instanceof window.Node;
  return 'number' == typeof val.nodeType && 'string' == typeof val.nodeName;
}

},{}],4:[function(require,module,exports){
var domify = require('domify')
var isDom = require('is-dom')
var serialize = require('form-serialize')

var vexDialogFactory = function (vex) {
  if (!vex) {
    throw new Error('Vex is required to use vex.dialog')
  }

  var getVexContentFromTarget = function (vexContent) {
    while (!vexContent.classList.contains('vex-content')) {
      if (!vexContent.parentNode) {
        throw new Error('Could not find vex-content')
      }
      vexContent = vexContent.parentNode
    }
    return vexContent
  }

  var dialog = {}

  dialog.buttons = {
    YES: {
      text: 'OK',
      type: 'submit',
      className: 'vex-dialog-button-primary'
    },

    NO: {
      text: 'Cancel',
      type: 'button',
      className: 'vex-dialog-button-secondary',
      click: function (vexContent, event) {
        var id = parseInt(vexContent.getAttribute('data-vex-id'))
        vex.vexes[id].vex.value = false
        vex.close(id)
      }
    }
  }

  dialog.defaultOptions = {
    callback: function () {},
    afterOpen: function () {},
    message: 'Message',
    input: '<input name="vex" type="hidden" value="_vex-empty-value" />',
    value: false,
    buttons: [
      dialog.buttons.YES,
      dialog.buttons.NO
    ],
    showCloseButton: false,
    onSubmit: function (e) {
      var vexContent = getVexContentFromTarget(event.target)
      var id = parseInt(vexContent.getAttribute('data-vex-id'))
      event.preventDefault()
      vex.vexes[id].value = serialize(e.target, { hash: true })
      return vex.close(id)
    },
    focusFirstInput: true
  }

  dialog.defaultAlertOptions = {
    message: 'Alert',
    buttons: [
      dialog.buttons.YES
    ]
  }

  dialog.defaultConfirmOptions = {
    message: 'Confirm'
  }

  dialog.open = function (options) {
    options = Object.assign({}, vex.defaultOptions, dialog.defaultOptions, options)
    options.content = dialog.buildDialogForm(options)

    beforeClose = options.beforeClose
    options.beforeClose = function (vexContent, config) {
      options.callback(config.value)
      if (beforeClose) {
        beforeClose(vexContent, config)
      }
    }

    vexContent = vex.open(options)

    if (options.focusFirstInput) {
      vexContent.querySelector('button, input, textarea').focus()
    }

    return vexContent
  }

  dialog.alert = function (options) {
    if (typeof options === 'string') {
      options = {
        message: options
      }
    }

    options = Object.assign({}, dialog.defaultAlertOptions, options)

    return dialog.open(options)
  }

  dialog.confirm = function (options) {
    if (typeof options === 'string') {
      throw new Error('dialog.confirm(options) requires options.callback.')
    }

    options = Object.assign({}, dialog.defaultConfirmOptions, options)

    return dialog.open(options)
  }

  dialog.prompt = function (options) {
    if (typeof options === 'string') {
      throw new Error('dialog.prompt(options) requires options.callback.')
    }

    var defaultPromptOptions = {
      message: '<label for="vex">' + options.label || 'Prompt:' + '</label>',
      input: '<input name="vex" type="text" class="vex-dialog-prompt-input" placeholder="' + options.placeholder || '' + '" value="' + options.value || '' + '" />'
    }

    options = Object.assign({}, defaultPromptOptions, options)

    return dialog.open(options)
  }

  dialog.buildDialogForm = function (options) {
    var form = document.createElement('form')
    form.classList.add('vex-dialog-form')

    var message = document.createElement('div')
    message.classList.add('vex-dialog-message')
    message.appendChild(isDom(options.message) ? options.message : domify(options.message))

    var input = document.createElement('div')
    input.classList.add('vex-dialog-input')
    input.appendChild(isDom(options.input) ? options.input : domify(options.input))

    form.appendChild(message)
    form.appendChild(input)
    form.appendChild(dialog.buttonsToDOM(options.buttons))
    form.addEventListener('submit', options.onSubmit)

    return form
  }

  dialog.buttonsToDOM = function (buttons) {
    var domButtons = document.createElement('div')
    domButtons.classList.add('vex-dialog-buttons')

    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i]
      var domButton = document.createElement('button')
      domButton.type = button.type
      domButton.textContent = button.text
      domButton.classList.add(button.className)
      domButton.classList.add('vex-dialog-button')
      if (i === 0) {
        domButton.classList.add('vex-first')
      } else if (i === buttons.length - 1) {
        domButton.classList.add('vex-last')
      }
      domButton.addEventListener('click', function (e) {
        var vexContent = getVexContentFromTarget(e.target)
        if (this.click) {
          this.click(vexContent, e)
        }
      }.bind(button))
      domButtons.appendChild(domButton)
    }

    return domButtons
  }

  return dialog
}

module.exports = vexDialogFactory

},{"domify":1,"form-serialize":2,"is-dom":3}],5:[function(require,module,exports){
// Object.assign polyfill
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign !== 'function') {
  Object.assign = function (target) {
    'use strict'
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object')
    }

    target = Object(target)
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index]
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key]
          }
        }
      }
    }
    return target
  }
}

var domify = require('domify')
var isDom = require('is-dom')

var addListeners = function (events, element, fn) {
  for (var i = 0; i < events.length; i++) {
    element.addEventListener(events[i], fn)
  }
}

var vexFactory = function () {
  var animationEndSupport = false

  

  // Vex
  var vex = {

    // Internal lookup table of vexes by id
    vexes: {},

    globalID: 1,

    // Inconsistent casings are intentional
    // http://stackoverflow.com/a/12958895/131898
    animationEndEvent: ['animationend', 'webkitAnimationEnd', 'mozAnimationEnd', 'MSAnimationEnd', 'oanimationend'],

    baseClassNames: {
      vex: 'vex',
      content: 'vex-content',
      overlay: 'vex-overlay',
      close: 'vex-close',
      closing: 'vex-closing',
      open: 'vex-open'
    },

    defaultOptions: {
      content: '',
      showCloseButton: true,
      escapeButtonCloses: true,
      overlayClosesOnClick: true,
      appendLocation: 'body',
      className: '',
      css: {},
      overlayClassName: '',
      overlayCSS: {},
      contentClassName: '',
      contentCSS: {},
      closeClassName: '',
      closeCSS: {}
    },

    open: function (options) {
      options = Object.assign({}, this.defaultOptions, options)

      options.id = this.globalID
      this.globalID += 1

      // Vex

      options.vex = document.createElement('div')
      options.vex.classList.add(this.baseClassNames.vex)
      if (options.className) {
        options.vex.classList.add(options.className)
      }
      // TODO .css(options.css)
      options.vex.setAttribute('data-vex-id', options.id)

      // Overlay

      options.vexOverlay = document.createElement('div')
      options.vexOverlay.classList.add(this.baseClassNames.overlay)
      if (options.overlayClassName) {
        options.vexOverlay.classList.add(options.overlayClassName)
      }
      // TODO .css(options.overlayCSS)

      if (options.overlayClosesOnClick) {
        options.vexOverlay.addEventListener('click', function (e) {
          if (e.target !== options.vexOverlay) {
            return
          }
          this.close(options.id)
        }.bind(this))
      }

      options.vex.appendChild(options.vexOverlay)

      // Content

      options.vexContent = document.createElement('div')
      options.vexContent.classList.add(this.baseClassNames.content)
      if (options.contentClassName) {
        options.vexContent.classList.add(options.contentClassName)
      }
      options.vexContent.setAttribute('data-vex-id', options.id)
      // TODO .css(options.contentCSS)
      options.vexContent.appendChild(isDom(options.content) ? options.content : domify(options.content))

      options.vex.appendChild(options.vexContent)

      // Close button

      if (options.showCloseButton) {
        options.closeButton = document.createElement('div')
        options.closeButton.classList.add(this.baseClassNames.close)
        if (options.closeClassName) {
          options.closeButton.classList.add(options.closeClassName)
        }
        // TODO .css(options.closeCSS)
        options.closeButton.addEventListener('click', function () {
          this.close(options.id)
        }.bind(this))

        options.vexContent.appendChild(options.closeButton)
      }

      // Lookup

      this.vexes[options.id] = options

      // Inject DOM and trigger callbacks/events

      document.querySelector(options.appendLocation).appendChild(options.vex)

      // Call afterOpen callback and trigger vexOpen event

      if (options.afterOpen) {
        options.afterOpen(options.vexContent, options)
      }
      // TODO: trigger events ('open')
      setTimeout(this.setupBodyClassNameOnOpen.bind(this), 0)

      // For chaining
      return options.vexContent
    },

    getSelectorFromBaseClass: function (baseClass) {
      return '.' + baseClass.split(' ').join('.')
    },

    getAllVexes: function () {
      var notClosingSelector = '.' + this.baseClassNames.vex + ':not(.' + this.baseClassNames.closing + ')'
      return document.querySelectorAll(notClosingSelector)
    },

    getVexByID: function (id) {
      var allVexes = this.getAllVexes()
      for (var i = 0; i < allVexes.length; i++) {
        if (parseInt(allVexes[i].getAttribute('data-vex-id')) === id) {
          return allVexes[i]
        }
      }
      return null
    },

    close: function (id) {
      if (!id) {
        var allVexes = this.getAllVexes()
        var lastVex = allVexes[allVexes.length - 1]
        if (!lastVex) {
          return false
        }
        id = parseInt(lastVex.getAttribute('data-vex-id'))
      }

      return this.closeByID(id)
    },

    closeAll: function () {
      var ids = []
      var allVexes = this.getAllVexes()
      for (var i = 0; i < allVexes.length; i++) {
        ids.push(parseInt(allVexes[i].getAttribute('data-vex-id')))
      }
      if (ids.length === 0) {
        return false
      }

      ids.reverse()

      for (var j = 0; j < ids.length; j++) {
        this.closeByID(ids[j])
      }

      return true
    },

    closeByID: function (id) {
      var vexContent = this.getVexByID(id)
      if (!vexContent) {
        return
      }

      var options = Object.assign({}, this.vexes[parseInt(vexContent.getAttribute('data-vex-id'))])

      var beforeClose = function () {
        if (options.beforeClose) {
          options.beforeClose(vexContent, options)
        }
      }

      var close = function () {
        // TODO event triggering ('vexClose')
        if (!options.vex.parentNode) {
          options.vex = null
          return
        }
        options.vex.parentNode.removeChild(options.vex)
        this.setupBodyClassNameOnAfterClose()
        if (options.afterClose) {
          options.afterClose(vexContent, options)
        }
        // TODO event triggering ('afterClose')
      }.bind(this)

      var style = window.getComputedStyle(vexContent)
      function hasAnimationPre(prefix) {
        return style.getPropertyValue(prefix + 'animation-name') !== 'none' && style.getPropertyValue(prefix + 'animation-duration') !== '0s'
      }
      var hasAnimation = hasAnimationPre('') || hasAnimationPre('-webkit-') || hasAnimationPre('-moz-') || hasAnimationPre('-o-')

      if (animationEndSupport && hasAnimation) {
        if (beforeClose() !== false) {
          addListeners(this.animationEndEvent, options.vex, function (e) {
            close()
          })
          options.vex.classList.add(this.baseClassNames.closing)
        }
      } else {
        if (beforeClose() !== false) {
          close()
        }
      }

      return true
    },

    closeByEscape: function () {
      var ids = []
      var allVexes = this.getAllVexes()
      for (var i = 0; i < allVexes.length; i++) {
        ids.push(parseInt(allVexes.getAttribute('data-vex-id')))
      }
      if (ids.length === 0) {
        return false
      }

      var id = Math.max.apply(null, ids)

      if (this.vexes[id].escapeButtonCloses) {
        return false
      }

      return this.closeByID(id)
    },

    setupBodyClassNameOnOpen: function () {
      document.body.classList.add(this.baseClassNames.open)
    },

    setupBodyClassNameOnAfterClose: function () {
      if (!this.getAllVexes().length) {
        document.body.classList.remove(this.baseClassNames.open)
      }
    },

    hideLoading: function () {
      var el = document.querySelector('.vex-loading-spinner')
      if (el) {
        el.parentNode.removeChild(el)
      }
    },

    showLoading: function () {
      this.hideLoading()
      var el = document.createElement('div')
      el.classList = 'vex-loading-spinner ' + this.defaultOptions.className
      document.body.appendChild(el)
    }
  }

  vex.dialog = require('./vex.dialog')(vex)

  var onLoad = function (event) {
    // Detect CSS Animation Support

    var s = (document.body || document.documentElement).style
    animationEndSupport = s.animation !== undefined || s.WebkitAnimation !== undefined || s.MozAnimation !== undefined || s.MsAnimation !== undefined || s.OAnimation !== undefined

    // Register global handler for ESC
    window.addEventListener('keyup', function (event) {
      if (event.keyCode === 27) {
        vex.closeByEscape()
      }
    })
  }

  if (document.readyState === 'complete' || document.readyState === 'loaded') {
    onLoad()
  } else {
    document.addEventListener('DOMContentLoaded', onLoad)
  }

  return vex
}

module.exports = vexFactory()

},{"./vex.dialog":4,"domify":1,"is-dom":3}]},{},[5])(5)
});