/* eslint-disable require-jsdoc */

let componentCount = 0;
export default function Component(peer, peerType) {
  this._id = ++componentCount;
  this._painterFunc = null;
  this._painterFuncThisArg = null;
  this._rendererFunc = null;
  this._rendererFuncThisArg = null;
  this._contextChangedFunc = null;
  this._contextChangedFuncThisArg = null;
  this._eventHandler = null;
  this._eventHandlerThisArg = null;
  this._peer = peer;
  this._peerType = peerType;
  this._window = null;
  this._serializerFunc = null;
  this._serializerFuncThisArg = null;
}

Component.prototype.toString = function() {
  return '[Component ' + this.id() + ']';
};

Component.prototype.id = function() {
  return this._id;
};

Component.prototype.type = function() {
  return this._peerType;
};

Component.prototype.peer = function() {
  return this._peer;
};

Component.prototype.paint = function(timeout) {
  if (!this._painterFunc) {
    return false;
  }
  if (this._painterFunc.call(this._painterFuncThisArg, timeout)) {
    this.scheduleUpdate();
    return true;
  }
  return false;
};

Component.prototype.render = function(
    width,
    height,
    avoidIfPossible,
) {
  if (!this._rendererFunc) {
    return false;
  }
  if (
    this._rendererFunc.call(
        this._rendererFuncThisArg,
        width,
        height,
        avoidIfPossible,
    )
  ) {
    this.scheduleUpdate();
    return true;
  }
  return false;
};

Component.prototype.needsUpdate = function() {
  return this._needsUpdate;
};

Component.prototype.setOwner = function(window) {
  if (this._window === window) {
    return;
  }
  if (this._window) {
    this._window.scheduleUpdate();
  }
  this._window = window;
  this._needsUpdate = true;
  if (this._window) {
    this._window.scheduleUpdate();
  }
};

Component.prototype.scheduleUpdate = function() {
  // console.log("Component is scheduling update", this._window);
  if (this._window) {
    this._window.scheduleUpdate();
  }
};

Component.prototype.contextChanged = function(isLost) {
  if (!this._contextChangedFunc) {
    return;
  }
  return this._contextChangedFunc.call(this._contextChangedFuncThisArg, isLost);
};

Component.prototype.hasEventHandler = function() {
  return !!this._eventHandler;
};

Component.prototype.handleEvent = function(...args) {
  if (!this._eventHandler) {
    return false;
  }
  return this._eventHandler.apply(this._eventHandlerThisArg, args);
};

Component.prototype.setPainter = function(
    painterFunc,
    painterFuncThisArg,
) {
  this._painterFunc = painterFunc;
  this._painterFuncThisArg = painterFuncThisArg;
};

Component.prototype.setRenderer = function(
    rendererFunc,
    rendererFuncThisArg,
) {
  this._rendererFunc = rendererFunc;
  this._rendererFuncThisArg = rendererFuncThisArg;
};

Component.prototype.setEventHandler = function(
    eventHandler,
    eventHandlerThisArg,
) {
  this._eventHandler = eventHandler;
  this._eventHandlerThisArg = eventHandlerThisArg;
};

Component.prototype.setContextChanged = function(
    contextChanged,
    contextChangedThisArg,
) {
  this._contextChangedFunc = contextChanged;
  this._contextChangedFuncThisArg = contextChangedThisArg;
};

Component.prototype.setSerializer = function(
    serializerFunc,
    serializerFuncThisArg,
) {
  this._serializerFunc = serializerFunc;
  this._serializerFuncThisArg = serializerFuncThisArg;
};
