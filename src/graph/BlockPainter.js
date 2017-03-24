parsegraph_BlockPainter_VertexShader =
"uniform mat3 u_world;\n" +
"uniform float u_scale;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec2 a_texCoord;\n" +
"attribute vec4 a_color;\n" +
"attribute vec4 a_borderColor;\n" +
"attribute float a_borderRoundedness;\n" +
"attribute float a_borderThickness;\n" +
"attribute float a_aspectRatio;\n" +
"attribute float a_scale;\n" +
"\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp vec4 contentColor;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "contentColor = a_color;" +
    "borderColor = a_borderColor;" +
    "borderRoundedness = max(0.001, a_borderRoundedness);" +
    "texCoord = a_texCoord;" +
    "borderThickness = a_borderThickness;" +
    "aspectRatio = a_aspectRatio;" +
    "scale = a_scale * u_scale;" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));" +

    // Default antialias implementation.
    "highp float borderTolerance = 0.0;" +
    "highp float inBorder = 1.0 - smoothstep(" +
        "borderRoundedness - borderTolerance, " +
        "borderRoundedness + borderTolerance, " +
        "d" +
    ");" +
    "highp float edgeWidth = 0.0;" +
    "highp float inContent = 1.0 - smoothstep(" +
        "(borderRoundedness - borderThickness) - edgeWidth," +
        "(borderRoundedness - borderThickness) + edgeWidth," +
        "d" +
    ");" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

// Same as above, but using a better antialiasing technique.
parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"highp float aastep(float threshold, float value)\n" +
"{\n" +
    "highp float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));\n" +
    "return smoothstep(threshold - afwidth, threshold + afwidth, value);\n" +
    //"return step(threshold, value);\n" +
"}\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));" +

    // Using 'OpenGL insights' antialias implementation
    "highp float inBorder = 1.0 - aastep(borderRoundedness, d);\n" +
    "highp float inContent = 1.0 - aastep(borderRoundedness - borderThickness, d);\n" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_SquareFragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "\n"+
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +
    "if(st.y < 1.0 - borderThickness && st.x < 1.0 - borderThickness) {" +
        "gl_FragColor = contentColor;" +
    "} else {" +
        "gl_FragColor = borderColor;" +
    "}" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_ShadyFragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
// Plot a line on Y using a value between 0.0-1.0
"float plot(vec2 st, float pct) {" +
  "return smoothstep(pct-0.02, pct, st.y) - smoothstep(pct, pct+0.02, st.y);" +
"}" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "\n"+
    "gl_FragColor = vec4(vec3(0.5 - (0.3 * st.y)), 1.0);" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_AngleFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;" +
    "highp float insideYContent = 1.0 - step(1.0 - t, st.y);" +
    "highp float insideXBorder = step(1.0 - t, st.x);" +

    // y = y1 + m(x - x1)
    "highp float insideBorderAngle = 1.0 - step((st.x - 1.0)/-t, st.y);" +
    "highp float insideContentAngle = 1.0 - step((st.x - 1.0)/-t - aspectRatio, st.y);" +

    "highp float inBorder = step(1.0, insideBorderAngle);\n" +
    "highp float inContent = step(1.0, insideContentAngle * insideYContent);\n" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_ParenthesisFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;" +
    "highp float insideYContent = step(1.0 - t, st.y);" +
    "highp float insideXBorder = step(1.0 - t, st.x/(1.0 - t/2.0));" +

    "highp float inBorder = step(1.0, 1.0 - insideXBorder + 1.0 - step(1.0, length(vec2((st.x - (1.0 - t))/t, st.y/(1.0 + 2.0*t)))));" +
    "highp float inContent = step(1.0, 1.0 - step(1.0 - t, st.x)*(1.0 - insideYContent) + 1.0 - step(1.0 - t, length(vec2((st.x/(1.0 - t) - (1.0 - t))/t, st.y/(1.0 + 3.0*t)))));" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

// Derived from https://thebookofshaders.com/07/
parsegraph_BlockPainter_CurlyFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"varying highp float scale;\n" +
"\n" +
"void main() {\n" +
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    "highp float t = borderThickness;" +
    "highp float inBorder = step(st.y, smoothstep(0.0, t, 1.0 - st.x));" +
    "highp float inContent = step(1.0, step(st.y, (1.0-t)*smoothstep(0.0, t, 1.0 - (st.x + t*aspectRatio))));" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);" +
"}";

function parsegraph_BlockPainter(gl, shaders)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    // Compile the shader program.
    var shaderName = "parsegraph_BlockPainter";
    if(!shaders[shaderName]) {
        var program = gl.createProgram();
        gl.attachShader(
            program,
            compileShader(
                gl,
                parsegraph_BlockPainter_VertexShader,
                gl.VERTEX_SHADER
            )
        );

        var fragProgram = parsegraph_BlockPainter_FragmentShader;
        // OES_standard_derivatives looks worse on FF.
        if(
        navigator.userAgent.indexOf("Firefox") == -1 &&
        gl.getExtension("OES_standard_derivatives") != null) {
            fragProgram = parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives;
        }

        // For development.
   //     gl.getExtension("OES_standard_derivatives");
  //      fragProgram = parsegraph_BlockPainter_CurlyFragmentShader;
 //       fragProgram = parsegraph_BlockPainter_ParenthesisFragmentShader;
//        fragProgram = parsegraph_BlockPainter_SquareFragmentShader;
//        fragProgram = parsegraph_BlockPainter_AngleFragmentShader;

        gl.attachShader(
            program,
            compileShader(
                gl,
                fragProgram,
                gl.FRAGMENT_SHADER
            )
        );

        gl.linkProgram(program);
        if(!gl.getProgramParameter(
            program, gl.LINK_STATUS
        )) {
            throw new Error("'" + shaderName + "' shader program failed to link.");
        }

        shaders[shaderName] = program;
    }
    this._blockProgram = shaders[shaderName];

    // Prepare attribute buffers.
    this._blockBuffer = parsegraph_createPagingBuffer(
        this._gl, this._blockProgram
    );
    this.a_position = this._blockBuffer.defineAttrib("a_position", 2);
    this.a_texCoord = this._blockBuffer.defineAttrib("a_texCoord", 2);
    this.a_color = this._blockBuffer.defineAttrib("a_color", 4);
    this.a_borderColor = this._blockBuffer.defineAttrib("a_borderColor", 4);
    this.a_borderRoundedness = this._blockBuffer.defineAttrib("a_borderRoundedness", 1);
    this.a_borderThickness = this._blockBuffer.defineAttrib("a_borderThickness", 1);
    this.a_aspectRatio = this._blockBuffer.defineAttrib("a_aspectRatio", 1);
    this.a_scale = this._blockBuffer.defineAttrib("a_scale", 1);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._blockProgram, "u_world"
    );
    this.u_scale = this._gl.getUniformLocation(
        this._blockProgram, "u_scale"
    );

    // Setup initial uniform values.
    this._backgroundColor = parsegraph_createColor(1, 1, 1, .15);

    this._borderColor = parsegraph_createColor(
        parsegraph_createColor(1, 1, 1, 1)
    );
};

parsegraph_BlockPainter.prototype.borderColor = function()
{
    return this._borderColor;
};

parsegraph_BlockPainter.prototype.setBorderColor = function(borderColor)
{
    this._borderColor = borderColor;
};

parsegraph_BlockPainter.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_BlockPainter.prototype.setBackgroundColor = function(backgroundColor)
{
    this._backgroundColor = backgroundColor;
};

parsegraph_BlockPainter.prototype.drawBlock = function(
    cx, cy, width, height, borderRoundedness, borderThickness, scale)
{
    //console.log(cx + ", " + cy + ", " + width + ", " + height);
    // Append position data.
    this._blockBuffer.appendData(
        this.a_position,
        parsegraph_generateRectangleVertices(
            cx, cy, width, height
        )
    );

    // Append texture coordinate data.
    this._blockBuffer.appendData(
        this.a_texCoord,
        parsegraph_generateRectangleTexcoords()
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        this._blockBuffer.appendData(
            this.a_color,
            this.backgroundColor().r(),
            this.backgroundColor().g(),
            this.backgroundColor().b(),
            this.backgroundColor().a()
        );

        // Append border color data.
        this._blockBuffer.appendData(
            this.a_borderColor,
            this.borderColor().r(),
            this.borderColor().g(),
            this.borderColor().b(),
            this.borderColor().a()
        );

        // Append border radius data.
        if(height < width) {
            this._blockBuffer.appendData(
                this.a_borderRoundedness,
                scale * borderRoundedness / height
            );
            this._blockBuffer.appendData(
                this.a_borderThickness,
                scale * borderThickness / height
            );
        }
        else {
            // height > width
            this._blockBuffer.appendData(
                this.a_borderRoundedness,
                scale * borderRoundedness / width
            );
            this._blockBuffer.appendData(
                this.a_borderThickness,
                scale * borderThickness / width
            );
        }

        this._blockBuffer.appendData(
            this.a_aspectRatio,
            height / width
        );

        this._blockBuffer.appendData(
            this.a_scale,
            scale
        );
    }
};

parsegraph_BlockPainter.prototype.clear = function()
{
    this._blockBuffer.clear();
};

parsegraph_BlockPainter.prototype.render = function(world, scale)
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
    this._gl.uniform1f(this.u_scale, scale);
    return this._blockBuffer.renderPages();
};
