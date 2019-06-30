// TODO Test lots of glyphs; set a limit if one can be found to exist
// TODO Add caret
// TODO Add runs of selected text
var parsegraph_GlyphPainter_COUNT = 0;

parsegraph_GlyphPainter_VertexShader =
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

parsegraph_GlyphPainter_FragmentShader =
"uniform sampler2D u_glyphTexture;\n" +
"varying highp vec4 fragmentColor;\n" +
"varying highp vec4 backgroundColor;" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    //"gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n" +
    "highp float opacity = texture2D(u_glyphTexture, texCoord.st).r;" +
    "if(backgroundColor.a == 0.0) {" +
        "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);" +
    "}" +
    "else {" +
        "gl_FragColor = mix(backgroundColor, fragmentColor, opacity);" +
    "}" +
"}";

function parsegraph_GlyphPainter(gl, glyphAtlas, shaders)
{
    this._gl = gl;

    if(!glyphAtlas) {
        throw new Error("Glyph atlas must be provided");
    }
    this._glyphAtlas = glyphAtlas;
    this._id = ++parsegraph_GlyphPainter_COUNT;

    // Compile the shader program.
    var shaderName = "parsegraph_GlyphPainter";
    if(!shaders[shaderName]) {
        var program = gl.createProgram();

        gl.attachShader(
            program, compileShader(
                gl, parsegraph_GlyphPainter_VertexShader, gl.VERTEX_SHADER
            )
        );

        var fragProgram = parsegraph_GlyphPainter_FragmentShader;
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
    this._textBuffer = new parsegraph_PagingBuffer(this._gl, this._textProgram);
    this.a_position = this._textBuffer.defineAttrib("a_position", 2);
    this.a_color = this._textBuffer.defineAttrib("a_color", 4);
    this.a_backgroundColor = this._textBuffer.defineAttrib("a_backgroundColor", 4);
    this.a_texCoord = this._textBuffer.defineAttrib("a_texCoord", 2);
    this._textBuffers = {};

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textProgram, "u_world"
    );
    this.u_glyphTexture = this._gl.getUniformLocation(
        this._textProgram, "u_glyphTexture"
    );

    this._maxSize = 0;

    this._color = parsegraph_createColor(1, 1, 1, 1);
    this._backgroundColor = parsegraph_createColor(0, 0, 0, 0);
};

parsegraph_GlyphPainter.prototype.color = function()
{
    return this._color;
};

parsegraph_GlyphPainter.prototype.setColor = function()
{
    if(arguments.length > 1) {
        this._color = parsegraph_createColor.apply(null, arguments);
    }
    else {
        this._color = arguments[0];
    }
};

parsegraph_GlyphPainter.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_GlyphPainter.prototype.setBackgroundColor = function()
{
    if(arguments.length > 1) {
        this._backgroundColor = parsegraph_createColor.apply(null, arguments);
    }
    else {
        this._backgroundColor = arguments[0];
    }
};

parsegraph_GlyphPainter.prototype.fontSize = function()
{
    return this._glyphAtlas.fontSize();
};

parsegraph_GlyphPainter.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
};

function parsegraph_GlyphRenderData(painter, glyphData)
{
    this.painter = painter;
    this.glyphData = glyphData;
}

parsegraph_GlyphRenderData.prototype.renderText = function(gl, numIndices)
{
    //console.log("Rendering " + numIndices + " indices of page " + this.glyphData.glyphPage._id);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphData.glyphPage._glyphTexture);
    gl.uniform1i(this.painter.u_glyphTexture, 0);
    gl.drawArrays(gl.TRIANGLES, 0, numIndices);
};

parsegraph_GlyphPainter.prototype.drawGlyph = function(glyphData, x, y, fontScale)
{
    if(typeof glyphData !== "object") {
        glyphData = this._glyphAtlas.getGlyph(glyphData);
    }
    glyphData.painted = true;

    var glTextureSize = parsegraph_getGlyphTextureSize(this._gl);
    var pagesPerRow = glTextureSize / this.glyphAtlas().pageTextureSize();
    var pagesPerTexture = Math.pow(pagesPerRow, 2);

    // Select the correct buffer.
    var bufIndex = Math.floor(glyphData.glyphPage._id / pagesPerTexture);
    var page = this._textBuffers[bufIndex];
    if(!page) {
        var grd = new parsegraph_GlyphRenderData(this, glyphData)
        page = this._textBuffer.addPage(grd.renderText, grd);
        this._textBuffers[bufIndex] = page;
    }

    // Append position data.
    page.appendData(
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

    if(this._maxSize < glyphData.width * fontScale) {
        this._maxSize = glyphData.width * fontScale;
    }

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        page.appendData(
            this.a_color,
            this._color.r(),
            this._color.g(),
            this._color.b(),
            this._color.a()
        );
    }
    for(var k = 0; k < 3 * 2; ++k) {
        page.appendData(
            this.a_backgroundColor,
            this._backgroundColor.r(),
            this._backgroundColor.g(),
            this._backgroundColor.b(),
            this._backgroundColor.a()
        );
    }

    // Append texture coordinate data.
    var pageIndex = glyphData.glyphPage._id % pagesPerTexture;
    var pageX = this.glyphAtlas().pageTextureSize() * (pageIndex % pagesPerRow);
    var pageY = this.glyphAtlas().pageTextureSize() * Math.floor(pageIndex / pagesPerRow);
    page.appendData(
        this.a_texCoord,
        [
            (pageX + glyphData.x) / glTextureSize,
            (pageY + glyphData.y) / glTextureSize,

            (pageX + glyphData.x + glyphData.width) / glTextureSize,
            (pageY + glyphData.y) / glTextureSize,

            (pageX + glyphData.x + glyphData.width) / glTextureSize,
            (pageY + glyphData.y + glyphData.height) / glTextureSize,

            (pageX + glyphData.x) / glTextureSize,
            (pageY + glyphData.y) / glTextureSize,

            (pageX + glyphData.x + glyphData.width) / glTextureSize,
            (pageY + glyphData.y + glyphData.height) / glTextureSize,

            (pageX + glyphData.x) / glTextureSize,
            (pageY + glyphData.y + glyphData.height) / glTextureSize
        ]
    );
};

parsegraph_GlyphPainter.prototype.clear = function()
{
    this._textBuffers = {};
    this._textBuffer.clear();
    this._maxSize = 0;
};

parsegraph_GlyphPainter.prototype.render = function(world, scale)
{
    //console.log(scale);
    //console.log("Max scale of a single largest glyph would be: " + (this._maxSize *scale));
    if(scale < .1 && this._maxSize*scale < 2) {
        return;
    }

    if(this._maxSize / (world[0]/world[8]) < 1) {
        return;
    }

    var gl = this._gl;
    this.glyphAtlas().update(gl);

    // Load program.
    this._gl.useProgram(this._textProgram);

    gl.activeTexture(gl.TEXTURE0);

    // Render text.
    gl.uniformMatrix3fv(
        this.u_world,
        false,
        world
    );
    this._textBuffer.renderPages();
};
