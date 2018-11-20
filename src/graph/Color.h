#ifndef parsegraph_Color_INCLUDED
#define parsegraph_Color_INCLUDED

#include <apr_pools.h>

float* parsegraph_Color_new(apr_pool_t* pool, float r, float g, float b, float a);
void parsegraph_Color_SetRGBA(float* color, float r, float g, float b, float a);
void parsegraph_Color_SetRGB(float* color, float r, float g, float b);
void parsegraph_Color_destroy(float* color);
void parsegraph_Color_copy(float* dest, float* src);
int parsegraph_Color_equals(float* a, float* b);
void parsegraph_Color_interpolate(float* sink, float* c, float* other, float interp);
float parsegraph_Color_luminance(float* c);
float parsegraph_SRGBCompanding(float v);
float parsegraph_inverseSRGBCompanding(float v);
int parsegraph_Color_asRGB(float* c, char* buf, size_t len);
void parsegraph_Color_premultiply(float* sink, float* src, float* other);
void parsegraph_Color_multiply(float* sink, float* src, float* other);

extern float parsegraph_BACKGROUND_COLOR[4];

#endif // parsegraph_Color_INCLUDED
