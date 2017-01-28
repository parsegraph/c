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

    this._worldPaintingDirty = true;
    this._carouselPaintingDirty = true;

    this._camera = new parsegraph_Camera(this);

    // World-rendered carets.
    this._worldCarets = [];

    // The node currently under the cursor.
    this._nodeUnderCursor = null;

    // Carousel-rendered carets.
    this._carouselCarets = [];
    this._carouselCoords = [0, 0];
    this._carouselSize = 100;
    this._showCarousel = false;
    this._selectedCarouselCaret = null;

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

parsegraph_Graph.prototype.plot = function()
{
    if(arguments.length > 1) {
        this._worldCarets.push([arguments[0], arguments[1], arguments[2]]);
    }
    else {
        this._worldCarets.push([arguments[0]]);
    }
};

parsegraph_Graph.prototype.plotCarousel = function(worldX, worldY)
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
    this._selectedCarouselCaret = null;
    this._showCarousel = false;
};

parsegraph_Graph.prototype.addToCarousel = function(caret, label, callback, thisArg)
{
    this._carouselCarets.push([caret, label, callback, thisArg, 0, 0]);
};

parsegraph_Graph.prototype.clearCarousel = function()
{
    this._carouselCarets.splice(0, this._carouselCarets.length);
    this._selectedCarouselCaret = null;
};

parsegraph_Graph.prototype.removeFromCarousel = function(caret)
{
    for(var i = 0; i < this._carouselCarets.length; ++i) {
        if(this._carouselCarets[i][0] == caret) {
            var removed = this._carouselCarets.splice(i, 1)[0];
            if(this._selectedCarouselCaret == removed) {
                this._selectedCarouselCaret = null;
            }
            return removed;
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

    var angleSpan = 2 * Math.PI / this._carouselCarets.length;
    var mouseAngle = Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    if(mouseAngle < 0) {
        // Upward half.
        mouseAngle = 2 * Math.PI + mouseAngle;
    }

    var i = Math.floor(this._carouselCarets.length * (mouseAngle) / (2 * Math.PI));

    // Click was within a carousel caret; notify listener.
    //console.log(alpha_ToDegrees(mouseAngle) + " degrees = caret " + i);
    var carouselCaretData = this._carouselCarets[i];
    var callback = carouselCaretData[2];
    var thisArg = carouselCaretData[3];
    callback.call(thisArg);
    this.mouseOver(x, y);
    this.scheduleRepaint();

    return true;
};

/**
 * Receives a mouseover event at the given coordinates, in client space.
 */
parsegraph_Graph.prototype.mouseOver = function(x, y)
{
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var selectedNode = this.nodeUnderCoords(x, y);
    if(this._nodeUnderCursor && this._nodeUnderCursor != selectedNode) {
        this._nodeUnderCursor.setSelected(false);
        this.scheduleRepaint();
    }
    this._nodeUnderCursor = selectedNode;
    if(!selectedNode) {
        // No node found.
        return null;
    }

    if(selectedNode.type() == parsegraph_SLIDER) {
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }
    else if(selectedNode.hasClickListener() && !selectedNode.isSelected()) {
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }

    return selectedNode;
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

    var angleSpan = 2 * Math.PI / this._carouselCarets.length;
    var mouseAngle = Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    //var i = Math.floor(this._carouselCarets.length * mouseAngle / (2 * Math.PI));
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
    for(var i = this._worldCarets.length - 1; i >= 0; --i) {
        var caretData = this._worldCarets[i];
        var caret = caretData[0];
        var caretX = caretData[1];
        var caretY = caretData[2];
        if(caretData.length === 1) {
            caretX = 0;
            caretY = 0;
        }
        var selectedNode = caret.nodeUnderCoords(x - caretX, y - caretY);
        if(selectedNode) {
            // Node located; no further search.
            return selectedNode;
        }
    }
    return null;
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
    if(this._worldPaintingDirty) {
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

        this._worldPaintingDirty = false;
    }

    if(this._carouselPaintingDirty && this._showCarousel) {
        // Paint the carousel.
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
};

/**
 * Arranges each carousel caret in a spiral.
 */
parsegraph_Graph.prototype.arrangeCarousel = function()
{
    var angleSpan = this._carouselCarets.length / (2 * Math.PI);

    var parsegraph_CAROUSEL_RADIUS = 250;
    var parsegraph_MAX_CAROUSEL_SIZE = 150;

    this._carouselCarets.forEach(function(caretData, i) {
        var root = caretData[0].root();
        root.commitLayoutIteratively();

        var caretRad = angleSpan/2 + (i / this._carouselCarets.length) * (2 * Math.PI);
        caretData[4] = parsegraph_CAROUSEL_RADIUS * Math.cos(caretRad);
        caretData[5] = parsegraph_CAROUSEL_RADIUS * Math.sin(caretRad);
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

        caretData[6] = 1/Math.max(xShrinkFactor, yShrinkFactor);
    }, this);
};

parsegraph_Graph.prototype.scheduleRepaint = function()
{
    this._worldPaintingDirty = true;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint();
    }
};

parsegraph_Graph.prototype.needsRepaint = function()
{
    return this._worldPaintingDirty;
};

parsegraph_Graph.prototype.scheduleCarouselRepaint = function()
{
    this._carouselPaintingDirty = true;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint();
    }
};

parsegraph_Graph.prototype.render = function()
{
    // Paint the world.
    var world = this.camera().project();
    if(this._showCarousel) {
        this._fanPainter.render(world);
    }

    if(this._worldNodePainter) {
        this._worldNodePainter.setBackground(this._backgroundColor);
        this._worldNodePainter.render(world, this.camera().scale());
    }

    // Render the carousel if requested.
    if(this._showCarousel) {
        var gl = this.gl();
        this._carouselNodePainter.setBackground(this._backgroundColor);
        this._carouselNodePainter.render(world, 1);
    }
};
