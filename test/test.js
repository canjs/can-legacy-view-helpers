import QUnit from 'steal-qunit';
import { Scanner, can } from '../can-legacy-view-helpers';

console.log('LOADED');

QUnit.module('can-legacy-view-helpers');

QUnit.test('Plugin initialized', function () {
  QUnit.ok(typeof Scanner !== "undefined");
});

QUnit.test('Render helpers registered successfully.', function () {
  QUnit.ok(typeof can.view.txt === "function");
  QUnit.ok(typeof can.view.onlytxt === "function");
  QUnit.ok(typeof can.view.setupLists === "function");
});
