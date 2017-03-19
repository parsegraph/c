function parsegraph_CameraBoxPainter(gl, glyphAtlas, shaders)
{
    this._blockPainter = new parsegraph_BlockPainter(gl, shaders);
    this._textPainter = new parsegraph_TextPainter(gl, glyphAtlas, shaders);

    this._borderColor = new parsegraph_Color(1, 1, 1, 0.1);
    this._backgroundColor = new parsegraph_Color(1, 1, 1, 0.1);
    this._textColor = new parsegraph_Color(1, 1, 1, 1);
    this._fontSize = 24;
}

parsegraph_CameraBoxPainter.prototype.clear = function()
{
    this._textPainter.clear();
    this._blockPainter.clear();
};

parsegraph_CameraBoxPainter.prototype.drawBox = function(name, rect, scale)
{
    var painter = this._blockPainter;
    painter.setBorderColor(this._borderColor);
    painter.setBackgroundColor(this._backgroundColor);
    painter.drawBlock(
        rect.x(),
        rect.y(),
        rect.width(),
        rect.height(),
        0.01,
        .1,
        scale
    );

    painter = this._textPainter;
    painter.setFontSize(this._fontSize/scale);
    var textMetrics = painter.measureText(name);
    painter.setPosition(
        rect.x() - textMetrics[0]/2,
        rect.y() - rect.height()/2
    );
    painter.drawText(name);
};

parsegraph_CameraBoxPainter.prototype.render = function(world) {
    this._blockPainter.render(world);
    this._textPainter.render(world);
};
