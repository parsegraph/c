parsegraph_Window_VertexShader =
"uniform mat3 u_world;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec2 a_texCoord;" +
"" +
"varying highp vec2 texCoord;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "texCoord = a_texCoord;" +
"}";

parsegraph_Window_FragmentShader =
"uniform sampler2D u_texture;\n" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = texture2D(u_texture, texCoord.st);" +
    //"gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);" +
"}";
parsegraph_WINDOW_COUNT = 0;

function parsegraph_Window()
{
    if(!parsegraph_INITIALIZED) {
        throw new Error("Parsegraph must be initialized using parsegraph_initialize()");
    }
    this._id = ++parsegraph_WINDOW_COUNT;
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._container = document.createElement("div");
    this._container.className = "parsegraph_Window";

    this._framebuffer = null;
    this._renderbuffer = null;
    this._glTexture = null;
    this._program = null;
    this._debugLog = "";

    this._schedulerFunc = null;
    this._schedulerFuncThisArg = null;

    // The 3D canvas that will be drawn to.
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
    this._canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();
    }, false);
    this._canvas.style.display = "block";
    this._canvas.setAttribute("tabIndex", 0);

    // GL content, not created until used.
    this._gl = null;
    this._shaders = {};

    this._container.appendChild(this._canvas);

    this._overlayCanvas = document.createElement("canvas");
    this._overlayCanvas.style.position = "absolute";
    this._overlayCanvas.style.top = "0";
    this._overlayCanvas.style.left = "0";
    this._overlayCanvas.style.pointerEvents = "none";
    this._overlayCtx = this._overlayCanvas.getContext('2d');
    this._container.appendChild(this._overlayCanvas);

    this._debugPanel = document.createElement("span");
    this._debugPanel.className = "debug";
    this._debugPanel.innerHTML = "DEBUG";
    //this._container.appendChild(this._debugPanel);

    this._layoutList = new parsegraph_LayoutList(parsegraph_COMPONENT_LAYOUT_HORIZONTAL);

    this._textureSize = NaN;

    // Whether the container is focused and not blurred.
    this._focused = false;
    this._isDoubleClick = false;
    this._isDoubleTouch = false;

    this._lastMouseX = 0;
    this._lastMouseY = 0;

    parsegraph_addEventMethod(this.container(), "focus", function(event) {
        this._focused = true;
    }, this);

    parsegraph_addEventMethod(this.container(), "blur", function(event) {
        this._focused = false;
    }, this);

    this._monitoredTouches = [];
    this._touchstartTime = null;

    this._needsUpdate = true;

    var onWheel = function(event) {
        event.preventDefault();

        // Get the mouse coordinates, relative to bottom-left of the canvas.
        var boundingRect = this.canvas().getBoundingClientRect();
        var x = event.offsetX - boundingRect.left;
        var y = event.offsetY - boundingRect.top;

        //console.log("Wheel event", wheel);
        var e = normalizeWheel(event);
        e.x = event.offsetX;
        e.y = event.offsetY;
        this.handleEvent("wheel", e);
    };

    /**
     * The receiver of all canvas wheel events.
     */
    parsegraph_addEventMethod(this.canvas(), "DOMMouseScroll", onWheel, this, false);
    parsegraph_addEventMethod(this.canvas(), "mousewheel", onWheel, this, false);

    parsegraph_addEventMethod(this.canvas(), "touchstart", function(event) {
        event.preventDefault();
        this._focused = true;

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches[i];
            var touchX = touch.pageX;
            var touchY = touch.pageY;
            var touchRec = {
                "identifier": touch.identifier,
                "x":touchX,
                "y":touchY,
                "startX":touchX,
                "startY":touchY,
                "touchstart":null
            };
            this._monitoredTouches.push(touchRec);
            this._lastMouseX = touchX;
            this._lastMouseY = touchY;

            this.handleEvent("touchstart", {
                multiple:this._monitoredTouches.length != 1,
                x:touchX,
                y:touchY,
                dx:0,
                dy:0
            });

            touchRec.touchstart = Date.now();
            this._touchstartTime = Date.now();
        }

        if(this.numActiveTouches() > 1) {
            // Zoom.
            var zoomCenter = midPoint(
                this._monitoredTouches[0].x, this._monitoredTouches[0].y,
                this._monitoredTouches[1].x, this._monitoredTouches[1].y
            );
            this.handleEvent("touchzoom", {
                x:zoomCenter[0],
                y:zoomCenter[1],
                dx:this._monitoredTouches[1].x - this._monitoredTouches[0].x,
                dy:this._monitoredTouches[1].y - this._monitoredTouches[0].y,
            });
        }
    }, this, true);

    parsegraph_addEventMethod(this.canvas(), "touchmove", function(event) {
        if(!this._focused) {
            return;
        }
        event.preventDefault();
        //console.log("touchmove", event);

        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches[i];
            var touchRecord = this.getTouchByIdentifier(touch.identifier);

            var touchX = touch.pageX;
            var touchY = touch.pageY;
            this.handleEvent("touchmove", {
                multiple:this._monitoredTouches.length != 1,
                x:touchX,
                y:touchY,
                dx:touchX - touchRecord.x,
                dy:touchY - touchRecord.y
            });
            touchRecord.x = touchX;
            touchRecord.y = touchY;
            this._lastMouseX = touchX;
            this._lastMouseY = touchY;
        }

        if(this.numActiveTouches() > 1) {
            var zoomCenter = midPoint(
                this._monitoredTouches[0].x, this._monitoredTouches[0].y,
                this._monitoredTouches[1].x, this._monitoredTouches[1].y
            );
            this.handleEvent("touchzoom", {
                x:zoomCenter[0],
                y:zoomCenter[1],
                dx:this._monitoredTouches[1].x - this._monitoredTouches[0].x,
                dy:this._monitoredTouches[1].y - this._monitoredTouches[0].y,
            });
        }
    }, this);

    var removeTouchListener = function(event) {
        //alert
        //console.log("touchend");
        for(var i = 0; i < event.changedTouches.length; ++i) {
            var touch = event.changedTouches[i];
            var touchData = this.removeTouchByIdentifier(touch.identifier);
        }

        if(this._touchstartTime != null && Date.now() - this._touchstartTime < parsegraph_CLICK_DELAY_MILLIS) {
            var that = this;
            this._touchendTimeout = setTimeout(function() {
                that._touchendTimeout = null;

                if(isDoubleTouch) {
                    // Double touch ended.
                    that._isDoubleTouch = false;
                    return;
                }

                // Single touch ended.
                that._isDoubleTouch = false;
            }, parsegraph_CLICK_DELAY_MILLIS);
        }

        if(this.handleEvent("touchend", {
            x:this._lastMouseX,
            y:this._lastMouseY,
            startTime:this._touchstartTime,
            multiple:this._monitoredTouches.length != 1,
        })) {
            this._touchstartTime = null;
        }
    };

    parsegraph_addEventMethod(this.canvas(), "touchend", removeTouchListener, this);
    parsegraph_addEventMethod(this.canvas(), "touchcancel", removeTouchListener, this);

    parsegraph_addEventMethod(this.canvas(), "mousedown", function(event) {
        this._focused = true;

        console.log(event);
        this._lastMouseX = event.offsetX;
        this._lastMouseY = event.offsetY;

        //console.log("Setting mousedown time");
        this._mousedownTime = Date.now();

        if(this.handleEvent("mousedown", {
            x:this._lastMouseX,
            y:this._lastMouseY,
            button:event.button,
            startTime:this._mousedownTime
        })) {
            event.preventDefault();
            event.stopPropagation();
            this.canvas().focus();
        }

        // This click is a second click following a recent click; it's a double-click.
        if(this._mouseupTimeout) {
            window.clearTimeout(this._mouseupTimeout);
            this._mouseupTimeout = null;
            this._isDoubleClick = true;
        }
    }, this);

    this._isDoubleClick = false;
    this._mouseupTimeout = 0;

    parsegraph_addEventMethod(this.canvas(), "mousemove", function(event) {
        this.handleEvent("mousemove", {
            x:event.offsetX,
            y:event.offsetY,
            dx:event.offsetX - this._lastMouseX,
            dy:event.offsetY - this._lastMouseY
        });
        this._lastMouseX = event.offsetX;
        this._lastMouseY = event.offsetY;
    }, this);

    var mouseUpListener = function(event) {
        this.handleEvent("mouseup", {
            x:this._lastMouseX,
            y:this._lastMouseY
        });
    };

    parsegraph_addEventMethod(this.canvas(), "mouseup", mouseUpListener, this);
    parsegraph_addEventMethod(this.canvas(), "mouseout", mouseUpListener, this);

    parsegraph_addEventMethod(this.canvas(), "keydown", function(event) {
        if(event.altKey || event.metaKey) {
            //console.log("Key event had ignored modifiers");
            return;
        }
        if(event.ctrlKey && event.shiftKey) {
            return;
        }

        this.handleEvent("keydown", {
            x:this._lastMouseX,
            y:this._lastMouseY,
            key:event.key,
            keyCode:event.keyCode,
            ctrlKey:event.ctrlKey
        });
    }, this);

    parsegraph_addEventMethod(this.canvas(), "keyup", function(event) {
        this.handleEvent("keyup", {
            x:this._lastMouseX,
            y:this._lastMouseY,
            key:event.key,
            keyCode:event.keyCode,
            ctrlKey:event.ctrlKey
        });
    }, this);
};

parsegraph_Window.prototype.isOffscreen = function()
{
    return false;
};

parsegraph_Window.prototype.numActiveTouches = function()
{
    var realMonitoredTouches = 0;
    this._monitoredTouches.forEach(function(touchRec) {
        if(touchRec.touchstart) {
            realMonitoredTouches++;
        }
    }, this);
    return realMonitoredTouches;
};

parsegraph_Window.prototype.numComponents = function()
{
    return this._layoutList.count();
};

parsegraph_Window.prototype.setCursor = function(cursorType)
{
    this.canvas().style.cursor = cursorType;
};

parsegraph_Window.prototype.focusedComponent = function()
{
    return this._focused ? this._focusedComponent : null;
};

parsegraph_Window.prototype.layout = function(target)
{
    var targetSize = null;
    this.forEach(function(comp, compSize) {
        if(target === comp) {
            targetSize = compSize;
            return true;
        }
    }, this);
    if(!targetSize) {
        throw new Error("Layout target must be a child component of this window");
    }
    return targetSize;
};

parsegraph_Window.prototype.getSize = function(sizeOut)
{
    sizeOut.setX(0);
    sizeOut.setY(0);
    sizeOut.setWidth(this.width());
    sizeOut.setHeight(this.height());
};

parsegraph_Window.prototype.forEach = function(func, funcThisArg)
{
    var windowSize = new parsegraph_Rect();
    this.getSize(windowSize);
    return this._layoutList.forEach(func, funcThisArg, windowSize);
};

parsegraph_Window.prototype.setFocusedComponent = function(x, y)
{
    var compSize = new parsegraph_Rect();
    y = this.height() - y;
    //console.log("Focusing component at (" + x + ", " + y + ")");
    if(this.forEach(function(comp, compSize) {
        if(!comp.hasEventHandler()) {
            return;
        }
        //console.log("Component size", compSize);
        if(x < compSize.x() || y < compSize.y()) {
            //console.log("Component is greater than X or Y (" + compSize.x() + ", " + compSize.y() + ")");
            return;
        }
        if(x > compSize.x() + compSize.width() || y > compSize.y() + compSize.height()) {
            //console.log("Component is lesser than X or Y");
            return;
        }
        if(this._focusedComponent !== comp && this._focusedComponent) {
            this._focusedComponent.handleEvent("blur");
        }
        this._focusedComponent = comp;
        //console.log("Found focused component: " + comp);
        return true;
    }, this)) {
        return;
    }
    // No component was focused.
    if(this._focusedComponent) {
        this._focusedComponent.handleEvent("blur");
    }
    this._focusedComponent = null;
};

parsegraph_Window.prototype.handleEvent = function(eventType, inputData)
{
    if(eventType === "tick") {
        var needsUpdate = false;
        this.forEach(function(comp) {
             needsUpdate = comp.handleEvent("tick", inputData) || needsUpdate;
        }, this);
        return needsUpdate;
    }
    if(
        eventType === "touchstart"
        || eventType === "wheel"
        || eventType === "touchmove"
        || eventType === "mousedown"
    ) {
        this.setFocusedComponent(inputData.x, inputData.y);
        if(!this._focusedComponent) {
            //console.log("No focused component");
            return;
        }
        var compSize = this.layout(this._focusedComponent);
        inputData.x -= compSize.x();
        // Input data is topleft-origin.
        // Component position is bottomleft-origin.
        // Component input should be topleft-origin.
        console.log("Raw Y: y=" + inputData.y +", cs.h=" + compSize.height() + ", cs.y=" + compSize.y());
        inputData.y -= this.height() - (compSize.y() + compSize.height());
        console.log("Adjusted Y: " + inputData.y + ", " + compSize.y());
    }
    if(this._focusedComponent) {
        if(eventType === "touchend" || eventType === "mousemove") {
            var compSize = this.layout(this._focusedComponent);
            inputData.x -= compSize.x();
            inputData.y -= this.height() - (compSize.y() + compSize.height());
        }
        if(this._focusedComponent.handleEvent(eventType, inputData)) {
            this.scheduleUpdate();
            return true;
        }
    }
    return false;
};

parsegraph_Window.prototype.getTouchByIdentifier = function(identifier)
{
    for(var i = 0; i < this._monitoredTouches.length; ++i) {
        if(this._monitoredTouches[i].identifier == identifier) {
            return this._monitoredTouches[i];
        }
    }
    return null;
};

parsegraph_Window.prototype.removeTouchByIdentifier = function(identifier)
{
    var touch = null;
    for(var i = 0; i < this._monitoredTouches.length; ++i) {
        if(this._monitoredTouches[i].identifier == identifier) {
            touch = this._monitoredTouches.splice(i--, 1)[0];
            break;
        }
    }
    return touch;
};

parsegraph_Window.prototype.scheduleUpdate = function()
{
    //console.log("Window is scheduling update");
    if(this._schedulerFunc) {
        this._schedulerFunc.call(this._schedulerFuncThisArg, this);
    }
};

parsegraph_Window.prototype.setOnScheduleUpdate = function(schedulerFunc, schedulerFuncThisArg)
{
    this._schedulerFunc = schedulerFunc;
    this._schedulerFuncThisArg = schedulerFuncThisArg;
};

parsegraph_Window.prototype.lastMouseCoords = function()
{
    return [this._lastMouseX, this._lastMouseY];
};

parsegraph_Window.prototype.lastMouseX = function()
{
    return this._lastMouseX;
};

parsegraph_Window.prototype.lastMouseY = function()
{
    return this._lastMouseY;
};

parsegraph_Window.prototype.id = function()
{
    return this._id;
};

parsegraph_Window.prototype.shaders = function()
{
    return this._shaders;
};

parsegraph_Window.prototype.textureSize = function()
{
    if(this._gl.isContextLost()) {
        return NaN;
    }
    if(Number.isNaN(this._textureSize)) {
        this._textureSize = Math.min(512, parsegraph_getTextureSize(this._gl));
    }
    return this._textureSize;
};

parsegraph_Window.prototype.onContextChanged = function(isLost)
{
    if(isLost) {
        var keys = [];
        for(var k in this._shaders) {
            keys.push(k);
        }
        for(var i in keys) {
            delete this._shaders[keys[i]];
        }
    }
    this.forEach(function(comp) {
        if(comp.contextChanged) {
            comp.contextChanged(isLost, this);
        }
    }, this);
};

parsegraph_Window.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_Window.prototype.overlay = function()
{
    return this._overlayCtx;
};

parsegraph_Window.prototype.overlayCanvas = function()
{
    return this._overlayCanvas;
};

parsegraph_Window.prototype.gl = function()
{
    if(this._gl) {
        return this._gl;
    }
    //this._gl = this._canvas.getContext("webgl2", {
        //antialias:true
    //});
    if(this._gl) {
        //this.render = this.renderWebgl2;
        parsegraph_checkGLError(this._gl, "WebGL2 creation");
        return this._gl;
    }
    this._gl = this._canvas.getContext("webgl");
    if(this._gl) {
        parsegraph_checkGLError(this._gl, "WebGL creation");
        return this._gl;
    }
    throw new Error("GL context is not supported");
};

parsegraph_Window.prototype.setGL = function(gl)
{
    this._gl = gl;
};

parsegraph_Window.prototype.setAudio = function(audio)
{
    this._audio = audio;
};

parsegraph_Window.prototype.startAudio = function()
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

parsegraph_Window.prototype.audio = function()
{
    return this._audio;
};

parsegraph_Window.prototype.resize = function(w, h)
{
    this.container().style.width = typeof w === "number" ? (w + "px") : w;
    if(arguments.length === 1) {
        h = w;
    }
    this.container().style.height = typeof h === "number" ? (h + "px") : h;
};

parsegraph_Window.prototype.setExplicitSize = function(w, h)
{
    this._explicitWidth = w;
    this._explicitHeight = h;
    this.resize(w, h);
};

parsegraph_Window.prototype.getWidth = function()
{
    return this._explicitWidth || this.container().clientWidth;
};
parsegraph_Window.prototype.width = parsegraph_Window.prototype.getWidth;

parsegraph_Window.prototype.getHeight = function()
{
    return this._explicitHeight || this.container().clientHeight;
};
parsegraph_Window.prototype.height = parsegraph_Window.prototype.getHeight;

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_Window.prototype.container = function()
{
    return this._container;
};

parsegraph_Window.prototype.addWidget = function(widget)
{
    return this.addComponent(widget.component());
};

parsegraph_Window.prototype.addComponent = function(comp)
{
    return this.addHorizontal(comp, null);
};

parsegraph_Window.prototype.addHorizontal = function(comp, other)
{
    comp.setOwner(this);
    this.scheduleUpdate();
    if(!other) {
        this._layoutList.addHorizontal(comp);
        return;
    }
    var container = this._layoutList.contains(other);
    if(!container) {
        throw new Error("Window must contain the given reference component");
    }
    container.addHorizontal(comp);
};

parsegraph_Window.prototype.addVertical = function(comp, other)
{
    comp.setOwner(this);
    this.scheduleUpdate();
    if(!other) {
        this._layoutList.addVertical(comp);
        return;
    }
    var container = this._layoutList.contains(other);
    if(!container) {
        throw new Error("Window must contain the given reference component");
    }
    container.addVertical(comp);
    console.log(this._layoutList);
    console.log(this._layoutList);
};

parsegraph_Window.prototype.removeComponent = function(compToRemove)
{
    this.scheduleUpdate();
    if(compToRemove === this._focusedComponent) {
        if(this._focusedComponent) {
            this._focusedComponent.handleEvent("blur");
        }
        var prior = this._layoutList.getPrevious(compToRemove);
        var next = this._layoutList.getNext(compToRemove);
        this._focusedComponent = prior || next;
    }
    return this._layoutList.remove(compToRemove);
};

parsegraph_Window.prototype.tick = function(startTime)
{
    var needsUpdate = false;
    this.forEach(function(comp) {
        needsUpdate = comp.handleEvent("tick", startTime) || needsUpdate;
    }, this);
    return needsUpdate;
};

parsegraph_Window.prototype.paint = function(timeout)
{
    if(this.gl().isContextLost()) {
        return;
    }
    //console.log("Painting window");
    this._shaders.gl = this.gl();
    this._shaders.timeout = timeout;

    var needsUpdate = false;
    var startTime = new Date();
    var compCount = this.numComponents();
    while(timeout > 0) {
        this.forEach(function(comp) {
            needsUpdate = comp.paint(timeout / compCount) || needsUpdate;
        }, this);
        timeout = Math.max(0, timeout - parsegraph_elapsed(startTime));
    }
    return needsUpdate;
};

parsegraph_Window.prototype.setBackground = function(color)
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
parsegraph_Window.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

/**
 * Returns whether the window has a nonzero client width and height.
 */
parsegraph_Window.prototype.canProject = function()
{
    var displayWidth = this.getWidth();
    var displayHeight = this.getHeight();

    return displayWidth != 0 && displayHeight != 0;
};

parsegraph_Window.prototype.renderWebgl2 = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    var gl = this.gl();
    if(this.gl().isContextLost()) {
        return false;
    }
    //console.log("Rendering window");
    if(!this.canProject()) {
        throw new Error(
            "Refusing to render to an unprojectable window. Use canProject() to handle, and parent this window's container to fix."
        );
    }

    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.container().clientWidth;
    var displayHeight = this.container().clientHeight;
    // Check if the canvas is not the same size.
    if(this.canvas().width != displayWidth || this.canvas().height != displayHeight) {
        // Make the canvas the same size
        this.canvas().width = displayWidth;
        this.canvas().height = displayHeight;
    }

    if(!this._framebuffer) {
        this._multisampleFramebuffer = gl.createFramebuffer();
        this._renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, gl.getParameter(gl.MAX_SAMPLES), gl.RGBA8, displayWidth, displayHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._multisampleFramebuffer);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this._renderbuffer);

        this._glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, displayWidth, displayHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._glTexture, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._multisampleFramebuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._multisampleFramebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    }

    gl.clearColor(this._backgroundColor.r(), this._backgroundColor.g(), this._backgroundColor.b(), this._backgroundColor.a());
    gl.enable(gl.SCISSOR_TEST);
    var needsUpdate = false;
    var compSize = new parsegraph_Rect();
    this.forEach(function(comp, compSize) {
        //console.log("Rendering: " + comp.peer().id());
        //console.log("Rendering component of size " + compSize.width() + "x" + compSize.height());
        gl.scissor(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        gl.viewport(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        needsUpdate = comp.render(compSize.width(), compSize.height(), true) || needsUpdate;
    }, this);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._multisampleFramebuffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.clearBufferfv(gl.COLOR, 0, [1.0, 1.0, 1.0, 1.0]);
    gl.blitFramebuffer(0, 0, displayWidth, displayHeight,
                     0, 0, displayWidth, displayHeight,
                     gl.COLOR_BUFFER_BIT, gl.LINEAR);
    return needsUpdate;
};

parsegraph_Window.prototype.renderMultisampleFramebuffer = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();
    var gl = this.gl();
    if(this.gl().isContextLost()) {
        return;
    }
    //console.log("Rendering window");
    if(!this.canProject()) {
        throw new Error(
            "Refusing to render to an unprojectable window. Use canProject() to handle, and parent this window's container to fix."
        );
    }

    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.container().clientWidth;
    var displayHeight = this.container().clientHeight;
    // Check if the canvas is not the same size.
    if(this.canvas().width != displayWidth || this.canvas().height != displayHeight) {
        // Make the canvas the same size
        this.canvas().width = displayWidth;
        this.canvas().height = displayHeight;
    }

    var multisample = 8;
    var backbufferWidth = multisample*displayWidth;
    var backbufferHeight = multisample*displayHeight;

    if(!this._framebuffer) {
        this._glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, backbufferWidth, backbufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._framebuffer = gl.createFramebuffer();
        this._renderbuffer = gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, backbufferWidth, backbufferHeight);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._glTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._renderbuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    }

    var compSize = new parsegraph_Rect();
    gl.clearColor(this._backgroundColor.r(), this._backgroundColor.g(), this._backgroundColor.b(), this._backgroundColor.a());
    gl.enable(gl.SCISSOR_TEST);
    this.forEach(function(comp, compSize) {
        //console.log("Rendering: " + comp.peer().id());
        //console.log("Rendering component of size " + compSize.width() + "x" + compSize.height());
        gl.scissor(multisample*compSize.x(), multisample*compSize.y(), multisample*compSize.width(), multisample*compSize.height());
        gl.viewport(multisample*compSize.x(), multisample*compSize.y(), multisample*compSize.width(), multisample*compSize.height());
        comp.render(compSize.width(), compSize.height(), true);
    }, this);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    if(!this._program) {
        this._program = parsegraph_compileProgram(this,
            "parsegraph_Window",
            parsegraph_Window_VertexShader,
            parsegraph_Window_FragmentShader
        );
        this.u_world = gl.getUniformLocation(this._program, "u_world");
        this.u_texture = gl.getUniformLocation(this._program, "u_texture");
        this.a_position = gl.getAttribLocation(this._program, "a_position");
        this.a_texCoord = gl.getAttribLocation(this._program, "a_texCoord");
    }
    gl.useProgram(this._program);

    gl.activeTexture(gl.TEXTURE0);
    //console.log("Using texture " + frag.slot()._id);
    gl.enableVertexAttribArray(this.a_position);
    gl.enableVertexAttribArray(this.a_texCoord);
    gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
    gl.uniform1i(this.u_texture, 0);
    gl.uniformMatrix3fv(this.u_world, false, make2DProjection(displayWidth, displayHeight));

    gl.viewport(0, 0, displayWidth, displayHeight);
    if(!this._vertexBuffer) {
        this._vertexBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);

    var arr = new Float32Array(6*4);
    arr[0] = 0;
    arr[1] = 0;
    arr[2] = 0;
    arr[3] = multisample*displayHeight/backbufferHeight;
    //arr[2] = 0;
    //arr[3] = 0;

    arr[4] = displayWidth;
    arr[5] = 0;
    arr[6] = multisample*displayWidth/backbufferWidth;
    arr[7] = multisample*displayHeight/backbufferHeight;
    //arr[6] = 1;
    //arr[7] = 0;

    arr[8] = displayWidth;
    arr[9] = displayHeight;
    arr[10] = arr[6];
    arr[11] = 0
    //arr[10] = 1;
    //arr[11] = 1;

    arr[12] = arr[0];
    arr[13] = arr[1];
    arr[14] = arr[2];
    arr[15] = arr[3];

    arr[16] = arr[8];
    arr[17] = arr[9];
    arr[18] = arr[10];
    arr[19] = arr[11];

    arr[20] = arr[0];
    arr[21] = arr[9];
    arr[22] = arr[2];
    arr[23] = arr[11];
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);

    var FLOAT_SIZE = 4;
    var stride = 4 * FLOAT_SIZE;
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.a_texCoord, 2, gl.FLOAT, false, stride, 2*FLOAT_SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

/**
 * Invokes all renderers.
 *
 * Throws if canProject() returns false.
 */
parsegraph_Window.prototype.renderFramebuffer = function()
{
    var gl = this.gl();
    if(this.gl().isContextLost()) {
        return;
    }
    //console.log("Rendering window");
    if(!this.canProject()) {
        throw new Error(
            "Refusing to render to an unprojectable window. Use canProject() to handle, and parent this window's container to fix."
        );
    }

    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.width();
    var displayHeight = this.height();
    // Check if the canvas is not the same size.
    if(this.canvas().width != displayWidth || this.canvas().height != displayHeight) {
        // Make the canvas the same size
        this.canvas().width = displayWidth;
        this.canvas().height = displayHeight;
    }

    var backbufferWidth = displayWidth;
    var backbufferHeight = displayHeight;

    if(!this._framebuffer) {
        this._glTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, backbufferWidth, backbufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this._framebuffer = gl.createFramebuffer();
        this._renderbuffer = gl.createRenderbuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, backbufferWidth, backbufferHeight);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._glTexture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._renderbuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    }

    var compSize = new parsegraph_Rect();
    gl.clearColor(this._backgroundColor.r(), this._backgroundColor.g(), this._backgroundColor.b(), this._backgroundColor.a());
    gl.enable(gl.SCISSOR_TEST);
    this.forEach(function(comp, compSize) {
        //console.log("Rendering: " + comp.peer().id());
        //console.log("Rendering component of size " + compSize.width() + "x" + compSize.height());
        gl.scissor(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        gl.viewport(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        comp.render(compSize.width(), compSize.height(), true);
    }, this);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    if(!this._program) {
        this._program = parsegraph_compileProgram(this,
            "parsegraph_Window",
            parsegraph_Window_VertexShader,
            parsegraph_Window_FragmentShader
        );
        this.u_world = gl.getUniformLocation(this._program, "u_world");
        this.u_texture = gl.getUniformLocation(this._program, "u_texture");
        this.a_position = gl.getAttribLocation(this._program, "a_position");
        this.a_texCoord = gl.getAttribLocation(this._program, "a_texCoord");
    }
    gl.useProgram(this._program);

    gl.activeTexture(gl.TEXTURE0);
    //console.log("Using texture " + frag.slot()._id);
    gl.enableVertexAttribArray(this.a_position);
    gl.enableVertexAttribArray(this.a_texCoord);
    gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
    gl.uniform1i(this.u_texture, 0);
    gl.uniformMatrix3fv(this.u_world, false, make2DProjection(displayWidth, displayHeight));

    gl.viewport(0, 0, displayWidth, displayHeight);
    if(!this._vertexBuffer) {
        this._vertexBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);

    var arr = new Float32Array(6*4);
    arr[0] = 0;
    arr[1] = 0;
    arr[2] = 0;
    arr[3] = displayHeight/backbufferHeight;
    //arr[2] = 0;
    //arr[3] = 0;

    arr[4] = displayWidth;
    arr[5] = 0;
    arr[6] = displayWidth/backbufferWidth;
    arr[7] = displayHeight/backbufferHeight;
    //arr[6] = 1;
    //arr[7] = 0;

    arr[8] = displayWidth;
    arr[9] = displayHeight;
    arr[10] = arr[6];
    arr[11] = 0
    //arr[10] = 1;
    //arr[11] = 1;

    arr[12] = arr[0];
    arr[13] = arr[1];
    arr[14] = arr[2];
    arr[15] = arr[3];

    arr[16] = arr[8];
    arr[17] = arr[9];
    arr[18] = arr[10];
    arr[19] = arr[11];

    arr[20] = arr[0];
    arr[21] = arr[9];
    arr[22] = arr[2];
    arr[23] = arr[11];
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);

    var FLOAT_SIZE = 4;
    var stride = 4 * FLOAT_SIZE;
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.a_texCoord, 2, gl.FLOAT, false, stride, 2*FLOAT_SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

parsegraph_Window.prototype.log = function(msg)
{
    this._debugLog += msg + "<br/>";
};

parsegraph_Window.prototype.clearLog = function()
{
    this._debugLog = "";
    this.finalizeLog();
};

parsegraph_Window.prototype.finalizeLog = function()
{
    this._debugPanel.innerHTML = this._debugLog;
};

parsegraph_Window.prototype.renderBasic = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    var gl = this.gl();
    if(this.gl().isContextLost()) {
        return false;
    }
    //console.log("Rendering window");
    if(!this.canProject()) {
        throw new Error(
            "Refusing to render to an unprojectable window. Use canProject() to handle, and parent this window's container to fix."
        );
    }

    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.width();
    var displayHeight = this.height();
    // Check if the canvas is not the same size.
    if(this.canvas().width != displayWidth || this.canvas().height != displayHeight) {
        // Make the canvas the same size
        this.canvas().width = displayWidth;
        this.canvas().height = displayHeight;
    }

    var compSize = new parsegraph_Rect();
    var needsUpdate = false;
    gl.clearColor(this._backgroundColor.r(), this._backgroundColor.g(), this._backgroundColor.b(), this._backgroundColor.a());
    gl.enable(gl.SCISSOR_TEST);
    this.forEach(function(comp, compSize) {
        //console.log("Rendering: " + comp.peer().id());
        //console.log("Rendering component of size " + compSize.width() + "x" + compSize.height());
        gl.scissor(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        gl.viewport(compSize.x(), compSize.y(), compSize.width(), compSize.height());
        needsUpdate = comp.render(compSize.width(), compSize.height()) || needsUpdate;
    }, this);
    gl.disable(gl.SCISSOR_TEST);

    return needsUpdate;
};

parsegraph_Window.prototype.render = function()
{
    this._overlayCanvas.width = top.window.innerWidth;
    this._overlayCanvas.height = top.window.innerHeight;
    this._overlayCtx.clearRect(0, 0, this._overlayCanvas.width, this._overlayCanvas.height);
    return this.renderBasic();
};
