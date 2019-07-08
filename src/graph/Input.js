var parsegraph_RESET_CAMERA_KEY = "Escape";
var parsegraph_CLICK_KEY = "q";

var parsegraph_MOVE_UPWARD_KEY = "ArrowUp";
var parsegraph_MOVE_DOWNWARD_KEY = "ArrowDown";
var parsegraph_MOVE_BACKWARD_KEY = "ArrowLeft";
var parsegraph_MOVE_FORWARD_KEY = "ArrowRight";
var parsegraph_CARET_COLOR = new parsegraph_Color(0, 0, 0, .5);
var parsegraph_FOCUSED_SPOTLIGHT_COLOR = new parsegraph_Color(1, 1, 1, .5);
var parsegraph_FOCUSED_SPOTLIGHT_SCALE = 6;

//var parsegraph_MOVE_UPWARD_KEY = "w";
//var parsegraph_MOVE_DOWNWARD_KEY = "s";
//var parsegraph_MOVE_BACKWARD_KEY = "a";
//var parsegraph_MOVE_FORWARD_KEY = "d";

var parsegraph_ZOOM_IN_KEY = "ZoomIn";
var parsegraph_ZOOM_OUT_KEY = "ZoomOut";

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

    var mousedownX = 0;
    var mousedownY = 0;

    this._updateRepeatedly = false;

    this._caretPainter = null;
    this._caretPos = [];
    this._caretColor = parsegraph_CARET_COLOR;
    this._focusedNode = null;
    this._focusedLabel = false;

    this._spotlightPainter = null;
    this._spotlightColor = parsegraph_FOCUSED_SPOTLIGHT_COLOR;

    this._mouseVersion = 0;

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
            //console.log("No node found under coords:", mouseInWorld);
            return null;
        }

        //console.log("Node found for coords:", mouseInWorld, selectedNode);

        // Check if the selected node was a slider.
        if(selectedNode.type() == parsegraph_SLIDER) {
            if(selectedNode === selectedSlider) {
                console.log("Removing");
                selectedSlider = null;
                attachedMouseListener = null;
                this._graph.scheduleRepaint();
                return null;
            }
            //console.log("Slider node!");
            selectedSlider = selectedNode;
            attachedMouseListener = sliderListener;
            sliderListener.call(this, clientX, clientY);
            this._graph.scheduleRepaint();
            return selectedNode;
        }

        // Check if the selected node has a click listener.
        if(selectedNode.hasClickListener()) {
            //console.log("Selected Node has click listener", selectedNode);
            var rv = selectedNode.click();
            if(rv !== false) {
                return selectedNode;
            }
        }

        // Check if the label was clicked.
        //console.log("Clicked");
        if(selectedNode._label && !Number.isNaN(selectedNode._labelX) && selectedNode._label.editable()) {
            //console.log("Clicked label");
            selectedNode._label.click(
                (mouseInWorld[0] - selectedNode._labelX) / selectedNode._labelScale,
                (mouseInWorld[1] - selectedNode._labelY) / selectedNode._labelScale
            );
            console.log(selectedNode._label.caretLine());
            console.log(selectedNode._label.caretPos());
            this._focusedLabel = true;
            this._focusedNode = selectedNode;
            this._graph.scheduleRepaint();
            return selectedNode;
        }
        if(selectedNode && !selectedNode.ignoresMouse()) {
            //console.log("Setting focusedNode to ", selectedNode);
            this._focusedNode = selectedNode;
            this._focusedLabel = false;
            this._graph.scheduleRepaint();
            //console.log("Selected Node has nothing", selectedNode);
            return selectedNode;
        }

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
        //console.log("Wheel event", wheel);

        // Adjust the scale.
        var numSteps = (wheel.spinY > 0 ? -1 : 1);
        if(numSteps > 0 || camera.scale() >= .01) {
            camera.zoomToPoint(Math.pow(1.1, numSteps), x, y);
        }
        this.Dispatch(false, "wheel", true);
        this.mouseChanged();
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
        var touch = null;
        for(var i = 0; i < monitoredTouches.length; ++i) {
            if(monitoredTouches[i].identifier == identifier) {
                touch = monitoredTouches.splice(i--, 1)[0];
                break;
            }
        }
        return touch;
    };

    /*
     * Touch event handling
     */

    parsegraph_addEventMethod(graph.canvas(), "touchmove", function(event) {
        if(!focused) {
            return;
        }
        event.preventDefault();
        //console.log("touchmove", event);

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches[i];
            var touchRecord = getTouchByIdentifier(touch.identifier);

            if(monitoredTouches.length == 1) {
                if(!graph.carousel().isCarouselShown()) {
                    // Move.
                    camera.adjustOrigin(
                        (touch.clientX - touchRecord.x) / camera.scale(),
                        (touch.clientY - touchRecord.y) / camera.scale()
                    );
                    this.Dispatch(false, "touchmove", true);
                }
                else {
                    this.Dispatch(graph.carousel().mouseOverCarousel(touch.clientX, touch.clientY), "mousemove carousel", false);
                }
            }
            else {
                this.Dispatch(false, "touchmove", false);
            }
            touchRecord.x = touch.clientX;
            touchRecord.y = touch.clientY;
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
            this.mouseChanged();
        }

        var realMonitoredTouches = 0;
        monitoredTouches.forEach(function(touchRec) {
            if(touchRec.touchstart) {
                realMonitoredTouches++;
            }
        }, this);
        if(realMonitoredTouches > 1) {
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
            if((dist / zoomTouchDistance) > 1 || camera.scale() >= 0.01) {
                camera.zoomToPoint(
                    dist / zoomTouchDistance,
                    zoomCenter[0],
                    zoomCenter[1]
                );
                this.Dispatch(false, "touchzoom", true);
            }
            zoomTouchDistance = dist;
        }
    }, this);

    var selectedSlider = null;
    var sliderListener = function(mouseX, mouseY) {
        // Get the current mouse position, in world space.
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(camera.worldMatrix()),
            mouseX, mouseY
        );
        var x = mouseInWorld[0];
        var y = mouseInWorld[1];

        //if(parsegraph_isVerticalNodeDirection(selectedSlider.parentDirection())) {
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
            selectedSlider.layoutWasChanged();
        //}
        if(selectedSlider.hasClickListener()) {
            selectedSlider.click();
        }
        this.Dispatch(true, "slider", false);
        lastMouseX = mouseX;
        lastMouseY = mouseY;
        this.mouseChanged();

        return true;
    };

    var touchstartTime;

    parsegraph_addEventMethod(graph.canvas(), "touchstart", function(event) {
        //console.log("touchstart", event);
        event.preventDefault();
        focused = true;

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches.item(i);
            var touchRec = {
                "identifier": touch.identifier,
                "x":touch.clientX,
                "y":touch.clientY,
                "startX":touch.clientX,
                "startY":touch.clientY,
                "touchstart":null
            };
            monitoredTouches.push(touchRec);
            lastMouseX = touch.clientX;
            lastMouseY = touch.clientY;
            this.mouseChanged();

            // Get the current mouse position, in world space.
            //alert(camera.worldMatrix());
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, true)) {
                //console.log("Carousel click processed.");
                return;
            }

            /*if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
                // A significant node was clicked.
                this.Dispatch(true, "touchstart", false);
                touchstartTime = null;
                return;
            }*/

            touchRec.touchstart = Date.now();
            touchstartTime = Date.now();
        }

        var realMonitoredTouches = 0;
        monitoredTouches.forEach(function(touchRec) {
            if(touchRec.touchstart) {
                realMonitoredTouches++;
            }
        }, this);
        if(realMonitoredTouches > 1) {
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
            this.Dispatch(false, "touchzoomstart", false);
        }
    }, this, true);

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
            var touchData = removeTouchByIdentifier(touch.identifier);
        }

        if(touchstartTime != null && Date.now() - touchstartTime < parsegraph_CLICK_DELAY_MILLIS) {
            touchendTimeout = setTimeout(afterTouchTimeout, parsegraph_CLICK_DELAY_MILLIS);
        }

        graph.carousel().clickCarousel(lastMouseX, lastMouseY, false);

        var WINDOW = 10;

        if(
            touchstartTime != null
            && Date.now() - touchstartTime < parsegraph_CLICK_DELAY_MILLIS
        ) {
            var mouseInWorld = matrixTransform2D(
                makeInverse3x3(this._camera.worldMatrix()),
                lastMouseX, lastMouseY
            );
            //alert("touchend (" + lastMouseX + ", " + lastMouseY + ")=(" + Math.round(mouseInWorld[0]) + ", " + Math.round(mouseInWorld[1]) + ") [" + this._camera.width() + ", " + this._camera.height() + "]");
            if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
                // A significant node was clicked.
                this.Dispatch(true, "touchstart", false);
                touchstartTime = null;
                return;
            }
            else {
                this.Dispatch(false, "touchstart", false);
            }
        }

        return true;
    };

    parsegraph_addEventMethod(graph.canvas(), "touchend", removeTouchListener, this);
    parsegraph_addEventMethod(graph.canvas(), "touchcancel", removeTouchListener, this);

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
        this.mouseChanged();

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
            this.mouseChanged();

            this.Dispatch(graph.carousel().mouseOverCarousel(event.clientX, event.clientY), "mousemove carousel", false);
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
        this.mouseChanged();
    }, this);

    parsegraph_addEventMethod(graph.canvas(), "mousedown", function(event) {
        //console.log("Mousedown", event);
        focused = true;
        event.preventDefault();
        graph.canvas().focus();

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        this.mouseChanged();

        mousedownX = event.clientX;
        mousedownY = event.clientY;

        if(graph.carousel().clickCarousel(event.clientX, event.clientY, true)) {
            //console.log("Carousel click processed.");
            return;
        }

        this._focusedLabel = false;
        this._focusedNode = null;
        if(this._caretPainter) {
            this._caretPainter.initBuffer(1);
        }
        if(this._spotlightPainter) {
            this._spotlightPainter.clear();
        }

        // Dragging on the canvas.
        attachedMouseListener = mouseDragListener;
        //console.log("Repainting graph");
        this.Dispatch(false, "mousedown canvas", true);

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

        if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, false)) {
            //console.log("Carousel handled event.");
            return;
        }
        if(!attachedMouseListener) {
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

            // test! 12
            if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
                // A significant node was clicked.
                //console.log("Node clicked.");
                this.Dispatch(true, "mousedown node", false);
                mousedownTime = null;
                return;
            }
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
            case "-": return "ZoomIn";
            case "_": return "ZoomIn";
            case "+": return "ZoomOut";
            case "=": return "ZoomOut";
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

    parsegraph_addEventMethod(graph.canvas(), "keydown", function(event) {
        if(event.altKey || event.metaKey) {
            //console.log("Key event had ignored modifiers");
            return;
        }
        if(event.ctrlKey && event.shiftKey) {
            return;
        }

        var keyName = getproperkeyname(event);
        if(selectedSlider) {
            if(event.key.length === 0) {
                return;
            }

            var diff = .01;
            switch(event.key) {
            case parsegraph_MOVE_BACKWARD_KEY:
                selectedSlider.setValue(Math.max(0, selectedSlider.value() - diff));
                selectedSlider.layoutWasChanged();
                this._graph.scheduleRepaint();
                return;
            case parsegraph_MOVE_FORWARD_KEY:
                selectedSlider.setValue(Math.min(1, selectedSlider.value() + diff));
                selectedSlider.layoutWasChanged();
                this._graph.scheduleRepaint();
                return;
            case "Space":
            case "Spacebar":
            case ' ':
            case parsegraph_RESET_CAMERA_KEY:
                selectedSlider.layoutWasChanged();
                attachedMouseListener = null;
                selectedSlider = null;
                this._graph.scheduleRepaint();
                return;
            }
        }
        else if(this._focusedNode && focused) {
            if(event.key.length === 0) {
                return;
            }
            if(this._focusedNode._label && event.ctrlKey) {
                if(this._focusedNode._label.ctrlKey(event.key)) {
                    //console.log("LAYOUT CHANGED");
                    this._focusedNode.layoutWasChanged();
                    this._graph.scheduleRepaint();
                    return;
                }
            }
            else if(this._focusedNode.hasKeyListener() && this._focusedNode.key(event.key) !== false
            ) {
                console.log("KEY PRESSED FOR LISTENER; LAYOUT CHANGED");
                this._focusedNode.layoutWasChanged();
                this._graph.scheduleRepaint();
                return;
            }
            else if(this._focusedNode._label && this._focusedNode._label.editable() && this._focusedNode._label.key(event.key)) {
                //console.log("LABEL ACCEPTS KEY; LAYOUT CHANGED");
                this._focusedNode.layoutWasChanged();
                this._graph.scheduleRepaint();
                return;
            }
            // Didn't move the caret, so interpret it as a key move
            // on the node itself.
            var node = this._focusedNode;
            var skipHorizontalInward = event.ctrlKey;
            var skipVerticalInward = event.ctrlKey;
            while(true) {
                switch(event.key) {
                case parsegraph_RESET_CAMERA_KEY:
                    this._focusedNode = null;
                    this._focusedLabel = false;
                    break;
                case parsegraph_MOVE_BACKWARD_KEY:
                    var neighbor = node.nodeAt(parsegraph_BACKWARD);
                    if(neighbor) {
                        this._focusedNode = neighbor;
                        this._focusedLabel = true;
                        this._graph.scheduleRepaint();
                        return;
                    }
                    neighbor = node.nodeAt(parsegraph_OUTWARD);
                    if(neighbor) {
                        this._focusedNode = neighbor;
                        this._focusedLabel = true;
                        this._graph.scheduleRepaint();
                        return;
                    }
                    break;
                case parsegraph_MOVE_FORWARD_KEY:
                    if(
                        node.hasNode(parsegraph_INWARD) &&
                        node.nodeAlignmentMode(parsegraph_INWARD) != parsegraph_ALIGN_VERTICAL &&
                        !skipHorizontalInward
                    ) {
                        this._focusedNode = node.nodeAt(parsegraph_INWARD);
                        this._focusedLabel = true;
                        this._graph.scheduleRepaint();
                        return;
                    }
                    //console.log("ArrowRight");
                    var neighbor = node.nodeAt(parsegraph_FORWARD);
                    if(neighbor) {
                        this._focusedNode = neighbor;
                        this._focusedLabel = !event.ctrlKey;
                        this._graph.scheduleRepaint();
                        return;
                    }
                    neighbor = node.nodeAt(parsegraph_OUTWARD);
                    if(neighbor) {
                        console.log("Going outward");
                        skipHorizontalInward = true;
                        node = neighbor;
                        continue;
                    }
                    // Search up the parents hoping that an inward node can be escaped.
                    while(true) {
                        if(node.isRoot()) {
                            // The focused node is not within an inward node.
                            return;
                        }
                        var pdir = node.parentDirection();
                        node = node.nodeAt(pdir);
                        if(pdir === parsegraph_OUTWARD) {
                            // Found the outward node to escape.
                            skipHorizontalInward = true;
                            break;
                        }
                    }
                    // Continue traversing using the found node.
                    continue;
                case parsegraph_MOVE_DOWNWARD_KEY:
                    neighbor = node.nodeAt(parsegraph_DOWNWARD);
                    if(neighbor) {
                        this._focusedNode = neighbor;
                        this._graph.scheduleRepaint();
                        this._focusedLabel = true;
                        return;
                    }
                    break;
                case parsegraph_MOVE_UPWARD_KEY:
                    neighbor = node.nodeAt(parsegraph_UPWARD);
                    if(neighbor) {
                        this._focusedNode = neighbor;
                        this._graph.scheduleRepaint();
                        this._focusedLabel = true;
                        return;
                    }
                    break;
                case "Backspace":
                    break;
                case "Tab":
                    var toNode = event.shiftKey ?
                        this._focusedNode._prevTabNode :
                        this._focusedNode._nextTabNode;
                    if(toNode) {
                        this._focusedNode = toNode;
                        this._graph.scheduleRepaint();
                        event.preventDefault();
                        break;
                    }
                    // Fall through otherwise.
                    break;
                case "Enter":
                    if(this._focusedNode.hasKeyListener()) {
                        if(this._focusedNode.key("Enter")) {
                            // Node handled it.
                            event.preventDefault();
                            break;
                        }
                        // Nothing handled it.
                    }
                    // Fall through.
                default:
                    return;
                }
                break;
            }

            if(this._focusedNode) {
                return;
            }
            if(event.key === parsegraph_RESET_CAMERA_KEY) {
                this._graph.scheduleRepaint();
                return;
            }
        }

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
                return;
            }
            if(graph.nodeUnderCursor()) {
                graph.nodeUnderCursor().click();
            }
            // fall through
        case parsegraph_RESET_CAMERA_KEY:
            if(graph.carousel().isCarouselShown()) {
                graph.carousel().hideCarousel();
                break;
            }
        case parsegraph_ZOOM_IN_KEY:
        case parsegraph_ZOOM_OUT_KEY:
        case parsegraph_MOVE_DOWNWARD_KEY:
        case parsegraph_MOVE_UPWARD_KEY:
        case parsegraph_MOVE_BACKWARD_KEY:
        case parsegraph_MOVE_FORWARD_KEY:
            this.Dispatch(false, "keydown", true);
            break;
        }
    }, this);

    parsegraph_addEventMethod(graph.canvas(), "keyup", function(event) {
        var keyName = getproperkeyname(event);
        //console.log(keyName);

        if(!this.keydowns[keyName]) {
            // Already processed.
            return;
        }
        delete this.keydowns[keyName];

        switch(keyName) {
        case parsegraph_CLICK_KEY:
            if(graph.carousel().clickCarousel(lastMouseX, lastMouseY, false)) {
                //console.log("Carousel processed event.");
                return;
            }
            // fall through
        case parsegraph_ZOOM_IN_KEY:
        case parsegraph_ZOOM_OUT_KEY:
        case parsegraph_RESET_CAMERA_KEY:
        case parsegraph_MOVE_DOWNWARD_KEY:
        case parsegraph_MOVE_UPWARD_KEY:
        case parsegraph_MOVE_BACKWARD_KEY:
        case parsegraph_MOVE_FORWARD_KEY:
            this.Dispatch(false, "keyup", true);
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
    return this._updateRepeatedly || this._graph.carousel().updateRepeatedly();
};

parsegraph_Input.prototype.mouseVersion = function()
{
    return this._mouseVersion;
};

parsegraph_Input.prototype.mouseChanged = function()
{
    ++this._mouseVersion;
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
        var x = this._graph.gl().drawingBufferWidth / 2;
        var y = this._graph.gl().drawingBufferHeight / 2;
        if(cam.x() === x && cam.y() === y) {
            cam.setScale(defaultScale);
        }
        else {
            x = this._graph.gl().drawingBufferWidth / (2 * defaultScale);
            y = this._graph.gl().drawingBufferHeight / (2 * defaultScale);
            cam.setOrigin(x, y);
        }
        inputChangedScene = true;
    }

    if(this.Get(parsegraph_MOVE_BACKWARD_KEY) || this.Get(parsegraph_MOVE_FORWARD_KEY) || this.Get(parsegraph_MOVE_UPWARD_KEY) || this.Get(parsegraph_MOVE_DOWNWARD_KEY)) {
        this._updateRepeatedly = true;
        var x = cam._cameraX + (this.Elapsed(parsegraph_MOVE_BACKWARD_KEY, t) * xSpeed + this.Elapsed(parsegraph_MOVE_FORWARD_KEY, t) * -xSpeed);
        var y = cam._cameraY + (this.Elapsed(parsegraph_MOVE_UPWARD_KEY, t) * ySpeed + this.Elapsed(parsegraph_MOVE_DOWNWARD_KEY, t) * -ySpeed);
        cam.setOrigin(x, y);
        inputChangedScene = true;
    }

    var lastCoords = this.lastMouseCoords();
    if(this.Get(parsegraph_ZOOM_OUT_KEY)) {
        this._updateRepeatedly = true;
        inputChangedScene = true;
        cam.zoomToPoint(Math.pow(1.1, scaleSpeed * this.Elapsed(parsegraph_ZOOM_OUT_KEY, t)),
            this._graph.gl().drawingBufferWidth / 2,
            this._graph.gl().drawingBufferHeight / 2
        );
    }
    if(this.Get(parsegraph_ZOOM_IN_KEY)) {
        //console.log("Continuing to zoom out");
        this._updateRepeatedly = true;
        inputChangedScene = true;
        if(cam.scale() >= .01) {
            cam.zoomToPoint(Math.pow(1.1, -scaleSpeed * this.Elapsed(parsegraph_ZOOM_IN_KEY, t)),
                this._graph.gl().drawingBufferWidth / 2,
                this._graph.gl().drawingBufferHeight / 2
            );
        }
    }
    //this.Dispatch(false, "update", inputChangedScene);

    //var x = cam._cameraX;
    //var y = cam._cameraY;
    //var r = this._graph.world().boundingRect();
    //x = Math.max(x, r.x() - r.width()/2);
    //x = Math.min(x, r.x() + r.width()/2);
    //y = Math.max(y, r.y() - r.height()/2);
    //y = Math.min(y, r.y() + r.height()/2);
    //console.log("BR", x, y, r);
    //cam.setOrigin(x, y);

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

parsegraph_Input.prototype.paint = function()
{
    if(!this._caretPainter) {
        this._caretPainter = new parsegraph_BlockPainter(this._graph.gl(), this._graph.shaders());
    }
    if(!this._spotlightPainter) {
        this._spotlightPainter = new parsegraph_SpotlightPainter(
            this._graph.gl(), this._graph.shaders()
        );
    }

    this._caretPainter.initBuffer(1);
    this._caretPainter.setBorderColor(this._caretColor);
    this._caretPainter.setBackgroundColor(this._caretColor);

    this._spotlightPainter.clear();

    if(!this._focusedNode) {
        return;
    }

    var label = this._focusedNode._label;
    if(!label || !label.editable() || !this._focusedLabel) {
        var s = this._focusedNode.absoluteSize();
        var srad = Math.min(
            parsegraph_FOCUSED_SPOTLIGHT_SCALE * s.width() * this._focusedNode.absoluteScale(),
            parsegraph_FOCUSED_SPOTLIGHT_SCALE * s.height() * this._focusedNode.absoluteScale()
        );
        this._spotlightPainter.drawSpotlight(
            this._focusedNode.absoluteX(),
            this._focusedNode.absoluteY(),
            srad,
            this._spotlightColor
        );
        return;
    }

    var cr = label.getCaretRect();
    if(this._focusedNode._labelX != null && this._focusedNode._labelY != null) {
        this._caretPainter.drawBlock(
            this._focusedNode._labelX + cr.x() * this._focusedNode._labelScale,
            this._focusedNode._labelY + cr.y() * this._focusedNode._labelScale,
            this._focusedNode._labelScale * cr.width(),
            this._focusedNode._labelScale * cr.height(),
            0.01,
            0.02,
            1
        );
    }
};

parsegraph_Input.prototype.focusedNode = function()
{
    return this._focusedNode;
}

parsegraph_Input.prototype.setFocusedNode = function(focusedNode)
{
    this._focusedNode = focusedNode;
    var selectedNode = this._focusedNode;
    //console.log("Clicked");
    this._focusedLabel = selectedNode && selectedNode._label && !Number.isNaN(selectedNode._labelX) && selectedNode._label.editable();
};

parsegraph_Input.prototype.focusedLabel = function()
{
    return this._focusedLabel;
}

parsegraph_Input.prototype.camera = function()
{
    return this._camera;
}

parsegraph_Input.prototype.render = function(world)
{
    var gl = this._graph.gl();
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    this._caretPainter.render(world);
    gl.enable(gl.BLEND);
    this._spotlightPainter.render(world);
}

parsegraph_Input.prototype.Dispatch = function(affectedPaint, eventSource, inputAffectedCamera)
{
    if(this.listener) {
        this.listener[0].call(this.listener[1], affectedPaint, eventSource, inputAffectedCamera);
    }
};
