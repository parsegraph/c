import parsegraph_Component from './Component';
import parsegraph_Camera from './Camera';
import parsegraph_Carousel from './Carousel';
import parsegraph_Input from './Input';
import parsegraph_BurgerMenu from './BurgerMenu';

/**
 * TODO Add gridX and gridY camera listeners, with support for loading from an
 * infinite grid of cells.
 *
 * TODO Add camera-movement listener, to let nodes watch for camera movement,
 * and thus let nodes detect when they are approaching critical screen
 * boundaries:
 *
 * enteringScreen leavingScreen
 *
 * Node distance is radially calculated (using the viewport's diagonal) from
 * the camera's center, adjusted by some constant.
 *
 * hysteresis factor gives the +/- from some preset large distance (probably
 * some hundreds of bud radiuses). Ignoring hysteresis, then when the camera
 * moves, the node's relative position may be changed. This distance is
 * recalculated, and if it is above some threshold plus hysteresis constant,
 * and the node's state was 'near', then the node's leavingScreen is called,
 * and the node's state is set to 'far'.
 *
 * Likewise, if the distance is lower than the same threshold minus hysteresis
 * constant, and the node's state was 'far', then the node's enteringScreen is
 * called, and the node's state is set to 'near'.
 *
 * This distance is checked when the node is painted and also when the camera
 * is moved.
 *
 * TODO Figure out how changing the grid size might change things.
 *
 * Grid updates based only on camera movement. Updates are reported in terms of
  * cells made visible in either direction.  The number of potentially visible
  * grid cells is determined for each axis using the camera's axis size
  * adjusted by some constant.
 */
let parsegraph_Viewport_COUNT = 0;
const parsegraph_Viewport_TYPE = 'parsegraph_Viewport';
export default function parsegraph_Viewport(window, world) {
  if (!window) {
    throw new Error('A window must be provided');
  }
  this._id = ++parsegraph_Viewport_COUNT;
  // Construct the graph.
  this._component = new parsegraph_Component(this, parsegraph_Viewport_TYPE);
  this._window = window;
  this._world = world;
  this._camera = new parsegraph_Camera();
  this._carousel = new parsegraph_Carousel(this);
  this._input = new parsegraph_Input(this);

  this._menu = null;
  this._menu = new parsegraph_BurgerMenu(this);
  // this._piano = new parsegraph_AudioKeyboard(this._camera);
  this._renderedMouse = -1;
  this._needsRender = true;

  this._component.setPainter(this.paint, this);
  this._component.setRenderer(this.render, this);
  this._component.setEventHandler(this.handleEvent, this);
  this._component.setContextChanged(this.contextChanged, this);
  this._component.setSerializer(this.serialize, this);
}

parsegraph_Viewport.prototype.id = function() {
  return this._id;
};

parsegraph_Viewport.prototype.handleEvent = function(eventType, eventData) {
  if (eventType === 'blur') {
    this._menu.closeMenu();
    return true;
  }
  if (eventType === 'wheel') {
    return this._input.onWheel(eventData);
  }
  if (eventType === 'touchmove') {
    return this._input.onTouchmove(eventData);
  }
  if (eventType === 'touchzoom') {
    return this._input.onTouchzoom(eventData);
  }
  if (eventType === 'touchstart') {
    this._nodeShown = null;
    return this._input.onTouchstart(eventData);
  }
  if (eventType === 'touchend') {
    return this._input.onTouchend(eventData);
  }
  if (eventType === 'mousedown') {
    return this._input.onMousedown(eventData);
  }
  if (eventType === 'mousemove') {
    return this._input.onMousemove(eventData);
  }
  if (eventType === 'mouseup') {
    return this._input.onMouseup(eventData);
  }
  if (eventType === 'keydown') {
    return this._input.onKeydown(eventData);
  }
  if (eventType === 'keyup') {
    return this._input.onKeyup(eventData);
  }
  if (eventType === 'tick') {
    return this._input.Update(eventData);
  }
  console.log('Unhandled event type: ' + eventType);
};

parsegraph_Viewport.prototype.serialize = function() {
  return {
    componentType: parsegraph_Viewport_TYPE,
    camera: this._camera.toJSON(),
  };
};

parsegraph_Viewport.prototype.component = function() {
  return this._component;
};

parsegraph_Viewport.prototype.width = function() {
  return this._window.layout(this.component()).width();
};

parsegraph_Viewport.prototype.x = function() {
  return this._window.layout(this.component()).x();
};

parsegraph_Viewport.prototype.y = function() {
  return this._window.layout(this.component()).y();
};

parsegraph_Viewport.prototype.height = function() {
  return this._window.layout(this.component()).height();
};

parsegraph_Viewport.prototype.setLayout = function(layout) {
  this._component.setLayout(layout);
};

parsegraph_Viewport.prototype.layout = function(window, outSize) {
  return this._component.layout(window, outSize);
};

parsegraph_Viewport.prototype.shaders = function() {
  return this.window().shaders();
};

parsegraph_Viewport.prototype.window = function() {
  return this._window;
};

parsegraph_Viewport.prototype.gl = function() {
  return this._window.gl();
};

parsegraph_Viewport.prototype.contextChanged = function(isLost) {
  const window = this.window();
  this._world.contextChanged(isLost, window);
  this._carousel.contextChanged(isLost);
  this._input.contextChanged(isLost);
  this._menu.contextChanged(isLost);
};

parsegraph_Viewport.prototype.world = function() {
  return this._world;
};

parsegraph_Viewport.prototype.carousel = function() {
  return this._carousel;
};

parsegraph_Viewport.prototype.menu = function() {
  return this._menu;
};

parsegraph_Viewport.prototype.camera = function() {
  return this._camera;
};

parsegraph_Viewport.prototype.input = function() {
  return this._input;
};

parsegraph_Viewport.prototype.dispose = function() {
  this._menu.dispose();
};

parsegraph_Viewport.prototype.scheduleRepaint = function() {
  // console.log("Viewport is scheduling repaint");
  this._component.scheduleUpdate();
  this._needsRepaint = true;
  this._needsRender = true;
};

parsegraph_Viewport.prototype.scheduleRender = function() {
  // console.log("Viewport is scheduling render");
  this._component.scheduleUpdate();
  this._needsRender = true;
};

parsegraph_Viewport.prototype.needsRepaint = function() {
  return (
    this._needsRepaint ||
    this._world.needsRepaint() ||
    (this._carousel.isCarouselShown() && this._carousel.needsRepaint()) ||
    this._menu.needsRepaint()
  );
};

parsegraph_Viewport.prototype.needsRender = function() {
  return (
    this.needsRepaint() ||
    this._needsRender ||
    this._renderedMouse !== this.input().mouseVersion()
  );
};

parsegraph_Viewport.prototype.plot = function() {
  return this.world().plot.apply(this.world(), arguments);
};

/**
 * Paints the graph up to the given time, in milliseconds.
 *
 * Returns true if the graph completed painting.
 */
parsegraph_Viewport.prototype.paint = function(timeout) {
  const window = this._window;
  const gl = this._window.gl();
  if (gl.isContextLost()) {
    return false;
  }
  if (!this.needsRepaint()) {
    // window.log("Viewport is not dirty");
    return false;
  }

  var needsUpdate = this._carousel.paint();
  var needsUpdate = this._world.paint(window, timeout) || needsUpdate;

  this._input.paint();
  // this._piano.paint();
  if (needsUpdate) {
    this.scheduleRepaint();
  } else {
    this._needsRepaint = false;
  }
  this._needsRender = true;
  return needsUpdate;
};

parsegraph_Viewport.prototype.mouseVersion = function() {
  return this._renderedMouse;
};

parsegraph_Viewport.prototype.showInCamera = function(node) {
  this._nodeShown = node;
  this.scheduleRender();
};

parsegraph_Viewport.prototype.render = function(
    width,
    height,
    avoidIfPossible,
) {
  const gl = this._window.gl();
  if (gl.isContextLost()) {
    return false;
  }
  const cam = this.camera();
  if (!cam.setSize(width, height) && avoidIfPossible && !this.needsRender()) {
    return false;
  } else {
    this._menu.paint();
  }
  if (!this._needsRepaint) {
    if (this._nodeShown) {
      this._nodeShown.showInCamera(this.camera(), false);
    }
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  const overlay = this.window().overlay();
  overlay.textBaseline = 'top';
  overlay.scale(this.camera().scale(), this.camera().scale());
  overlay.translate(this.camera().x(), this.camera().y());

  const needsUpdate = this._world.render(this._window, cam);
  if (needsUpdate) {
    this._window.log('World was rendered dirty.');
    this.scheduleRender();
  }

  gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
  const world = cam.project();
  this._input.render(world, cam.scale());
  // this._piano.render(world, cam.scale());
  if (
    !this._window.isOffscreen() &&
    this._window.focusedComponent() &&
    this._window.focusedComponent().peer() === this
  ) {
    this._carousel.render(world);
    this._menu.render(world);
  }
  if (!needsUpdate) {
    this._renderedMouse = this.input().mouseVersion();
    this._needsRender = this._needsRepaint;
  }

  return needsUpdate;
};
