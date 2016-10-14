/*can-legacy-view-helpers@0.2.0#can-legacy-view-helpers*/
var render = require('./src/render.js');
var scanner = require('./src/scanner.js');
var view = require('./src/view.js');
var elements = require('./src/elements.js');
var live = require('./src/live.js');
var nodeLists = require('./src/node_list.js');
var legacyHelpers = {
    render: render,
    Scanner: scanner,
    view: view,
    elements: elements,
    live: live,
    nodeLists: nodeLists
};
window.CAN_LEGACY_HELPERS = legacyHelpers;
module.exports = legacyHelpers;