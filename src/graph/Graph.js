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
        this.onScheduleRepaint();
    }
};

parsegraph_Graph.prototype.needsRepaint = function()
{
    return this._world.needsRepaint() || this._carousel.needsRepaint() || this._cameraBox.needsRepaint();
};

parsegraph_Graph.prototype.glyphAtlas = function()
{
    if(!this._glyphAtlas) {
        this._glyphAtlas = new parsegraph_GlyphAtlas(
            parsegraph_TextPainter_UPSCALED_FONT_SIZE, "sans-serif", "white"
        );
    }
    return this._glyphAtlas;
}

parsegraph_Graph.prototype.setGlyphAtlas = function(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
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
    return this._world.paint(timeout);
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();
    this._world.render(world);
    this._carousel.render(world);
    this._cameraBox.render(world);
};
