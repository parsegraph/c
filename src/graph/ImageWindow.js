IMAGEWINDOW_COUNT = 0;
/* eslint-disable require-jsdoc */

export default function ImageWindow(width, height) {
  if (!width || !height) {
    throw new Error(
        'ImageWindow must receive a width and height during construction',
    );
  }
  if (!INITIALIZED) {
    throw new Error(
        'Parsegraph must be initialized using initialize()',
    );
  }
  this._id = ++IMAGEWINDOW_COUNT;
  this._backgroundColor = BACKGROUND_COLOR;

  this._schedulerFunc = null;
  this._schedulerFuncThisArg = null;

  // The canvas that will be drawn to.
  this._canvas = document.createElement('canvas');
  const that = this;
  this._canvas.addEventListener(
      'webglcontextlost',
      function(event) {
        console.log('Context lost');
        event.preventDefault();
        that.onContextChanged(true);
      },
      false,
  );
  this._canvas.addEventListener(
      'webglcontextrestored',
      function() {
        console.log('Context restored');
        that.onContextChanged(false);
      },
      false,
  );
  this._canvas.addEventListener(
      'contextmenu',
      function(e) {
        e.preventDefault();
      },
      false,
  );
  this._canvas.style.display = 'block';
  this._canvas.setAttribute('tabIndex', 0);

  // GL content, not created until used.
  this._gl = null;
  this._shaders = {};

  this._layoutList = new LayoutList(
      COMPONENT_LAYOUT_HORIZONTAL,
  );

  this._textureSize = NaN;

  this._needsUpdate = true;

  this.setExplicitSize(width, height);
  this.newImage();
  this._imageCanvas = document.createElement('canvas');
  this._imageCanvas.width = this.width();
  this._imageCanvas.height = this.height();
  this._imageContext = this._imageCanvas.getContext('2d');
}

ImageWindow.prototype.log = function() {};

ImageWindow.prototype.clearLog = function() {};

ImageWindow.prototype.isOffscreen = function() {
  return true;
};

ImageWindow.prototype.numComponents = function() {
  return this._layoutList.count();
};

ImageWindow.prototype.layout = function(target) {
  let targetSize = null;
  this.forEach(function(comp, compSize) {
    if (target === comp) {
      targetSize = compSize;
      return true;
    }
  }, this);
  if (!targetSize) {
    throw new Error('Layout target must be a child component of this window');
  }
  return targetSize;
};

ImageWindow.prototype.handleEvent = function(eventType, inputData) {
  if (eventType === 'tick') {
    let needsUpdate = false;
    this.forEach(function(comp) {
      needsUpdate = comp.handleEvent('tick', inputData) || needsUpdate;
    }, this);
    return needsUpdate;
  }
  return false;
};

ImageWindow.prototype.getSize = function(sizeOut) {
  sizeOut.setX(0);
  sizeOut.setY(0);
  sizeOut.setWidth(this.width());
  sizeOut.setHeight(this.height());
};

ImageWindow.prototype.forEach = function(func, funcThisArg) {
  const windowSize = new Rect();
  this.getSize(windowSize);
  return this._layoutList.forEach(func, funcThisArg, windowSize);
};

ImageWindow.prototype.scheduleUpdate = function() {
  // console.log("Window is scheduling update");
  if (this._schedulerFunc) {
    this._schedulerFunc.call(this._schedulerFuncThisArg, this);
  }
};

ImageWindow.prototype.setOnScheduleUpdate = function(
    schedulerFunc,
    schedulerFuncThisArg,
) {
  this._schedulerFunc = schedulerFunc;
  this._schedulerFuncThisArg = schedulerFuncThisArg;
};

ImageWindow.prototype.id = function() {
  return this._id;
};

ImageWindow.prototype.shaders = function() {
  return this._shaders;
};

ImageWindow.prototype.textureSize = function() {
  if (this._gl.isContextLost()) {
    return NaN;
  }
  if (Number.isNaN(this._textureSize)) {
    this._textureSize = Math.min(512, getTextureSize(this._gl));
  }
  return this._textureSize;
};

ImageWindow.prototype.onContextChanged = function(isLost) {
  if (isLost) {
    const keys = [];
    for (const k in this._shaders) {
      if (Object.prototype.hasOwnProperty.call(this._shaders, k)) {
        keys.push(k);
      }
    }
    for (const i in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, i)) {
        delete this._shaders[keys[i]];
      }
    }
  }
  this.forEach(function(comp) {
    if (comp.contextChanged) {
      comp.contextChanged(isLost, this);
    }
  }, this);
};

ImageWindow.prototype.canvas = function() {
  return this._canvas;
};

ImageWindow.prototype.gl = function() {
  if (this._gl) {
    return this._gl;
  }
  // this._gl = this._canvas.getContext("webgl2", {
  // antialias:false
  // });
  if (this._gl) {
    this.render = this.renderWebgl2;
    return this._gl;
  }
  this._gl = this._canvas.getContext('webgl', {preserveDrawingBuffer: true});
  if (this._gl) {
    return this._gl;
  }
  throw new Error('GL context is not supported');
};

ImageWindow.prototype.setGL = function(gl) {
  this._gl = gl;
};

ImageWindow.prototype.setExplicitSize = function(w, h) {
  this._explicitWidth = w;
  this._explicitHeight = h;
};

ImageWindow.prototype.upscale = function() {
  return 2;
};

ImageWindow.prototype.getWidth = function() {
  return this._explicitWidth * this.upscale();
};
ImageWindow.prototype.width =
  ImageWindow.prototype.getWidth;

ImageWindow.prototype.getHeight = function() {
  return this._explicitHeight * this.upscale();
};
ImageWindow.prototype.height =
  ImageWindow.prototype.getHeight;

ImageWindow.prototype.addWidget = function(widget) {
  return this.addComponent(widget.component());
};

ImageWindow.prototype.addComponent = function(comp) {
  return this.addHorizontal(comp, null);
};

ImageWindow.prototype.addHorizontal = function(comp, other) {
  comp.setOwner(this);
  this.scheduleUpdate();
  if (!other) {
    this._layoutList.addHorizontal(comp);
    return;
  }
  const container = this._layoutList.contains(other);
  if (!container) {
    throw new Error('Window must contain the given reference component');
  }
  container.addHorizontal(comp);
};

ImageWindow.prototype.addVertical = function(comp, other) {
  comp.setOwner(this);
  this.scheduleUpdate();
  if (!other) {
    this._layoutList.addVertical(comp);
    return;
  }
  const container = this._layoutList.contains(other);
  if (!container) {
    throw new Error('Window must contain the given reference component');
  }
  container.addVertical(comp);
  console.log(this._layoutList);
  console.log(this._layoutList);
};

ImageWindow.prototype.removeComponent = function(compToRemove) {
  this.scheduleUpdate();
  if (compToRemove === this._focusedComponent) {
    if (this._focusedComponent) {
      this._focusedComponent.handleEvent('blur');
    }
    const prior = this._layoutList.getPrevious(compToRemove);
    const next = this._layoutList.getNext(compToRemove);
    this._focusedComponent = prior || next;
  }
  return this._layoutList.remove(compToRemove);
};

ImageWindow.prototype.tick = function(startTime) {
  let needsUpdate = false;
  this.forEach(function(comp) {
    needsUpdate = comp.handleEvent('tick', startTime) || needsUpdate;
  }, this);
  return needsUpdate;
};

ImageWindow.prototype.paint = function(timeout) {
  if (this.gl().isContextLost()) {
    return;
  }
  // console.log("Painting window");
  this._shaders.gl = this.gl();
  this._shaders.timeout = timeout;

  let needsUpdate = false;
  const startTime = new Date();
  const compCount = this.numComponents();
  while (timeout > 0) {
    this.forEach(function(comp) {
      needsUpdate = comp.paint(timeout / compCount) || needsUpdate;
    }, this);
    timeout = Math.max(0, timeout - elapsed(startTime));
  }
  return needsUpdate;
};

ImageWindow.prototype.setBackground = function(color, ...args) {
  if (arguments.length > 1) {
    return this.setBackground(createColor.apply(this, ...args));
  }
  this._backgroundColor = color;
};


// Retrieves the current background color.

ImageWindow.prototype.backgroundColor = function() {
  return this._backgroundColor;
};


// Returns whether the window has a nonzero client width and height.

ImageWindow.prototype.canProject = function() {
  const displayWidth = this.getWidth();
  const displayHeight = this.getHeight();

  return displayWidth != 0 && displayHeight != 0;
};

ImageWindow.prototype.renderBasic = function() {
  const gl = this.gl();
  if (this.gl().isContextLost()) {
    return false;
  }
  // console.log("Rendering window");
  if (!this.canProject()) {
    throw new Error(
        'Refusing to render to an unprojectable window.' +
        ' Use canProject() to handle, and parent this' +
        ' window\'s container to fix.',
    );
  }

  const compSize = new Rect();
  let needsUpdate = false;
  gl.clearColor(
      this._backgroundColor.r(),
      this._backgroundColor.g(),
      this._backgroundColor.b(),
      this._backgroundColor.a(),
  );
  gl.enable(gl.SCISSOR_TEST);
  this.forEach(function(comp, compSize) {
    // console.log("Rendering: " + comp.peer().id());
    // console.log("Rendering component of size " +
    //   compSize.width() + "x" + compSize.height());
    gl.scissor(compSize.x(), compSize.y(), compSize.width(), compSize.height());
    gl.viewport(
        compSize.x(),
        compSize.y(),
        compSize.width(),
        compSize.height(),
    );
    needsUpdate =
      comp.render(compSize.width(), compSize.height()) || needsUpdate;
  }, this);
  gl.disable(gl.SCISSOR_TEST);

  return needsUpdate;
};

ImageWindow.prototype.loadImageFromTexture = function(
    gl,
    texture,
    width,
    height,
) {
  // Create a framebuffer backed by the texture
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
  );

  // Read the contents of the framebuffer
  const data = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);

  gl.deleteFramebuffer(framebuffer);

  // Create a 2D canvas to store the result
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  // Copy the pixels to a 2D canvas
  const imageData = context.createImageData(width, height);
  imageData.data.set(data);
  context.putImageData(imageData, 0, 0);

  this._image.src = canvas.toDataURL();
};

ImageWindow.prototype.image = function() {
  return this._image;
};

ImageWindow.prototype.newImage = function() {
  this._image = new Image();
  this._image.style.width = Math.floor(this._explicitWidth) + 'px';
  this._image.style.height = Math.floor(this._explicitHeight) + 'px';
};

ImageWindow.prototype.render = function() {
  const needsUpdate = this.renderBasic();
  const gl = this.gl();
  const targetTextureWidth = this.width();
  const targetTextureHeight = this.height();

  if (!this._fb) {
    const fb = gl.createFramebuffer();
    this._fb = fb;

    this._targetTexture = gl.createTexture();
    const targetTexture = this._targetTexture;

    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    {
      // define size and format of level 0
      const level = 0;
      const internalFormat = gl.RGBA;
      const border = 0;
      const format = gl.RGBA;
      const type = gl.UNSIGNED_BYTE;
      const data = null;
      gl.texImage2D(
          gl.TEXTURE_2D,
          level,
          internalFormat,
          targetTextureWidth,
          targetTextureHeight,
          border,
          format,
          type,
          data,
      );

      // set the filtering so we don't need mips
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        attachmentPoint,
        gl.TEXTURE_2D,
        targetTexture,
        level,
    );
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fb);
  }

  VFLIP = true;
  this.renderBasic();
  VFLIP = false;

  this.loadImageFromTexture(
      gl,
      this._targetTexture,
      targetTextureWidth,
      targetTextureHeight,
  );

  return needsUpdate;
};
