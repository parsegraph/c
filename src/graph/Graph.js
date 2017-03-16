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

    // World-rendered graphs.
    this._worldPaintingDirty = true;
    this._worldPlots = [];

    this._glyphAtlas = null;

    this._carousel = new parsegraph_Carousel(this);
    this._cameraBox = new parsegraph_CameraBox(this);

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._camera = new parsegraph_Camera(this);

    // The node currently under the cursor.
    this._nodeUnderCursor = null;

    this._input = new parsegraph_Input(this, this._camera);

    // GL painters are not created until needed.
    this._fanPainter = null;

    this._shaders = {};

    this._previousWorldPaintState = null;
};

parsegraph_Graph.prototype.cameraBox = function()
{
    return this._cameraBox;
};

parsegraph_Graph.prototype.carousel = function()
{
    return this._carousel;
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

parsegraph_Graph.prototype.plot = function()
{
    return parsegraph_plot.apply(this._worldPlots, arguments);
};

/**
 * Plots the given paint group, or creates one if constructor
 * arguments are given.
 *
 * The paint group is returned. Passing a paint group directly is the
 * preferred method. The position of the graph is the one used when
 * rendering. The caller manages the position.
 *
 * parsegraph_plot.apply(plotList, arguments);
 *
 * plot(node)
 * plot(root, worldX, worldY, userScale)
 */
function parsegraph_plot(node, worldX, worldY, userScale) {
    if(!node.localPaintGroup()) {
        node.setPaintGroup(new parsegraph_PaintGroup(node));
    }
    if(arguments.length > 1) {
        node.localPaintGroup().setOrigin(worldX, worldY);
        node.localPaintGroup().setScale(userScale);
    }
    this.push(node);
};

/**
 *
 */
parsegraph_Graph.prototype.removePlot = function(plot)
{
    for(var i in this._worldPlots) {
        if(this._worldPlots[i] === plot) {
            if(this._previousWorldPaintState) {
                this._previousWorldPaintState = null;
            }
            return this._worldPlots.splice(i, 1);
        }
    }
    return null;
};

/**
 * Receives a mouseover event at the given coordinates, in client space.
 *
 * Returns true if this event processing requires a graph repaint.
 */
parsegraph_Graph.prototype.mouseOver = function(x, y)
{
    //console.log("mouseover: " + x + ", " + y);
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var selectedNode = this.nodeUnderCoords(x, y);
    if(this._nodeUnderCursor === selectedNode) {
        // The node under cursor is already the node under cursor, so don't
        // do anything.
        //console.log("Node was the same");
        return false;
    }

    if(this._nodeUnderCursor && this._nodeUnderCursor !== selectedNode) {
        //console.log("Node is changing, so repainting.");
        this._nodeUnderCursor.setSelected(false);
        this.scheduleRepaint();
    }

    this._nodeUnderCursor = selectedNode;
    if(!selectedNode) {
        // No node was actually found.
        //console.log("No node actually found.");
        return false;
    }

    if(selectedNode.type() == parsegraph_SLIDER) {
        //console.log("Selecting slider and repainting");
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }
    else if(selectedNode.hasClickListener() && !selectedNode.isSelected()) {
        //console.log("Selecting node and repainting");
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }

    return true;
};

parsegraph_Graph.prototype.nodeUnderCursor = function()
{
    return this._nodeUnderCursor;
};

/**
 * Tests whether the given position, in world space, is within a node.
 */
parsegraph_Graph.prototype.nodeUnderCoords = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._worldPlots.length - 1; i >= 0; --i) {
        var selectedNode = this._worldPlots[i].nodeUnderCoords(x, y);
        if(selectedNode) {
            // Node located; no further search.
            return selectedNode;
        }
    }
    return null;
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
    this._worldPaintingDirty = true;
    this._previousWorldPaintState = null;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint();
    }
};

parsegraph_Graph.prototype.needsRepaint = function()
{
    return this._worldPaintingDirty || (this._showCarousel && this._carouselPaintingDirty);
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
    var t = new Date().getTime();
    var pastTime = function() {
        return timeout !== undefined && (new Date().getTime() - t > timeout);
    };
    var timeRemaining = function() {
        if(timeout === undefined) {
            return timeout;
        }
        return Math.max(0, timeout - (new Date().getTime() - t));
    };

    this._cameraBox.prepare(this.gl(), this.glyphAtlas(), this._shaders);
    this._cameraBox.paint();
    this._carousel.prepare(this.gl(), this.glyphAtlas(), this._shaders);
    this._carousel.paint();

    if(pastTime()) {
        return false;
    }

    if(this._worldPaintingDirty) {
        // Restore the last state.
        var i = 0;
        var savedState;
        if(this._previousWorldPaintState !== null) {
            savedState = this._previousWorldPaintState;
            this._previousWorldPaintState = null;
            i = savedState;
        }

        while(i < this._worldPlots.length) {
            if(pastTime()) {
                this.previousWorldPaintState = i;
                return false;
            }
            var plot = this._worldPlots[i];
            var paintGroup = plot.localPaintGroup();
            if(!paintGroup) {
                throw new Error("Plot no longer has a paint group?!");
            }
            parsegraph_PAINTING_GLYPH_ATLAS = this.glyphAtlas();
            var paintCompleted = paintGroup.paint(
                this.gl(),
                this.surface().backgroundColor(),
                this.glyphAtlas(),
                this._shaders,
                timeRemaining()
            );
            parsegraph_PAINTING_GLYPH_ATLAS = null;

            if(!paintCompleted) {
                this._previousWorldPaintState = i;
                return false;
            }

            ++i;
        }
        this._worldPaintingDirty = false;
    }

    return true;
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();
    for(var i in this._worldPlots) {
        var plot = this._worldPlots[i];
        var paintGroup = plot.localPaintGroup();
        if(!paintGroup) {
            throw new Error("Plot no longer has a paint group?!");
        }
        paintGroup.renderIteratively(world);
    }

    this._carousel.render(world);
    this._cameraBox.render(world);
};
