/**
 * TODO Add gridX and gridY camera listeners, with support for loading from an infinite grid of cells.
 *
 * TODO Add camera-movement listener, to let nodes watch for camera movement, and thus let nodes detect
 * when they are approaching critical screen boundaries:
 *
 * enteringScreen
 * leavingScreen
 *
 * Node distance is radially calculated (using the viewport's diagonal) from the camera's center, adjusted by some constant.
 *
 * hysteresis factor gives the +/- from some preset large distance (probably some hundreds of bud radiuses). Ignoring hysteresis,
 * then when the camera moves, the node's relative position may be changed. This distance is recalculated, and if it is above
 * some threshold plus hysteresis constant, and the node's state was 'near', then the node's leavingScreen is called, and the node's state is set to 'far'.
 *
 * Likewise, if the distance is lower than the same threshold minus hysteresis constant, and the node's state was 'far', then the node's enteringScreen is
 * called, and the node's state is set to 'near'.
 *
 * This distance is checked when the node is painted and also when the camera is moved.
 *
 * TODO Figure out how changing the grid size might change things.
 *
 * Grid updates based only on camera movement. Updates are reported in terms of cells made visible in either direction.
 * The number of potentially visible grid cells is determined for each axis using the camera's axis size adjusted by some constant.
 */
parsegraph_Viewport_COUNT = 0;
function parsegraph_Viewport(window, world)
{
    this._id = ++parsegraph_Viewport_COUNT;
    // Construct the graph.
    this._component = new parsegraph_Component(this);
    this._window = window;
    this._world = world;
    this._camera = new parsegraph_Camera();
    this._carousel = new parsegraph_Carousel(this);
    this._input = new parsegraph_Input(this);
    this._menu = new parsegraph_BurgerMenu(this);
    //this._piano = new parsegraph_AudioKeyboard(this._camera);

    this._component.setPainter(this.paint, this);
    this._component.setRenderer(this.render, this);
    this._component.setInputHandler(this.handleInput, this);
    this._component.setContextChanged(this.contextChanged, this);
    this.setLayout(new parsegraph_FullscreenLayout());
};
parsegraph_Viewport_Tests = new parsegraph_TestSuite("parsegraph_Viewport");

parsegraph_Viewport.prototype.id = function()
{
    return this._id;
};

parsegraph_Viewport.prototype.handleInput = function(eventType, inputData)
{
    if(eventType === "blur") {
        this._menu.closeMenu();
    }
    if(eventType === "wheel") {
        return this._input.onWheel(inputData);
    }
    if(eventType === "touchmove") {
        return this._input.onTouchmove(inputData);
    }
    if(eventType === "touchzoom") {
        return this._input.onTouchzoom(inputData);
    }
    if(eventType === "touchstart") {
        return this._input.onTouchstart(inputData);
    }
    if(eventType === "touchend") {
        return this._input.onTouchend(inputData);
    }
    if(eventType === "mousedown") {
        return this._input.onMousedown(inputData);
    }
    if(eventType === "mousemove") {
        return this._input.onMousemove(inputData);
    }
    if(eventType === "mouseup") {
        return this._input.onMouseup(inputData);
    }
    if(eventType === "keydown") {
        return this._input.onKeydown(inputData);
    }
    if(eventType === "keyup") {
        return this._input.onKeyup(inputData);
    }
    console.log("Unhandled event type: " + eventType);
};

parsegraph_Viewport.prototype.component = function()
{
    return this._component;
};

parsegraph_Viewport.prototype.width = function()
{
    var rv = new parsegraph_Rect();
    this._component.layout(this._window, rv);
    return rv.width();
};

parsegraph_Viewport.prototype.x = function()
{
    var rv = new parsegraph_Rect();
    this._component.layout(this._window, rv);
    return rv.x();
};

parsegraph_Viewport.prototype.y = function()
{
    var rv = new parsegraph_Rect();
    this._component.layout(this._window, rv);
    return rv.y();
};

parsegraph_Viewport.prototype.height = function()
{
    var rv = new parsegraph_Rect();
    this._component.layout(this._window, rv);
    return rv.height();
};

parsegraph_Viewport.prototype.setLayout = function(layout)
{
    this._component.setLayout(layout);
};

parsegraph_Viewport.prototype.shaders = function()
{
    return this.window().shaders();
};

parsegraph_Viewport.prototype.window = function()
{
    return this._window;
};

parsegraph_Viewport.prototype.gl = function()
{
    return this._window.gl();
};

parsegraph_Viewport.prototype.contextChanged = function(isLost)
{
    var window = this.window();
    this._world.contextChanged(isLost, window);
    this._carousel.contextChanged(isLost);
    this._input.contextChanged(isLost);
    this._menu.contextChanged(isLost);
};

parsegraph_Viewport.prototype.world = function()
{
    return this._world;
};

parsegraph_Viewport.prototype.carousel = function()
{
    return this._carousel;
};

parsegraph_Viewport.prototype.menu = function()
{
    return this._menu;
};

parsegraph_Viewport.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Viewport.prototype.input = function()
{
    return this._input;
};

parsegraph_Viewport.prototype.scheduleRepaint = function()
{
    //console.log(this._id, new Error("Scheduling repaint"));
    this._world.scheduleRepaint();
    this._component.setNeedsRender();
    if(this.onScheduleRepaint) {
        this.onScheduleRepaint.call(this.onScheduleRepaintThisArg);
    }
};

parsegraph_Viewport.prototype.setOnScheduleRepaint = function(func, thisArg)
{
    this.onScheduleRepaint = func;
    this.onScheduleRepaintThisArg = thisArg || this;
};

parsegraph_Viewport.prototype.needsRepaint = function()
{
    return this._world.needsRepaint() || (this._carousel.isCarouselShown() && this._carousel.needsRepaint()) || this._menu.needsRepaint();
};

parsegraph_Viewport.prototype.plot = function()
{
    return this.world().plot.apply(this.world(), arguments);
}

/**
 * Paints the graph up to the given time, in milliseconds.
 *
 * Returns true if the graph completed painting.
 */
parsegraph_Viewport.prototype.paint = function(timeout)
{
    //console.log("Painting Viewport, timeout=" + timeout);
    var window = this._window;
    var gl = this._window.gl();
    if(gl.isContextLost()) {
        return false;
    }

    this._carousel.paint();
    var rv = this._world.paint(window, timeout);

    this._input.paint();
    //this._piano.paint();
    this._menu.paint();
    return rv;
};

parsegraph_Viewport.prototype.render = function(width, height)
{
    var gl = this._window.gl();
    if(gl.isContextLost()) {
        return;
    }
    var cam = this.camera();
    cam.setSize(width, height);
    var needsRender = false;
    if(!this._world.render(this._window, cam)) {
        //console.log("World was rendered dirty.");
        this.scheduleRepaint();
        needsRender = true;
    }

    gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
    var world = cam.project();
    this._input.render(world, cam.scale());
    //this._piano.render(world, cam.scale());
    if(this._window.focusedComponent() && this._window.focusedComponent().peer() === this) {
        this._carousel.render(world);
        this._menu.render(world);
    }
    return needsRender;
};
