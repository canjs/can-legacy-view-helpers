var QUnit = require("steal-qunit");
var legacyViewHelpers = require("can-legacy-view-helpers");


QUnit.module('can-legacy-view-helpers');

QUnit.test('Exports things', function () {
  QUnit.ok(legacyViewHelpers.view, "view");
  QUnit.ok(legacyViewHelpers.elements, "elements");
  QUnit.ok(legacyViewHelpers.live, "live");
  QUnit.ok(legacyViewHelpers.nodeLists, "nodeLists");
  QUnit.ok(legacyViewHelpers.render, "render");
  QUnit.ok(legacyViewHelpers.Scanner, "Scanner");
});
