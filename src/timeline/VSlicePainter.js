parsegraph_VSlicePainter_VertexShader =
  'uniform mat3 u_world;\n' +
  '\n' +
  'attribute vec2 a_position;\n' +
  'attribute vec2 a_texCoord;\n' +
  'attribute vec4 a_color;\n' +
  '\n' +
  'varying highp float offset;\n' +
  'varying highp vec4 contentColor;\n' +
  '\n' +
  'void main() {\n' +
  'gl_Position = vec4(a_position.x, (u_world * vec3(0, a_position.y, 1.0)).y, 0.0, 1.0);' +
  'contentColor = a_color;' +
  'offset = a_texCoord.x;' +
  '}';

parsegraph_VSlicePainter_FragmentShader =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  '' +
  'varying highp vec4 contentColor;\n' +
  'varying highp float offset;\n' +
  '\n' +
  'void main() {\n' +
  // "highp float brightness = sin(offset * 3.14159);" +
  'gl_FragColor = contentColor;' +
  '}';

function parsegraph_VSlicePainter(gl) {
  this._gl = gl;

  // Compile the shader program.
  this._blockProgram = this._gl.createProgram();

  this._gl.attachShader(
      this._blockProgram,
      compileShader(
          this._gl,
          parsegraph_VSlicePainter_VertexShader,
          this._gl.VERTEX_SHADER,
      ),
  );

  this._gl.attachShader(
      this._blockProgram,
      compileShader(
          this._gl,
          parsegraph_VSlicePainter_FragmentShader,
          this._gl.FRAGMENT_SHADER,
      ),
  );

  this._gl.linkProgram(this._blockProgram);
  if (!this._gl.getProgramParameter(this._blockProgram, this._gl.LINK_STATUS)) {
    throw new Error('VSlicePainter program failed to link.');
  }

  // Prepare attribute buffers.
  this._blockBuffer = parsegraph_createPagingBuffer(
      this._gl,
      this._blockProgram,
  );
  this.a_position = this._blockBuffer.defineAttrib('a_position', 2);
  this.a_texCoord = this._blockBuffer.defineAttrib('a_texCoord', 2);
  this.a_color = this._blockBuffer.defineAttrib('a_color', 4);

  // Cache program locations.
  this.u_world = this._gl.getUniformLocation(this._blockProgram, 'u_world');
}

parsegraph_VSlicePainter.prototype.drawSlice = function(start, size, color) {
  // console.log("Drawing slice: " + start + ", " + size);
  if (color === undefined) {
    color = new parsegraph_Color(1, 1, 1, 1);
  }

  // Append position data.
  this._blockBuffer.appendData(
      this.a_position,
      -1,
      start,
      -1,
      start + size,
      1,
      start + size,
      -1,
      start,
      1,
      start + size,
      1,
      start,
  );

  // Append texture coordinate data.
  this._blockBuffer.appendData(
      this.a_texCoord,
      parsegraph_generateRectangleTexcoords(),
  );

  // Append color data.
  for (let k = 0; k < 3 * 2; ++k) {
    this._blockBuffer.appendData(
        this.a_color,
        color.r(),
        color.g(),
        color.b(),
        color.a(),
    );
  }
};

parsegraph_VSlicePainter.prototype.clear = function() {
  this._blockBuffer.clear();
};

parsegraph_VSlicePainter.prototype.render = function(world) {
  // Render blocks.
  this._gl.useProgram(this._blockProgram);
  this._gl.uniformMatrix3fv(this.u_world, false, world);
  this._blockBuffer.renderPages();
};
