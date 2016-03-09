/*can-legacy-view-helpers@0.0.0#render.js*/
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { 'default': obj };
}
var _canView = require('can/view/view');
var _canView2 = _interopRequireDefault(_canView);
var _canViewElements = require('can/view/elements');
var _canViewElements2 = _interopRequireDefault(_canViewElements);
var _canViewLive = require('can/view/live/live');
var _canViewLive2 = _interopRequireDefault(_canViewLive);
require('can/util/string/string');
var pendingHookups = [], tagChildren = function tagChildren(tagName) {
        var newTag = _canViewElements2['default'].tagMap[tagName] || 'span';
        if (newTag === 'span') {
            return '@@!!@@';
        }
        return '<' + newTag + '>' + tagChildren(newTag) + '</' + newTag + '>';
    }, contentText = function contentText(input, tag) {
        if (typeof input === 'string') {
            return input;
        }
        if (!input && input !== 0) {
            return '';
        }
        var hook = input.hookup && function (el, id) {
            input.hookup.call(input, el, id);
        } || typeof input === 'function' && input;
        if (hook) {
            if (tag) {
                return '<' + tag + ' ' + _canView2['default'].view.hook(hook) + '></' + tag + '>';
            } else {
                pendingHookups.push(hook);
            }
            return '';
        }
        return '' + input;
    }, contentEscape = function contentEscape(txt, tag) {
        return typeof txt === 'string' || typeof txt === 'number' ? _canView2['default'].esc(txt) : contentText(txt, tag);
    }, withinTemplatedSectionWithinAnElement = false, emptyHandler = function emptyHandler() {
    };
var lastHookups;
_canView2['default'].extend(_canView2['default'].view, {
    live: _canViewLive2['default'],
    setupLists: function setupLists() {
        var old = _canView2['default'].view.lists, data;
        _canView2['default'].view.lists = function (list, renderer) {
            data = {
                list: list,
                renderer: renderer
            };
            return Math.random();
        };
        return function () {
            _canView2['default'].view.lists = old;
            return data;
        };
    },
    getHooks: function getHooks() {
        var hooks = pendingHookups.slice(0);
        lastHookups = hooks;
        pendingHookups = [];
        return hooks;
    },
    onlytxt: function onlytxt(self, func) {
        return contentEscape(func.call(self));
    },
    txt: function txt(escape, tagName, status, self, func) {
        var tag = _canViewElements2['default'].tagMap[tagName] || 'span', setupLiveBinding = false, value, listData, compute, unbind = emptyHandler, attributeName;
        if (withinTemplatedSectionWithinAnElement) {
            value = func.call(self);
        } else {
            if (typeof status === 'string' || status === 1) {
                withinTemplatedSectionWithinAnElement = true;
            }
            var listTeardown = _canView2['default'].view.setupLists();
            unbind = function () {
                compute.unbind('change', emptyHandler);
            };
            compute = _canView2['default'].compute(func, self, false);
            compute.bind('change', emptyHandler);
            listData = listTeardown();
            value = compute();
            withinTemplatedSectionWithinAnElement = false;
            setupLiveBinding = compute.computeInstance.hasDependencies;
        }
        if (listData) {
            unbind();
            return '<' + tag + _canView2['default'].view.hook(function (el, parentNode) {
                _canViewLive2['default'].list(el, listData.list, listData.renderer, self, parentNode);
            }) + '></' + tag + '>';
        }
        if (!setupLiveBinding || typeof value === 'function') {
            unbind();
            return (withinTemplatedSectionWithinAnElement || escape === 2 || !escape ? contentText : contentEscape)(value, status === 0 && tag);
        }
        var contentProp = _canViewElements2['default'].tagToContentPropMap[tagName];
        if (status === 0 && !contentProp) {
            var selfClosing = !!_canViewElements2['default'].selfClosingTags[tag];
            return '<' + tag + _canView2['default'].view.hook(escape && typeof value !== 'object' ? function (el, parentNode) {
                _canViewLive2['default'].text(el, compute, parentNode);
                unbind();
            } : function (el, parentNode) {
                _canViewLive2['default'].html(el, compute, parentNode);
                unbind();
            }) + (selfClosing ? '/>' : '>' + tagChildren(tag) + '</' + tag + '>');
        } else if (status === 1) {
            pendingHookups.push(function (el) {
                _canViewLive2['default'].attributes(el, compute, compute());
                unbind();
            });
            return compute();
        } else if (escape === 2) {
            attributeName = status;
            pendingHookups.push(function (el) {
                _canViewLive2['default'].specialAttribute(el, attributeName, compute);
                unbind();
            });
            return compute();
        } else {
            attributeName = status === 0 ? contentProp : status;
            (status === 0 ? lastHookups : pendingHookups).push(function (el) {
                _canViewLive2['default'].attribute(el, attributeName, compute);
                unbind();
            });
            return _canViewLive2['default'].attributePlaceholder;
        }
    }
});
exports['default'] = _canView2['default'];
module.exports = exports['default'];