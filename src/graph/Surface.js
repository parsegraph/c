function parsegraph_Surface()
{
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._container = document.createElement("div");
    this._container.className = "parsegraph_Surface";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    //if(WebGLDebugUtils) {
        //this._canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(this._canvas);
    //}
    var that = this;
    this._canvas.addEventListener("webglcontextlost", function(event) {
        console.log("Context lost");
        event.preventDefault();
        that.onContextChanged(true);
    }, false);
    this._canvas.addEventListener("webglcontextrestored", function() {
        console.log("Context restored");
        that.onContextChanged(false);
    }, false);
    this._canvas.style.display = "block";
    this._canvas.setAttribute("tabIndex", 0);

    // GL content, not created until used.
    this._gl = null;

    this._container.appendChild(this._canvas);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._painters = [];
    this._renderers = [];
    this._contextWatchers = [];
};

parsegraph_Surface.prototype.onContextChanged = function(isLost)
{
    for(var i = 0; i < this._contextWatchers.length; ++i) {
        var watcher = this._contextWatchers[i];
        watcher[0].call(watcher[1], isLost);
    }
};

parsegraph_Surface.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_Surface.prototype.gl = function()
{
    if(!this._gl) {
        this._gl = this._canvas.getContext("experimental-webgl");
        if(this._gl == null) {
            this._gl = this._canvas.getContext("webgl");
            if(this._gl == null) {
                throw new Error("GL context is not supported");
            }
        }
    }
    return this._gl;
};

parsegraph_Surface.prototype.setGL = function(gl)
{
    this._gl = gl;
};

parsegraph_Surface.prototype.setAudio = function(audio)
{
    this._audio = audio;
};

parsegraph_Surface.prototype.startAudio = function()
{
    if(!this._audio) {
        try {
            this._audio = new AudioContext();
        }
        catch(ex) {
            console.log(ex);
        }
        if(this._audio == null) {
            throw new Error("AudioContext is not supported");
        }
    }
    return this.audio();
};

parsegraph_Surface.prototype.audio = function()
{
    return this._audio;
};

parsegraph_Surface.prototype.resize = function(w, h)
{
    this.container().style.width = typeof w === "number" ? (w + "px") : w;
    if(arguments.length === 1) {
        h = w;
    }
    this.container().style.height = typeof h === "number" ? (h + "px") : h;
};

parsegraph_Surface.prototype.getWidth = function()
{
    return this.container().clientWidth;
};

parsegraph_Surface.prototype.getHeight = function()
{
    return this.container().clientHeight;
};

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_Surface.prototype.container = function()
{
    return this._container;
};

parsegraph_Surface.prototype.addPainter = function(painter, thisArg)
{
    this._painters.push([painter, thisArg]);
};

parsegraph_Surface.prototype.addRenderer = function(renderer, thisArg)
{
    this._renderers.push([renderer, thisArg]);
};

parsegraph_Surface.prototype.addContextWatcher = function(watcher, thisArg)
{
    this._contextWatchers.push([watcher, thisArg]);
};

parsegraph_Surface.prototype.paint = function()
{
    if(this.gl().isContextLost()) {
        return;
    }
    //console.log("Painting surface");
    var args = arguments;
    this._painters.forEach(function(painter) {
        painter[0].apply(painter[1], args);
    }, this);
};

parsegraph_Surface.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;
};

/**
 * Retrieves the current background color.
 */
parsegraph_Surface.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

/**
 * Returns whether the surface has a nonzero client width and height.
 */
parsegraph_Surface.prototype.canProject = function()
{
    var displayWidth = this.getWidth();
    var displayHeight = this.getHeight();

    return displayWidth != 0 && displayHeight != 0;
};

/**
 * Invokes all renderers.
 *
 * Throws if canProject() returns false.
 */
parsegraph_Surface.prototype.render = function()
{
    var gl = this.gl();
    if(this.gl().isContextLost()) {
        return;
    }
    //console.log("Rendering surface");
    if(!this.canProject()) {
        throw new Error(
            "Refusing to render to an unprojectable surface. Use canProject() to handle, and parent this surface's container to fix."
        );
    }
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    gl.clearColor(
        this._backgroundColor._r,
        this._backgroundColor._g,
        this._backgroundColor._b,
        this._backgroundColor._a
    );
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this._renderers.forEach(function(renderer) {
        renderer[0].call(renderer[1]);
    }, this);
};

