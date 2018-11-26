#ifndef parsegraph_FanPainter_INCLUDED
#define parsegraph_FanPainter_INCLUDED

#include "../gl.h"
#include "../pagingbuffer.h"

struct parsegraph_FanPainter {
apr_pool_t* pool;
float _ascendingRadius;
float _descendingRadius;
float _selectionAngle;
float _selectionSize;
GLuint fanProgram;
parsegraph_pagingbuffer* _fanBuffer;
GLuint a_position;
GLuint a_color;
GLuint a_texCoord;
GLuint a_selectionAngle;
GLuint a_selectionSize;
GLuint u_world;
GLuint u_time;
};
typedef struct parsegraph_FanPainter parsegraph_FanPainter;

parsegraph_FanPainter* parsegraph_FanPainter_new(apr_pool_t* pool, apr_hash_t* shaders);
void parsegraph_FanPainter_selectDeg(parsegraph_FanPainter* painter,
    float userX, float userY,
    float startAngle, float spanAngle,
    float* startColor, float* endColor);
void parsegraph_FanPainter_selectRad(parsegraph_FanPainter* painter,
    float userX, float userY,
    float startAngle, float spanAngle,
    float* startColor, float* endColor);
void parsegraph_FanPainter_setAscendingRadius(parsegraph_FanPainter* painter, float ascendingRadius);
void parsegraph_FanPainter_setDescendingRadius(parsegraph_FanPainter* painter, float descendingRadius);
void parsegraph_FanPainter_clear(parsegraph_FanPainter* painter);
void parsegraph_FanPainter_setSelectionAngle(parsegraph_FanPainter* painter, float selectionAngle);
void parsegraph_FanPainter_setSelectionSize(parsegraph_FanPainter* painter, float selectionSize);
void parsegraph_FanPainter_render(parsegraph_FanPainter* painter, float* viewMatrix);
void parsegraph_FanPainter_destroy(parsegraph_FanPainter* painter);

#endif // parsegraph_FanPainter_INCLUDED
