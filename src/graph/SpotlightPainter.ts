import {
  generateRectangleVertices,
  generateRectangleTexcoords,
  compileProgram,
} from '../gl';
import PagingBuffer from '../pagingbuffer';
/* eslint-disable require-jsdoc */

import spotlightPainterVertexShader from './SpotlightPainter_VertexShader.glsl';
import spotlightPainterFragmentShader from './SpotlightPainter_FragmentShader.glsl';

export default class SpotlightPainter {
  _window: Window;
  _program: any;

  _spotlightBuffer: PagingBuffer;
  a_position: any;
  a_texCoord: any;
  a_color: any;


  constructor(window) {
    this._window = window;
    if (!this._window) {
      throw new Error('Window must be provided');
    }

    this._program = null;
    this.contextChanged(this._window.gl().isContextLost());
  }

  drawSpotlight(
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

  drawRectSpotlight(
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

  clear() {
    this._spotlightBuffer.clear();
    this._spotlightBuffer.addPage();
  };

  contextChanged(isLost) {
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
          spotlightPainterVertexShader,
          spotlightPainterFragmentShader,
      );
      // Prepare attribute buffers.
      this._spotlightBuffer = new PagingBuffer(gl, this._program);
      this._spotlightBuffer.addPage();

      this.a_position = this._spotlightBuffer.defineAttrib('a_position', 2);
      this.a_texCoord = this._spotlightBuffer.defineAttrib('a_texCoord', 2);
      this.a_color = this._spotlightBuffer.defineAttrib('a_color', 4);
    }
  };

  render(world, scale) {
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
  }

}
