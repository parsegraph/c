parsegraph_IMAGEWINDOW_COUNT = 0;

function parsegraph_ImageWindow(width, height) {
  if (!width || !height) {
    throw new Error(
      "ImageWindow must receive a width and height during construction"
    );
  }
  if (!parsegraph_INITIALIZED) {
    throw new Error(
      "Parsegraph must be initialized using parsegraph_initialize()"
    );
  }
  this._id = ++parsegraph_IMAGEWINDOW_COUNT;
  this._backgroundColor = parsegraph_BACKGROUND_COLOR;

  this._schedulerFunc = null;
  this._schedulerFuncThisArg = null;

  // The canvas that will be drawn to.
  this._canvas = document.createElement("canvas");
  var that = this;
  this._canvas.addEventListener(
    "webglcontextlost",
    function (event) {
      console.log("Context lost");
      event.preventDefault();
      that.onContextChanged(true);
    },
    false
  );
  this._canvas.addEventListener(
    "webglcontextrestored",
    function () {
      console.log("Context restored");
      that.onContextChanged(false);
    },
    false
  );
  this._canvas.addEventListener(
    "contextmenu",
    function (e) {
      e.preventDefault();
    },
    false
  );
  this._canvas.style.display = "block";
  this._canvas.setAttribute("tabIndex", 0);

  // GL content, not created until used.
  this._gl = null;
  this._shaders = {};

  this._layoutList = new parsegraph_LayoutList(
    parsegraph_COMPONENT_LAYOUT_HORIZONTAL
  );

  this._textureSize = NaN;

  this._needsUpdate = true;

  this.setExplicitSize(width, height);
  this.newImage();
  this._imageCanvas = document.createElement("canvas");
  this._imageCanvas.width = this.width();
  this._imageCanvas.height = this.height();
  this._imageContext = this._imageCanvas.getContext("2d");
}

parsegraph_ImageWindow.prototype.log = function () {};

parsegraph_ImageWindow.prototype.clearLog = function () {};

parsegraph_ImageWindow.prototype.isOffscreen = function () {
  return true;
};

parsegraph_ImageWindow.prototype.numComponents = function () {
  return this._layoutList.count();
};

parsegraph_ImageWindow.prototype.layout = function (target) {
  var targetSize = null;
  this.forEach(function (comp, compSize) {
    if (target === comp) {
      targetSize = compSize;
      return true;
    }
  }, this);
  if (!targetSize) {
    throw new Error("Layout target must be a child component of this window");
  }
  return targetSize;
};

parsegraph_ImageWindow.prototype.handleEvent = function (eventType, inputData) {
  if (eventType === "tick") {
    var needsUpdate = false;
    this.forEach(function (comp) {
      needsUpdate = comp.handleEvent("tick", inputData) || needsUpdate;
    }, this);
    return needsUpdate;
  }
  return false;
};

parsegraph_ImageWindow.prototype.getSize = function (sizeOut) {
  sizeOut.setX(0);
  sizeOut.setY(0);
  sizeOut.setWidth(this.width());
  sizeOut.setHeight(this.height());
};

parsegraph_ImageWindow.prototype.forEach = function (func, funcThisArg) {
  var windowSize = new parsegraph_Rect();
  this.getSize(windowSize);
  return this._layoutList.forEach(func, funcThisArg, windowSize);
};

parsegraph_ImageWindow.prototype.scheduleUpdate = function () {
  //console.log("Window is scheduling update");
  if (this._schedulerFunc) {
    this._schedulerFunc.call(this._schedulerFuncThisArg, this);
  }
};

parsegraph_ImageWindow.prototype.setOnScheduleUpdate = function (
  schedulerFunc,
  schedulerFuncThisArg
) {
  this._schedulerFunc = schedulerFunc;
  this._schedulerFuncThisArg = schedulerFuncThisArg;
};

parsegraph_ImageWindow.prototype.id = function () {
  return this._id;
};

parsegraph_ImageWindow.prototype.shaders = function () {
  return this._shaders;
};

parsegraph_ImageWindow.prototype.textureSize = function () {
  if (this._gl.isContextLost()) {
    return NaN;
  }
  if (Number.isNaN(this._textureSize)) {
    this._textureSize = Math.min(512, parsegraph_getTextureSize(this._gl));
  }
  return this._textureSize;
};

parsegraph_ImageWindow.prototype.onContextChanged = function (isLost) {
  if (isLost) {
    var keys = [];
    for (var k in this._shaders) {
      keys.push(k);
    }
    for (var i in keys) {
      delete this._shaders[keys[i]];
    }
  }
  this.forEach(function (comp) {
    if (comp.contextChanged) {
      comp.contextChanged(isLost, this);
    }
  }, this);
};

parsegraph_ImageWindow.prototype.canvas = function () {
  return this._canvas;
};

parsegraph_ImageWindow.prototype.gl = function () {
  if (this._gl) {
    return this._gl;
  }
  //this._gl = this._canvas.getContext("webgl2", {
  //antialias:false
  //});
  if (this._gl) {
    this.render = this.renderWebgl2;
    return this._gl;
  }
  this._gl = this._canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (this._gl) {
    return this._gl;
  }
  throw new Error("GL context is not supported");
};

parsegraph_ImageWindow.prototype.setGL = function (gl) {
  this._gl = gl;
};

parsegraph_ImageWindow.prototype.setExplicitSize = function (w, h) {
  this._explicitWidth = w;
  this._explicitHeight = h;
};

parsegraph_ImageWindow.prototype.upscale = function () {
  return 2;
};

parsegraph_ImageWindow.prototype.getWidth = function () {
  return this._explicitWidth * this.upscale();
};
parsegraph_ImageWindow.prototype.width =
  parsegraph_ImageWindow.prototype.getWidth;

parsegraph_ImageWindow.prototype.getHeight = function () {
  return this._explicitHeight * this.upscale();
};
parsegraph_ImageWindow.prototype.height =
  parsegraph_ImageWindow.prototype.getHeight;

parsegraph_ImageWindow.prototype.addWidget = function (widget) {
  return this.addComponent(widget.component());
};

parsegraph_ImageWindow.prototype.addComponent = function (comp) {
  return this.addHorizontal(comp, null);
};

parsegraph_ImageWindow.prototype.addHorizontal = function (comp, other) {
  comp.setOwner(this);
  this.scheduleUpdate();
  if (!other) {
    this._layoutList.addHorizontal(comp);
    return;
  }
  var container = this._layoutList.contains(other);
  if (!container) {
    throw new Error("Window must contain the given reference component");
  }
  container.addHorizontal(comp);
};

parsegraph_ImageWindow.prototype.addVertical = function (comp, other) {
  comp.setOwner(this);
  this.scheduleUpdate();
  if (!other) {
    this._layoutList.addVertical(comp);
    return;
  }
  var container = this._layoutList.contains(other);
  if (!container) {
    throw new Error("Window must contain the given reference component");
  }
  container.addVertical(comp);
  console.log(this._layoutList);
  console.log(this._layoutList);
};

parsegraph_ImageWindow.prototype.removeComponent = function (compToRemove) {
  this.scheduleUpdate();
  if (compToRemove === this._focusedComponent) {
    if (this._focusedComponent) {
      this._focusedComponent.handleEvent("blur");
    }
    var prior = this._layoutList.getPrevious(compToRemove);
    var next = this._layoutList.getNext(compToRemove);
    this._focusedComponent = prior || next;
  }
  return this._layoutList.remove(compToRemove);
};

parsegraph_ImageWindow.prototype.tick = function (startTime) {
  var needsUpdate = false;
  this.forEach(function (comp) {
    needsUpdate = comp.handleEvent("tick", startTime) || needsUpdate;
  }, this);
  return needsUpdate;
};

parsegraph_ImageWindow.prototype.paint = function (timeout) {
  if (this.gl().isContextLost()) {
    return;
  }
  //console.log("Painting window");
  this._shaders.gl = this.gl();
  this._shaders.timeout = timeout;

  var needsUpdate = false;
  var startTime = new Date();
  var compCount = this.numComponents();
  while (timeout > 0) {
    this.forEach(function (comp) {
      needsUpdate = comp.paint(timeout / compCount) || needsUpdate;
    }, this);
    timeout = Math.max(0, timeout - parsegraph_elapsed(startTime));
  }
  return needsUpdate;
};

parsegraph_ImageWindow.prototype.setBackground = function (color) {
  if (arguments.length > 1) {
    return this.setBackground(parsegraph_createColor.apply(this, arguments));
  }
  this._backgroundColor = color;
};

/**
 * Retrieves the current background color.
 */
parsegraph_ImageWindow.prototype.backgroundColor = function () {
  return this._backgroundColor;
};

/**
 * Returns whether the window has a nonzero client width and height.
 */
parsegraph_ImageWindow.prototype.canProject = function () {
  var displayWidth = this.getWidth();
  var displayHeight = this.getHeight();

  return displayWidth != 0 && displayHeight != 0;
};

parsegraph_ImageWindow.prototype.renderBasic = function () {
  var gl = this.gl();
  if (this.gl().isContextLost()) {
    return false;
  }
  //console.log("Rendering window");
  if (!this.canProject()) {
    throw new Error(
      "Refusing to render to an unprojectable window. Use canProject() to handle, and parent this window's container to fix."
    );
  }

  var compSize = new parsegraph_Rect();
  var needsUpdate = false;
  gl.clearColor(
    this._backgroundColor.r(),
    this._backgroundColor.g(),
    this._backgroundColor.b(),
    this._backgroundColor.a()
  );
  gl.enable(gl.SCISSOR_TEST);
  this.forEach(function (comp, compSize) {
    //console.log("Rendering: " + comp.peer().id());
    //console.log("Rendering component of size " + compSize.width() + "x" + compSize.height());
    gl.scissor(compSize.x(), compSize.y(), compSize.width(), compSize.height());
    gl.viewport(
      compSize.x(),
      compSize.y(),
      compSize.width(),
      compSize.height()
    );
    needsUpdate =
      comp.render(compSize.width(), compSize.height()) || needsUpdate;
  }, this);
  gl.disable(gl.SCISSOR_TEST);

  return needsUpdate;
};

parsegraph_ImageWindow.prototype.loadImageFromTexture = function (
  gl,
  texture,
  width,
  height
) {
  // Create a framebuffer backed by the texture
  var framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );

  // Read the contents of the framebuffer
  var data = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);

  gl.deleteFramebuffer(framebuffer);

  // Create a 2D canvas to store the result
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext("2d");

  // Copy the pixels to a 2D canvas
  var imageData = context.createImageData(width, height);
  imageData.data.set(data);
  context.putImageData(imageData, 0, 0);

  this._image.src = canvas.toDataURL();
};

parsegraph_ImageWindow.prototype.image = function () {
  return this._image;
};

parsegraph_ImageWindow.prototype.newImage = function () {
  this._image = new Image();
  this._image.style.width = Math.floor(this._explicitWidth) + "px";
  this._image.style.height = Math.floor(this._explicitHeight) + "px";
};

parsegraph_ImageWindow.prototype.render = function () {
  var needsUpdate = this.renderBasic();
  var gl = this.gl();
  var targetTextureWidth = this.width();
  var targetTextureHeight = this.height();

  if (!this._fb) {
    var fb = gl.createFramebuffer();
    this._fb = fb;

    this._targetTexture = gl.createTexture();
    var targetTexture = this._targetTexture;

    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    {
      // define size and format of level 0
      var level = 0;
      var internalFormat = gl.RGBA;
      var border = 0;
      var format = gl.RGBA;
      var type = gl.UNSIGNED_BYTE;
      var data = null;
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        targetTextureWidth,
        targetTextureHeight,
        border,
        format,
        type,
        data
      );

      // set the filtering so we don't need mips
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // attach the texture as the first color attachment
    var attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      attachmentPoint,
      gl.TEXTURE_2D,
      targetTexture,
      level
    );
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fb);
  }

  parsegraph_VFLIP = true;
  this.renderBasic();
  parsegraph_VFLIP = false;

  this.loadImageFromTexture(
    gl,
    this._targetTexture,
    targetTextureWidth,
    targetTextureHeight
  );

  return needsUpdate;
};
