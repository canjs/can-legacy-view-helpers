/*can-legacy-view-helpers@0.0.0#can-legacy-view-helpers*/
define([
    'exports',
    './render',
    './scanner'
], function (exports, _renderJs, _scannerJs) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    function _interopRequire(obj) {
        return obj && obj.__esModule ? obj['default'] : obj;
    }
    exports.can = _interopRequire(_renderJs);
    exports.Scanner = _interopRequire(_scannerJs);
});