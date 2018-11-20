#ifndef parsegraph_BlockPainter_INCLUDED
#define parsegraph_BlockPainter_INCLUDED

#include "../gl.h"
#include <apr_hash.h>

struct parsegraph_Surface;
typedef struct parsegraph_Surface parsegraph_Surface;

struct parsegraph_BlockPainter {
float _borderColor[4];
float _backgroundColor[4];
float _bounds[4];
float* _itemBuffer;
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
int _stride;
int _numBlocks;
int _numFaces;
int _numVertices;
};
typedef struct parsegraph_BlockPainter parsegraph_BlockPainter;

parsegraph_BlockPainter* parsegraph_BlockPainter_new(parsegraph_Surface* surface, apr_hash_t* shaders);
float* parsegraph_BlockPainter_bounds(parsegraph_BlockPainter* painter);
float* parsegraph_BlockPainter_borderColor(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_setBorderColor(parsegraph_BlockPainter* painter, float* borderColor);
float* parsegraph_BlockPainter_backgroundColor(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_setBackgroundColor(parsegraph_BlockPainter* painter, float* backgroundColor);
void parsegraph_BlockPainter_initBuffer(parsegraph_BlockPainter* painter, unsigned int numBlocks);
void parsegraph_BlockPainter_clear(parsegraph_BlockPainter* painter);
void parsegraph_BlockPainter_drawBlock(parsegraph_BlockPainter* painter,
    float cx, float cy, float width, float height, float borderRoundedness, float borderThickness, float borderScale);
void parsegraph_BlockPainter_render(parsegraph_BlockPainter* painter, float* world);

#endif // parsegraph_BlockPainter_INCLUDED
