parsegraph_LinePainter_VertexShader =
"uniform mat3 u_world;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec4 a_color;\n" +
"\n" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
   "contentColor = a_color;" +
"}";

// https://thebookofshaders.com/07/
parsegraph_LinePainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = contentColor;" +
"}";

function parsegraph_LinePainter(gl)
{
    // Get the GL Context.
    this._gl = gl;

    // Compile the shader program.
    this._lineProgram = this._gl.createProgram();

    this._gl.attachShader(
        this._lineProgram,
        compileShader(
            this._gl,
            parsegraph_LinePainter_VertexShader,
            this._gl.VERTEX_SHADER
        )
    );

    this._gl.attachShader(
        this._lineProgram,
        compileShader(
            this._gl,
            parsegraph_LinePainter_FragmentShader,
            this._gl.FRAGMENT_SHADER
        )
    );

    this._gl.linkProgram(this._lineProgram);
    if(!this._gl.getProgramParameter(
        this._lineProgram, this._gl.LINK_STATUS
    )) {
        throw new Error("LinePainter program failed to link.");
    }

    // Prepare attribute buffers.
    this._lineBuffer = parsegraph_createPagingBuffer(
        this._gl, this._lineProgram
    );
    this.a_position = this._lineBuffer.defineAttrib("a_position", 2);
    this.a_color = this._lineBuffer.defineAttrib("a_color", 4);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._lineProgram, "u_world"
    );

    // Setup initial uniform values.
    this._color = parsegraph_createColor(1, 1, 1, 1);
    this._thickness = .5;
};

parsegraph_createLinePainter = function(canvas)
{
    return new parsegraph_LinePainter(canvas);
};

parsegraph_LinePainter.prototype.setColor = function(color)
{
    this._color = color;
};

parsegraph_LinePainter.prototype.color = function()
{
    return this._color;
};

parsegraph_LinePainter.prototype.drawHorizontalLine = function(x, y, length, thickness)
{
    // Append position data.
    this._lineBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            x + length / 2, y,
            Math.abs(length), thickness
        )
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        this._lineBuffer.appendData(
            this.a_color,
            this.color().r(),
            this.color().g(),
            this.color().b(),
            this.color().a()
        );
    }
};

parsegraph_LinePainter.prototype.drawVerticalLine = function(x, y, length, thickness)
{
    // Append position data.
    this._lineBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            x, y + length / 2,
            thickness, Math.abs(length)
        )
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        this._lineBuffer.appendData(
            this.a_color,
            this.color().r(),
            this.color().g(),
            this.color().b(),
            this.color().a()
        );
    }
};

parsegraph_LinePainter.prototype.clear = function()
{
    this._lineBuffer.clear();
};

parsegraph_LinePainter.prototype.render = function(world)
{
    // Render lines.
    this._gl.useProgram(
        this._lineProgram
    );
    this._gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._lineBuffer.renderPages();
};
