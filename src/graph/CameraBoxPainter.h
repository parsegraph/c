#ifndef parsegraph_CameraBoxPainter_INCLUDED
#define parsegraph_CameraBoxPainter_INCLUDED

#include "BlockPainter.h"
#include "GlyphPainter.h"
#include <unicode/ustring.h>

struct parsegraph_CameraBoxPainter {
apr_pool_t* _pool;
parsegraph_BlockPainter* _blockPainter;
parsegraph_GlyphPainter* _glyphPainter;
parsegraph_GlyphAtlas* _glyphAtlas;
float _borderColor[4];
float _backgroundColor[4];
float _textColor[4];
int _fontSize;
};
typedef struct parsegraph_CameraBoxPainter parsegraph_CameraBoxPainter;

parsegraph_CameraBoxPainter* parsegraph_CameraBoxPainter_new(parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_CameraBoxPainter_clear(parsegraph_CameraBoxPainter* painter);
void parsegraph_CameraBoxPainter_drawBox(parsegraph_CameraBoxPainter* painter, const UChar* name, int len, float* rect, float scale);
void parsegraph_CameraBoxPainter_render(parsegraph_CameraBoxPainter* painter, float* world);
void parsegraph_CameraBoxPainter_destroy(parsegraph_CameraBoxPainter* painter);

#endif // parsegraph_CameraBoxPainter_INCLUDED
