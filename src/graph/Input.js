import {
    TimeoutTimer
} from '../timing';
import {
    parsegraph_CLICK_DELAY_MILLIS,
    parsegraph_INPUT_LAYOUT_TIME,
    parsegraph_SLIDER_NUDGE
} from './settings';
import {
    matrixTransform2D,
    makeInverse3x3
} from '../gl';
import {
    Type,
    Direction,
    Alignment
} from './Node';
import Color from './Color';
import BlockPainter from './BlockPainter';
import parsegraph_SpotlightPainter from './SpotlightPainter';

const parsegraph_RESET_CAMERA_KEY = "Escape";
const parsegraph_CLICK_KEY = "q";

const parsegraph_MOVE_UPWARD_KEY = "ArrowUp";
const parsegraph_MOVE_DOWNWARD_KEY = "ArrowDown";
const parsegraph_MOVE_BACKWARD_KEY = "ArrowLeft";
const parsegraph_MOVE_FORWARD_KEY = "ArrowRight";
const parsegraph_CARET_COLOR = new Color(0, 0, 0, .5);
const parsegraph_FOCUSED_SPOTLIGHT_COLOR = new Color(1, 1, 1, .5);
const parsegraph_FOCUSED_SPOTLIGHT_SCALE = 6;

const parsegraph_MIN_CAMERA_SCALE = .00125;

//const parsegraph_MOVE_UPWARD_KEY = "w";
//const parsegraph_MOVE_DOWNWARD_KEY = "s";
//const parsegraph_MOVE_BACKWARD_KEY = "a";
//const parsegraph_MOVE_FORWARD_KEY = "d";

const parsegraph_ZOOM_IN_KEY = "ZoomIn";
const parsegraph_ZOOM_OUT_KEY = "ZoomOut";

export default function parsegraph_Input(viewport, camera)
{
    this._viewport = viewport;
    this._mousedownTime = null;
    this._mouseupTimeout = new TimeoutTimer();
    this._mouseupTimeout.setListener(this.afterMouseTimeout, this);
    this._mouseupTimeout.setDelay(parsegraph_CLICK_DELAY_MILLIS);

    var attachedMouseListener = null;

    this._updateRepeatedly = false;

    this._caretPainter = null;
    this._caretPos = [];
    this._caretColor = parsegraph_CARET_COLOR;
    this._focusedNode = null;
    this._focusedLabel = false;

    this._clicksDetected = 0;

    this._spotlightPainter = null;
    this._spotlightColor = parsegraph_FOCUSED_SPOTLIGHT_COLOR;

    this._mouseVersion = 0;

    // A map of event.key's to a true value.
    this.keydowns = {};

    this._zoomTouchDistance = 0;

    this._selectedSlider = null;

    this.listener = null;
};

parsegraph_Input.prototype.adjustSelectedSlider = function(newVal, isAbsolute)
{
    if(!this._selectedSlider) {
        return;
    }
    if(!isAbsolute) {
        newVal = this._selectedSlider.value() + newVal;
    }
    newVal = Math.max(0, Math.min(1, newVal));
    this._selectedSlider.setValue(newVal);
    this._selectedSlider.layoutWasChanged();
    this._viewport.scheduleRepaint();
    this.world().scheduleRepaint();
};

parsegraph_Input.prototype.setSelectedSlider = function(delta)
{
    if(this._selectedSlider) {
        this._selectedSlider.layoutWasChanged();
    }
    this._selectedSlider = null;
    this.world().scheduleRepaint();
    this._viewport.scheduleRepaint();
};

parsegraph_Input.prototype.onKeydown = function(event)
{
    var keyName = parsegraph_getproperkeyname(event);
    this._viewport.showInCamera(null);
    //console.log("Keydown " + selectedSlider);
    if(this._selectedSlider) {
        if(event.key.length === 0) {
            return;
        }

        var diff = parsegraph_SLIDER_NUDGE;
        switch(event.key) {
        case parsegraph_MOVE_BACKWARD_KEY:
            this.adjustSelectedSlider(-diff, false);
            return;
        case parsegraph_MOVE_FORWARD_KEY:
            this.adjustSelectedSlider(diff, false);
            return;
        case "Space":
        case "Spacebar":
        case ' ':
        case parsegraph_RESET_CAMERA_KEY:
            this._selectedSlider.layoutWasChanged();
            this._attachedMouseListener = null;
            this._selectedSlider = null;
            this.world().scheduleRepaint();
            this._viewport.scheduleRepaint();
            return;
        }
    }
    else if(this._focusedNode) {
        if(event.key.length === 0) {
            return;
        }
        if(this._focusedNode._label && event.ctrlKey) {
            if(this._focusedNode._label.ctrlKey(event.key)) {
                //console.log("LAYOUT CHANGED");
                this._focusedNode.layoutWasChanged();
                this._viewport.scheduleRepaint();
                return;
            }
        }
        else if(this._focusedNode.hasKeyListener() && this._focusedNode.key(event.key) !== false
        ) {
            //console.log("KEY PRESSED FOR LISTENER; LAYOUT CHANGED");
            this._focusedNode.layoutWasChanged();
            this._viewport.scheduleRepaint();
            return;
        }
        else if(this._focusedNode._label && this._focusedNode._label.editable() && this._focusedNode._label.key(event.key)) {
            //console.log("LABEL ACCEPTS KEY; LAYOUT CHANGED");
            this._focusedNode.layoutWasChanged();
            this._viewport.scheduleRepaint();
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
                var neighbor = node.nodeAt(Direction.BACKWARD);
                if(neighbor) {
                    this._focusedNode = neighbor;
                    this._focusedLabel = true;
                    this._viewport.scheduleRepaint();
                    return;
                }
                neighbor = node.nodeAt(Direction.OUTWARD);
                if(neighbor) {
                    this._focusedNode = neighbor;
                    this._focusedLabel = true;
                    this._viewport.scheduleRepaint();
                    return;
                }
                break;
            case parsegraph_MOVE_FORWARD_KEY:
                if(
                    node.hasNode(Direction.INWARD) &&
                    node.nodeAlignmentMode(Direction.INWARD) != Alignment.VERTICAL &&
                    !skipHorizontalInward
                ) {
                    this._focusedNode = node.nodeAt(Direction.INWARD);
                    this._focusedLabel = true;
                    this._viewport.scheduleRepaint();
                    return;
                }
                //console.log("ArrowRight");
                var neighbor = node.nodeAt(Direction.FORWARD);
                if(neighbor) {
                    this._focusedNode = neighbor;
                    this._focusedLabel = !event.ctrlKey;
                    this._viewport.scheduleRepaint();
                    return;
                }
                neighbor = node.nodeAt(Direction.OUTWARD);
                if(neighbor) {
                    //console.log("Going outward");
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
                    if(pdir === Direction.OUTWARD) {
                        // Found the outward node to escape.
                        skipHorizontalInward = true;
                        break;
                    }
                }
                // Continue traversing using the found node.
                continue;
            case parsegraph_MOVE_DOWNWARD_KEY:
                neighbor = node.nodeAt(Direction.DOWNWARD);
                if(neighbor) {
                    this._focusedNode = neighbor;
                    this._viewport.scheduleRepaint();
                    this._focusedLabel = true;
                    return;
                }
                break;
            case parsegraph_MOVE_UPWARD_KEY:
                neighbor = node.nodeAt(Direction.UPWARD);
                if(neighbor) {
                    this._focusedNode = neighbor;
                    this._viewport.scheduleRepaint();
                    this._focusedLabel = true;
                    return;
                }
                break;
            case "Backspace":
                break;
            case "Tab":
                var toNode = event.shiftKey ?
                    this._focusedNode._extended.prevTabNode :
                    this._focusedNode._extended.nextTabNode;
                if(toNode) {
                    this._focusedNode = toNode;
                    this._viewport.scheduleRepaint();
                    break;
                }
                // Fall through otherwise.
                break;
            case "Enter":
                if(this._focusedNode.hasKeyListener()) {
                    if(this._focusedNode.key("Enter")) {
                        // Node handled it.
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
            this._viewport.scheduleRepaint();
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
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(this.camera().worldMatrix()),
            event.x, event.y
        );
        if(this._viewport.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)) {
            return;
        }
        if(this._viewport.nodeUnderCursor()) {
            this._viewport.nodeUnderCursor().click(this._viewport);
        }
        // fall through
    case parsegraph_RESET_CAMERA_KEY:
        if(this._viewport.carousel().isCarouselShown()) {
            this._viewport.carousel().hideCarousel();
            break;
        }
    case parsegraph_ZOOM_IN_KEY:
    case parsegraph_ZOOM_OUT_KEY:
    case parsegraph_MOVE_DOWNWARD_KEY:
    case parsegraph_MOVE_UPWARD_KEY:
    case parsegraph_MOVE_BACKWARD_KEY:
    case parsegraph_MOVE_FORWARD_KEY:
        return true;
    }
    return false;
};

parsegraph_Input.prototype.onKeyup = function(event)
{
    var keyName = parsegraph_getproperkeyname(event);
    //console.log(keyName);

    if(!this.keydowns[keyName]) {
        // Already processed.
        return;
    }
    delete this.keydowns[keyName];

    switch(keyName) {
    case parsegraph_CLICK_KEY:
        var mouseInWorld = matrixTransform2D(
            makeInverse3x3(this.camera().worldMatrix()),
            event.x, event.y
        );
        if(this._viewport.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false)) {
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
        return true;
    }
    return false;
};

parsegraph_Input.prototype.onWheel = function(event)
{
    // Adjust the scale.
    var numSteps = (event.spinY > 0 ? -1 : 1);
    if(this._selectedSlider) {
        this.adjustSelectedSlider(numSteps*parsegraph_SLIDER_NUDGE, false);
        return true;
    }
    var camera = this.camera();
    if(numSteps > 0 || camera.scale() >= parsegraph_MIN_CAMERA_SCALE) {
        this._viewport.showInCamera(null);
        camera.zoomToPoint(Math.pow(1.1, numSteps), event.x, event.y);
    }
    this.mouseChanged();
    return true;
};

parsegraph_Input.prototype.camera = function()
{
    return this._viewport.camera();
};

parsegraph_Input.prototype.onTouchzoom = function(event)
{
    // Zoom.
    var dist = Math.sqrt(Math.pow(event.dx, 2) + Math.pow(event.dy, 2));
    var cam = this.camera();
    if(dist != 0 && this._zoomTouchDistance != 0) {
        this._viewport.showInCamera(null);
        cam.zoomToPoint(
            dist / this._zoomTouchDistance,
            event.x, event.y
        );
        this._zoomTouchDistance = dist;
        this.mouseChanged();
        return true;
    }
    this._zoomTouchDistance = dist;
    return false;
};

parsegraph_Input.prototype.onTouchmove = function(event)
{
    if(event.multiple) {
        return false;
    }
    return this.onMousemove(event);
    this.mouseChanged();
    if(!this._viewport.carousel().isCarouselShown()) {
        // Move.
        this.camera().adjustOrigin(
            event.dx / camera.scale(),
            event.dy / camera.scale()
        );
        return true;
    }
    return this._viewport.carousel().mouseOverCarousel(event.x, event.y);
};

parsegraph_Input.prototype.mouseDragListener = function(x, y, dx, dy)
{
    this.mouseChanged();
    this._clickedNode = null;
    this._viewport.showInCamera(null);
    var camera = this.camera();
    camera.adjustOrigin(
        dx / camera.scale(),
        dy / camera.scale()
    );
    return true;
};

parsegraph_Input.prototype.menu = function()
{
    return this._viewport.menu();
};

parsegraph_Input.prototype.onMousedown = function(event)
{
    if(this.menu().onMousedown(event.x, event.y)) {
        //console.log("Menu click processed.");
        return;
    }

    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        event.x, event.y
    );
    this.mouseChanged();

    if(this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)) {
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

    //console.log("Checking for node");
    this._mousedownTime = new Date();
    if(this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1], true)) {
        //console.log("Node clicked.");
        return true;
    }

    if(this._selectedSlider) {
        this.setSelectedSlider(null);
    }

    this._attachedMouseListener = this.mouseDragListener;
    //console.log("Repainting graph");
    return true;
};

parsegraph_Input.prototype.onMousemove = function(event)
{
    if(this._viewport.menu().onMousemove(event.x, event.y)) {
        return true;
    }

    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        event.x, event.y
    );

    if(this._viewport.carousel().isCarouselShown()) {
        this.mouseChanged();

        var overClickable = this._viewport.carousel().mouseOverCarousel(mouseInWorld[0], mouseInWorld[1]);
        switch(overClickable) {
        case 2:
            this._viewport.window().setCursor("pointer");
            break;
        case 1:
            break;
        case 0:
            this._viewport.window().setCursor("auto");
            break;
        }

        return true;
    }

    // Moving during a mousedown i.e. dragging (or zooming)
    if(this._attachedMouseListener) {
        return this._attachedMouseListener(mouseInWorld[0], mouseInWorld[1], event.dx, event.dy);
    }

    // Just a mouse moving over the (focused) canvas.
    var overClickable;
    if(!this._viewport.world().commitLayout(parsegraph_INPUT_LAYOUT_TIME)) {
        //console.log("Couldn't commit layout in time");
        overClickable = 1;
    }
    else {
        overClickable = this._viewport.world().mouseOver(mouseInWorld[0], mouseInWorld[1]);
    }
    switch(overClickable) {
    case 2:
        this._viewport.window().setCursor("pointer");
        break;
    case 1:
        //console.log("World not ready");
        break;
    case 0:
        this._viewport.window().setCursor("auto");
        break;
    }
    this.mouseChanged();
    return true;
};

parsegraph_Input.prototype.onTouchstart = function(event)
{
    if(event.multiple) {
        return false;
    }
    return this.onMousedown(event);

    this.mouseChanged();

    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        event.x, event.y
    );

    // Get the current mouse position, in world space.
    //alert(camera.worldMatrix());
    if(this._viewport.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)) {
        //console.log("Carousel click processed.");
        return;
    }

    /*if(this.checkForNodeClick(event.x, event.y)) {
        // A significant node was clicked.
        return true;
    }*/
};

parsegraph_Input.prototype.sliderListener = function(x, y, dx, dy)
{
    //if(isVerticalDirection(this._selectedSlider.parentDirection())) {
        var nodeWidth = this._selectedSlider.absoluteSize().width();
        var newVal;
        if(x <= this._selectedSlider.absoluteX() - nodeWidth / 2) {
            // To the left!
            newVal = 0;
        }
        else if(x >= this._selectedSlider.absoluteX() + nodeWidth / 2) {
            // To the right!
            newVal = 1;
        }
        else {
            // In between.
            //console.log("x=" + x);
            //console.log("selectedSlider.absoluteX()=" + this._selectedSlider.absoluteX());
            //console.log("PCT: " + (x - this._selectedSlider.absoluteX()));
            //console.log("In between: " + ((nodeWidth/2 + x - this._selectedSlider.absoluteX()) / nodeWidth));
            newVal = (nodeWidth/2 + x - this._selectedSlider.absoluteX()) / nodeWidth;
        }
        this.adjustSelectedSlider(newVal, true);
        this._selectedSlider.layoutWasChanged();
        this._viewport.scheduleRepaint();
        this.world().scheduleRepaint();
    //}
    if(this._selectedSlider.hasClickListener()) {
        this._selectedSlider.click(this._viewport);
    }
    this.mouseChanged();

    return true;
};

parsegraph_Input.prototype.checkForNodeClick = function(x, y, onlySlider)
{
    if(!this.world().commitLayout(parsegraph_INPUT_LAYOUT_TIME)) {
        return null;
    }
    var selectedNode = this.world().nodeUnderCoords(x, y);
    if(!selectedNode) {
        //console.log("No node found under coords:", x, y);
        return null;
    }

    //console.log("Node found for coords:", selectedNode, x, y);

    // Check if the selected node was a slider.
    if(selectedNode.type() == Type.SLIDER) {
        if(!onlySlider && selectedNode === this._selectedSlider) {
            //console.log(new Error("Removing slider listener"));
            this._selectedSlider = null;
            this._attachedMouseListener = null;
            this._viewport.scheduleRepaint();
            this.world().scheduleRepaint();
            return null;
        }
        //console.log("Slider node!");
        this._selectedSlider = selectedNode;
        this._attachedMouseListener = this.sliderListener;
        this._attachedMouseListener(x, y, 0, 0);
        this._viewport.scheduleRepaint();
        this.world().scheduleRepaint();
        return selectedNode;
    }

    //if(onlySlider) {
        //return null;
    //}

    // Check if the selected node has a click listener.
    if(selectedNode.hasClickListener()) {
        //console.log("Selected Node has click listener", selectedNode);
        var rv = selectedNode.click(this._viewport);
        if(rv !== false) {
            return selectedNode;
        }
    }

    // Check if the label was clicked.
    //console.log("Clicked");
    var selectedLabel = selectedNode._label;
    if(selectedLabel && !Number.isNaN(selectedLabel._x) && selectedLabel.editable()) {
        //console.log("Clicked label");
        selectedLabel.click(
            (x - selectedLabel._x) / selectedLabel._scale,
            (y - selectedLabel._y) / selectedLabel._scale
        );
        //console.log(selectedLabel.caretLine());
        //console.log(selectedLabel.caretPos());
        this._focusedLabel = true;
        this._focusedNode = selectedNode;
        this._viewport.scheduleRepaint();
        return selectedNode;
    }
    if(selectedNode && !selectedNode.ignoresMouse()) {
        //console.log("Setting focusedNode to ", selectedNode);
        this._focusedNode = selectedNode;
        this._focusedLabel = false;
        this._viewport.scheduleRepaint();
        //console.log("Selected Node has nothing", selectedNode);
        return selectedNode;
    }
    else {
        this._clickedNode = selectedNode;
    }

    return null;
};

parsegraph_Input.prototype.afterMouseTimeout = function()
{
    // Cancel the timer if we have found a double click
    this._mouseupTimeout.cancel();

    if(this._clicksDetected >= 2) {
        // Double click ended.
        if(this._clickedNode) {
            this._viewport.showInCamera(this._clickedNode);
            this._clickedNode = null;
        }
    }

    this._clicksDetected = 0;
};

parsegraph_Input.prototype.onMouseup = function(event)
{
    //console.log("MOUSEUP");
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        event.x, event.y
    );

    if(this._viewport.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false)) {
        //console.log("Carousel handled event.");
        return true;
    }
    if(!this._attachedMouseListener) {
        //console.log("No attached listener");
        return false;
    }
    this._attachedMouseListener = null;

    if(!this._viewport.world().commitLayout(parsegraph_INPUT_LAYOUT_TIME)) {
        return true;
    }

    if(
        this._mousedownTime != null
        && Date.now() - this._mousedownTime < parsegraph_CLICK_DELAY_MILLIS
    ) {
        ++this._clicksDetected;
        if(this._clicksDetected === 2) {
            this.afterMouseTimeout();
            return true;
        }
        this._mouseupTimeout.schedule();
    }
    else {
        //console.log("Click missed timeout");
    }
    return false;
};

parsegraph_Input.prototype.onTouchend = function(event)
{
    if(event.multiple) {
        return false;
    }
    this._zoomTouchDistance = 0;
    return this.onMouseup(event);
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        event.x, event.y
    );

    this._viewport.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], false);

    var WINDOW = 10;

    if(
        event.startTime != null && Date.now() - event.startTime < parsegraph_CLICK_DELAY_MILLIS
    ) {
        //alert("touchend (" + lastMouseX + ", " + lastMouseY + ")=(" + Math.round(mouseInWorld[0]) + ", " + Math.round(mouseInWorld[1]) + ") [" + this.camera().width() + ", " + this.camera().height() + "]");
        if(this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1])) {
            // A significant node was clicked.
            return true;
        }
    }
    return false;
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
    return this._updateRepeatedly || this._viewport.carousel().updateRepeatedly();
};

parsegraph_Input.prototype.mouseVersion = function()
{
    return this._mouseVersion;
};

parsegraph_Input.prototype.mouseChanged = function()
{
    ++this._mouseVersion;
};

parsegraph_Input.prototype.resetCamera = function(complete)
{
    var defaultScale = .25;
    var cam = this.camera();
    var x = this._viewport.gl().drawingBufferWidth / 2;
    var y = this._viewport.gl().drawingBufferHeight / 2;
    if(!complete && cam.x() === x && cam.y() === y) {
        cam.setScale(defaultScale);
    }
    else {
        if(complete) {
            cam.setScale(defaultScale);
        }
        x = this._viewport.width() / (2 * defaultScale);
        y = this._viewport.height() / (2 * defaultScale);
        cam.setOrigin(x, y);
    }
};

parsegraph_Input.prototype.Update = function(t)
{
    var cam = this.camera();

    var xSpeed = 1000 / cam.scale();
    var ySpeed = 1000 / cam.scale();
    var scaleSpeed = 20;

    var needsUpdate = this._viewport.mouseVersion() !== this.mouseVersion();
    this.window().log("Input.Update="+(this._viewport.mouseVersion() +" vs " + this.mouseVersion()));

    this._updateRepeatedly = false;

    if(this.Get(parsegraph_RESET_CAMERA_KEY) && this._viewport.gl()) {
        this.resetCamera(false);
        needsUpdate = true;
    }

    if(this.Get(parsegraph_MOVE_BACKWARD_KEY) || this.Get(parsegraph_MOVE_FORWARD_KEY) || this.Get(parsegraph_MOVE_UPWARD_KEY) || this.Get(parsegraph_MOVE_DOWNWARD_KEY)) {
        this._updateRepeatedly = true;
        var x = cam.x() + (this.Elapsed(parsegraph_MOVE_BACKWARD_KEY, t) * xSpeed + this.Elapsed(parsegraph_MOVE_FORWARD_KEY, t) * -xSpeed);
        var y = cam.y() + (this.Elapsed(parsegraph_MOVE_UPWARD_KEY, t) * ySpeed + this.Elapsed(parsegraph_MOVE_DOWNWARD_KEY, t) * -ySpeed);
        cam.setOrigin(x, y);
        needsUpdate = true;
    }

    if(this.Get(parsegraph_ZOOM_OUT_KEY)) {
        this._updateRepeatedly = true;
        needsUpdate = true;
        cam.zoomToPoint(Math.pow(1.1, scaleSpeed * this.Elapsed(parsegraph_ZOOM_OUT_KEY, t)),
            this._viewport.gl().drawingBufferWidth / 2,
            this._viewport.gl().drawingBufferHeight / 2
        );
    }
    if(this.Get(parsegraph_ZOOM_IN_KEY)) {
        //console.log("Continuing to zoom out");
        this._updateRepeatedly = true;
        needsUpdate = true;
        if(cam.scale() >= parsegraph_MIN_CAMERA_SCALE) {
            cam.zoomToPoint(Math.pow(1.1, -scaleSpeed * this.Elapsed(parsegraph_ZOOM_IN_KEY, t)),
                this._viewport.gl().drawingBufferWidth / 2,
                this._viewport.gl().drawingBufferHeight / 2
            );
        }
    }

    //var x = cam.x();
    //var y = cam.y();
    //var r = this._viewport.world().boundingRect();
    //x = Math.max(x, r.x() - r.width()/2);
    //x = Math.min(x, r.x() + r.width()/2);
    //y = Math.max(y, r.y() - r.height()/2);
    //y = Math.min(y, r.y() + r.height()/2);
    //console.log("BR", x, y, r);
    //cam.setOrigin(x, y);

    return needsUpdate;
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

parsegraph_Input.prototype.window = function()
{
    return this._viewport.window();
};

parsegraph_Input.prototype.paint = function()
{
    var window = this.window();
    if(!this._caretPainter) {
        this._caretPainter = new BlockPainter(window);
    }
    if(!this._spotlightPainter) {
        this._spotlightPainter = new parsegraph_SpotlightPainter(window);
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
    if(label._x != null && label._y != null) {
        this._caretPainter.drawBlock(
            label._x + cr.x() * label._scale,
            label._y + cr.y() * label._scale,
            label._scale * cr.width(),
            label._scale * cr.height(),
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
    this._focusedLabel = selectedNode && selectedNode._label && !Number.isNaN(selectedNode._label._x) && selectedNode._label.editable();
};

parsegraph_Input.prototype.focusedLabel = function()
{
    return this._focusedLabel;
}

parsegraph_Input.prototype.carousel = function()
{
    return this._viewport.carousel();
}

parsegraph_Input.prototype.menu = function()
{
    return this._viewport.menu();
}

parsegraph_Input.prototype.world = function()
{
    return this._viewport.world();
}

parsegraph_Input.prototype.contextChanged = function(isLost)
{
    if(this._caretPainter) {
        this._caretPainter.contextChanged(isLost);
    }
    if(this._spotlightPainter) {
        this._spotlightPainter.contextChanged(isLost);
    }
};

parsegraph_Input.prototype.render = function(world, scale)
{
    var gl = this._viewport.gl();
    if(this._caretPainter) {
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        this._caretPainter.render(world, scale);
    }
    if(this._spotlightPainter) {
        gl.enable(gl.BLEND);
        this._spotlightPainter.render(world, scale);
    }
}

function parsegraph_getproperkeyname(event)
{
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
