import { parsegraph_defaultUnicode } from "../unicode";
import parsegraph_TestSuite from "../TestSuite";
import { parsegraph_RIGHT_TO_LEFT, parsegraph_defaultFont } from "./settings";
import parsegraph_Caret from "./Caret";
import Rect from "./Rect";

function parsegraph_GlyphIterator(font, text) {
  this.font = font;
  this.index = 0;
  this.len = text.length;
  this.prevLetter = null;
  this.text = text;
}

parsegraph_GlyphIterator.prototype.next = function () {
  var unicode = parsegraph_defaultUnicode();
  if (!unicode.loaded()) {
    return null;
  }
  if (this.index >= this.len) {
    return null;
  }
  var start = this.text[this.index];
  var startIndex = this.index;
  var len = 1;
  if (this.text.codePointAt(this.index) > 0xffff) {
    len = 2;
    start = this.text.substring(this.index, this.index + 2);
  }
  this.index += len;
  if (unicode.isMark(start)) {
    // Show an isolated mark.
    //parsegraph_log("Found isolated Unicode mark character %x.\n", start[0]);
    var rv = font.getGlyph(start);
    return rv;
  }

  //parsegraph_log("Found Unicode character %x.\n", start[0]);

  // Form ligatures.
  var givenLetter = start.charCodeAt(0);
  if (givenLetter === 0x627 && this.prevLetter == 0x644) {
    // LAM WITH ALEF.
    if (this.prevLetter) {
      // Has a previous glyph, so final.
      givenLetter = 0xfefc;
    } else {
      // Isolated form.
      givenLetter = 0xfefb;
    }
    // Skip the ligature'd character.
    this.prevLetter = 0x627;
    //parsegraph_log("Found ligature %x->%x\n", gi->prevLetter, givenLetter);
  } else {
    var nextLetterChar = null;
    for (var i = 0; this.index + i < this.len; ) {
      var nextLetter = this.text[this.index + i];
      var len = 1;
      if (nextLetter.codePointAt(0) > 0xffff) {
        nextLetter = this.text.substring(this.index + 1, this.index + 3);
        len = 2;
      }
      if (unicode.isMark(nextLetter)) {
        i += len;
        continue;
      }
      // given, prev, next
      if (unicode.cursive(nextLetter[0], givenLetter, null)) {
        nextLetterChar = nextLetter[0];
      }
      break;
    }
    // RTL: [ 4, 3, 2, 1]
    //        ^-next
    //           ^-given
    //              ^-prev
    var cursiveLetter = unicode.cursive(
      givenLetter,
      this.prevLetter,
      nextLetterChar
    );
    if (cursiveLetter != null) {
      //console.log("Found cursive char " + givenLetter.toString(16) + "->" + cursiveLetter.toString(16));
      this.prevLetter = givenLetter;
      givenLetter = cursiveLetter;
    } else {
      //console.log("Found non-cursive char " + givenLetter.toString(16) + ".");
      this.prevLetter = null;
    }
  }

  // Add diacritical marks and combine ligatures.
  var foundVirama = false;
  while (this.index < this.len) {
    var letter = this.text[this.index];
    var llen = 1;
    if (this.text.codePointAt(this.index) > 0xffff) {
      llen = 2;
      letter = this.text.substring(this.index, this.index + 2);
    }
    if (llen == 2 && this.index == this.len - 1) {
      throw new Error("Unterminated UTF-16 character");
    }

    if (unicode.isMark(letter)) {
      foundVirama = letter[0].charCodeAt(0) == 0x094d;
      len += llen;
      this.index += llen;
      //parsegraph_log("Found Unicode mark character %x.\n", letter[0]);
      continue;
    } else if (foundVirama) {
      foundVirama = 0;
      len += llen;
      this.index += llen;
      //parsegraph_log("Found Unicode character %x combined using Virama.\n", letter[0]);
      continue;
    }

    // Found a non-marking character that's part of a new glyph.
    break;
  }

  var trueText = this.text.substring(startIndex, startIndex + len);
  trueText = String.fromCodePoint(givenLetter) + trueText.substring(1);
  return this.font.getGlyph(trueText);
};

const parsegraph_Label_Tests = new parsegraph_TestSuite("parsegraph_Label");

parsegraph_Label_Tests.addTest("parsegraph_defaultFont", function () {
  var font = parsegraph_defaultFont();
  if (!font) {
    return "No font created";
  }
});

parsegraph_Label_Tests.addTest("new parsegraph_Label", function () {
  var font = parsegraph_defaultFont();
  var label = new parsegraph_Label(font);
  if (!label) {
    return "No label created";
  }
});

parsegraph_Label_Tests.addTest("parsegraph_Label.label", function () {
  var font = parsegraph_defaultFont();
  var label = new parsegraph_Label(font);
  if (!label) {
    return "No label created";
  }

  var car = new parsegraph_Caret("s");
  car.setFont(font);
  car.label("No time");
});

function parsegraph_Line(label, text) {
  if (!label) {
    throw new Error("Label must not be null");
  }
  this._label = label;

  // The glyphs contains the memory representation of the Unicode string represented by this line.
  //
  // Diacritics are represented as additional characters in Unicode. These characters result in a
  // unique texture rendering of the modified glyph.
  this._glyphs = [];
  this._width = 0;
  this._height = 0;
  this._text = "";
  if (arguments.length > 1 && text.length > 0) {
    this.appendText(text);
  }
}

const parsegraph_Line_Tests = new parsegraph_TestSuite("parsegraph_Line");

parsegraph_Line_Tests.addTest("new parsegraph_Line", function () {
  var font = parsegraph_defaultFont();
  var label = new parsegraph_Label(font);
  var l = new parsegraph_Line(label);
  var f = 0;
  try {
    var l = new parsegraph_Line(null);
    f = 2;
  } catch (ex) {
    f = 3;
  }
  if (f !== 3) {
    return "Failed to recognize null label";
  }
});

parsegraph_Line.prototype.isEmpty = function () {
  return this._width === 0;
};

parsegraph_Line.prototype.font = function () {
  return this._label.font();
};

parsegraph_Line.prototype.remove = function (pos, count) {
  var removed = this._glyphs.splice(pos, count);
  removed.forEach(function (glyphData) {
    this._width -= glyphData.width;
  }, this);
};

parsegraph_Line.prototype.appendText = function (text) {
  var i = 0;
  var font = this.font();
  if (!font) {
    throw new Error("Line cannot add text without the label having a font.");
  }

  var gi = new parsegraph_GlyphIterator(font, text);
  var glyphData = null;
  while ((glyphData = gi.next()) != null) {
    //console.log("LETTER: " + glyphData.letter);
    this._glyphs.push(glyphData);
    this._height = Math.max(this._height, glyphData.height);
    this._width += glyphData.advance;
  }

  this._text += text;
};

parsegraph_Line.prototype.insertText = function (pos, text) {
  var i = 0;
  var font = this.font();
  if (!font) {
    throw new Error("Line cannot add text without the label having a font.");
  }

  var gi = new parsegraph_GlyphIterator(font, text);
  var glyphData = null;
  var spliced = [pos, 0];
  for (var i = 0; (glyphData = gi.next()) != null; ++i) {
    spliced.push(glyphData);
    this._height = Math.max(this._height, glyphData.height);
    this._width += glyphData.advance;
  }

  this._glyphs.splice.apply(this._glyphs, spliced);

  this._text =
    this._text.slice(0, pos) +
    text +
    this._text.slice(pos + 1, this._text.length - pos);
};

parsegraph_Line.prototype.length = function () {
  var len = 0;
  this._glyphs.forEach(function (glyphData) {
    len += glyphData.letter.length;
  });
  return len;
};

parsegraph_Line.prototype.glyphCount = function (counts, pagesPerTexture) {
  if (counts) {
    this._glyphs.forEach(function (glyphData) {
      var bufIndex = Math.floor(glyphData.glyphPage._id / pagesPerTexture);
      if (Number.isNaN(bufIndex)) {
        throw new Error("Glyph page index must not be NaN");
      }
      if (!(bufIndex in counts)) {
        counts[bufIndex] = 1;
      } else {
        ++counts[bufIndex];
      }
    });
  }
  return this._glyphs.length;
};

parsegraph_Line.prototype.getText = function () {
  var t = "";
  this._glyphs.forEach(function (glyphData) {
    t += glyphData.letter;
  });
  return t;
};
parsegraph_Line.prototype.text = parsegraph_Line.prototype.getText;

parsegraph_Line.prototype.linePos = function () {
  return this._linePos;
};

parsegraph_Line.prototype.label = function () {
  return this._label;
};

parsegraph_Line.prototype.width = function () {
  return this._width;
};

parsegraph_Line.prototype.height = function () {
  return this._height;
};

parsegraph_Line.prototype.posAt = function (limit) {
  var w = 0;
  for (var i = 0; i < limit && i < this._glyphs.length; ++i) {
    w += this._glyphs[i].width;
  }
  return w;
};

parsegraph_Line.prototype.glyphs = function () {
  return this._glyphs;
};

//////////////////////////////////////
//
// LABEL CONSTRUCTOR
//
//////////////////////////////////////

export default function parsegraph_Label(font) {
  if (!font) {
    throw new Error("Label requires a font.");
  }
  this._font = font;
  this._wrapWidth = null;
  this._lines = [];
  this._caretLine = 0;
  this._caretPos = 0;
  this._editable = false;
  this._onTextChangedListener = null;
  this._onTextChangedListenerThisArg = null;
  this._width = -1;
  this._height = 0;

  this._x = null;
  this._y = null;
}

parsegraph_Label.prototype.font = function () {
  return this._font;
};

parsegraph_Label.prototype.isEmpty = function () {
  for (var i = 0; i < this._lines.length; ++i) {
    var l = this._lines[i];
    if (!l.isEmpty()) {
      return false;
    }
  }
  return true;
};

parsegraph_Label_Tests.addTest("isEmpty", function () {
  var font = parsegraph_defaultFont();
  var l = new parsegraph_Label(font);
  if (!l.isEmpty()) {
    return "New label must begin as empty.";
  }
  l.setText("No time");
  if (l.isEmpty()) {
    return "Label with text must test as non-empty.";
  }
});

parsegraph_Label.prototype.forEach = function (func, funcThisArg) {
  if (!funcThisArg) {
    funcThisArg = this;
  }
  this._lines.forEach(func, funcThisArg);
};

parsegraph_Label.prototype.getText = function () {
  var t = "";
  this._lines.forEach(function (l) {
    if (t.length > 0) {
      t += "\n";
    }
    t += l.getText();
  });
  return t;
};
parsegraph_Label.prototype.text = parsegraph_Label.prototype.getText;

parsegraph_Label.prototype.clear = function () {
  this._lines = [];
};

parsegraph_Label.prototype.length = function () {
  var totallen = 0;
  this._lines.forEach(function (l) {
    if (totallen.length > 0) {
      totallen += 1;
    }
    totallen += l.length();
  });
  return totallen;
};

parsegraph_Label.prototype.glyphCount = function (counts, pagesPerTexture) {
  var totallen = 0;
  this._lines.forEach(function (l) {
    totallen += l.glyphCount(counts, pagesPerTexture);
  });
  return totallen;
};

parsegraph_Label.prototype.setText = function (text) {
  if (typeof text !== "string") {
    text = "" + text;
  }
  this._lines = [];
  this._currentLine = 0;
  this._currentPos = 0;
  this._width = 0;
  this._height = 0;
  text.split(/\n/).forEach(function (textLine) {
    var l = new parsegraph_Line(this, textLine);
    this._lines.push(l);
    this._width = Math.max(this._width, l.width());
    this._height += l.height();
  }, this);
};

parsegraph_Label.prototype.moveCaretDown = function (world) {
  console.log("Moving caret down");
};

parsegraph_Label.prototype.moveCaretUp = function (world) {
  console.log("Moving caret up");
};

parsegraph_Label.prototype.moveCaretBackward = function (world) {
  if (this._caretPos === 0) {
    if (this._caretLine <= 0) {
      return false;
    }
    this._caretLine--;
    this._caretPos = this._lines[this._caretLine]._glyphs.length;
    return true;
  }
  this._caretPos--;
  return true;
};

parsegraph_Label.prototype.moveCaretForward = function () {
  if (this._caretPos == this._lines[this._caretLine]._glyphs.length) {
    if (this._caretLine === this._lines.length - 1) {
      // At the end.
      return false;
    }
    this._caretLine++;
    this._caretPos = 0;
    return true;
  }
  this._caretPos++;
  return true;
};

parsegraph_Label.prototype.backspaceCaret = function () {
  var line = this._lines[this._caretLine];
  if (this._caretPos === 0) {
    if (this._caretLine === 0) {
      // Can't backspace anymore.
      return false;
    }
    this._caretLine--;
    this._caretPos = this._lines[this._caretLine]._glyphs.length;
    this.textChanged();
    return true;
  }
  this._caretPos--;
  line.remove(this._caretPos, 1);
  this._width = null;
  this.textChanged();
  return true;
};

parsegraph_Label.prototype.deleteCaret = function () {
  var line = this._lines[this._caretLine];
  if (this._caretPos > line._glyphs.length - 1) {
    return false;
  }
  line.remove(this._caretPos, 1);
  this._width = null;
  this.textChanged();
  return true;
};

parsegraph_Label.prototype.ctrlKey = function (key) {
  switch (key) {
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
};

parsegraph_Label.prototype.key = function (key) {
  switch (key) {
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

      while (this._caretLine > this._lines.length) {
        this._lines.push(new parsegraph_Line(this));
      }
      var insertLine = this._lines[this._caretLine];
      var insertPos = Math.min(this._caretPos, insertLine._glyphs.length);
      if (insertPos === insertLine._glyphs.length) {
        insertLine.appendText(key);
      } else {
        insertLine.insertText(insertPos, key);
      }

      if (this._width !== null) {
        this._width = Math.max(insertLine.width(), this._width);
        this._height = Math.max(this._height, insertLine.height());
      }
      this._caretPos += key.length;
      this.textChanged();
      return true;
  }
  return false;
};

parsegraph_Label.prototype.onTextChanged = function (
  listener,
  listenerThisArg
) {
  this._onTextChangedListener = listener;
  this._onTextChangedListenerThisArg = listenerThisArg;
};

parsegraph_Label.prototype.textChanged = function () {
  if (this._onTextChangedListener) {
    return this._onTextChangedListener.call(
      this._onTextChangedListenerThisArg,
      this
    );
  }
};

parsegraph_Label.prototype.editable = function () {
  return this._editable;
};

parsegraph_Label.prototype.setEditable = function (editable) {
  this._editable = editable;
};

parsegraph_Label.prototype.click = function (x, y) {
  if (y < 0 && x < 0) {
    this._caretLine = 0;
    this._caretPos = 0;
  }
  var curX = 0;
  var curY = 0;
  for (var i = 0; i < this._lines.length; ++i) {
    var line = this._lines[i];
    if (y > curY + line.height() && i != this._lines.length - 1) {
      // Some "next" line.
      curY += line.height();
      continue;
    }
    // Switch the caret line.
    this._caretLine = i;

    if (x < 0) {
      this._caretPos = 0;
      return;
    }
    for (var j = 0; j < line._glyphs.length; ++j) {
      var glyphData = line._glyphs[j];
      if (x > curX + glyphData.width) {
        curX += glyphData.width;
        continue;
      }
      if (x > curX + glyphData.width / 2) {
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

parsegraph_Label_Tests.addTest("Click before beginning", function () {
  var font = parsegraph_defaultFont();
  var l = new parsegraph_Label(font);
  l.setText("No time");
  l.click(-5, -5);

  if (l.caretLine() != 0) {
    return "caretLine";
  }
  if (l.caretPos() != 0) {
    return "caretPos";
  }
});

parsegraph_Label_Tests.addTest("Click on second character", function () {
  var font = parsegraph_defaultFont();
  var l = new parsegraph_Label(font);
  l.setText("No time");
  l.click(font.getGlyph("N").width + 1, 0);

  if (l.caretLine() != 0) {
    return "caretLine";
  }
  if (l.caretPos() != 1) {
    return "l.caretPos()=" + l.caretPos();
  }
});

parsegraph_Label_Tests.addTest("Click on second line", function () {
  var font = parsegraph_defaultFont();
  var l = new parsegraph_Label(font);
  l.setText("No time\nLol");
  l.click(font.getGlyph("L").width + 1, l.lineAt(0).height() + 1);

  if (l.caretLine() != 1) {
    return "caretLine";
  }
  if (l.caretPos() != 1) {
    return "l.caretPos()=" + l.caretPos();
  }
});

parsegraph_Label_Tests.addTest("Click past end", function () {
  var font = parsegraph_defaultFont();
  var l = new parsegraph_Label(font);
  l.setText("No time\nLol");
  l.click(
    font.getGlyph("L").width + 1,
    l.lineAt(0).height() + l.lineAt(1).height() + 1
  );

  if (l.caretLine() != 1) {
    return "caretLine";
  }
  if (l.caretPos() != 1) {
    return "l.caretPos()=" + l.caretPos();
  }
});

parsegraph_Label.prototype.lineAt = function (n) {
  return this._lines[n];
};

parsegraph_Label.prototype.caretLine = function () {
  return this._caretLine;
};

parsegraph_Label.prototype.caretPos = function () {
  return this._caretPos;
};

parsegraph_Label.prototype.getCaretRect = function (outRect) {
  if (!outRect) {
    outRect = new Rect();
  }
  var y = 0;
  for (var i = 0; i < this._caretLine; ++i) {
    y += this._lines[i].height();
  }
  var line = this._lines[this._caretLine];
  var x = line.posAt(this._caretPos);
  var cw = 5;
  outRect.setX(x + cw / 2);
  outRect.setWidth(cw);
  outRect.setY(y + line.height() / 2);
  outRect.setHeight(line.height());
  return outRect;
};

parsegraph_Label.prototype.glyphPos = function () {
  return this._caretPos;
};

parsegraph_Label.prototype.fontSize = function () {
  return this._font.fontSize();
};

parsegraph_Label.prototype.width = function () {
  if (this._width === null) {
    this._width = 0;
    this._lines.forEach(function (l) {
      this._width = Math.max(this._width, l.width());
    }, this);
  }
  return this._width;
};

parsegraph_Label.prototype.height = function () {
  return this._height;
};

parsegraph_Line.prototype.drawLTRGlyphRun = function (
  painter,
  worldX,
  worldY,
  pos,
  fontScale,
  startRun,
  endRun
) {
  var overlay = painter.window().overlay();
  painter.drawLine(this._text, worldX, worldY, fontScale);
  //parsegraph_log("Drawing LTR run from %d to %d.", startRun, endRun);
  var maxAscent = 0;
  for (var q = startRun; q <= endRun; ++q) {
    var glyphData = this._glyphs[q];
    maxAscent = Math.max(maxAscent, glyphData.ascent);
  }
  for (var q = startRun; q <= endRun; ++q) {
    var glyphData = this._glyphs[q];
    painter.drawGlyph(
      glyphData,
      worldX + pos[0],
      worldY + pos[1] + maxAscent,
      fontScale
    );
    pos[0] += (glyphData.advance - 1) * fontScale;
  }
};

parsegraph_Line.prototype.drawRTLGlyphRun = function (
  painter,
  worldX,
  worldY,
  pos,
  fontScale,
  startRun,
  endRun
) {
  var overlay = painter.window().overlay();
  painter.drawLine(this._text, worldX, worldY, fontScale);
  var runWidth = 0;
  var maxAscent = 0;
  for (var q = startRun; q <= endRun; ++q) {
    var glyphData = this._glyphs[q];
    runWidth += glyphData.advance * fontScale;
    maxAscent = Math.max(maxAscent, glyphData.ascent);
  }
  var advance = 0;
  for (var q = startRun; q <= endRun; ++q) {
    var glyphData = this._glyphs[q];
    advance += (glyphData.advance - 1) * fontScale;
    painter.drawGlyph(
      glyphData,
      worldX + pos[0] + runWidth - advance,
      worldY + pos[1] + maxAscent,
      fontScale
    );
  }
  pos[0] += runWidth;
};

parsegraph_Line.prototype.drawGlyphRun = function (
  painter,
  worldX,
  worldY,
  pos,
  fontScale,
  startRun,
  endRun
) {
  // Draw the run.
  if (pos[2] === "L" || (!parsegraph_RIGHT_TO_LEFT && pos[2] === "WS")) {
    this.drawLTRGlyphRun(
      painter,
      worldX,
      worldY,
      pos,
      fontScale,
      startRun,
      endRun
    );
  } else {
    this.drawRTLGlyphRun(
      painter,
      worldX,
      worldY,
      pos,
      fontScale,
      startRun,
      endRun
    );
  }
};

parsegraph_Line.prototype.paint = function (
  painter,
  worldX,
  worldY,
  pos,
  fontScale
) {
  var startRun = 0;
  var unicode = parsegraph_defaultUnicode();
  if (!unicode.loaded()) {
    return;
  }
  for (var j = 0; j < this._glyphs.length; ++j) {
    var glyphData = this._glyphs[j];
    var glyphDirection = unicode.getGlyphDirection(glyphData.letter) || pos[2];
    if (pos[2] === "WS" && glyphDirection !== "WS") {
      // Use the glyph's direction if there is none currently in use.
      pos[2] = glyphDirection;
    }
    if (j < this._glyphs.length - 1 && pos[2] === glyphDirection) {
      //console.log("Found another character in glyph run.\n");
      continue;
    }
    this.drawGlyphRun(painter, worldX, worldY, pos, fontScale, startRun, j);

    // Set the new glyph direction.
    pos[2] = glyphDirection;
    startRun = j;
  }
  pos[1] += this.height() * fontScale;
  pos[0] = 0;
};

parsegraph_Label.prototype.paint = function (
  painter,
  worldX,
  worldY,
  fontScale
) {
  if (this.font() !== painter.font()) {
    throw new Error(
      "Painter must use the same font as this label: " +
        this.font() +
        ", " +
        painter.font()
    );
  }
  var pos = [0, 0, "WS"];

  for (var i = 0; i < this._lines.length; ++i) {
    var l = this._lines[i];
    l.paint(painter, worldX, worldY, pos, fontScale);
  }
};
