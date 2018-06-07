#ifndef alpha_WeetPainter_INCLUDED
#define alpha_WeetPainter_INCLUDED

#include <apr_pools.h>
#include "../gl.h"

extern const char* alpha_WeetPainter_VertexShader;
extern const char* alpha_WeetPainter_FragmentShader;

struct alpha_WeetPainter {
    apr_pool_t* pool;
    unsigned int _numCubes;
    GLuint faceProgram;
    GLint a_position;
    GLint a_color;
    GLint u_world;
    float* _posData;
    float* _colorData;
    unsigned int _dataX;
    GLuint _posBuffer;
    GLuint _colorBuffer;
};
typedef struct alpha_WeetPainter alpha_WeetPainter;

alpha_WeetPainter* alpha_WeetPainter_new(apr_pool_t* pool);
void alpha_WeetPainter_Init(alpha_WeetPainter* painter, unsigned int numCubes);
int alpha_WeetPainter_Cube(alpha_WeetPainter* painter, float* m);
void alpha_WeetPainter_Draw(alpha_WeetPainter* painter, float* viewMatrix);
void alpha_WeetPainter_Clear(alpha_WeetPainter* painter);

#endif // alpha_WeetPainter_INCLUDED
