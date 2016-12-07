parsegraph_CLICK_DELAY_MILLIS = 500;

/**
 * Controls input from the user on a graph.
 */
function parsegraph_Camera(graph)
{
    this._graph = graph;
    this._cameraX = 0;
    this._cameraY = 0;
    this._scale = 1;
    this._aspectRatio = 1;

    var camera = this;

    // Mouse position; used internally in event listeners.
    var mouseX;
    var mouseY;
    var focused = false;

    parsegraph_addEventListener(graph.container(), "focus", function(event) {
        focused = true;
    });

    parsegraph_addEventListener(graph.container(), "blur", function(event) {
        focused = false;
    });

    function getCursorPosition(canvas, event) {
        var rect = canvas.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        //console.log("x: " + x + " y: " + y);
    };

    var zoomToPoint = function(scaleFactor, x, y) {
        // Get the current mouse position, in world space.
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            x, y
        );
        //console.log("mouseInWorld=" + mouseInWorld[0] + ", " + mouseInWorld[1]);

        // Adjust the scale.
        camera.setScale(camera.scale() * scaleFactor);

        // Get the new mouse position, in world space.
        var mouseAdjustment = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            x, y
        );
        //console.log("mouseAdjustment=" + mouseAdjustment[0] + ", " + mouseAdjustment[1]);

        // Adjust the origin by the movement of the fixed point.
        camera.adjustOrigin(
            mouseAdjustment[0] - mouseInWorld[0],
            mouseAdjustment[1] - mouseInWorld[1]
        );

        // Redraw.
        camera.graph().scheduleRender();
    };

    var onWheel = function(event) {
        if(!focused) {
            return;
        }
        event.preventDefault();

        // Get the mouse coordinates, relative to bottom-left of the canvas.
        var boundingRect = graph.canvas().getBoundingClientRect();
        var x = event.clientX - boundingRect.left;
        var y = event.clientY - boundingRect.top;

        var wheel = normalizeWheel(event);

        // Adjust the scale.
        var numSteps = .4 * -wheel.spinY;
        zoomToPoint(Math.pow(1.1, numSteps), x, y);
    };
    parsegraph_addEventListener(graph.canvas(), "DOMMouseScroll", onWheel, false);
    parsegraph_addEventListener(graph.canvas(), "mousewheel", onWheel, false);

    var zoomTouchDistance = 0;
    var monitoredTouches = [];
    var getTouchByIdentifier = function(identifier) {
        for(var i = 0; i < monitoredTouches.length; ++i) {
            if(monitoredTouches[i].identifier == identifier) {
                return monitoredTouches[i];
            }
        }
        return null;
    };

    var removeTouchByIdentifier = function(identifier) {
        for(var i = 0; i < monitoredTouches.length; ++i) {
            if(monitoredTouches[i].identifier == identifier) {
                monitoredTouches.splice(i--, 1);
            }
        }
        return null;
    };

    /*
     * Touch event handling
     */

    var touchX;
    var touchY;

    parsegraph_addEventListener(graph.canvas(), "touchmove", function(event) {
        event.preventDefault();

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches[i];
            var touchRecord = getTouchByIdentifier(touch.identifier);

            if(monitoredTouches.length == 1) {
                // Move.
                camera.adjustOrigin(
                    (touch.clientX - touchRecord.x) / camera.scale(),
                    (touch.clientY - touchRecord.y) / camera.scale()
                );
            }
            touchRecord.x = touch.clientX;
            touchRecord.y = touch.clientY;
        }

        if(monitoredTouches.length > 1) {
            // Zoom.
            var dist = Math.sqrt(
                Math.pow(
                    monitoredTouches[1].x - monitoredTouches[0].x,
                    2
                ) +
                Math.pow(
                    monitoredTouches[1].y - monitoredTouches[0].y,
                    2
                )
            );
            var zoomCenter = midPoint(
                monitoredTouches[0].x, monitoredTouches[0].y,
                monitoredTouches[1].x, monitoredTouches[1].y
            );
            zoomToPoint(
                dist / zoomTouchDistance,
                zoomCenter[0],
                zoomCenter[1]
            );
            zoomTouchDistance = dist;
        }
    });

    var touchstartTime;

    parsegraph_addEventListener(graph.canvas(), "touchstart", function(event) {
        event.preventDefault();

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches.item(i);
            monitoredTouches.push({
                "identifier": touch.identifier,
                "x":touch.clientX,
                "y":touch.clientY
            });
            touchX = touch.clientX;
            touchY = touch.clientY;

            // Get the current mouse position, in world space.
            //alert(camera.worldMatrix());
            var mouseInWorld = matrixTransform2D(
                makeInverse3x3(camera.worldMatrix()),
                touchX, touchY
            );
            x = mouseInWorld[0];
            y = mouseInWorld[1];
            //alert("World: " + x + ", " + y + ". Touch: " + touchX + ", " + touchY);

            if(!graph.mouseDown(x, y)) {
                touchstartTime = Date.now();
            }
            else {
                touchstartTime = null;
            }
        }

        if(monitoredTouches.length > 1) {
            // Zoom.
            zoomTouchDistance = Math.sqrt(
                Math.pow(
                    monitoredTouches[1].x - monitoredTouches[0].x,
                    2
                ) +
                Math.pow(
                    monitoredTouches[1].y - monitoredTouches[0].y,
                    2
                )
            );
        }
    });

    var isDoubleTouch = false;
    var touchendTimeout = 0;

    var afterTouchTimeout = function() {
        touchendTimeout = null;

        if(isDoubleTouch) {
            // Double touch ended.
            isDoubleTouch = false;
            return;
        }

        // Single touch ended.
        isDoubleTouch = false;
    };

    var removeTouchListener = function(event) {
        event.preventDefault();

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches.item(i);
            removeTouchByIdentifier(touch.identifier);
        }

        if(touchstartTime != null && Date.now() - touchstartTime < parsegraph_CLICK_DELAY_MILLIS) {
            touchendTimeout = setTimeout(afterTouchTimeout, parsegraph_CLICK_DELAY_MILLIS);
        }
    };

    parsegraph_addEventListener(graph.canvas(), "touchend", removeTouchListener);
    parsegraph_addEventListener(graph.canvas(), "touchcancel", removeTouchListener);

    /*
     * Mouse event handling
     */

    var mouseoverListener = function(event) {
        var deltaX = event.clientX - mouseX;
        var deltaY = event.clientY - mouseY;
        mouseX = event.clientX;
        mouseY = event.clientY;

        camera.adjustOrigin(
            deltaX / camera.scale(),
            deltaY / camera.scale()
        );
    };

    var attachedMouseListener = null;
    var mousedownTime = null;

    parsegraph_addEventListener(graph.canvas(), "mousedown", function(event) {
        mouseX = event.clientX;
        mouseY = event.clientY;

        // Get the current mouse position, in world space.
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            mouseX, mouseY
        );
            //alert(camera.worldMatrix());
        //alert("World: " + mouseInWorld + ". mouse: " + mouseX + ", " + mouseY);


        if(graph.mouseDown(mouseInWorld[0], mouseInWorld[1])) {
            mousedownTime = null;
            return;
        }

        if(event.shiftKey) {
            attachedMouseListener = mouseScaleListener;
        }
        else {
            attachedMouseListener = mouseoverListener;
        }

        parsegraph_addEventListener(graph.canvas(), "mousemove", attachedMouseListener);

        //console.log("Setting mousedown time");
        mousedownTime = Date.now();

        // This click is a second click following a recent click; it's a double-click.
        if(mouseupTimeout) {
            window.clearTimeout(mouseupTimeout);
            mouseupTimeout = null;
            isDoubleClick = true;
        }
    });

    var isDoubleClick = false;
    var mouseupTimeout = 0;

    var afterMouseTimeout = function() {
        mouseupTimeout = null;

        if(isDoubleClick) {
            // Double click ended.
            isDoubleClick = false;
            //console.log("Double click detected");
        }
        else {
            //console.log("Single click detected");
        }

        // Single click ended.
        isDoubleClick = false;

        // We double-clicked.
    };

    var removeMouseListener = function(event) {
        //console.log("MOUSEUP");

        if(!attachedMouseListener) {
            //console.log("No attached listeenr");
            return;
        }
        parsegraph_removeEventListener(graph.canvas(), "mousemove", attachedMouseListener);
        attachedMouseListener = null;

        if(
            mousedownTime != null
            && Date.now() - mousedownTime < parsegraph_CLICK_DELAY_MILLIS
        ) {
            //console.log("Click detected");
            if(isDoubleClick) {
                afterMouseTimeout();
                return;
            }
            mouseupTimeout = setTimeout(
                afterMouseTimeout,
                parsegraph_CLICK_DELAY_MILLIS/5
            );
        }
        else {
            //console.log("Click missed timeout");
        }
    };

    parsegraph_addEventListener(graph.canvas(), "mouseup", removeMouseListener);

    // Ensure the mousemove listener is removed if we switch windows or change focus.
    parsegraph_addEventListener(graph.canvas(), "mouseout", removeMouseListener);
};

parsegraph_Camera.prototype.setOrigin = function(x, y)
{
    if(isNaN(x) || isNaN(y)) {
        throw new Error("Origin must not be NaN.");
    }
    this._cameraX = x;
    this._cameraY = y;
    this.graph().scheduleRender();
}

parsegraph_Camera.prototype.graph = function()
{
    return this._graph;
};

parsegraph_Camera.prototype.scale = function()
{
    return this._scale;
};

parsegraph_Camera.prototype.x = function()
{
    return this._cameraX;
};

parsegraph_Camera.prototype.y = function()
{
    return this._cameraY;
};

parsegraph_Camera.prototype.setScale = function(scale)
{
    if(isNaN(scale)) {
        throw new Error("scale must not be NaN.");
    }
    this._scale = scale;
    this.graph().scheduleRender();
};

parsegraph_Camera.prototype.adjustOrigin = function(x, y)
{
    this.setOrigin(
        this._cameraX + x,
        this._cameraY + y
    );
}

/**
 * Returns the current world matrix that represents the position of the viewer.
 */
parsegraph_Camera.prototype.worldMatrix = function()
{
    return matrixMultiply3x3(
        makeTranslation3x3(this.x(), this.y()),
        makeScale3x3(this.scale(), this.scale())
    );
};

parsegraph_Camera.prototype.aspectRatio = function()
{
    return this._aspectRatio;
};

parsegraph_Camera.prototype.width = function()
{
    return this._width;
};

parsegraph_Camera.prototype.height = function()
{
    return this._height;
};

parsegraph_Camera.prototype.project  = function()
{
    // http://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.graph().container().clientWidth;
    var displayHeight = this.graph().container().clientHeight;

    if(displayWidth == 0 || displayHeight == 0) {
        return null;
    }

    // Check if the canvas is not the same size.
    if(
        this.graph().canvas().width != displayWidth
        || this.graph().canvas().height != displayHeight
    ) {
        // Make the canvas the same size
        this.graph().canvas().width = displayWidth;
        this.graph().canvas().height = displayHeight;

        // Set the viewport to match
        this.graph().gl().viewport(
            0, 0, this.graph().canvas().width, this.graph().canvas().height
        );
    }

    this._aspectRatio = this.graph().canvas().width / this.graph().canvas().height;
    this._width = this.graph().canvas().width;
    this._height = this.graph().canvas().height;

    return matrixMultiply3x3(
        this.worldMatrix(),
        make2DProjection(
            this.graph().gl().drawingBufferWidth,
            this.graph().gl().drawingBufferHeight
        )
    );
}
