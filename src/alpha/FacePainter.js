alpha_FacePainter_VertexShader =
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

alpha_FacePainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec3 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = vec4(contentColor, 1.0);" +
"}";

/**
 * Draws 3d faces in a solid color.
 */
function alpha_FacePainter(widget)
{
    if(!widget) {
        throw new Error("FacePainter must be given a non-null alpha_GLWidget");
    }
    this.widget = widget;
    this.gl = this.widget._gl;
    if(!this.gl) {
        //console.log(widget);
        throw new Error("FacePainter must be given a GL interface via alpha_GLWidget._gl")
    }

    this.faceProgram = this.gl.createProgram();

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_FacePainter_VertexShader,
            this.gl.VERTEX_SHADER
        )
    );

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_FacePainter_FragmentShader,
            this.gl.FRAGMENT_SHADER
        )
    );

    this.gl.linkProgram(this.faceProgram);
    if(!this.gl.getProgramParameter(
        this.faceProgram, this.gl.LINK_STATUS
    )) {
        throw new Error("FacePainter program failed to link.");
    }

    // Prepare attribute buffers.
    this.faceBuffer = parsegraph_createPagingBuffer(
        this.gl, this.faceProgram
    );
    this.a_position = this.faceBuffer.defineAttrib("a_position", 3);
    this.a_color = this.faceBuffer.defineAttrib("a_color", 3);

    // Cache program locations.
    this.u_world = this.gl.getUniformLocation(
        this.faceProgram, "u_world"
    );
};

alpha_FacePainter_Tests = new parsegraph_TestSuite("alpha_FacePainter");
parsegraph_AllTests.addTest(alpha_FacePainter_Tests);

alpha_FacePainter_Tests.addTest("alpha_FacePainter", function(resultDom) {
    var widget = new alpha_GLWidget();
    var painter = new alpha_FacePainter(widget);
});

alpha_FacePainter.prototype.Clear = function()
{
    this.faceBuffer.clear();
};

alpha_FacePainter.prototype.Quad = function(v1, v2, v3, v4, c1, c2, c3, c4)
{
    this.Triangle(v1, v2, v3, c1, c2, c3);
    this.Triangle(v1, v3, v4, c1, c3, c4);
};

/**
 * painter.Triangle(v1, v2, v3, c1, c2, c3);
 *
 *
 */
alpha_FacePainter.prototype.Triangle = function(v1, v2, v3, c1, c2, c3)
{
    if(!c2) {
        c2 = c1;
    }
    if(!c3) {
        c3 = c1;
    }

    this.faceBuffer.appendData(
        this.a_position,
        v1, v2, v3
    );
    this.faceBuffer.appendData(
        this.a_color,
        c1, c2, c3
    );
};

alpha_FacePainter.prototype.Draw = function(viewMatrix)
{
    if(!viewMatrix) {
        throw new Error("A viewmatrix must be provided");
    }
    // Render faces.
    this.gl.useProgram(
        this.faceProgram
    );
    this.gl.uniformMatrix4fv(
        this.u_world,
        false,
        viewMatrix.toArray()
    );
    this.faceBuffer.renderPages();
};

