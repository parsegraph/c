function parsegraph_Carousel(camera, backgroundColor)
{
    this._updateRepeatedly = false;
    this._showScale = 1;

    this.onScheduleRepaint = null;
    this.onScheduleRepaintThisArg = null;

    // Carousel-rendered carets.
    this._carouselPaintingDirty = true;
    this._carouselPlots = [];
    this._carouselCallbacks = [];

    this._backgroundColor = backgroundColor;
    this._camera = camera;

    // Location of the carousel, in world coordinates.
    this._carouselCoords = [0, 0];
    this._carouselSize = 50;

    this._showCarousel = false;
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;

    this._gl = null;
    this._glyphAtlas = null;
    this._shaders = null;

    // GL painters are not created until needed.
    this._fanPainter = null;

    this._selectedPlot = null;
}

parsegraph_Carousel.prototype.camera = function()
{
    return this._camera;
};

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
    this._updateRepeatedly = true;
    this._showTime = new Date();
};

parsegraph_Carousel.prototype.isCarouselShown = function()
{
    return this._showCarousel;
};

parsegraph_Carousel.prototype.hideCarousel = function()
{
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
    this._showCarousel = false;
    this._hideTime = new Date();
};

parsegraph_Carousel.prototype.addToCarousel = function(node, callback, thisArg, nodeData)
{
    this._carouselCallbacks.push([callback, thisArg, nodeData]);
    if(!node) {
        throw new Error("Node must not be null");
    }
    if(!node.localPaintGroup && node.root) {
        // Passed a Caret.
        node = node.root();
    }
    if(!node.localPaintGroup()) {
        node.setPaintGroup(true);
    }
    this._carouselPlots.push([node, NaN, NaN, NaN]);
    //console.log("Added to carousel");
};

parsegraph_Carousel.prototype.clearCarousel = function()
{
    //console.log("carousel cleared");
    this._carouselPlots.splice(0, this._carouselPlots.length);
    this._carouselCallbacks.splice(0, this._carouselCallbacks.length);
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
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
        if(this._carouselPlots[i][0] === node) {
            //console.log("removed from carousel");
            var removed = this._carouselPlots.splice(i, 1);
            this._carouselCallbacks.splice(i, 1);
            if(this._selectedCarouselPlot === removed) {
                this._selectedCarouselPlot = null;
                this._selectedCarouselPlotIndex = null;
            }
            return removed;
        }
    }
    return null;
};

parsegraph_Carousel.prototype.updateRepeatedly = function()
{
    return this._updateRepeatedly;
};

parsegraph_Carousel.prototype.clickCarousel = function(x, y, asDown)
{
    if(!this.isCarouselShown()) {
        return false;
    }

    if(this._showTime) {
        var ms = new Date().getTime() - this._showTime.getTime();
        if(ms < 200) {
            // Ignore events that occur so early.
            return true;
        }
    }

    // Transform client coords to world coords.
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var dist = Math.sqrt(
        Math.pow(Math.abs(x - this._carouselCoords[0]), 2) +
        Math.pow(Math.abs(y - this._carouselCoords[1]), 2)
    );
    if(dist < this._carouselSize * .75/this._camera.scale()) {
        if(asDown) {
            //console.log("Down events within the inner region are treated as 'cancel.'");
            this.hideCarousel();
            this.scheduleCarouselRepaint();
            return true;
        }

        //console.log("Up events within the inner region are ignored.");
        return false;
    }
    else if(dist > this._carouselSize * 4/this._camera.scale()) {
        this.hideCarousel();
        this.scheduleCarouselRepaint();
        //console.log("Click occurred so far outside that it is considered its own event.");
        return false;
    }

    var angleSpan = 2 * Math.PI / this._carouselPlots.length;
    var mouseAngle = Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    //console.log(alpha_ToDegrees(mouseAngle) + " degrees = caret " + i + " angleSpan = " + angleSpan);
    if(this._carouselPlots.length == 1 && Math.abs(mouseAngle) > Math.PI/2) {
        this.hideCarousel();
        this.scheduleCarouselRepaint();
        //console.log("Click occurred so far outside that it is considered its own event.");
        return false;
    }
    mouseAngle += Math.PI;
    var i = Math.floor(mouseAngle / angleSpan);

    // Click was within a carousel caret; invoke the listener.
    this.hideCarousel();
    try {
        var callback = this._carouselCallbacks[i][0];
        var thisArg = this._carouselCallbacks[i][1];
        var nodeData = this._carouselCallbacks[i][2];
        callback.call(thisArg, nodeData);
    }
    catch(ex) {
        console.log("Error occurred while running command:", ex);
    }

    this.scheduleCarouselRepaint();
    return true;
};

parsegraph_Carousel.prototype.mouseOverCarousel = function(x, y)
{
    if(!this.isCarouselShown()) {
        return 0;
    }

    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var angleSpan = 2 * Math.PI / this._carouselPlots.length;
    var mouseAngle = Math.PI + Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
    var dist = Math.sqrt(
        Math.pow(Math.abs(x - this._carouselCoords[0]), 2) +
        Math.pow(Math.abs(y - this._carouselCoords[1]), 2)
    );

    if(dist < this._carouselSize*4/this._camera.scale() && dist > parsegraph_BUD_RADIUS*4/this._camera.scale()) {
        if(this._carouselPlots.length > 1 || (Math.abs(mouseAngle - Math.PI) < Math.PI/2)) {
            var i = Math.floor(mouseAngle / angleSpan);
            //console.log(alpha_ToDegrees(mouseAngle-Math.PI) + " degrees = caret " + i + " angleSpan = " + angleSpan);
            var selectionAngle = (angleSpan/2 + i * angleSpan) - Math.PI;
            if(i != this._selectedCarouselPlotIndex) {
                this._selectedCarouselPlotIndex = i;
                this._selectedCarouselPlot = this._carouselPlots[i];
            }
            if(this._fanPainter) {
                this._fanPainter.setSelectionAngle(selectionAngle);
                this._fanPainter.setSelectionSize(angleSpan);
            }
            this.scheduleCarouselRepaint();
            return 2;
        }
    }
    if(this._fanPainter) {
        this._fanPainter.setSelectionAngle(null);
        this._fanPainter.setSelectionSize(null);
        this._selectedCarouselPlot = null;
        this._selectedCarouselPlotIndex = null;
        this.scheduleCarouselRepaint();
        return 0;
    }
};

parsegraph_Carousel.prototype.showScale = function()
{
    return this._showScale;
};

parsegraph_Carousel.prototype.arrangeCarousel = function()
{
    if(this._carouselPlots.length === 0) {
        return;
    }

    var angleSpan = 2*Math.PI/this._carouselPlots.length;

    var parsegraph_MAX_CAROUSEL_SIZE = 150;

    var now = new Date();
    // Milliseconds
    var showDuration = 200;
    if(this._showTime) {
        var ms = now.getTime() - this._showTime.getTime();
        if(ms < showDuration) {
            ms /= showDuration/2;
            if(ms < 1) {
                this._showScale = 0.5*ms*ms;
            }
            else {
                ms--;
                this._showScale = -0.5*(ms*(ms-2)-1);
            }
        }
        else {
            this._showScale = 1;
            this._showTime = null;
            this._updateRepeatedly = false;
        }
    }

    var minScale = 1;
    this._carouselPlots.forEach(function(carouselData, i) {
        var root = carouselData[0];
        var paintGroup = root.localPaintGroup();
        root.commitLayoutIteratively();

        // Set the origin.
        var caretRad = Math.PI + angleSpan/2 + (i / this._carouselPlots.length) * (2 * Math.PI);
        carouselData[1] = 2*this._carouselSize * this._showScale * Math.cos(caretRad);
        carouselData[2] = 2*this._carouselSize * this._showScale * Math.sin(caretRad);

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
        //console.log(commandSize.width(), commandSize.height(), 1/Math.max(xShrinkFactor, yShrinkFactor));
        minScale = Math.min(minScale, this._showScale/Math.max(xShrinkFactor, yShrinkFactor));
    }, this);

    this._carouselPlots.forEach(function(carouselData, i) {
        if(i === this._selectedCarouselPlotIndex) {
            carouselData[3] = 1.25*minScale;
        }
        else {
            carouselData[3] = minScale;
        }
    }, this);
};

parsegraph_Carousel.prototype.setOnScheduleRepaint = function(func, thisArg)
{
    thisArg = thisArg || this;
    this.onScheduleRepaint = func;
    this.onScheduleRepaintThisArg = thisArg;
};

parsegraph_Carousel.prototype.scheduleCarouselRepaint = function()
{
    //console.log("Scheduling carousel repaint.");
    this._carouselPaintingDirty = true;
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint.call(this.onScheduleRepaintThisArg);
    }
};

parsegraph_Carousel.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
};

parsegraph_Carousel.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_Carousel.prototype.setBackgroundColor = function(backgroundColor)
{
    this._backgroundColor = backgroundColor;
    this.scheduleCarouselRepaint();
};

parsegraph_Carousel.prototype.paint = function()
{
    if(!this._updateRepeatedly && (!this._carouselPaintingDirty || !this._showCarousel)) {
        return;
    }

    // Paint the carousel.
    //console.log("Painting the carousel");
    this.arrangeCarousel();
    for(var i in this._carouselPlots) {
        parsegraph_PAINTING_GLYPH_ATLAS = this.glyphAtlas();
        var paintCompleted = this._carouselPlots[i][0].paint(
            this.gl(),
            this.backgroundColor(),
            this.glyphAtlas(),
            this._shaders,
            undefined
        );
        parsegraph_PAINTING_GLYPH_ATLAS = null;
    }

    // Paint the background highlighting fan.
    if(!this._fanPainter) {
        this._fanPainter = new parsegraph_FanPainter(this.gl());
    }
    else {
        this._fanPainter.clear();
    }
    var fanPadding = 1.2;
    this._fanPainter.setAscendingRadius(this.showScale() * fanPadding * this._carouselSize);
    this._fanPainter.setDescendingRadius(this.showScale() * fanPadding * 2 * this._carouselSize);
    this._fanPainter.selectRad(
        0, 0,
        0, Math.PI * 2,
        parsegraph_createColor(1, 1, 1, 1),
        parsegraph_createColor(.5, .5, .5, .4)
    );

    this._carouselPaintingDirty = false;
};

parsegraph_Carousel.prototype.render = function(world)
{
    if(!this._showCarousel) {
        return;
    }
    if(this._updateRepeatedly || this._carouselPaintingDirty) {
        this.paint();
    }

    world = matrixMultiply3x3(
        makeScale3x3(1/this._camera.scale()),
        makeTranslation3x3(this._carouselCoords[0], this._carouselCoords[1]),
        world
    );

    this._fanPainter.render(world);

    // Render the carousel if requested.
    for(var i in this._carouselPlots) {
        var carouselData = this._carouselPlots[i];
        var root = carouselData[0];
        root.render(
            matrixMultiply3x3(
                makeScale3x3(carouselData[3]),
                matrixMultiply3x3(makeTranslation3x3(
                    carouselData[1],
                    carouselData[2]
                ), world)
            )
        );
    }
};
