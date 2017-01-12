/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * Use graph.container() to add it to the DOM.
 */
function parsegraph_Surface()
{
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._container = document.createElement("div");
    this._container.className = "parsegraph_Surface";

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

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._painters = [];
    this._renderers = [];

    // Simplify use by scheduling a repaint on construction.
    this.scheduleRepaint();
};

parsegraph_Surface.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
};

/**
 * Schedules a repaint. Painting causes the scene
 * graph to be rebuilt.
 */
parsegraph_Surface.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

/**
 * Schedules a render. Rendering draws the scene graph.
 *
 * Rendering will cause repainting if needed.
 */
parsegraph_Surface.prototype.scheduleRender = function()
{
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

parsegraph_Surface.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};

parsegraph_Surface.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_Surface.prototype.gl = function()
{
    return this._gl;
};

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_Surface.prototype.container = function()
{
    return this._container;
};

parsegraph_Surface.prototype.addPainter = function(painter, thisArg)
{
    this._painters.push([painter, thisArg]);
};

parsegraph_Surface.prototype.addRenderer = function(renderer, thisArg)
{
    this._renderers.push([renderer, thisArg]);
};


parsegraph_Surface.prototype.paint = function()
{
    this._painters.forEach(function(painter) {
        painter[0].call(painter[1]);
    }, this);
};

parsegraph_Surface.prototype.setBackground = function(color)
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
parsegraph_Surface.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_Surface.prototype.render = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    this._gl.clearColor(
        this._backgroundColor._r,
        this._backgroundColor._g,
        this._backgroundColor._b,
        this._backgroundColor._a
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._renderers.forEach(function(renderer) {
        renderer[0].call(renderer[1]);
    }, this);
};
