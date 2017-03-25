function parsegraph_VTimeline()
{
    this._container = document.createElement("div");
    this._container.className = "parsegraph_VTimeline";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");

    this._container.appendChild(this._canvas);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._sunrisePainter = new parsegraph_VSunrisePainter(this._gl);
    this._sunrisePainter.setColor(this._backgroundColor);

    this._slicePainter = new parsegraph_VSlicePainter(this._gl);

    this._gridPainter = new parsegraph_VSlicePainter(this._gl);
    this._hourlyGridPainter = new parsegraph_VSlicePainter(this._gl);
    this._minuteGridPainter = new parsegraph_VSlicePainter(this._gl);
    this._selfSlicePainter = new parsegraph_VSlicePainter(this._gl);

    this._glyphPainter = parsegraph_createGlyphPainter(this._gl);

    this._glyphPainter._glyphAtlas.setAfterUpdate(this.scheduleRender, this);
    this._renderText = true;

    this._camera = new parsegraph_Camera(this);

    this._sunrisePainter.setGeographicalPos(
        -360*new Date().getTimezoneOffset()/60/24,
        45
    );
    this.scheduleRepaint();

    this.setBackground(new parsegraph_Color(.2, .2, 1, 1));
};

parsegraph_VTimeline.prototype.focusDate = function(d)
{
    //console.log("Setting time: " + d.getTime()/1000/60);
    this._sunrisePainter.setTime(d);
    this._camera.setOrigin(
        0, -d.getTime()/1000/60
    );
};

parsegraph_VTimeline.prototype.mouseDown = function(x, y)
{
    // TODO
    return false;
};

parsegraph_VTimeline.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(parsegraph_createColor.apply(this, arguments));
    }

    if(color == null) {
        throw new Error("color must not be null");
    }

    this._backgroundColor = color;
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    this._oldBackgroundColor = this._backgroundColor;
    this._backgroundColor = color;
    this._sunrisePainter.setColor(color);
    this.scheduleRepaint();
}

parsegraph_VTimeline.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

/**
 * Paints the scene; this rebuilds the scene graph.
 */
parsegraph_VTimeline.prototype.paint = function()
{
	//console.log("Painting");

    this._glyphPainter.clear();

    var DAYS_RENDERED = 365;

    this._sunrisePainter.paint(DAYS_RENDERED);

    this._gridPainter.clear();
    this._hourlyGridPainter.clear();
    this._minuteGridPainter.clear();
    this._slicePainter.clear();
    var time = this._sunrisePainter.time();
    if(!time) {
        return;
    }

    var sliceColor = new parsegraph_Color(1, 0, 0, 1);

    var drawSliceFromDates = function(startTime, endTime, i) {
        this._slicePainter.drawSlice(
            startTime.getTime()/1000/60,
            (endTime.getTime() - startTime.getTime())/1000/60,
            new parsegraph_Color(0, 0, 1, 1)
        );
    };

    var drawWorkingDay = function(d) {
        var startTime = new Date(d.getTime());
        var endTime = new Date(d.getTime());
        startTime.setHours(9, 0, 0, 0);
        endTime.setHours(17, 0, 0, 0);
        drawSliceFromDates.call(this, startTime, endTime, i);
    };

    // Render midnights and noons.
    var markTime = new Date(time.getTime());
    markTime.setHours(0, 0, 0, 0);
    for(var i = 0; i < DAYS_RENDERED; ++i) {
        if(markTime.getDay() >= 1 && markTime.getDay() < 6) {
            drawWorkingDay.call(this, markTime);
        }
        for(var j = 0; j < 24; ++j) {
            markTime.setHours(j, 0, 0, 0);
            //console.log("Line slice: ", markTime.getTime()/1000/60);
            var thickness = 2;
            if(j == 0) {
                thickness *= 8;
                this._gridPainter.drawSlice(
                    markTime.getTime()/1000/60,
                    thickness,
                    new parsegraph_Color(1, 1, 1, .6)
                );
            }
            else if(j % 12 == 0) {
                thickness *= 4;
            }
            else if(j % 6 == 0) {
                thickness *= 2;
            }
            this._hourlyGridPainter.drawSlice(
                markTime.getTime()/1000/60,
                thickness,
                new parsegraph_Color(1, 1, 1, (j % 3 == 0 ? .6 : .2))
            );

            for(var k = 15; k < 60; k += 15) {
                this._minuteGridPainter.drawSlice(
                    markTime.getTime()/1000/60 + k,
                    (k == 0 && j == 0) ? 4 : 1,
                    new parsegraph_Color(1, 1, 1, (k == 0 && j == 0) ? .6 : .2)
                );
            }
        }
        markTime = parsegraph_nextDay(markTime);
    }
};

/**
 * Renders the painted scene graph.
 */
parsegraph_VTimeline.prototype.render = function()
{
	//console.log("Rendering");
    if(
        this._container.style.backgroundColor != this._backgroundColor.asRGB()
    ) {
        // The container's background color has changed to something unexpected;
        // this is probably from the user playing with the background in the
        // browser.
        console.log(
            "User changed the background color (" +
            this._container.style.backgroundColor + " != " +
            this._backgroundColor.asRGB()
        );
        this.setBackground(parsegraph_fromRGB(this._container.style.backgroundColor));
    }

    var world = this.camera().project();
    this._gl.clearColor(
        0, 0, 0, 0
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._gl.enable(this._gl.BLEND);
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA
    );

    //console.log(new parsegraph_Size(1, this.camera().height()));
    this._sunrisePainter.render(world, this.camera());
    this._slicePainter.render(world);

    var viewableMins = this.camera().height() / this.camera().scale();

    // Minutes don't work well at these large values.
    if(viewableMins <= 60 * 7) {
        this._minuteGridPainter.render(world);
    }
    if(viewableMins <= 60 * 24 * 5) {
        this._hourlyGridPainter.render(world);
    }
    else if(viewableMins <= 60 * 24 * 14) {
        this._gridPainter.render(world);
    }

    // Render the present slice.
    this._selfSlicePainter.clear();
    this._selfSlicePainter.drawSlice(
        new Date().getTime()/1000/60,
        2,
        new parsegraph_Color(0, 0, 0, 1)
    );
    //console.log("Rendering self slice: " + new Date().getTime()/1000/60);
    this._selfSlicePainter.render(world);

    //console.log(viewableMins);
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.DST_ALPHA
    );

    if(this._renderText) {
        this._glyphPainter.render(world, this.camera().scale());
    }
};

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_VTimeline.prototype.container = function()
{
    return this._container;
};

/**
 * Returns the camera that determines the perspective for this graph.
 */
parsegraph_VTimeline.prototype.camera = function()
{
    return this._camera;
};

parsegraph_VTimeline.prototype.gl = function()
{
    return this._gl;
};

parsegraph_VTimeline.prototype.canvas = function()
{
    return this._canvas;
};

/**
 * Schedules a repaint. Painting causes the scene
 * graph to be rebuilt.
 */
parsegraph_VTimeline.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

/**
 * Schedules a render. Rendering draws the scene graph.
 *
 * Rendering will cause repainting if needed.
 */
parsegraph_VTimeline.prototype.scheduleRender = function()
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

parsegraph_VTimeline.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
};

parsegraph_VTimeline.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};
