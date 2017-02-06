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
    this._plotted = [];

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
        this._plotted.push([arguments[0], arguments[1], arguments[2]]);
    }
    else {
        this._plotted.push([arguments[0]]);
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
    for(var i = 0; i < this._plotted.length; ++i) {
        if(this._plotted[i][0] == caret) {
            return this._plotted.splice(i, 1);
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
    for(var i = this._plotted.length - 1; i >= 0; --i) {
        var caretData = this._plotted[i];
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

/**
 * drawCaret(caret, worldX, worldY, userScale)
 * drawCaret(caret) means drawCaret(caret, 0, 0, 1)
 */
parsegraph_Graph.prototype.drawCaret = function()
{
    var caret, worldX, worldY, userScale;
    caret = arguments[0];
    if(arguments.length > 1) {
        worldX = arguments[1];
        worldY = arguments[2];
        userScale = arguments[3];
    }
    else {
        worldX = 0;
        worldY = 0;
    }
    if(userScale === undefined) {
        userScale = 1;
    }
    caret.root().commitLayoutIteratively();

    var ordering = [caret.root()];

    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }
        // Add the node to the ordering if it exists and needs a layout.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);
            ordering.push(child);
        }
    };

    // Build the node list.
    for(var i = 0; i < ordering.length; ++i) {
        var node = ordering[i];
        addNode(node, parsegraph_INWARD);
        addNode(node, parsegraph_DOWNWARD);
        addNode(node, parsegraph_UPWARD);
        addNode(node, parsegraph_BACKWARD);
        addNode(node, parsegraph_FORWARD);

        this._worldNodePainter.drawNode(node, worldX, worldY, userScale);
    }
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
        this._plotted.forEach(function(caretData) {
            this.drawCaret.apply(this, caretData);
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
    //console.log(new Error("Scheduling repaint"));
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
