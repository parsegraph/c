import TestSuite from '../TestSuite';
import Color from './Color';
import {getTextureSize} from '../gl';
import Window from './Window';
import {defaultFont} from './settings';
/* eslint-disable require-jsdoc */

// TODO Add runs of selected text
let glyphPainterCount = 0;

const glyphPainterVertexShader =
  'uniform mat3 u_world;\n' +
  'uniform highp float u_scale;\n' +
  '' +
  'attribute vec2 a_position;' +
  'attribute vec4 a_color;' +
  'attribute vec4 a_backgroundColor;' +
  'attribute vec2 a_texCoord;' +
  'attribute highp float a_scale;' +
  '' +
  'varying highp vec2 texCoord;' +
  'varying highp vec4 fragmentColor;' +
  'varying highp vec4 backgroundColor;' +
  'varying highp float scale;' +
  '' +
  'void main() {' +
  'gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n' +
  'fragmentColor = a_color;\n' +
  'backgroundColor = a_backgroundColor;\n' +
  'texCoord = a_texCoord;\n' +
  'scale = a_scale * u_scale;\n' +
  '}';

const glyphPainterFragmentShader =
  '#extension GL_OES_standard_derivatives : enable\n' +
  'uniform sampler2D u_glyphTexture;\n' +
  'varying highp vec4 fragmentColor;\n' +
  'varying highp vec4 backgroundColor;' +
  'varying highp vec2 texCoord;\n' +
  'varying highp float scale;\n' +
  '\n' +
  'highp float aastep(highp float threshold, highp float value)\n' +
  '{\n' +
  'highp float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));\n' +
  'return smoothstep(threshold - afwidth, threshold + afwidth, value);\n' +
  '}\n' +
  '\n' +
  'void main() {\n' +
  'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n' +
  'highp float distance = texture2D(u_glyphTexture, texCoord.st).a;' +
  'highp float smoothing=0.5;\n' +
  'highp float opacity = mix(aastep(smoothing, distance),' +
  ' distance, min(0.0, scale));\n' + 'if(backgroundColor.a == 0.0) {' +
  'gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);' +
  '}' +
  'else {' +
  'gl_FragColor = mix(backgroundColor, fragmentColor, opacity);' +
  '}' +
  '}';

export default function GlyphPainter(window, font) {
  if (!font) {
    throw new Error('Font must be provided');
  }
  this._font = font;
  this._id = ++glyphPainterCount;

  this._window = window;
  this._textBuffers = {};
  this._numTextBuffers = 0;
  this._maxSize = 0;

  this._textProgram = null;

  // Position: 2 * 4 (two floats) : 0-7
  // Color: 4 * 4 (four floats) : 8-23
  // Background Color: 4 * 4 (four floats) : 24 - 39
  // Texcoord: 2 * 4 (two floats): 40-47
  // Scale: 4 (one float): 48-51
  this._stride = 52;
  this._vertexBuffer = new Float32Array(this._stride / 4);

  this._color = new Color(1, 1, 1, 1);
  this._backgroundColor = new Color(0, 0, 0, 0);

  this._lines = [];
}

GlyphPainter.prototype.window = function() {
  return this._window;
};

GlyphPainter.prototype.contextChanged = function(isLost) {
  this._textProgram = null;
  this.clear();
};

GlyphPainter.prototype.color = function() {
  return this._color;
};

GlyphPainter.prototype.setColor = function(...args) {
  if (args.length > 1) {
    this._color = new Color(...args);
  } else {
    this._color = args[0];
  }
};

GlyphPainter.prototype.backgroundColor = function() {
  return this._backgroundColor;
};

GlyphPainter.prototype.setBackgroundColor = function(...args) {
  if (args.length > 1) {
    this._backgroundColor = new Color(...args);
  } else {
    this._backgroundColor = args[0];
  }
};

GlyphPainter.prototype.fontSize = function() {
  return this._font.fontSize();
};

GlyphPainter.prototype.font = function() {
  return this._font;
};

export default function GlyphPageRenderer(painter, textureIndex) {
  this._painter = painter;
  this._textureIndex = textureIndex;
  this._glyphBuffer = null;
  this._glyphBufferNumVertices = null;
  this._glyphBufferVertexIndex = 0;
  this._dataBufferVertexIndex = 0;
  this._dataBufferNumVertices = 6;
  this._dataBuffer = new Float32Array(
      (this._dataBufferNumVertices * this._painter._stride) / 4,
  );
}

GlyphPageRenderer.prototype.initBuffer = function(numGlyphs) {
  if (this._glyphBufferNumVertices / 6 === numGlyphs) {
    // console.log("Reusing existing buffer");
    this._glyphBufferVertexIndex = 0;
    this._dataBufferVertexIndex = 0;
    return;
  } else {
    // console.log("Recreating buffer with " + numGlyphs +
    //   " from " + this._glyphBufferNumVertices);
  }
  if (this._glyphBuffer) {
    this.clear();
  }
  const gl = this._painter.window().gl();
  this._glyphBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);
  gl.bufferData(
      gl.ARRAY_BUFFER,
      this._painter._stride * 6 * numGlyphs,
      gl.STATIC_DRAW,
  );
  this._glyphBufferNumVertices = numGlyphs * 6;
};

GlyphPageRenderer.prototype.clear = function() {
  const gl = this._painter.window().gl();
  if (this._glyphBuffer && !gl.isContextLost()) {
    gl.deleteBuffer(this._glyphBuffer);
  }
  this._glyphBuffer = null;
  this._glyphBufferNumVertices = null;
  this._dataBufferVertexIndex = 0;
  this._glyphBufferVertexIndex = 0;
};

GlyphPageRenderer.prototype.flush = function() {
  if (this._dataBufferVertexIndex === 0) {
    return;
  }
  const gl = this._painter.window().gl();
  const stride = this._painter._stride;
  gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);

  if (
    this._dataBufferVertexIndex + this._glyphBufferVertexIndex >
    this._glyphBufferNumVertices
  ) {
    throw new Error(
        'GL buffer of ' +
        this._glyphBufferNumVertices +
        ' vertices is full; cannot flush all ' +
        this._dataBufferVertexIndex +
        ' vertices because the GL buffer already has ' +
        this._glyphBufferVertexIndex +
        ' vertices.',
    );
  }
  if (this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
    // console.log("Writing " + this._dataBufferNumVertices +
    // " vertices to offset " + this._glyphBufferVertexIndex +
    // " of " + this._glyphBufferNumVertices + " vertices");
    gl.bufferSubData(
        gl.ARRAY_BUFFER,
        this._glyphBufferVertexIndex * stride,
        this._dataBuffer,
    );
  } else {
    // console.log("Partial flush (" + this._glyphBufferVertexIndex + "/" +
    // this._glyphBufferNumVertices + " from " +
    // (this._dataBufferVertexIndex*stride/4) + ")");
    gl.bufferSubData(
        gl.ARRAY_BUFFER,
        this._glyphBufferVertexIndex * stride,
        this._dataBuffer.slice(0, (this._dataBufferVertexIndex * stride) / 4),
    );
  }
  this._glyphBufferVertexIndex += this._dataBufferVertexIndex;
  this._dataBufferVertexIndex = 0;
};

GlyphPageRenderer.prototype.writeVertex = function() {
  const pos = (this._dataBufferVertexIndex++ * this._painter._stride) / 4;
  this._dataBuffer.set(this._painter._vertexBuffer, pos);
  if (this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
    this.flush();
  }
};

GlyphPageRenderer.prototype.drawGlyph = function(
    glyphData,
    x,
    y,
    fontScale,
) {
  const gl = this._painter.window().gl();
  const font = this._painter.font();
  const glTextureSize = getTextureSize(gl);
  if (gl.isContextLost()) {
    return;
  }
  const pageTextureSize = font.pageTextureSize();
  const pagesPerRow = glTextureSize / pageTextureSize;
  const pagesPerTexture = Math.pow(pagesPerRow, 2);
  const pageIndex = glyphData.glyphPage._id % pagesPerTexture;
  const pageX = pageTextureSize * (pageIndex % pagesPerRow);
  const pageY = pageTextureSize * Math.floor(pageIndex / pagesPerRow);

  // Position: 2 * 4 (two floats) : 0-7
  // Color: 4 * 4 (four floats) : 8-23
  // Background Color: 4 * 4 (four floats) : 24 - 39
  // Texcoord: 2 * 4 (two floats): 40-47
  // Scale: 4 (one float): 48-51
  const buf = this._painter._vertexBuffer;

  // Append color data.
  const color = this._painter._color;
  buf[2] = color.r();
  buf[3] = color.g();
  buf[4] = color.b();
  buf[5] = color.a();

  // Append background color data.
  const bg = this._painter._backgroundColor;
  buf[6] = bg.r();
  buf[7] = bg.g();
  buf[8] = bg.b();
  buf[9] = bg.a();

  // Add font scale
  buf[12] = fontScale;

  y -= glyphData.ascent;

  // Position data.
  buf[0] = x;
  buf[1] = y;
  // Texcoord data
  buf[10] = (pageX + glyphData.x) / glTextureSize;
  buf[11] = (pageY + glyphData.y) / glTextureSize;
  this.writeVertex();

  // Position data.
  buf[0] = x + glyphData.width * fontScale;
  buf[1] = y;
  // Texcoord data
  buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
  buf[11] = (pageY + glyphData.y) / glTextureSize;
  this.writeVertex();

  // Position data.
  buf[0] = x + glyphData.width * fontScale;
  buf[1] = y + glyphData.height * fontScale;
  // Texcoord data
  buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
  buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
  this.writeVertex();

  // Position data.
  buf[0] = x;
  buf[1] = y;
  // Texcoord data
  buf[10] = (pageX + glyphData.x) / glTextureSize;
  buf[11] = (pageY + glyphData.y) / glTextureSize;
  this.writeVertex();

  // Position data.
  buf[0] = x + glyphData.width * fontScale;
  buf[1] = y + glyphData.height * fontScale;
  // Texcoord data
  buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
  buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
  this.writeVertex();

  // Position data.
  buf[0] = x;
  buf[1] = y + glyphData.height * fontScale;
  // Texcoord data
  buf[10] = (pageX + glyphData.x) / glTextureSize;
  buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
  this.writeVertex();
};

GlyphPainter.prototype.drawLine = function(
    text,
    worldX,
    worldY,
    fontScale,
) {
  this._lines.push({
    text: text,
    x: worldX,
    y: worldY,
    scale: fontScale,
  });
};

GlyphPageRenderer.prototype.render = function() {
  if (!this._glyphBuffer) {
    throw new Error('GlyphPageRenderer must be initialized before rendering');
  }
  this.flush();
  if (this._glyphBufferVertexIndex === 0) {
    return;
  }
  const gl = this._painter.window().gl();
  const glyphTexture = this._painter._font._pages[this._textureIndex]
      ._glyphTexture[this._painter.window().id()];
  // console.log("Rendering " + (this._glyphBufferVertexIndex/6) +
  //   " glyphs of glyph page " + this._textureIndex);
  gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
  gl.uniform1i(this._painter.u_glyphTexture, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);
  // Position: 2 * 4 (two floats) : 0-7
  // Color: 4 * 4 (four floats) : 8-23
  // Background Color: 4 * 4 (four floats) : 24 - 39
  // Texcoord: 2 * 4 (two floats): 40-47
  // Scale: 4 (one float): 48-51
  const painter = this._painter;
  const stride = this._painter._stride;
  gl.vertexAttribPointer(painter.a_position, 2, gl.FLOAT, false, stride, 0);
  gl.vertexAttribPointer(painter.a_color, 4, gl.FLOAT, false, stride, 8);
  gl.vertexAttribPointer(
      painter.a_backgroundColor,
      4,
      gl.FLOAT,
      false,
      stride,
      24,
  );
  gl.vertexAttribPointer(painter.a_texCoord, 2, gl.FLOAT, false, stride, 40);
  gl.vertexAttribPointer(painter.a_scale, 1, gl.FLOAT, false, stride, 48);
  gl.drawArrays(gl.TRIANGLES, 0, this._glyphBufferVertexIndex);
};

GlyphPainter.prototype.drawGlyph = function(
    glyphData,
    x,
    y,
    fontScale,
) {
  if (typeof glyphData !== 'object') {
    glyphData = this._font.getGlyph(glyphData);
  }
  glyphData.painted = true;

  const gl = this.window().gl();
  const glTextureSize = getTextureSize(gl);
  if (gl.isContextLost()) {
    return;
  }
  // console.log("GLTEXTURESIZE=" + this._glTextureSize);
  const pagesPerRow = glTextureSize / this.font().pageTextureSize();
  const pagesPerTexture = Math.pow(pagesPerRow, 2);

  // Select the correct buffer.
  const gpid = Math.floor(glyphData.glyphPage._id / pagesPerTexture);
  const gp = this._textBuffers[gpid];
  if (!gp) {
    throw new Error(
        'GlyphPageRenderer ' + gpid + ' must be available when drawing glyph.',
    );
  }

  if (this._maxSize < glyphData.width * fontScale) {
    this._maxSize = glyphData.width * fontScale;
  }
  gp.drawGlyph(glyphData, x, y, fontScale);
};

GlyphPainter.prototype.initBuffer = function(numGlyphs) {
  this.clear();
  let maxPage = NaN;
  for (const i in numGlyphs) {
    if (i == 'font') {
      continue;
    }
    if (Number.isNaN(maxPage)) {
      maxPage = i;
    }
    maxPage = Math.max(i, maxPage);
    let gp = this._textBuffers[i];
    if (!gp) {
      gp = new GlyphPageRenderer(this, i);
      ++this._numTextBuffers;
      this._textBuffers[i] = gp;
    }
    gp.initBuffer(numGlyphs[i]);
  }
  if (Number.isNaN(maxPage)) {
    maxPage = -1;
  }
};

GlyphPainter.prototype.clear = function() {
  for (const i in this._textBuffers) {
    if (Object.prototype.hasOwnProperty.call(this._textBuffers, i)) {
      const gp = this._textBuffers[i];
      gp.clear();
    }
  }
  this._textBuffers = {};
  this._numTextBuffers = 0;
  this._maxSize = 0;
  this._lines = [];
};

GlyphPainter.prototype.render = function(world, scale) {
  const overlay = this.window().overlay();
  for (let i = 0; i < this._lines.length; ++i) {
    const line = this._lines[i];
    overlay.font = '72px sans-serif';
    overlay.fillText(line.text, line.x, line.y);
  }
  return;
  this._font.update(this._window);
  // console.log(new Error("GlyphPainter scale="+scale));
  // console.log("Max scale of a single largest glyph would be: " +
  //   (this._maxSize *scale));
  if (scale < 0.2 && this._maxSize * scale < 1) {
    return;
  }

  if (this._maxSize / (world[0] / world[8]) < 1) {
    return;
  }

  const gl = this.window().gl();
  if (gl.isContextLost()) {
    return;
  }

  // Compile the shader program.
  if (this._textProgram === null) {
    this._textProgram = compileProgram(
        this.window(),
        'GlyphPainter',
        GlyphPainter_VertexShader,
        GlyphPainter_FragmentShader,
    );
    /* if(gl.getExtension("OES_standard_derivatives") != null) {
            this._textProgram = compileProgram(this.window(),
                "GlyphPainter",
                GlyphPainter_VertexShader,
                GlyphPainter_FragmentShader
            );
        }
        else {
            throw new Error("TextPainter requires' +
              ' OES_standard_derivatives GL extension");
        }*/

    // Cache program locations.
    this.u_world = gl.getUniformLocation(this._textProgram, 'u_world');
    this.u_scale = gl.getUniformLocation(this._textProgram, 'u_scale');
    this.u_glyphTexture = gl.getUniformLocation(
        this._textProgram,
        'u_glyphTexture',
    );
    this.a_position = gl.getAttribLocation(this._textProgram, 'a_position');
    this.a_color = gl.getAttribLocation(this._textProgram, 'a_color');
    this.a_backgroundColor = gl.getAttribLocation(
        this._textProgram,
        'a_backgroundColor',
    );
    this.a_texCoord = gl.getAttribLocation(this._textProgram, 'a_texCoord');
    this.a_scale = gl.getAttribLocation(this._textProgram, 'a_scale');
    // console.log(this.a_scale);
  }

  // Load program.
  gl.useProgram(this._textProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniformMatrix3fv(this.u_world, false, world);
  gl.uniform1f(this.u_scale, scale);

  // Render glyphs for each page.
  gl.enableVertexAttribArray(this.a_position);
  gl.enableVertexAttribArray(this.a_texCoord);
  gl.enableVertexAttribArray(this.a_color);
  gl.enableVertexAttribArray(this.a_backgroundColor);
  gl.enableVertexAttribArray(this.a_scale);
  for (const i in this._textBuffers) {
    if (Object.prototype.hasOwnProperty.call(this._textBuffers, i)) {
      const gp = this._textBuffers[i];
      gp.render();
    }
  }
  gl.disableVertexAttribArray(this.a_position);
  gl.disableVertexAttribArray(this.a_texCoord);
  gl.disableVertexAttribArray(this.a_color);
  gl.disableVertexAttribArray(this.a_backgroundColor);
  gl.disableVertexAttribArray(this.a_scale);
};

const glyphPainterTests = new TestSuite(
    'GlyphPainter',
);

glyphPainterTests.addTest('GlyphPainter', function() {
  const window = new Window();
  const font = defaultFont();

  const painter = new GlyphPainter(window, font);
  painter.initBuffer({0: 1000, 1: 1000});
  for (let i = 0; i < 1000; ++i) {
    painter.drawGlyph(String.fromCharCode(32 + i), 0, 0, 1);
  }
  painter.initBuffer({0: 1000});
  for (let i = 0; i < 400; ++i) {
    painter.drawGlyph(String.fromCharCode(32 + i), 0, 0, 1);
  }
  painter.initBuffer({0: 1000, 1: 1000});
  for (let i = 0; i < 1000; ++i) {
    painter.drawGlyph(String.fromCharCode(32 + i), 0, 0, 1);
  }
  painter.initBuffer({});
  painter.initBuffer({0: 1000, 1: 1000});
  for (let i = 0; i < 1000; ++i) {
    painter.drawGlyph(String.fromCharCode(32 + i), 0, 0, 1);
  }
});
