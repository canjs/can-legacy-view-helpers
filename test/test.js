var QUnit = require("steal-qunit");
var legacyViewHelpers = require("can-legacy-view-helpers");


QUnit.module('can-legacy-view-helpers');

QUnit.test('Exports things', function () {
  assert.ok(legacyViewHelpers.view, "view");
  assert.ok(legacyViewHelpers.elements, "elements");
  assert.ok(legacyViewHelpers.live, "live");
  assert.ok(legacyViewHelpers.nodeLists, "nodeLists");
  assert.ok(legacyViewHelpers.render, "render");
  assert.ok(legacyViewHelpers.Scanner, "Scanner");
});
