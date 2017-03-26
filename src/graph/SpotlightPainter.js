parsegraph_SpotlightPainter_VertexShader =
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

parsegraph_SpotlightPainter_FragmentShader =
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

function parsegraph_SpotlightPainter(gl, shaders)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    // Compile the shader program.
    var shaderName = "parsegraph_SpotlightPainter";
    if(!shaders[shaderName]) {
        var program = gl.createProgram();

        gl.attachShader(
            program,
            compileShader(
                gl,
                parsegraph_SpotlightPainter_VertexShader,
                gl.VERTEX_SHADER
            )
        );

        gl.attachShader(
            program,
            compileShader(
                gl,
                parsegraph_SpotlightPainter_FragmentShader,
                gl.FRAGMENT_SHADER
            )
        );

        gl.linkProgram(program);
        if(!gl.getProgramParameter(
            program, gl.LINK_STATUS
        )) {
            throw new Error("SpotlightPainter program failed to link.");
        }

        shaders[shaderName] = program;
    }
    this._program = shaders[shaderName];

    // Prepare attribute buffers.
    this._spotlightBuffer = parsegraph_createPagingBuffer(
        this._gl, this._program
    );
    this.a_position = this._spotlightBuffer.defineAttrib("a_position", 2);
    this.a_texCoord = this._spotlightBuffer.defineAttrib("a_texCoord", 2);
    this.a_color = this._spotlightBuffer.defineAttrib("a_color", 4);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._program, "u_world"
    );

    this._spotlightBuffer.addPage();
};

parsegraph_SpotlightPainter.prototype.drawSpotlight = function(
    cx, cy, radius, color)
{
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

parsegraph_SpotlightPainter.prototype.clear = function()
{
    this._spotlightBuffer.clear();
    this._spotlightBuffer.addPage();
};

parsegraph_SpotlightPainter.prototype.render = function(world, scale)
{
    // Render spotlights.
    this._gl.useProgram(
        this._program
    );
    this._gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._spotlightBuffer.renderPages();
};
