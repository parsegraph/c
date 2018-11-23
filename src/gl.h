#ifndef parsegraph_gl_INCLUDED
#define parsegraph_gl_INCLUDED

#define GL_GLEXT_PROTOTYPES
#include <GL/glcorearb.h>
#include <apr_pools.h>

GLuint compileShader(const char* shaderSource, GLenum shaderType);
float* parsegraph_generateRectangleVertices(apr_pool_t* pool, float x, float y, float w, float h);
float* makePerspective(apr_pool_t* pool, float fieldOfViewInRadians, float aspect, float near, float far);
float* getVerts(apr_pool_t* pool, float width, float length, float height);
float* parsegraph_generateRectangleTexcoords(apr_pool_t* pool);
GLuint createProgram(GLuint vertexShader, GLuint fragmentShader);
float* matrixIdentity3x3(apr_pool_t* pool);
float* matrixCopy3x3(apr_pool_t* pool, float* src);
float* matrixMultiply3x3(apr_pool_t* pool, float* m, float* b);
float* matrixTransform2D(apr_pool_t* pool, float* world, float x, float y);
float* makeTranslation3x3(apr_pool_t* pool, float tx, float ty);
float* makeRotation3x3(apr_pool_t* pool, float angleInRadians);
float* makeScale3x3(apr_pool_t* pool, float sx, float sy);
float* makeInverse3x3(apr_pool_t* pool, float* input);
void midPoint(float x1, float y1, float x2, float y2, float* midX, float* midY);
float* make2DProjection(apr_pool_t* pool, float width, float height, int flipVertical);
float* subtractVectors3D(apr_pool_t* pool, float* a, float* b);
float* normalize3D(apr_pool_t* pool, float* v);
float* cross3D(apr_pool_t* pool, float* a, float* b);
float* makeTranslation4x4(apr_pool_t* pool, float tx, float ty, float tz);
float* makeXRotation(apr_pool_t* pool, float angleInRadians);
float* makeYRotation(apr_pool_t* pool, float angleInRadians);
float* makeZRotation(apr_pool_t* pool, float angleInRadians);
float* makeScale4x4(apr_pool_t* pool, float sx, float sy, float sz);
float* matrixMultiply4x4(apr_pool_t* pool, float* a, float* b);
float* makeInverse4x4(apr_pool_t* pool, float* m);
float* matrixVectorMultiply4x4(apr_pool_t* pool, float* v, float* m);
float* makeLookAt(apr_pool_t* pool, float* cameraPosition, float* target, float* up);
void alpha_dumpLastError();
void alpha_dumpError(GLenum err);

#endif // parsegraph_gl_INCLUDED
