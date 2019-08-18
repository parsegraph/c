#ifndef parsegraph_SpotlightPainter_INCLUDED
#define parsegraph_SpotlightPainter_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>
#include "../gl.h"
#include "../pagingbuffer.h"

struct parsegraph_SpotlightPainter {
apr_pool_t* pool;
GLint _program;
parsegraph_pagingbuffer* _spotlightBuffer;
int a_position;
int a_texCoord;
int a_color;
int u_world;
};
typedef struct parsegraph_SpotlightPainter parsegraph_SpotlightPainter;

void parsegraph_SpotlightPainter_render(parsegraph_SpotlightPainter* painter, float* world, float scale);
void parsegraph_SpotlightPainter_clear(parsegraph_SpotlightPainter* painter);
void parsegraph_SpotlightPainter_destroy(parsegraph_SpotlightPainter* painter);
void parsegraph_SpotlightPainter_drawRectSpotlight(parsegraph_SpotlightPainter* painter, float cx, float cy, float w, float h, float* color);
void parsegraph_SpotlightPainter_drawSpotlight(parsegraph_SpotlightPainter* painter, float cx, float cy, float radius, float* color);
parsegraph_SpotlightPainter* parsegraph_SpotlightPainter_new(apr_pool_t* ppool, apr_hash_t* shaders);

#endif // parsegraph_SpotlightPainter_INCLUDED
