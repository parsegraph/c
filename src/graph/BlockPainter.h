#ifndef parsegraph_BlockPainter_INCLUDED
#define parsegraph_BlockPainter_INCLUDED

#include "../gl.h"
#include <apr_hash.h>
#include <apr_pools.h>

struct parsegraph_BlockPainter {
int _id;
const char* _string;
apr_pool_t* pool;
float _borderColor[4];
float _backgroundColor[4];
float _bounds[4];
GLuint _blockProgramSimple;
GLuint simple_a_color;
GLuint simple_u_world;
GLuint simple_a_position;
GLuint _blockProgram;
GLuint u_world;
GLuint a_position;
GLuint a_texCoord;
GLuint a_color;
GLuint a_borderColor;
GLuint a_borderRoundedness;
GLuint a_borderThickness;
GLuint a_aspectRatio;
GLuint _blockBuffer;
GLuint _blockBufferSimple;
int _blockBufferNumVertices;
int _blockBufferVertexIndex;
int _stride;
float* _vertexBuffer;
int _dataBufferVertexIndex;
int _dataBufferNumVertices;
float* _dataBuffer;
int _numBlocks;
int _numFaces;
int _numVertices;
int _maxSize;
};
typedef struct parsegraph_BlockPainter parsegraph_BlockPainter;

parsegraph_BlockPainter* parsegraph_BlockPainter_new(apr_pool_t* ppool, apr_hash_t* shaders);
float* parsegraph_BlockPainter_bounds(parsegraph_BlockPainter* painter);
float* parsegraph_BlockPainter_borderColor(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_setBorderColor(parsegraph_BlockPainter* painter, float* borderColor);
float* parsegraph_BlockPainter_backgroundColor(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_setBackgroundColor(parsegraph_BlockPainter* painter, float* backgroundColor);
void parsegraph_BlockPainter_initBuffer(parsegraph_BlockPainter* painter, unsigned int numBlocks);
void parsegraph_BlockPainter_clear(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_drawBlock(parsegraph_BlockPainter* painter,
    float cx, float cy, float width, float height, float borderRoundedness, float borderThickness, float borderScale);
void parsegraph_BlockPainter_flush(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_writeVertex(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_render(parsegraph_BlockPainter* painter, float* world, float scale);
void parsegraph_BlockPainter_destroy(parsegraph_BlockPainter* painter);
const char* parsegraph_BlockPainter_toString(parsegraph_BlockPainter* painter);

#endif // parsegraph_BlockPainter_INCLUDED
