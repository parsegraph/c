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
    "gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n" +
    "highp float opacity = texture2D(u_glyphTexture, texCoord.st).a;" +
    "if(backgroundColor.a == 0.0) {" +
        "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);" +
    "}" +
    "else {" +
        "gl_FragColor = mix(backgroundColor, fragmentColor, opacity);" +
    "}" +
"}";

function parsegraph_GlyphPainter(window, font)
{
    if(!font) {
        throw new Error("Font must be provided");
    }
    this._font = font;
    this._id = ++parsegraph_GlyphPainter_COUNT;

    this._window = window;
    this._textBuffers = {};
    this._numTextBuffers = 0;
    this._maxSize = 0;

    this._textProgram = null;

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    this._stride = 48;
    this._vertexBuffer = new Float32Array(this._stride/4);

    this._color = parsegraph_createColor(1, 1, 1, 1);
    this._backgroundColor = parsegraph_createColor(0, 0, 0, 0);
};

parsegraph_GlyphPainter.prototype.window = function()
{
    return this._window;
};

parsegraph_GlyphPainter.prototype.contextChanged = function(isLost)
{
    this._textProgram = null;
    this.clear();
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
    return this._font.fontSize();
};

parsegraph_GlyphPainter.prototype.font = function()
{
    return this._font;
};

function parsegraph_GlyphPageRenderer(painter, textureIndex)
{
    this._painter = painter;
    this._textureIndex = textureIndex;
    this._glyphBuffer = null;
    this._glyphBufferNumVertices = null;
    this._glyphBufferVertexIndex = 0;
    this._dataBufferVertexIndex = 0;
    this._dataBufferNumVertices = 6;
    this._dataBuffer = new Float32Array(this._dataBufferNumVertices*this._painter._stride/4);
}

parsegraph_GlyphPageRenderer.prototype.initBuffer = function(numGlyphs)
{
    if(this._glyphBufferNumVertices/6 === numGlyphs) {
        //console.log("Reusing existing buffer");
        this._glyphBufferVertexIndex = 0;
        this._dataBufferVertexIndex = 0;
        return;
    }
    else {
        //console.log("Recreating buffer with " + numGlyphs + " from " + this._glyphBufferNumVertices);
    }
    if(this._glyphBuffer) {
        this.clear();
    }
    var gl = this._painter.window().gl();
    this._glyphBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._painter._stride*6*numGlyphs, gl.STATIC_DRAW);
    this._glyphBufferNumVertices = numGlyphs*6;
};

parsegraph_GlyphPageRenderer.prototype.clear = function()
{
    var gl = this._painter.window().gl();
    if(this._glyphBuffer && !gl.isContextLost()) {
        gl.deleteBuffer(this._glyphBuffer);
    }
    this._glyphBuffer = null;
    this._glyphBufferNumVertices = null;
    this._dataBufferVertexIndex = 0;
    this._glyphBufferVertexIndex = 0;
};

parsegraph_GlyphPageRenderer.prototype.flush = function()
{
    if(this._dataBufferVertexIndex === 0) {
        return;
    }
    var gl = this._painter.window().gl();
    var stride = this._painter._stride;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);

    if(this._dataBufferVertexIndex + this._glyphBufferVertexIndex > this._glyphBufferNumVertices) {
        throw new Error("GL buffer of " + this._glyphBufferNumVertices + " vertices is full; cannot flush all " + this._dataBufferVertexIndex + " vertices because the GL buffer already has " + this._glyphBufferVertexIndex + " vertices.");
    }
    if(this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
        //console.log("Writing " + this._dataBufferNumVertices + " vertices to offset " + this._glyphBufferVertexIndex + " of " + this._glyphBufferNumVertices + " vertices");
        gl.bufferSubData(gl.ARRAY_BUFFER, this._glyphBufferVertexIndex*stride, this._dataBuffer);
    }
    else {
        //console.log("Partial flush (" + this._glyphBufferVertexIndex + "/" + this._glyphBufferNumVertices + " from " + (this._dataBufferVertexIndex*stride/4) + ")");
        gl.bufferSubData(gl.ARRAY_BUFFER, this._glyphBufferVertexIndex*stride, this._dataBuffer.slice(0, this._dataBufferVertexIndex*stride/4));
    }
    this._glyphBufferVertexIndex += this._dataBufferVertexIndex;
    this._dataBufferVertexIndex = 0;
};

parsegraph_GlyphPageRenderer.prototype.writeVertex = function()
{
    var pos = this._dataBufferVertexIndex++ * this._painter._stride/4;
    this._dataBuffer.set(this._painter._vertexBuffer, pos);
    if(this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
        this.flush();
    }
};

parsegraph_GlyphPageRenderer.prototype.drawGlyph = function(glyphData, x, y, fontScale)
{
    var gl = this._painter.window().gl();
    var font = this._painter.font();
    var glTextureSize = parsegraph_getTextureSize(gl);
    if(gl.isContextLost()) {
        return;
    }
    var pageTextureSize = font.pageTextureSize();
    var pagesPerRow = glTextureSize / pageTextureSize;
    var pagesPerTexture = Math.pow(pagesPerRow, 2);
    var pageIndex = glyphData.glyphPage._id % pagesPerTexture;
    var pageX = pageTextureSize * (pageIndex % pagesPerRow);
    var pageY = pageTextureSize * Math.floor(pageIndex / pagesPerRow);

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    var buf = this._painter._vertexBuffer;

    // Append color data.
    var color = this._painter._color;
    buf[2] = color.r();
    buf[3] = color.g();
    buf[4] = color.b();
    buf[5] = color.a();

    // Append background color data.
    var bg = this._painter._backgroundColor;
    buf[6] = bg.r();
    buf[7] = bg.g();
    buf[8] = bg.b();
    buf[9] = bg.a();

    // Position data.
    buf[0] = x;
    buf[1] = y;
    // Texcoord data
    buf[10] = (pageX + glyphData.x) / glTextureSize;
    buf[11] = (pageY + glyphData.y) / glTextureSize;
    this.writeVertex();

    // Position data.
    buf[0] = x + glyphData.width * fontScale;
    buf[1] = y;
    // Texcoord data
    buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
    buf[11] = (pageY + glyphData.y) / glTextureSize;
    this.writeVertex();

    // Position data.
    buf[0] = x + glyphData.width * fontScale;
    buf[1] = y + glyphData.height * fontScale;
    // Texcoord data
    buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
    buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
    this.writeVertex();

    // Position data.
    buf[0] = x;
    buf[1] = y;
    // Texcoord data
    buf[10] = (pageX + glyphData.x) / glTextureSize;
    buf[11] = (pageY + glyphData.y) / glTextureSize;
    this.writeVertex();

    // Position data.
    buf[0] = x + glyphData.width * fontScale;
    buf[1] = y + glyphData.height * fontScale;
    // Texcoord data
    buf[10] = (pageX + glyphData.x + glyphData.width) / glTextureSize;
    buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
    this.writeVertex();

    // Position data.
    buf[0] = x;
    buf[1] = y + glyphData.height * fontScale;
    // Texcoord data
    buf[10] = (pageX + glyphData.x) / glTextureSize;
    buf[11] = (pageY + glyphData.y + glyphData.height) / glTextureSize;
    this.writeVertex();
};

parsegraph_GlyphPageRenderer.prototype.render = function()
{
    if(!this._glyphBuffer) {
        throw new Error("GlyphPageRenderer must be initialized before rendering");
    }
    this.flush();
    if(this._glyphBufferVertexIndex === 0) {
        return;
    }
    var gl = this._painter.window().gl();
    var glyphTexture = this._painter._font._pages[this._textureIndex]._glyphTexture[this._painter.window().id()];
    //console.log("Rendering " + (this._glyphBufferVertexIndex/6) + " glyphs of glyph page " + this._textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, glyphTexture);
    gl.uniform1i(this._painter.u_glyphTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._glyphBuffer);
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
    gl.drawArrays(gl.TRIANGLES, 0, this._glyphBufferVertexIndex);
};

parsegraph_GlyphPainter.prototype.drawGlyph = function(glyphData, x, y, fontScale)
{
    if(typeof glyphData !== "object") {
        glyphData = this._font.getGlyph(glyphData);
    }
    glyphData.painted = true;

    var gl = this.window().gl();
    var glTextureSize = parsegraph_getTextureSize(gl);
    if(gl.isContextLost()) {
        return;
    }
        //console.log("GLTEXTURESIZE=" + this._glTextureSize);
    var pagesPerRow = glTextureSize / this.font().pageTextureSize();
    var pagesPerTexture = Math.pow(pagesPerRow, 2);

    // Select the correct buffer.
    var gpid = Math.floor(glyphData.glyphPage._id/pagesPerTexture);
    var gp = this._textBuffers[gpid];
    if(!gp) {
        throw new Error("GlyphPageRenderer " + gpid + " must be available when drawing glyph.");
    }

    if(this._maxSize < glyphData.width * fontScale) {
        this._maxSize = glyphData.width * fontScale;
    }
    gp.drawGlyph(glyphData, x, y, fontScale);
};

parsegraph_GlyphPainter.prototype.initBuffer = function(numGlyphs)
{
    var maxPage = NaN;
    for(var i in numGlyphs) {
        if(i == "font") {
            continue;
        }
        if(Number.isNaN(maxPage)) {
            maxPage = i;
        }
        maxPage = Math.max(i, maxPage);
        var gp = this._textBuffers[i];
        if(!gp) {
            gp = new parsegraph_GlyphPageRenderer(this, i);
            ++this._numTextBuffers;
            this._textBuffers[i] = gp;
        }
        gp.initBuffer(numGlyphs[i]);
    }
    if(Number.isNaN(maxPage)) {
        maxPage = -1;
    }
    for(var j=maxPage+1; j < this._numTextBuffers; ++j) {
        var gp = this._textBuffers[j];
        gp.clear();
        delete this._textBuffers[j];
    }
};

parsegraph_GlyphPainter.prototype.clear = function()
{
    for(var i in this._textBuffers) {
        var gp = this._textBuffers[i];
        gp.clear();
    }
    this._textBuffers = {};
    this._numTextBuffers = 0;
    this._maxSize = 0;
};

parsegraph_GlyphPainter.prototype.render = function(world, scale)
{
    this._font.update(this._window);
    //console.log(new Error("GlyphPainter scale="+scale));
    //console.log("Max scale of a single largest glyph would be: " + (this._maxSize *scale));
    if(scale < .1 && this._maxSize*scale < 2) {
        return;
    }

    if(this._maxSize / (world[0]/world[8]) < 1) {
        return;
    }

    var gl = this.window().gl();
    if(gl.isContextLost()) {
        return;
    }

    // Compile the shader program.
    if(this._textProgram === null) {
        this._textProgram = parsegraph_compileProgram(this.window(),
            "parsegraph_GlyphPainter",
            parsegraph_GlyphPainter_VertexShader,
            parsegraph_GlyphPainter_FragmentShader
        );

        // Cache program locations.
        this.u_world = gl.getUniformLocation(
            this._textProgram, "u_world"
        );
        this.u_glyphTexture = gl.getUniformLocation(
            this._textProgram, "u_glyphTexture"
        );
        this.a_position = gl.getAttribLocation(this._textProgram, "a_position");
        this.a_color = gl.getAttribLocation(this._textProgram, "a_color");
        this.a_backgroundColor = gl.getAttribLocation(this._textProgram, "a_backgroundColor");
        this.a_texCoord = gl.getAttribLocation(this._textProgram, "a_texCoord");
    }

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
