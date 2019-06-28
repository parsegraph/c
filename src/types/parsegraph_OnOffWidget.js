parsegraph_OnOffWidget_COUNT = 0;
function parsegraph_OnOffWidget(graph, sink)
{
    this._id = parsegraph_OnOffWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._onListener = null;
    this._onListenerThisArg = null;
    this._offListener = null;
    this._offListenerThisArg = null;
    this._isOn = false;
}

parsegraph_OnOffWidget.prototype.turnOff = function()
{
    if(!this._isOn) {
        return;
    }
    this._isOn = false;
    if(this._offListener) {
        this._offListener.apply(this._offListenerThisArg);
    }
};

parsegraph_OnOffWidget.prototype.setOnOff = function(offListener, offListenerThisArg)
{
    this._offListener = offListener;
    this._offListenerThisArg = offListenerThisArg;
};

parsegraph_OnOffWidget.prototype.turnOn = function()
{
    if(this._isOn) {
        return;
    }
    this._isOn = true;
    if(this._onListener) {
        this._onListener.call(this._onListenerThisArg);
    }
};

parsegraph_OnOffWidget.prototype.value = function()
{
    return this._isOn;
};

parsegraph_OnOffWidget.prototype.setOnOn = function(onListener, onListenerThisArg)
{
    this._onListener = onListener;
    this._onListenerThisArg = onListenerThisArg;
};

parsegraph_OnOffWidget.prototype.node = function()
{
    if(!this._containerNode) {
        // Switch case.
        var car = new parsegraph_Caret(parsegraph_SLOT);
        car.setGlyphAtlas(this._graph.glyphAtlas());
        this._containerNode = car.root();
        var brownStyle = parsegraph_copyStyle(parsegraph_SLOT);
        brownStyle.backgroundColor = new parsegraph_Color(0.4, 0.1, 0, 1);
        brownStyle.borderColor = new parsegraph_Color(0.4, 0.1, 0, 1);
        brownStyle.fontColor = new parsegraph_Color(1, 0.5, 0.5, 1);
        brownStyle.borderColor = new parsegraph_Color(1, 1, 1, 1);
        car.node().setBlockStyle(brownStyle);
        car.node().setIgnoreMouse(true);
        car.shrink();

        // Off button.
        car.spawnMove('i', 'b', 'v');
        car.label("Off");
        car.onClick(function() {
            this.turnOff();
            return true;
        }, this);
        var blackStyle = parsegraph_copyStyle(parsegraph_SLOT);
        blackStyle.backgroundColor = new parsegraph_Color(0, 0, 0, 1);
        blackStyle.fontColor = new parsegraph_Color(1, 0, 0, 1);
        car.node().setBlockStyle(blackStyle);

        // On button.
        car.spawnMove('f', 'b');
        car.label("On");
        car.onClick(function() {
            this.turnOn();
            return true;
        }, this);
        var whiteStyle = parsegraph_copyStyle(parsegraph_SLOT);
        whiteStyle.borderColor =  new parsegraph_Color(0.2, 0.2, 0.2, 1);
        whiteStyle.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
        car.node().setBlockStyle(whiteStyle);
    }
    return this._containerNode;
};
