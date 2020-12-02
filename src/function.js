/* eslint-disable require-jsdoc */

export function Method(func, funcThisArg) {
  this._func = func;
  this._funcThisArg = funcThisArg;
}

Method.prototype.call = function(...args) {
  return this._func.apply(this._funcThisArg, args);
};

Method.prototype.apply = function(args) {
  return this._func.apply(this._funcThisArg, args);
};
