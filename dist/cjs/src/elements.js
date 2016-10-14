/*can-legacy-view-helpers@0.2.0#src/elements*/
var nodeLists = require('./node_list.js');
var doc = typeof document !== 'undefined' ? document : null;
var elements = {
    tagToContentPropMap: {
        option: doc && 'textContent' in document.createElement('option') ? 'textContent' : 'innerText',
        textarea: 'value'
    },
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
    reverseTagMap: {
        col: 'colgroup',
        tr: 'tbody',
        option: 'select',
        td: 'tr',
        th: 'tr',
        li: 'ul'
    },
    selfClosingTags: { col: true },
    getParentNode: function (el, defaultParentNode) {
        return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
    },
    contentText: function (text) {
        if (typeof text === 'string') {
            return text;
        }
        if (!text && text !== 0) {
            return '';
        }
        return '' + text;
    },
    after: nodeLists.after,
    replace: nodeLists.replace
};
module.exports = elements;