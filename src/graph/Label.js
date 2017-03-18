function parsegraph_Label(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
    this._text = undefined;
}

/**
 * Given a click in world (absolute) coordinates, return the index into this node's label.
 *
 * If this node's label === undefined, then null is returned. Otherwise, a value between
 * [0, this.label().length()] is returned. Zero indicates a position before the first
 * character, just as this.label().length() indicates a position past the end.
 *
 * World coordinates are clamped to the boundaries of the node.
 */
parsegraph_Label.prototype.clickToCaret = function(worldX, worldY, scale, style, paintGroup)
{
    if(!this.text()) {
        return null;
    }

    var caretPos = paintGroup.worldToTextCaret(
        this.text(),
        style.fontSize * scale,
        null,
        worldX,
        worldY
    );
    return caretPos;
};

parsegraph_Label.prototype.size = function(style, bodySize)
{
    if(!bodySize) {
        bodySize = new parsegraph_Size();
    }
    else {
        bodySize.reset();
    }
    this._glyphAtlas.measureText(this.text(), null, bodySize);
    bodySize[0] *= style.fontSize / this._glyphAtlas.fontSize();
    bodySize[1] *= style.fontSize / this._glyphAtlas.fontSize();
    bodySize[0] = Math.max(style.minWidth, bodySize[0]);
    bodySize[1] = Math.max(style.minHeight, bodySize[1]);
    return bodySize;
};

parsegraph_Label.prototype.setText = function(text)
{
    if(this._text == text) {
        return false;
    }
    this._text = text;
    return true;
};

parsegraph_Label.prototype.text = function()
{
    return this._text;
};
