parsegraph_DEFAULT_EXTENT_BOUNDS = 1;

// The number of components per extent bound.
parsegraph_NUM_EXTENT_BOUND_COMPONENTS = 2;

/**
 * Represents a list of bounds. Each bound is comprised of a length
 * and a size. The extent always extends in the positive direction.
 *
 * An extent is used to represent each forward, backward, upward, and downward
 * side of a graph. The four extents represent the combine bounding picture of
 * the graph.
 */
function parsegraph_Extent(copy)
{
    if(copy !== undefined) {
        // Copy another extent's array
        this._numBounds = copy._numBounds;
        this._bounds = new Float32Array(copy._bounds);
    }
    else {
        // Create a new, empty bounds array.
        this._numBounds = 0;
        this._bounds = new Float32Array(
            parsegraph_DEFAULT_EXTENT_BOUNDS *
            parsegraph_NUM_EXTENT_BOUND_COMPONENTS
        );
    }
}

/**
 * Iterates over the extent, calling the given function for each
 * bound.
 *
 * Example:
 * extent.forEach(function(length, size, i) {}, this);
 */
parsegraph_Extent.prototype.forEach = function(func, thisArg) {
    for(var i = 0; i < this._numBounds; ++i) {
        func.call(
            thisArg,
            this.boundLengthAt(i),
            this.boundSizeAt(i),
            i
        );
    }
};

parsegraph_Extent.prototype.clone = function() {
    return new parsegraph_Extent(this);
};

parsegraph_Extent.prototype.clear = function() {
    this._numBounds = 0;
};

/**
 * Returns the number of bounds in this extent.
 */
parsegraph_Extent.prototype.numBounds = function() {
    return this._numBounds;
};

parsegraph_Extent.prototype.hasBounds = function() {
    return this.numBounds() == 0;
};

parsegraph_Extent.prototype.boundLengthAt = function(index) {
    return this._bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index];
};

parsegraph_Extent.prototype.boundSizeAt = function(index) {
    return this._bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index + 1];
};

parsegraph_Extent.prototype.setBoundLengthAt = function(index, length) {
    this._bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index] = length;
};

parsegraph_Extent.prototype.setBoundSizeAt = function(index, size) {
    this._bounds[parsegraph_NUM_EXTENT_BOUND_COMPONENTS * index + 1] = size;
};

parsegraph_Extent.prototype.prependLS = function(length, size) {
    if(length == 0) {
        // Drop empty lengths.
        return;
    }
    // Do not allow negative length values.
    if(length < 0) {
        var str = "Non-positive bound lengths are not allowed, but "
            + length
            + " was given anyway.";
        throw new Error(str);
    }

    // Add a single entry at the front.
    var oldBounds = this._bounds;
    this._bounds = new Float32Array(
        this._bounds.length + 1 * parsegraph_NUM_EXTENT_BOUND_COMPONENTS
    );
    this._bounds.set(oldBounds, 1 * parsegraph_NUM_EXTENT_BOUND_COMPONENTS);

    ++(this._numBounds);
    this.setBoundLengthAt(0, length);
    this.setBoundSizeAt(0, size);
}

parsegraph_Extent.prototype.boundCapacity = function()
{
    return this._bounds.length / parsegraph_NUM_EXTENT_BOUND_COMPONENTS;
};

parsegraph_Extent.prototype.appendLS = function(length, size)
{
    if(length === 0) {
        // Drop empty lengths.
        return;
    }
    if(length < 0) {
        var str;
        str = "Non-positive bound lengths are not allowed, but "
            + length
            + " was given anyway.";
        throw new Error(str);
    }

    if(this.numBounds() > 0) {
        var lastSize = this.boundSizeAt(this.numBounds() - 1);
        if(
            (isNaN(lastSize) && isNaN(size)) || (lastSize === size)
        ) {
            this.setBoundLengthAt(this.numBounds() - 1,
                this.boundLengthAt(this.numBounds() - 1) + length
            );
            return;
        }
    }

    if(this.boundCapacity() == this.numBounds()) {
        // Completely full, so expand.
        var oldBounds = this._bounds;
        this._bounds = new Float32Array(this._bounds.length * 2);
        this._bounds.set(oldBounds);
    }

    ++(this._numBounds);
    this.setBoundLengthAt(this.numBounds() - 1, length);
    this.setBoundSizeAt(this.numBounds() - 1, size);
}

parsegraph_Extent.prototype.prependSL = function(size, length)
{
    this.prependLS(length, size);
}

parsegraph_Extent.prototype.appendSL = function(size, length)
{
    this.appendLS(length, size);
}

parsegraph_Extent.prototype.adjustSize = function(adjustment)
{
    // Adjust the size of each bound.
    for(var i = 0; i < this.numBounds(); ++i) {
        var size = this.boundSizeAt(i);
        // Ignore empty sizes.
        if(!isNaN(size)) {
            this.setBoundSizeAt(i, size + adjustment);
        }
    }
}

parsegraph_Extent.prototype.simplify = function()
{
    var totalLength = 0;
    var maxSize = NaN;
    for(var i = 0; i < this.numBounds(); ++i) {
        totalLength += this.boundLengthAt(i);

        var size = this.boundSizeAt(i);
        if(isNaN(maxSize)) {
            maxSize = size;
        }
        else if(!isNaN(size)) {
            maxSize = Math.max(maxSize, size);
        }
    }
    this.clear();
    this.appendLS(totalLength, maxSize);
};

parsegraph_Extent.prototype.sizeAt = function(offset)
{
    // Do not allow negative offsets.
    if(offset < 0) {
        throw parsegraph_createException(parsegraph_OFFSET_IS_NEGATIVE);
    }

    // Determine the bound at the given offset.
    var pos = 0;
    for(var i = 0; i < this.numBounds(); ++i) {
        var thisBoundLength = this.boundLengthAt(i);
        if(offset <= pos + thisBoundLength) {
            break;
        }
        pos += thisBoundLength;
    }
    // Return NaN if the offset is beyond the full size of this extent.
    if(i == this.numBounds()) {
        return NaN;
    }

    // Return the size at the determined bound.
    return this.boundSizeAt(i);
}

parsegraph_Extent.prototype.combineBound = function(
    newBoundStart,
    newBoundLength,
    newBoundSize)
{
    // Create the extent to be merged.
    var added = new parsegraph_Extent();
    added.appendLS(newBoundLength, newBoundSize);

    // Copy the combined result into this extent.
    this.copyFrom(this.combinedExtent(added, newBoundStart));
}

parsegraph_Extent.prototype.copyFrom = function(from)
{
    this._numBounds = from._numBounds;
    this._bounds = from._bounds;
    from.clear();
};

parsegraph_Extent.prototype.combineExtent = function(
    given,
    lengthAdjustment,
    sizeAdjustment,
    scale)
{
    // Combine the extent into this one, creating a new extent in the process.
    var result = this.combinedExtent(given, lengthAdjustment, sizeAdjustment, scale);

    // Copy the combined result into this extent.
    this.copyFrom(result);
}

parsegraph_Extent.prototype.combinedExtent = function(
    given,
    lengthAdjustment,
    sizeAdjustment,
    scale)
{
    if(lengthAdjustment === undefined) {
        lengthAdjustment = 0;
    }
    if(sizeAdjustment === undefined) {
        sizeAdjustment = 0;
    }
    if(scale === undefined) {
        scale = 1.0;
    }
    if(lengthAdjustment < 0) {
        var result = given.combinedExtent(
            this,
            -lengthAdjustment/scale,
            -sizeAdjustment/scale,
            1/scale
        );
        result.scale(scale);
        result.adjustSize(
            sizeAdjustment
        );
        return result;
    }
    else if(lengthAdjustment > 0) {
        // We have a length adjustment.
        var givenCopy = given.clone();
        givenCopy.prependLS(
            lengthAdjustment/scale,
            NaN
        );
        return this.combinedExtent(
            givenCopy,
            0,
            sizeAdjustment,
            scale
        );
    }

    var thisBound = 0;
    var thisPosition = 0;
    var givenBound = 0;
    var givenPosition = 0;

    // Returns this bound's size
    var getThisSize = function() {
        if(thisBound >= this.numBounds()) {
            throw new Error("Getting this bound's size past the " +
                "end of this extent.");
        }
        return this.boundSizeAt(thisBound);
    };

    // Returns given's bound's size
    var getGivenSize = function() {
        if(givenBound >= given.numBounds()) {
            throw new Error("Getting given's size past the end of " +
                "given's extent.");
        }
        var rv = given.boundSizeAt(givenBound);
        if(isNaN(rv)) {
            return NaN;
        }
        return scale * rv + sizeAdjustment;
    };

    // Moves to this extent's next bound. true is returned as long as
    // thisBound is valid.
    var getThisNextBound = function() {
        if(thisBound >= this.numBounds()) {
            throw new Error("Getting past end of this extent.");
        }
        thisPosition += this.boundLengthAt(thisBound);
        ++thisBound;
        return thisBound != this.numBounds();
    };

    // Increments given's iterator. true is returned as long as givenBound
    // is valid.
    var getGivenNextBound = function() {
        if(givenBound >= given.numBounds()) {
            throw new Error("Getting past end of given bound.");
        }
        givenPosition += scale * given.boundLengthAt(givenBound);
        ++givenBound;
        return givenBound != given.numBounds();
    };

    var givenReach = function() {
        if(givenBound >= given.numBounds()) {
            return givenPosition;
        }
        return givenPosition + scale * given.boundLengthAt(givenBound);
    };

    var thisReach = function() {
        if(thisBound == this.numBounds()) {
            return thisPosition;
        }
        return thisPosition + this.boundLengthAt(thisBound);
    };

    // Create the aggregate result.
    var result = new parsegraph_Extent();

    // Iterate over each bound.
    var combinedIteration = 0;
    while(givenBound != given.numBounds() && thisBound != this.numBounds()) {
        //console.log("Iterating over each bound.");
        //console.log("This reach: " + thisReach.call(this) + ", size: " + getThisSize.call(this) + ", pos: " + thisPosition);
        //console.log("Given reach: " + givenReach.call(this) + ", size: " + getGivenSize.call(this) + ", pos: " + givenPosition);
        ++combinedIteration;
        var thisSize = getThisSize.call(this);
        var givenSize = getGivenSize.call(this);

        var newSize;
        if(!isNaN(thisSize) && !isNaN(givenSize)) {
            newSize = Math.max(thisSize, givenSize);
        }
        else if(!isNaN(thisSize)) {
            newSize = thisSize;
        }
        else if(!isNaN(givenSize)) {
            newSize = givenSize;
        }
        else {
            newSize = NaN;
        }

        result.appendLS(
            Math.min(
                thisReach.call(this),
                givenReach.call(this)
            ) - Math.max(
                thisPosition,
                givenPosition
            ),
            newSize
        );

        if(thisReach.call(this) == givenReach.call(this)) {
            // This bound ends at the same position as given's
            // bound, so increment both iterators.
            getThisNextBound.call(this);
            getGivenNextBound.call(this);
        }
        else if(thisReach.call(this) < givenReach()) {
            // This bound ends before given's bound, so increment
            // this bound's iterator.
            getThisNextBound.call(this);
        }
        else {
            // Assert: thisReach() > givenReach()
            // Given's bound ends before this bound, so increment
            // given's iterator.
            getGivenNextBound.call(this);
        }
    }

    if(givenBound != given.numBounds()) {
        // Finish off given last overlapping bound to get completely
        // in sync with givens.
        result.appendLS(
            givenReach.call(this) - thisReach.call(this),
            getGivenSize.call(this)
        );
        while(getGivenNextBound.call(this)) {
            result.appendLS(
                scale * given.boundLengthAt(givenBound),
                getGivenSize.call(this)
            );
        }
    }
    else if(thisBound != this.numBounds()) {
        // Finish off this extent's last overlapping bound to get completely
        // in sync with given's iterator.
        result.appendLS(
            thisReach.call(this) - givenReach.call(this),
            getThisSize.call(this)
        );
        while(getThisNextBound.call(this)) {
            result.appendLS(
                this.boundLengthAt(thisBound),
                getThisSize.call(this)
            );
        }
    }

    return result;
}

parsegraph_Extent.prototype.scale = function(factor)
{
    this.forEach(function(length, size, i) {
        this.setBoundLengthAt(i, length * factor);
        if(!isNaN(this.boundSizeAt(i))) {
            this.setBoundSizeAt(i, size * factor);
        }
    }, this);
};

/**
 * Returns the minimum value that guarantees no overlap between the two extents.
 *
 * Positive position adjustment requires this bound to be adjusted:
 *
 * (this)
 * <--*--->
 *    |
 *    <--|------->
 *    (given)
 *
 * Negative position adjustment requires the given bound to be adjusted:
 *
 * (given)
 *    <-------|-->
 *            |
 *         <--*-->
 *    (this)
 *
 * The position adjustment is in this extent's space. So if the given scale is 0.5, the
 * given extent's length and size are adjusted by that amount.
 */
parsegraph_Extent.prototype.separation = function(
    given,
    positionAdjustment,
    allowAxisOverlap,
    givenScale,
    axisMinimum)
{
    if(positionAdjustment === undefined) {
        positionAdjustment = 0;
    }
    if(allowAxisOverlap === undefined) {
        allowAxisOverlap = true;
    }
    if(axisMinimum === undefined) {
        axisMinimum = 0;
    }
    if(givenScale === undefined) {
        givenScale = 1.0;
    }
    //console.log("Separation(positionAdjustment=" + positionAdjustment + ")");

    var thisBound = 0;
    var givenBound = 0;

    var thisPosition = 0;

    // The position of given. This is in this node's space.
    var givenPosition = 0;

    /**
     * Moves the iterator for this extent to its next bound.
     *
     * The iterator is just a fancy counter. Both the position
     * and the bound index are tracked.
     */
    var incrementThisBound = function() {
        thisPosition += this.boundLengthAt(thisBound);
        ++thisBound;
    };

    var givenBoundLength = function() {
        return givenScale * given.boundLengthAt(givenBound);
    };

    var givenBoundSize = function() {
        var rv = given.boundSizeAt(givenBound);
        if(isNaN(rv)) {
            return rv;
        }
        return givenScale * rv;
    };

    var thisBoundSize = function() {
        return this.boundSizeAt(thisBound);
    };

    /**
     * Moves the iterator for the given extent to the next bound.
     *
     * The iterator is just a fancy counter. Both the position
     * and the bound index are tracked.
     */
    var incrementGivenBound = function() {
        givenPosition += givenBoundLength();
        ++givenBound;
    };

    var givenAtEnd = function() {
        return givenBound == given.numBounds();
    };

    var thisExtent = this;
    var thisAtEnd = function() {
        return thisBound == thisExtent.numBounds();
    };

    // extentSeparation is the minimum distance to separate this extent
    // from the given extent, so that they do not overlap if facing one
    // another.
    var extentSeparation = 0;

    // Adjust this extent's iterator to account for the position adjustment.
    if(positionAdjustment < 0) {
        while(
            !givenAtEnd()
            && givenPosition + givenBoundLength() <= -positionAdjustment
        ) {
            // If we don't allow axis overlap, then be sure to include these bounds
            // that are being skipped.
            var boundSeparation = givenBoundSize();
            if(
                !allowAxisOverlap
                && !isNaN(boundSeparation)
                && boundSeparation > extentSeparation
            ) {
                extentSeparation = boundSeparation + axisMinimum;
            }
            incrementGivenBound.call(this);
        }
    }
    else {
        // Positive positionAdjustment.
        while(
            !thisAtEnd()
            && thisPosition + this.boundLengthAt(thisBound) <= positionAdjustment
        ) {
            var boundSeparation = thisBoundSize.call(this);
            if(
                !allowAxisOverlap
                && !isNaN(boundSeparation)
                && boundSeparation > extentSeparation
            ) {
                extentSeparation = boundSeparation;
            }
            incrementThisBound.call(this);
        }
    }

    // While the iterators still have bounds in both extents.
    while(!givenAtEnd() && !thisAtEnd()) {
        // Calculate the separation between these bounds.
        //console.log("Separating");
        //console.log("This bound size: " + this.boundSizeAt(thisBound));
        //console.log("Given bound size: " + givenBoundSize());
        var thisSize = this.boundSizeAt(thisBound);
        var givenSize = givenBoundSize();
        var boundSeparation;
        if(!isNaN(thisSize) && !isNaN(givenSize)) {
             boundSeparation = thisSize + givenSize;
        }
        else if(!allowAxisOverlap) {
            if(!isNaN(thisSize)) {
                boundSeparation = thisSize + axisMinimum;
            }
            else if(!isNaN(givenSize)) {
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
            //console.log("Found new separation of " + extentSeparation + ".");
        }

        // Increment the iterators to the next testing point.

        // endComparison is a difference that indicates which bound
        // ends soonest.
        var endComparison =
            (thisPosition + this.boundLengthAt(thisBound) - positionAdjustment)
            - (givenPosition + givenScale * given.boundLengthAt(givenBound));

        if(endComparison == 0) {
            // This bound ends at the same position as given's bound,
            // so increment both.

            incrementGivenBound.call(this);
            incrementThisBound.call(this);
        }
        else if(endComparison > 0) {
            // This bound ends after given's bound, so increment the
            // given bound's iterator.
            incrementGivenBound.call(this);
        }
        if(endComparison < 0) {
            // Given's bound ends after this bound, so increment this
            // bound's iterator.
            incrementThisBound.call(this);
        }
    }

    if(!allowAxisOverlap) {
        // Calculate the separation between the remaining bounds of given and
        // the separation boundary.
        var startTime = parsegraph_getTimeInMillis();
        while(!givenAtEnd()) {
            if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
                throw new Error("Extent separation timed out");
            }

            var givenSize = given.boundSizeAt(givenBound);
            if(!isNaN(givenSize)) {
                extentSeparation = Math.max(extentSeparation, givenScale * givenSize + axisMinimum);
            }
            ++givenBound;
        }
    }

    return extentSeparation;
}

parsegraph_Extent.prototype.compact = function()
{
    var created = new parsegraph_Extent();
    if(this.hasBounds()) {
        // Not even one element.
        return created;
    }

    var lastSize = this.boundSizeAt(iter);
    var lastLength = this.boundLengthAt(iter);
    created.appendLS(lastLength, lastSize);

    for(var iter = 1; iter != this.numBounds(); ++iter) {
        if(this.boundLengthAt(iter) == 0) {
            // Remove empty bound.
            continue;
        }
        var size = this.boundSizeAt(iter);
        if((isNaN(lastSize) && isNaN(size)) || (lastSize === size)) {
            // Same size, so merge the lengths.
            created.setBoundLengthAt(
                created.numBounds() - 1,
                created.boundLengthAt(iter - 1) + this.boundLengthAt(iter)
            );
        }
        else {
            // Go to the next element.
            lastSize = this.boundSizeAt(iter);
        }
    }

    return created;
}

parsegraph_Extent.prototype.boundingValues = function(outVal)
{
    var totalLength = 0;
    var minSize = NaN;
    var maxSize = NaN;

    for(var iter = 0; iter != this.numBounds(); ++iter) {
        totalLength += this.boundLengthAt(iter);

        var size = this.boundSizeAt(iter);
        if(isNaN(minSize)) {
            minSize = size;
        }
        else if(!isNaN(size)) {
            minSize = Math.min(minSize, size);
        }

        if(isNaN(maxSize)) {
            maxSize = size;
        }
        else if(!isNaN(size)) {
            maxSize = Math.max(maxSize, size);
        }
    }

    if(!outVal) {
        outVal = [null, null, null];
    }
    outVal[0] = totalLength;
    outVal[1] = minSize;
    outVal[2] = maxSize;
    return outVal;
};

parsegraph_Extent.prototype.equals = function(other)
{
    // Exit quickly if we are comparing with ourselves.
    if(this === other) {
        return true;
    }

    // Ensure the sizes match.
    if(!other || this.numBounds() != other.numBounds()) {
        return false;
    }

    // Compare the bounds for equality.
    for(var i = 0; i < this.numBounds(); ++i) {
        if(this.boundLengthAt(i) !== other.boundLengthAt(i)) {
            return false;
        }
        var thisSize = this.boundSizeAt(i);
        var otherSize = other.boundSizeAt(i);
        if(isNaN(thisSize) && isNaN(otherSize)) {
            // Both NaN.
            continue;
        }
        // Fail if one is NaN and the other is not.
        if(isNaN(thisSize) || isNaN(otherSize)) {
            return false;
        }
        if(this.boundSizeAt(i) !== other.boundSizeAt(i)) {
            return false;
        }
    }
    return true;
}

parsegraph_Extent.prototype.dump = function(message)
{
    if(message !== undefined) {
        parsegraph_log(message);
    }

    var offset = 0;
    for(var i = 0; i < this.numBounds(); ++i) {
        parsegraph_log(
            "" + offset + ": [length=" + this.boundLengthAt(i) + ", size=" +
            this.boundSizeAt(i) + "]"
        );
        offset += this.boundLengthAt(i);
    }
}

parsegraph_Extent.prototype.toDom = function(message)
{
    var rv = document.createElement("table");
    rv.className = "parsegraph_Extent";

    if(message !== undefined) {
        var titleRow = document.createElement("tr");
        rv.appendChild(titleRow);
        titleRow.appendChild(document.createElement("th"));
        titleRow.lastChild.innerHTML = message;
        titleRow.lastChild.colSpan = 3;
    }

    var headerRow = document.createElement("tr");
    rv.appendChild(headerRow);
    headerRow.appendChild(document.createElement("th"));
    headerRow.lastChild.innerHTML = "Offset";
    headerRow.appendChild(document.createElement("th"));
    headerRow.lastChild.innerHTML = "Length";
    headerRow.appendChild(document.createElement("th"));
    headerRow.lastChild.innerHTML = "Size";

    var offset = 0;
    for(var i = 0; i < this.numBounds(); ++i) {
        var boundRow = document.createElement("tr");
        rv.appendChild(boundRow);

        boundRow.appendChild(document.createElement("td"));
        boundRow.lastChild.innerHTML = offset;

        boundRow.appendChild(document.createElement("td"));
        boundRow.lastChild.innerHTML = this.boundLengthAt(i);

        boundRow.appendChild(document.createElement("td"));
        boundRow.lastChild.innerHTML = this.boundSizeAt(i);

        offset += this.boundLengthAt(i);
    }

    return rv;
}

function parsegraph_createExtent(copy)
{
    return new parsegraph_Extent(copy);
}

parsegraph_Extent_Tests = new parsegraph_TestSuite("parsegraph_Extent");

parsegraph_Extent_Tests.addTest("parsegraph_Extent.simplify", function() {
    var extent = new parsegraph_Extent();
    extent.appendLS(10, 20);
    extent.appendLS(5, 20);
    extent.simplify();
    if(extent.numBounds() !== 1) {
        return "Simplify must merge bounds with equal sizes.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.numBounds", function() {
    var extent = new parsegraph_Extent();
    if(extent.numBounds() !== 0) {
        return "Extent must begin with an empty numBounds.";
    }
    extent.appendLS(1, 15);
    if(extent.numBounds() !== 1) {
        return "Append must only add one bound.";
    }
    extent.appendLS(1, 20);
    extent.appendLS(1, 25);
    if(extent.numBounds() !== 3) {
        return "Append must only add one bound per call.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.separation", function() {
    var forwardExtent = new parsegraph_Extent();
    var backwardExtent = new parsegraph_Extent();

    var testSeparation = function(expected) {
        return forwardExtent.separation(backwardExtent) ==
            backwardExtent.separation(forwardExtent) &&
            forwardExtent.separation(backwardExtent) == expected;
    };

    forwardExtent.appendLS(50, 10);
    backwardExtent.appendLS(50, 10);
    if(!testSeparation(20)) {
        console.log(testSeparation(20));
        console.log(forwardExtent.separation(backwardExtent));
        console.log(backwardExtent.separation(forwardExtent));
        return "For single bounds, separation should be equivalent to the size of the " +
            "forward and backward extents.";
    }

    backwardExtent.appendLS(50, 20);
    forwardExtent.appendLS(50, 20);
    if(!testSeparation(40)) {
        return false;
    }

    backwardExtent.appendLS(50, 20);
    forwardExtent.appendLS(50, 40);
    if(!testSeparation(60)) {
        return false;
    }

    backwardExtent.appendLS(50, 10);
    forwardExtent.appendLS(50, 10);
    if(!testSeparation(60)) {
        return false;
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.Simple combinedExtent", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(50, 25);
    forwardNode.appendLS(12, 6);
    var separation = rootNode.separation(forwardNode);

    var combined = rootNode.combinedExtent(forwardNode, 0, separation);

    var expected = new parsegraph_Extent();
    expected.appendLS(12, separation + 6);
    expected.appendLS(38, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.equals", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(10, 10);
    rootNode.appendLS(10, NaN);
    rootNode.appendLS(10, 15);

    forwardNode.appendLS(10, 10);
    forwardNode.appendLS(10, NaN);
    forwardNode.appendLS(10, 15);

    if(!rootNode.equals(forwardNode)) {
        return "Equals does not handle NaN well.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.combinedExtent with NaN", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();


    rootNode.appendLS(50, 25);

    forwardNode.appendLS(10, NaN);
    forwardNode.setBoundSizeAt(0, NaN);
    if(!isNaN(forwardNode.boundSizeAt(0))) {
        return forwardNode.boundSizeAt(0);
    }
    forwardNode.appendLS(30, 5);


    var separation = rootNode.separation(forwardNode);
    if(separation != 30) {
        return "Separation doesn't even match. Actual=" + separation;
    }

    var combined = rootNode.combinedExtent(forwardNode,
        0,
        separation
    );

    var expected = new parsegraph_Extent();
    expected.appendLS(10, 25);
    expected.appendLS(30, 35);
    expected.appendLS(10, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.combinedExtent", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(50, 25);
    forwardNode.appendLS(12, 6);
    var separation = rootNode.separation(forwardNode);

    var combined = rootNode.combinedExtent(forwardNode,
        25 - 6,
        separation
    );

    var expected = new parsegraph_Extent();
    expected.appendLS(19, 25);
    expected.appendLS(12, separation + 6);
    expected.appendLS(19, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_checkExtentsEqual = function(caret, direction, expected, resultDom)
{
    if(caret.node().extentsAt(direction).equals(expected)) {
        return true;
    }
    if(resultDom) {
        resultDom.appendChild(
            expected.toDom(
                "Expected " + parsegraph_nameNodeDirection(direction) + " extent"
            )
        );
        resultDom.appendChild(
            caret.node().extentsAt(direction).toDom(
                "Actual " + parsegraph_nameNodeDirection(direction) + " extent"
            )
        );
        resultDom.appendChild(document.createTextNode(
            "Extent offset = " + caret.node().extentOffsetAt(direction)
        ));
    }
    return false;
};
