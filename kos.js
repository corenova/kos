"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="declarations.d.ts" />
var Yang = require("yang-js");
var Stream = require("stream");
var Pull = (function (_super) {
    __extends(Pull, _super);
    function Pull(query) {
        return _super.call(this) || this;
    }
    return Pull;
}(Stream));
var Push = (function (_super) {
    __extends(Push, _super);
    function Push(query) {
        return _super.call(this) || this;
    }
    return Push;
}(Stream));
var Kos = (function (_super) {
    __extends(Kos, _super);
    function Kos() {
        return _super.apply(this, arguments) || this;
    }
    Kos.pull = function (query) {
        console.log(this.hello);
        return new Pull(query);
    };
    Kos.push = function (query) {
        return new Push(query);
    };
    return Kos;
}(Yang));
Kos.hello = "world";
exports.Kos = Kos;
exports.pull = Kos.pull;
exports.push = Kos.push;
exports.__esModule = true;
exports["default"] = Kos;
