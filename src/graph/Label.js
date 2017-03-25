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

parsegraph_Label.prototype.drawGlyph = function(letter, worldX, worldY)
{
    var glyphData = this.glyphAtlas().getGlyph(letter);
    glyphData.painted = true;

    // Change lines if needed.
    var fontScale = this.fontScale();
    if(this.wrapWidth()) {
        if(this._lineAdvance + glyphData.width * fontScale > this.wrapWidth()) {
            this.nextLine();
        }
    }
    else if(this._glyphAtlas.isNewline(letter)) {
        this.nextLine();
    }

    // Append position data.
    var x = this.letterX();
    var y = this.letterY();

    var buf = this._textBuffer;
    buf.appendData(
        this.a_position,
        [
            x, y,
            x + glyphData.width * fontScale, y,
            x + glyphData.width * fontScale, y + glyphData.height * fontScale,

            x, y,
            x + glyphData.width * fontScale, y + glyphData.height * fontScale,
            x, y + glyphData.height * fontScale
        ]
    );

    // Append color data.
    for(var k = 0; k < 3 * 2; ++k) {
        buf.appendData(
            this.a_color,
            this._color.r(),
            this._color.g(),
            this._color.b(),
            this._color.a()
        );
    }
    for(var k = 0; k < 3 * 2; ++k) {
        buf.appendData(
            this.a_backgroundColor,
            this._backgroundColor.r(),
            this._backgroundColor.g(),
            this._backgroundColor.b(),
            this._backgroundColor.a()
        );
    }

    // Append texture coordinate data.
    buf.appendData(
        this.a_texCoord,
        [
            glyphData.x / this._glyphAtlas.canvas().width,
            glyphData.y / this._glyphAtlas.canvas().height,

            (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
            glyphData.y / this._glyphAtlas.canvas().height,

            (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
            (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height,

            glyphData.x / this._glyphAtlas.canvas().width,
            glyphData.y / this._glyphAtlas.canvas().height,

            (glyphData.x + glyphData.width) / this._glyphAtlas.canvas().width,
            (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height,

            glyphData.x / this._glyphAtlas.canvas().width,
            (glyphData.y + glyphData.height) / this._glyphAtlas.canvas().height
        ]
    );

    // Add the letter's width to the line advance.
    this._lineAdvance += glyphData.width * fontScale;
    this._lineHeight = Math.max(glyphData.height * fontScale, this._lineHeight);

    return glyphData.width * fontScale;
};

parsegraph_Label.prototype.findCaretPos = function(text, paragraphX, paragraphY, foundPos)
{
    if(!foundPos) {
        foundPos = [];
    }
    foundPos[0] = null;
    foundPos[1] = null;
    foundPos[2] = null;

    var x = 0;
    var y = 0;
    var i = 0;

    var fontSize = this.fontSize();
    var wrapWidth = this.wrapWidth();
    var fontScale = this.fontScale();
    var glyphData;

    // Clamp the world coordinates to the boundaries of the text.
    var labelSize = this.measureText(text);
    paragraphX = Math.max(0, paragraphX);
    paragraphY = Math.max(0, paragraphY);
    paragraphX = Math.min(labelSize[0], paragraphX);
    paragraphY = Math.min(labelSize[1], paragraphY);

    var maxLineWidth = 0;
    var startTime = parsegraph_getTimeInMillis();
    //console.log(paragraphX + ", " + paragraphY);
    while(true) {
        if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
            throw new Error("TextPainter.measureText timeout");
        }
        var letter = fixedCharAt(text, i);
        //console.log(letter);
        if(letter === null) {
            // Reached the end of the string.
            maxLineWidth = Math.max(maxLineWidth, x);
            if(glyphData) {
                y += glyphData.height * fontScale;
            }
            break;
        }

        var glyphData = this._glyphAtlas.getGlyph(letter);
        //console.log(x + " Glyph width: " + (glyphData.width * fontScale));

        // Check for wrapping.
        //console.log("Need to wrap");
        var shouldWrap = false;
        if(wrapWidth) {
            shouldWrap = (x + glyphData.width * fontScale) > wrapWidth;
        }
        else {
            shouldWrap = this._glyphAtlas.isNewline(letter);
        }

        if(shouldWrap) {
            if(paragraphY >= y && paragraphY <= y + glyphData.height * fontScale && paragraphX >= x) {
                // It's past the end of line, so that's actually the previous character.
                --i;
                break;
            }

            maxLineWidth = Math.max(maxLineWidth, x);
            x = 0;
            y += this._glyphAtlas.letterHeight() * fontScale;
            //console.log("Break: " + i);
        }

        if(
            paragraphX >= x && paragraphY >= y
            && paragraphX <= x + glyphData.width * fontScale
            && paragraphY <= y + glyphData.height * fontScale
        ) {
            // Within this letter!
            foundPos[0] = x;
            foundPos[1] = y;
            foundPos[2] = glyphData.width * fontScale;
            foundPos[3] = glyphData.height * fontScale;
            foundPos[4] = i;
            break;
        }

        i += letter.length;
        x += glyphData.width * fontScale;
    }

    return foundPos;
};

parsegraph_Label.prototype.indexToCaret = function(text, paragraphX, paragraphY, foundPos)
{
    if(!foundPos) {
        foundPos = [];
    }
    foundPos[0] = null;
    foundPos[1] = null;
    foundPos[2] = null;

    var x = 0;
    var y = 0;
    var i = 0;

    var fontSize = this.fontSize();
    var wrapWidth = this.wrapWidth();
    var fontScale = this.fontScale();
    var glyphData;

    // Clamp the world coordinates to the boundaries of the text.
    var labelSize = this.measureText(text);
    paragraphX = Math.max(0, paragraphX);
    paragraphY = Math.max(0, paragraphY);
    paragraphX = Math.min(labelSize[0], paragraphX);
    paragraphY = Math.min(labelSize[1], paragraphY);

    var maxLineWidth = 0;
    var startTime = parsegraph_getTimeInMillis();
    //console.log(paragraphX + ", " + paragraphY);
    while(true) {
        if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
            throw new Error("TextPainter.measureText timeout");
        }
        var letter = fixedCharAt(text, i);
        //console.log(letter);
        if(letter === null) {
            // Reached the end of the string.
            maxLineWidth = Math.max(maxLineWidth, x);
            if(glyphData) {
                y += glyphData.height * fontScale;
            }
            break;
        }

        var glyphData = this._glyphAtlas.getGlyph(letter);
        //console.log(x + " Glyph width: " + (glyphData.width * fontScale));

        // Check for wrapping.
        //console.log("Need to wrap");
        var shouldWrap = false;
        if(wrapWidth) {
            shouldWrap = (x + glyphData.width * fontScale) > wrapWidth;
        }
        else {
            shouldWrap = this._glyphAtlas.isNewline(letter);
        }

        if(shouldWrap) {
            if(paragraphY >= y && paragraphY <= y + glyphData.height * fontScale && paragraphX >= x) {
                // It's past the end of line, so that's actually the previous character.
                --i;
                break;
            }

            maxLineWidth = Math.max(maxLineWidth, x);
            x = 0;
            y += this._glyphAtlas.letterHeight() * fontScale;
            //console.log("Break: " + i);
        }

        if(
            paragraphX >= x && paragraphY >= y
            && paragraphX <= x + glyphData.width * fontScale
            && paragraphY <= y + glyphData.height * fontScale
        ) {
            // Within this letter!
            foundPos[0] = x;
            foundPos[1] = y;
            foundPos[2] = glyphData.width * fontScale;
            foundPos[3] = glyphData.height * fontScale;
            foundPos[4] = i;
            break;
        }

        i += letter.length;
        x += glyphData.width * fontScale;
    }

    return foundPos;
};

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

/**
 * Returns the trailing horizontal edge of the current letter position.
 */
parsegraph_Label.prototype.letterX = function()
{
    return this._paragraphX + this._lineAdvance;
};

/**
 * Returns the trailing vertical edge of the current letter position.
 */
parsegraph_Label.prototype.letterY = function()
{
    return this._paragraphY + this._paragraphAdvance;
};

/**
 * Returns the trailing edge of the currently rendered paragraph.
 */
parsegraph_Label.prototype.paragraphX = function()
{
    return this._paragraphX;
};

/**
 * Returns the top edge of the currently rendered paragraph.
 */
parsegraph_Label.prototype.paragraphY = function()
{
    return this._paragraphY;
};

/**
 * Sets the line position to the beginning of the paragraph backward edge, at the
 * top of the next line.
 */
parsegraph_Label.prototype.nextLine = function()
{
    this._lineAdvance = 0;

    // If there was no line height, then default to the glyph atlas's default height.
    if(this._lineHeight === 0) {
        this._lineHeight += this._glyphAtlas.letterHeight() * this.fontScale();
    }

    this._paragraphAdvance += this.lineHeight();
    this._lineHeight = 0;
};

/**
 * Sets the paragraph position to the bottom of the current paragraph.
 */
parsegraph_Label.prototype.nextParagraph = function()
{
    this._paragraphAdvance = 0;
    this._paragraphY += this._paragraphAdvance;
};

/**
 * Returns the line height using the current font size, in world coordinates.
 */
parsegraph_Label.prototype.lineHeight = function()
{
    return this._lineHeight;
};

/**
 * Returns the current X position of this painter. The painter's X position will be advanced
 * using drawGlyph calls.
 *
 * The letter is drawn with its top-"backward" corner being at the given X position, in world
 * coordinates.
 */
parsegraph_Label.prototype.x = function()
{
    return this._x;
};

/**
 * Returns the current Y position of this painter.
 *
 * The letter is drawn with its top-"backward" corner being at the given Y position, in world
 * coordinates.
 */
parsegraph_Label.prototype.y = function()
{
    return this._y;
};

parsegraph_Label.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
};

parsegraph_Label.prototype.size = function(outPos)
{
    if(!this._glyphAtlas) {
        throw new Error("No glyph atlas provided");
    }
    var wrapWidth;
    if(this.wrapWidth()) {
        wrapWidth = this.wrapWidth();
    }
    else {
        wrapWidth = null;
    }
    var x = 0;
    var y = 0;
    var i = 0;

    var glyphData;

    // Allow a new size to be created.
    if(!outPos) {
        outPos = new parsegraph_Size();
    }

    var atlas = this.glyphAtlas();
    var maxLineWidth = 0;
    var startTime = parsegraph_getTimeInMillis();
    var text = this.getText();
    while(true) {
        if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
            throw new Error("TextPainter.measureText timeout");
        }
        var letter = fixedCharAt(text, i);
        if(letter === null) {
            // Reached the end of the string.
            maxLineWidth = Math.max(maxLineWidth, x);
            if(glyphData) {
                y += glyphData.height;
            }
            break;
        }

        var glyphData = atlas.getGlyph(letter);

        // Check for wrapping.
        var shouldWrap = false;
        if(wrapWidth) {
            shouldWrap = (x + glyphData.width) > wrapWidth;
        }
        else {
            shouldWrap = atlas.isNewline(letter);
        }

        if(shouldWrap) {
            maxLineWidth = Math.max(maxLineWidth, x);
            x = 0;
            y += glyphData.height;
        }

        i += letter.length;
        x += glyphData.width;
    }

    outPos[0] = maxLineWidth;
    outPos[1] = y;
    return outPos;
};

parsegraph_Label.prototype.setWrapWidth = function(wrapWidth)
{
    this._wrapWidth = wrapWidth;
};

parsegraph_Label.prototype.wrapWidth = function()
{
    return this._wrapWidth;
};

parsegraph_Label.prototype.paint = function(painter)
{
    var i = 0;
    var text = this.getText();
    while(true) {
        var letter = fixedCharAt(text, i);
        if(!letter) {
            return;
        }
        painter.drawGlyph(letter);
        i += letter.length;
    }
}
