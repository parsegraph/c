#ifndef alpha_FacePainter_INCLUDED
#define alpha_FacePainter_INCLUDED

#include <apr_pools.h>
#include "../gl.h"
#include "../pagingbuffer.h"

struct alpha_FacePainter {
apr_pool_t* pool;
GLuint faceProgram;
GLuint u_world;
GLuint a_color;
GLuint a_position;
struct parsegraph_pagingbuffer* faceBuffer;
};
typedef struct alpha_FacePainter alpha_FacePainter;

extern const char* alpha_FacePainter_VertexShader;
extern const char* alpha_FacePainter_FragmentShader;

struct alpha_FacePainter* alpha_FacePainter_new(apr_pool_t* pool);
void alpha_FacePainter_Clear(struct alpha_FacePainter* painter);
void alpha_FacePainter_Quad(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* v4, float* c1, float* c2, float* c3, float* c4);
void alpha_FacePainter_TriangleValues(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* c1, float* c2, float* c3);
void alpha_FacePainter_Triangle(struct alpha_FacePainter* painter, float** v, float** c);
int alpha_FacePainter_Draw(struct alpha_FacePainter* painter, float* viewMatrix);

#endif // alpha_FacePainter_INCLUDED
