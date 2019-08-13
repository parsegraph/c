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
    float _offset;
    int _hasBoundingValues;
    float _totalLength;
    float _minSize;
    float _maxSize;
};
typedef struct parsegraph_Extent parsegraph_Extent;

extern unsigned int parsegraph_DEFAULT_EXTENT_BOUNDS;

// The number of components per extent bound.
extern unsigned int parsegraph_NUM_EXTENT_BOUND_COMPONENTS;

parsegraph_Extent* parsegraph_Extent_new(apr_pool_t* pool);
void parsegraph_Extent_setOffset(parsegraph_Extent* extent, float offset);
float parsegraph_Extent_setOffset(parsegraph_Extent* extent, float offset);
void parsegraph_Extent_forEach(parsegraph_Extent* extent, void(*func)(void*, float, float, int), void* thisArg);
parsegraph_Extent* parsegraph_Extent_clone(parsegraph_Extent*);
void parsegraph_Extent_clear(parsegraph_Extent* extent);
unsigned int parsegraph_Extent_numBounds(parsegraph_Extent*);
int parsegraph_Extent_hasBounds(parsegraph_Extent*);
int parsegraph_Extent_boundCapacity(parsegraph_Extent* extent);
float parsegraph_Extent_boundLengthAt(parsegraph_Extent* extent, unsigned int index);
float parsegraph_Extent_boundSizeAt(parsegraph_Extent* extent, unsigned int index);
void parsegraph_Extent_invalidateBoundingValues(parsegraph_Extent* extent);
void parsegraph_Extent_setBoundLengthAt(parsegraph_Extent* extent, unsigned int index, float length);
void parsegraph_Extent_setBoundSizeAt(parsegraph_Extent* extent, unsigned int index, float size);
int parsegraph_Extent_realloc(parsegraph_Extent* extent, unsigned int capacity);
int parsegraph_Extent_prependLS(parsegraph_Extent*, float, float);
int parsegraph_Extent_appendLS(parsegraph_Extent*, float, float);
int parsegraph_Extent_prependSL(parsegraph_Extent*, float, float);
int parsegraph_Extent_appendSL(parsegraph_Extent* extent, float size, float length);
void parsegraph_Extent_adjustSize(parsegraph_Extent* extent, float);
void parsegraph_Extent_simplify(parsegraph_Extent*);
float parsegraph_Extent_sizeAt(parsegraph_Extent* extent, float);
void parsegraph_Extent_combineBound(parsegraph_Extent* extent,
    float newBoundStart,
    float newBoundLength,
    float newBoundSize);
void parsegraph_Extent_copyFrom(parsegraph_Extent* extent, parsegraph_Extent* from);
void parsegraph_Extent_combineExtentAndSimplify(parsegraph_Extent* extent,
    parsegraph_Extent* given,
    float lengthAdjustment,
    float sizeAdjustment,
    float scale);
void parsegraph_Extent_combineExtent(parsegraph_Extent* extent, parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale);
parsegraph_Extent* parsegraph_Extent_combinedExtent(parsegraph_Extent* extent, parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale);
void parsegraph_Extent_scale(parsegraph_Extent* extent, float);
float parsegraph_Extent_separation(parsegraph_Extent* extent,
    parsegraph_Extent* given,
    float positionAdjustment,
    int allowAxisOverlap,
    float givenScale,
    float axisMinimum);
void parsegraph_Extent_boundingValues(parsegraph_Extent* extent, float*, float*, float*);
int parsegraph_Extent_equals(parsegraph_Extent* extent, parsegraph_Extent* other);
void parsegraph_Extent_dump(parsegraph_Extent* extent, const char* title, ...);
void parsegraph_Extent_destroy(parsegraph_Extent* extent);
#endif // parsegraph_Extent_INCLUDED
