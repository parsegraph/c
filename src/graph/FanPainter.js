// TODO Separate coloring and slicing from drawing the circle... Basically, make this actually just draw the fans we want.
parsegraph_FanPainter_VertexShader =
"uniform mat3 u_world;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec4 a_color;\n" +
"attribute vec2 a_texCoord;\n" +
"attribute float a_selectionAngle;\n" +
"attribute float a_selectionSize;\n" +
"\n" +
"varying highp vec4 contentColor;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float selectionAngle;\n" +
"varying highp float selectionSize;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "contentColor = a_color;" +
    "texCoord = a_texCoord;" +
    "selectionAngle = a_selectionAngle;" +
    "selectionSize = a_selectionSize;" +
"}";

parsegraph_FanPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float selectionAngle;\n" +
"varying highp float selectionSize;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "highp float d = 1.0 - min(1.0, length(abs(st)));" +
    //"d = 1.0 - pow(d, 0.2);" +
    "highp float fragAngle = atan(st.y, st.x);" +
    "highp float angleDiff = abs(selectionAngle - fragAngle);" +
    "if(angleDiff > 3.14159*1.5) { angleDiff = 2.0*3.14159 - angleDiff; }" +
    "highp float angleAlpha = 0.5*d*max(0.0, 1.0 - contentColor.a * (angleDiff / selectionSize));" +
    "highp float centerSpotlight = 0.5;" +
    "highp float interiorDeadspot = 0.35;" +
    "highp float centerDist = distance(texCoord.xy, vec2(0.5, 0.5));" +
    "highp float centerAlpha = 0.5*max(0.0, 1.0 - centerDist/centerSpotlight) - 0.5*max(0.0, 1.0 - centerDist/interiorDeadspot);" +
    "gl_FragColor = vec4(contentColor.rgb, centerAlpha + angleAlpha);" +
    /*"if(selectionAngle - fragAngle > (3.14159 / 2.0) || fragAngle - selectionAngle > (3.14159 / 2.0)) {" +
        "gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);" +
    "}" +
    "else {" +*/
        //"gl_FragColor = vec4(contentColor.rgb, contentColor.a * d * (1.0 - abs(abs(fragAngle) - abs(selectionAngle)) / 3.14159));" +
    //"}"
"}";

/**
 * Shows a circle that allows some parts to show as selected.
 */
function parsegraph_FanPainter(gl)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    this._ascendingRadius = 250;
    this._descendingRadius = 250;
    this._selectionAngle = null;
    this._selectionSize = null;

    // Compile the shader program.
    this.fanProgram = this._gl.createProgram();

    this._gl.attachShader(
        this.fanProgram,
        compileShader(
            this._gl,
            parsegraph_FanPainter_VertexShader,
            this._gl.VERTEX_SHADER
        )
    );

    this._gl.attachShader(
        this.fanProgram,
        compileShader(
            this._gl,
            parsegraph_FanPainter_FragmentShader,
            this._gl.FRAGMENT_SHADER
        )
    );

    this._gl.linkProgram(this.fanProgram);
    if(!this._gl.getProgramParameter(
        this.fanProgram, this._gl.LINK_STATUS
    )) {
        throw new Error("FanPainter program failed to link.");
    }

    // Prepare attribute buffers.
    this._fanBuffer = parsegraph_createPagingBuffer(
        this._gl, this.fanProgram
    );
    this.a_position = this._fanBuffer.defineAttrib("a_position", 2);
    this.a_color = this._fanBuffer.defineAttrib("a_color", 4);
    this.a_texCoord = this._fanBuffer.defineAttrib("a_texCoord", 2);
    this.a_selectionAngle = this._fanBuffer.defineAttrib("a_selectionAngle", 1);
    this.a_selectionSize = this._fanBuffer.defineAttrib("a_selectionSize", 1);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this.fanProgram, "u_world"
    );
    this.u_time = this._gl.getUniformLocation(
        this.fanProgram, "u_time"
    );

    this._fanBuffer.addPage();
};

parsegraph_FanPainter_Tests = new parsegraph_TestSuite("parsegraph_FanPainter");

parsegraph_FanPainter_Tests.addTest("parsegraph_FanPainter", function(resultDom) {
    var surface = new parsegraph_Surface();
    var painter = new parsegraph_FanPainter(surface.gl());
    painter.selectDeg(0, 0, 0, 90, new parsegraph_Color(0, 0, 0, 1), new parsegraph_Color(1, 0, 1, 1));
});

parsegraph_FanPainter.prototype.selectDeg = function(
    userX, userY,
    startAngle, spanAngle,
    startColor, endColor)
{
    return this.selectRad(
        userX, userY,
        alpha_ToDegrees(startAngle), alpha_ToDegrees(spanAngle),
        startColor, endColor
    );
};

/**
 * Highlights arcs under the given selection.
 */
parsegraph_FanPainter.prototype.selectRad = function(
    userX, userY,
    startAngle, spanAngle,
    startColor, endColor)
//parsegraph_FanPainter.prototype.drawFan = function(
//    cx, cy, radius, color)
{
    //console.log(userx + ", " + userY + ". startAngle=" + startAngle + ", spanAngle=" + spanAngle);

    var radius = this._ascendingRadius + this._descendingRadius;

    // Append position data.
    this._fanBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            userX, userY, radius * 2, radius * 2
        )
    );

    // Append texture coordinate data.
    this._fanBuffer.appendData(
        this.a_texCoord,
        parsegraph_generateRectangleTexcoords()
    );

    // Append color data.
    var color = startColor;
    for(var k = 0; k < 3 * 2; ++k) {
        this._fanBuffer.appendRGBA(this.a_color, color);
        this._fanBuffer.appendData(this.a_selectionAngle, this._selectionAngle !== null ? this._selectionAngle : 0);
        this._fanBuffer.appendData(this.a_selectionSize, this._selectionSize !== null ? this._selectionSize : 0);
    }
};

parsegraph_FanPainter.prototype.setAscendingRadius = function(ascendingRadius)
{
    this._ascendingRadius = ascendingRadius;
};

parsegraph_FanPainter.prototype.setDescendingRadius = function(descendingRadius)
{
    this._descendingRadius = descendingRadius;
};

parsegraph_FanPainter.prototype.setSelectionAngle = function(selectionAngle)
{
    //console.log("Selection angle: " + selectionAngle);
    this._selectionAngle = selectionAngle;
};

parsegraph_FanPainter.prototype.setSelectionSize = function(selectionSize)
{
    //console.log("Selection size: " + selectionSize);
    this._selectionSize = Math.min(Math.PI/2.0, selectionSize);
};

parsegraph_FanPainter.prototype.clear = function()
{
    this._fanBuffer.clear();
    this._fanBuffer.addPage();
};

parsegraph_FanPainter.prototype.render = function(viewMatrix)
{
    if(!viewMatrix) {
        throw new Error("A viewMatrix must be provided");
    }
    // Render faces.
    this._gl.useProgram(
        this.fanProgram
    );
    this._gl.uniformMatrix3fv(
        this.u_world,
        false,
        viewMatrix
    );
    this._fanBuffer.renderPages();
};
