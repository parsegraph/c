/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * TODO Add gridX and gridY camera listeners, with support for loading from an infinite grid of cells.
 *
 * TODO Add camera-movement listener, to let nodes watch for camera movement, and thus let nodes detect
 * when they are approaching critical screen boundaries:
 *
 * enteringScreen
 * leavingScreen
 *
 * Node distance is radially calculated (using the viewport's diagonal) from the camera's center, adjusted by some constant.
 *
 * hysteresis factor gives the +/- from some preset large distance (probably some hundreds of bud radiuses). Ignoring hysteresis,
 * then when the camera moves, the node's relative position may be changed. This distance is recalculated, and if it is above
 * some threshold plus hysteresis constant, and the node's state was 'near', then the node's leavingScreen is called, and the node's state is set to 'far'.
 *
 * Likewise, if the distance is lower than the same threshold minus hysteresis constant, and the node's state was 'far', then the node's enteringScreen is
 * called, and the node's state is set to 'near'.
 *
 * This distance is checked when the node is painted and also when the camera is moved.
 *
 * TODO Figure out how changing the grid size might change things.
 *
 * Grid updates based only on camera movement. Updates are reported in terms of cells made visible in either direction.
 * The number of potentially visible grid cells is determined for each axis using the camera's axis size adjusted by some constant.
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

    this._glyphAtlas = null;

    this._world = new parsegraph_World(this);
    this._carousel = new parsegraph_Carousel(this);
    this._cameraBox = new parsegraph_CameraBox(this);

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._camera = this._world.camera();

    this._input = new parsegraph_Input(this, this.camera());

    this._shaders = {};
};
parsegraph_Graph_Tests = new parsegraph_TestSuite("parsegraph_Graph");

parsegraph_Graph.prototype.shaders = function()
{
    return this._shaders;
};

parsegraph_Graph.prototype.cameraBox = function()
{
    return this._cameraBox;
};

parsegraph_Graph.prototype.world = function()
{
    return this._world;
};

parsegraph_Graph.prototype.carousel = function()
{
    return this._carousel;
};

parsegraph_Graph.prototype.camera = function()
{
    return this._world.camera();
};

parsegraph_Graph.prototype.surface = function()
{
    return this._surface;
};

parsegraph_Graph.prototype.gl = function()
{
    return this.surface().gl();
};

parsegraph_Graph.prototype.container = function()
{
    return this.surface().container();
};

parsegraph_Graph.prototype.canvas = function()
{
    return this.surface().canvas();
};

parsegraph_Graph.prototype.input = function()
{
    return this._input;
};

/**
 * Schedules a repaint. The onScheduleRepaint callback is responsible for making this
 * happen.
 *
 * The previous world paint state is cleared if this is called; this can be used to reset
 * a paint in progress.
 */
parsegraph_Graph.prototype.scheduleRepaint = function()
{
    //console.log(new Error("Scheduling repaint"));
    this._world.scheduleRepaint();
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint.call(this.onScheduleRepaintThisArg);
    }
};

parsegraph_Graph.prototype.needsRepaint = function()
{
    return this._world.needsRepaint() || (this._carousel.isCarouselShown() && this._carousel.needsRepaint()) || this._cameraBox.needsRepaint();
};

parsegraph_Graph.prototype.glyphAtlas = function()
{
    if(!this._glyphAtlas) {
        throw new Error("Graph does not have a glyph atlas");
    }
    return this._glyphAtlas;
}

parsegraph_Graph.prototype.setGlyphAtlas = function(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
}

parsegraph_Graph.prototype.plot = function()
{
    return this.world().plot.apply(this.world(), arguments);
}

/**
 * Paints the graph up to the given time, in milliseconds.
 *
 * Returns true if the graph completed painting.
 */
parsegraph_Graph.prototype.paint = function(timeout)
{
    //console.log("Painting Graph, timeout=" + timeout);
    this._shaders.gl = this.gl();
    this._shaders.glyphAtlas = this.glyphAtlas();
    this._shaders.timeout = timeout;

    this._cameraBox.prepare(this.gl(), this.glyphAtlas(), this._shaders);
    this._cameraBox.paint();
    this._carousel.prepare(this.gl(), this.glyphAtlas(), this._shaders);
    this._carousel.paint();
    var rv = this._world.paint(timeout);

    this._input.paint();
    return rv;
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();
    this._world.render(world);
    this._carousel.render(world);
    this._cameraBox.render(world);
    this._input.render(world);
};
