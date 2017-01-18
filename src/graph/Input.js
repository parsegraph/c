function parsegraph_Input(graph, camera)
{
    this._graph = graph;
    this._camera = camera;

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

        // Redraw.
        camera.graph().scheduleRender();
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

            if(!graph.mouseDown || !graph.mouseDown(x, y)) {
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

        // Redraw.
        camera.graph().scheduleRender();
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
