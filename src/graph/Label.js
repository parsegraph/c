function parsegraph_Label(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
    this._text = undefined;
    this._labelX = undefined;
    this._labelY = undefined;
}

parsegraph_Label.prototype.size = function(style)
{
    // XXX This should somehow not be global, but it's an ugly wart.
    var bodySize = parsegraph_createSize();
    var textMetrics = parsegraph_PAINTING_GLYPH_ATLAS.measureText(
        this.text(),
        parsegraph_PAINTING_GLYPH_ATLAS.fontSize()
            * style.letterWidth
            * style.maxLabelChars
    );
    textMetrics[0] *= style.fontSize / parsegraph_PAINTING_GLYPH_ATLAS.fontSize();
    textMetrics[1] *= style.fontSize / parsegraph_PAINTING_GLYPH_ATLAS.fontSize();

    bodySize.setWidth(
        Math.max(style.minWidth, textMetrics[0])
    );
    bodySize.setHeight(
        Math.max(style.minHeight, textMetrics[1])
    );
    return bodySize;
};

parsegraph_Label.prototype.getPosition = function()
{
    return [this._labelX, this._labelY];
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
