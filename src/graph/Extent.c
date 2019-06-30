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
    extent->start = 0;
    extent->pool = pool;
    extent->numBounds = 0;
    extent->capacity = 0;
    extent->bounds = 0;
    return extent;
}

/**
 * Iterates over the extent, calling the given function for each
 * bound.
 *
 * Example:
 * extent.forEach(function(length, size, i) {}, this);
 */
void parsegraph_Extent_forEach(struct parsegraph_Extent* extent, void(*func)(void*, float, float, int), void* thisArg)
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

struct parsegraph_Extent* parsegraph_Extent_clone(struct parsegraph_Extent* orig)
{
    struct parsegraph_Extent* clone;
    if(orig->pool) {
        clone = apr_pcalloc(orig->pool, sizeof(*clone));
    }
    else {
        clone = malloc(sizeof(*clone));
    }
    clone->start = orig->start;
    clone->pool = orig->pool;
    clone->numBounds = parsegraph_Extent_numBounds(orig);
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
    return clone;
}

void parsegraph_Extent_clear(struct parsegraph_Extent* extent)
{
    extent->start = 0;
    extent->numBounds = 0;
}

unsigned int parsegraph_Extent_numBounds(parsegraph_Extent* extent)
{
    return extent->numBounds;
}

int parsegraph_Extent_hasBounds(struct parsegraph_Extent* extent)
{
    return parsegraph_Extent_numBounds(extent) > 0;
}

int parsegraph_Extent_boundCapacity(struct parsegraph_Extent* extent)
{
    return extent->capacity;
}

int parsegraph_Extent_realloc(struct parsegraph_Extent* extent, unsigned int capacity)
{
    if(capacity < parsegraph_DEFAULT_EXTENT_BOUNDS) {
        capacity  = parsegraph_DEFAULT_EXTENT_BOUNDS;
    }
    struct parsegraph_ExtentBound* oldBounds = extent->bounds;
    unsigned int oldCap = extent->capacity;
    if(oldCap >= capacity) {
        // TODO This could shrink.
        return -1;
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
        return -1;
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

int parsegraph_Extent_prependLS(struct parsegraph_Extent* extent, float length, float size)
{
    if(length == 0) {
        // Drop empty lengths.
        return -1;
    }
    // Do not allow negative length values.
    if(length < 0) {
        //fprintf(stderr, "Non-positive bound lengths are not allowed, but %f was given anyway.", length);
        return -1;
    }

    if(parsegraph_Extent_numBounds(extent) > 0) {
        float frontSize = parsegraph_Extent_boundSizeAt(extent, 0);
        if(
            (isnan(frontSize) && isnan(size)) || (frontSize == size)
        ) {
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

float parsegraph_Extent_sizeAt(struct parsegraph_Extent* extent, float offset)
{
    // Do not allow negative offsets.
    if(offset < 0) {
        //fprintf(stderr, "Offset is negative.");
        return NAN;
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

int parsegraph_Extent_appendLS(struct parsegraph_Extent* extent, float length, float size)
{
    if(length == 0) {
        // Drop empty lengths.
        parsegraph_log("Empty length given\n");
        return -1;
    }
    if(length < 0) {
        parsegraph_log("Non-positive bound lengths are not allowed, but %f was given anyway.\n", length);
        return -1;
    }

    if(parsegraph_Extent_numBounds(extent) > 0) {
        float lastSize = parsegraph_Extent_boundSizeAt(extent, parsegraph_Extent_numBounds(extent) - 1);
        if(
            (NAN == lastSize && NAN == size) || (lastSize == size)
        ) {
            parsegraph_log("Extended bound length\n");
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

    parsegraph_log("Appending bound\n");
    ++(extent->numBounds);
    parsegraph_Extent_setBoundLengthAt(extent, parsegraph_Extent_numBounds(extent)- 1, length);
    parsegraph_Extent_setBoundSizeAt(extent, parsegraph_Extent_numBounds(extent)- 1, size);
    return 0;
}

float parsegraph_Extent_boundLengthAt(struct parsegraph_Extent* extent, unsigned int index)
{
    return extent->capacity > 0 ? extent->bounds[(extent->start + index) % extent->capacity].length : NAN;
}

float parsegraph_Extent_boundSizeAt(struct parsegraph_Extent* extent, unsigned int index)
{
    return extent->capacity > 0 ? extent->bounds[(extent->start + index) % extent->capacity].size : NAN;
}

void parsegraph_Extent_setBoundLengthAt(struct parsegraph_Extent* extent, unsigned int index, float length)
{
    if(extent->capacity == 0) {
        parsegraph_die("Cannot set a bound length of an empty Extent.");
    }
    //parsegraph_log("(start=%d)+(index=%d) %% (capacity=%d) = (length=%f)\n", extent->start, index, extent->capacity, length);
    extent->bounds[(extent->start + index) % extent->capacity].length = length;
}

void parsegraph_Extent_setBoundSizeAt(struct parsegraph_Extent* extent, unsigned int index, float size)
{
    if(extent->capacity == 0) {
        parsegraph_die("Cannot set a bound length of an empty Extent.");
    }
    //parsegraph_log("(start=%d)+(index=%d) %% (capacity=%d) = (size=%f)\n", extent->start, index, extent->capacity, size);
    extent->bounds[(extent->start + index) % extent->capacity].size = size;
}

void parsegraph_Extent_combineBound(struct parsegraph_Extent* extent,
    float newBoundStart,
    float newBoundLength,
    float newBoundSize)
{
    // Create the extent to be merged.
    struct parsegraph_Extent* added = parsegraph_Extent_new(extent->pool);
    parsegraph_Extent_appendLS(added, newBoundLength, newBoundSize);

    // Copy the combined result into this extent.
    //fprintf(stderr, "Calling combinedExtent. %f, %d", NAN, (int)NAN);
    struct parsegraph_Extent* combined = parsegraph_Extent_combinedExtent(extent, added, newBoundStart, NAN, NAN);
    parsegraph_Extent_copyFrom(extent, combined);
    parsegraph_Extent_destroy(combined);

    parsegraph_Extent_destroy(added);
}

/**
 * Moves the given extent into this extent.
 */
void parsegraph_Extent_copyFrom(struct parsegraph_Extent* extent, struct parsegraph_Extent* from)
{
    if(!extent->pool) {
        free(extent->bounds);
    }
    extent->pool = from->pool;
    extent->start = from->start;
    extent->capacity = from->capacity;
    extent->bounds = from->bounds;
    extent->numBounds = from->numBounds;

    from->bounds = 0;
    from->start = 0;
    from->numBounds = 0;
    from->capacity = 0;
};

void parsegraph_Extent_combineExtent(struct parsegraph_Extent* extent,
    struct parsegraph_Extent* given,
    float lengthAdjustment,
    float sizeAdjustment,
    float scale)
{
    // Combine the extent into this one, creating a new extent in the process.
    struct parsegraph_Extent* result = parsegraph_Extent_combinedExtent(extent, given, lengthAdjustment, sizeAdjustment, scale);

    // Copy the combined result into this extent.
    parsegraph_Extent_copyFrom(extent, result);
}

struct parsegraph_Extent* parsegraph_Extent_combinedExtent(struct parsegraph_Extent* extent, struct parsegraph_Extent* given, float lengthAdjustment, float sizeAdjustment, float scale)
{
    parsegraph_logEntercf("Extent combines", "Combining extent");
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
        struct parsegraph_Extent* result = parsegraph_Extent_combinedExtent(given,
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
        parsegraph_logLeave();
        return result;
    }

    unsigned int thisBound = 0;
    float thisPosition = 0;
    unsigned int givenBound = 0;
    float givenPosition = 0;

    // Create the aggregate result.
    struct parsegraph_Extent* result = parsegraph_Extent_new(extent->pool);

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

        parsegraph_log("Iterating over each bound.\n");
        parsegraph_log("This reach: %f, size: %f, pos: %f\n", thisReach, thisSize, thisPosition);
        parsegraph_log("Given reach: %f, size: %f, pos: %f\n", givenReach, givenSize, givenPosition);

        parsegraph_Extent_appendLS(result,
            fminf(thisReach, givenReach) - fmaxf(thisPosition, givenPosition),
            newSize
        );

        if(thisReach == givenReach) {
            // This bound ends at the same position as given's
            // bound, so increment both iterators.
            parsegraph_log("Incrementing both iterators");
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
            givenPosition += scale * parsegraph_Extent_boundLengthAt(given, givenBound);
            ++givenBound;
        }
        else if(thisReach < givenReach) {
            // This bound ends before given's bound, so increment
            // this bound's iterator.
            parsegraph_log("Incrementing this bound's iterators");
            thisPosition += parsegraph_Extent_boundLengthAt(extent, thisBound);
            ++thisBound;
        }
        else {
            // Assert: thisReach() > givenReach()
            // Given's bound ends before this bound, so increment
            // given's iterator.
            parsegraph_log("Incrementing given bound's iterators");
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
        parsegraph_log("Given bound still has reach\n");
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
        parsegraph_log("This bound still has reach\n");
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

    parsegraph_Extent_dump(result, "Result");
    parsegraph_logLeave();

    return result;
}

void parsegraph_Extent_scale(struct parsegraph_Extent* extent, float factor)
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

void parsegraph_Extent_destroy(struct parsegraph_Extent* extent)
{
    parsegraph_Extent_clear(extent);
    if(!extent->pool) {
        free(extent->bounds);
        free(extent);
    }
}

void parsegraph_Extent_dump(struct parsegraph_Extent* extent, const char* title, ...)
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

void parsegraph_Extent_adjustSize(struct parsegraph_Extent* extent, float adjustment)
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

void parsegraph_Extent_simplify(struct parsegraph_Extent* extent)
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

float parsegraph_Extent_separation(struct parsegraph_Extent* extent,
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
    //fprintf(stderr, "Separation(positionAdjustment=%f)\n", positionAdjustment);

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
        // Positive positionAdjustment.
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
        //fprintf(stderr, "Separating\n");
        //fprintf(stderr, "This bound size: %f\n", parsegraph_Extent_boundSizeAt(extent, thisBound));
        //fprintf(stderr, "Given bound size: %f\n", givenScale * parsegraph_Extent_boundSizeAt(given, givenBound));
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
            //fprintf(stderr, "Found new separation of %f.\n", extentSeparation);
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

void parsegraph_Extent_boundingValues(struct parsegraph_Extent* extent, float* totalLength, float* minSize, float* maxSize)
{
    if(totalLength) {
        *totalLength = 0;
    }
    if(minSize) {
        *minSize = NAN;
    }
    if(maxSize) {
        *maxSize = NAN;
    }

    for(unsigned int iter = 0; iter != parsegraph_Extent_numBounds(extent); ++iter) {
        if(totalLength) {
            *totalLength = (*totalLength + parsegraph_Extent_boundLengthAt(extent, iter));
        }
        float size = parsegraph_Extent_boundSizeAt(extent, iter);
        if(minSize) {
            if(isnan(*minSize)) {
                *minSize = size;
            }
            else if(!isnan(size)) {
                *minSize = fminf(*minSize, size);
            }
        }

        if(maxSize) {
            if(isnan(*maxSize)) {
                *maxSize = size;
            }
            else if(!isnan(size)) {
                *maxSize = fmaxf(*maxSize, size);
            }
        }
    }
}

int parsegraph_Extent_equals(struct parsegraph_Extent* extent, struct parsegraph_Extent* other)
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
