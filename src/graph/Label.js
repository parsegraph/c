parsegraph_Label_Tests = new parsegraph_TestSuite("parsegraph_Label");

parsegraph_Label_Tests.addTest("parsegraph_defaultGlyphAtlas", function() {
    var glyphAtlas = parsegraph_defaultGlyphAtlas();
    if(!glyphAtlas) {
        return "No glyph atlas created";
    }
});

parsegraph_Label_Tests.addTest("new parsegraph_Label", function() {
    var glyphAtlas = parsegraph_defaultGlyphAtlas();
    var label = new parsegraph_Label(glyphAtlas);
    if(!label) {
        return "No label created";
    }
});

parsegraph_Label_Tests.addTest("parsegraph_Label.label", function() {
    var glyphAtlas = parsegraph_defaultGlyphAtlas();
    var label = new parsegraph_Label(glyphAtlas);
    if(!label) {
        return "No label created";
    }

    var car = new parsegraph_Caret('s');
    car.label("No time");
});

function parsegraph_Line(label, text, linePos)
{
    this._label = label;
    this._text = text;
    this._linePos = linePos;
}

parsegraph_Line.prototype.text = function()
{
    return this._text;
}

parsegraph_Line.prototype.linePos = function()
{
    return this._linePos;
}

parsegraph_Line.prototype.label = function()
{
    return this._label;
}

function parsegraph_Label(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
    this.setText("");
}

parsegraph_Label.prototype.forEach = function(func, funcThisArg)
{
    if(!funcThisArg) {
        funcThisArg = this;
    }
    this._lines.forEach(func, funcThisArg);
}

parsegraph_Label.prototype.getText = function()
{
    var t = "";
    this.forEach(function(l) {
        t += l.text() + '\n';
    });
    return t;
}
parsegraph_Label.prototype.text = parsegraph_Label.prototype.getText;

parsegraph_Label.prototype.setText = function(text)
{
    this._lines = [];
    this._currentLine = 0;
    this._currentPos = 0;
    text.split(/\n/).forEach(function(l) {
        this._lines.push(new parsegraph_Line(this, l));
    }, this);
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
parsegraph_Label.prototype.clickToCaret = function(worldX, worldY, scale, style, paintGroup, caretPos)
{
    if(!this.text()) {
        return null;
    }

    paintGroup.worldToTextCaret(
        this.text(),
        style.fontSize * scale,
        null,
        worldX - this[0],
        worldY - this[1],
        caretPos
    );
    caretPos[0] += this[0];
    caretPos[1] += this[1];
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
    if(!this._glyphAtlas) {
        throw new Error("No glyph atlas provided");
    }
    this._glyphAtlas.measureText(
        this.text(), null, bodySize
    );
    bodySize[0] *= style.fontSize / this._glyphAtlas.fontSize();
    bodySize[1] *= style.fontSize / this._glyphAtlas.fontSize();
    bodySize[0] = Math.max(style.minWidth, bodySize[0]);
    bodySize[1] = Math.max(style.minHeight, bodySize[1]);
    return bodySize;
};
