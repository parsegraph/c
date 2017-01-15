parsegraph_FanPainter_VertexShader =
"uniform mat4 u_world;\n" +
"\n" +
"attribute vec3 a_position;\n" +
"attribute vec3 a_color;\n" +
"\n" +
"varying highp vec3 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = u_world * vec4(a_position, 1.0);" +
    "contentColor = a_color;" +
"}";

parsegraph_FanPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec3 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = vec4(contentColor, 1.0);" +
"}";

function parsegraph_FanPainter(gl)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    this._startRad = 0;
    this._endRad = 0;

    this.fanProgram = this.gl.createProgram();

    this.gl.attachShader(
        this.fanProgram,
        compileShader(
            this.gl,
            parsegraph_FanPainter_VertexShader,
            this.gl.VERTEX_SHADER
        )
    );

    this.gl.attachShader(
        this.fanProgram,
        compileShader(
            this.gl,
            parsegraph_FanPainter_FragmentShader,
            this.gl.FRAGMENT_SHADER
        )
    );

    this.gl.linkProgram(this.fanProgram);
    if(!this.gl.getProgramParameter(
        this.fanProgram, this.gl.LINK_STATUS
    )) {
        throw new Error("FanPainter program failed to link.");
    }

    // Prepare attribute buffers.
    this.faceBuffer = parsegraph_createPagingBuffer(
        this.gl, this.fanProgram
    );
    this.a_position = this.faceBuffer.defineAttrib("a_position", 3);
    this.a_color = this.faceBuffer.defineAttrib("a_color", 3);

    // Cache program locations.
    this.u_world = this.gl.getUniformLocation(
        this.fanProgram, "u_world"
    );
};

parsegraph_FanPainter.prototype.selectRad = function(startRad, endRad)
{
    this._startRad = startRad;
    this._endRad = endRad;
};

parsegraph_FanPainter.prototype.selection = function()
{
    return [this._startRad, this._endRad];
};

parsegraph_FanPainter.prototype.selectDeg = function(startDeg, endDeg)
{
    return this.select(alpha_ToRadians(startDeg), alpha_ToRadians(endDeg));
};

parsegraph_FanPainter_Tests = new parsegraph_TestSuite("parsegraph_FanPainter");
parsegraph_AllTests.addTest(parsegraph_FanPainter_Tests);

parsegraph_FanPainter_Tests.addTest("parsegraph_FanPainter", function(resultDom) {
    var surface = new parsegraph_Surface();
    var painter = new parsegraph_FanPainter(surface.gl());
    painter.selectDeg(0, 90);
});

parsegraph_FanPainter.prototype.Clear = function()
{
    this.faceBuffer.clear();
};

parsegraph_FanPainter.prototype.render = function(viewMatrix)
{
    if(!viewMatrix) {
        throw new Error("A viewMatrix must be provided");
    }
    // Render faces.
    this.gl.useProgram(
        this.fanProgram
    );
    this.gl.uniformMatrix4fv(
        this.u_world,
        false,
        viewMatrix.toArray()
    );
    this.faceBuffer.renderPages();
};

