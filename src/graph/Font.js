function parsegraph_GlyphPage(font)
{
    this._id = font._maxPage++;
    this._glyphTexture = {};
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

function parsegraph_FontWindow(font, window)
{
    this._glTextureSize = null;
    this._numGlyphs = 0;
    this._textureArray = null;
}

/**
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
parsegraph_Font_COUNT = 0;
function parsegraph_Font(fontSizePixels, fontName, fillStyle)
{
    this._id = parsegraph_Font_COUNT++;
    this._fontSize = fontSizePixels;
    this._fontName = fontName;
    this._fillStyle = fillStyle;
    //console.log("Creating font " + this);

    this._measureCanvas = document.createElement("canvas");
    this._measureCtx = this._measureCanvas.getContext("2d");
    this._measureCtx.font = this.font();
    this._measureCtx.fillStyle = this._fillStyle;

    this._windows = {};
    this._renderCanvas = null;
    this._renderCtx = null;

    this._pages = [];
    this._numGlyphs = 0;

    this._glyphData = {};
    this._currentRowHeight = 0;

    // Glyph atlas working position.
    this._padding = this.fontSize() / 4;
    this._x = this._padding;
    this._y = this._padding;

    this._maxPage = 0;
}

parsegraph_Font.prototype.toString = function()
{
    return "[parsegraph_Font " + this._id + ": " + this._fontName + " " + this._fillStyle + "]";
}

parsegraph_Font.prototype.getGlyph = function(glyph)
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

    var glyphPage = null;
    if(this._pages.length === 0) {
        glyphPage = new parsegraph_GlyphPage(this);
        this._pages.push(glyphPage);
    }
    else {
        glyphPage = this._pages[this._pages.length - 1];
    }

    if(this._currentRowHeight < letterHeight) {
        this._currentRowHeight = letterHeight;
    }

    var pageTextureSize = this.pageTextureSize();
    if(this._x + letterWidth + this._padding > pageTextureSize) {
        // Move to the next row.
        this._x = this._padding;
        this._y += this._currentRowHeight + this._padding;
        this._currentRowHeight = letterHeight;
    }
    if(this._y + this._currentRowHeight + this._padding > pageTextureSize) {
        // Move to the next page.
        glyphPage = new parsegraph_GlyphPage(this);
        this._pages.push(glyphPage);
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
    ++this._numGlyphs;

    return glyphData;
};
parsegraph_Font.prototype.get = parsegraph_Font.prototype.getGlyph;

parsegraph_Font.prototype.hasGlyph = function(glyph)
{
    var glyphData = this._glyphData[glyph];
    return glyphData !== undefined;
};
parsegraph_Font.prototype.has = parsegraph_Font.prototype.hasGlyph;

parsegraph_Font.prototype.contextChanged = function(isLost, window)
{
    if(!isLost) {
        return;
    }
    this.dispose(window);
};

parsegraph_Font.prototype.update = function(window)
{
    if(!window) {
        throw new Error("Window must be provided");
    }
    var gl = window.gl();
    if(gl.isContextLost()) {
        return;
    }
    var td = new Date();
    var pageTextureSize = this.pageTextureSize();
    var ctx = this._windows[window.id()];
    if(!ctx) {
        ctx = new parsegraph_FontWindow(this, window);
        this._windows[window.id()] = ctx;
    }
    var gl = window.gl();
    if(gl.isContextLost()) {
        return;
    }
    if(!ctx._glTextureSize) {
        ctx._glTextureSize = parsegraph_getTextureSize(gl);
        //console.log("GLTEXTURESIZE=" + ctx._glTextureSize);
        ctx._textureArray = new Uint8Array(ctx._glTextureSize*ctx._glTextureSize);
    }
    if(!this._renderCanvas) {
        this._renderCanvas = document.createElement("canvas");
        this._renderCanvas.width = pageTextureSize;
        this._renderCanvas.height = pageTextureSize;
        this._renderCtx = this._renderCanvas.getContext("2d");
        this._renderCtx.font = this.font();
        this._renderCtx.fillStyle = this._fillStyle;
    }
    if(ctx._numGlyphs === this._numGlyphs) {
        //console.log("Dont need update");
        return;
    }
    //console.log(this.fullName() + " has " + this._numGlyphs + " and window has " + ctx._numGlyphs);
    ctx._numGlyphs = 0;

    var pageX = 0;
    var pageY = 0;
    var curTexture = null;
    var pagesUpdated = 0;
    for(var i in this._pages) {
        var page = this._pages[i];
        //console.log("Painting page " + page._id);
        this._renderCtx.clearRect(0, 0, pageTextureSize, pageTextureSize);
        for(var glyphData = page._firstGlyph; glyphData; glyphData = glyphData.next) {
            this._renderCtx.fillText(
                glyphData.letter,
                glyphData.x,
                glyphData.y + this.fontBaseline()
            );
            ++ctx._numGlyphs;
        }

        // Create texture.
        if(!curTexture) {
            curTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, curTexture);
            var ut = new Date();
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.ALPHA, ctx._glTextureSize, ctx._glTextureSize, 0, gl.ALPHA, gl.UNSIGNED_BYTE, ctx._textureArray
            );
            //console.log("Upload time: " + parsegraph_elapsed(ut));
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            // Prevents t-coordinate wrapping (repeating).
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        page._glyphTexture[window.id()] = curTexture;

        // Draw from 2D canvas.
        gl.texSubImage2D(
            gl.TEXTURE_2D, 0, pageX, pageY, gl.ALPHA, gl.UNSIGNED_BYTE, this._renderCanvas
        );
        pageX += pageTextureSize;
        if(pageX >= ctx._glTextureSize) {
            pageY += pageTextureSize;
            pageX = 0;
        }
        if(pageY >= ctx._glTextureSize) {
            pageY = 0;
            pageX = 0;
            gl.generateMipmap(gl.TEXTURE_2D);
            curTexture = null;
        }
        ++pagesUpdated;
    }
    //this._renderCanvas.style.position = "absolute";
    //this._renderCanvas.style.pointerEvents = "none";
    //document.body.appendChild(this._renderCanvas);
    if(curTexture) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    //console.log("Font updated " + pagesUpdated + " page(s) in " + parsegraph_elapsed(td) + "ms");
};

parsegraph_Font.prototype.dispose = function(window)
{
    var ctx = this._windows[window.id()];
    if(!ctx) {
        return;
    }
    var gl = ctx._gl;
    for(var i in this._pages) {
        var page = this._pages[i];
        if(page._glyphTexture[window.id()]) {
            var tex = page._glyphTexture[window.id()];
            if(gl && !gl.isContextLost()) {
                gl.deleteTexture(tex);
            }
            delete page._glyphTexture[window.id()];
        }
    }
    ctx._numGlyphs = 0;
};

parsegraph_Font.prototype.clear = function()
{
    for(var i in this._pages) {
        var page = this._pages[i];
        for(var wid in page._glyphTexture) {
            var tex = page._glyphTexture[wid];
            var ctx = this._windows[wid];
            if(ctx && ctx._gl && !ctx._gl.isContextLost()) {
                ctx._gl.deleteTexture(tex);
            }
        }
        page._glyphTexture = {};
    }
    for(var wid in this._windows) {
        this._windows[wid]._numGlyphs = 0;
    }
};

parsegraph_Font.prototype.font = function()
{
    return this._fontSize + "px " + this._fontName;
};

parsegraph_Font.prototype.pageTextureSize = function()
{
    return parsegraph_MAX_PAGE_WIDTH;
};

parsegraph_Font.prototype.letterHeight = function()
{
    return this.fontSize() * 1.3;
};

parsegraph_Font.prototype.fontBaseline = function()
{
    return this.fontSize();
};

parsegraph_Font.prototype.fontSize = function()
{
    return this._fontSize;
};

parsegraph_Font.prototype.fullName = function()
{
    return this._fontName + " " + this._fillStyle;
};

parsegraph_Font.prototype.fontName = function()
{
    return this._fontName;
};

parsegraph_Font.prototype.isNewline = function(c)
{
    return c === '\n';
};
