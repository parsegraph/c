////////////////////////////////////////////////////////////////////////////////////
//  MAIN COMPUTE FUNCTION
////////////////////////////////////////////////////////////////////////////////////

parsegraph_HSunrisePainter_VertexShader =
"uniform mat3 u_world;\n" +
"uniform vec4 u_color;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec2 a_texCoord;\n" +
"\n" +
"varying highp float offset;\n" +
"varying vec4 color;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position.x, 0, 1.0)).x, a_position.y, 0.0, 1.0);" +
    "offset = a_texCoord.x;" +
    "color = u_color;" +
"}";

parsegraph_HSunrisePainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp float offset;\n" +
"varying vec4 color;\n" +
"" +
"void main() {\n" +
    "highp float brightness = .3 * sin(offset * 3.14159);" +
    "gl_FragColor = color * vec4(" +
        "1, 1, 1, brightness" +
    ");" +
"}";

function parsegraph_HSunrisePainter(gl)
{
    this._gl = gl;

    // Compile the shader program.
    this._blockProgram = this._gl.createProgram();

    this._gl.attachShader(
        this._blockProgram,
        compileShader(
            this._gl,
            parsegraph_HSunrisePainter_VertexShader,
            this._gl.VERTEX_SHADER
        )
    );

    this._gl.attachShader(
        this._blockProgram,
        compileShader(
            this._gl,
            parsegraph_HSunrisePainter_FragmentShader,
            this._gl.FRAGMENT_SHADER
        )
    );

    this._gl.linkProgram(this._blockProgram);
    if(!this._gl.getProgramParameter(
        this._blockProgram, this._gl.LINK_STATUS
    )) {
        throw new Error("SunrisePainter program failed to link.");
    }

    // Prepare attribute buffers.
    this._blockBuffer = parsegraph_createPagingBuffer(
        this._gl, this._blockProgram
    );
    this.a_texCoord = this._blockBuffer.defineAttrib("a_texCoord", 2);
    this.a_position = this._blockBuffer.defineAttrib("a_position", 2);

    this.u_world = this._gl.getUniformLocation(
        this._blockProgram, "u_world"
    );
    this.u_color = this._gl.getUniformLocation(
        this._blockProgram, "u_color"
    );

    this._time = null;
    this._geographicalPos = null;
    this._color = new parsegraph_Color(1, 1, 1, 1);
};

parsegraph_HSunrisePainter.prototype.color = function()
{
    return this._color;
};

parsegraph_HSunrisePainter.prototype.setColor = function(color)
{
    this._color = color;
};

parsegraph_HSunrisePainter.prototype.geographicalPos = function()
{
    return this._geographicalPos;
};

parsegraph_HSunrisePainter.prototype.setGeographicalPos = function(x, y)
{
    this._geographicalPos = [x, y];
};

/**
 * Sets the time to seconds since the epoch.
 */
parsegraph_HSunrisePainter.prototype.setTime = function(time)
{
    this._time = new Date(time.getTime());
};

/**
 * Returns the time in seconds since the epoch.
 */
parsegraph_HSunrisePainter.prototype.time = function()
{
    return this._time;
};

parsegraph_HSunrisePainter.prototype.paint = function(daysRendered)
{
    if(this.time() == null || this._geographicalPos == null) {
        return;
    }

    this._blockBuffer.clear();

    var d = new Date(this.time().getTime());
    d.setHours(0, 0, 0, 0);
    var offsetMins = d.getTime()/1000/60;
    d.setHours(12, 0, 0, 0);
    for(var i = 0; i < daysRendered; ++i) {
        var sunTimes = getSunriseAndSunset(
            d,
            this.geographicalPos()[0],
            this.geographicalPos()[1]
        );

        // Day length in minutes.
        var dayLength = sunTimes[1] - sunTimes[0];

        // Append position data.
        this._blockBuffer.appendData(
            this.a_position,
            parsegraph_generateRectangleVertices(
                offsetMins + sunTimes[0] + dayLength / 2, 0,
                dayLength, 2
            )
        );
        //console.log("Offset: " + offsetMins + ", dayLength=" + dayLength);

        this._blockBuffer.appendData(
            this.a_texCoord,
            parsegraph_generateRectangleTexcoords()
        );

        d = parsegraph_nextDay(d);
        offsetMins += 24 * 60;
    }
};

parsegraph_HSunrisePainter.prototype.render = function(world, camera)
{
    // Render blocks.
    this._gl.useProgram(this._blockProgram);
    this._gl.uniformMatrix3fv(this.u_world, false, world);
    this._gl.uniform4f(
        this.u_color,
        this.color().r(),
        this.color().g(),
        this.color().b(),
        this.color().a()
    );
    this._blockBuffer.renderPages();
    //console.log("Rendering (" + camera.x() + ", " + camera.y() + ")");
};
