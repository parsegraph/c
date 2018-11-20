#ifndef parsegraph_Label_INCLUDED
#define parsegraph_Label_INCLUDED

#include "GlyphAtlas.h"
#include <apr_pools.h>
#include "../ArrayList.h"

struct parsegraph_Label {
int _caretLine;
int _caretPos;
int _editable;
apr_pool_t* pool;
int(*_onTextChangedListener)(void*, struct parsegraph_Label*);
void* _onTextChangedListenerThisArg;
parsegraph_GlyphAtlas* _glyphAtlas;
parsegraph_ArrayList* _lines;
int _currentLine;
int _currentPos;
float _width;
float _height;
};
typedef struct parsegraph_Label parsegraph_Label;

struct parsegraph_Line {
parsegraph_Label* _label;
parsegraph_ArrayList* _glyphs;
float _width;
float _height;
int _linePos;
};
typedef struct parsegraph_Line parsegraph_Line;

parsegraph_Line* parsegraph_Line_new(parsegraph_Label* realLabel, const UChar* text, int len);
int parsegraph_Line_isEmpty(parsegraph_Line* line);
parsegraph_GlyphAtlas* parsegraph_Line_glyphAtlas(parsegraph_Line* line);
void parsegraph_Line_remove(parsegraph_Line* line, int pos, int count);
void parsegraph_Line_appendText(parsegraph_Line* line, const UChar* text, int len);
void parsegraph_Line_insertText(parsegraph_Line* line, int pos, const UChar* text, int len);
int parsegraph_Line_linePos(parsegraph_Line* line);
parsegraph_Label* parsegraph_Line_label(parsegraph_Line* line);
float parsegraph_Line_width(parsegraph_Line* line);
float parsegraph_Line_height(parsegraph_Line* line);
float parsegraph_Line_posAt(parsegraph_Line* line, int limit);
parsegraph_ArrayList* parsegraph_Line_glyphs(parsegraph_Line* line);

struct parsegraph_GlyphPainter;
typedef struct parsegraph_GlyphPainter parsegraph_GlyphPainter;

parsegraph_Label* parsegraph_Label_new(apr_pool_t* pool, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Label_setText(parsegraph_Label* label, const UChar* name, int len);
void parsegraph_Label_moveCaretDown(parsegraph_Label* label);
void parsegraph_Label_moveCaretUp(parsegraph_Label* label);
int parsegraph_Label_moveCaretBackward(parsegraph_Label* label);
int parsegraph_Label_moveCaretForward(parsegraph_Label* label);
int parsegraph_Label_backspaceCaret(parsegraph_Label* label);
float parsegraph_Label_width(parsegraph_Label* label);
float parsegraph_Label_height(parsegraph_Label* label);
void parsegraph_Label_paint(parsegraph_Label* label, parsegraph_GlyphPainter* painter, float worldX, float worldY, float fontScale);
int parsegraph_Line_text(parsegraph_Line* line, UChar* t, int len);
int parsegraph_Line_getText(parsegraph_Line* line, UChar* t, int len);
int parsegraph_Label_isEmpty(parsegraph_Label* label);
parsegraph_GlyphAtlas* parsegraph_Label_glyphAtlas(parsegraph_Label*);
float parsegraph_Label_fontSize(parsegraph_Label*);
int parsegraph_Label_ctrlKey(parsegraph_Label*, const char*);
int parsegraph_Label_key(parsegraph_Label*, const char*);
int parsegraph_Label_editable(parsegraph_Label*);
void parsegraph_Label_click(parsegraph_Label*, int, int);
void parsegraph_Label_getCaretRect(parsegraph_Label* label, float* cr);
int parsegraph_Label_text(parsegraph_Label* label, UChar* buf, int len);
int parsegraph_Label_getText(parsegraph_Label* label, UChar* buf, int len);
void parsegraph_Label_forEach(parsegraph_Label* label, void(*func)(parsegraph_Line*, void*), void* funcThisArg);
int parsegraph_Label_textChanged(parsegraph_Label* label);
#endif // parsegraph_Label_INCLUDED
