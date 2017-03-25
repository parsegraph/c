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

function parsegraph_Line(label, text)
{
    this._label = label;
    this._glyphs = [];
    this._width = 0;
    this._height = 0;
    this.addText(text);
}

parsegraph_Line_Tests = new parsegraph_TestSuite("parsegraph_Line");

parsegraph_Line_Tests.addTest("new parsegraph_Line", function() {
    var atlas = new parsegraph_GlyphAtlas();
    var label = new parsegraph_Label(atlas);
    var l = new parsegraph_Line(label);
    var f = 0;
    try {
        var l = new parsegraph_Line(null);
        f = 2;
    }
    catch(ex) {
        f = 3;
    }
    if(f !== 3) {
        return "Failed to recognize null label";
    }
});

parsegraph_Line.prototype.isEmpty = function()
{
    return this._width === 0;
}

parsegraph_Line.prototype.glyphAtlas = function()
{
    return this._label.glyphAtlas();
}

parsegraph_Line.prototype.addText = function(text)
{
    var i = 0;
    var atlas = this.glyphAtlas();
    if(!atlas) {
        throw new Error("Line cannot add text without the label having a GlyphAtlas.");
    }
    var checkTimeout = parsegraph_timeout("parsegraph_Line.addText");
    while(true) {
        checkTimeout();

        // Retrieve letter.
        var letter = fixedCharAt(text, i);

        // Test for completion.
        if(letter === null) {
            return;
        }

        var glyphData = atlas.getGlyph(letter);
        this._glyphs.push(glyphData);

        // Increment.
        this._height = Math.max(this._height, glyphData.height);
        this._width += glyphData.width;
        i += letter.length;
    }
};

parsegraph_Line.prototype.getText = function()
{
    var t = "";
    this._glyphs.forEach(function(glyphData) {
        t += glyphData.letter;
    });
    return t;
}

parsegraph_Line.prototype.linePos = function()
{
    return this._linePos;
}

parsegraph_Line.prototype.label = function()
{
    return this._label;
}

parsegraph_Line.prototype.width = function()
{
    return this._width;
}

parsegraph_Line.prototype.height = function()
{
    return this._height;
}

parsegraph_Line.prototype.glyphs = function()
{
    return this._glyphs;
}

function parsegraph_Label(glyphAtlas)
{
    if(!glyphAtlas) {
        throw new Error("Label requires a GlyphAtlas.");
    }
    this._glyphAtlas = glyphAtlas;
    this._wrapWidth = null;
    this._lines = [];
}

parsegraph_Label.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
}

parsegraph_Label.prototype.isEmpty = function()
{
    for(var i = 0; i < this._lines.length; ++i) {
        var l = this._lines[i];
        if(!l.isEmpty()) {
            return false;
        }
    }
    return true;
}

parsegraph_Label_Tests.addTest("isEmpty", function() {
    var atlas = parsegraph_defaultGlyphAtlas();
    var l = new parsegraph_Label(atlas);
    if(!l.isEmpty()) {
        return "New label must begin as empty.";
    }
    l.setText("No time");
    if(l.isEmpty()) {
        return "Label with text must test as non-empty.";
    }
});

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
    this._lines.forEach(function(l) {
        t += l.getText() + '\n';
    });
    return t;
}
parsegraph_Label.prototype.text = parsegraph_Label.prototype.getText;

parsegraph_Label.prototype.setText = function(text)
{
    this._lines = [];
    this._currentLine = 0;
    this._currentPos = 0;
    this._width = 0;
    this._height = 0;
    text.split(/\n/).forEach(function(textLine) {
        var l = new parsegraph_Line(this, textLine);
        this._lines.push(l);
        this._width = Math.max(this._width, l.width());
        this._height += l.height();
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

parsegraph_Label.prototype.fontSize = function()
{
    return this._glyphAtlas.fontSize();
};

parsegraph_Label.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
};

parsegraph_Label.prototype.width = function()
{
    return this._width;
};

parsegraph_Label.prototype.height = function()
{
    return this._height;
};

parsegraph_Label.prototype.paint = function(painter, worldX, worldY, fontScale)
{
    if(this.glyphAtlas() !== painter.glyphAtlas()) {
        throw new Error("Painter must use the same glyph atlas as this label: " + this.glyphAtlas() + ", " + painter.glyphAtlas());
    }
    var x = 0;
    var y = 0;
    this._lines.forEach(function(l, i) {
        l._glyphs.forEach(function(glyphData, j) {
            painter.drawGlyph(glyphData, worldX + x, worldY + y, fontScale);
            x += glyphData.width * fontScale;
        });
        y += l.height() * fontScale;
    });
}
