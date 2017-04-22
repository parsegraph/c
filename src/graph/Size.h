#ifndef parsegraph_Size_INCLUDED
#define parsegraph_Size_INCLUDED

#include <apr_pools.h>

float* parsegraph_Size_new(apr_pool_t* pool);
float* parsegraph_createSize(apr_pool_t* pool, float w, float h);
void parsegraph_Size_clear(float* size);
void parsegraph_Size_reset(float* size);
void parsegraph_Size_scale(float* size, float factor);
float* parsegraph_Size_scaled(apr_pool_t* pool, float* size, float factor);
float parsegraph_Size_width(float* size);
void parsegraph_Size_setWidth(float* size, float width);
float parsegraph_Size_height(float* size);
void parsegraph_Size_setHeight(float* size, float height);
void parsegraph_Size_set(float* size, float w, float h);

#endif // parsegraph_Size_INCLUDED
