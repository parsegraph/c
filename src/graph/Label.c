#include "Label.h"
#include "Input.h"
#include "log.h"
#include "initialize.h"
#include "../die.h"
#include <stdlib.h>
#include <stdio.h>
#include <parsegraph_math.h>
#include "graph/Rect.h"
#include "graph/GlyphPainter.h"
#include "../unicode.h"
#include <unicode/uregex.h>

static int isMark(const UChar* letter, int len)
{
    UErrorCode uerr = U_ZERO_ERROR;
    UChar32 l32[parsegraph_MAX_UNICODE_COMBINING_MARKS + 1];
    memset(l32, 0, sizeof(l32));
    u_strToUTF32(l32, sizeof(l32), 0, letter, len, &uerr);
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

static const char* getDirection(parsegraph_GlyphData* glyphData, const char* defaultDirection)
{
    UErrorCode uerr = U_ZERO_ERROR;
    UChar32 l32[parsegraph_MAX_UNICODE_COMBINING_MARKS + 1];
    memset(l32, 0, sizeof(l32));
    u_strToUTF32(l32, sizeof(l32), 0, glyphData->letter, glyphData->length, &uerr);
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
        return "L";
    case U_RIGHT_TO_LEFT:
    case U_RIGHT_TO_LEFT_ARABIC:
    case U_ARABIC_NUMBER:
    case U_RIGHT_TO_LEFT_EMBEDDING:
    case U_RIGHT_TO_LEFT_OVERRIDE:
        // Right-to-left
        return "R";
    case U_POP_DIRECTIONAL_FORMAT:
    case U_COMMON_NUMBER_SEPARATOR:
    case U_OTHER_NEUTRAL:
    case U_WHITE_SPACE_NEUTRAL:
    case U_BOUNDARY_NEUTRAL:
    case U_SEGMENT_SEPARATOR:
    case U_DIR_NON_SPACING_MARK:
    case U_BLOCK_SEPARATOR:
        // Neutral characters
        return defaultDirection;
    default:
        parsegraph_die("Unrecognized Unicode character: %d", l32);
    }
    return defaultDirection;
}

// Line length computation must be decoupled from character insertion for correct widths to be calculated
// sanely.
//
// ... or I handle all the cases in-place.

parsegraph_Line* parsegraph_Line_new(parsegraph_Label* label, const UChar* text, int len)
{
    if(!label) {
        parsegraph_die("Label must not be null");
    }
    parsegraph_Line* line = apr_palloc(label->_textPool, sizeof(*line));
    line->_label = label;

    // The glyphs contains the memory representation of the Unicode string represented by this line.
    //
    // Diacritics are represented as additional characters in Unicode. These characters result in a
    // unique texture rendering of the modified glyph.
    line->_glyphs = parsegraph_ArrayList_new(label->_textPool);
    line->_width = 0;
    line->_height = parsegraph_GlyphAtlas_letterHeight(parsegraph_Line_glyphAtlas(line));
    if(text) {
        parsegraph_Line_appendText(line, text, len);
    }
    return line;
}

void parsegraph_Line_destroy(parsegraph_Line* line)
{
    parsegraph_ArrayList_destroy(line->_glyphs);
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

struct parsegraph_GlyphIterator {
parsegraph_GlyphAtlas* atlas;
const UChar* text;
UChar prevLetter;
int len;
int index;
};
typedef struct parsegraph_GlyphIterator parsegraph_GlyphIterator;

void parsegraph_GlyphIterator_init(parsegraph_GlyphIterator* gi, parsegraph_GlyphAtlas* atlas, const UChar* text, int len)
{
    gi->atlas = atlas;
    gi->index = 0;
    if(len == -1) {
        len = u_strlen(text);
    }
    gi->len = len;
    gi->text = text;
    gi->prevLetter = 0;
}

parsegraph_GlyphData* parsegraph_GlyphIterator_next(parsegraph_GlyphIterator* gi)
{
    parsegraph_Unicode* u = parsegraph_GlyphAtlas_unicode(gi->atlas);

    if(gi->index >= gi->len) {
        return 0;
    }
    const UChar* start = gi->text + gi->index;
    int len = 1;
    if(!U16_IS_SINGLE(*start)) {
        len = 2;
    }
    gi->index += len;
    if(isMark(start, len)) {
        // Show an isolated mark.
        //parsegraph_log("Found isolated Unicode mark character %x.\n", start[0]);
        parsegraph_GlyphData* rv = parsegraph_GlyphAtlas_getGlyph(gi->atlas, start, len);
        return rv;
    }

    //parsegraph_log("Found Unicode character %x.\n", start[0]);

    // Form ligatures.
    UChar givenLetter = start[0];
    if(givenLetter == 0x627 && gi->prevLetter == 0x644) {
        // LAM WITH ALEF.
        if(gi->prevLetter) {
            // Has a previous glyph, so final.
            givenLetter = 0xfefc;
        }
        else {
            // Isolated form.
            givenLetter = 0xfefb;
        }
        // Skip the ligature'd character.
        gi->prevLetter = 0x627;
        //parsegraph_log("Found ligature %x->%x\n", gi->prevLetter, givenLetter);
    }
    else {
        UChar nextLetterChar = 0;
        for(int i = 0; gi->index + i < gi->len;) {
            const UChar* nextLetter = gi->text + gi->index + i;
            int len = 1;
            if(!U16_IS_SINGLE(*nextLetter)) {
                len = 2;
            }
            if(isMark(nextLetter, len)) {
                i += len;
                continue;
            }
            // given, prev, next
            if(parsegraph_Unicode_cursive(u, nextLetter[0], givenLetter, 0)) {
                nextLetterChar = nextLetter[0];
            }
            break;
        }
        // RTL: [ 4, 3, 2, 1]
        //        ^-next
        //           ^-given
        //              ^-prev
        UChar cursiveLetter = parsegraph_Unicode_cursive(u, givenLetter, gi->prevLetter, nextLetterChar);
        if(cursiveLetter != 0) {
            //parsegraph_log("Found cursive char %x->%x\n", givenLetter, cursiveLetter);
            gi->prevLetter = givenLetter;
            givenLetter = cursiveLetter;
        }
        else {
            //parsegraph_log("Found non-cursive char %x.\n", givenLetter);
            gi->prevLetter = 0;
        }
    }

    // Add diacritical marks and combine ligatures.
    int foundVirama = 0;
    while(gi->index < gi->len) {
        const UChar* letter = gi->text + gi->index;
        int llen = !U16_IS_SINGLE(*letter) ? 2 : 1;
        if(llen == 2 && gi->index == gi->len - 1) {
            parsegraph_die("Unterminated UTF-16 character");
        }

        if(isMark(letter, llen)) {
            foundVirama = letter[0] == 0x094d;
            len += llen;
            gi->index += llen;
            //parsegraph_log("Found Unicode mark character %x.\n", letter[0]);
            continue;
        }
        else if(foundVirama) {
            foundVirama = 0;
            len += llen;
            gi->index += llen;
            //parsegraph_log("Found Unicode character %x combined using Virama.\n", letter[0]);
            continue;
        }

        // Found a non-marking character that's part of a new glyph.
        break;
    }

    UChar* cpy = malloc(sizeof(UChar)*(len+1));
    u_memset(cpy, 0, len+1);
    u_strncpy(cpy, start, len+1);
    cpy[0] = givenLetter;
    parsegraph_GlyphData* rv = parsegraph_GlyphAtlas_getGlyph(gi->atlas, cpy, len);
    free(cpy);
    return rv;
}

void parsegraph_Line_appendTextUTF8(parsegraph_Line* line, const char* text, int len)
{
    if(len == 0) {
        return;
    }
    UErrorCode uerr = U_ZERO_ERROR;
    UChar* buf;
    int32_t destLen;
    u_strFromUTF8(0, 0, &destLen, text, len, &uerr);
    if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text %d (preflight) %s", len, u_errorName(uerr));
    }
    buf = malloc(sizeof(UChar)*(destLen+1));
    u_memset(buf, 0, destLen+1);

    uerr = U_ZERO_ERROR;
    u_strFromUTF8(buf, destLen+1, 0, text, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text (conversion)");
    }
    parsegraph_Line_appendText(line, buf, destLen);
    free(buf);
}

void parsegraph_Line_appendText(parsegraph_Line* line, const UChar* text, int len)
{
    parsegraph_GlyphAtlas* atlas = parsegraph_Line_glyphAtlas(line);
    if(!atlas) {
        parsegraph_die("Line cannot add text without the label having a GlyphAtlas.");
    }

    parsegraph_GlyphIterator gi;
    parsegraph_GlyphIterator_init(&gi, atlas, text, len);
    parsegraph_GlyphData* glyphData = 0;
    while((glyphData = parsegraph_GlyphIterator_next(&gi)) != 0) {
        parsegraph_ArrayList_push(line->_glyphs, glyphData);
        line->_height = parsegraph_max(line->_height, glyphData->height);
        line->_width += glyphData->advance;
        //parsegraph_log("%d. Line width is %f because of appended glyph %d.\n", i, line->_width,  glyphData->width);
    }
};

void parsegraph_Line_insertTextUTF8(parsegraph_Line* line, int pos, const char* text, int len)
{
    if(len == 0) {
        return;
    }
    UErrorCode uerr = U_ZERO_ERROR;
    UChar* buf;
    int32_t destLen;
    u_strFromUTF8(0, 0, &destLen, text, len, &uerr);
    if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text %d (preflight) %s", len, u_errorName(uerr));
    }
    buf = malloc(sizeof(UChar)*(destLen+1));
    u_memset(buf, 0, destLen+1);

    uerr = U_ZERO_ERROR;
    u_strFromUTF8(buf, destLen+1, 0, text, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text (conversion)");
    }
    parsegraph_Line_insertText(line, pos, buf, destLen);
    free(buf);
}

void parsegraph_Line_insertText(parsegraph_Line* line, int pos, const UChar* text, int len)
{
    parsegraph_GlyphAtlas* atlas = parsegraph_Line_glyphAtlas(line);
    if(!atlas) {
        parsegraph_die("Line cannot add text without the label having a GlyphAtlas.");
    }

    parsegraph_GlyphIterator gi;
    parsegraph_GlyphIterator_init(&gi, atlas, text, len);
    parsegraph_GlyphData* glyphData = 0;
    for(int i = 0; (glyphData = parsegraph_GlyphIterator_next(&gi)) != 0; ++i) {
        parsegraph_ArrayList_insert(line->_glyphs, pos + i, glyphData);
        line->_height = parsegraph_max(line->_height, glyphData->height);
        line->_width += glyphData->advance;
        //parsegraph_log("%d. Line width is %f because of inserted glyph %d.\n", i, line->_width,  glyphData->width);
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

int parsegraph_Line_length(parsegraph_Line* line)
{
    int tpos = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(line->_glyphs); ++i) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(line->_glyphs, i);
        tpos += glyphData->length;
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

parsegraph_Label* parsegraph_Label_new(apr_pool_t* parentPool, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!glyphAtlas) {
        parsegraph_die("Label requires a GlyphAtlas.");
    }
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, parentPool)) {
        parsegraph_die("Failed to create Label memory pool");
    }
    parsegraph_Label* label = apr_palloc(pool, sizeof(*label));
    label->pool = pool;
    label->_glyphAtlas = glyphAtlas;
    //label->_wrapWidth = 0;
    label->_textPool = 0;
    if(APR_SUCCESS != apr_pool_create(&label->_textPool, pool)) {
        parsegraph_die("Failed to create Label memory pool");
    }
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

void parsegraph_Label_destroy(parsegraph_Label* label)
{
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        parsegraph_Line_destroy(l);
    }
    parsegraph_ArrayList_destroy(label->_lines);
    apr_pool_destroy(label->_textPool);
    apr_pool_destroy(label->pool);
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

void parsegraph_Label_clear(parsegraph_Label* label)
{
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        parsegraph_Line_destroy(l);
    }
    parsegraph_ArrayList_clear(label->_lines);
    apr_pool_destroy(label->_textPool);
    if(APR_SUCCESS != apr_pool_create(&label->_textPool, label->pool)) {
        parsegraph_die("Failed to create Label memory pool");
    }
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

int parsegraph_Label_length(parsegraph_Label* label)
{
    int totallen = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        if(totallen > 0) {
            totallen += 1;
        }
        totallen += parsegraph_Line_length(l);
    }
    return totallen;
}

void parsegraph_Label_setTextUTF8(parsegraph_Label* label, const char* text, int len)
{
    if(len == 0) {
        parsegraph_Label_setText(label, 0, 0);
        return;
    }
    UErrorCode uerr = U_ZERO_ERROR;
    UChar* buf;
    int32_t destLen;
    u_strFromUTF8(0, 0, &destLen, text, len, &uerr);
    if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text %d (preflight) %s", len, u_errorName(uerr));
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
    parsegraph_Label_clear(label);
    label->_currentLine = 0;
    label->_currentPos = 0;
    label->_width = 0;
    label->_height = 0;
    int startIndex = 0;
    if(len == 0) {
        return;
    }

    UErrorCode uerr = U_ZERO_ERROR;
    URegularExpression* ws = 0;
    ws = uregex_openC("[^\\n]+", 0, 0, &uerr);
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
        //parsegraph_log("Line: %d, %d\n", wsStart, wsEnd);
        if(startIndex > wsStart) {
            parsegraph_die("Impossible");
        }
        // Assert startIndex < wsStart, therefore the boundaries of that line are [startIndex, wsStart - 1].

        const UChar* textLine = text + wsStart;
        int len = wsEnd - wsStart;
        parsegraph_Line* l = parsegraph_Line_new(label, textLine, len);
        parsegraph_ArrayList_push(label->_lines, l);
        label->_width = parsegraph_max(label->_width, parsegraph_Line_width(l));
        label->_height += parsegraph_Line_height(l);
        startIndex = wsEnd;
    }
    uregex_close(ws);
}

int parsegraph_Label_moveCaretDown(parsegraph_Label* label)
{
    //console.log("Moving caret down");
    return 0;
}

int parsegraph_Label_moveCaretUp(parsegraph_Label* label)
{
    //console.log("Moving caret up");
    return 0;
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
        
    if(!strcmp(key, parsegraph_MOVE_FORWARD_KEY)) {
        return parsegraph_Label_moveCaretForward(label);
    }
    if(!strcmp(key, parsegraph_MOVE_BACKWARD_KEY)) {
        return parsegraph_Label_moveCaretBackward(label);
    }
    if(!strcmp(key, parsegraph_MOVE_DOWNWARD_KEY)) {
        return parsegraph_Label_moveCaretDown(label);
    }
    if(!strcmp(key, parsegraph_MOVE_UPWARD_KEY)) {
        return parsegraph_Label_moveCaretUp(label);
    }
    if(!strcmp(key, "Backspace")) {
        return parsegraph_Label_backspaceCaret(label);
    }
    if(!strcmp(key, "Delete")) {
        return parsegraph_Label_deleteCaret(label);
    }
    //parsegraph_log("Label received key '%s'\n", key);

    while(label->_caretLine > parsegraph_ArrayList_length(label->_lines)) {
        parsegraph_ArrayList_push(label->_lines, parsegraph_Line_new(label, 0, 0));
    }
    parsegraph_Line* insertLine = parsegraph_ArrayList_at(label->_lines, label->_caretLine);
    int insertPos = parsegraph_min(label->_caretPos, parsegraph_ArrayList_length(insertLine->_glyphs));
    if(insertPos == parsegraph_ArrayList_length(insertLine->_glyphs)) {
        parsegraph_Line_appendTextUTF8(insertLine, key, -1);
    }
    else {
        parsegraph_Line_insertTextUTF8(insertLine, insertPos, key, -1);
    }

    if(!isnan(label->_width)) {
        label->_width = parsegraph_max(parsegraph_Line_width(insertLine), label->_width);
        label->_height = parsegraph_max(label->_height, parsegraph_Line_height(insertLine));
    }
    label->_caretPos += strlen(key);
    parsegraph_Label_textChanged(label);
    return 1;

    /* 
    switch(key) {
    case "Control":
    case "Alt":
    case "Shift":
        break;
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
    //parsegraph_log("Label clicked at pos (%d, %d).\n", x, y);
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
    //parsegraph_log("Caret is %d, %d\n", cw, h);
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

void parsegraph_Line_drawLTRGlyphRun(parsegraph_Line* l, parsegraph_GlyphPainter* painter, float* worldPos, float* pos, const char** direction, float fontScale, int startRun, int endRun)
{
    //parsegraph_log("Drawing LTR run from %d to %d.", startRun, endRun);
    for(int q = startRun; q <= endRun; ++q) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(l->_glyphs, q);
        parsegraph_GlyphPainter_drawGlyph(painter, glyphData, worldPos[0] + pos[0], worldPos[1] + pos[1], fontScale);
        pos[0] += glyphData->advance * fontScale;
    }
}

void parsegraph_Line_drawRTLGlyphRun(parsegraph_Line* l, parsegraph_GlyphPainter* painter, float* worldPos, float* pos, const char** direction, float fontScale, int startRun, int endRun)
{
    float runWidth = 0;
    for(int q = startRun; q <= endRun; ++q) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(l->_glyphs, q);
        runWidth += glyphData->advance * fontScale;
    }
    float advance = 0;
    for(int q = startRun; q <= endRun; ++q) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(l->_glyphs, q);
        advance += glyphData->advance * fontScale;
        parsegraph_GlyphPainter_drawGlyph(painter, glyphData, worldPos[0] + pos[0] + runWidth - advance, worldPos[1] + pos[1], fontScale);
    }
    pos[0] += runWidth;
}

void parsegraph_Line_drawGlyphRun(parsegraph_Line* l, parsegraph_GlyphPainter* painter, float* worldPos, float* pos, const char** direction, float fontScale, int startRun, int endRun)
{
    // Draw the run.
    if(!strcmp(*direction, "L") || (!parsegraph_RIGHT_TO_LEFT && !strcmp(*direction, "WS"))) {
        parsegraph_Line_drawLTRGlyphRun(l, painter, worldPos, pos, direction, fontScale, startRun, endRun);
    }
    else {
        parsegraph_Line_drawRTLGlyphRun(l, painter, worldPos, pos, direction, fontScale, startRun, endRun);
    }
}

void parsegraph_Line_paint(parsegraph_Line* l, parsegraph_GlyphPainter* painter, float* worldPos, float* pos, const char** direction, float fontScale)
{
    int startRun = 0;
    for(int j = 0; j < parsegraph_ArrayList_length(l->_glyphs); ++j) {
        parsegraph_GlyphData* glyphData = parsegraph_ArrayList_at(l->_glyphs, j);
        const char* glyphDirection = getDirection(glyphData, *direction);
        //parsegraph_log("Glyphdata is %d. Length is %d\n", glyphData->letter[0], glyphData->length);
        //parsegraph_log("Char is %d Direction is %s\n", l32[0], glyphDirection);
        if(!strcmp(*direction, "WS") && strcmp(glyphDirection, "WS")) {
            // Use the glyph's direction if there is none currently in use.
            *direction = glyphDirection;
        }
        if(j < parsegraph_ArrayList_length(l->_glyphs) - 1 && !strcmp(*direction, glyphDirection)) {
            //parsegraph_log("Found another character in glyph run.\n");
            continue;
        }
        parsegraph_Line_drawGlyphRun(l, painter, worldPos, pos, direction, fontScale, startRun, j);

        // Set the new glyph direction.
        *direction = glyphDirection;
        startRun = j;
    }
    pos[1] += parsegraph_Line_height(l) * fontScale;
    pos[0] = 0;
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
    float worldPos[2] = {worldX, worldY};
    float pos[2] = {0, 0};
    const char* direction = "WS";

    for(int i = 0; i < parsegraph_ArrayList_length(label->_lines); ++i) {
        parsegraph_Line* l = parsegraph_ArrayList_at(label->_lines, i);
        parsegraph_Line_paint(l, painter, worldPos, pos, &direction, fontScale);
    }
}
