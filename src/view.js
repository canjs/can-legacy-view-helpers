// # can/view/view.js
// -------
// `can.view`
// _Templating abstraction._
// can.view loads templates based on a registered type, and given a set of data, returns a document fragment
// from the template engine's rendering method


var isFunction = require("can-util/js/is-function/is-function"),
	makeArray =require("can-util/js/make-array/make-array"),
	deepAssign = require("can-util/js/deep-assign/deep-assign"),
	canFrag = require("can-util/dom/frag/frag"),
	each = require("can-util/js/each/each"),
	// Used for hookup `id`s.
	hookupId = 1;

// internal utility methods
// ------------------------



// #### can.view
//defines $view for internal use, can.template for backwards compatibility
/**
 * @add can.view
 */
var $view = function (view, data, helpers, callback) {
	// If helpers is a `function`, it is actually a callback.
	if (isFunction(helpers)) {
		callback = helpers;
		helpers = undefined;
	}

	// Render the view as a fragment
	return $view.renderAs("fragment",view, data, helpers, callback);
};

// can.view methods
// --------------------------
deepAssign($view, {
	// ##### frag
	// creates a fragment and hooks it up all at once
	/**
	 * @function can.view.frag frag
	 * @parent can.view.static
	 */
	frag: function (result, parentNode) {
		return $view.hookup($view.fragment(result), parentNode);
	},

	// #### fragment
	// this is used internally to create a document fragment, insert it,then hook it up
	fragment: function (result) {
		return canFrag(result, document);
	},

	// ##### toId
	// Convert a path like string into something that's ok for an `element` ID.
	toId: function (src) {
		return src.toString()
			.split(/\/|\./g).map(function (part) {
				// Dont include empty strings in toId functions
				if (part) {
					return part;
				}
			})
			.join('_');
	},
	// ##### toStr
    // convert argument to a string
	toStr: function(txt){
		return txt == null ? "" : ""+txt;
	},

	// ##### hookup
	// attach the provided `fragment` to `parentNode`
	/**
	 * @hide
	 * hook up a fragment to its parent node
	 * @param fragment
	 * @param parentNode
	 * @return {*}
	 */
	hookup: function (fragment, parentNode) {
		var hookupEls = [],
			id,
			func;

		// Get all `childNodes`.
		each(fragment.childNodes ? makeArray(fragment.childNodes) : fragment, function (node) {
			if (node.nodeType === 1) {
				hookupEls.push(node);
				hookupEls.push.apply(hookupEls, makeArray(node.getElementsByTagName('*')));
			}
		});

		// Filter by `data-view-id` attribute.
		each(hookupEls, function (el) {
			if (el.getAttribute && (id = el.getAttribute('data-view-id')) && (func = $view.hookups[id])) {
				func(el, parentNode, id);
				delete $view.hookups[id];
				el.removeAttribute('data-view-id');
			}
		});

		return fragment;
	},

	// `hookups` keeps list of pending hookups, ie fragments to attach to a parent node
	/**
	 * @property hookups
	 * @hide
	 * A list of pending 'hookups'
	 */
	hookups: {},

	// `hook` factory method for hookup function inserted into templates
	// hookup functions are called after the html is rendered to the page
	// only implemented by EJS templates.
	/**
	 * @description Create a hookup to insert into templates.
	 * @function can.view.hook hook
	 * @parent can.view.static
	 * @signature `can.view.hook(callback)`
	 * @param {Function} callback A callback function to be called with the element.
	 *
	 * @body
	 * Registers a hookup function that can be called back after the html is
	 * put on the page.  Typically this is handled by the template engine.  Currently
	 * only EJS supports this functionality.
	 *
	 *     var id = can.view.hook(function(el){
	 *            //do something with el
	 *         }),
	 *         html = "<div data-view-id='"+id+"'>"
	 *     $('.foo').html(html);
	 */
	hook: function (cb) {
		$view.hookups[++hookupId] = cb;
		return ' data-view-id=\'' + hookupId + '\'';
	},

	/**
	 * @hide
	 * @property {Object} can.view.cached view
	 * @parent can.view
	 * Cached are put in this object
	 */
	cached: {},
	cachedRenderers: {},



	// Returns a function that automatically converts all computes passed to it
	simpleHelper: function(fn) {
		return function() {
			var realArgs = [];
			var fnArgs = arguments;
			each(fnArgs, function(val, i) {
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
