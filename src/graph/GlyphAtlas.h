#ifndef parsegraph_GlyphAtlas_INCLUDED
#define parsegraph_GlyphAtlas_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>
#include "../gl.h"
#include <unicode/uchar.h>
#include "../ArrayList.h"

struct parsegraph_Unicode;
typedef struct parsegraph_Unicode parsegraph_Unicode;

struct parsegraph_GlyphAtlas;
typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

struct parsegraph_GlyphData;

struct parsegraph_GlyphPage {
parsegraph_GlyphAtlas* glyphAtlas;
int _id;
GLuint _glyphTexture;
struct parsegraph_GlyphData* _firstGlyph;
struct parsegraph_GlyphData* _lastGlyph;
struct parsegraph_GlyphPage* next;
};
typedef struct parsegraph_GlyphPage parsegraph_GlyphPage;

struct parsegraph_GlyphData {
parsegraph_GlyphPage* glyphPage;
UChar* letter;
int length;
int painted;
unsigned int x;
unsigned int y;
unsigned int width;
unsigned int height;
unsigned int ascent;
unsigned int descent;
int advance;
struct parsegraph_GlyphData* next;
};
typedef struct parsegraph_GlyphData parsegraph_GlyphData;

struct parsegraph_GlyphAtlas {
apr_pool_t* pool;
int _id;
int _needsUpdate;
void* _font;
parsegraph_ArrayList* _pages;
int _padding;
int _x;
int _y;
parsegraph_Unicode* _unicode;
UChar _fontName[255];
const char* _fillStyle;
float _fontSize;
apr_hash_t* _glyphData;
int _currentRowHeight;
int _maxPage;
int _glTextureSize;
void* _renderTexture;
};
typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

extern int parsegraph_GlyphPage_COUNT;
extern int parsegraph_GlyphAtlas_COUNT;

extern parsegraph_GlyphAtlas* parsegraph_PAINTING_GLYPH_ATLAS;

parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(apr_pool_t* ppool, float fontSizePixels, UChar* fontName, int len, const char* fontStyle);
void parsegraph_GlyphAtlas_setUnicode(parsegraph_GlyphAtlas* atlas, parsegraph_Unicode* uni);
parsegraph_Unicode* parsegraph_GlyphAtlas_unicode(parsegraph_GlyphAtlas* atlas);
int parsegraph_GlyphAtlas_toString(parsegraph_GlyphAtlas* atlas, char* buf, size_t len);
int parsegraph_GlyphAtlas_maxPage(parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_GlyphData* parsegraph_GlyphAtlas_getGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
parsegraph_GlyphData* parsegraph_GlyphAtlas_get(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
int parsegraph_GlyphAtlas_hasGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
int parsegraph_GlyphAtlas_has(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
void parsegraph_GlyphAtlas_update(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_clear(parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_GlyphAtlas_needsUpdate(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_restoreProperties(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_font(parsegraph_GlyphAtlas* glyphAtlas, UChar* buf, size_t len);
int parsegraph_GlyphAtlas_pageTextureSize(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_letterHeight(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_fontBaseline(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_fontSize(parsegraph_GlyphAtlas* glyphAtlas);
UChar* parsegraph_GlyphAtlas_fontName(parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_GlyphAtlas_isNewline(parsegraph_GlyphAtlas* glyphAtlas, UChar c);

parsegraph_GlyphData* parsegraph_GlyphData_new(parsegraph_GlyphPage* glyphPage, const UChar* glyph, int len, int x, int y, int width, int height, int ascent, int descent, int advance);

// These are platform-specific.
void* parsegraph_GlyphAtlas_createFont(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_destroy(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_destroyFont(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* text, int len, 
    int* width, int* height, int* ascent, int* descent, int* advance);
void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas, int width, int height);
void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture);
void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* texture);
void parsegraph_GlyphAtlas_clearTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture);
void* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture);
void parsegraph_GlyphAtlas_freeTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* data);

#endif // parsegraph_GlyphAtlas_INCLUDED
