var parsegraph_Component_COUNT = 0;
export default function parsegraph_Component(peer, peerType)
{
    this._id = ++parsegraph_Component_COUNT;
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

parsegraph_Component.prototype.toString = function()
{
    return "[parsegraph_Component " + this.id() + "]";
};

parsegraph_Component.prototype.id = function()
{
    return this._id;
};

parsegraph_Component.prototype.type = function()
{
    return this._peerType;
};

parsegraph_Component.prototype.peer = function()
{
    return this._peer;
};

parsegraph_Component.prototype.paint = function(timeout)
{
    if(!this._painterFunc) {
        return false;
    }
    if(this._painterFunc.call(this._painterFuncThisArg, timeout)) {
        this.scheduleUpdate();
        return true;
    }
    return false;
};

parsegraph_Component.prototype.render = function(width, height, avoidIfPossible)
{
    if(!this._rendererFunc) {
        return false;
    }
    if(this._rendererFunc.call(this._rendererFuncThisArg, width, height, avoidIfPossible)) {
        this.scheduleUpdate();
        return true;
    }
    return false;
};

parsegraph_Component.prototype.needsUpdate = function()
{
    return this._needsUpdate;
};

parsegraph_Component.prototype.setOwner = function(window)
{
    if(this._window === window) {
        return;
    }
    if(this._window) {
        this._window.scheduleUpdate();
    }
    this._window = window;
    this._needsUpdate = true;
    if(this._window) {
        this._window.scheduleUpdate();
    }
};

parsegraph_Component.prototype.scheduleUpdate = function()
{
    //console.log("Component is scheduling update", this._window);
    if(this._window) {
        this._window.scheduleUpdate();
    }
};

parsegraph_Component.prototype.contextChanged = function(isLost)
{
    if(!this._contextChangedFunc) {
        return;
    }
    return this._contextChangedFunc.call(this._contextChangedFuncThisArg, isLost);
};

parsegraph_Component.prototype.hasEventHandler = function()
{
    return !!this._eventHandler;
};

parsegraph_Component.prototype.handleEvent = function()
{
    if(!this._eventHandler) {
        return false;
    }
    return this._eventHandler.apply(this._eventHandlerThisArg, arguments);
};

parsegraph_Component.prototype.setPainter = function(painterFunc, painterFuncThisArg)
{
    this._painterFunc = painterFunc;
    this._painterFuncThisArg = painterFuncThisArg;
};

parsegraph_Component.prototype.setRenderer = function(rendererFunc, rendererFuncThisArg)
{
    this._rendererFunc = rendererFunc;
    this._rendererFuncThisArg = rendererFuncThisArg;
};

parsegraph_Component.prototype.setEventHandler = function(eventHandler, eventHandlerThisArg)
{
    this._eventHandler = eventHandler;
    this._eventHandlerThisArg = eventHandlerThisArg;
};

parsegraph_Component.prototype.setContextChanged = function(contextChanged, contextChangedThisArg)
{
    this._contextChangedFunc = contextChanged;
    this._contextChangedFuncThisArg = contextChangedThisArg;
};

parsegraph_Component.prototype.setSerializer = function(serializerFunc, serializerFuncThisArg)
{
    this._serializerFunc = serializerFunc;
    this._serializerFuncThisArg = serializerFuncThisArg;
};
