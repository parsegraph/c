import {TimeoutTimer} from '../timing';
import {
  CLICK_DELAY_MILLIS,
  INPUT_LAYOUT_TIME,
  SLIDER_NUDGE,
} from './settings';
import {matrixTransform2D, makeInverse3x3} from '../gl';
import {Type, Direction, Alignment} from './Node';
import Color from './Color';
import BlockPainter from './BlockPainter';
import SpotlightPainter from './SpotlightPainter';
/* eslint-disable require-jsdoc */

const RESET_CAMERA_KEY = 'Escape';
const CLICK_KEY = 'q';

const MOVE_UPWARD_KEY = 'ArrowUp';
const MOVE_DOWNWARD_KEY = 'ArrowDown';
const MOVE_BACKWARD_KEY = 'ArrowLeft';
const MOVE_FORWARD_KEY = 'ArrowRight';
const CARET_COLOR = new Color(0, 0, 0, 0.5);
const FOCUSED_SPOTLIGHT_COLOR = new Color(1, 1, 1, 0.5);
const FOCUSED_SPOTLIGHT_SCALE = 6;

const MIN_CAMERA_SCALE = 0.00125;

// const MOVE_UPWARD_KEY = "w";
// const MOVE_DOWNWARD_KEY = "s";
// const MOVE_BACKWARD_KEY = "a";
// const MOVE_FORWARD_KEY = "d";

const ZOOM_IN_KEY = 'ZoomIn';
const ZOOM_OUT_KEY = 'ZoomOut';

export default function Input(viewport, camera) {
  this._viewport = viewport;
  this._mousedownTime = null;
  this._mouseupTimeout = new TimeoutTimer();
  this._mouseupTimeout.setListener(this.afterMouseTimeout, this);
  this._mouseupTimeout.setDelay(CLICK_DELAY_MILLIS);

  const attachedMouseListener = null;

  this._updateRepeatedly = false;

  this._caretPainter = null;
  this._caretPos = [];
  this._caretColor = CARET_COLOR;
  this._focusedNode = null;
  this._focusedLabel = false;

  this._clicksDetected = 0;

  this._spotlightPainter = null;
  this._spotlightColor = FOCUSED_SPOTLIGHT_COLOR;

  this._mouseVersion = 0;

  // A map of event.key's to a true value.
  this.keydowns = {};

  this._zoomTouchDistance = 0;

  this._selectedSlider = null;

  this.listener = null;
}

Input.prototype.adjustSelectedSlider = function(
    newVal,
    isAbsolute,
) {
  if (!this._selectedSlider) {
    return;
  }
  if (!isAbsolute) {
    newVal = this._selectedSlider.value() + newVal;
  }
  newVal = Math.max(0, Math.min(1, newVal));
  this._selectedSlider.setValue(newVal);
  this._selectedSlider.layoutWasChanged();
  this._viewport.scheduleRepaint();
  this.world().scheduleRepaint();
};

Input.prototype.setSelectedSlider = function(delta) {
  if (this._selectedSlider) {
    this._selectedSlider.layoutWasChanged();
  }
  this._selectedSlider = null;
  this.world().scheduleRepaint();
  this._viewport.scheduleRepaint();
};

Input.prototype.onKeydown = function(event) {
  const keyName = getproperkeyname(event);
  this._viewport.showInCamera(null);
  // console.log("Keydown " + selectedSlider);
  if (this._selectedSlider) {
    if (event.key.length === 0) {
      return;
    }

    const diff = SLIDER_NUDGE;
    switch (event.key) {
      case MOVE_BACKWARD_KEY:
        this.adjustSelectedSlider(-diff, false);
        return;
      case MOVE_FORWARD_KEY:
        this.adjustSelectedSlider(diff, false);
        return;
      case 'Space':
      case 'Spacebar':
      case ' ':
      case RESET_CAMERA_KEY:
        this._selectedSlider.layoutWasChanged();
        this._attachedMouseListener = null;
        this._selectedSlider = null;
        this.world().scheduleRepaint();
        this._viewport.scheduleRepaint();
        return;
    }
  } else if (this._focusedNode) {
    if (event.key.length === 0) {
      return;
    }
    if (this._focusedNode._label && event.ctrlKey) {
      if (this._focusedNode._label.ctrlKey(event.key)) {
        // console.log("LAYOUT CHANGED");
        this._focusedNode.layoutWasChanged();
        this._viewport.scheduleRepaint();
        return;
      }
    } else if (
      this._focusedNode.hasKeyListener() &&
      this._focusedNode.key(event.key) !== false
    ) {
      // console.log("KEY PRESSED FOR LISTENER; LAYOUT CHANGED");
      this._focusedNode.layoutWasChanged();
      this._viewport.scheduleRepaint();
      return;
    } else if (
      this._focusedNode._label &&
      this._focusedNode._label.editable() &&
      this._focusedNode._label.key(event.key)
    ) {
      // console.log("LABEL ACCEPTS KEY; LAYOUT CHANGED");
      this._focusedNode.layoutWasChanged();
      this._viewport.scheduleRepaint();
      return;
    }
    // Didn't move the caret, so interpret it as a key move
    // on the node itself.
    let node = this._focusedNode;
    let skipHorizontalInward = event.ctrlKey;
    const skipVerticalInward = event.ctrlKey;
    while (true) {
      switch (event.key) {
        case RESET_CAMERA_KEY:
          this._focusedNode = null;
          this._focusedLabel = false;
          break;
        case MOVE_BACKWARD_KEY:
          let neighbor = node.nodeAt(Direction.BACKWARD);
          if (neighbor) {
            this._focusedNode = neighbor;
            this._focusedLabel = true;
            this._viewport.scheduleRepaint();
            return;
          }
          neighbor = node.nodeAt(Direction.OUTWARD);
          if (neighbor) {
            this._focusedNode = neighbor;
            this._focusedLabel = true;
            this._viewport.scheduleRepaint();
            return;
          }
          break;
        case MOVE_FORWARD_KEY:
          if (
            node.hasNode(Direction.INWARD) &&
            node.nodeAlignmentMode(Direction.INWARD) != Alignment.VERTICAL &&
            !skipHorizontalInward
          ) {
            this._focusedNode = node.nodeAt(Direction.INWARD);
            this._focusedLabel = true;
            this._viewport.scheduleRepaint();
            return;
          }
          // console.log("ArrowRight");
          neighbor = node.nodeAt(Direction.FORWARD);
          if (neighbor) {
            this._focusedNode = neighbor;
            this._focusedLabel = !event.ctrlKey;
            this._viewport.scheduleRepaint();
            return;
          }
          neighbor = node.nodeAt(Direction.OUTWARD);
          if (neighbor) {
            // console.log("Going outward");
            skipHorizontalInward = true;
            node = neighbor;
            continue;
          }
          // Search up the parents hoping that an inward node can be escaped.
          while (true) {
            if (node.isRoot()) {
              // The focused node is not within an inward node.
              return;
            }
            const pdir = node.parentDirection();
            node = node.nodeAt(pdir);
            if (pdir === Direction.OUTWARD) {
              // Found the outward node to escape.
              skipHorizontalInward = true;
              break;
            }
          }
          // Continue traversing using the found node.
          continue;
        case MOVE_DOWNWARD_KEY:
          neighbor = node.nodeAt(Direction.DOWNWARD);
          if (neighbor) {
            this._focusedNode = neighbor;
            this._viewport.scheduleRepaint();
            this._focusedLabel = true;
            return;
          }
          break;
        case MOVE_UPWARD_KEY:
          neighbor = node.nodeAt(Direction.UPWARD);
          if (neighbor) {
            this._focusedNode = neighbor;
            this._viewport.scheduleRepaint();
            this._focusedLabel = true;
            return;
          }
          break;
        case 'Backspace':
          break;
        case 'Tab':
          const toNode = event.shiftKey ?
            this._focusedNode._extended.prevTabNode :
            this._focusedNode._extended.nextTabNode;
          if (toNode) {
            this._focusedNode = toNode;
            this._viewport.scheduleRepaint();
            break;
          }
          // Fall through otherwise.
          break;
        case 'Enter':
          if (this._focusedNode.hasKeyListener()) {
            if (this._focusedNode.key('Enter')) {
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

    if (this._focusedNode) {
      return;
    }
    if (event.key === RESET_CAMERA_KEY) {
      this._viewport.scheduleRepaint();
      return;
    }
  }

  if (this.keydowns[keyName]) {
    // Already processed.
    // console.log("Key event, but already processed.");
    return;
  }
  this.keydowns[keyName] = new Date();

  switch (keyName) {
    case CLICK_KEY:
      // console.log("Q key for click pressed!");
      const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x,
          event.y,
      );
      if (
        this._viewport
            .carousel()
            .clickCarousel(mouseInWorld[0], mouseInWorld[1], true)
      ) {
        return;
      }
      if (this._viewport.nodeUnderCursor()) {
        this._viewport.nodeUnderCursor().click(this._viewport);
      }
    // fall through
    case RESET_CAMERA_KEY:
      if (this._viewport.carousel().isCarouselShown()) {
        this._viewport.carousel().hideCarousel();
        break;
      }
    case ZOOM_IN_KEY:
    case ZOOM_OUT_KEY:
    case MOVE_DOWNWARD_KEY:
    case MOVE_UPWARD_KEY:
    case MOVE_BACKWARD_KEY:
    case MOVE_FORWARD_KEY:
      return true;
  }
  return false;
};

Input.prototype.onKeyup = function(event) {
  const keyName = getproperkeyname(event);
  // console.log(keyName);

  if (!this.keydowns[keyName]) {
    // Already processed.
    return;
  }
  delete this.keydowns[keyName];

  switch (keyName) {
    case CLICK_KEY:
      const mouseInWorld = matrixTransform2D(
          makeInverse3x3(this.camera().worldMatrix()),
          event.x,
          event.y,
      );
      if (
        this._viewport
            .carousel()
            .clickCarousel(mouseInWorld[0], mouseInWorld[1], false)
      ) {
        // console.log("Carousel processed event.");
        return;
      }
    // fall through
    case ZOOM_IN_KEY:
    case ZOOM_OUT_KEY:
    case RESET_CAMERA_KEY:
    case MOVE_DOWNWARD_KEY:
    case MOVE_UPWARD_KEY:
    case MOVE_BACKWARD_KEY:
    case MOVE_FORWARD_KEY:
      return true;
  }
  return false;
};

Input.prototype.onWheel = function(event) {
  // Adjust the scale.
  const numSteps = event.spinY > 0 ? -1 : 1;
  if (this._selectedSlider) {
    this.adjustSelectedSlider(numSteps * SLIDER_NUDGE, false);
    return true;
  }
  const camera = this.camera();
  if (numSteps > 0 || camera.scale() >= MIN_CAMERA_SCALE) {
    this._viewport.showInCamera(null);
    camera.zoomToPoint(Math.pow(1.1, numSteps), event.x, event.y);
  }
  this.mouseChanged();
  return true;
};

Input.prototype.camera = function() {
  return this._viewport.camera();
};

Input.prototype.onTouchzoom = function(event) {
  // Zoom.
  const dist = Math.sqrt(Math.pow(event.dx, 2) + Math.pow(event.dy, 2));
  const cam = this.camera();
  if (dist != 0 && this._zoomTouchDistance != 0) {
    this._viewport.showInCamera(null);
    cam.zoomToPoint(dist / this._zoomTouchDistance, event.x, event.y);
    this._zoomTouchDistance = dist;
    this.mouseChanged();
    return true;
  }
  this._zoomTouchDistance = dist;
  return false;
};

Input.prototype.onTouchmove = function(event) {
  if (event.multiple) {
    return false;
  }
  return this.onMousemove(event);
  this.mouseChanged();
  if (!this._viewport.carousel().isCarouselShown()) {
    // Move.
    this.camera().adjustOrigin(
        event.dx / camera.scale(),
        event.dy / camera.scale(),
    );
    return true;
  }
  return this._viewport.carousel().mouseOverCarousel(event.x, event.y);
};

Input.prototype.mouseDragListener = function(x, y, dx, dy) {
  this.mouseChanged();
  this._clickedNode = null;
  this._viewport.showInCamera(null);
  const camera = this.camera();
  camera.adjustOrigin(dx / camera.scale(), dy / camera.scale());
  return true;
};

Input.prototype.menu = function() {
  return this._viewport.menu();
};

Input.prototype.onMousedown = function(event) {
  if (this.menu().onMousedown(event.x, event.y)) {
    // console.log("Menu click processed.");
    return;
  }

  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y,
  );
  this.mouseChanged();

  if (this.carousel().clickCarousel(mouseInWorld[0], mouseInWorld[1], true)) {
    // console.log("Carousel click processed.");
    return;
  }

  this._focusedLabel = false;
  this._focusedNode = null;
  if (this._caretPainter) {
    this._caretPainter.initBuffer(1);
  }
  if (this._spotlightPainter) {
    this._spotlightPainter.clear();
  }

  // console.log("Checking for node");
  this._mousedownTime = new Date();
  if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1], true)) {
    // console.log("Node clicked.");
    return true;
  }

  if (this._selectedSlider) {
    this.setSelectedSlider(null);
  }

  this._attachedMouseListener = this.mouseDragListener;
  // console.log("Repainting graph");
  return true;
};

Input.prototype.onMousemove = function(event) {
  if (this._viewport.menu().onMousemove(event.x, event.y)) {
    return true;
  }

  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y,
  );

  if (this._viewport.carousel().isCarouselShown()) {
    this.mouseChanged();

    const overClickable = this._viewport
        .carousel()
        .mouseOverCarousel(mouseInWorld[0], mouseInWorld[1]);
    switch (overClickable) {
      case 2:
        this._viewport.window().setCursor('pointer');
        break;
      case 1:
        break;
      case 0:
        this._viewport.window().setCursor('auto');
        break;
    }

    return true;
  }

  // Moving during a mousedown i.e. dragging (or zooming)
  if (this._attachedMouseListener) {
    return this._attachedMouseListener(
        mouseInWorld[0],
        mouseInWorld[1],
        event.dx,
        event.dy,
    );
  }

  // Just a mouse moving over the (focused) canvas.
  let overClickable;
  if (!this._viewport.world().commitLayout(INPUT_LAYOUT_TIME)) {
    // console.log("Couldn't commit layout in time");
    overClickable = 1;
  } else {
    overClickable = this._viewport
        .world()
        .mouseOver(mouseInWorld[0], mouseInWorld[1]);
  }
  switch (overClickable) {
    case 2:
      this._viewport.window().setCursor('pointer');
      break;
    case 1:
      // console.log("World not ready");
      break;
    case 0:
      this._viewport.window().setCursor('auto');
      break;
  }
  this.mouseChanged();
  return true;
};

Input.prototype.onTouchstart = function(event) {
  if (event.multiple) {
    return false;
  }
  return this.onMousedown(event);

  this.mouseChanged();

  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y,
  );

  // Get the current mouse position, in world space.
  // alert(camera.worldMatrix());
  if (
    this._viewport
        .carousel()
        .clickCarousel(mouseInWorld[0], mouseInWorld[1], true)
  ) {
    // console.log("Carousel click processed.");
    return;
  }

  /* if(this.checkForNodeClick(event.x, event.y)) {
        // A significant node was clicked.
        return true;
    }*/
};

Input.prototype.sliderListener = function(x, y, dx, dy) {
  // if(isVerticalDirection(this._selectedSlider.parentDirection())) {
  const nodeWidth = this._selectedSlider.absoluteSize().width();
  let newVal;
  if (x <= this._selectedSlider.absoluteX() - nodeWidth / 2) {
    // To the left!
    newVal = 0;
  } else if (x >= this._selectedSlider.absoluteX() + nodeWidth / 2) {
    // To the right!
    newVal = 1;
  } else {
    // In between.
    // console.log("x=" + x);
    // console.log("selectedSlider.absoluteX()=" +
    //   this._selectedSlider.absoluteX());
    // console.log("PCT: " + (x - this._selectedSlider.absoluteX()));
    // console.log("In between: " + ((nodeWidth/2 +
    //   x - this._selectedSlider.absoluteX()) / nodeWidth));
    newVal = (nodeWidth / 2 + x - this._selectedSlider.absoluteX()) / nodeWidth;
  }
  this.adjustSelectedSlider(newVal, true);
  this._selectedSlider.layoutWasChanged();
  this._viewport.scheduleRepaint();
  this.world().scheduleRepaint();
  // }
  if (this._selectedSlider.hasClickListener()) {
    this._selectedSlider.click(this._viewport);
  }
  this.mouseChanged();

  return true;
};

Input.prototype.checkForNodeClick = function(x, y, onlySlider) {
  if (!this.world().commitLayout(INPUT_LAYOUT_TIME)) {
    return null;
  }
  const selectedNode = this.world().nodeUnderCoords(x, y);
  if (!selectedNode) {
    // console.log("No node found under coords:", x, y);
    return null;
  }

  // console.log("Node found for coords:", selectedNode, x, y);

  // Check if the selected node was a slider.
  if (selectedNode.type() == Type.SLIDER) {
    if (!onlySlider && selectedNode === this._selectedSlider) {
      // console.log(new Error("Removing slider listener"));
      this._selectedSlider = null;
      this._attachedMouseListener = null;
      this._viewport.scheduleRepaint();
      this.world().scheduleRepaint();
      return null;
    }
    // console.log("Slider node!");
    this._selectedSlider = selectedNode;
    this._attachedMouseListener = this.sliderListener;
    this._attachedMouseListener(x, y, 0, 0);
    this._viewport.scheduleRepaint();
    this.world().scheduleRepaint();
    return selectedNode;
  }

  // if(onlySlider) {
  // return null;
  // }

  // Check if the selected node has a click listener.
  if (selectedNode.hasClickListener()) {
    // console.log("Selected Node has click listener", selectedNode);
    const rv = selectedNode.click(this._viewport);
    if (rv !== false) {
      return selectedNode;
    }
  }

  // Check if the label was clicked.
  // console.log("Clicked");
  const selectedLabel = selectedNode._label;
  if (
    selectedLabel &&
    !Number.isNaN(selectedLabel._x) &&
    selectedLabel.editable()
  ) {
    // console.log("Clicked label");
    selectedLabel.click(
        (x - selectedLabel._x) / selectedLabel._scale,
        (y - selectedLabel._y) / selectedLabel._scale,
    );
    // console.log(selectedLabel.caretLine());
    // console.log(selectedLabel.caretPos());
    this._focusedLabel = true;
    this._focusedNode = selectedNode;
    this._viewport.scheduleRepaint();
    return selectedNode;
  }
  if (selectedNode && !selectedNode.ignoresMouse()) {
    // console.log("Setting focusedNode to ", selectedNode);
    this._focusedNode = selectedNode;
    this._focusedLabel = false;
    this._viewport.scheduleRepaint();
    // console.log("Selected Node has nothing", selectedNode);
    return selectedNode;
  } else {
    this._clickedNode = selectedNode;
  }

  return null;
};

Input.prototype.afterMouseTimeout = function() {
  // Cancel the timer if we have found a double click
  this._mouseupTimeout.cancel();

  if (this._clicksDetected >= 2) {
    // Double click ended.
    if (this._clickedNode) {
      this._viewport.showInCamera(this._clickedNode);
      this._clickedNode = null;
    }
  }

  this._clicksDetected = 0;
};

Input.prototype.onMouseup = function(event) {
  // console.log("MOUSEUP");
  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y,
  );

  if (
    this._viewport
        .carousel()
        .clickCarousel(mouseInWorld[0], mouseInWorld[1], false)
  ) {
    // console.log("Carousel handled event.");
    return true;
  }
  if (!this._attachedMouseListener) {
    // console.log("No attached listener");
    return false;
  }
  this._attachedMouseListener = null;

  if (!this._viewport.world().commitLayout(INPUT_LAYOUT_TIME)) {
    return true;
  }

  if (
    this._mousedownTime != null &&
    Date.now() - this._mousedownTime < CLICK_DELAY_MILLIS
  ) {
    ++this._clicksDetected;
    if (this._clicksDetected === 2) {
      this.afterMouseTimeout();
      return true;
    }
    this._mouseupTimeout.schedule();
  } else {
    // console.log("Click missed timeout");
  }
  return false;
};

Input.prototype.onTouchend = function(event) {
  if (event.multiple) {
    return false;
  }
  this._zoomTouchDistance = 0;
  return this.onMouseup(event);
  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.camera().worldMatrix()),
      event.x,
      event.y,
  );

  this._viewport
      .carousel()
      .clickCarousel(mouseInWorld[0], mouseInWorld[1], false);

  const WINDOW = 10;

  if (
    event.startTime != null &&
    Date.now() - event.startTime < CLICK_DELAY_MILLIS
  ) {
    // alert("touchend (" + lastMouseX + ", " + lastMouseY + ")=("
    // + Math.round(mouseInWorld[0]) + ", " + Math.round(mouseInWorld[1]) +
    // ") [" + this.camera().width() + ", " + this.camera().height() + "]");
    if (this.checkForNodeClick(mouseInWorld[0], mouseInWorld[1])) {
      // A significant node was clicked.
      return true;
    }
  }
  return false;
};

Input.prototype.SetListener = function(listener, thisArg) {
  if (!listener) {
    this.listener = null;
    return;
  }
  if (!thisArg) {
    thisArg = this;
  }
  this.listener = [listener, thisArg];
};

Input.prototype.UpdateRepeatedly = function() {
  return this._updateRepeatedly || this._viewport.carousel().updateRepeatedly();
};

Input.prototype.mouseVersion = function() {
  return this._mouseVersion;
};

Input.prototype.mouseChanged = function() {
  ++this._mouseVersion;
};

Input.prototype.resetCamera = function(complete) {
  const defaultScale = 0.25;
  const cam = this.camera();
  let x = this._viewport.gl().drawingBufferWidth / 2;
  let y = this._viewport.gl().drawingBufferHeight / 2;
  if (!complete && cam.x() === x && cam.y() === y) {
    cam.setScale(defaultScale);
  } else {
    if (complete) {
      cam.setScale(defaultScale);
    }
    x = this._viewport.width() / (2 * defaultScale);
    y = this._viewport.height() / (2 * defaultScale);
    cam.setOrigin(x, y);
  }
};

Input.prototype.Update = function(t) {
  const cam = this.camera();

  const xSpeed = 1000 / cam.scale();
  const ySpeed = 1000 / cam.scale();
  const scaleSpeed = 20;

  let needsUpdate = this._viewport.mouseVersion() !== this.mouseVersion();
  this.window().log(
      'Input.Update=' +
      (this._viewport.mouseVersion() + ' vs ' + this.mouseVersion()),
  );

  this._updateRepeatedly = false;

  if (this.Get(RESET_CAMERA_KEY) && this._viewport.gl()) {
    this.resetCamera(false);
    needsUpdate = true;
  }

  if (
    this.Get(MOVE_BACKWARD_KEY) ||
    this.Get(MOVE_FORWARD_KEY) ||
    this.Get(MOVE_UPWARD_KEY) ||
    this.Get(MOVE_DOWNWARD_KEY)
  ) {
    this._updateRepeatedly = true;
    const x =
      cam.x() +
      (this.Elapsed(MOVE_BACKWARD_KEY, t) * xSpeed +
        this.Elapsed(MOVE_FORWARD_KEY, t) * -xSpeed);
    const y =
      cam.y() +
      (this.Elapsed(MOVE_UPWARD_KEY, t) * ySpeed +
        this.Elapsed(MOVE_DOWNWARD_KEY, t) * -ySpeed);
    cam.setOrigin(x, y);
    needsUpdate = true;
  }

  if (this.Get(ZOOM_OUT_KEY)) {
    this._updateRepeatedly = true;
    needsUpdate = true;
    cam.zoomToPoint(
        Math.pow(1.1, scaleSpeed * this.Elapsed(ZOOM_OUT_KEY, t)),
        this._viewport.gl().drawingBufferWidth / 2,
        this._viewport.gl().drawingBufferHeight / 2,
    );
  }
  if (this.Get(ZOOM_IN_KEY)) {
    // console.log("Continuing to zoom out");
    this._updateRepeatedly = true;
    needsUpdate = true;
    if (cam.scale() >= MIN_CAMERA_SCALE) {
      cam.zoomToPoint(
          Math.pow(1.1, -scaleSpeed * this.Elapsed(ZOOM_IN_KEY, t)),
          this._viewport.gl().drawingBufferWidth / 2,
          this._viewport.gl().drawingBufferHeight / 2,
      );
    }
  }

  // var x = cam.x();
  // var y = cam.y();
  // var r = this._viewport.world().boundingRect();
  // x = Math.max(x, r.x() - r.width()/2);
  // x = Math.min(x, r.x() + r.width()/2);
  // y = Math.max(y, r.y() - r.height()/2);
  // y = Math.min(y, r.y() + r.height()/2);
  // console.log("BR", x, y, r);
  // cam.setOrigin(x, y);

  return needsUpdate;
};

Input.prototype.Get = function(key) {
  return this.keydowns[key] ? 1 : 0;
};

Input.prototype.Elapsed = function(key, t) {
  const v = this.keydowns[key];
  if (!v) {
    return 0;
  }
  const elapsed = (t.getTime() - v.getTime()) / 1000;
  this.keydowns[key] = t;
  return elapsed;
};

Input.prototype.window = function() {
  return this._viewport.window();
};

Input.prototype.paint = function() {
  const window = this.window();
  if (!this._caretPainter) {
    this._caretPainter = new BlockPainter(window);
  }
  if (!this._spotlightPainter) {
    this._spotlightPainter = new SpotlightPainter(window);
  }

  this._caretPainter.initBuffer(1);
  this._caretPainter.setBorderColor(this._caretColor);
  this._caretPainter.setBackgroundColor(this._caretColor);

  this._spotlightPainter.clear();

  if (!this._focusedNode) {
    return;
  }

  const label = this._focusedNode._label;
  if (!label || !label.editable() || !this._focusedLabel) {
    const s = this._focusedNode.absoluteSize();
    const srad = Math.min(
        FOCUSED_SPOTLIGHT_SCALE *
        s.width() *
        this._focusedNode.absoluteScale(),
        FOCUSED_SPOTLIGHT_SCALE *
        s.height() *
        this._focusedNode.absoluteScale(),
    );
    this._spotlightPainter.drawSpotlight(
        this._focusedNode.absoluteX(),
        this._focusedNode.absoluteY(),
        srad,
        this._spotlightColor,
    );
    return;
  }

  const cr = label.getCaretRect();
  if (label._x != null && label._y != null) {
    this._caretPainter.drawBlock(
        label._x + cr.x() * label._scale,
        label._y + cr.y() * label._scale,
        label._scale * cr.width(),
        label._scale * cr.height(),
        0.01,
        0.02,
        1,
    );
  }
};

Input.prototype.focusedNode = function() {
  return this._focusedNode;
};

Input.prototype.setFocusedNode = function(focusedNode) {
  this._focusedNode = focusedNode;
  const selectedNode = this._focusedNode;
  // console.log("Clicked");
  this._focusedLabel =
    selectedNode &&
    selectedNode._label &&
    !Number.isNaN(selectedNode._label._x) &&
    selectedNode._label.editable();
};

Input.prototype.focusedLabel = function() {
  return this._focusedLabel;
};

Input.prototype.carousel = function() {
  return this._viewport.carousel();
};

Input.prototype.menu = function() {
  return this._viewport.menu();
};

Input.prototype.world = function() {
  return this._viewport.world();
};

Input.prototype.contextChanged = function(isLost) {
  if (this._caretPainter) {
    this._caretPainter.contextChanged(isLost);
  }
  if (this._spotlightPainter) {
    this._spotlightPainter.contextChanged(isLost);
  }
};

Input.prototype.render = function(world, scale) {
  const gl = this._viewport.gl();
  if (this._caretPainter) {
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    this._caretPainter.render(world, scale);
  }
  if (this._spotlightPainter) {
    gl.enable(gl.BLEND);
    this._spotlightPainter.render(world, scale);
  }
};

export default function getproperkeyname(event) {
  let keyName = event.key;
  // console.log(keyName + " " + event.keyCode);
  switch (keyName) {
    case 'Enter':
      return keyName;
    case 'Escape':
      return keyName;
    case 'ArrowLeft':
      return keyName;
    case 'ArrowUp':
      return keyName;
    case 'ArrowRight':
      return keyName;
    case 'ArrowDown':
      return keyName;
    case '-':
      return 'ZoomIn';
    case '_':
      return 'ZoomIn';
    case '+':
      return 'ZoomOut';
    case '=':
      return 'ZoomOut';
  }
  switch (event.keyCode) {
    case 13:
      keyName = 'Enter';
      break;
    case 27:
      keyName = 'Escape';
      break;
    case 37:
      keyName = 'ArrowLeft';
      break;
    case 38:
      keyName = 'ArrowUp';
      break;
    case 39:
      keyName = 'ArrowRight';
      break;
    case 40:
      keyName = 'ArrowDown';
      break;
  }
  return keyName;
}
