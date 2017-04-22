#ifndef parsegraph_Rect_INCLUDED
#define parsegraph_Rect_INCLUDED

#include <apr_pools.h>

float* parsegraph_Rect_new(apr_pool_t* pool);
float* parsegraph_createRect(apr_pool_t* pool, float, float, float, float);
void parsegraph_Rect_destroy(float*, apr_pool_t* pool);
void parsegraph_Rect_setIdentity(float* rect);
void parsegraph_Rect_set(float* rect, float x, float y, float width, float height);
float parsegraph_Rect_x(float* rect);
void parsegraph_Rect_setX(float* rect, float x);
float parsegraph_Rect_y(float* rect);
void parsegraph_Rect_setY(float* rect, float y);
float parsegraph_Rect_height(float* rect);
void parsegraph_Rect_setHeight(float* rect, float height);
float parsegraph_Rect_width(float* rect);
void parsegraph_Rect_setWidth(float* rect, float width);
float parsegraph_Rect_vMin(float* rect);
float parsegraph_Rect_vMax(float* rect);
float parsegraph_Rect_hMin(float* rect);
float parsegraph_Rect_hMax(float* rect);
void parsegraph_Rect_include(float* rect, float bx, float by, float bwidth, float bheight);

#endif // parsegraph_Rect_INCLUDED
