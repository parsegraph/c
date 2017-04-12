#include <httpd.h>
#include <math.h>
#include "Extent.h"

static unsigned int parsegraph_DEFAULT_EXTENT_BOUNDS = 1;

// The number of components per extent bound.
static unsigned int parsegraph_NUM_EXTENT_BOUND_COMPONENTS = 2;

struct parsegraph_Extent* parsegraph_Extent_new(apr_pool_t* pool)
{
    struct parsegraph_Extent* extent = apr_palloc(pool, sizeof(struct parsegraph_Extent));
    extent->pool = pool;
    extent->numBounds = 0;
    extent->capacity = sizeof(float) * parsegraph_DEFAULT_EXTENT_BOUNDS *
            parsegraph_NUM_EXTENT_BOUND_COMPONENTS;
    extent->bounds = apr_palloc(pool, extent->capacity);

    return extent;
}

void parsegraph_Extent_appendLS(struct parsegraph_Extent* extent, float length, float size)
{
    extent->numBounds++;
}

unsigned int parsegraph_Extent_numBounds(struct parsegraph_Extent* extent)
{
    return extent->numBounds;
}

float parsegraph_Extent_boundLengthAt(struct parsegraph_Extent* extent, unsigned int index)
{
    return extent->bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index];
}

float parsegraph_Extent_boundSizeAt(struct parsegraph_Extent* extent, unsigned int index)
{
    return extent->bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index + 1];
}

void parsegraph_Extent_clear(struct parsegraph_Extent* extent)
{
    extent->numBounds = 0;
}

void parsegraph_Extent_simplify(struct parsegraph_Extent* extent)
{
    float totalLength = 0;
    float maxSize = NAN;
    for(int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        totalLength += parsegraph_Extent_boundLengthAt(extent, i);

        float size = parsegraph_Extent_boundSizeAt(extent, i);
        if(maxSize == NAN) {
            maxSize = size;
        }
        else if(NAN != size) {
            maxSize = fmaxf(maxSize, size);
        }
    }
    parsegraph_Extent_clear(extent);
    parsegraph_Extent_appendLS(extent, totalLength, maxSize);
}
