parsegraph_GlyphPage_COUNT = 0;
function parsegraph_GlyphPage()
{
    this._id = parsegraph_GlyphPage_COUNT++;
    this._glyphTexture = null;
    this._firstGlyph = false;
    this._lastGlyph = false;
    this.next = null;
    this._queued = [];
}

function parsegraph_GlyphData(glyphPage, glyph, x, y, width, height, ascent, descent, advance)
{
    this.glyphPage = glyphPage;
    this.letter = glyph;
    this.length = this.letter.length;
    this.painted = false;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.ascent = ascent;
    this.descent = descent;
    this.advance = advance;
    this.next = null;
}

/**
 * TODO Allow a max texture width of 1024, by paging the texture.
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
parsegraph_GlyphAtlas_COUNT = 0;
function parsegraph_GlyphAtlas(fontSizePixels, fontName, fillStyle)
{
    this._id = parsegraph_GlyphAtlas_COUNT++;
    this._fontSize = fontSizePixels;
    this._fontName = fontName;
    this._fillStyle = fillStyle;
    this._font = null;

    this._canvas = document.createElement("canvas");
    this._canvas.width = this.maxTextureWidth();
    this._canvas.height = this.maxTextureWidth();
    this._ctx = this._canvas.getContext("2d");
    this.restoreProperties();

    this._firstPage = null;
    this._lastPage = null;
    this._needsUpdate = true;

    this._glyphData = {};
    this._currentRowHeight = 0;

    // Atlas working position.
    this._padding = this.fontSize() / 4;
    this._x = this._padding;
    this._y = this._padding;
    this._unicode = null;
}

parsegraph_GlyphAtlas.prototype.setUnicode = function(uni)
{
    if(!uni.loaded()) {
        throw new Error("Unicode provided has not been loaded.");
    }
    this._unicode = uni;
}

parsegraph_GlyphAtlas.prototype.unicode = function()
{
    return this._unicode;
}

parsegraph_GlyphAtlas.prototype.toString = function()
{
    return "[GlyphAtlas " + this._id + "]";
}

parsegraph_GlyphAtlas.prototype.getGlyph = function(glyph)
{
    if(typeof glyph !== "string") {
        glyph = String.fromCharCode(glyph);
    }
    var glyphData = this._glyphData[glyph];
    if(glyphData !== undefined) {
        return glyphData;
    }
    var letter = this._ctx.measureText(glyph);
    var letterWidth = letter.width;
    var letterHeight = this.letterHeight();
    var letterAscent = 0;
    var letterDescent = 0;
    var advance = letterWidth;

    var glyphPage = this._lastPage;
    if(!glyphPage) {
        glyphPage = new parsegraph_GlyphPage(this);
        this._lastPage = glyphPage;
        this._firstPage = glyphPage;
    }

    if(this._currentRowHeight < letterHeight) {
        this._currentRowHeight = letterHeight;
    }

    var maxTextureWidth = this.maxTextureWidth();
    if(this._x + letterWidth + this._padding > this.maxTextureWidth()) {
        // Move to the next row.
        this._x = this._padding;
        this._y += this._currentRowHeight + this._padding;
        this._currentRowHeight = letterHeight;
    }
    if(this._y + this._currentRowHeight + this._padding > this.maxTextureWidth()) {
        // Move to the next page.
        glyphPage = new parsegraph_GlyphPage();
        this._lastPage.next = glyphPage;
        this._lastPage = glyphPage;
        this._x = this._padding;
        this._y = this._padding;
        this._currentRowHeight = letterHeight;
    }

    var glyphData = new parsegraph_GlyphData(glyphPage, glyph, this._x, this._y, letterWidth, letterHeight, letterAscent, letterDescent, advance);
    this._glyphData[glyph] = glyphData;

    if(glyphPage._lastGlyph) {
        glyphPage._lastGlyph.next = glyphData;
        glyphPage._lastGlyph = glyphData;
    }
    else {
        glyphPage._firstGlyph = glyphData;
        glyphPage._lastGlyph = glyphData;
    }

    this._x += glyphData.width + this._padding;
    this._needsUpdate = true;

    return glyphData;
};
parsegraph_GlyphAtlas.prototype.get = parsegraph_GlyphAtlas.prototype.getGlyph;

parsegraph_GlyphAtlas.prototype.hasGlyph = function(glyph)
{
    var glyphData = this._glyphData[glyph];
    return glyphData !== undefined;
};
parsegraph_GlyphAtlas.prototype.has = parsegraph_GlyphAtlas.prototype.hasGlyph;

/**
 * Updates the given WebGL instance with this texture.
 *
 * ga.update(); // Updates the standard GL instance.
 * ga.update(gl); // Updates the given GL instance and clears old one.
 */
parsegraph_GlyphAtlas.prototype.update = function(gl)
{
    if(!this._font) {
        this.restoreProperties();
    }
    if(arguments.length === 0) {
        gl = this._gl;
    }
    if(!this._needsUpdate && this._gl === gl) {
        return;
    }
    if(this._gl !== gl) {
        this.clear();
    }

    this._needsUpdate = false;
    this._gl = gl;

    for(var page = this._firstPage; page; page = page.next) {
        var maxTextureWidth = this.maxTextureWidth();

        this._ctx.clearRect(0, 0, this.maxTextureWidth(), this.maxTextureWidth());

        for(var glyphData = page._firstGlyph; glyphData; glyphData = glyphData.next) {
            this._ctx.fillText(
                glyphData.letter,
                glyphData.x,
                glyphData.y + this.fontBaseline()
            );
        }

        // Create texture.
        if(!page._glyphTexture) {
            page._glyphTexture = gl.createTexture();
        }

        // Draw from 2D canvas.
        gl.bindTexture(gl.TEXTURE_2D, page._glyphTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this._canvas
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // Prevents t-coordinate wrapping (repeating).
        //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
};

parsegraph_GlyphAtlas.prototype.clear = function()
{
    if(!this._gl) {
        return;
    }
    for(var page = this._firstPage; page; page = page.next) {
        if(page._glyphTexture) {
            this._gl.deleteTexture(page._glyphTexture);
        }
    }
};

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
    return 512;
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
