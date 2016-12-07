/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * Use graph.container() to add it to the DOM.
 */
function parsegraph_Graph()
{
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._container = document.createElement("div");
    this._container.className = "parsegraph_Graph";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");
    if(this._gl == null) {
        this._gl = this._canvas.getContext("webgl");
        if(this._gl == null) {
            throw new Error("GL context is not supported");
        }
    }

    this._container.appendChild(this._canvas);

    this._nodePainter = new parsegraph_NodePainter(this._gl);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._camera = new parsegraph_Camera(this);

    this._carets = [];

    // Simplify use by scheduling a repaint on construction.
    this.scheduleRepaint();
};

parsegraph_Graph.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Graph.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;

    // Make it simple to change the background color; do not require a
    // separate call to scheduleRepaint.
    this.scheduleRepaint();
};

/**
 * Retrieves the current background color.
 */
parsegraph_Graph.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_Graph.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
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

    // Simplify use by scheduling a repaint.
    this.scheduleRepaint();
};

parsegraph_Graph.prototype.removePlot = function(caret)
{
    for(var i = 0; i < this._carets.length; ++i) {
        if(this._carets[i][0] == caret) {
            this._carets.splice(i, 1);
        }
    }

    // Simplify use by scheduling a repaint.
    this.scheduleRepaint();
};

/**
 * Schedules a repaint. Painting causes the scene
 * graph to be rebuilt.
 */
parsegraph_Graph.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

/**
 * Schedules a render. Rendering draws the scene graph.
 *
 * Rendering will cause repainting if needed.
 */
parsegraph_Graph.prototype.scheduleRender = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    if(this._pendingRender != null) {
        return;
    }
    var graph = this;
    this._pendingRender = requestAnimationFrame(function() {
        graph._pendingRender = null;
        if(graph._needsRepaint) {
            graph.paint();
            graph._needsRepaint = false;
        }

        graph.render();
    });
};

parsegraph_Graph.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};

parsegraph_Graph.prototype.paint = function()
{
    this._nodePainter.clear();
    this._nodePainter.setBackground(this.backgroundColor());

    this._carets.forEach(function(caret) {
        this._nodePainter.drawCaret(caret[0], caret[1], caret[2]);
    }, this);

    // Paint the origin.
    this._nodePainter.drawOrigin();
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();

    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    this._gl.clearColor(
        0, 0, 0, 0
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._nodePainter.setBackground(this._backgroundColor);
    this._nodePainter.render(world, this.camera().scale());;

    if(typeof(this.afterRender) == "function") {
        this.afterRender();
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
    //console.log("Found selected node");
    selectedNode.setSelected(!selectedNode.isSelected());

    this.scheduleRepaint();

    return true;
};

parsegraph_Graph.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_Graph.prototype.gl = function()
{
    return this._gl;
};

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_Graph.prototype.container = function()
{
    return this._container;
};
