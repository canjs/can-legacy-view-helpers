var QUnit = require('steal-qunit');
var legacy = require('../can-legacy-view-helpers');

QUnit.module('can-legacy-view-helpers');

QUnit.test('Plugin initialized', function () {
	QUnit.ok(typeof legacy.Scanner !== "undefined");
});

QUnit.test('Render helpers registered successfully.', function () {
	QUnit.ok(typeof legacy.view.txt === "function");
	QUnit.ok(typeof legacy.view.onlytxt === "function");
	QUnit.ok(typeof legacy.view.setupLists === "function");
});