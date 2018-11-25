#include "Label.h"
#include "log.h"
#include "die.h"
#include <stdlib.h>
#include <stdio.h>
#include <parsegraph_math.h>
#include "graph/Rect.h"
#include "graph/GlyphPainter.h"
#include <unicode/uregex.h>

// Line length computation must be decoupled from character insertion for correct widths to be calculated
// sanely.
//
// ... or I handle all the cases in-place.

parsegraph_Line* parsegraph_Line_new(parsegraph_Label* label, const UChar* text, int len)
{
    if(!label) {
        parsegraph_die("Label must not be null");
    }
    parsegraph_Line* line = apr_palloc(label->pool, sizeof(*line));
    line->_label = label;

    // The glyphs contains the memory representation of the Unicode string represented by this line.
    //
    // Diacritics are represented as additional characters in Unicode. These characters result in a
    // unique texture rendering of the modified glyph.
    line->_glyphs = parsegraph_ArrayList_new(label->pool);
    line->_width = 0;
    line->_height = parsegraph_GlyphAtlas_letterHeight(parsegraph_Line_glyphAtlas(line));
    if(text) {
        parsegraph_Line_appendText(line, text, len);
    }
    return line;
}

int parsegraph_Line_isEmpty(parsegraph_Line* line)
{
    return line->_width == 0;
}

parsegraph_GlyphAtlas* parsegraph_Line_glyphAtlas(parsegraph_Line* line)
{
    return parsegraph_Label_glyphAtlas(line->_label);
}

void parsegraph_Line_remove(parsegraph_Line* line, int pos, int count)
{
    for(int i = pos; i < count; ++i) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(line->_glyphs, i);
        line->_width -= glyphData->width;
    }
    parsegraph_ArrayList_splice(line->_glyphs, pos, count);
}

void parsegraph_Line_appendText(parsegraph_Line* line, const UChar* text, int len)
{
    parsegraph_GlyphAtlas* atlas = parsegraph_Line_glyphAtlas(line);
    if(!atlas) {
        parsegraph_die("Line cannot add text without the label having a GlyphAtlas.");
    }
    //var checkTimeout = parsegraph_timeout("parsegraph_Line.insertText");

    for(int i = 0; i < len;) {
        //checkTimeout();

        // Retrieve letter.
        const UChar* letter = text + i;
        int llen = 1;
        if(!U16_IS_SINGLE(*letter)) {
            llen = 2;
        }

        parsegraph_GlyphData* glyphData = parsegraph_GlyphAtlas_getGlyph(atlas, letter, llen);
        parsegraph_ArrayList_push(line->_glyphs, glyphData);

        // Increment.
        line->_height = parsegraph_max(line->_height, glyphData->height);
        line->_width += glyphData->width;
        //parsegraph_log("%d. Line width is %f because of glyph %d\n", i, line->_width,  glyphData->width);
        i += llen;
    }
};

void parsegraph_Line_insertText(parsegraph_Line* line, int pos, const UChar* text, int len)
{
    parsegraph_GlyphAtlas* atlas = parsegraph_Line_glyphAtlas(line);
    if(!atlas) {
        parsegraph_die("Line cannot add text without the label having a GlyphAtlas.");
    }
    //var checkTimeout = parsegraph_timeout("parsegraph_Line.insertText");

    for(int i = 0; i < len;) {
        //checkTimeout();

        // Retrieve letter.
        const UChar* letter = text + i;
        int llen = 1;
        if(!U16_IS_SINGLE(*letter)) {
            llen = 2;
        }

        parsegraph_GlyphData* glyphData = parsegraph_GlyphAtlas_getGlyph(atlas, letter, llen);
        parsegraph_ArrayList_insert(line->_glyphs, pos + i, glyphData);

        // Increment.
        line->_height = parsegraph_max(line->_height, glyphData->height);
        line->_width += glyphData->width;
        i += llen;
    }
};

int parsegraph_Line_getText(parsegraph_Line* line, UChar* t, int len)
{
    int tpos = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(line->_glyphs); ++i) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(line->_glyphs, i);
        if(glyphData->length == 1) {
            t[tpos] = glyphData->letter[0];
            tpos += 1;
        }
        else if(glyphData->length == 2) {
            t[tpos] = glyphData->letter[0];
            t[tpos + 1] = glyphData->letter[1];
            tpos += 2;
        }
    }
    return tpos;
}

int parsegraph_Line_text(parsegraph_Line* line, UChar* t, int len)
{
    return parsegraph_Line_getText(line, t, len);
}

int parsegraph_Line_linePos(parsegraph_Line* line)
{
    return line->_linePos;
}

parsegraph_Label* parsegraph_Line_label(parsegraph_Line* line)
{
    return line->_label;
}

float parsegraph_Line_width(parsegraph_Line* line)
{
    return line->_width;
}

float parsegraph_Line_height(parsegraph_Line* line)
{
    return line->_height;
}

float parsegraph_Line_posAt(parsegraph_Line* line, int limit)
{
    float w = 0;
    for(int i = 0; i < limit && i < parsegraph_ArrayList_length(line->_glyphs); ++i) {
        w += ((parsegraph_GlyphData*)parsegraph_ArrayList_at(line->_glyphs, i))->width;
    }
    return w;
}

parsegraph_ArrayList* parsegraph_Line_glyphs(parsegraph_Line* line)
{
    return line->_glyphs;
}

//////////////////////////////////////
//
// LABEL CONSTRUCTOR
//
//////////////////////////////////////

parsegraph_Label* parsegraph_Label_new(apr_pool_t* pool, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!glyphAtlas) {
        parsegraph_die("Label requires a GlyphAtlas.");
    }
    parsegraph_Label* label = apr_palloc(pool, sizeof(*label));
    label->pool = pool;
    label->_glyphAtlas = glyphAtlas;
    //label->_wrapWidth = 0;
    label->_lines = parsegraph_ArrayList_new(label->pool);
    label->_caretLine = 0;
    label->_caretPos = 0;
    label->_editable = 0;
    label->_onTextChangedListener = 0;
    label->_onTextChangedListenerThisArg = 0;
    label->_width = -1;
    label->_height = 0;
    return label;
}

parsegraph_GlyphAtlas* parsegraph_Label_glyphAtlas(parsegraph_Label* label)
{
    return label->_glyphAtlas;
}

int parsegraph_Label_isEmpty(parsegraph_Label* label)
{
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        if(!parsegraph_Line_isEmpty(l)) {
            return 0;
        }
    }
    return 1;
}

void parsegraph_Label_forEach(parsegraph_Label* label, void(*func)(parsegraph_Line*, void*), void* funcThisArg)
{
    if(!funcThisArg) {
        funcThisArg = label;
    }
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        func(l, funcThisArg);
    }
}

int parsegraph_Label_text(parsegraph_Label* label, UChar* buf, int len)
{
    return parsegraph_Label_getText(label, buf, len);
}

int parsegraph_Label_getText(parsegraph_Label* label, UChar* buf, int len)
{
    int totallen = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        if(totallen > 0) {
            buf[totallen] = '\n';
            totallen += 1;
        }
        int linelen = parsegraph_Line_getText(l, buf + totallen, len - totallen);
        totallen += linelen;
    }
    return totallen;
}

void parsegraph_Label_setTextUTF8(parsegraph_Label* label, const char* text, int len)
{
    UErrorCode uerr = U_ZERO_ERROR;
    UChar* buf;
    int32_t destLen;
    u_strFromUTF8(0, 0, &destLen, text, len, &uerr);
    if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text (preflight)");
    }
    buf = malloc(sizeof(UChar)*(destLen+1));
    u_memset(buf, 0, destLen+1);

    uerr = U_ZERO_ERROR;
    u_strFromUTF8(buf, destLen+1, 0, text, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text (conversion)");
    }
    parsegraph_Label_setText(label, buf, destLen);
    free(buf);
}

void parsegraph_Label_setText(parsegraph_Label* label, const UChar* text, int len)
{
    parsegraph_ArrayList_clear(label->_lines);
    label->_currentLine = 0;
    label->_currentPos = 0;
    label->_width = 0;
    label->_height = 0;
    int startIndex = 0;

    UErrorCode uerr = U_ZERO_ERROR;
    URegularExpression* ws = 0;
    ws = uregex_openC("\n", 0, 0, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while compiling WS regex");
    }

    uregex_setText(ws, text, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while setting WS text");
    }

    while(uregex_find(ws, startIndex, &uerr)) {
        int32_t wsStart = uregex_start(ws, 0, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting ws start");
        }
        int32_t wsEnd = uregex_end(ws, 0, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting ws end");
        }
        if(startIndex == wsStart) {
            // Whitespace at the beginning of the string.
            startIndex = wsEnd;
            continue;
        }
        if(startIndex > wsStart) {
            parsegraph_die("Impossible");
        }
        // Assert startIndex < wsStart, therefore the boundaries of that line are [startIndex, wsStart - 1].

        const UChar* textLine = text + startIndex;
        int len = wsStart - startIndex;
        parsegraph_Line* l = parsegraph_Line_new(label, textLine, len);
        parsegraph_ArrayList_push(label->_lines, l);
        label->_width = parsegraph_max(label->_width, parsegraph_Line_width(l));
        label->_height += parsegraph_Line_height(l);
    }
    if(startIndex <= len - 1) {
        parsegraph_Line* l = parsegraph_Line_new(label, text + startIndex, len - startIndex);
        parsegraph_ArrayList_push(label->_lines, l);
        label->_width = parsegraph_max(label->_width, parsegraph_Line_width(l));
        label->_height += parsegraph_Line_height(l);
    }
    uregex_close(ws);
}

void parsegraph_Label_moveCaretDown(parsegraph_Label* label)
{
    //console.log("Moving caret down");
}

void parsegraph_Label_moveCaretUp(parsegraph_Label* label)
{
    //console.log("Moving caret up");
}

int parsegraph_Label_moveCaretBackward(parsegraph_Label* label)
{
    if(label->_caretPos == 0) {
        if(label->_caretLine <= 0) {
            return 0;
        }
        label->_caretLine -= 1;
        label->_caretPos = parsegraph_ArrayList_length(((parsegraph_Line*)parsegraph_ArrayList_at(label->_lines, label->_caretLine))->_glyphs);
        return 1;
    }
    label->_caretPos -= 1;
    return 1;
}

int parsegraph_Label_moveCaretForward(parsegraph_Label* label)
{
    if(label->_caretPos == parsegraph_ArrayList_length(((parsegraph_Line*)parsegraph_ArrayList_at(label->_lines, label->_caretLine))->_glyphs)) {
        if(label->_caretLine == parsegraph_ArrayList_length(label->_lines) - 1) {
            // At the end.
            return 0;
        }
        label->_caretLine++;
        label->_caretPos = 0;
        return 1;
    }
    label->_caretPos++;
    return 1;
}

int parsegraph_Label_backspaceCaret(parsegraph_Label* label)
{
    parsegraph_Line* line = parsegraph_ArrayList_at(label->_lines, label->_caretLine);
    if(label->_caretPos == 0) {
        if(label->_caretLine == 0) {
            // Can't backspace anymore.
            return 0;
        }
        label->_caretLine--;
        line = parsegraph_ArrayList_at(label->_lines, label->_caretLine);
        label->_caretPos = parsegraph_ArrayList_length(line->_glyphs);
        parsegraph_Label_textChanged(label);
        return 1;
    }
    label->_caretPos--;
    parsegraph_Line_remove(line, label->_caretPos, 1);
    label->_width = -1;
    parsegraph_Label_textChanged(label);
    return 1;
}

int parsegraph_Label_deleteCaret(parsegraph_Label* label)
{
    parsegraph_Line* line = parsegraph_ArrayList_at(label->_lines, label->_caretLine);
    if(label->_caretPos > parsegraph_ArrayList_length(line->_glyphs) - 1) {
        return 0;
    }
    parsegraph_Line_remove(line, label->_caretPos, 1);
    label->_width = -1;
    parsegraph_Label_textChanged(label);
    return 1;
}

int parsegraph_Label_ctrlKey(parsegraph_Label* label, const char* key)
{
    return 0;
}

int parsegraph_Label_key(parsegraph_Label* label, const char* key)
{
    // TODO Implement
    /* 
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
        this.textChanged();
        return true;
    }
    return false;
    */
    return 0;
}

void parsegraph_Label_onTextChanged(parsegraph_Label* label, int(*listener)(void*, parsegraph_Label*), void* listenerThisArg)
{
    label->_onTextChangedListener = listener;
    label->_onTextChangedListenerThisArg = listenerThisArg;
};

int parsegraph_Label_textChanged(parsegraph_Label* label)
{
    if(label->_onTextChangedListener) {
        return label->_onTextChangedListener(label->_onTextChangedListenerThisArg, label);
    }
    return 0;
}

int parsegraph_Label_editable(parsegraph_Label* label)
{
    return label->_editable;
}

void parsegraph_Label_setEditable(parsegraph_Label* label, int editable)
{
    label->_editable = editable;
}

void parsegraph_Label_click(parsegraph_Label* label, int x, int y)
{
    if(y < 0 && x < 0) {
        label->_caretLine = 0;
        label->_caretPos = 0;
    }
    int curX = 0;
    int curY = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* line = parsegraph_ArrayList_at(label->_lines, i);
        if(y > curY + parsegraph_Line_height(line) && i != parsegraph_ArrayList_length(label->_lines)- 1) {
            // Some "next" line.
            curY += parsegraph_Line_height(line);
            continue;
        }
        // Switch the caret line.
        label->_caretLine = i;

        if(x < 0) {
            label->_caretPos = 0;
            return;
        }
        for(int j = 0; j < parsegraph_ArrayList_length(line->_glyphs); ++j) {
            parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(line->_glyphs, j);
            if(x > curX + glyphData->width) {
                curX += glyphData->width;
                continue;
            }
            if(x > curX + glyphData->width/2) {
                curX += glyphData->width;
                continue;
            }

            label->_caretPos = j;
            //console.log("CaretPos=" + this._caretPos);
            return;
        }

        label->_caretPos = parsegraph_ArrayList_length(line->_glyphs);
        return;
    }
    parsegraph_die("click fall-through that should not be reached");
}

parsegraph_Line* parsegraph_Label_lineAt(parsegraph_Label* label, int n)
{
    return parsegraph_ArrayList_at(label->_lines, n);
}

int parsegraph_Label_caretLine(parsegraph_Label* label)
{
    return label->_caretLine;
};

int parsegraph_Label_caretPos(parsegraph_Label* label)
{
    return label->_caretPos;
};

void parsegraph_Label_getCaretRect(parsegraph_Label* label, float* outRect)
{
    int y = 0;
    for(int i = 0; i < label->_caretLine; ++i) {
        y += parsegraph_Line_height((parsegraph_Line*)parsegraph_ArrayList_at(label->_lines, i));
    }
    parsegraph_Line* line = parsegraph_ArrayList_at(label->_lines, label->_caretLine);
    int x = parsegraph_Line_posAt(line, label->_caretPos);
    int cw = 5;
    int h = parsegraph_Line_height(line);
    parsegraph_Rect_set(outRect, x + cw/2, y + h/2, cw, h);
}

int parsegraph_Label_glyphPos(parsegraph_Label* label)
{
    return label->_caretPos;
};

float parsegraph_Label_fontSize(parsegraph_Label* label)
{
    return parsegraph_GlyphAtlas_fontSize(label->_glyphAtlas);
};

float parsegraph_Label_width(parsegraph_Label* label)
{
    if(label->_width == -1) {
        label->_width = 0;
        for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
            parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
            label->_width = parsegraph_max(label->_width, parsegraph_Line_width(l));
        }
    }
    return label->_width;
};

float parsegraph_Label_height(parsegraph_Label* label)
{
    return label->_height;
}

static int isMark(parsegraph_GlyphData* glyphData)
{
    UChar32 l32[2];
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF32(&l32, 2, 0, glyphData->letter, glyphData->length, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Failed to convert glyphData letter to UTF-32 character.");
    }
    switch(u_charType(l32[0])) {
    case U_NON_SPACING_MARK:
    case U_COMBINING_SPACING_MARK:
    case U_ENCLOSING_MARK:
        return 1;
    }
    return 0;
}

void parsegraph_Label_paint(parsegraph_Label* label, parsegraph_GlyphPainter* painter, float worldX, float worldY, float fontScale)
{
    if(parsegraph_Label_glyphAtlas(label) != parsegraph_GlyphPainter_glyphAtlas(painter)) {
        char g1[255];
        char g2[255];
        parsegraph_GlyphAtlas_toString(parsegraph_Label_glyphAtlas(label), g1, sizeof(g1));
        parsegraph_GlyphAtlas_toString(parsegraph_GlyphPainter_glyphAtlas(painter), g2, sizeof(g2));
        parsegraph_die("Painter must use the same glyph atlas as this label: %s, %s", g1, g2);
    }
    float x = 0;
    float y = 0;
    //parsegraph_Unicode* u = parsegraph_GlyphAtlas_unicode(label->_glyphAtlas);
    const char* direction = "WS";

    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        int startRun = 0;
        int endRun = startRun;
        //const char* runDirection = direction;
        //int runWidth = 0;
        int j = 0;
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(l->_glyphs, j);
        while(parsegraph_ArrayList_length(l->_glyphs) > 0) {
            glyphData = parsegraph_ArrayList_at(l->_glyphs, j);
            const char* glyphDirection = direction;
            UErrorCode uerr = U_ZERO_ERROR;
            UChar32 l32[2];
            u_memset(l32, 0, 2);
            u_strToUTF32(&l32, 2, 0, glyphData->letter, glyphData->length, &uerr);
            if(uerr != U_ZERO_ERROR) {
                parsegraph_die("Failed to retrieve bidirectional data for character.");
            }
            switch(u_charDirection(l32[0])) {
            case U_LEFT_TO_RIGHT:
            case U_LEFT_TO_RIGHT_EMBEDDING:
            case U_LEFT_TO_RIGHT_OVERRIDE:
            case U_EUROPEAN_NUMBER:
            case U_EUROPEAN_NUMBER_SEPARATOR:
            case U_EUROPEAN_NUMBER_TERMINATOR:
                // Left-to-right.
                glyphDirection = "L";
                break;
            case U_RIGHT_TO_LEFT:
            case U_RIGHT_TO_LEFT_ARABIC:
            case U_ARABIC_NUMBER:
            case U_RIGHT_TO_LEFT_EMBEDDING:
            case U_RIGHT_TO_LEFT_OVERRIDE:
                // Right-to-left
                glyphDirection = "R";
                break;
            case U_POP_DIRECTIONAL_FORMAT:
            case U_COMMON_NUMBER_SEPARATOR:
            case U_OTHER_NEUTRAL:
            case U_WHITE_SPACE_NEUTRAL:
            case U_BOUNDARY_NEUTRAL:
            case U_SEGMENT_SEPARATOR:
            case U_DIR_NON_SPACING_MARK:
            case U_BLOCK_SEPARATOR:
                // Neutral characters
                glyphDirection = direction;
                break;
            default:
                parsegraph_die("Unrecognized Unicode character: %d", l32);
            }
            //fprintf(stderr, "Glyphdata is %d. Length is %d\n", glyphData->letter[0], glyphData->length);
            //fprintf(stderr, "Char is %d Direction is %s\n", l32[0], glyphDirection);
            if(!strcmp(direction, "WS") && strcmp(glyphDirection, "WS")) {
                // Use the glyph's direction if there is none currently in use.
                direction = glyphDirection;
            }
            if(j < parsegraph_ArrayList_length(l->_glyphs) - 1 && !strcmp(direction, glyphDirection)) {
                //fprintf(stderr, "Incrementing J\n");
                ++j;
                continue;
            }
            endRun = j;

            // Draw the run.
            if(!strcmp(direction, "L") || !strcmp(direction, "WS")) {
                //console.log("Drawing LTR run from " + startRun + " to " + endRun + ".");
                for(int q = startRun; q <= endRun; ++q) {
                    glyphData = parsegraph_ArrayList_at(l->_glyphs, q);
                    if(isMark(glyphData)) {
                        continue;
                    }
                    int z = 1;
                    parsegraph_GlyphData* nextGlyph = 0;
                    if(q + z < parsegraph_ArrayList_length(l->_glyphs)) {
                        nextGlyph = parsegraph_ArrayList_at(l->_glyphs, q + z);
                    }
                    while(nextGlyph && isMark(nextGlyph)) {
                        ++z;
                        if(q + z < parsegraph_ArrayList_length(l->_glyphs)) {
                            nextGlyph = parsegraph_ArrayList_at(l->_glyphs, q + z);
                        }
                        else {
                            nextGlyph = 0;
                        }
                        if(!nextGlyph) {
                            break;
                        }
                    }

                    if(z - i > 255) {
                        parsegraph_die("Unicode error");
                    }
                    UChar glyphBuf[300];
                    u_memset(glyphBuf, 0, 300);
                    int len = 0;

                    // Add diacritics.
                    u_strncpy(glyphBuf, glyphData->letter, glyphData->length);
                    len += glyphData->length;
                    for(int i = 1; i < z; ++i) {
                        parsegraph_GlyphData* gd = (parsegraph_GlyphData*)parsegraph_ArrayList_at(l->_glyphs, q + i);
                        u_strncpy(glyphBuf + len, gd->letter, gd->length);
                        len += gd->length;
                    }
                    glyphData = parsegraph_GlyphAtlas_getGlyph(label->_glyphAtlas, glyphBuf, len);
                    parsegraph_GlyphPainter_drawGlyph(painter, glyphData, worldX + x, worldY + y, fontScale);
                    x += glyphData->width * fontScale;
                }
            }
/*            else {
                //console.log("Drawing RTL run from " + startRun + " to " + endRun + ".");
                var cursiveMapping;

                // The neighboring, non-mark, memory-representative glyphs.
                var nextGlyph = null;
                var prevGlyph = null;

                // q is the current glyph under iteration.
                var q = endRun;

                // z is the distance from q the nextGlyph.
                var z = 1;
                while(q >= startRun) {
                    glyphData = l._glyphs[q];

                    // Next is in reading order.
                    if(q > startRun && endRun !== startRun) {
                        z = 1;
                        prevGlyph = l._glyphs[q - z];
                        while(u.isMark(prevGlyph.letter)) {
                            ++z;
                            prevGlyph = l._glyphs[q - z];
                            if(!prevGlyph) {
                                prevGlyph = null;
                                break;
                            }
                        }
                        if(prevGlyph && !u.isArabic(prevGlyph.letter)) {
                            prevGlyph = null;
                        }
                        else if(prevGlyph) {
                            cursiveMapping = u.getCursiveMapping(prevGlyph.letter);
                            if(!cursiveMapping[2]) {
                                // Prev glyph can't be joined to, so ignore it.
                                prevGlyph = null;
                            }
                        }
                    }
                    else {
                        prevGlyph = null;
                    }
                    if(q < endRun && endRun !== startRun) {
                        z = 1;
                        nextGlyph = l._glyphs[q + z];
                        while(u.isMark(nextGlyph.letter)) {
                            ++z;
                            nextGlyph = l._glyphs[q + z];
                            if(!nextGlyph) {
                                nextGlyph = null;
                                break;
                            }
                        }
                        if(nextGlyph && !u.isArabic(nextGlyph.letter)) {
                            nextGlyph = null;
                        }
                        else if(nextGlyph) {
                            cursiveMapping = u.getCursiveMapping(nextGlyph.letter);
                            if(!cursiveMapping[3]) {
                                // Next glyph can't be joined to, so ignore it.
                                nextGlyph = null;
                            }
                        }
                    }
                    else {
                        nextGlyph = null;
                    }

                    var namedCharData = u.get(glyphData.letter);
                    var cursiveMapping = u.getCursiveMapping(namedCharData.codeValue);

                    if(namedCharData.codeValue === 0x627 && prevGlyph && prevGlyph.letter.charCodeAt(0) === 0x644) {
                        // LAM WITH ALEF.
                        if(prevGlyph) {
                            // Has a previous glyph, so final.
                            glyphData = 0xfefc;
                        }
                        else {
                            glyphData = 0xfefb;
                        }
                        // Decrement twice to skip the ligature'd character.
                        --q;
                    }
                    else if(cursiveMapping) {
                        if(nextGlyph) {
                            if(prevGlyph) {
                                if(cursiveMapping[2]) {
                                    glyphData = cursiveMapping[2]; // medial
                                }
                                else if(cursiveMapping[3]) {
                                    glyphData = cursiveMapping[3]; // final
                                }
                                else {
                                    glyphData = cursiveMapping[0]; // isolated
                                }
                            }
                            else {
                                // Next is, but previous wasn't.
                                if(cursiveMapping[1]) {
                                    glyphData = cursiveMapping[1]; // initial
                                }
                                else {
                                    glyphData = cursiveMapping[0]; // isolated
                                }
                            }
                        }
                        else if(prevGlyph) {
                            if(cursiveMapping[3]) {
                                glyphData = cursiveMapping[3]; // final
                            }
                            else {
                                glyphData = cursiveMapping[0]; // isolated
                            }
                        }
                    }
                    if(typeof glyphData === "object") {
                        glyphData = glyphData.letter;
                    }
                    if(typeof glyphData === "number") {
                        glyphData = String.fromCharCode(glyphData);
                    }
                    if(typeof glyphData !== "string") {
                        throw new Error("glyphData should be a string by now.");
                    }
                    // Add diacritics.
                    for(var i = 1; i < z; ++i) {
                        glyphData += l._glyphs[q + i].letter;
                    }
                    // Convert to object.
                    glyphData = this._glyphAtlas.getGlyph(glyphData);

                    painter.drawGlyph(glyphData, worldX + x, worldY + y, fontScale);
                    x += glyphData.width * fontScale;
                    --q;
                }
            }
            */

            // Set the new glyph direction.
            direction = glyphDirection;
            startRun = j;
            endRun = startRun;
            //fprintf(stderr, "Incrementing J\n");
            ++j;
            if(j == parsegraph_ArrayList_length(l->_glyphs)) {
                break;
            }
        }
        y += parsegraph_Line_height(l) * fontScale;
        x = 0;
    }
}
