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

    this._camera = new parsegraph_Camera(this);

    // World-rendered carets.
    this._worldCarets = [];

    // Carousel-rendered carets.
    this._carouselCarets = [];
    this._carouselCoords = [0, 0];
    this._showCarousel = false;

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._input = new parsegraph_Input(this, this._camera);

    // GL painters; not created until needed.
    this._worldNodePainter = null;
    this._carouselNodePainter = null;
    this._fanPainter = null;
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

parsegraph_Graph.prototype.plot = function(caret, worldX, worldY)
{
    if(worldX === undefined) {
        worldX = 0;
    }
    if(worldY === undefined) {
        worldY = 0;
    }

    this._worldCarets.push([caret, worldX, worldY]);
};

parsegraph_Graph.prototype.plotCarousel = function(worldX, worldY)
{
    this._carouselCoords[0] = worldX;
    this._carouselCoords[1] = worldY;
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
    this._showCarousel = false;
};

parsegraph_Graph.prototype.addToCarousel = function(caret, label, callback, thisArg)
{
    this._carouselCarets.push([caret, label, callback, thisArg, 0, 0]);
};

parsegraph_Graph.prototype.clearCarousel = function()
{
    this._carouselCarets.splice(0, this._carouselCarets.length);
};

parsegraph_Graph.prototype.removeFromCarousel = function(caret)
{
    for(var i = 0; i < this._carouselCarets.length; ++i) {
        if(this._carouselCarets[i][0] == caret) {
            return this._carouselCarets.splice(i, 1);
        }
    }
    return null;
};

parsegraph_Graph.prototype.removePlot = function(caret)
{
    for(var i = 0; i < this._worldCarets.length; ++i) {
        if(this._worldCarets[i][0] == caret) {
            return this._worldCarets.splice(i, 1);
        }
    }
    return null;
};

/**
 * Receives a mouseDown event at the given coordinates, in world space.
 */
parsegraph_Graph.prototype.mouseDown = function(x, y)
{
    if(this.isCarouselShown()) {
        // Test if the click was within a carousel caret.
        for(var i = this._carouselCarets.length - 1; i >= 0; --i) {
            var carouselCaretData = this._carouselCarets[i];
            var caret = carouselCaretData[0];
            var worldX = carouselCaretData[4];
            var worldY = carouselCaretData[5];
            var userScale = carouselCaretData[6];
            if(caret.nodeUnderCoords(x - worldX - this._carouselCoords[0], y - worldY - this._carouselCoords[1], userScale)) {
                // Click was within a carousel caret; notify listener.
                var callback = carouselCaretData[2];
                var thisArg = carouselCaretData[3];
                return callback.call(thisArg);
            }
        }
    }
    // Test if there is a node under the given coordinates.
    for(var i = this._worldCarets.length - 1; i >= 0; --i) {
        var caretData = this._worldCarets[i];
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

parsegraph_Graph.prototype.measureText = function()
{
    if(!this._worldNodePainter) {
        throw new Error("measureText cannot be called without a node painter.");
    }

    var painter = this._worldNodePainter._textPainter;
    return painter.measureText.apply(painter, arguments);
};

parsegraph_Graph.prototype.paint = function()
{
    if(!this._paintingDirty) {
        return;
    }

    if(!this._worldNodePainter) {
        this._worldNodePainter = new parsegraph_NodePainter(this.gl());
    }
    else {
        this._worldNodePainter.clear();
    }

    this._worldNodePainter.setBackground(this.surface().backgroundColor());
    this._worldCarets.forEach(function(caretData) {
        this._worldNodePainter.drawCaret.apply(this._worldNodePainter, caretData);
    }, this);

    // Paint the origin.
    this._worldNodePainter.drawOrigin();

    if(this._showCarousel) {
        // Paint the carousel.
        if(!this._fanPainter) {
            //this._fanPainter = new parsegraph_FanPainter(this.gl());
        }
        if(!this._carouselNodePainter) {
            this._carouselNodePainter = new parsegraph_NodePainter(this.gl());
        }
        else {
            this._carouselNodePainter.clear();
        }
        var i = 0;
        this._carouselNodePainter.setBackground(this.surface().backgroundColor());
        this.arrangeCarousel();
        this._carouselCarets.forEach(function(caretData) {
            this._carouselNodePainter.drawCaret(
                caretData[0],
                this._carouselCoords[0] + caretData[4],
                this._carouselCoords[1] + caretData[5],
                caretData[6]
            );
        }, this);
    }

    this._paintingDirty = false;
};

/**
 * Arranges each carousel caret in a spiral.
 */
parsegraph_Graph.prototype.arrangeCarousel = function()
{
    this._carouselCarets.forEach(function(caretData, i) {
        var root = caretData[0].root();
        root.commitLayoutIteratively();

        var caretRad = (i / this._carouselCarets.length) * (2 * Math.PI);
        caretData[4] = 250 * Math.cos(caretRad);
        caretData[5] = 250 * Math.sin(caretRad);
        var commandSize = root.extentSize();

        var xMax = 150;
        var yMax = 150;
        var xShrinkFactor = 1;
        var yShrinkFactor = 1;
        if(commandSize.width() > xMax) {
            xShrinkFactor = commandSize.width() / xMax;
        }

        if(commandSize.height() > yMax) {
            yShrinkFactor = commandSize.height() / yMax;
        }

        caretData[6] = 1/Math.max(xShrinkFactor, yShrinkFactor);
    }, this);
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
    // Paint the world.
    var world = this.camera().project();
    if(this._worldNodePainter) {
        this._worldNodePainter.setBackground(this._backgroundColor);
        this._worldNodePainter.render(world, this.camera().scale());
    }

    // Render the carousel if requested.
    if(this._showCarousel) {
        //this._fanPainter.render(world);
        this._carouselNodePainter.setBackground(this._backgroundColor);
        this._carouselNodePainter.render(world, 1);
    }
};
