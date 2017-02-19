parsegraph_TextCaretPainter_VertexShader =
"uniform mat3 u_world;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec2 a_texCoord;\n" +
"" +
"varying highp vec2 texCoord;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "texCoord = a_texCoord;" +
"}";

parsegraph_TextCaretPainter_FragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"uniform sampler2D u_glyphTexture;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp vec4 fragmentColor;\n" +
"\n" +
"void main() {\n" +
    "highp float dist = texture2D(u_glyphTexture, texCoord.st).r;" +
    "highp float edgeDistance = 0.5;" +
    "highp float opacity = aastep(edgeDistance, dist);" +
    "opacity = dist;\n" +
    "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);" +
"}";

/**
 * Draws a one-pixel thick text caret.
 */
function parsegraph_TextCaretPainter(gl, camera)
{
    if(!gl) {
        throw new Error("gl must be provided");
    }
    if(!camera) {
        throw new Error("camera must be provided");
    }
    this._gl = gl;
    this._camera = camera;

    // Compile the shader program.
    this._textProgram = this._gl.createProgram();

    this._gl.attachShader(
        this._textProgram,
        compileShader(
            this._gl,
            parsegraph_TextCaretPainter_VertexShader,
            this._gl.VERTEX_SHADER
        )
    );

    this._gl.attachShader(
        this._textProgram,
        compileShader(
            this._gl,
            parsegraph_TextCaretPainter_FragmentShader,
            this._gl.FRAGMENT_SHADER
        )
    );

    this._gl.linkProgram(this._textProgram);
    if(!this._gl.getProgramParameter(
        this._textProgram, this._gl.LINK_STATUS
    )) {
        throw new Error("TextCaretPainter program failed to link.");
    }

    // Prepare attribute buffers.
    this._textBuffer = parsegraph_createPagingBuffer(
        this._gl, this._textProgram
    );
    this.a_position = this._textBuffer.defineAttrib("a_position", 2);
    this.a_texCoord = this._textBuffer.defineAttrib("a_texCoord", 2);
    this.a_scale = this._textBuffer.defineAttrib("a_scale", 1);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textProgram, "u_world"
    );
};

parsegraph_BlockPainter.prototype.drawCaret = function(x1, y1, x2, y2)
{
    //console.log(cx + ", " + cy + ", " + size);
    // Append position data.
    this._blockBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            cx, cy, size.width(), size.height()
        )
    );

    // Append texture coordinate data.
    this._blockBuffer.appendData(
        this.a_texCoord,
        parsegraph_generateRectangleTexcoords()
    );
};

parsegraph_TextCaretPainter.prototype.clear = function()
{
    this._blockBuffer.clear();
};

/**
 * Renders the caret.
 */
parsegraph_TextCaretPainter.prototype.render = function(world)
{
    // Render blocks.
    this._gl.useProgram(
        this._blockProgram
    );
    this._gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._blockBuffer.renderPages();
};
