/*can-legacy-view-helpers@0.2.0#src/view*/
define(function (require, exports, module) {
    var isFunction = require('can-util/js/is-function'), makeArray = require('can-util/js/make-array'), deepAssign = require('can-util/js/deep-assign'), canFrag = require('can-util/dom/frag'), each = require('can-util/js/each'), hookupId = 1;
    var $view = function (view, data, helpers, callback) {
        if (isFunction(helpers)) {
            callback = helpers;
            helpers = undefined;
        }
        return $view.renderAs('fragment', view, data, helpers, callback);
    };
    deepAssign($view, {
        frag: function (result, parentNode) {
            return $view.hookup($view.fragment(result), parentNode);
        },
        fragment: function (result) {
            return canFrag(result, document);
        },
        toId: function (src) {
            return src.toString().split(/\/|\./g).map(function (part) {
                if (part) {
                    return part;
                }
            }).join('_');
        },
        toStr: function (txt) {
            return txt == null ? '' : '' + txt;
        },
        hookup: function (fragment, parentNode) {
            var hookupEls = [], id, func;
            each(fragment.childNodes ? makeArray(fragment.childNodes) : fragment, function (node) {
                if (node.nodeType === 1) {
                    hookupEls.push(node);
                    hookupEls.push.apply(hookupEls, makeArray(node.getElementsByTagName('*')));
                }
            });
            each(hookupEls, function (el) {
                if (el.getAttribute && (id = el.getAttribute('data-view-id')) && (func = $view.hookups[id])) {
                    func(el, parentNode, id);
                    delete $view.hookups[id];
                    el.removeAttribute('data-view-id');
                }
            });
            return fragment;
        },
        hookups: {},
        hook: function (cb) {
            $view.hookups[++hookupId] = cb;
            return ' data-view-id=\'' + hookupId + '\'';
        },
        cached: {},
        cachedRenderers: {},
        simpleHelper: function (fn) {
            return function () {
                var realArgs = [];
                var fnArgs = arguments;
                each(fnArgs, function (val, i) {
                    if (i <= fnArgs.length) {
                        while (val && val.isComputed) {
                            val = val();
                        }
                        realArgs.push(val);
                    }
                });
                return fn.apply(this, realArgs);
            };
        }
    });
    module.exports = $view;
});