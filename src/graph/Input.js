function parsegraph_Input(graph, camera)
{
    this._graph = graph;
    this._camera = camera;

    var attachedMouseListener = null;
    var mousedownTime = null;

    var touchX;
    var touchY;

    var lastMouseX = 0;
    var lastMouseY = 0;

    // Whether the container is focused and not blurred.
    var focused = false;

    // A map of event.key's to a true value.
    var keydowns = {};

    var checkForNodeClick = function(clientX, clientY) {
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(this._camera.worldMatrix()),
            clientX, clientY
        );
        var selectedNode = graph.nodeUnderCoords(mouseInWorld[0], mouseInWorld[1]);
        if(!selectedNode) {
            return null;
        }

        // Check if the selected node was a slider.
        if(selectedNode.type() == parsegraph_SLIDER) {
            selectedSlider = selectedNode;
            attachedMouseListener = sliderListener;
            sliderListener(clientX, clientY);
            return selectedNode;
        }

        // Check if the selected node has a click listener.
        if(selectedNode.hasClickListener()) {
            selectedNode.click();
            return selectedNode;
        }

        // A node was clicked, but nothing to be done.
        return null;
    };

    parsegraph_addEventListener(graph.container(), "focus", function(event) {
        focused = true;
    });

    parsegraph_addEventListener(graph.container(), "blur", function(event) {
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
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
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

    var selectedSlider = null;
    var sliderListener = function(mouseX, mouseY) {
        // Get the current mouse position, in world space.
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            mouseX, mouseY
        );
        var x = mouseInWorld[0];
        var y = mouseInWorld[1];
        if(parsegraph_isVerticalNodeDirection(selectedSlider.parentDirection())) {
            var nodeWidth = selectedSlider.absoluteSize().width();
            if(x <= selectedSlider.absoluteX() - nodeWidth / 2) {
                // To the left!
                selectedSlider.setValue(0);
            }
            else if(x >= selectedSlider.absoluteX() + nodeWidth / 2) {
                // To the right!
                selectedSlider.setValue(1);
            }
            else {
                // In between.
                //console.log("x=" + x);
                //console.log("selectedSlider.absoluteX()=" + selectedSlider.absoluteX());
                //console.log("PCT: " + (x - selectedSlider.absoluteX()));
                //console.log("In between: " + ((nodeWidth/2 + x - selectedSlider.absoluteX()) / nodeWidth));
                selectedSlider.setValue((nodeWidth/2 + x - selectedSlider.absoluteX()) / nodeWidth);
            }
        }
        graph.scheduleRepaint();
        lastMouseX = mouseX;
        lastMouseY = mouseY;

        return true;
    };

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
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;

            // Get the current mouse position, in world space.
            //alert(camera.worldMatrix());
            if(graph.clickCarousel(lastMouseX, lastMouseY, true)) {
                return;
            }

            if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
                // A significant node was clicked.
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

        graph.clickCarousel(lastMouseX, lastMouseY, false);

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
    var mouseDragListener = function(mouseX, mouseY) {
        var deltaX = mouseX - lastMouseX;
        var deltaY = mouseY - lastMouseY;
        lastMouseX = mouseX;
        lastMouseY = mouseY;

        camera.adjustOrigin(
            deltaX / camera.scale(),
            deltaY / camera.scale()
        );

        // Redraw.
        camera.graph().scheduleRender();
    };

    parsegraph_addEventListener(graph.canvas(), "mousemove", function(event) {
        if(graph.isCarouselShown()) {
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            return graph.mouseOverCarousel(event.clientX, event.clientY);
        }

        // Moving during a mousedown i.e. dragging (or zooming)
        if(attachedMouseListener) {
            return attachedMouseListener(event.clientX, event.clientY);
        }

        // Just a mouse moving over the (focused) canvas.
        graph.mouseOver(event.clientX, event.clientY);
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    parsegraph_addEventMethod(graph.canvas(), "mousedown", function(event) {
        //console.log("Mousedown!");
        focused = true;
        event.preventDefault();
        graph.canvas().focus();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        if(graph.isCarouselShown()) {
            //console.log("Clickcarousel");
            graph.clickCarousel(event.clientX, event.clientY, true);
            // Carousel was hidden.
            if(!graph.isCarouselShown()) {
                graph.mouseOver(lastMouseX, lastMouseY);
            }
            return;
        }

        if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
            // A significant node was clicked.
            mousedownTime = null;
            return;
        }

        // Dragging on the canvas.
        attachedMouseListener = mouseDragListener;

        //console.log("Setting mousedown time");
        mousedownTime = Date.now();

        // This click is a second click following a recent click; it's a double-click.
        if(mouseupTimeout) {
            window.clearTimeout(mouseupTimeout);
            mouseupTimeout = null;
            isDoubleClick = true;
        }
    }, this);

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

                // Carousel was hidden.
                if(!graph.isCarouselShown()) {
                    graph.mouseOver(lastMouseX, lastMouseY);
                }
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
        if(!focused && event.key != 'q') {
            //console.log("Key event, but unfocused.");
            return;
        }

        if(keydowns[event.key]) {
            // Already processed.
            //console.log("Key event, but already processed.");
            return;
        }
        keydowns[event.key] = new Date();

        switch(event.key) {
        case 'q':
            //console.log("Q key for click pressed!");
            if(graph.clickCarousel(lastMouseX, lastMouseY, true)) {
                // Mousedown affected carousel.

                // Carousel was hidden.
                if(!graph.isCarouselShown()) {
                    graph.mouseOver(lastMouseX, lastMouseY);
                }
                return;
            }
            if(graph.nodeUnderCursor()) {
                graph.nodeUnderCursor().click();
            }
            break;
        }
    });

    parsegraph_addEventListener(document, "keyup", function(event) {
        if(!focused && event.key != 'q') {
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

                // Carousel was hidden.
                if(!graph.isCarouselShown()) {
                    graph.mouseOver(lastMouseX, lastMouseY);
                }
            }
            break;
        }
    });

    parsegraph_addEventListener(graph.canvas(), "mouseup", removeMouseListener);

    // Ensure the mousemove listener is removed if we switch windows or change focus.
    parsegraph_addEventListener(graph.canvas(), "mouseout", removeMouseListener);
};
