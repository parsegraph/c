/**
 * TODO Allow a max texture width of 1024, by paging the texture.
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
function parsegraph_GlyphAtlas(fontSizePixels, fontName, fillStyle)
{
    this._canvas = document.createElement("canvas");
    this._canvas.width = this.maxTextureWidth();
    this._canvas.height = this.maxTextureWidth();
    this._distanceCanvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d");
    this._fontSize = fontSizePixels;
    this._fontName = fontName;
    this._fillStyle = fillStyle;
    this.restoreProperties();
    this._glyphTexture = null;

    this._glyphData = {};

    // Atlas working position.
    this._padding = this.fontSize() / 4;
    this._x = this._padding;
    this._y = this._padding;
}

parsegraph_GlyphAtlas.prototype.addGlyph = function(glyph)
{
    var letter = this._ctx.measureText(glyph);

    if(this._x + letter.width + this._padding > this.maxTextureWidth()) {
        // Move to the next row.
        this._x = this._padding;
        this._y += this.letterHeight() + this._padding;
    }

    var glyphData = {
        x: this._x,
        y: this._y,
        width: letter.width,
        height: this.letterHeight(),
        texture: 0
    };
    this._glyphData[glyph] = glyphData;

    this._ctx.fillText(
        glyph,
        glyphData.x,
        glyphData.y + this.fontBaseline()
    );

    // Advance to the next letter.
    this._x += letter.width + this._padding;
    this._needsUpdate = true;

    return glyphData;
};

parsegraph_GlyphAtlas.prototype.getGlyph = function(glyph)
{
    var glyphData = this._glyphData[glyph];
    if(glyphData !== undefined) {
        return glyphData;
    }
    return this.addGlyph(glyph);
};

/**
 * Updates the given WebGL instance with this texture.
 *
 * ga.update(); // Updates the standard GL instance.
 * ga.update(gl); // Updates the given GL instance and clears old one.
 */
parsegraph_GlyphAtlas.prototype.update = function(gl)
{
    if(arguments.length === 0) {
        gl = this._gl;
    }
    if(!this._needsUpdate && this._gl === gl) {
        return;
    }
    if(this._gl !== gl) {
        this.clear();
    }

    // Create texture.
    if(!this._glyphTexture) {
        this._glyphTexture = gl.createTexture();
    }

    // Draw from 2D canvas.
    gl.bindTexture(gl.TEXTURE_2D, this._glyphTexture);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this._canvas
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // Prevents t-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);

    this._needsUpdate = false;
};

parsegraph_GlyphAtlas.prototype.clear = function()
{
    if(!this._gl) {
        return;
    }
    this._gl.deleteTexture(this._glyphTexture);
    this._glyphTexture = null;
};

parsegraph_GlyphAtlas.prototype.bindTexture = function(gl)
{
    this.update(gl);
    gl.bindTexture(gl.TEXTURE_2D, this._glyphTexture);
};

parsegraph_GlyphAtlas.prototype.imageData = function()
{
    return this._ctx.getImageData(0, 0, this.maxTextureWidth(), this.maxTextureWidth());
};
parsegraph_GlyphAtlas.prototype.getImageData = parsegraph_GlyphAtlas.prototype.imageData;

parsegraph_GlyphAtlas.prototype.needsUpdate = function()
{
    return this._needsUpdate;
};

parsegraph_GlyphAtlas.prototype.restoreProperties = function()
{
    this._ctx.font = this.font();
    this._ctx.fillStyle = this._fillStyle;
    this._needsUpdate = true;
};

parsegraph_GlyphAtlas.prototype.font = function()
{
    return this._fontSize + "px " + this._fontName;
};

parsegraph_GlyphAtlas.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_GlyphAtlas.prototype.maxTextureWidth = function()
{
    return 2048;
};

parsegraph_GlyphAtlas.prototype.letterHeight = function()
{
    return this.fontSize() * 1.3;
};

parsegraph_GlyphAtlas.prototype.fontBaseline = function()
{
    return this.fontSize();
};

parsegraph_GlyphAtlas.prototype.fontSize = function()
{
    return this._fontSize;
};

parsegraph_GlyphAtlas.prototype.fontName = function()
{
    return this._fontName;
};

parsegraph_GlyphAtlas.prototype.isNewline = function(c)
{
    return c === '\n';
};
