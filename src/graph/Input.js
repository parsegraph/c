function parsegraph_Input(graph, camera)
{
    this._graph = graph;
    this._camera = camera;

    // Mouse position; used internally in event listeners.
    var mouseX;
    var mouseY;

    // Whether the container is focused and not blurred.
    var focused = false;

    // A map of event.key's to a true value.
    var keydowns = {};

    parsegraph_addEventListener(graph.canvas(), "focus", function(event) {
        focused = true;
    });

    parsegraph_addEventListener(graph.canvas(), "blur", function(event) {
        focused = false;
    });

    /**
     * Zooms to the given point.
     *
     * XXX Should this be in Graph or Camera?
     */
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

    /**
     * The receiver of all graph canvas wheel events.
     */
    var onWheel = function(event) {
        if(graph.isCarouselShown()) {
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
        if(!focused) {
            return;
        }
        event.preventDefault();
        //console.log("touchmove");

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
        focused = true;

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
            lastMouseX = mouseInWorld[0];
            lastMouseY = mouseInWorld[1];

            if(graph.clickCarousel(lastMouseX, lastMouseY, true)) {
                return;
            }
            if(graph.clickWorld(mouseInWorld[0], mouseInWorld[1])) {
                touchstartTime = null;
                return;
            }

            touchstartTime = Date.now();
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
    }, true);

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
        //console.log("touchend");
        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches.item(i);
            removeTouchByIdentifier(touch.identifier);
        }

        if(touchstartTime != null && Date.now() - touchstartTime < parsegraph_CLICK_DELAY_MILLIS) {
            touchendTimeout = setTimeout(afterTouchTimeout, parsegraph_CLICK_DELAY_MILLIS);
        }

        return true;
    };

    parsegraph_addEventListener(graph.canvas(), "touchend", removeTouchListener);
    parsegraph_addEventListener(graph.canvas(), "touchcancel", removeTouchListener);

    /*
     * Mouse event handling
     */

    /**
     * Receives events that cause the camera to be moved.
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

    var lastMouseX = 0;
    var lastMouseY = 0;

    parsegraph_addEventListener(graph.canvas(), "mousemove", function(event) {
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(graph.camera().worldMatrix()),
            event.clientX, event.clientY
        );
        lastMouseX = mouseInWorld[0];
        lastMouseY = mouseInWorld[1];

        if(graph.isCarouselShown()) {
            return graph.mouseOverCarousel(mouseInWorld[0], mouseInWorld[1]);
        }

        // Moving during a mousedown i.e. dragging (or zooming)
        if(attachedMouseListener) {
            return attachedMouseListener(event);
        }

        // Just a mouse moving over the (focused) canvas.
        graph.mouseOver(mouseInWorld[0], mouseInWorld[1]);
    });

    parsegraph_addEventListener(graph.canvas(), "mousedown", function(event) {
        focused = true;
        //event.preventDefault();
        graph.canvas().focus();

        mouseX = event.clientX;
        mouseY = event.clientY;

        // Get the current mouse position, in world space.
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            mouseX, mouseY
        );
        lastMouseX = mouseInWorld[0];
        lastMouseY = mouseInWorld[1];

        if(graph.clickCarousel(lastMouseX, lastMouseY, true)) {
            return;
        }
        else if(graph.clickWorld(mouseInWorld[0], mouseInWorld[1])) {
            mousedownTime = null;
            return;
        }

        if(event.shiftKey) {
            attachedMouseListener = mouseScaleListener;
        }
        else {
            attachedMouseListener = mouseoverListener;
        }

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
            if(graph.clickCarousel(lastMouseX, lastMouseY, false)) {
                // Mouseup affected carousel.
                return;
            }
            //console.log("No attached listeenr");
            return;
        }
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

    parsegraph_addEventListener(document, "keydown", function(event) {
        if(!focused) {
            return;
        }

        if(keydowns[event.key]) {
            // Already processed.
            return;
        }
        keydowns[event.key] = new Date();

        switch(event.key) {
        case 'q':
            if(graph.clickCarousel(lastMouseX, lastMouseY, true)) {
                // Mousedown affected carousel.
                return;
            }
            if(graph.nodeUnderCursor()) {
                graph.nodeUnderCursor().click();
            }
            break;
        }
    });

    parsegraph_addEventListener(document, "keyup", function(event) {
        if(!focused) {
            return;
        }

        if(!keydowns[event.key]) {
            // Already processed.
            return;
        }
        delete keydowns[event.key];

        switch(event.key) {
        case 'q':
            if(graph.clickCarousel(lastMouseX, lastMouseY, false)) {
                // Keyup affected carousel.
                break;
            }
            break;
        }
    });

    parsegraph_addEventListener(graph.canvas(), "mouseup", removeMouseListener);

    // Ensure the mousemove listener is removed if we switch windows or change focus.
    parsegraph_addEventListener(graph.canvas(), "mouseout", removeMouseListener);
};
