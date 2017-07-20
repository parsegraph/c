function parsegraph_Carousel()
{
    // Carousel-rendered carets.
    this._carouselPaintingDirty = true;
    this._carouselPlots = [];
    this._carouselCallbacks = [];

    // Location of the carousel, in world coordinates.
    this._carouselCoords = [0, 0];
    this._carouselSize = 100;

    this._showCarousel = false;
    this._selectedCarouselPlot = null;

    this._gl = null;
    this._glyphAtlas = null;
    this._shaders = null;

    // GL painters are not created until needed.
    this._fanPainter = null;
}

parsegraph_Carousel.prototype.needsRepaint = function()
{
    return this._carouselPaintingDirty;
};

parsegraph_Carousel.prototype.prepare = function(gl, glyphAtlas, shaders)
{
    this._gl = gl;
    this._glyphAtlas = glyphAtlas;
    this._shaders = shaders;
}

parsegraph_Carousel.prototype.gl = function()
{
    return this._gl;
}

parsegraph_Carousel.prototype.moveCarousel = function(worldX, worldY)
{
    this._carouselCoords[0] = worldX;
    this._carouselCoords[1] = worldY;
};

parsegraph_Carousel.prototype.setCarouselSize = function(size)
{
    this._carouselSize = size;
};

parsegraph_Carousel.prototype.showCarousel = function()
{
    this._showCarousel = true;
};

parsegraph_Carousel.prototype.isCarouselShown = function()
{
    return this._showCarousel;
};

parsegraph_Carousel.prototype.hideCarousel = function()
{
    this._selectedCarouselPlot = null;
    this._showCarousel = false;
};

parsegraph_Carousel.prototype.addToCarousel = function(node, callback, thisArg)
{
    this._carouselCallbacks.push([callback, thisArg]);
    if(!node) {
        throw new Error("Node must not be null");
    }
    if(!node.localPaintGroup && node.root) {
        // Passed a Caret.
        node = node.root();
    }
    if(!node.localPaintGroup()) {
        node.setPaintGroup(new parsegraph_PaintGroup(node));
    }
    this._carouselPlots.push(node);
};

parsegraph_Carousel.prototype.clearCarousel = function()
{
    this._carouselPlots.splice(0, this._carouselPlots.length);
    this._carouselCallbacks.splice(0, this._carouselCallbacks.length);
    this._selectedCarouselPlot = null;
};

parsegraph_Carousel.prototype.removeFromCarousel = function(node)
{
    if(!node) {
        throw new Error("Node must not be null");
    }
    if(!node.localPaintGroup && node.root) {
        // Passed a Caret.
        node = node.root();
    }
    for(var i in this._carouselPlots) {
        if(this._carouselPlots[i] === node) {
            var removed = this._carouselPlots.splice(i, 1);
            this._carouselCallbacks.splice(i, 1);
            if(this._selectedCarouselPlot === removed) {
                this._selectedCarouselPlot = null;
            }
            return removed;
        }
    }
    return null;
};

parsegraph_Carousel.prototype.clickCarousel = function(x, y, asDown)
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

parsegraph_Carousel.prototype.mouseOverCarousel = function(x, y)
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

parsegraph_Carousel.prototype.arrangeCarousel = function()
{
    var angleSpan = this._carouselPlots.length / (2 * Math.PI);

    var parsegraph_CAROUSEL_RADIUS = 250;
    var parsegraph_MAX_CAROUSEL_SIZE = 150;

    this._carouselPlots.forEach(function(root, i) {
        var paintGroup = root.localPaintGroup();

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

parsegraph_Carousel.prototype.scheduleCarouselRepaint = function()
{
    //console.log("Scheduling carousel repaint.");
    this._carouselPaintingDirty = true;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint();
    }
};

parsegraph_Carousel.prototype.paint = function()
{
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
};

parsegraph_Carousel.prototype.render = function(world)
{
    if(this._showCarousel && !this._carouselPaintingDirty) {
        //console.log("Rendering the carousel");
        this._fanPainter.render(world);
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
};
