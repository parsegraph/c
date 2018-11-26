#ifndef parsegraph_GlyphPainter_INCLUDED
#define parsegraph_GlyphPainter_INCLUDED

#include <apr_hash.h>
#include <apr_pools.h>
#include "../gl.h"
#include "../pagingbuffer.h"

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
apr_pool_t* _renderPool;
parsegraph_pagingbuffer* _textBuffer;
int _maxSize;
GLint a_position;
GLint a_color;
GLint a_backgroundColor;
GLint a_texCoord;
GLint u_world;
GLint u_glyphTexture;
float _color[4];
float _backgroundColor[4];
apr_hash_t* _textBuffers;
};
typedef struct parsegraph_GlyphPainter parsegraph_GlyphPainter;

parsegraph_GlyphPainter* parsegraph_GlyphPainter_new(parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_GlyphPainter_destroy(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_setColor(parsegraph_GlyphPainter* glyphPainter, float* color);
void parsegraph_GlyphPainter_setBackgroundColor(parsegraph_GlyphPainter* glyphPainter, float* color);
float parsegraph_GlyphPainter_fontSize(parsegraph_GlyphPainter* glyphPainter);
parsegraph_GlyphAtlas* parsegraph_GlyphPainter_glyphAtlas(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_drawGlyph(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData, float x, float y, float fontScale);
void parsegraph_GlyphPainter_clear(parsegraph_GlyphPainter* glyphPainter);
void parsegraph_GlyphPainter_render(parsegraph_GlyphPainter* glyphPainter, float* world, float scale);

#endif // parsegraph_GlyphPainter_INCLUDED
