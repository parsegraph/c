#ifndef parsegraph_GlyphPainter_INCLUDED
#define parsegraph_GlyphPainter_INCLUDED

#include <apr_hash.h>
#include <apr_pools.h>
#include "../gl.h"
#include "ArrayList.h"

struct parsegraph_GlyphAtlas;
typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

struct parsegraph_GlyphData;
typedef struct parsegraph_GlyphData parsegraph_GlyphData;

struct parsegraph_Color;
typedef struct parsegraph_Color parsegraph_Color;

struct parsegraph_GlyphPainter;
typedef struct parsegraph_GlyphPainter parsegraph_GlyphPainter;

struct parsegraph_GlyphRenderData {
parsegraph_GlyphPainter* painter;
parsegraph_GlyphData* glyphData;
};
typedef struct parsegraph_GlyphRenderData parsegraph_GlyphRenderData;


parsegraph_GlyphRenderData* parsegraph_GlyphRenderData_new(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData);

struct parsegraph_GlyphPainter {
int _id;
parsegraph_GlyphAtlas* _glyphAtlas;
GLuint _textProgram;
apr_pool_t* pool;
int _maxSize;
int _stride;
GLint a_position;
GLint a_color;
GLint a_backgroundColor;
GLint a_texCoord;
GLint u_world;
GLint u_glyphTexture;
float _color[4];
float _backgroundColor[4];
parsegraph_ArrayList* _textBuffers;
float* _vertexBuffer;
};
typedef struct parsegraph_GlyphPainter parsegraph_GlyphPainter;

struct parsegraph_GlyphPageRenderer {
parsegraph_GlyphPainter* _painter;
int _textureIndex;
GLuint _glyphBuffer;
int _glyphBufferNumVertices;
int _glyphBufferVertexIndex;
int _dataBufferVertexIndex;
int _dataBufferNumVertices;
float* _dataBuffer;
};
typedef struct parsegraph_GlyphPageRenderer parsegraph_GlyphPageRenderer;

parsegraph_GlyphPageRenderer* parsegraph_GlyphPageRenderer_new(parsegraph_GlyphPainter* painter, int textureIndex);
void parsegraph_GlyphPageRenderer_initBuffer(parsegraph_GlyphPageRenderer* pageRender, int numGlyphs);
void parsegraph_GlyphPageRenderer_clear(parsegraph_GlyphPageRenderer* pageRender);
void parsegraph_GlyphPageRenderer_flush(parsegraph_GlyphPageRenderer* pageRender);
void parsegraph_GlyphPageRenderer_writeVertex(parsegraph_GlyphPageRenderer* pageRender);
void parsegraph_GlyphPageRenderer_destroy(parsegraph_GlyphPageRenderer* pageRender);

parsegraph_GlyphPainter* parsegraph_GlyphPainter_new(apr_pool_t* ppool, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_GlyphPainter_destroy(parsegraph_GlyphPainter* glyphPainter);
float* parsegraph_GlyphPainter_color(parsegraph_GlyphPainter* glyphPainter);
float* parsegraph_GlyphPainter_backgroundColor(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_setColor(parsegraph_GlyphPainter* glyphPainter, float* color);
void parsegraph_GlyphPainter_setBackgroundColor(parsegraph_GlyphPainter* glyphPainter, float* color);
float parsegraph_GlyphPainter_fontSize(parsegraph_GlyphPainter* glyphPainter);
parsegraph_GlyphAtlas* parsegraph_GlyphPainter_glyphAtlas(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_drawGlyph(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData, float x, float y, float fontScale);
void parsegraph_GlyphPainter_clear(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_initBuffer(parsegraph_GlyphPainter* painter, parsegraph_ArrayList* numGlyphs);
void parsegraph_GlyphPainter_render(parsegraph_GlyphPainter* glyphPainter, float* world, float scale);

#endif // parsegraph_GlyphPainter_INCLUDED
