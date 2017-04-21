#ifndef parsegraph_Color_INCLUDED
#define parsegraph_Color_INCLUDED

#include <apr_pools.h>

float* parsegraph_Color_new(apr_pool_t* pool, float r, float g, float b, float a);
void parsegraph_Color_SetRGBA(float* color, float r, float g, float b, float a);
void parsegraph_Color_SetRGB(float* color, float r, float g, float b);

#endif // parsegraph_Color_INCLUDED
