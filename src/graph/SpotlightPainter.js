import {
  generateRectangleVertices,
  generateRectangleTexcoords,
  compileProgram,
} from '../gl';
import {createPagingBuffer} from '../pagingbuffer';

const spotlightPainterVertexShader =
  'uniform mat3 u_world;\n' +
  '\n' +
  'attribute vec2 a_position;\n' +
  'attribute vec2 a_texCoord;\n' +
  'attribute vec4 a_color;\n' +
  '\n' +
  'varying highp vec2 texCoord;\n' +
  'varying highp vec4 contentColor;\n' +
  '\n' +
  'void main() {\n' +
  'contentColor = a_color;' +
  'gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);' +
  'texCoord = a_texCoord;' +
  '}';

const spotlightPainterFragmentShader =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  '' +
  'varying highp vec4 contentColor;\n' +
  'varying highp vec2 texCoord;\n' +
  '\n' +
  'void main() {\n' +
  'highp vec2 st = texCoord;\n' +
  'st = st * 2.0 - 1.0;' +
  '\n' +
  'highp float d = min(1.0, length(abs(st)));' +
  'd = 1.0 - pow(d, 0.2);' +
  'gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);' +
  '}';

// eslint-disable-next-line require-jsdoc
export default function SpotlightPainter(window) {
  this._window = window;
  if (!this._window) {
    throw new Error('Window must be provided');
  }

  this._program = null;
  this.contextChanged(this._window.gl().isContextLost());
}

SpotlightPainter.prototype.drawSpotlight = function(
    cx,
    cy,
    radius,
    color,
) {
  if (this._spotlightBuffer === null) {
    return;
  }
  // console.log(cx + ", " + cy + ", " + radius + " " + color.toString());
  // Append position data.
  this._spotlightBuffer.appendData(
      this.a_position,
      generateRectangleVertices(cx, cy, radius * 2, radius * 2),
  );

  // Append texture coordinate data.
  this._spotlightBuffer.appendData(
      this.a_texCoord,
      generateRectangleTexcoords(),
  );

  // Append color data.
  for (let k = 0; k < 3 * 2; ++k) {
    this._spotlightBuffer.appendData(
        this.a_color,
        color.r(),
        color.g(),
        color.b(),
        color.a(),
    );
  }
};

SpotlightPainter.prototype.drawRectSpotlight = function(
    cx,
    cy,
    w,
    h,
    color,
) {
  if (this._spotlightBuffer === null) {
    return;
  }
  // Append position data.
  this._spotlightBuffer.appendData(
      this.a_position,
      generateRectangleVertices(cx, cy, w, h),
  );

  // Append texture coordinate data.
  this._spotlightBuffer.appendData(
      this.a_texCoord,
      generateRectangleTexcoords(),
  );

  // Append color data.
  for (let k = 0; k < 3 * 2; ++k) {
    this._spotlightBuffer.appendData(
        this.a_color,
        color.r(),
        color.g(),
        color.b(),
        color.a(),
    );
  }
};

SpotlightPainter.prototype.clear = function() {
  this._spotlightBuffer.clear();
  this._spotlightBuffer.addPage();
};

SpotlightPainter.prototype.contextChanged = function(isLost) {
  if (isLost) {
    // console.log(new Error("Losing spotlight painter"));
    this._program = null;
    this._spotlightBuffer.clear();
    this._spotlightBuffer = null;
  } else {
    // console.log(new Error("Restoring spotlight painter"));
    const gl = this._window.gl();
    this._program = compileProgram(
        this._window,
        'SpotlightPainter',
        SpotlightPainter_VertexShader,
        SpotlightPainter_FragmentShader,
    );
    // Prepare attribute buffers.
    this._spotlightBuffer = createPagingBuffer(gl, this._program);
    this._spotlightBuffer.addPage();

    this.a_position = this._spotlightBuffer.defineAttrib('a_position', 2);
    this.a_texCoord = this._spotlightBuffer.defineAttrib('a_texCoord', 2);
    this.a_color = this._spotlightBuffer.defineAttrib('a_color', 4);
  }
};

SpotlightPainter.prototype.render = function(world, scale) {
  const gl = this._window.gl();
  if (gl.isContextLost()) {
    return;
  }
  // Cache program locations.
  this.u_world = gl.getUniformLocation(this._program, 'u_world');

  // Render spotlights.
  gl.useProgram(this._program);
  gl.uniformMatrix3fv(this.u_world, false, world);
  this._spotlightBuffer.renderPages();
};
