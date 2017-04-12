#ifndef parsegraph_Extent_INCLUDED
#define parsegraph_Extent_INCLUDED

#include <apr_pools.h>

struct parsegraph_Extent {
    apr_pool_t* pool;
    unsigned int numBounds;
    unsigned int capacity;
    float* bounds;
};

/**
 * Represents a list of bounds. Each bound is comprised of a length
 * and a size. The extent always extends in the positive direction.
 *
 * An extent is used to represent each forward, backward, upward, and downward
 * side of a graph. The four extents represent the combine bounding picture of
 * the graph.
 */
struct parsegraph_Extent* parsegraph_Extent_new(apr_pool_t* pool);
void parsegraph_Extent_appendLS(struct parsegraph_Extent*, float, float);
unsigned int parsegraph_Extent_numBounds(struct parsegraph_Extent*);
void parsegraph_Extent_simplify(struct parsegraph_Extent*);

float parsegraph_Extent_boundLengthAt(struct parsegraph_Extent* extent, unsigned int index);
float parsegraph_Extent_boundSizeAt(struct parsegraph_Extent* extent, unsigned int index);
void parsegraph_Extent_clear(struct parsegraph_Extent* extent);

#endif // parsegraph_Extent_INCLUDED
