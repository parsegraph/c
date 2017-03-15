function parsegraph_Label(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
    this._text = undefined;
    this._labelX = undefined;
    this._labelY = undefined;
}

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
