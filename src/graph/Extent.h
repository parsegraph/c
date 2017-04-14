#ifndef parsegraph_Extent_INCLUDED
#define parsegraph_Extent_INCLUDED

#include <math.h>

struct parsegraph_ExtentBound {
    float length;
    float size;
};

struct parsegraph_Extent {
    apr_pool_t* pool;
    unsigned int numBounds;
    unsigned int start;
    unsigned int capacity;
    struct parsegraph_ExtentBound* bounds;
};

extern unsigned int parsegraph_DEFAULT_EXTENT_BOUNDS;

// The number of components per extent bound.
extern unsigned int parsegraph_NUM_EXTENT_BOUND_COMPONENTS;

/**
 * Represents a list of bounds. Each bound is comprised of a length
 * and a size. The extent always extends in the positive direction.
 *
 * An extent is used to represent each forward, backward, upward, and downward
 * side of a graph. The four extents represent the combine bounding picture of
 * the graph.
 */
struct parsegraph_Extent* parsegraph_Extent_new(apr_pool_t* pool);
struct parsegraph_Extent* parsegraph_Extent_clone(struct parsegraph_Extent*);
int parsegraph_Extent_appendLS(struct parsegraph_Extent*, float, float);
int parsegraph_Extent_prependLS(struct parsegraph_Extent*, float, float);
unsigned int parsegraph_Extent_numBounds(struct parsegraph_Extent*);
int parsegraph_Extent_hasBounds(struct parsegraph_Extent*);
void parsegraph_Extent_simplify(struct parsegraph_Extent*);
void parsegraph_Extent_dump(struct parsegraph_Extent* extent);
int parsegraph_Extent_realloc(struct parsegraph_Extent* extent, unsigned int capacity);

float parsegraph_Extent_boundLengthAt(struct parsegraph_Extent* extent, unsigned int index);
float parsegraph_Extent_boundSizeAt(struct parsegraph_Extent* extent, unsigned int index);
void parsegraph_Extent_setBoundLengthAt(struct parsegraph_Extent* extent, unsigned int index, float length);
void parsegraph_Extent_setBoundSizeAt(struct parsegraph_Extent* extent, unsigned int index, float size);
void parsegraph_Extent_clear(struct parsegraph_Extent* extent);
int parsegraph_Extent_boundCapacity(struct parsegraph_Extent* extent);
void parsegraph_Extent_forEach(struct parsegraph_Extent* extent, void(*func)(void*, float, float, int), void* thisArg);
void parsegraph_Extent_adjustSize(struct parsegraph_Extent* extent, float);
float parsegraph_Extent_sizeAt(struct parsegraph_Extent* extent, float);
void parsegraph_Extent_scale(struct parsegraph_Extent* extent, float);
struct parsegraph_Extent* parsegraph_Extent_combinedExtent(struct parsegraph_Extent* extent, struct parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale);
void parsegraph_Extent_combineExtent(struct parsegraph_Extent* extent, struct parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale);
void parsegraph_Extent_copyFrom(struct parsegraph_Extent* extent, struct parsegraph_Extent* from);
void parsegraph_Extent_combineBound(struct parsegraph_Extent* extent,
    float newBoundStart,
    float newBoundLength,
    float newBoundSize);
void parsegraph_Extent_destroy(struct parsegraph_Extent* extent);
float parsegraph_Extent_separation(struct parsegraph_Extent* extent,
    struct parsegraph_Extent* given,
    float positionAdjustment,
    int allowAxisOverlap,
    float givenScale,
    float axisMinimum);
struct parsegraph_Extent* parsegraph_Extent_compact(struct parsegraph_Extent* extent);
void parsegraph_Extent_boundingValues(struct parsegraph_Extent* extent, float*, float*, float*);
int parsegraph_Extent_equals(struct parsegraph_Extent* extent, struct parsegraph_Extent* other);


#endif // parsegraph_Extent_INCLUDED
