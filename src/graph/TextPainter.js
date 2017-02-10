// TODO Test lots of glyphs; set a limit if one can be found to exist
// TODO Add caret
// TODO Add runs of selected text

parsegraph_TextPainter_VertexShader =
"uniform mat3 u_world;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec4 a_color;" +
"attribute vec4 a_backgroundColor;" +
"attribute vec2 a_texCoord;" +
"" +
"varying highp vec2 texCoord;" +
"varying highp vec4 fragmentColor;" +
"varying highp vec4 backgroundColor;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
   "fragmentColor = a_color;" +
   "backgroundColor = a_backgroundColor;" +
   "texCoord = a_texCoord;" +
"}";

parsegraph_TextPainter_FragmentShader =
"uniform sampler2D u_glyphTexture;\n" +
"varying highp vec4 fragmentColor;\n" +
"varying highp vec4 backgroundColor;" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    "highp float opacity = texture2D(u_glyphTexture, texCoord.st).r;" +
    "if(backgroundColor.a == 0.0) {" +
        "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);" +
    "}" +
    "else {" +
        "gl_FragColor = mix(backgroundColor, fragmentColor, opacity);" +
    "}" +
"}";

function parsegraph_TextPainter(gl, glyphAtlas, shaders)
{
    this._gl = gl;

    this._fontSize = parsegraph_TextPainter_RENDERED_FONT_SIZE;
    this._wrapWidth = parsegraph_TextPainter_WRAP_WIDTH;

    this._x = 0;
    this._y = 0;

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
    this.a_backgroundColor = this._textBuffer.defineAttrib("a_backgroundColor", 4);
    this.a_texCoord = this._textBuffer.defineAttrib("a_texCoord", 2);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textProgram, "u_world"
    );
    this.u_glyphTexture = this._gl.getUniformLocation(
        this._textProgram, "u_glyphTexture"
    );

    this._color = parsegraph_createColor(1, 1, 1, 1);
    this._backgroundColor = parsegraph_createColor(0, 0, 0, 0);
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

parsegraph_TextPainter.prototype.setBackgroundColor = function()
{
    if(arguments.length > 1) {
        this._backgroundColor = parsegraph_createColor.apply(null, arguments);
    }
    else {
        this._backgroundColor = arguments[0];
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

parsegraph_TextPainter.prototype.findCaretPos = function(text, paragraphX, paragraphY)
{
    var x = 0;
    var y = 0;
    var i = 0;

    var fontSize = this.fontSize();
    var wrapWidth = this.wrapWidth();
    var fontScale = this.fontScale();
    var glyphData;

    // Clamp the world coordinates to the boundaries of the text.
    var labelSize = this.measureText(text);
    paragraphX = Math.max(0, paragraphX);
    paragraphY = Math.max(0, paragraphY);
    paragraphX = Math.min(labelSize[0], paragraphX);
    paragraphY = Math.min(labelSize[1], paragraphY);

    var maxLineWidth = 0;
    var startTime = parsegraph_getTimeInMillis();
    //console.log(paragraphX + ", " + paragraphY);
    while(true) {
        if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
            throw new Error("TextPainter.measureText timeout");
        }
        var letter = fixedCharAt(text, i);
        //console.log(letter);
        if(letter === null) {
            // Reached the end of the string.
            maxLineWidth = Math.max(maxLineWidth, x);
            if(glyphData) {
                y += glyphData.height * fontScale;
            }
            break;
        }

        var glyphData = this._glyphAtlas.getGlyph(letter);
        //console.log(x + " Glyph width: " + (glyphData.width * fontScale));

        // Check for wrapping.
        if(wrapWidth !== undefined && (x + glyphData.width * fontScale) > wrapWidth) {
            //console.log("Need to wrap");
            if(paragraphY >= y && paragraphY <= y + glyphData.height * fontScale && paragraphX >= x) {
                // It's past the end of line, so that's actually the previous character.
                --i;
                break;
            }

            maxLineWidth = Math.max(maxLineWidth, x);
            x = 0;
            y += this._glyphAtlas.letterHeight() * fontScale;
            //console.log("Break: " + i);
        }

        if(
            paragraphX >= x && paragraphY >= y
            && paragraphX <= x + glyphData.width * fontScale
            && paragraphY <= y + glyphData.height * fontScale
        ) {
            // Within this letter!
            break;
        }

        i += letter.length;
        x += glyphData.width * fontScale;
    }

    return i;
};

parsegraph_TextPainter.prototype.measureText = function(text)
{
    var x = 0;
    var y = 0;
    var i = 0;

    var fontSize = this.fontSize();
    var wrapWidth = this.wrapWidth();
    var fontScale = this.fontScale();
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

        i += letter.length;
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

parsegraph_TextPainter.prototype.fontScale = function()
{
    return this.fontSize() / parsegraph_TextPainter_UPSCALED_FONT_SIZE;
};

parsegraph_TextPainter.prototype.drawText = function(text)
{
    var i = 0;
    while(true) {
        var letter = fixedCharAt(text, i);
        if(!letter) {
            return;
        }
        this.drawGlyph(letter);
        i += letter.length;
    }
};

parsegraph_TextPainter.prototype.drawGlyph = function(letter)
{
    var glyphData = this._glyphAtlas.getGlyph(letter);
    glyphData.painted = true;

    // Change lines if needed.
    var fontScale = this.fontScale();
    if(this.wrapWidth() && (this._lineAdvance + glyphData.width * fontScale) > this.wrapWidth()) {
        this.nextLine();
    }

    // Append position data.
    var x = this.letterX();
    var y = this.letterY();
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
    for(var k = 0; k < 3 * 2; ++k) {
        this._textBuffer.appendData(
            this.a_backgroundColor,
            this._backgroundColor.r(),
            this._backgroundColor.g(),
            this._backgroundColor.b(),
            this._backgroundColor.a()
        );
    }

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

    // Add the letter's width to the line advance.
    this._lineAdvance += glyphData.width * fontScale;
    this._lineHeight = Math.max(glyphData.height * fontScale, this._lineHeight);

    return glyphData.width * fontScale;
};

/**
 * Resets the painter to the given paragraph position, in world coordinates.
 */
parsegraph_TextPainter.prototype.setPosition = function(x, y)
{
    this._paragraphX = x;
    this._paragraphY = y;

    this._lineAdvance = 0;
    this._paragraphAdvance = 0;
    this._lineHeight = 0;
};

/**
 * Returns the trailing horizontal edge of the current letter position.
 */
parsegraph_TextPainter.prototype.letterX = function()
{
    return this._paragraphX + this._lineAdvance;
};

/**
 * Returns the trailing vertical edge of the current letter position.
 */
parsegraph_TextPainter.prototype.letterY = function()
{
    return this._paragraphY + this._paragraphAdvance;
};

/**
 * Returns the trailing edge of the currently rendered paragraph.
 */
parsegraph_TextPainter.prototype.paragraphX = function()
{
    return this._paragraphX;
};

/**
 * Returns the top edge of the currently rendered paragraph.
 */
parsegraph_TextPainter.prototype.paragraphY = function()
{
    return this._paragraphY;
};

/**
 * Sets the line position to the beginning of the paragraph backward edge, at the
 * top of the next line.
 */
parsegraph_TextPainter.prototype.nextLine = function()
{
    this._lineAdvance = 0;

    // If there was no line height, then default to the glyph atlas's default height.
    if(this._lineHeight === 0) {
        this._lineHeight += this.glyphAtlas().letterHeight() * this.fontScale();
    }

    this._paragraphAdvance += this.lineHeight();
    this._lineHeight = 0;
};

/**
 * Sets the paragraph position to the bottom of the current paragraph.
 */
parsegraph_TextPainter.prototype.nextParagraph = function()
{
    this._paragraphAdvance = 0;
    this._paragraphY += this._paragraphAdvance;
};

/**
 * Returns the line height using the current font size, in world coordinates.
 */
parsegraph_TextPainter.prototype.lineHeight = function()
{
    return this._lineHeight;
};

/**
 * Returns the current X position of this painter. The painter's X position will be advanced
 * using drawGlyph calls.
 *
 * The letter is drawn with its top-"backward" corner being at the given X position, in world
 * coordinates.
 */
parsegraph_TextPainter.prototype.x = function()
{
    return this._x;
};

/**
 * Returns the current Y position of this painter.
 *
 * The letter is drawn with its top-"backward" corner being at the given Y position, in world
 * coordinates.
 */
parsegraph_TextPainter.prototype.y = function()
{
    return this._y;
};

parsegraph_TextPainter.prototype.clear = function()
{
    this._textBuffer.clear();
};

parsegraph_TextPainter.prototype.render = function(world)
{
    var gl = this._gl;

    // Load program.
    this._gl.useProgram(
        this._textProgram
    );

    gl.activeTexture(gl.TEXTURE0);
    this._glyphAtlas.bindTexture(gl);
    gl.uniform1i(this.u_glyphTexture, 0);

    // Render text.
    gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._textBuffer.renderPages();
};
