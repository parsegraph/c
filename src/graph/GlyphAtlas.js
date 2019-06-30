function parsegraph_GlyphPage(id)
{
    this._id = id;
    this._glyphTexture = null;
    this._firstGlyph = false;
    this._lastGlyph = false;
    this.next = null;
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

    this._glTextureSize = null;
    this._measureCanvas = document.createElement("canvas");
    this._measureCtx = this._measureCanvas.getContext("2d");
    this._measureCtx.font = this.font();
    this._measureCtx.fillStyle = this._fillStyle;

    this._renderCanvas = null;
    this._renderCtx = null;

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
    var letter = this._measureCtx.measureText(glyph);
    var letterWidth = letter.width;
    var letterHeight = this.letterHeight();
    var letterAscent = 0;
    var letterDescent = 0;
    var advance = letterWidth;

    var glyphPage = this._lastPage;
    if(!glyphPage) {
        glyphPage = new parsegraph_GlyphPage(0);
        this._lastPage = glyphPage;
        this._firstPage = glyphPage;
    }

    if(this._currentRowHeight < letterHeight) {
        this._currentRowHeight = letterHeight;
    }

    var pageTextureSize = this.pageTextureSize();
    if(this._x + letterWidth + this._padding > this.pageTextureSize()) {
        // Move to the next row.
        this._x = this._padding;
        this._y += this._currentRowHeight + this._padding;
        this._currentRowHeight = letterHeight;
    }
    if(this._y + this._currentRowHeight + this._padding > this.pageTextureSize()) {
        // Move to the next page.
        glyphPage = new parsegraph_GlyphPage(this._lastPage._id + 1);
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

function parsegraph_getGlyphTextureSize(gl)
{
    return Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
}

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
        //console.log("Dont need update");
        return;
    }
    else {
        //console.log("Updating glyphAtlas");
        this._needsUpdate = false;
    }
    if(this._gl !== gl) {
        this.clear();
        this._gl = gl;
        this._glTextureSize = parsegraph_getGlyphTextureSize(this._gl);
        console.log("GLTEXTURESIZE=" + this._glTextureSize);
        this._renderCanvas = document.createElement("canvas");
        this._renderCanvas.width = this._glTextureSize;
        this._renderCanvas.height = this._glTextureSize;
        this._renderCtx = this._renderCanvas.getContext("2d");
        this._renderCtx.font = this.font();
        this._renderCtx.fillStyle = this._fillStyle;
    }

    var pageX = 0;
    var pageY = 0;
    var curTexture = null;
    for(var page = this._firstPage; page; page = page.next) {
        //console.log("Painting page " + page._id);
        var pageTextureSize = this.pageTextureSize();
        this._renderCtx.clearRect(pageX, pageY, pageX + pageTextureSize, pageY + pageTextureSize);
        for(var glyphData = page._firstGlyph; glyphData; glyphData = glyphData.next) {
            this._renderCtx.fillText(
                glyphData.letter,
                pageX + glyphData.x,
                pageY + glyphData.y + this.fontBaseline()
            );
        }

        // Create texture.
        if(!curTexture) {
            curTexture = gl.createTexture();
        }
        page._glyphTexture = curTexture;

        var needsBind = page === this._lastPage;
        pageX += pageTextureSize;
        if(pageX >= this._glTextureSize) {
            pageY += pageTextureSize;
            pageX = 0;
        }
        if(pageY >= this._glTextureSize) {
            pageY = 0;
            pageX = 0;
            needsBind = true;
        }

        if(!needsBind) {
            continue;
        }
        // Draw from 2D canvas.
        gl.bindTexture(gl.TEXTURE_2D, curTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this._renderCanvas
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // Prevents t-coordinate wrapping (repeating).
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        curTexture = null;
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

parsegraph_GlyphAtlas.prototype.font = function()
{
    return this._fontSize + "px " + this._fontName;
};

parsegraph_GlyphAtlas.prototype.pageTextureSize = function()
{
    return 1024;
};

parsegraph_GlyphAtlas.prototype.glTextureWidth = function()
{
    return this._glTextureWidth;
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
