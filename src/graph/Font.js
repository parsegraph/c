import {SDF_RADIUS, MAX_PAGE_WIDTH} from './settings';
import TinySDF from '../sdf';

/* eslint-disable require-jsdoc  */

export function GlyphPage(font) {
  this._id = font._maxPage++;
  this._glyphTexture = {};
  this._firstGlyph = false;
  this._lastGlyph = false;
  this.next = null;
}

export function GlyphData(
    glyphPage,
    glyph,
    x,
    y,
    width,
    height,
    ascent,
    descent,
    advance,
    radius,
) {
  this.glyphPage = glyphPage;
  this.letter = glyph;
  this.length = this.letter.length;
  this.painted = false;
  this.x = x;
  this.y = y;
  this.width = width + radius * 2;
  this.ascent = ascent;
  this.descent = descent;
  this.height = this.ascent + this.descent + radius * 2;
  this.advance = advance;
  this.next = null;
}

export function FontWindow(font, window) {
  this._glTextureSize = null;
  this._numGlyphs = 0;
  this._textureArray = null;
}

/*
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
let fontCount = 0;
export default function Font(fontSizePixels, fontName, fillStyle) {
  this._id = fontCount++;
  this._fontSize = fontSizePixels;
  this._fontName = fontName;
  this._fillStyle = fillStyle;
  // console.log("Creating font " + this);

  this._measureCanvas = document.createElement('canvas');
  this._measureCtx = this._measureCanvas.getContext('2d');
  this._measureCtx.font = this.font();
  this._measureCtx.fillStyle = this._fillStyle;
  // this._measureCtx.textBaseline = 'top';
  console.log(
      'Font font',
      this._measureCtx.font,
      this._measureCtx.fillStyle,
  );

  this._windows = {};
  this._renderCanvas = null;
  this._renderCtx = null;

  this._pages = [];
  this._numGlyphs = 0;

  this._glyphData = {};
  this._currentRowHeight = 0;

  // Glyph atlas working position.
  this._padding = SDF_RADIUS * 2; // this.fontSize() / 4;
  this._x = this._padding;
  this._y = this._padding;

  this._maxPage = 0;

  this._sdf = new TinySDF(fontSizePixels, null, null, fontName);
}

Font.prototype.toString = function() {
  return (
    '[Font ' +
    this._id +
    ': ' +
    this._fontName +
    ' ' +
    this._fillStyle +
    ']'
  );
};

Font.prototype.getGlyph = function(glyph) {
  if (typeof glyph !== 'string') {
    glyph = String.fromCharCode(glyph);
  }
  let glyphData = this._glyphData[glyph];
  if (glyphData !== undefined) {
    return glyphData;
  }
  const letter = this._measureCtx.measureText(glyph);
  const letterWidth = letter.width;
  const letterAscent = letter.actualBoundingBoxAscent || 0;
  const letterDescent = letter.actualBoundingBoxDescent || 0;
  const letterHeight = letterAscent + letterDescent;
  const advance = letterWidth;

  let glyphPage = null;
  if (this._pages.length === 0) {
    glyphPage = new GlyphPage(this);
    this._pages.push(glyphPage);
  } else {
    glyphPage = this._pages[this._pages.length - 1];
  }

  if (this._currentRowHeight < letterHeight) {
    this._currentRowHeight = letterHeight;
  }

  const pageTextureSize = this.pageTextureSize();
  if (this._x + letterWidth + this._padding > pageTextureSize) {
    // Move to the next row.
    this._x = this._padding;
    this._y += this._currentRowHeight + this._padding;
    this._currentRowHeight = letterHeight;
  }
  if (this._y + this._currentRowHeight + this._padding > pageTextureSize) {
    // Move to the next page.
    glyphPage = new GlyphPage(this);
    this._pages.push(glyphPage);
    this._x = this._padding;
    this._y = this._padding;
    this._currentRowHeight = letterHeight;
  }

  glyphData = new GlyphData(
      glyphPage,
      glyph,
      this._x,
      this._y,
      letterWidth,
      letterHeight,
      letterAscent,
      letterDescent,
      advance,
      this._sdf.radius,
  );
  this._glyphData[glyph] = glyphData;

  if (glyphPage._lastGlyph) {
    glyphPage._lastGlyph.next = glyphData;
    glyphPage._lastGlyph = glyphData;
  } else {
    glyphPage._firstGlyph = glyphData;
    glyphPage._lastGlyph = glyphData;
  }

  this._x += glyphData.width + this._padding;
  ++this._numGlyphs;

  return glyphData;
};
Font.prototype.get = Font.prototype.getGlyph;

Font.prototype.hasGlyph = function(glyph) {
  const glyphData = this._glyphData[glyph];
  return glyphData !== undefined;
};
Font.prototype.has = Font.prototype.hasGlyph;

Font.prototype.contextChanged = function(isLost, window) {
  if (!isLost) {
    return;
  }
  this.dispose(window);
};

Font.prototype.update = function(window) {
  if (!window) {
    throw new Error('Window must be provided');
  }
  let gl = window.gl();
  if (gl.isContextLost()) {
    return;
  }
  const td = new Date();
  const pageTextureSize = this.pageTextureSize();
  let ctx = this._windows[window.id()];
  if (!ctx) {
    ctx = new FontWindow(this, window);
    this._windows[window.id()] = ctx;
  }
  gl = window.gl();
  if (gl.isContextLost()) {
    return;
  }
  if (!ctx._glTextureSize) {
    ctx._glTextureSize = getTextureSize(gl);
    // console.log("GLTEXTURESIZE=" + ctx._glTextureSize);
    ctx._textureArray = new Uint8Array(ctx._glTextureSize * ctx._glTextureSize);
  }
  if (!this._renderCanvas) {
    this._renderCanvas = document.createElement('canvas');
    this._renderCanvas.width = pageTextureSize;
    this._renderCanvas.height = pageTextureSize;
    this._renderCtx = this._renderCanvas.getContext('2d');
    this._renderCtx.font = this.font();
    this._renderCtx.fillStyle = this._fillStyle;
  }
  if (ctx._numGlyphs === this._numGlyphs) {
    // console.log("Dont need update");
    return;
  }
  // console.log(this.fullName() +
  //   " has " +
  //   this._numGlyphs +
  //   " and window has " +
  //   ctx._numGlyphs);
  ctx._numGlyphs = 0;

  let pageX = 0;
  let pageY = 0;
  let curTexture = null;
  let pagesUpdated = 0;
  for (const i in this._pages) {
    const page = this._pages[i];
    // console.log("Painting page " + page._id);
    this._renderCtx.clearRect(0, 0, pageTextureSize, pageTextureSize);
    for (
      let glyphData = page._firstGlyph;
      glyphData;
      glyphData = glyphData.next
    ) {
      const distanceGlyph = this._sdf.draw(glyphData.letter);
      const imageData = this._sdf.createImageData(this._renderCtx);
      imageData.data.set(distanceGlyph);
      this._renderCtx.putImageData(imageData, glyphData.x, glyphData.y);
      ++ctx._numGlyphs;
    }

    // Create texture.
    if (!curTexture) {
      curTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, curTexture);
      const ut = new Date();
      gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.ALPHA,
          ctx._glTextureSize,
          ctx._glTextureSize,
          0,
          gl.ALPHA,
          gl.UNSIGNED_BYTE,
          ctx._textureArray,
      );
      // console.log("Upload time: " + elapsed(ut));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      // Prevents t-coordinate wrapping (repeating).
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    page._glyphTexture[window.id()] = curTexture;

    // Draw from 2D canvas.
    gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        pageX,
        pageY,
        gl.ALPHA,
        gl.UNSIGNED_BYTE,
        this._renderCanvas,
    );
    pageX += pageTextureSize;
    if (pageX >= ctx._glTextureSize) {
      pageY += pageTextureSize;
      pageX = 0;
    }
    if (pageY >= ctx._glTextureSize) {
      pageY = 0;
      pageX = 0;
      gl.generateMipmap(gl.TEXTURE_2D);
      curTexture = null;
    }
    ++pagesUpdated;
  }
  this._renderCanvas.style.position = 'absolute';
  this._renderCanvas.style.pointerEvents = 'none';
  this._renderCanvas.style.right = '0';
  this._renderCanvas.style.top = '0';
  // document.body.appendChild(this._renderCanvas);
  if (curTexture) {
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  // console.log("Font updated " +
  //   pagesUpdated +
  //   " page(s) in " +
  //   elapsed(td) +
  //   "ms");
};

Font.prototype.dispose = function(window) {
  const ctx = this._windows[window.id()];
  if (!ctx) {
    return;
  }
  const gl = ctx._gl;
  for (const i in this._pages) {
    const page = this._pages[i];
    if (page._glyphTexture[window.id()]) {
      const tex = page._glyphTexture[window.id()];
      if (gl && !gl.isContextLost()) {
        gl.deleteTexture(tex);
      }
      delete page._glyphTexture[window.id()];
    }
  }
  ctx._numGlyphs = 0;
};

Font.prototype.clear = function() {
  for (const i in this._pages) {
    const page = this._pages[i];
    for (const wid in page._glyphTexture) {
      const tex = page._glyphTexture[wid];
      const ctx = this._windows[wid];
      if (ctx && ctx._gl && !ctx._gl.isContextLost()) {
        ctx._gl.deleteTexture(tex);
      }
    }
    page._glyphTexture = {};
  }
  for (const wid in this._windows) {
    if (Object.prototype.hasOwnProperty.call(this._windows, wid)) {
      this._windows[wid]._numGlyphs = 0;
    }
  }
};

Font.prototype.font = function() {
  return this._fontSize + 'px ' + this._fontName;
};

Font.prototype.pageTextureSize = function() {
  return MAX_PAGE_WIDTH;
};

Font.prototype.fontBaseline = function() {
  return this.fontSize();
};

Font.prototype.fontSize = function() {
  return this._fontSize;
};

Font.prototype.fullName = function() {
  return this._fontName + ' ' + this._fillStyle;
};

Font.prototype.fontName = function() {
  return this._fontName;
};

Font.prototype.isNewline = function(c) {
  return c === '\n';
};
