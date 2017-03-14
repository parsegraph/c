function parsegraph_Label()
{
    this._text = undefined;
    this._labelX = undefined;
    this._labelY = undefined;
}

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
