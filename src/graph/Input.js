var parsegraph_RESET_CAMERA_KEY = "Escape";
var parsegraph_CLICK_KEY = "q";

var parsegraph_MOVE_UP_KEY = "ArrowUp";
var parsegraph_MOVE_DOWN_KEY = "ArrowDown";
var parsegraph_MOVE_LEFT_KEY = "ArrowLeft";
var parsegraph_MOVE_RIGHT_KEY = "ArrowRight";

//var parsegraph_MOVE_UP_KEY = "w";
//var parsegraph_MOVE_DOWN_KEY = "s";
//var parsegraph_MOVE_LEFT_KEY = "a";
//var parsegraph_MOVE_RIGHT_KEY = "d";

var parsegraph_ZOOM_IN_KEY = "Shift";
var parsegraph_ZOOM_OUT_KEY = " ";

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

    this._updateRepeatedly = false;

    this.lastMouseCoords = function() {
        return [lastMouseX, lastMouseY];
    };

    this.lastMouseX = function() {
        return lastMouseX;
    };

    this.lastMouseY = function() {
        return lastMouseY;
    };

    // Whether the container is focused and not blurred.
    var focused = false;

    // A map of event.key's to a true value.
    this.keydowns = {};

    var checkForNodeClick = function(clientX, clientY) {
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(this._camera.worldMatrix()),
            clientX, clientY
        );
        //console.log(clientX, clientY);
        //console.log(mouseInWorld);
        var selectedNode = graph.world().nodeUnderCoords(mouseInWorld[0], mouseInWorld[1]);
        if(!selectedNode) {
            return null;
        }

        // Check if the selected node was a slider.
        if(selectedNode.type() == parsegraph_SLIDER) {
            selectedSlider = selectedNode;
            attachedMouseListener = sliderListener;
            sliderListener.call(this, clientX, clientY);
            return selectedNode;
        }

        // Check if the selected node has a click listener.
        if(selectedNode.label()) {
            var c = selectedNode._label.clickToCaret(mouseInWorld[0], mouseInWorld[1],
                selectedNode.absoluteScale(),
                selectedNode.blockStyle(),
                selectedNode.findPaintGroup()
            );
            return selectedNode;
        }
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
        camera.zoomToPoint(Math.pow(1.1, numSteps), x, y);
        this.Dispatch(false, "wheel", true);
    };
    parsegraph_addEventMethod(graph.canvas(), "DOMMouseScroll", onWheel, this, false);
    parsegraph_addEventMethod(graph.canvas(), "mousewheel", onWheel, this, false);

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
                this.Dispatch(false, "touchmove");
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
            camera.zoomToPoint(
                dist / zoomTouchDistance,
                zoomCenter[0],
                zoomCenter[1]
            );
            this.Dispatch(false, "touchzoom");
            zoomTouchDistance = dist;
        }
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
        this.Dispatch(true, "slider");
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
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, true)) {
                return;
            }

            if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
                // A significant node was clicked.
                this.Dispatch(true, "touchstart");
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
            this.Dispatch(false, "touchzoomstart");
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

        graph.carousel().clickCarousel(lastMouseX, lastMouseY, false);

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
        this.Dispatch(false, "mouseDrag world", true);
    };

    parsegraph_addEventMethod(graph.canvas(), "mousemove", function(event) {
        if(graph.carousel().isCarouselShown()) {
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;

            this.Dispatch(graph.mouseOverCarousel(event.clientX, event.clientY), "mousemove carousel");
            return;
        }

        // Moving during a mousedown i.e. dragging (or zooming)
        if(attachedMouseListener) {
            return attachedMouseListener.call(this, event.clientX, event.clientY);
        }

        // Just a mouse moving over the (focused) canvas.
        this.Dispatch(graph.world().mouseOver(event.clientX, event.clientY), "mousemove world", false);
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }, this);

    parsegraph_addEventMethod(graph.canvas(), "mousedown", function(event) {
        //console.log("Mousedown!");
        focused = true;
        event.preventDefault();
        graph.canvas().focus();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;

        if(graph.carousel().isCarouselShown()) {
            //console.log("Clickcarousel");
            graph.carousel().clickCarousel(event.clientX, event.clientY, true);
            // Carousel was hidden.
            if(!graph.carousel().isCarouselShown()) {
                this.Dispatch(graph.mouseOver(lastMouseX, lastMouseY), "mouseover after carousel hide");
            }
            return;
        }

        if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
            // A significant node was clicked.
            this.Dispatch(true, "mousedown node");
            mousedownTime = null;
            return;
        }

        // Dragging on the canvas.
        attachedMouseListener = mouseDragListener;
        //console.log("Repainting graph");
        this.Dispatch(false, "mousedown canvas");

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
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, false)) {
                // Mouseup affected carousel.

                // Carousel was hidden.
                if(!graph.carousel().isCarouselShown()) {
                    this.Dispatch(graph.mouseOver(lastMouseX, lastMouseY), "mouseup");
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

    var getproperkeyname = function(event) {
        var keyName = event.key;
        //console.log(keyName + " " + event.keyCode);
        switch(keyName) {
            case "Enter": return keyName;
            case "Escape": return keyName;
            case "ArrowLeft": return keyName;
            case "ArrowUp": return keyName;
            case "ArrowRight": return keyName;
            case "ArrowDown": return keyName;
        }
        switch(event.keyCode) {
            case 13: keyName = "Enter"; break;
            case 27: keyName = "Escape"; break;
            case 37: keyName = "ArrowLeft"; break;
            case 38: keyName = "ArrowUp"; break;
            case 39: keyName = "ArrowRight"; break;
            case 40: keyName = "ArrowDown"; break;
        }
        return keyName;
    };

    parsegraph_addEventMethod(document, "keydown", function(event) {
        if(event.ctrlKey || event.altKey || event.metaKey) {
            //console.log("Key event had ignored modifiers");
            return;
        }

        var keyName = getproperkeyname(event);
        if(this.keydowns[keyName]) {
            // Already processed.
            //console.log("Key event, but already processed.");
            return;
        }
        this.keydowns[keyName] = new Date();

        switch(keyName) {
        case parsegraph_CLICK_KEY:
            //console.log("Q key for click pressed!");
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, true)) {
                // Mousedown affected carousel.

                // Carousel was hidden.
                if(!graph.carousel().isCarouselShown()) {
                    this.Dispatch(graph.mouseOver(lastMouseX, lastMouseY), "q");
                }
                return;
            }
            if(graph.nodeUnderCursor()) {
                graph.nodeUnderCursor().click();
            }
            // fall through
        case parsegraph_ZOOM_IN_KEY:
        case parsegraph_ZOOM_OUT_KEY:
        case parsegraph_RESET_CAMERA_KEY:
        case parsegraph_MOVE_DOWN_KEY:
        case parsegraph_MOVE_UP_KEY:
        case parsegraph_MOVE_LEFT_KEY:
        case parsegraph_MOVE_RIGHT_KEY:
            this.Dispatch(false, "keydown", true);
            break;
        }
    }, this);

    parsegraph_addEventMethod(document, "keyup", function(event) {
        var keyName = getproperkeyname(event);

        if(!this.keydowns[keyName]) {
            // Already processed.
            return;
        }
        delete this.keydowns[keyName];

        switch(keyName) {
        case parsegraph_CLICK_KEY:
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, false)) {
                // Keyup affected carousel.

                // Carousel was hidden.
                if(!graph.carousel().isCarouselShown()) {
                    this.Dispatch(graph.mouseOver(lastMouseX, lastMouseY), "q carousel");
                }
            }
            // fall through
        case parsegraph_ZOOM_IN_KEY:
        case parsegraph_ZOOM_OUT_KEY:
        case parsegraph_RESET_CAMERA_KEY:
        case parsegraph_MOVE_DOWN_KEY:
        case parsegraph_MOVE_UP_KEY:
        case parsegraph_MOVE_LEFT_KEY:
        case parsegraph_MOVE_RIGHT_KEY:
            this.Dispatch(false, "keydown", true);
            break;
        }
    }, this);

    parsegraph_addEventMethod(graph.canvas(), "mouseup", removeMouseListener, this);

    // Ensure the mousemove listener is removed if we switch windows or change focus.
    parsegraph_addEventMethod(graph.canvas(), "mouseout", removeMouseListener, this);

    this.listener = null;
};

parsegraph_Input.prototype.SetListener = function(listener, thisArg)
{
    if(!listener) {
        this.listener = null;
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    this.listener = [listener, thisArg];
};

parsegraph_Input.prototype.UpdateRepeatedly = function()
{
    return this._updateRepeatedly;
};

parsegraph_Input.prototype.Update = function(t)
{
    var cam = this._camera;

    var xSpeed = 1000 / cam.scale();
    var ySpeed = 1000 / cam.scale();
    var scaleSpeed = 20;

    var inputChangedScene = false;
    this._updateRepeatedly = false;

    if(this.Get(parsegraph_RESET_CAMERA_KEY) && this._graph.surface()._gl) {
        //var defaultScale = .5;
        var defaultScale = 1;
        cam.setOrigin(
            this._graph.gl().drawingBufferWidth / (2 * defaultScale),
            this._graph.gl().drawingBufferHeight / (2 * defaultScale)
        );
        cam.setScale(defaultScale);
        inputChangedScene = true;
    }

    if(this.Get(parsegraph_MOVE_LEFT_KEY) || this.Get(parsegraph_MOVE_RIGHT_KEY) || this.Get(parsegraph_MOVE_UP_KEY) || this.Get(parsegraph_MOVE_DOWN_KEY)) {
        this._updateRepeatedly = true;
        cam.adjustOrigin(
            (this.Elapsed(parsegraph_MOVE_LEFT_KEY, t) * xSpeed + this.Elapsed(parsegraph_MOVE_RIGHT_KEY, t) * -xSpeed),
            (this.Elapsed(parsegraph_MOVE_UP_KEY, t) * ySpeed + this.Elapsed(parsegraph_MOVE_DOWN_KEY, t) * -ySpeed)
        );
        inputChangedScene = true;
    }

    var lastCoords = this.lastMouseCoords();
    if(this.Get(parsegraph_ZOOM_OUT_KEY)) {
        this._updateRepeatedly = true;
        cam.zoomToPoint(Math.pow(1.1, scaleSpeed * this.Elapsed(parsegraph_ZOOM_OUT_KEY, t)),
            this._graph.gl().drawingBufferWidth / 2,
            this._graph.gl().drawingBufferHeight / 2
        );
        inputChangedScene = true;
    }
    if(this.Get(parsegraph_ZOOM_IN_KEY)) {
        this._updateRepeatedly = true;
        cam.zoomToPoint(Math.pow(1.1, -scaleSpeed * this.Elapsed(parsegraph_ZOOM_IN_KEY, t)),
            this._graph.gl().drawingBufferWidth / 2,
            this._graph.gl().drawingBufferHeight / 2
        );
        inputChangedScene = true;
    }
    //this.Dispatch(false, "update", inputChangedScene);

    return inputChangedScene;
};

parsegraph_Input.prototype.Get = function(key)
{
    return this.keydowns[key] ? 1 : 0;
};

parsegraph_Input.prototype.Elapsed = function(key, t)
{
    var v = this.keydowns[key];
    if(!v) {
        return 0;
    }
    var elapsed = (t.getTime() - v.getTime()) / 1000;
    this.keydowns[key] = t;
    return elapsed;
};

parsegraph_Input.prototype.Dispatch = function()
{
    if(this.listener) {
        this.listener[0].apply(this.listener[1], arguments);
    }
};
