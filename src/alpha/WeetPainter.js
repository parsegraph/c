alpha_WeetPainter_VertexShader =
"uniform mat4 u_world;\n" +
"\n" +
"attribute vec4 a_position;\n" +
"attribute vec4 a_color;\n" +
"\n" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = u_world * a_position;" +
    "contentColor = a_color;" +
"}";

alpha_WeetPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = contentColor;" +
"}";

/**
 * Draws 3d faces in a solid color.
 */
function alpha_WeetPainter(gl)
{
    this.gl = gl;
    if(!this.gl || !this.gl.createProgram) {
        throw new Error("FacePainter must be given a GL interface");
    }

    this.faceProgram = this.gl.createProgram();

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_WeetPainter_VertexShader,
            this.gl.VERTEX_SHADER
        )
    );

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_WeetPainter_FragmentShader,
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
    this.a_position = this.faceBuffer.defineAttrib("a_position", 4);
    this.a_color = this.faceBuffer.defineAttrib("a_color", 4);

    // Cache program locations.
    this.u_world = this.gl.getUniformLocation(
        this.faceProgram, "u_world"
    );

    this.cubes = [];

    this.faceBuffer.addPage();
};

alpha_WeetPainter.prototype.Clear = function()
{
    this.faceBuffer.clear();
};

alpha_WeetPainter.prototype.PaintCube = function(m)
{
    var cubeSize = 1;
    var width = cubeSize;
    var length = cubeSize;
    var height = cubeSize;
    var cv = [
        // Front
        [-width, length, height], // v0
        [ width, length, height], // v1
        [ width, length,-height], // v2
        [-width, length,-height], // v3

        // Back
        [ width,-length, height], // v4
        [-width,-length, height], // v5
        [-width,-length,-height], // v6
        [ width,-length,-height], // v7

        // Left
        [width, length, height], // v1
        [width,-length, height], // v4
        [width,-length,-height], // v7
        [width, length,-height], // v2

        // Right
        [-width,-length, height], // v5
        [-width, length, height], // v0
        [-width, length,-height], // v3
        [-width,-length,-height], // v6

        // Top
        [ width, length, height], // v1
        [-width, length, height], // v0
        [-width,-length, height], // v5
        [ width,-length, height], // v4

        // Bottom
        [ width,-length,-height], // v7
        [-width,-length,-height], // v6
        [-width, length,-height], // v3
        [ width, length,-height] //v2
    ];

    var drawFace = function(c1, c2, c3, c4, color) {
        var drawVert = function(v) {
            var vt = m.Transform(v[0], v[1], v[2], 0);
            var numAdded = this.faceBuffer.appendData(this.a_position, vt[0] + m[12], vt[1] + m[13], vt[2] + m[14], 1.0);
            if(4 != numAdded) {
                throw new Error("Unexpected vertices added: " + numAdded);
            }
        };

        drawVert.call(this, c1);
        drawVert.call(this, c2);
        drawVert.call(this, c3);
        drawVert.call(this, c1);
        drawVert.call(this, c3);
        drawVert.call(this, c4);
        for(var i = 0; i < 6; ++i) {
            this.faceBuffer.appendData(this.a_color, color);
            this.faceBuffer.appendData(this.a_color, 1);
        }
    };

    // Front, COLOR
    drawFace.call(this, cv[0], cv[1], cv[2], cv[3], new alpha_Color(1, 1, 0));
    // Left
    drawFace.call(this, cv[8], cv[9], cv[10], cv[11], new alpha_Color(1, 0, 1));
    // Right
    drawFace.call(this, cv[12], cv[13], cv[14], cv[15], new alpha_Color(0, 0, 1));
    // Top
    drawFace.call(this, cv[16], cv[17], cv[18], cv[19], new alpha_Color(1, 0, 0));
    // Bottom
    drawFace.call(this, cv[20], cv[21], cv[22], cv[23], new alpha_Color(0, 1, 0));
    // Back
    drawFace.call(this, cv[4], cv[5], cv[6], cv[7], new alpha_Color(0, 1, 1));
};

alpha_WeetPainter.prototype.Cube = function(m)
{
    this.cubes.push(m);
};

alpha_WeetPainter.prototype.Clear = function()
{
    this.cubes.splice(0, this.cubes.length);
    this.faceBuffer.clear();
    this.faceBuffer.addPage();
};

alpha_WeetPainter.prototype.Draw = function(viewMatrix)
{
    if(!viewMatrix) {
        throw new Error("A viewMatrix must be provided");
    }

    // Render faces.
    this.faceBuffer.clear();
    this.faceBuffer.addPage();
    this.cubes.forEach(function(m) {
        this.PaintCube(m);
    }, this);
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
