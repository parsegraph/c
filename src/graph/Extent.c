#include <httpd.h>
#include <math.h>
#include "Extent.h"
#include "../die.h"
#include "log.h"

unsigned int parsegraph_DEFAULT_EXTENT_BOUNDS = 1;
unsigned int parsegraph_NUM_EXTENT_BOUND_COMPONENTS = 2;

struct parsegraph_Extent* parsegraph_Extent_new(apr_pool_t* pool)
{
    struct parsegraph_Extent* extent;
    if(pool) {
        extent = apr_pcalloc(pool, sizeof(*extent));
    }
    else {
        extent = malloc(sizeof(*extent));
    }
    extent->pool = pool;
    extent->numBounds = 0;
    extent->bounds = 0;
    extent->capacity = 0;

    extent->start = 0;

    extent->_offset = 0;
    extent->_hasBoundingValues = 0;
    extent->_totalLength = 0;
    extent->_minSize = 0;
    extent->_maxSize = 0;

    return extent;
}

void parsegraph_Extent_setOffset(parsegraph_Extent* extent, float offset)
{
    extent->_offset = offset;
}

float parsegraph_Extent_setOffset(parsegraph_Extent* extent, float offset)
{
    extent->_offset = offset;
}

void parsegraph_Extent_forEach(parsegraph_Extent* extent, void(*func)(void*, float, float, int), void* thisArg)
{
    if(!thisArg) {
        thisArg = extent;
    }
    for(int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        func(
            thisArg,
            parsegraph_Extent_boundLengthAt(extent, i),
            parsegraph_Extent_boundSizeAt(extent, i),
            i
        );
    }
};

parsegraph_Extent* parsegraph_Extent_clone(parsegraph_Extent* orig)
{
    parsegraph_Extent* clone;
    if(orig->pool) {
        clone = apr_pcalloc(orig->pool, sizeof(*clone));
    }
    else {
        clone = malloc(sizeof(*clone));
    }
    clone->_offset = orig->_offset;
    clone->numBounds = parsegraph_Extent_numBounds(orig);
    clone->start = orig->start;
    clone->pool = orig->pool;
    clone->capacity = orig->capacity;
    //parsegraph_log("Upgrading extent capacity to %d bounds\n", orig->capacity);
    if(clone->pool) {
        clone->bounds = apr_pcalloc(orig->pool, sizeof(struct parsegraph_ExtentBound) * orig->capacity);
    }
    else {
        clone->bounds = malloc(sizeof(struct parsegraph_ExtentBound) * orig->capacity);
    }
    if(orig->bounds) {
        memcpy(clone->bounds, orig->bounds, sizeof(struct parsegraph_ExtentBound) * parsegraph_Extent_numBounds(clone));
    }
    clone->_hasBoundingValues = orig->_hasBoundingValues;
    if(orig->_hasBoundingValues) {
        clone->_minSize = orig->_minSize;
        clone->_maxSize = orig->_maxSize;
        clone->_totalLength = orig->_totalLength;
    }
    return clone;
}

void parsegraph_Extent_clear(parsegraph_Extent* extent)
{
    extent->start = 0;
    extent->numBounds = 0;
}

unsigned int parsegraph_Extent_numBounds(parsegraph_Extent* extent)
{
    return extent->numBounds;
}

int parsegraph_Extent_hasBounds(parsegraph_Extent* extent)
{
    return parsegraph_Extent_numBounds(extent) > 0;
}

float parsegraph_Extent_boundLengthAt(parsegraph_Extent* extent, unsigned int index)
{
    return extent->capacity > 0 ? extent->bounds[(extent->start + index) % extent->capacity].length : NAN;
}

float parsegraph_Extent_boundSizeAt(parsegraph_Extent* extent, unsigned int index)
{
    return extent->capacity > 0 ? extent->bounds[(extent->start + index) % extent->capacity].size : NAN;
}

void parsegraph_Extent_invalidateBoundingValues(parsegraph_Extent* extent)
{
    extent->_hasBoundingValues = 0;
    extent->_minSize = 0;
    extent->_maxSize = 0;
    extent->_totalLength = 0;
}

void parsegraph_Extent_setBoundLengthAt(parsegraph_Extent* extent, unsigned int index, float length)
{
    if(extent->capacity == 0) {
        parsegraph_die("Cannot set a bound length of an empty Extent.");
    }
    //parsegraph_log("(start=%d)+(index=%d) %% (capacity=%d) = (length=%f)\n", extent->start, index, extent->capacity, length);
    extent->bounds[(extent->start + index) % extent->capacity].length = length;
}

void parsegraph_Extent_setBoundSizeAt(parsegraph_Extent* extent, unsigned int index, float size)
{
    if(extent->capacity == 0) {
        parsegraph_die("Cannot set a bound length of an empty Extent.");
    }
    //parsegraph_log("(start=%d)+(index=%d) %% (capacity=%d) = (size=%f)\n", extent->start, index, extent->capacity, size);
    extent->bounds[(extent->start + index) % extent->capacity].size = size;
}

int parsegraph_Extent_realloc(parsegraph_Extent* extent, unsigned int capacity)
{
    if(capacity < parsegraph_DEFAULT_EXTENT_BOUNDS) {
        capacity = parsegraph_DEFAULT_EXTENT_BOUNDS;
    }
    parsegraph_ExtentBound* oldBounds = extent->bounds;
    unsigned int oldCap = extent->capacity;
    if(oldCap >= capacity) {
        // TODO This could shrink.
        parsegraph_die("Cannot shrink Extent capacity");
    }
    unsigned int oldNumBounds = extent->numBounds;
    //parsegraph_log("Extent realloc from %d to %d\n", oldCap, capacity);

    // Change the capacity.
    extent->capacity = capacity;
    if(extent->pool) {
        extent->bounds = apr_pcalloc(extent->pool, sizeof(struct parsegraph_ExtentBound) * capacity);
    }
    else {
        extent->bounds = malloc(sizeof(struct parsegraph_ExtentBound) * capacity);
    }
    if(!extent->bounds) {
        parsegraph_die("Failed to allocate extent bounds");
    }

    if(oldBounds) {
        if(extent->start + oldNumBounds > oldCap) {
            unsigned int frontBounds = (extent->start + oldNumBounds) - oldCap;
            memcpy(
                extent->bounds, &oldBounds[extent->start],
                sizeof(struct parsegraph_ExtentBound) * (extent->numBounds - frontBounds)
            );
            memcpy(
                &extent->bounds[extent->numBounds - frontBounds], oldBounds,
                sizeof(struct parsegraph_ExtentBound) * frontBounds
            );
        }
        else {
            // Can do it in a single copy.
            memcpy(
                extent->bounds, &oldBounds[extent->start],
                sizeof(struct parsegraph_ExtentBound) * oldNumBounds
            );
        }

        if(!extent->pool) {
            free(oldBounds);
        }
    }

    extent->start = 0;

    return 0;
}

int parsegraph_Extent_prependLS(parsegraph_Extent* extent, float length, float size)
{
    if(length == 0) {
        // Drop empty lengths.
        return -1;
    }
    // Do not allow negative length values.
    if(length < 0) {
        parsegraph_die("Non-positive bound lengths are not allowed, but %f was given anyway.", length);
    }
    if(isnan(length)) {
        parsegraph_die("Length must not be NaN");
    }

    if(parsegraph_Extent_numBounds(extent) > 0) {
        float frontSize = parsegraph_Extent_boundSizeAt(extent, 0);
        if((isnan(frontSize) && isnan(size)) || (frontSize == size)) {
            // Extent the first bound.
            parsegraph_Extent_setBoundLengthAt(extent, 0,
                parsegraph_Extent_boundLengthAt(extent, 0) + length
            );
            return 0;
        }
    }

    if(parsegraph_Extent_boundCapacity(extent) == parsegraph_Extent_numBounds(extent)) {
        // Completely full, so expand.
        unsigned int newCap = parsegraph_DEFAULT_EXTENT_BOUNDS;
        if(extent->capacity > 0) {
            newCap = 2 * extent->capacity;
        }
        parsegraph_Extent_realloc(extent, newCap);
    }

    if(extent->start == 0) {
        extent->start = extent->capacity - 1;
    }
    else {
        --(extent->start);
    }

    ++(extent->numBounds);
    parsegraph_Extent_setBoundLengthAt(extent, 0, length);
    parsegraph_Extent_setBoundSizeAt(extent, 0, size);

    return 0;
}

int parsegraph_Extent_boundCapacity(parsegraph_Extent* extent)
{
    return extent->capacity;
}

int parsegraph_Extent_appendLS(parsegraph_Extent* extent, float length, float size)
{
    if(isnan(length)) {
        parsegraph_die("Length must not be NaN");
    }
    if(length == 0) {
        // Drop empty lengths.
        //parsegraph_log("Empty length given\n");
        return -1;
    }
    if(length < 0) {
        parsegraph_die("Non-positive bound lengths are not allowed, but %f was given anyway.\n", length);
    }

    if(parsegraph_Extent_numBounds(extent) > 0) {
        float lastSize = parsegraph_Extent_boundSizeAt(extent, parsegraph_Extent_numBounds(extent) - 1);
        if((isnan(lastSize) && isnan(size)) || (lastSize == size)) {
            //parsegraph_log("Extended bound length\n");
            parsegraph_Extent_setBoundLengthAt(extent,
                parsegraph_Extent_numBounds(extent) - 1,
                parsegraph_Extent_boundLengthAt(extent, parsegraph_Extent_numBounds(extent) - 1) + length
            );
            return 0;
        }
    }

    if(parsegraph_Extent_boundCapacity(extent) == parsegraph_Extent_numBounds(extent)) {
        // Completely full, so expand.
        unsigned int newCap = parsegraph_DEFAULT_EXTENT_BOUNDS;
        if(extent->capacity > 0) {
            newCap = 2 * extent->capacity;
        }
        parsegraph_Extent_realloc(extent, newCap);
    }

    //parsegraph_log("Appending bound\n");
    ++(extent->numBounds);
    parsegraph_Extent_setBoundLengthAt(extent, parsegraph_Extent_numBounds(extent)- 1, length);
    parsegraph_Extent_setBoundSizeAt(extent, parsegraph_Extent_numBounds(extent)- 1, size);
    return 0;
}

int parsegraph_Extent_prependSL(parsegraph_Extent* extent, float size, float length)
{
    return parsegraph_Extent_prependLS(extent, length, size);
}

int parsegraph_Extent_appendSL(parsegraph_Extent* extent, float size, float length)
{
    return parsegraph_Extent_appendLS(extent, length, size);
}

void parsegraph_Extent_adjustSize(parsegraph_Extent* extent, float adjustment)
{
    // Adjust the size of each bound.
    for(unsigned int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        float size = parsegraph_Extent_boundSizeAt(extent, i);
        // Ignore empty sizes.
        if(!isnan(size)) {
            parsegraph_Extent_setBoundSizeAt(extent, i, size + adjustment);
        }
    }
}

void parsegraph_Extent_simplify(parsegraph_Extent* extent)
{
    float totalLength = 0;
    float maxSize = NAN;
    for(int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        totalLength += parsegraph_Extent_boundLengthAt(extent, i);

        float size = parsegraph_Extent_boundSizeAt(extent, i);
        if(isnan(maxSize)) {
            maxSize = size;
        }
        else if(!isnan(size)) {
            maxSize = fmaxf(maxSize, size);
        }
    }
    parsegraph_Extent_clear(extent);
    parsegraph_Extent_appendLS(extent, totalLength, maxSize);
}

float parsegraph_Extent_sizeAt(parsegraph_Extent* extent, float offset)
{
    // Do not allow negative offsets.
    if(offset < 0) {
        parsegraph_die("Offset is negative.");
    }

    // Determine the bound at the given offset.
    float pos = 0;
    unsigned int i = 0;
    for(; i < parsegraph_Extent_numBounds(extent); ++i) {
        float thisBoundLength = parsegraph_Extent_boundLengthAt(extent, i);
        if(offset <= pos + thisBoundLength) {
            break;
        }
        pos += thisBoundLength;
    }
    // Return NaN if the offset is beyond the full size of this extent.
    if(i == parsegraph_Extent_numBounds(extent)) {
        return NAN;
    }

    // Return the size at the determined bound.
    return parsegraph_Extent_boundSizeAt(extent, i);
}

void parsegraph_Extent_combineBound(parsegraph_Extent* extent,
    float newBoundStart,
    float newBoundLength,
    float newBoundSize)
{
    // Create the extent to be merged.
    struct parsegraph_Extent* added = parsegraph_Extent_new(extent->pool);
    parsegraph_Extent_appendLS(added, newBoundLength, newBoundSize);

    // Copy the combined result into this extent.
    //parsegraph_log("Calling combinedExtent. %f, %d", NAN, (int)NAN);
    struct parsegraph_Extent* combined = parsegraph_Extent_combinedExtent(extent, added, newBoundStart, NAN, NAN);
    parsegraph_Extent_copyFrom(extent, combined);
    parsegraph_Extent_destroy(combined);
    parsegraph_Extent_destroy(added);
}

void parsegraph_Extent_copyFrom(parsegraph_Extent* extent, parsegraph_Extent* from)
{
    if(!extent->pool) {
        free(extent->bounds);
    }
    extent->pool = from->pool;
    extent->start = from->start;
    extent->capacity = from->capacity;
    extent->bounds = from->bounds;
    extent->numBounds = from->numBounds;
    if(from->_hasBoundingValues) {
        extent->_hasBoundingValues = 1;
        extent->_minSize = from->_minSize;
        extent->_maxSize = from->_maxSize;
        extent->_totalLength = from->_totalLength;
    }
    else {
        parsegraph_Extent_invalidateBoundingValues(extent);
    }

    from->bounds = 0;
    from->start = 0;
    from->numBounds = 0;
    from->capacity = 0;
}

void parsegraph_Extent_combineExtentAndSimplify(parsegraph_Extent* extent,
    parsegraph_Extent* given,
    float lengthAdjustment,
    float sizeAdjustment,
    float scale)
{
    float givenLength, givenMaxSize, thisLength, thisMaxSize;
    parsegraph_Extent_boundingValues(given, &givenLength, 0, &givenMaxSize);
    parsegraph_Extent_boundingValues(extent, &thisLength, 0, &thisMaxSize);
    parsegraph_Extent_clear(extent);
    float combinedLength;
    if(lengthAdjustment < 0) {
        combinedLength = parsegraph_max(thisLength-lengthAdjustment, givenLength*scale);
    }
    else {
        combinedLength = parsegraph_max(thisLength, givenLength*scale+lengthAdjustment);
    }
    parsegraph_Extent_appendLS(extent, combinedLength, parsegraph_max(thisMaxSize, givenMaxSize*scale+sizeAdjustment);
}

void parsegraph_Extent_combineExtent(parsegraph_Extent* extent,
    parsegraph_Extent* given,
    float lengthAdjustment,
    float sizeAdjustment,
    float scale)
{
    // Combine the extent into this one, creating a new extent in the process.
    parsegraph_Extent* result = parsegraph_Extent_combinedExtent(extent, given, lengthAdjustment, sizeAdjustment, scale);

    // Copy the combined result into this extent.
    parsegraph_Extent_copyFrom(extent, result);
}

parsegraph_Extent* parsegraph_Extent_combinedExtent(parsegraph_Extent* extent, parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale)
{
    //parsegraph_logEntercf("Extent combines", "Combining extent");
    if(isnan(lengthAdjustment)) {
        lengthAdjustment = 0;
    }
    if(isnan(sizeAdjustment)) {
        sizeAdjustment = 0;
    }
    if(isnan(scale)) {
        scale = 1.0;
    }
    if(lengthAdjustment < 0) {
        parsegraph_Extent* result = parsegraph_Extent_combinedExtent(given,
            extent,
            -lengthAdjustment/scale,
            -sizeAdjustment/scale,
            1/scale
        );
        parsegraph_Extent_scale(result, scale);
        parsegraph_Extent_adjustSize(result, sizeAdjustment);
        return result;
    }
    else if(lengthAdjustment > 0) {
        // We have a length adjustment.
        struct parsegraph_Extent* givenCopy = parsegraph_Extent_clone(given);
        parsegraph_Extent_prependLS(givenCopy, lengthAdjustment/scale, NAN);
        //parsegraph_log(stderr, "Creating copy for %f, %f", lengthAdjustment, scale);
        //parsegraph_Extent_dump(givenCopy, "Copied extent");
        struct parsegraph_Extent* result = parsegraph_Extent_combinedExtent(extent,
            givenCopy,
            0,
            sizeAdjustment,
            scale
        );
        parsegraph_Extent_destroy(givenCopy);
        //parsegraph_logLeave();
        return result;
    }

    unsigned int thisBound = 0;
    float thisPosition = 0;
    unsigned int givenBound = 0;
    float givenPosition = 0;

    // Create the aggregate result.
    parsegraph_Extent* result = parsegraph_Extent_new(extent->pool);

    // Iterate over each bound.
    while(givenBound != parsegraph_Extent_numBounds(given) && thisBound != parsegraph_Extent_numBounds(extent)) {
        float thisSize = parsegraph_Extent_boundSizeAt(extent, thisBound);
        float givenSize = scale * parsegraph_Extent_boundSizeAt(given, givenBound) + sizeAdjustment;

        float newSize;
        if(!isnan(thisSize) && !isnan(givenSize)) {
            newSize = fmaxf(thisSize, givenSize);
        }
        else if(!isnan(thisSize)) {
            newSize = thisSize;
        }
        else {
            newSize = givenSize;
        }

        float thisReach;
        if(thisBound == parsegraph_Extent_numBounds(extent)) {
            thisReach = thisPosition;
        }
        else {
            thisReach = thisPosition + parsegraph_Extent_boundLengthAt(extent, thisBound);
        }

        float givenReach;
        if(givenBound >= parsegraph_Extent_numBounds(given)) {
            givenReach = givenPosition;
        }
        else {
            givenReach = givenPosition + scale * parsegraph_Extent_boundLengthAt(given, givenBound);
        }

        //parsegraph_log("Iterating over each bound.\n");
        //parsegraph_log("This reach: %f, size: %f, pos: %f\n", thisReach, thisSize, thisPosition);
        //parsegraph_log("Given reach: %f, size: %f, pos: %f\n", givenReach, givenSize, givenPosition);

        parsegraph_Extent_appendLS(result,
            fminf(thisReach, givenReach) - fmaxf(thisPosition, givenPosition),
            newSize
        );

        if(thisReach == givenReach) {
            // This bound ends at the same position as given's
            // bound, so increment both iterators.
            //parsegraph_log("Incrementing both iterators");
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
            givenPosition += scale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
        }
        else if(thisReach < givenReach) {
            // This bound ends before given's bound, so increment
            // this bound's iterator.
            //parsegraph_log("Incrementing this bound's iterators");
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
        }
        else {
            // Assert: thisReach() > givenReach()
            // Given's bound ends before this bound, so increment
            // given's iterator.
            //parsegraph_log("Incrementing given bound's iterators");
            givenPosition += scale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
        }
    }

    float thisReach;
    if(thisBound == parsegraph_Extent_numBounds(extent)) {
        thisReach = thisPosition;
    }
    else {
        thisReach = thisPosition + parsegraph_Extent_boundLengthAt(extent, thisBound);
    }

    float givenReach;
    if(givenBound >= parsegraph_Extent_numBounds(given)) {
        givenReach = givenPosition;
    }
    else {
        givenReach = givenPosition + scale * parsegraph_Extent_boundLengthAt(given, givenBound);
    }

    if(givenBound != parsegraph_Extent_numBounds(given)) {
        // Finish off given last overlapping bound to get completely
        // in sync with givens.
        //parsegraph_log("Given bound still has reach\n");
        parsegraph_Extent_appendLS(result,
            givenReach - thisReach,
            scale * parsegraph_Extent_boundSizeAt(given, givenBound) + sizeAdjustment
        );
        while(1) {
            givenPosition += scale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
            if(givenBound == parsegraph_Extent_numBounds(given)) {
                break;
            }
            parsegraph_Extent_appendLS(result,
                scale * parsegraph_Extent_boundLengthAt(given, givenBound),
                scale * parsegraph_Extent_boundSizeAt(given, givenBound) + sizeAdjustment
            );
        }
    }
    else if(thisBound != parsegraph_Extent_numBounds(extent)) {
        // Finish off this extent's last overlapping bound to get completely
        // in sync with given's iterator.
        //parsegraph_log("This bound still has reach\n");
        parsegraph_Extent_appendLS(result,
            thisReach - givenReach,
            parsegraph_Extent_boundSizeAt(extent, thisBound)
        );
        while(1) {
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
            if(thisBound == parsegraph_Extent_numBounds(extent)) {
                break;
            }
            parsegraph_Extent_appendLS(result,
                parsegraph_Extent_boundLengthAt(extent, thisBound),
                parsegraph_Extent_boundSizeAt(extent, thisBound)
            );
        }
    }

    //parsegraph_Extent_dump(result, "Result");
    //parsegraph_logLeave();

    return result;
}

void parsegraph_Extent_scale(parsegraph_Extent* extent, float factor)
{
    for(unsigned int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        float length = parsegraph_Extent_boundLengthAt(extent, i);
        float size = parsegraph_Extent_boundSizeAt(extent, i);
        parsegraph_Extent_setBoundLengthAt(extent, i, length * factor);
        if(!isnan(parsegraph_Extent_boundSizeAt(extent, i))) {
            parsegraph_Extent_setBoundSizeAt(extent, i, size * factor);
        }
    }
};

float parsegraph_Extent_separation(parsegraph_Extent* extent,
    struct parsegraph_Extent* given,
    float positionAdjustment,
    int allowAxisOverlap,
    float givenScale,
    float axisMinimum)
{
    if(isnan(positionAdjustment)) {
        positionAdjustment = 0;
    }
    //if(allowAxisOverlap === undefined) {
        //allowAxisOverlap = true;
    //}
    if(isnan(axisMinimum)) {
        axisMinimum = 0;
    }
    if(isnan(givenScale)) {
        givenScale = 1.0;
    }
    //parsegraph_log("Separation(positionAdjustment=%f)\n", positionAdjustment);

    unsigned int thisBound = 0;
    unsigned int givenBound = 0;

    float thisPosition = 0;

    // The position of given. This is in this node's space.
    float givenPosition = 0;

    // extentSeparation is the minimum distance to separate this extent
    // from the given extent, so that they do not overlap if facing one
    // another.
    float extentSeparation = 0;


    // Adjust this extent's iterator to account for the position adjustment.
    if(positionAdjustment < 0) {
        while(
            givenBound != parsegraph_Extent_numBounds(given)
            && givenPosition + (givenScale * parsegraph_Extent_boundLengthAt(given, givenBound)) <= -positionAdjustment
        ) {
            // If we don't allow axis overlap, then be sure to include these bounds
            // that are being skipped.
            float boundSeparation = parsegraph_Extent_boundSizeAt(given, givenBound) * givenScale;
            if(
                !allowAxisOverlap
                && !isnan(boundSeparation)
                && boundSeparation > extentSeparation
            ) {
                extentSeparation = boundSeparation + axisMinimum;
            }
            givenPosition += givenScale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
        }
    }
    else {
        // Positive position adjustment.
        while(
            thisBound != parsegraph_Extent_numBounds(extent)
            && thisPosition + parsegraph_Extent_boundLengthAt(extent, thisBound) <= positionAdjustment
        ) {
            float boundSeparation = parsegraph_Extent_boundSizeAt(extent, thisBound);
            if(
                !allowAxisOverlap
                && !isnan(boundSeparation)
                && boundSeparation > extentSeparation
            ) {
                extentSeparation = boundSeparation;
            }
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
        }
    }

    // While the iterators still have bounds in both extents.
    while(givenBound != parsegraph_Extent_numBounds(given) && thisBound != parsegraph_Extent_numBounds(extent)) {
        // Calculate the separation between these bounds.
        //parsegraph_log("Separating\n");
        //parsegraph_log("This bound size: %f\n", parsegraph_Extent_boundSizeAt(extent, thisBound));
        //parsegraph_log("Given bound size: %f\n", givenScale * parsegraph_Extent_boundSizeAt(given, givenBound));
        float thisSize = parsegraph_Extent_boundSizeAt(extent, thisBound);
        float givenSize = givenScale * parsegraph_Extent_boundSizeAt(given, givenBound);
        float boundSeparation;
        if(!isnan(thisSize) && !isnan(givenSize)) {
             boundSeparation = thisSize + givenSize;
        }
        else if(!allowAxisOverlap) {
            if(!isnan(thisSize)) {
                boundSeparation = thisSize + axisMinimum;
            }
            else if(!isnan(givenSize)) {
                boundSeparation = givenSize + axisMinimum;
            }
            else {
                // Both extents are empty at this location.
                boundSeparation = 0;
            }
        }
        else {
            // Axis overlap is allowed.
            boundSeparation = 0;
        }
        if(boundSeparation > extentSeparation) {
            extentSeparation = boundSeparation;
            //parsegraph_log("Found new separation of %f.\n", extentSeparation);
        }

        // Increment the iterators to the next testing point.

        // endComparison is a difference that indicates which bound
        // ends soonest.
        float endComparison =
            (thisPosition + parsegraph_Extent_boundLengthAt(extent, thisBound) - positionAdjustment)
            - (givenPosition + givenScale * parsegraph_Extent_boundLengthAt(given, givenBound));

        if(endComparison == 0) {
            // This bound ends at the same position as given's bound,
            // so increment both.

            givenPosition += givenScale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
        }
        else if(endComparison > 0) {
            // This bound ends after given's bound, so increment the
            // given bound's iterator.
            givenPosition += givenScale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
        }
        if(endComparison < 0) {
            // Given's bound ends after this bound, so increment this
            // bound's iterator.
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
        }
    }

    if(!allowAxisOverlap) {
        // Calculate the separation between the remaining bounds of given and
        // the separation boundary.
        //var startTime = parsegraph_getTimeInMillis();
        while(givenBound != parsegraph_Extent_numBounds(given)) {
            //if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
                //throw new Error("Extent separation timed out");
            //}

            float givenSize = parsegraph_Extent_boundSizeAt(given, givenBound);
            if(!isnan(givenSize)) {
                extentSeparation = fmaxf(extentSeparation, givenScale * givenSize + axisMinimum);
            }
            ++givenBound;
        }
    }

    return extentSeparation;
}

void parsegraph_Extent_boundingValues(parsegraph_Extent* extent, float* totalLength, float* minSize, float* maxSize)
{
    if(!extent->_hasBoundingValues) {
        extent->_hasBoundingValues = 1;
        extent->_totalLength = 0;
        extent->_minSize = NAN;
        extent->_maxSize = NAN;

        for(unsigned int iter = 0; iter != parsegraph_Extent_numBounds(extent); ++iter) {
            extent->_totalLength = extent->_totalLength + parsegraph_Extent_boundLengthAt(extent, iter);
            float size = parsegraph_Extent_boundSizeAt(extent, iter);
            if(isnan(extent->_minSize)) {
                extent->_minSize = size;
            }
            else if(!isnan(size)) {
                extent->_minSize = fminf(extent->_minSize, size);
            }

            if(isnan(extent->_maxSize)) {
                extent->_maxSize = size;
            }
            else if(!isnan(size)) {
                extent->_maxSize = fmaxf(extent->_maxSize, size);
            }
        }
    }
    if(totalLength) {
        *totalLength = extent->_totalLength;
    }
    if(minSize) {
        *minSize = extent->_minSize;
    }
    if(maxSize) {
        *maxSize = extent->_maxSize;
    }
}

int parsegraph_Extent_equals(parsegraph_Extent* extent, struct parsegraph_Extent* other)
{
    // Exit quickly if we are comparing with ourselves.
    if(extent == other) {
        return 1;
    }

    // Ensure the sizes match.
    if(!other || parsegraph_Extent_numBounds(extent) != parsegraph_Extent_numBounds(other)) {
        return 0;
    }

    // Compare the bounds for equality.
    for(unsigned int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        if(parsegraph_Extent_boundLengthAt(extent, i) != parsegraph_Extent_boundLengthAt(other, i)) {
            return 0;
        }
        float thisSize = parsegraph_Extent_boundSizeAt(extent, i);
        float otherSize = parsegraph_Extent_boundSizeAt(other, i);
        if(isnan(thisSize) && isnan(otherSize)) {
            // Both NaN.
            continue;
        }
        // Fail if one is NaN and the other is not.
        if(isnan(thisSize) || isnan(otherSize)) {
            return 0;
        }
        if(parsegraph_Extent_boundSizeAt(extent, i) != parsegraph_Extent_boundSizeAt(other, i)) {
            return 0;
        }
    }
    return 1;
}

void parsegraph_Extent_dump(parsegraph_Extent* extent, const char* title, ...)
{
    if(title) {
        va_list ap;
        va_start(ap, title);
        char buf[1024];
        vsnprintf(buf, 1024, title, ap);
        va_end(ap);
        parsegraph_logEnterf(buf);
    }
    float offset = 0;
    for(unsigned int i = 0; i < parsegraph_Extent_numBounds(extent); ++i) {
        parsegraph_log("%f: [length=%f, size=%f]\n",
            offset,
            parsegraph_Extent_boundLengthAt(extent, i),
            parsegraph_Extent_boundSizeAt(extent, i)
        );
        offset += parsegraph_Extent_boundLengthAt(extent, i);
    }
    if(title) {
        parsegraph_logLeave();
    }
}

void parsegraph_Extent_destroy(parsegraph_Extent* extent)
{
    parsegraph_Extent_clear(extent);
    if(!extent->pool) {
        free(extent->bounds);
        free(extent);
    }
}
