var nodeLists = require("./node_list");

var doc = typeof document !== "undefined" ? document: null;



/**
 * @property {Object} can.view.elements
 * @parent can.view
 *
 * Provides helper methods for and information about the behavior
 * of DOM elements.
 */
var elements = {
	tagToContentPropMap: {
		option: ( doc && "textContent" in document.createElement("option") ) ? "textContent" : "innerText",
		textarea: 'value'
	},
	/**
	 * @property {Object.<String,(String|Boolean|function)>} can.view.elements.attrMap
	 * @parent can.view.elements
	 *
	 *
	 * A mapping of
	 * special attributes to their JS property. For example:
	 *
	 *     "class" : "className"
	 *
	 * means get or set `element.className`. And:
	 *
	 *      "checked" : true
	 *
	 * means set `element.checked = true`.
	 *
	 *
	 * If the attribute name is not found, it's assumed to use
	 * `element.getAttribute` and `element.setAttribute`.
	 */
	/**
	 * @property {Object.<String,String>} can.view.elements.tagMap
	 * @parent can.view.elements
	 *
	 * A mapping of parent node names to child node names that can be inserted within
	 * the parent node name.  For example: `table: "tbody"` means that
	 * if you want a placeholder element within a `table`, a `tbody` will be
	 * created.
	 */
	tagMap: {
		'': 'span',
		colgroup: 'col',
		table: 'tbody',
		tr: 'td',
		ol: 'li',
		ul: 'li',
		tbody: 'tr',
		thead: 'tr',
		tfoot: 'tr',
		select: 'option',
		optgroup: 'option'
	},
	// a tag's parent element
	reverseTagMap: {
		col: 'colgroup',
		tr: 'tbody',
		option: 'select',
		td: 'tr',
		th: 'tr',
		li: 'ul'
	},
	// tags that should be handled as self-closing and should not have content in them
	// when generated as part of binding hookup
	selfClosingTags: {
		col: true
	},
	// Used to determine the parentNode if el is directly within a documentFragment
	getParentNode: function (el, defaultParentNode) {
		return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
	},
	// Gets a "pretty" value for something
	contentText: function (text) {
		if (typeof text === 'string') {
			return text;
		}
		// If has no value, return an empty string.
		if (!text && text !== 0) {
			return '';
		}
		return '' + text;
	},

	after: nodeLists.after,
	replace: nodeLists.replace
};

module.exports = elements;
