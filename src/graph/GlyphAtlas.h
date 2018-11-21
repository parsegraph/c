#ifndef parsegraph_GlyphAtlas_INCLUDED
#define parsegraph_GlyphAtlas_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>
#include "../gl.h"
#include <unicode/uchar.h>

struct parsegraph_Unicode;
typedef struct parsegraph_Unicode parsegraph_Unicode;

struct parsegraph_Surface;
typedef struct parsegraph_Surface parsegraph_Surface;

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
UChar letter[U16_MAX_LENGTH];
int length;
int painted;
unsigned int x;
unsigned int y;
unsigned int width;
unsigned int height;
struct parsegraph_GlyphData* next;
};
typedef struct parsegraph_GlyphData parsegraph_GlyphData;

struct parsegraph_GlyphAtlas {
apr_pool_t* pool;
int _id;
int _needsUpdate;
void* _font;
parsegraph_Surface* surface;
parsegraph_GlyphPage* _firstPage;
parsegraph_GlyphPage* _lastPage;
int _padding;
int _x;
int _y;
parsegraph_Unicode* _unicode;
UChar _fontName[255];
const char* _fillStyle;
float _fontSize;
apr_hash_t* _glyphData;
};
typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

extern int parsegraph_GlyphPage_COUNT;
extern int parsegraph_GlyphAtlas_COUNT;

extern parsegraph_GlyphAtlas* parsegraph_PAINTING_GLYPH_ATLAS;

parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(parsegraph_Surface* surface, float fontSizePixels, UChar* fontName, int len, const char* fontStyle);
void parsegraph_GlyphAtlas_setUnicode(parsegraph_GlyphAtlas* atlas, parsegraph_Unicode* uni);
parsegraph_Unicode* parsegraph_GlyphAtlas_unicode(parsegraph_GlyphAtlas* atlas);
int parsegraph_GlyphAtlas_toString(parsegraph_GlyphAtlas* atlas, char* buf, size_t len);
parsegraph_GlyphData* parsegraph_GlyphAtlas_getGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
parsegraph_GlyphData* parsegraph_GlyphAtlas_get(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
int parsegraph_GlyphAtlas_hasGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
int parsegraph_GlyphAtlas_has(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
void parsegraph_GlyphAtlas_update(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_clear(parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_GlyphAtlas_needsUpdate(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_restoreProperties(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_font(parsegraph_GlyphAtlas* glyphAtlas, UChar* buf, size_t len);
int parsegraph_GlyphAtlas_maxTextureWidth(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_letterHeight(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_fontBaseline(parsegraph_GlyphAtlas* glyphAtlas);
float parsegraph_GlyphAtlas_fontSize(parsegraph_GlyphAtlas* glyphAtlas);
UChar* parsegraph_GlyphAtlas_fontName(parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_GlyphAtlas_isNewline(parsegraph_GlyphAtlas* glyphAtlas, UChar c);
parsegraph_Surface* parsegraph_GlyphAtlas_surface(parsegraph_GlyphAtlas* atlas);

parsegraph_GlyphData* parsegraph_GlyphData_new(parsegraph_GlyphPage* glyphPage, const UChar* glyph, int len, unsigned int x, unsigned int y, unsigned int width, unsigned int height);

// These are platform-specific.
void* parsegraph_GlyphAtlas_createFont(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_destroyFont(parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len);
void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture);
void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* texture);
const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture);

#endif // parsegraph_GlyphAtlas_INCLUDED
