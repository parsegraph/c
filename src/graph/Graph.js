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

    // World-rendered graphs.
    this._worldPaintingDirty = true;
    this._worldPlots = [];

    // Carousel-rendered carets.
    this._carouselPaintingDirty = true;
    this._carouselPlots = [];
    this._carouselCallbacks = [];

    // Location of the carousel, in world coordinates.
    this._carouselCoords = [0, 0];
    this._carouselSize = 100;

    this._showCarousel = false;
    this._selectedCarouselPlot = null;

    // Camera boxes.
    this._showCameraBoxes = true;
    this._cameraBoxDirty = true;
    this._cameraBoxes = {};
    this._cameraBoxPainter = null;

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

parsegraph_Graph.prototype.moveCarousel = function(worldX, worldY)
{
    this._carouselCoords[0] = worldX;
    this._carouselCoords[1] = worldY;
};

parsegraph_Graph.prototype.setCarouselSize = function(size)
{
    this._carouselSize = size;
};

parsegraph_Graph.prototype.showCarousel = function()
{
    this._showCarousel = true;
};

parsegraph_Graph.prototype.isCarouselShown = function()
{
    return this._showCarousel;
};

parsegraph_Graph.prototype.hideCarousel = function()
{
    this._selectedCarouselPlot = null;
    this._showCarousel = false;
};

/**
 * Adds the given node to the carousel.
 */
parsegraph_Graph.prototype.addToCarousel = function(paintGroup, callback, thisArg)
{
    this._carouselCallbacks.push([callback, thisArg]);
    return parsegraph_plot.call(this._carouselPlots, paintGroup);
};

parsegraph_Graph.prototype.clearCarousel = function()
{
    this._carouselPlots.splice(0, this._carouselPlots.length);
    this._carouselCallbacks.splice(0, this._carouselCallbacks.length);
    this._selectedCarouselPlot = null;
};

parsegraph_Graph.prototype.removeFromCarousel = function(caret)
{
    for(var i in this._carouselPlots) {
        if(this._carouselPlots[i] === paintGroup) {
            var removed = this._carouselPlots.splice(i, 1);
            this._carouselCallbacks.splice(i, 1);
            if(this._selectedCarouselPlot === removed) {
                this._selectedCarouselPlot = null;
            }
        }
    }
    return null;
};

/**
 * Receives a click event on the carousel, in client coordinates.
 */
parsegraph_Graph.prototype.clickCarousel = function(x, y, asDown)
{
    if(!this.isCarouselShown()) {
        return false;
    }

    // Transform client coords to world coords.
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    if(Math.sqrt(
        Math.pow(Math.abs(x - this._carouselCoords[0]), 2) +
        Math.pow(Math.abs(y - this._carouselCoords[1]), 2)
    ) < this._carouselSize * .75
    ) {
        if(asDown) {
            // Down events within the inner region are treated as 'cancel.'
            this.hideCarousel();
            this.scheduleRepaint();
            return true;
        }

        // Up events within the inner region are ignored.
        return false;
    }

    var angleSpan = 2 * Math.PI / this._carouselPlots.length;
    var mouseAngle = Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    if(mouseAngle < 0) {
        // Upward half.
        mouseAngle = 2 * Math.PI + mouseAngle;
    }

    var i = Math.floor(this._carouselPlots.length * (mouseAngle) / (2 * Math.PI));

    // Click was within a carousel caret; invoke the listener.
    //console.log(alpha_ToDegrees(mouseAngle) + " degrees = caret " + i);
    var carouselPlot = this._carouselPlots[i];
    var callback = this._carouselCallbacks[i][0];
    var thisArg = this._carouselCallbacks[i][1];
    callback.call(thisArg);

    this.mouseOver(x, y);
    this.scheduleRepaint();

    return true;
};

parsegraph_Graph.prototype.setCamera = function(name, camera)
{
    this._cameraBoxes[name] = camera;
    this._cameraBoxDirty = true;
    this.scheduleRepaint();
};

parsegraph_Graph.prototype.removeCamera = function(name)
{
    delete this._cameraBoxes[name];
    this._cameraBoxDirty = true;
    this.scheduleRepaint();
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
 * Receives a mouseover event on the carousel, in client coordinates.
 */
parsegraph_Graph.prototype.mouseOverCarousel = function(x, y)
{
    if(!this.isCarouselShown()) {
        return false;
    }

    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var angleSpan = 2 * Math.PI / this._carouselPlots.length;
    var mouseAngle = Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    //var i = Math.floor(this._carouselPlots.length * mouseAngle / (2 * Math.PI));
    //console.log(i * angleSpan);
    if(this._fanPainter) {
        this._fanPainter.setSelectionAngle(mouseAngle);
    }
    this.scheduleCarouselRepaint();
    return true;
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
 * Arranges each carousel caret in a spiral.
 */
parsegraph_Graph.prototype.arrangeCarousel = function()
{
    var angleSpan = this._carouselPlots.length / (2 * Math.PI);

    var parsegraph_CAROUSEL_RADIUS = 250;
    var parsegraph_MAX_CAROUSEL_SIZE = 150;

    this._carouselPlots.forEach(function(paintGroup, i) {
        var root = paintGroup.root();

        // Set the origin.
        var caretRad = angleSpan/2 + (i / this._carouselPlots.length) * (2 * Math.PI);
        paintGroup.setOrigin(
            parsegraph_CAROUSEL_RADIUS * Math.cos(caretRad),
            parsegraph_CAROUSEL_RADIUS * Math.sin(caretRad)
        );

        // Set the scale.
        var commandSize = root.extentSize();
        var xMax = parsegraph_MAX_CAROUSEL_SIZE;
        var yMax = parsegraph_MAX_CAROUSEL_SIZE;
        var xShrinkFactor = 1;
        var yShrinkFactor = 1;
        if(commandSize.width() > xMax) {
            xShrinkFactor = commandSize.width() / xMax;
        }
        if(commandSize.height() > yMax) {
            yShrinkFactor = commandSize.height() / yMax;
        }
        paintGroup.setScale(1/Math.max(xShrinkFactor, yShrinkFactor));
    }, this);
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

parsegraph_Graph.prototype.scheduleCarouselRepaint = function()
{
    //console.log("Scheduling carousel repaint.");
    this._carouselPaintingDirty = true;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint();
    }
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

    if(this._showCameraBoxes && this._cameraBoxDirty) {
        if(!this._cameraBoxPainter) {
            this._cameraBoxPainter = new parsegraph_CameraBoxPainter(
                this.gl(), this.glyphAtlas(), this._shaders
            );
        }
        else {
            this._cameraBoxPainter.clear();
        }
        var rect = new parsegraph_Rect();
        for(var name in this._cameraBoxes) {
            var cameraBox = this._cameraBoxes[name];
            var hw = cameraBox.width/cameraBox.scale;
            var hh = cameraBox.height/cameraBox.scale;
            rect.setX(-cameraBox.cameraX + hw/2);
            rect.setY(-cameraBox.cameraY + hh/2);
            rect.setWidth(cameraBox.width/cameraBox.scale);
            rect.setHeight(cameraBox.height/cameraBox.scale);
            console.log(name);
            this._cameraBoxPainter.drawBox(name, rect, cameraBox.scale);
            console.log("Drawing box");
        }
        this._cameraBoxDirty = false;
    }

    if(this._carouselPaintingDirty && this._showCarousel) {
        // Paint the carousel.
        //console.log("Painting the carousel");
        for(var i in this._carouselPlots) {
            var paintGroup = this._carouselPlots[i];
            paintGroup.paint(
                this.gl(),
                this.surface().backgroundColor(),
                this.glyphAtlas(),
                this._shaders
            );
        }
        this.arrangeCarousel();

        // Paint the background highlighting fan.
        if(!this._fanPainter) {
            this._fanPainter = new parsegraph_FanPainter(this.gl());
        }
        else {
            this._fanPainter.clear();
        }
        var fanPadding = 1.2;
        this._fanPainter.setAscendingRadius(fanPadding * this._carouselSize);
        this._fanPainter.setDescendingRadius(fanPadding * 2 * this._carouselSize);
        this._fanPainter.selectRad(
            this._carouselCoords[0], this._carouselCoords[1],
            0, Math.PI * 2,
            parsegraph_createColor(1, 1, 1, 1),
            parsegraph_createColor(.5, .5, .5, .4)
        );

        this._carouselPaintingDirty = false;
    }

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
    if(this._showCarousel && !this._carouselPaintingDirty) {
        //console.log("Rendering the carousel");
        this._fanPainter.render(world);
    }

    for(var i in this._worldPlots) {
        var plot = this._worldPlots[i];
        var paintGroup = plot.localPaintGroup();
        if(!paintGroup) {
            throw new Error("Plot no longer has a paint group?!");
        }
        paintGroup.renderIteratively(world);
    }

    // Render the carousel if requested.
    if(this._showCarousel && !this._carouselPaintingDirty) {
        for(var i in this._carouselPlots) {
            var paintGroup = this._carouselPlots[i];
            paintGroup.render(
                matrixMultiply3x3(makeTranslation3x3(
                    this._carouselCoords[0], this._carouselCoords[1]
                ),
                world)
            );
        }
    }

    if(this._showCameraBoxes && !this._cameraBoxDirty) {
        var gl = this.gl();
        gl.enable(gl.BLEND);
        gl.blendFunc(
            gl.SRC_ALPHA, gl.DST_ALPHA
        );
        this._cameraBoxPainter.render(world);
    }
};
