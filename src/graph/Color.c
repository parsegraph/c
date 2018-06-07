#include "Color.h"
#include <stdlib.h>

// Background
float parsegraph_BACKGROUND_COLOR[] = {
    0, 47/255, 57/255, 1
    //256/255, 255/255, 255/255, 1
    //45/255, 84/255, 127/255, 1
};

float* parsegraph_Color_new(apr_pool_t* pool, float r, float g, float b, float a)
{
    float* color;
    if(pool) {
        color = apr_palloc(pool, sizeof(float)*4);
    }
    else {
        color = malloc(sizeof(float)*4);
    }
    parsegraph_Color_SetRGBA(color, r, g, b, a);
    return color;
}

void parsegraph_Color_destroy(float* color)
{
    free(color);
}

void parsegraph_Color_copy(float* dest, float* src)
{
    memcpy(dest, src, sizeof(float)*4);
}

void parsegraph_Color_SetRGBA(float* color, float r, float g, float b, float a)
{
    color[0] = r;
    color[1] = g;
    color[2] = b;
    color[3] = a;
}

void parsegraph_Color_SetRGB(float* color, float r, float g, float b)
{
    color[0] = r;
    color[1] = g;
    color[2] = b;
}
