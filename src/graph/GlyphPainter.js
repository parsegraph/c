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
    "highp float opacity = texture2D(u_glyphTexture, texCoord.st).a;" +
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
    this._textBuffers = {};
    this._maxSize = 0;

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    this._stride = 48;
    this._itemBuffer = new DataView(new ArrayBuffer(this._stride));

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textProgram, "u_world"
    );
    this.u_glyphTexture = this._gl.getUniformLocation(
        this._textProgram, "u_glyphTexture"
    );
    this.a_position = this._gl.getAttribLocation(this._textProgram, "a_position");
    this.a_color = this._gl.getAttribLocation(this._textProgram, "a_color");
    this.a_backgroundColor = this._gl.getAttribLocation(this._textProgram, "a_backgroundColor");
    this.a_texCoord = this._gl.getAttribLocation(this._textProgram, "a_texCoord");

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

function parsegraph_GlyphPageRenderer(painter, textureIndex)
{
    this._painter = painter;
    this._textureIndex = textureIndex;
    this._numGlyphs = null;
    this._buffer = null;
}

parsegraph_GlyphPageRenderer.prototype.initBuffer = function(numGlyphs)
{
    var gl = this._painter._gl;
    this._buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._painter._stride*6*numGlyphs, gl.STATIC_DRAW);
    this._numGlyphs = numGlyphs;
    this._numVertices = 0;
};

parsegraph_GlyphPageRenderer.prototype.clear = function()
{
    if(!this._buffer) {
        return;
    }
    var gl = this._painter._gl;
    gl.deleteBuffer(this._buffer);
    this._buffer = null;
    this._numVertices = null;
};

parsegraph_GlyphPageRenderer.prototype.render = function()
{
    if(!this._buffer) {
        throw new Error("GlyphPageRenderer must be initialized before rendering");
    }
    var gl = this._painter._gl;
    //console.log("Rendering " + (this._numVertices/6) + " glyphs of glyph page " + this._glyphTexture);
    var glyphTexture = this._painter._glyphAtlas._pages[this._textureIndex]._glyphTexture;
    //console.log(glyphTexture);
    gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
    gl.uniform1i(this._painter.u_glyphTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._buffer);
    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    var painter = this._painter;
    var stride = this._painter._stride;
    gl.vertexAttribPointer(painter.a_position, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(painter.a_color, 4, gl.FLOAT, false, stride, 8);
    gl.vertexAttribPointer(painter.a_backgroundColor, 4, gl.FLOAT, false, stride, 24);
    gl.vertexAttribPointer(painter.a_texCoord, 2, gl.FLOAT, false, stride, 40);
    gl.drawArrays(gl.TRIANGLES, 0, this._numVertices);
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
    var gp = this._textBuffers[Math.floor(glyphData.glyphPage._id/pagesPerTexture)];
    if(!gp) {
        throw new Error("GlyphPageRenderer must be available when drawing glyph.");
    }

    if(this._maxSize < glyphData.width * fontScale) {
        this._maxSize = glyphData.width * fontScale;
    }

    var pageIndex = glyphData.glyphPage._id % pagesPerTexture;
    var pageX = this.glyphAtlas().pageTextureSize() * (pageIndex % pagesPerRow);
    var pageY = this.glyphAtlas().pageTextureSize() * Math.floor(pageIndex / pagesPerRow);

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    var endian = true;
    var buf = this._itemBuffer;

    // Append color data.
    buf.setFloat32(8, this._color.r(), endian);
    buf.setFloat32(12, this._color.g(), endian);
    buf.setFloat32(16, this._color.b(), endian);
    buf.setFloat32(20, this._color.a(), endian);

    // Append background color data.
    buf.setFloat32(24, this._backgroundColor.r(), endian);
    buf.setFloat32(28, this._backgroundColor.g(), endian);
    buf.setFloat32(32, this._backgroundColor.b(), endian);
    buf.setFloat32(36, this._backgroundColor.a(), endian);

    var gl = this._gl;
    var stride = this._stride;

    gl.bindBuffer(gl.ARRAY_BUFFER, gp._buffer);

    // Position data.
    buf.setFloat32(0, x, endian);
    buf.setFloat32(4, y, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);

    // Position data.
    buf.setFloat32(0, x + glyphData.width * fontScale, endian);
    buf.setFloat32(4, y, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x + glyphData.width) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);

    // Position data.
    buf.setFloat32(0, x + glyphData.width * fontScale, endian);
    buf.setFloat32(4, y + glyphData.height * fontScale, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x + glyphData.width) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y + glyphData.height) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);

    // Position data.
    buf.setFloat32(0, x, endian);
    buf.setFloat32(4, y, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);

    // Position data.
    buf.setFloat32(0, x + glyphData.width * fontScale, endian);
    buf.setFloat32(4, y + glyphData.height * fontScale, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x + glyphData.width) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y + glyphData.height) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);

    // Position data.
    buf.setFloat32(0, x, endian);
    buf.setFloat32(4, y + glyphData.height * fontScale, endian);
    // Texcoord data
    buf.setFloat32(40, (pageX + glyphData.x) / glTextureSize, endian);
    buf.setFloat32(44, (pageY + glyphData.y + glyphData.height) / glTextureSize, endian);
    gl.bufferSubData(gl.ARRAY_BUFFER, gp._numVertices++*stride, buf.buffer);
};

parsegraph_GlyphPainter.prototype.initBuffer = function(numGlyphs)
{
    for(var i in numGlyphs) {
        var gp = new parsegraph_GlyphPageRenderer(this, i);
        gp.initBuffer(numGlyphs[i]);
        this._textBuffers[i] = gp;
    }
};

parsegraph_GlyphPainter.prototype.clear = function()
{
    for(var i in this._textBuffers) {
        var gp = this._textBuffers;
        gp.clear();
    }
    this._textBuffers = {};
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

    // Load program.
    gl.useProgram(this._textProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniformMatrix3fv(this.u_world, false, world);

    // Render glyphs for each page.
    gl.enableVertexAttribArray(this.a_position);
    gl.enableVertexAttribArray(this.a_texCoord);
    gl.enableVertexAttribArray(this.a_color);
    gl.enableVertexAttribArray(this.a_backgroundColor);
    for(var i in this._textBuffers) {
        var gp = this._textBuffers[i];
        gp.render();
    }
    gl.disableVertexAttribArray(this.a_position);
    gl.disableVertexAttribArray(this.a_texCoord);
    gl.disableVertexAttribArray(this.a_color);
    gl.disableVertexAttribArray(this.a_backgroundColor);
};
