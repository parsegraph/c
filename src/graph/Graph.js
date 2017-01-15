/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * Use graph.container() to add it to the DOM.
 */
function parsegraph_Graph()
{
    // Allow surface to be created implicitly.
    var surface;
    if(arguments.length == 0) {
        surface = new parsegraph_Surface();
    }
    else {
        surface = arguments[0];
    }
    if(!surface) {
        throw new Error("Surface must be given");
    }
    this._surface = surface;
    this._canvas = surface.canvas();
    this._container = surface.container();

    this._paintingDirty = true;

    this._nodePainter = null;

    this._camera = new parsegraph_Camera(this);

    this._carets = [];

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._input = new parsegraph_Input(this, this._camera);
};

parsegraph_Graph.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Graph.prototype.surface = function()
{
    return this._surface;
};

parsegraph_Graph.prototype.gl = function()
{
    return this._surface._gl;
};

parsegraph_Graph.prototype.container = function()
{
    return this._surface._container;
};

parsegraph_Graph.prototype.canvas = function()
{
    return this._surface._canvas;
};

parsegraph_Graph.prototype.plot = function(caret, worldX, worldY)
{
    if(worldX === undefined) {
        worldX = 0;
    }
    if(worldY === undefined) {
        worldY = 0;
    }

    this._carets.push([caret, worldX, worldY]);
};

parsegraph_Graph.prototype.removePlot = function(caret)
{
    for(var i = 0; i < this._carets.length; ++i) {
        if(this._carets[i][0] == caret) {
            this._carets.splice(i, 1);
        }
    }
};

/**
 * Receives a mouseDown event at the given coordinates, in world space.
 */
parsegraph_Graph.prototype.mouseDown = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._carets.length - 1; i >= 0; --i) {
        var caretData = this._carets[i];
        var caret = caretData[0];
        var worldX = caretData[1];
        var worldY = caretData[2];
        var selectedNode = caret.nodeUnderCoords(x - worldX, y - worldY);
        if(selectedNode) {
            // Node located; no further search.
            break;
        }
    }
    if(!selectedNode) {
        // No node found.
        return false;
    }

    // A node was found; show its options.
    selectedNode.click();

    return true;
};

parsegraph_Graph.prototype.paint = function()
{
    if(!this._paintingDirty) {
        return;
    }

    if(!this._nodePainter) {
        this._nodePainter = new parsegraph_NodePainter(this.gl());
    }
    this._nodePainter.clear();
    this._nodePainter.setBackground(this.surface().backgroundColor());

    this._carets.forEach(function(caret) {
        this._nodePainter.drawCaret(caret[0], caret[1], caret[2]);
    }, this);

    // Paint the origin.
    this._nodePainter.drawOrigin();

    this._paintingDirty = false;
};

parsegraph_Graph.prototype.scheduleRepaint = function()
{
    this._paintingDirty = true;
    this._surface.scheduleRepaint();
};

parsegraph_Graph.prototype.scheduleRender = function()
{
    this._surface.scheduleRender();
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();
    this._nodePainter.setBackground(this._backgroundColor);
    this._nodePainter.render(world, this.camera().scale());;
};
