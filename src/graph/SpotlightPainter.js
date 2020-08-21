import {
    parsegraph_generateRectangleVertices,
    parsegraph_generateRectangleTexcoords,
    parsegraph_compileProgram
} from '../gl';
import { parsegraph_createPagingBuffer } from '../pagingbuffer';

const parsegraph_SpotlightPainter_VertexShader =
"uniform mat3 u_world;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec2 a_texCoord;\n" +
"attribute vec4 a_color;\n" +
"\n" +
"varying highp vec2 texCoord;\n" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "contentColor = a_color;" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "texCoord = a_texCoord;" +
"}";

const parsegraph_SpotlightPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    "highp float d = min(1.0, length(abs(st)));" +
    "d = 1.0 - pow(d, 0.2);" +
    "gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);" +
"}";

export default function parsegraph_SpotlightPainter(window)
{
    this._window = window;
    if(!this._window) {
        throw new Error("Window must be provided");
    }

    this._program = null;
    this.contextChanged(this._window.gl().isContextLost());
};

parsegraph_SpotlightPainter.prototype.drawSpotlight = function(
    cx, cy, radius, color)
{
    if(this._spotlightBuffer === null) {
        return;
    }
    //console.log(cx + ", " + cy + ", " + radius + " " + color.toString());
    // Append position data.
    this._spotlightBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            cx, cy, radius * 2, radius * 2
        )
    );

    // Append texture coordinate data.
    this._spotlightBuffer.appendData(
        this.a_texCoord,
        parsegraph_generateRectangleTexcoords()
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        this._spotlightBuffer.appendData(
            this.a_color,
            color.r(),
            color.g(),
            color.b(),
            color.a()
        );
    }
};

parsegraph_SpotlightPainter.prototype.drawRectSpotlight = function(
    cx, cy, w, h, color)
{
    if(this._spotlightBuffer === null) {
        return;
    }
    // Append position data.
    this._spotlightBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            cx, cy, w, h
        )
    );

    // Append texture coordinate data.
    this._spotlightBuffer.appendData(
        this.a_texCoord,
        parsegraph_generateRectangleTexcoords()
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        this._spotlightBuffer.appendData(
            this.a_color,
            color.r(),
            color.g(),
            color.b(),
            color.a()
        );
    }
};

parsegraph_SpotlightPainter.prototype.clear = function()
{
    this._spotlightBuffer.clear();
    this._spotlightBuffer.addPage();
};

parsegraph_SpotlightPainter.prototype.contextChanged = function(isLost)
{
    if(isLost) {
        //console.log(new Error("Losing spotlight painter"));
        this._program = null;
        this._spotlightBuffer.clear();
        this._spotlightBuffer = null;
    }
    else {
        //console.log(new Error("Restoring spotlight painter"));
        var gl = this._window.gl();
        this._program = parsegraph_compileProgram(this._window,
            "parsegraph_SpotlightPainter",
            parsegraph_SpotlightPainter_VertexShader,
            parsegraph_SpotlightPainter_FragmentShader
        );
        // Prepare attribute buffers.
        this._spotlightBuffer = parsegraph_createPagingBuffer(gl, this._program);
        this._spotlightBuffer.addPage();

        this.a_position = this._spotlightBuffer.defineAttrib("a_position", 2);
        this.a_texCoord = this._spotlightBuffer.defineAttrib("a_texCoord", 2);
        this.a_color = this._spotlightBuffer.defineAttrib("a_color", 4);
    }
};

parsegraph_SpotlightPainter.prototype.render = function(world, scale)
{
    var gl = this._window.gl();
    if(gl.isContextLost()) {
        return;
    }
    // Cache program locations.
    this.u_world = gl.getUniformLocation(this._program, "u_world");

    // Render spotlights.
    gl.useProgram(this._program);
    gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._spotlightBuffer.renderPages();
};
