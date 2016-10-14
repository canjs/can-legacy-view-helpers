var render = require("./src/render");
var scanner = require("./src/scanner");
var view = require("./src/view");
var elements = require("./src/elements");
var live = require("./src/live");
var nodeLists = require("./src/node_list");

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
