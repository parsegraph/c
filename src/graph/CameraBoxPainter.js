function parsegraph_CameraBoxPainter(gl, glyphAtlas, shaders)
{
    this._blockPainter = new parsegraph_BlockPainter(gl, shaders);
    this._glyphPainter = new parsegraph_GlyphPainter(gl, glyphAtlas, shaders);

    this._glyphAtlas = glyphAtlas;
    this._borderColor = new parsegraph_Color(1, 1, 1, 0.1);
    this._backgroundColor = new parsegraph_Color(1, 1, 1, 0.1);
    this._textColor = new parsegraph_Color(1, 1, 1, 1);
    this._fontSize = 24;
}

parsegraph_CameraBoxPainter.prototype.clear = function()
{
    this._glyphPainter.clear();
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

    var label = new parsegraph_Label(this._glyphAtlas);
    label.setText(name);
    var lw = label.width()*(this._fontSize/this._glyphAtlas.fontSize())/scale;

    label.paint(this._glyphPainter,
        rect.x() - lw/2,
        rect.y() - rect.height()/2,
        (this._fontSize/this._glyphAtlas.fontSize())/scale
    );
};

parsegraph_CameraBoxPainter.prototype.render = function(world) {
    this._blockPainter.render(world);
    this._glyphPainter.render(world);
};
