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
    if(!label) {
        throw new Error("Label must not be null");
    }
    this._label = label;
    this._glyphs = [];
    this._width = 0;
    this._height = this.glyphAtlas().letterHeight();
    if(arguments.length > 1) {
        this.appendText(text);
    }
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

parsegraph_Line.prototype.remove = function(pos, count)
{
    var removed = this._glyphs.splice(pos, count);
    removed.forEach(function(glyphData) {
        this._width -= glyphData.width;
    }, this);
}

parsegraph_Line.prototype.appendText = function(text)
{
    var i = 0;
    var atlas = this.glyphAtlas();
    if(!atlas) {
        throw new Error("Line cannot add text without the label having a GlyphAtlas.");
    }
    var checkTimeout = parsegraph_timeout("parsegraph_Line.appendText");
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

parsegraph_Line.prototype.insertText = function(pos, text)
{
    var i = 0;
    var atlas = this.glyphAtlas();
    if(!atlas) {
        throw new Error("Line cannot add text without the label having a GlyphAtlas.");
    }
    var checkTimeout = parsegraph_timeout("parsegraph_Line.insertText");

    var spliced = [pos, 0];
    while(true) {
        checkTimeout();

        // Retrieve letter.
        var letter = fixedCharAt(text, i);

        // Test for completion.
        if(letter === null) {
            break;
        }

        var glyphData = atlas.getGlyph(letter);
        spliced.push(glyphData);

        // Increment.
        this._height = Math.max(this._height, glyphData.height);
        this._width += glyphData.width;
        i += letter.length;
    }

    this._glyphs.splice.apply(this._glyphs, spliced);
};

parsegraph_Line.prototype.getText = function()
{
    var t = "";
    this._glyphs.forEach(function(glyphData) {
        t += glyphData.letter;
    });
    return t;
}
parsegraph_Line.prototype.text = parsegraph_Line.prototype.getText;

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

parsegraph_Line.prototype.posAt = function(limit)
{
    var w = 0;
    for(var i = 0; i < limit && i < this._glyphs.length; ++i) {
        w += this._glyphs[i].width;
    }
    return w;
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
    this._caretLine = 0;
    this._caretPos = 0;
    this._editable = true;
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
        if(t.length > 0) {
            t += '\n';
        }
        t += l.getText();
    });
    return t;
}
parsegraph_Label.prototype.text = parsegraph_Label.prototype.getText;

parsegraph_Label.prototype.setText = function(text)
{
    if(typeof text !== "string") {
        text = "" + text;
    }
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

parsegraph_Label.prototype.moveCaretDown = function(world)
{
    console.log("Moving caret down");
}

parsegraph_Label.prototype.moveCaretUp = function(world)
{
    console.log("Moving caret up");
}

parsegraph_Label.prototype.moveCaretBackward = function(world)
{
    if(this._caretPos === 0) {
        if(this._caretLine <= 0) {
            return false;
        }
        this._caretLine--;
        this.caretPos = this._lines[this._caretLine]._glyphs.length;
        return true;
    }
    this._caretPos--;
    return true;
}

parsegraph_Label.prototype.moveCaretForward = function()
{
    if(this._caretPos == this._lines[this._caretLine]._glyphs.length) {
        if(this._caretLine === this._lines.length - 1) {
            // At the end.
            return false;
        }
        this._caretLine++;
        this._caretPos = 0;
        return true;
    }
    this._caretPos++;
    return true;
}

parsegraph_Label.prototype.backspaceCaret = function()
{
    var line = this._lines[this._caretLine];
    if(this._caretPos === 0) {
        if(this._caretLine === 0) {
            // Can't backspace anymore.
            return false;
        }
        this._caretLine--;
        this._caretPos = this._lines[this._caretLine]._glyphs.length;
        return true;
    }
    this._caretPos--;
    line.remove(this._caretPos, 1);
    this._width = null;
    return true;
}

parsegraph_Label.prototype.deleteCaret = function()
{
    var line = this._lines[this._caretLine];
    if(this._caretPos > line._glyphs.length - 1) {
        return false;
    }
    line.remove(this._caretPos, 1);
    this._width = null;
    return true;
}

parsegraph_Label.prototype.ctrlKey = function(key)
{
    switch(key) {
    case "Control":
    case "Alt":
    case "Shift":
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowDown":
    case "ArrowUp":
    case "Delete":
    case "Escape":
    case "PageUp":
    case "PageDown":
    case "Home":
    case "End":
    case "CapsLock":
    case "ScrollLock":
    case "NumLock":
    case "Insert":
    case "Break":
    case "Insert":
    case "Enter":
    case "Tab":
    case "Backspace":
    case "F1":
    case "F2":
    case "F3":
    case "F4":
    case "F5":
    case "F6":
    case "F7":
    case "F8":
    case "F9":
    case "F10":
    case "F11":
    case "F12":
    default:
        break;
    }
    return false;
}

parsegraph_Label.prototype.key = function(key)
{
    switch(key) {
    case "Control":
    case "Alt":
    case "Shift":
        break;
    case "ArrowLeft":
        return this.moveCaretBackward();
    case "ArrowRight":
        return this.moveCaretForward();
    case "ArrowDown":
        return this.moveCaretDown();
    case "ArrowUp":
        return this.moveCaretUp();
    case "Delete":
        return this.deleteCaret();
    case "Escape":
        break;
    case "PageUp":
    case "PageDown":
    case "Home":
    case "End":
    case "CapsLock":
    case "ScrollLock":
    case "NumLock":
    case "Insert":
    case "Break":
    case "Insert":
    case "Enter":
    case "Tab":
        break;
    case "Backspace":
        return this.backspaceCaret();
    case "F1":
    case "F2":
    case "F3":
    case "F4":
    case "F5":
    case "F6":
    case "F7":
    case "F8":
    case "F9":
    case "F10":
    case "F11":
    case "F12":
        break;
    default:
        // Insert some character.
        //this.setText(this._labelNode._label.text() + key);

        while(this._caretLine > this._lines.length) {
            this._lines.push(new parsegraph_Line(this));
        }
        var insertLine = this._lines[this._caretLine];
        var insertPos = Math.min(this._caretPos, insertLine._glyphs.length);
        if(insertPos === insertLine._glyphs.length) {
            insertLine.appendText(key);
        }
        else {
            insertLine.insertText(insertPos, key);
        }

        if(this._width !== null) {
            this._width = Math.max(insertLine.width(), this._width);
            this._height = Math.max(this._height, insertLine.height());
        }
        this._caretPos += key.length;
        return true;
    }
    return false;
}

parsegraph_Label.prototype.editable = function()
{
    return this._editable;
};

parsegraph_Label.prototype.setEditable = function(editable)
{
    this._editable = editable;
};

parsegraph_Label.prototype.click = function(x, y)
{
    if(y < 0 && x < 0) {
        this._caretLine = 0;
        this._caretPos = 0;
    }
    var curX = 0;
    var curY = 0;
    for(var i = 0; i < this._lines.length; ++i) {
        var line = this._lines[i];
        if(y > curY + line.height() && i != this._lines.length - 1) {
            // Some "next" line.
            curY += line.height();
            continue;
        }
        // Switch the caret line.
        this._caretLine = i;

        if(x < 0) {
            this._caretPos = 0;
            return;
        }
        for(var j = 0; j < line._glyphs.length; ++j) {
            var glyphData = line._glyphs[j];
            if(x > curX + glyphData.width) {
                curX += glyphData.width;
                continue;
            }
            if(x > curX + glyphData.width/2) {
                curX += glyphData.width;
                continue;
            }

            this._caretPos = j;
            //console.log("CaretPos=" + this._caretPos);
            return;
        }

        this._caretPos = line._glyphs.length;
        return;
    }
    throw new Error("click fall-through that should not be reached");
};

parsegraph_Label_Tests.addTest("Click before beginning", function() {
    var atlas = parsegraph_defaultGlyphAtlas();
    var l = new parsegraph_Label(atlas);
    l.setText("No time");
    l.click(-5, -5);

    if(l.caretLine() != 0) {
        return "caretLine";
    }
    if(l.caretPos() != 0) {
        return "caretPos";
    }
});

parsegraph_Label_Tests.addTest("Click on second character", function() {
    var atlas = parsegraph_defaultGlyphAtlas();
    var l = new parsegraph_Label(atlas);
    l.setText("No time");
    l.click(atlas.getGlyph('N').width + 1, 0);

    if(l.caretLine() != 0) {
        return "caretLine";
    }
    if(l.caretPos() != 1) {
        return "l.caretPos()=" + l.caretPos();
    }
});

parsegraph_Label_Tests.addTest("Click on second line", function() {
    var atlas = parsegraph_defaultGlyphAtlas();
    var l = new parsegraph_Label(atlas);
    l.setText("No time\nLol");
    l.click(atlas.getGlyph('L').width + 1, l.lineAt(0).height() + 1);

    if(l.caretLine() != 1) {
        return "caretLine";
    }
    if(l.caretPos() != 1) {
        return "l.caretPos()=" + l.caretPos();
    }
});

parsegraph_Label_Tests.addTest("Click past end", function() {
    var atlas = parsegraph_defaultGlyphAtlas();
    var l = new parsegraph_Label(atlas);
    l.setText("No time\nLol");
    l.click(atlas.getGlyph('L').width + 1, l.lineAt(0).height() + l.lineAt(1).height() + 1);

    if(l.caretLine() != 1) {
        return "caretLine";
    }
    if(l.caretPos() != 1) {
        return "l.caretPos()=" + l.caretPos();
    }
});

parsegraph_Label.prototype.lineAt = function(n)
{
    return this._lines[n];
};

parsegraph_Label.prototype.caretLine = function()
{
    return this._caretLine;
};

parsegraph_Label.prototype.caretPos = function()
{
    return this._caretPos;
};

parsegraph_Label.prototype.getCaretRect = function(outRect)
{
    if(!outRect) {
        outRect = new parsegraph_Rect();
    }
    var y = 0;
    for(var i = 0; i < this._caretLine; ++i) {
        y += this._lines[i].height();
    }
    var line = this._lines[this._caretLine];
    var x = line.posAt(this._caretPos);
    var cw = 5;
    outRect.setX(x + cw/2);
    outRect.setWidth(cw);
    outRect.setY(y + line.height()/2);
    outRect.setHeight(line.height());
    return outRect;
};

parsegraph_Label.prototype.glyphPos = function()
{
    return this._caretPos;
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
    if(this._width === null) {
        this._width = 0;
        this._lines.forEach(function(l) {
            this._width = Math.max(this._width, l.width());
        }, this);
    }
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
        x = 0;
    });
}
