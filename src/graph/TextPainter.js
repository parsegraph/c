// TODO SetFont, which would recreate GlyphAtlas
// TODO Test lots of glyphs; set a limit if one can be found to exist
// XXX TextPainter // "#extension GL_OES_standard_derivatives : enable\n" +

//    measureText(text, fontSize, [wrapWidth])
//    drawText(text, x, y, fontSize, [wrapWidthj, [scale])

parsegraph_TextPainter_VertexShader =
"uniform mat3 u_world;\n" +
"uniform float u_scale;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec4 a_color;" +
"attribute vec2 a_texCoord;" +
"attribute float a_scale;" +
"" +
"varying highp vec2 texCoord;" +
"varying highp vec4 fragmentColor;" +
"varying highp float scale;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
   "fragmentColor = a_color;" +
   "texCoord = a_texCoord;" +
   "scale = a_scale * u_scale;" +
"}";

parsegraph_TextPainter_FragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"uniform sampler2D u_glyphTexture;\n" +
"varying highp vec4 fragmentColor;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float scale;\n" +
"\n" +
"highp float aastep(highp float threshold, highp float value)\n" +
"{\n" +
    "highp float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));\n" +
    "return smoothstep(threshold - afwidth, threshold + afwidth, value);\n" +
"}\n" +
"\n" +
"void main() {\n" +
    "highp float dist = texture2D(u_glyphTexture, texCoord.st).r;" +
    "highp float edgeDistance = 0.5;" +
    "highp float opacity = aastep(edgeDistance, dist);" +
    "opacity = dist;\n" +
    /*"highp float edgeWidth = 1.0/(scale * 64.0);" +
    "highp float opacity = smoothstep(" +
        "edgeDistance - edgeWidth, " +
        "edgeDistance + edgeWidth, " +
        "dist" +
    ");" +*/
    "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);" +
"}";

function parsegraph_TextPainter(gl, glyphAtlas, shaders)
{
    this._gl = gl;

    this._fontSize = parsegraph_TextPainter_RENDERED_FONT_SIZE;
    this._wrapWidth = parsegraph_TextPainter_WRAP_WIDTH;

    if(!glyphAtlas) {
        throw new Error("Glyph atlas must be provided");
    }
    this._glyphAtlas = glyphAtlas;

    // Compile the shader program.
    var shaderName = "parsegraph_TextPainter";
    if(!shaders[shaderName]) {
        var program = gl.createProgram();

        gl.attachShader(
            program, compileShader(
                gl, parsegraph_TextPainter_VertexShader, gl.VERTEX_SHADER
            )
        );

        var fragProgram = parsegraph_TextPainter_FragmentShader;
        if(!gl.getExtension("OES_standard_derivatives")) {
            // TODO Don't just default with the good version.
            throw new Error("OES_standard_derivatives is required for TextPainter.");
        }
        gl.attachShader(
            program, compileShader(gl, fragProgram, gl.FRAGMENT_SHADER)
        );

        gl.linkProgram(program);
        if(!gl.getProgramParameter(
            program, gl.LINK_STATUS
        )) {
            throw new Error("'" + shaderName + "' shader program failed to link.");
        }

        shaders[shaderName] = program;
    }
    this._textProgram = shaders[shaderName];

    // Prepare attribute buffers.
    this._textBuffer = parsegraph_createPagingBuffer(
        this._gl, this._textProgram
    );
    this.a_position = this._textBuffer.defineAttrib("a_position", 2);
    this.a_color = this._textBuffer.defineAttrib("a_color", 4);
    this.a_texCoord = this._textBuffer.defineAttrib("a_texCoord", 2);
    this.a_scale = this._textBuffer.defineAttrib("a_scale", 1);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textProgram, "u_world"
    );
    this.u_glyphTexture = this._gl.getUniformLocation(
        this._textProgram, "u_glyphTexture"
    );
    this.u_scale = this._gl.getUniformLocation(
        this._textProgram, "u_scale"
    );

    // Setup initial uniform values.
    this._color = parsegraph_createColor(1, 1, 1, 1);
};

parsegraph_createTextPainter = function(gl, size)
{
    return new parsegraph_TextPainter(gl, size);
};

parsegraph_TextPainter.prototype.setColor = function()
{
    if(arguments.length > 1) {
        this._color = parsegraph_createColor.apply(null, arguments);
    }
    else {
        this._color = arguments[0];
    }
};

parsegraph_TextPainter.prototype.setWrapWidth = function(wrapWidth)
{
    this._wrapWidth = wrapWidth;
};

parsegraph_TextPainter.prototype.wrapWidth = function()
{
    return this._wrapWidth;
};

parsegraph_TextPainter.prototype.measureText = function(text, fontSize, wrapWidth)
{
    var x = 0;
    var y = 0;
    var i = 0;

    if(fontSize === undefined) {
        fontSize = this.fontSize();
    }
    if(wrapWidth === undefined) {
        wrapWidth = this.wrapWidth();
    }

    var fontScale = fontSize / parsegraph_TextPainter_UPSCALED_FONT_SIZE;
    var glyphData;

    var maxLineWidth = 0;
    var startTime = parsegraph_getTimeInMillis();
    while(true) {
        if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
            throw new Error("TextPainter.measureText timeout");
        }
        var letter = fixedCharAt(text, i);
        if(letter === null) {
            // Reached the end of the string.
            maxLineWidth = Math.max(maxLineWidth, x);
            if(glyphData) {
                y += glyphData.height;
            }
            break;
        }

        var glyphData = this._glyphAtlas.getGlyph(letter);

        // Check for wrapping.
        if(wrapWidth !== undefined && (x + glyphData.width) > wrapWidth / fontScale) {
            maxLineWidth = Math.max(maxLineWidth, x);
            x = 0;
            y += glyphData.height;
        }

        ++i;
        x += glyphData.width;
    }

    return [maxLineWidth * fontScale, y * fontScale];
};

parsegraph_TextPainter.prototype.setFontSize = function(fontSize)
{
    this._fontSize = fontSize;
};

parsegraph_TextPainter.prototype.fontSize = function()
{
    return this._fontSize;
};

/**
 * Draws the given text with the given font size at the provided location.
 * Text is drawn forwards and downwards from the given position.
 *
 * The wrapWidth causes wrapping.
 *
 * The scale provided is the camera's scale, given for antialiasing. Defaults
 * to 1.0.
 */
parsegraph_TextPainter.prototype.drawText = function(text, x, y, fontSize, wrapWidth, scale)
{
    if(scale === undefined) {
        scale = 1.0;
    }
    if(fontSize === undefined) {
        fontSize = this.fontSize();
    }
    if(wrapWidth === undefined) {
        wrapWidth = this.wrapWidth();
    }
    var fontScale = fontSize / parsegraph_TextPainter_UPSCALED_FONT_SIZE;

    var originX = x;
    var i = 0;

    var addedGlyphs = false;
    while(true) {
        var letter = fixedCharAt(text, i);
        if(letter === null) {
            break;
        }

        var glyphData = this._glyphAtlas.getGlyph(letter);

        // Note if we've just started using this glyph, since we'll need
        // to schedule a glyph atlas update to get the high-resolution
        // version.
        if(!glyphData.painted) {
            addedGlyphs = true;
        }
        glyphData.painted = true;

        if(wrapWidth !== undefined && (x + glyphData.width * fontScale) > (originX + wrapWidth)) {
            x = originX;
            y += glyphData.height * fontScale;
        //}
        //else {
            //console.log(x, originX, originX + wrapWidth);
        }

        //console.log(letter + x + ", " + y + "(" + glyphData.width + "x" + glyphData.height + ")");

        // Append position data.
        this._textBuffer.appendData(
            this.a_position,
            [
                x, y,
                x + glyphData.width * fontScale, y,
                x + glyphData.width * fontScale, y + glyphData.height * fontScale,

                x, y,
                x + glyphData.width * fontScale, y + glyphData.height * fontScale,
                x, y + glyphData.height * fontScale
            ]
        );

        // Append color data.
        for(var k = 0; k < 3 * 2; ++k) {
            this._textBuffer.appendData(
                this.a_color,
                this._color.r(),
                this._color.g(),
                this._color.b(),
                this._color.a()
            );
        }

        // Append color data.
        for(var k = 0; k < 3 * 2; ++k) {
            this._textBuffer.appendData(
                this.a_scale,
                scale
            );
        }
        //console.log("a_scale: " + scale);

        // Append texture coordinate data.
        this._textBuffer.appendData(
            this.a_texCoord,
            [
                glyphData.x / this._glyphAtlas.canvas().width,
                glyphData.y / this._glyphAtlas.canvas().height,

                (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
                glyphData.y / this._glyphAtlas.canvas().height,

                (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
                (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height,

                glyphData.x / this._glyphAtlas.canvas().width,
                glyphData.y / this._glyphAtlas.canvas().height,

                (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
                (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height,

                glyphData.x / this._glyphAtlas.canvas().width,
                (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height
            ]
        );

        ++i;
        x += glyphData.width * fontScale;
    }
};

parsegraph_TextPainter.prototype.clear = function()
{
    this._textBuffer.clear();
};

parsegraph_TextPainter.prototype.render = function(world, scale)
{
    var gl = this._gl;

    // Load program.
    this._gl.useProgram(
        this._textProgram
    );

    gl.activeTexture(gl.TEXTURE0);
    this._glyphAtlas.bindTexture(gl);
    gl.uniform1i(this.u_glyphTexture, 0);
    gl.uniform1f(this.u_scale, scale);
    //console.log("u_scale: " + scale);

    // Render text.
    gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._textBuffer.renderPages();
};
