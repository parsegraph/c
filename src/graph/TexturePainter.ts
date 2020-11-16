import {parsegraph_compileProgram} from '../gl';
import parsegraph_PagingBuffer, {
  parsegraph_createPagingBuffer,
} from '../pagingbuffer';
import Color from './Color';
import parsegraph_Window from './Window';

const parsegraph_TexturePainter_VertexShader =
  'uniform mat3 u_world;\n' +
  '' +
  'attribute vec2 a_position;' +
  'attribute vec2 a_texCoord;' +
  'attribute float a_alpha;' +
  '' +
  'varying highp vec2 texCoord;' +
  'varying highp float alpha;' +
  '' +
  'void main() {' +
  'gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);' +
  'texCoord = a_texCoord;' +
  'alpha = a_alpha;' +
  '}';

const parsegraph_TexturePainter_FragmentShader =
  'uniform sampler2D u_texture;\n' +
  'varying highp vec2 texCoord;\n' +
  'varying highp float alpha;\n' +
  '\n' +
  'void main() {\n' +
  'gl_FragColor = texture2D(u_texture, texCoord.st);' +
  'gl_FragColor.a = gl_FragColor.a * alpha;' +
  '}';

export default class TexturePainter {
  _gl;
  _textureProgram: number;
  _texture: number;
  _texWidth: number;
  _texHeight: number;
  _buffer: parsegraph_PagingBuffer;
  a_position: number;
  a_color: number;
  a_backgroundColor: number;
  a_texCoord: number;
  a_alpha: number;
  u_world: number;
  u_texture: number;
  _color: parsegraph_Color;
  _backgroundColor: parsegraph_Color;
  _alpha: number;

  constructor(
      window: parsegraph_Window,
      textureId: number,
      texWidth: number,
      texHeight: number,
  ) {
    this._gl = window.gl();

    // Compile the shader program.
    this._textureProgram = parsegraph_compileProgram(
        window,
        'parsegraph_TexturePainter',
        parsegraph_TexturePainter_VertexShader,
        parsegraph_TexturePainter_FragmentShader,
    );
    this._texture = textureId;
    this._texWidth = texWidth;
    this._texHeight = texHeight;

    // Prepare attribute buffers.
    this._buffer = parsegraph_createPagingBuffer(
        this._gl,
        this._textureProgram,
    );
    this.a_position = this._buffer.defineAttrib('a_position', 2);
    this.a_color = this._buffer.defineAttrib('a_color', 4);
    this.a_backgroundColor = this._buffer.defineAttrib('a_backgroundColor', 4);
    this.a_texCoord = this._buffer.defineAttrib('a_texCoord', 2);
    this.a_alpha = this._buffer.defineAttrib('a_alpha', 1);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(this._textureProgram, 'u_world');
    this.u_texture = this._gl.getUniformLocation(
        this._textureProgram,
        'u_texture',
    );

    this._color = new Color(1, 1, 1, 1);
    this._backgroundColor = new Color(0, 0, 0, 0);

    this._buffer.addPage();
    this._alpha = 1;
  }

  texture() {
    return this._texture;
  }

  setAlpha(alpha: number): void {
    this._alpha = alpha;
  }

  drawWholeTexture(
      x: number,
      y: number,
      width: number,
      height: number,
      scale: number,
  ): void {
    return this.drawTexture(
        0,
        0,
        this._texWidth,
        this._texHeight,
        x,
        y,
        width,
        height,
        scale,
    );
  }

  drawTexture(
      iconX: number,
      iconY: number,
      iconWidth: number,
      iconHeight: number,
      x: number,
      y: number,
      width: number,
      height: number,
      scale: number,
  ) {
    // Append position data.
    this._buffer.appendData(this.a_position, [
      x,
      y,
      x + width * scale,
      y,
      x + width * scale,
      y + height * scale,

      x,
      y,
      x + width * scale,
      y + height * scale,
      x,
      y + height * scale,
    ]);

    // Append texture coordinate data.
    this._buffer.appendData(this.a_texCoord, [
      iconX / this._texWidth,
      (iconY + iconHeight) / this._texHeight,

      (iconX + iconWidth) / this._texWidth,
      (iconY + iconHeight) / this._texHeight,

      (iconX + iconWidth) / this._texWidth,
      iconY / this._texHeight,

      iconX / this._texWidth,
      (iconY + iconHeight) / this._texHeight,

      (iconX + iconWidth) / this._texWidth,
      iconY / this._texHeight,

      iconX / this._texWidth,
      iconY / this._texHeight,
    ]);
    for (let i = 0; i < 6; ++i) {
      this._buffer.appendData(this.a_alpha, this._alpha);
    }
  }

  clear(): void {
    this._buffer.clear();
    this._buffer.addPage();
  }

  render(world: number[]): void {
    const gl = this._gl;

    // Load program.
    this._gl.useProgram(this._textureProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.uniform1i(this.u_texture, 0);

    // Render texture.
    gl.uniformMatrix3fv(this.u_world, false, world);
    this._buffer.renderPages();
  }
}
