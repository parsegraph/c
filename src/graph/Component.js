function parsegraph_Component(peer)
{
    this._layoutFunc = null;
    this._layoutFuncThisArg = null;
    this._painterFunc = null;
    this._painterFuncThisArg = null;
    this._rendererFunc = null;
    this._rendererFuncThisArg = null;
    this._contextChangedFunc = null;
    this._contextChangedFuncThisArg = null;
    this._inputHandler = null;
    this._inputHandlerThisArg = null;
    this._peer = peer;
}

parsegraph_Component.prototype.peer = function()
{
    return this._peer;
};

parsegraph_Component.prototype.layout = function(window, sizeOut)
{
    if(this._layoutFunc === null) {
        throw new Error("Component must have a layout");
    }
    return this._layoutFunc.call(this._layoutFuncThisArg, window, sizeOut);
};

parsegraph_Component.prototype.paint = function(timeout)
{
    if(!this._painterFunc) {
        return;
    }
    return this._painterFunc.call(this._painterFuncThisArg, timeout);
};

parsegraph_Component.prototype.render = function(width, height)
{
    if(!this._rendererFunc) {
        return;
    }
    this._needsRender = this._rendererFunc.call(this._rendererFuncThisArg, width, height);
    return this._needsRender;
};

parsegraph_Component.prototype.setNeedsRender = function()
{
    //console.log(new Error(this.peer().id() + " needs render"));
    this._needsRender = true;
};

parsegraph_Component.prototype.needsRender = function()
{
    return this._needsRender;
};

parsegraph_Component.prototype.contextChanged = function(isLost)
{
    if(!this._contextChangedFunc) {
        return;
    }
    return this._contextChangedFunc.call(this._contextChangedFuncThisArg, isLost);
};

parsegraph_Component.prototype.hasInputHandler = function()
{
    return !!this._inputHandler;
};

parsegraph_Component.prototype.handleInput = function()
{
    if(!this._inputHandler) {
        return;
    }
    return this._inputHandler.apply(this._inputHandlerThisArg, arguments);
};

parsegraph_Component.prototype.setLayout = function(layoutFunc, layoutFuncThisArg)
{
    if(arguments.length === 1) {
        layoutFuncThisArg = layoutFunc;
        layoutFunc = layoutFunc.layout;
    }
    this._layoutFunc = layoutFunc;
    this._layoutFuncThisArg = layoutFuncThisArg;
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

parsegraph_Component.prototype.setInputHandler = function(inputHandler, inputHandlerThisArg)
{
    this._inputHandler = inputHandler;
    this._inputHandlerThisArg = inputHandlerThisArg;
};

parsegraph_Component.prototype.setContextChanged = function(contextChanged, contextChangedThisArg)
{
    this._contextChangedFunc = contextChanged;
    this._contextChangedFuncThisArg = contextChangedThisArg;
};
