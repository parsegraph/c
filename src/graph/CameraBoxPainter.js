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

parsegraph_CameraBoxPainter.prototype.drawBox = function(name, rect, scale, mouseX, mouseY, when)
{
    var painter = this._blockPainter;

    var now = new Date();
    var diff = parsegraph_timediffMs(when, now);
    var zc = new parsegraph_Color(0, 0, 0, 0);
    var interp = 1;
    var fadeDelay = 500;
    var fadeLength = 1000;
    if(diff > fadeDelay) {
        interp = 1 - (diff-fadeDelay)/fadeLength;
    }
    this._borderColor.setA(0.1*interp);
    this._backgroundColor.setA(0.1*interp);
    painter.setBorderColor(this._borderColor);
    painter.setBackgroundColor(this._backgroundColor);
    this._glyphPainter.color().setA(interp);
    this._glyphPainter.backgroundColor().setA(interp);

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
    var lh = label.height()*(this._fontSize/this._glyphAtlas.fontSize())/scale;

    if(mouseX === undefined) {
        mouseX = rect.width()/2 - lw;
    }
    if(mouseY === undefined) {
        mouseY = 0;
    }
    if(mouseX < 0) {
        mouseX = 0;
    }
    mouseX = Math.min(mouseX, rect.width());
    mouseY = Math.min(mouseY, rect.height());
    if(mouseY < 0) {
        mouseY = 0;
    }

    label.paint(this._glyphPainter,
        rect.x() - lw/2 - rect.width()/2 + mouseX/scale,
        rect.y() - lh/2 - rect.height()/2 + mouseY/scale,
        (this._fontSize/this._glyphAtlas.fontSize())/scale
    );

    return interp > 0;
};

parsegraph_CameraBoxPainter.prototype.render = function(world, scale) {
    this._blockPainter.render(world, scale);
    this._glyphPainter.render(world, scale);
};
