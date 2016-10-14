var render = require("./src/render");
var scanner = require("./src/scanner");
var view = require("./src/view");
var elements = require("./src/elements");

var legacyHelpers = {
	render: render,
	Scanner: scanner,
	view: view,
	elements: elements
};

window.CAN_LEGACY_HELPERS = legacyHelpers;


module.exports = legacyHelpers;
