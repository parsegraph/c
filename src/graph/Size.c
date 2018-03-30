#include "Size.h"
#include <stdlib.h>

float* parsegraph_Size_new(apr_pool_t* pool)
{
    float* size;
    if(pool) {
        size = apr_palloc(pool, sizeof(float)*2);
    }
    else {
        size = malloc(sizeof(float)*2);
    }

    parsegraph_Size_clear(size);
    return size;
}

float* parsegraph_createSize(apr_pool_t* pool, float w, float h)
{
    float* size = parsegraph_Size_new(pool);
    parsegraph_Size_set(size, w, h);
    return size;
}

void parsegraph_Size_set(float* size, float w, float h)
{
    size[0] = w;
    size[1] = h;
}

void parsegraph_Size_clear(float* size)
{
    size[0] = 0;
    size[1] = 0;
}

void parsegraph_Size_reset(float* size)
{
    parsegraph_Size_clear(size);
}

void parsegraph_Size_scale(float* size, float factor)
{
    size[0] *= factor;
    size[1] *= factor;
}

float* parsegraph_Size_scaled(apr_pool_t* pool, float* size, float factor)
{
    return parsegraph_createSize(pool,
        size[0] * factor,
        size[1] * factor
    );
};

float parsegraph_Size_width(float* size)
{
    return size[0];
};

void parsegraph_Size_setWidth(float* size, float width)
{
    size[0] = width;
};

float parsegraph_Size_height(float* size)
{
    return size[1];
};

void parsegraph_Size_setHeight(float* size, float height)
{
    size[1] = height;
}
