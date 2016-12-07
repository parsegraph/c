/**
 * Sets the position, calculates extents, and
 * clears the needs commit flag.
 */
parsegraph_Node.prototype.commitLayout = function()
{
    // Do nothing if this node already has a layout committed.
    if(this._layoutState == parsegraph_COMMITTED_LAYOUT) {
        return false;
    }

    // Check for invalid layout states.
    if(this._layoutState == parsegraph_NULL_LAYOUT_STATE) {
        throw parsegraph_createException(parsegraph_BAD_LAYOUT_STATE);
    }

    // Do not allow overlapping layout commits.
    if(this._layoutState == parsegraph_IN_COMMIT) {
        throw parsegraph_createException(parsegraph_BAD_LAYOUT_STATE);
    }

    // Begin the layout.
    this._layoutState = parsegraph_IN_COMMIT;

    // Clear the absolute point values, to be safe.
    this._absoluteXPos = null;
    this._absoluteYPos = null;

    // Create a neighbors structure to use for storing
    // values. This doesn't replace what the node already
    // has.
    var thisNeighbors = parsegraph_createNeighbors();

    var initExtent = function(
        inDirection,
        length,
        size,
        offset)
    {
        thisNeighbors[inDirection].extent().appendLS(
            length,
            size
        );
        thisNeighbors[inDirection].setExtentOffset(offset);
    };

    var bodySize = this.size();

    // This node's horizontal bottom, used with downward nodes.
    initExtent(
        parsegraph_DOWNWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2
    );

    // This node's horizontal top, used with upward nodes.
    initExtent(
        parsegraph_UPWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2
    );

    // This node's vertical back, used with backward nodes.
    initExtent(
        parsegraph_BACKWARD,
        // Length:
        bodySize.height(),
        // Size:
        bodySize.width() / 2,
        // Offset to body center:
        bodySize.height() / 2
    );

    // This node's vertical front, used with forward nodes.
    initExtent(
        parsegraph_FORWARD,
        // Length:
        bodySize.height(),
        // Size:
        bodySize.width() / 2,
        // Offset to body center:
        bodySize.height() / 2
    );

    /**
     * Returns the offset of the child's center in the given direction from
     * this node's center.
     *
     * This offset is in a direction perpendicular to the given direction
     * and is positive to indicate a negative offset.
     *
     * The result is in this node's space.
     */
    var getAlignment = function(childDirection) {
        // Calculate the alignment adjustment for both nodes.
        var child = this.nodeAt(childDirection);
        var axis = parsegraph_getPerpendicularAxis(
            parsegraph_getNodeDirectionAxis(childDirection)
        );

        var rv;

        var alignmentMode = this._neighbors[childDirection].alignmentMode();
        switch(alignmentMode) {
        case parsegraph_NULL_NODE_ALIGNMENT:
            throw parsegraph_createException(parsegraph_BAD_NODE_ALIGNMENT);
        case parsegraph_DO_NOT_ALIGN:
            // Unaligned nodes have no alignment offset.
            rv = 0;
            break;
        case parsegraph_ALIGN_NEGATIVE:
            rv = parsegraph_findConsecutiveLength(
                child,
                parsegraph_getNegativeNodeDirection(axis)
            );
            break;
        case parsegraph_ALIGN_CENTER:
        {
            var negativeLength = parsegraph_findConsecutiveLength(
                child, parsegraph_getNegativeNodeDirection(axis)
            );

            var positiveLength = parsegraph_findConsecutiveLength(
                child, parsegraph_getPositiveNodeDirection(axis)
            );

            var halfLength = (negativeLength + positiveLength) / 2;

            if(negativeLength > positiveLength) {
                // The child's negative neighbors extend more than their positive neighbors.
                rv = negativeLength - halfLength;
            }
            else if(negativeLength < positiveLength) {
                rv = -(positiveLength - halfLength);
            }
            else {
                rv = 0;
            }
            break;
        }
        case parsegraph_ALIGN_POSITIVE:
            rv = -parsegraph_findConsecutiveLength(
                child, parsegraph_getPositiveNodeDirection(axis)
            );
            break;
        }
        //console.log("Found alignment of " + rv);
        return rv * this.scaleAt(childDirection);
    };

    /**
     * Positions a child.
     *
     * The alignment is positive in the positive direction.
     *
     * The separation is positive in the direction of the child.
     *
     * These values should in this node's space.
     *
     * The child's position is in this node's space.
     */
    var positionChild = function(childDirection, alignment, separation) {
        if(separation < 0) {
            throw new Error("separation must always be positive.");
        }
        if(!parsegraph_isCardinalDirection(childDirection)) {
            throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
        }

        var child = this.nodeAt(childDirection);
        var reversedDirection = parsegraph_reverseNodeDirection(childDirection)

        this._neighbors[childDirection].setAlignmentOffset(alignment);
        this._neighbors[childDirection].setSeparation(separation);

        var lineLength;
        var extentSize;
        if(this.nodeAlignmentMode(childDirection) === parsegraph_DO_NOT_ALIGN) {
            if(parsegraph_isVerticalNodeDirection(childDirection)) {
                extentSize = child.size().height() / 2;
            }
            else {
                extentSize = child.size().width() / 2;
            }
        }
        else {
            extentSize = child.extentsAt(reversedDirection).sizeAt(
                this._neighbors[childDirection].node().extentOffsetAt(reversedDirection) -
                alignment / this.scaleAt(childDirection)
            );
        }
        lineLength = separation - this.scaleAt(childDirection) * extentSize;
        this._neighbors[childDirection].setLineLength(lineLength);

        var dirSign = parsegraph_nodeDirectionSign(childDirection);
        if(parsegraph_isVerticalNodeDirection(childDirection)) {
            // The child is positioned vertically.
            this.setPosAt(childDirection, alignment, dirSign * separation);
        }
        else {
            this.setPosAt(childDirection, dirSign * separation, alignment);
        }

        /*console.log(
            parsegraph_nameNodeDirection(childDirection) + " " +
            parsegraph_nameNodeType(child.type()) + "'s position set to (" +
            this._neighbors[childDirection].x() + ", " + this._neighbors[childDirection].y() + ")"
        );*/
    };

    /**
     * Merge this node's extents in the given direction with the
     * child's extents.
     *
     * alignment is the offset of the child from this node.
     * Positive values indicate presence in the positive
     * direction. (i.e. forward or upward).
     *
     * separation is the distance from the center of this node to the center
     * of the node in the specified direction.
     */
    var combineExtents = function(
        childDirection,
        alignment,
        separation)
    {
        var child = this.nodeAt(childDirection);

        /**
         * Combine an extent.
         *
         * lengthAdjustment and sizeAdjustment are in this node's space.
         */
        var combineExtent = function(
            direction,
            lengthAdjustment,
            sizeAdjustment)
        {
            /*console.log(
                "combineExtent(" +
                parsegraph_nameNodeDirection(direction) + ", " +
                lengthAdjustment + ", " +
                sizeAdjustment + ")"
            );*/
            // Calculate the new offset to this node's center.
            var lengthOffset = thisNeighbors[direction].extentOffset()
                + lengthAdjustment
                - this.scaleAt(childDirection) * child.extentOffsetAt(direction);

            // Combine the two extents in the given direction.
            //console.log("Combining " + parsegraph_nameNodeDirection(direction) + ", " );
            //console.log("Length offset: " + lengthOffset);
            //console.log("Size adjustment: " + sizeAdjustment);
            thisNeighbors[direction].extent().combineExtent(
                child.extentsAt(direction),
                lengthOffset,
                sizeAdjustment,
                this.scaleAt(childDirection)
            );

            if(
                this.nodeAlignmentMode(childDirection) == parsegraph_DO_NOT_ALIGN
                && this.nodeFit() == parsegraph_NODE_FIT_LOOSE
            ) {
                thisNeighbors[direction].extent().simplify();
            }

            // Adjust the length offset to remain positive.
            if(lengthOffset < 0) {
                //console.log("Adjusting negative extent offset.");
                thisNeighbors[direction].setExtentOffset(
                    thisNeighbors[direction].extentOffset() +
                    Math.abs(lengthOffset)
                );
            }

            /*console.log(
                "New "
                + parsegraph_nameNodeDirection(direction)
                + " extent offset = "
                + thisNeighbors[direction].extentOffset()
            );
            thisNeighbors[direction].extent().forEach(function(l, s, i) {
                console.log(i + ". length=" + l + ", size=" + s);
            });*/

            // Assert the extent offset is positive.
            if(thisNeighbors[direction].extentOffset() < 0) {
                throw new Error("Extent offset must not be negative.");
            }
        };

        switch(childDirection) {
        case parsegraph_DOWNWARD:
            // Downward child.
            combineExtent.call(this, parsegraph_DOWNWARD, alignment, separation);
            combineExtent.call(this, parsegraph_UPWARD, alignment, -separation);

            combineExtent.call(this, parsegraph_FORWARD, separation, alignment);
            combineExtent.call(this, parsegraph_BACKWARD, separation, -alignment);
            break;
        case parsegraph_UPWARD:
            // Upward child.
            combineExtent.call(this, parsegraph_DOWNWARD, alignment, -separation);
            combineExtent.call(this, parsegraph_UPWARD, alignment, separation);

            combineExtent.call(this, parsegraph_FORWARD, -separation, alignment);
            combineExtent.call(this, parsegraph_BACKWARD, -separation, -alignment);
            break;
        case parsegraph_FORWARD:
            // Forward child.
            combineExtent.call(this, parsegraph_DOWNWARD, separation, -alignment);
            combineExtent.call(this, parsegraph_UPWARD, separation, alignment);

            combineExtent.call(this, parsegraph_FORWARD, alignment, separation);
            combineExtent.call(this, parsegraph_BACKWARD, alignment, -separation);
            break;
        case parsegraph_BACKWARD:
            // Backward child.
            combineExtent.call(this, parsegraph_DOWNWARD, -separation, -alignment);
            combineExtent.call(this, parsegraph_UPWARD, -separation, alignment);

            combineExtent.call(this, parsegraph_FORWARD, alignment, -separation);
            combineExtent.call(this, parsegraph_BACKWARD, alignment, separation);
            break;
        default:
            throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
        }
    };

    /**
     * Layout a single node in the given direction.
     */
    var layoutSingle = function(
        direction,
        allowAxisOverlap)
    {
        if(!this.hasNode(direction)) {
            return;
        }

        /*console.log(
            "Laying out single " + parsegraph_nameNodeDirection(direction) + " child, "
            + (allowAxisOverlap ? "with " : "without ") + "axis overlap."
        );*/

        // Get the alignment for the children.
        var alignment = getAlignment.call(this, direction);
        //console.log("Calculated alignment of " + alignment + ".");

        var child = this.nodeAt(direction);
        var reversed = parsegraph_reverseNodeDirection(direction);
        var childExtent = child.extentsAt(reversed);

        // Separate the child from this node. This means adding the alignment
        // and adjusting by the difference in extent offsets.
        var separationFromChild = thisNeighbors[direction].extent().separation(
            childExtent,
                thisNeighbors[direction].extentOffset()
                + alignment
                - this.scaleAt(direction) * child.extentOffsetAt(reversed),
            allowAxisOverlap,
            this.scaleAt(direction),
            parsegraph_LINE_THICKNESS / 2
        );
        //console.log("Calculated unpadded separation of " + separationFromChild + ".");

        // Add padding and ensure the child is not separated less than
        // it would be if the node was not offset by alignment.
        if(
            parsegraph_getNodeDirectionAxis(direction)
                == parsegraph_VERTICAL_AXIS
        ) {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (child.size().height() / 2)
                + this.size().height() / 2
            );
            separationFromChild
                += this.verticalSeparation(direction)
                * this.scaleAt(direction);
        }
        else {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (child.size().width() / 2)
                + this.size().width() / 2
            );
            separationFromChild
                += this.horizontalSeparation(direction)
                * this.scaleAt(direction);
        }
        //console.log("Calculated padded separation of " + separationFromChild + ".");

        // Set the node's position.
        positionChild.call(
            this,
            direction,
            alignment,
            separationFromChild
        );

        // Combine the extents of the child and this node.
        combineExtents.call(
            this,
            direction,
            alignment,
            separationFromChild
        );
    };

    /**
     * Layout a pair of nodes in the given directions.
     */
    var layoutAxis = function(
        firstDirection,
        secondDirection,
        allowAxisOverlap)
    {
        // Change the node direction to null if there is no node in that
        // direction.
        if(!this.hasNode(firstDirection)) {
            firstDirection = parsegraph_NULL_NODE_DIRECTION;
        }
        if(!this.hasNode(secondDirection)) {
            secondDirection = parsegraph_NULL_NODE_DIRECTION;
        }

        // Return if there are no directions.
        if(
            firstDirection == parsegraph_NULL_NODE_DIRECTION
            && secondDirection == parsegraph_NULL_NODE_DIRECTION
        ) {
            return;
        }

        // Test if this node has a first-axis child in only one direction.
        if(
            firstDirection == parsegraph_NULL_NODE_DIRECTION
            || secondDirection == parsegraph_NULL_NODE_DIRECTION
        ) {
            // Find the direction of the only first-axis child.
            var firstAxisDirection;
            if(firstDirection != parsegraph_NULL_NODE_DIRECTION) {
                firstAxisDirection = firstDirection;
            }
            else {
                // It must be the second direction.
                firstAxisDirection = secondDirection;
            }

            // Layout that node.
            layoutSingle.call(this, firstAxisDirection, allowAxisOverlap);
            return;
        }

        /*console.log(
            "Laying out " +
            parsegraph_nameNodeDirection(firstDirection) + " and " +
            parsegraph_nameNodeDirection(secondDirection) + " children."
        );*/

        // This node has first-axis children in both directions.
        var firstNode = this.nodeAt(firstDirection);
        var secondNode = this.nodeAt(secondDirection);

        // Get the alignments for the children.
        var firstNodeAlignment = getAlignment.call(this, firstDirection);
        var secondNodeAlignment = getAlignment.call(this, secondDirection);
        //console.log("First alignment: " + firstNodeAlignment);
        //console.log("Second alignment: " + secondNodeAlignment);

        var separationBetweenChildren =
            firstNode.extentsAt(secondDirection).separation(
                secondNode.extentsAt(firstDirection),
                (this.scaleAt(secondDirection) / this.scaleAt(firstDirection))
                * (secondNodeAlignment - secondNode.extentOffsetAt(firstDirection))
                - (firstNodeAlignment - firstNode.extentOffsetAt(secondDirection)),
                true,
                this.scaleAt(secondDirection) / this.scaleAt(firstDirection)
            );
        separationBetweenChildren *= this.scaleAt(firstDirection);

        //console.log("Separation between children=" + separationBetweenChildren);

        var separationFromSecond = thisNeighbors[secondDirection].extent()

        /*console.log(
            "This " +
            parsegraph_nameNodeDirection(firstDirection) +
            " extent (offset to center=" +
            thisNeighbors[firstDirection].extentOffset() +
            ")"
        );
        thisNeighbors[firstDirection].extent().forEach(
            function(length, size, i) {
                console.log(i + ". l=" + length + ", s=" + size);
            }
        );

        console.log(
            parsegraph_nameNodeDirection(firstDirection) +
            " " + parsegraph_nameNodeType(this.nodeAt(firstDirection).type()) +
            "'s " + parsegraph_nameNodeDirection(secondDirection) +
            " extent (offset to center=" +
            this.nodeAt(firstDirection).extentOffsetAt(secondDirection) +
            ")"
        );
        this.nodeAt(firstDirection).extentsAt(secondDirection).forEach(
            function(length, size, i) {
                console.log(i + ". l=" + length + ", s=" + size);
            }
        );

        console.log(
            "FirstNodeAlignment=" + firstNodeAlignment
        );
        console.log(
            "thisNeighbors[firstDirection].extentOffset()=" +
                thisNeighbors[firstDirection].extentOffset()
        );
        console.log(
            "firstNode.extentOffsetAt(secondDirection)=" + firstNode.extentOffsetAt(secondDirection)
        );*/

        // Allow some overlap if we have both first-axis sides, but
        // nothing ahead on the second axis.
        var separationFromFirst = thisNeighbors[firstDirection].extent()
            .separation(
                firstNode.extentsAt(secondDirection),
                thisNeighbors[firstDirection].extentOffset()
                + firstNodeAlignment
                - this.scaleAt(firstDirection) * firstNode.extentOffsetAt(secondDirection),
                allowAxisOverlap,
                this.scaleAt(firstDirection),
                parsegraph_LINE_THICKNESS / 2
            );

        var separationFromSecond = thisNeighbors[secondDirection].extent()
            .separation(
                secondNode.extentsAt(firstDirection),
                thisNeighbors[secondDirection].extentOffset()
                + secondNodeAlignment
                - this.scaleAt(secondDirection) * secondNode.extentOffsetAt(firstDirection),
                allowAxisOverlap,
                this.scaleAt(secondDirection),
                parsegraph_LINE_THICKNESS / 2
            );

        /*console.log(
            "Separation from this " + parsegraph_nameNodeType(this.type()) + " to " +
            parsegraph_nameNodeDirection(firstDirection) + " " +
            parsegraph_nameNodeType(this.nodeAt(firstDirection).type()) + "=" +
            separationFromFirst
        );
        console.log(
            "Separation from this " + parsegraph_nameNodeType(this.type()) + " to " +
            parsegraph_nameNodeDirection(secondDirection) + " " +
            parsegraph_nameNodeType(this.nodeAt(secondDirection).type()) + "=" +
            separationFromSecond
        );*/

        // TODO Handle occlusion of the second axis if we have a parent or
        // if we have a second-axis child. Doesn't this code need to ensure
        // the second-axis child is not trapped inside too small a space?

        if(separationBetweenChildren
            >= separationFromFirst + separationFromSecond) {
            // The separation between the children is greater than the
            // separation between each child and this node.

            // Center them as much as possible.
            separationFromFirst = Math.max(
                separationFromFirst,
                separationBetweenChildren / 2
            );
            separationFromSecond = Math.max(
                separationFromSecond,
                separationBetweenChildren / 2
            );
        }
        else {
            //separationBetweenChildren
            //    < separationFromFirst + separationFromSecond

            // The separation between children is less than what this node
            // needs to separate each child from itself, so do nothing to
            // the separation values.
        }

        if(
            parsegraph_getNodeDirectionAxis(firstDirection)
            == parsegraph_VERTICAL_AXIS
        ) {
            separationFromFirst = Math.max(
                separationFromFirst,
                this.scaleAt(firstDirection) * (firstNode.size().height() / 2)
                + this.size().height() / 2
            );
            separationFromFirst
                += this.verticalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondNode.size().height() / 2)
                + this.size().height() / 2
            );
            separationFromSecond
                += this.verticalSeparation(secondDirection)
                * this.scaleAt(secondDirection);
        }
        else {
            separationFromFirst = Math.max(
                separationFromFirst,
                this.scaleAt(firstDirection) * (firstNode.size().width() / 2)
                + this.size().width() / 2
            );
            separationFromFirst
                += this.horizontalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondNode.size().width() / 2)
                + this.size().width() / 2
            );
            separationFromSecond
                += this.horizontalSeparation(secondDirection)
                * this.scaleAt(secondDirection);
        }

        // Set the positions of the nodes.
        positionChild.call(
            this,
            firstDirection,
            firstNodeAlignment,
            separationFromFirst
        );
        positionChild.call(
            this,
            secondDirection,
            secondNodeAlignment,
            separationFromSecond
        );

        // Combine their extents.
        combineExtents.call(
            this,
            firstDirection,
            firstNodeAlignment,
            separationFromFirst
        );
        combineExtents.call(
            this,
            secondDirection,
            secondNodeAlignment,
            separationFromSecond
        );
    };

    if(
        this.isRoot()
        || this.parentDirection() == parsegraph_INWARD
        || this.parentDirection() == parsegraph_OUTWARD
    ) {
        if(this._layoutPreference == parsegraph_PREFER_HORIZONTAL_AXIS) {
            // Root-like, so just lay out both axes.
            layoutAxis.call(this, parsegraph_BACKWARD, parsegraph_FORWARD,
                !this.hasNode(parsegraph_UPWARD) && !this.hasNode(parsegraph_DOWNWARD)
            );

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            layoutAxis.call(this, parsegraph_UPWARD, parsegraph_DOWNWARD, true);
        }
        else {
            // Root-like, so just lay out both axes.
            layoutAxis.call(this, parsegraph_UPWARD, parsegraph_DOWNWARD,
                !this.hasNode(parsegraph_BACKWARD) && !this.hasNode(parsegraph_FORWARD)
            );

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            layoutAxis.call(this, parsegraph_BACKWARD, parsegraph_FORWARD, true);
        }
    }
    else {
        // Layout based upon the axis preference.
        if(this.canonicalLayoutPreference() == parsegraph_PREFER_PERPENDICULAR_AXIS) {
            // firstDirection and secondDirection, if not NULL_NODE_DIRECTION,
            // indicate a neighboring node in at least that direction.
            var firstDirection
                = parsegraph_NULL_NODE_DIRECTION;
            var secondDirection
                = parsegraph_NULL_NODE_DIRECTION;

            // firstAxis indicates the first-axis.
            var firstAxis =
                parsegraph_getPerpendicularAxis(this.parentDirection());

            // Check for nodes perpendicular to parent's direction
            var hasFirstAxisNodes = this.hasNodes(
                firstAxis
            );
            var oppositeFromParent =
                parsegraph_reverseNodeDirection(this.parentDirection());
            layoutAxis.call(
                this,
                hasFirstAxisNodes[0],
                hasFirstAxisNodes[1],
                false
            );

            // Layout this node's second-axis child, if that child exists.
            if(this.hasNode(oppositeFromParent)) {
                // Layout the second-axis child.
                layoutSingle.call(this, oppositeFromParent, true);
            }
        }
        else {
            // Layout this node's second-axis child, if that child exists.
            var oppositeFromParent =
                parsegraph_reverseNodeDirection(this.parentDirection());

            // firstDirection and secondDirection, if not NULL_NODE_DIRECTION,
            // indicate a neighboring node in at least that direction.
            var firstDirection
                = parsegraph_NULL_NODE_DIRECTION;
            var secondDirection
                = parsegraph_NULL_NODE_DIRECTION;

            // Check for nodes perpendicular to parent's direction
            var perpendicularNodes = this.hasNodes(
                parsegraph_getPerpendicularAxis(this.parentDirection())
            );

            if(this.hasNode(oppositeFromParent)) {
                // Layout the second-axis child.
                layoutSingle.call(
                    this,
                    oppositeFromParent,
                    firstDirection != parsegraph_NULL_NODE_DIRECTION ||
                    secondDirection != parsegraph_NULL_NODE_DIRECTION
                );
            }

            layoutAxis.call(this, perpendicularNodes[0], perpendicularNodes[1], true);
        }
    }

    var addLineBounds = function(given)
    {
        if(!this.hasNode(given)) {
            return;
        }

        var perpAxis = parsegraph_getPerpendicularAxis(given);
        var dirSign = parsegraph_nodeDirectionSign(given);

        var positiveOffset = thisNeighbors[
            parsegraph_getPositiveNodeDirection(perpAxis)
        ].extentOffset();

        var negativeOffset = thisNeighbors[
            parsegraph_getNegativeNodeDirection(perpAxis)
        ].extentOffset();

        if(dirSign < 0) {
            positiveOffset -= this.sizeIn(given) + this.lineLengthAt(given);
            negativeOffset -= this.sizeIn(given) + this.lineLengthAt(given);
        }

        // Append the line-shaped bound.
        thisNeighbors[
            parsegraph_getPositiveNodeDirection(perpAxis)
        ].extent().combineBound(
            positiveOffset,
            this.lineLengthAt(given),
            this.scaleAt(given) * parsegraph_LINE_THICKNESS / 2
        );
        thisNeighbors[
            parsegraph_getNegativeNodeDirection(perpAxis)
        ].extent().combineBound(
            negativeOffset,
            this.lineLengthAt(given),
            this.scaleAt(given) * parsegraph_LINE_THICKNESS / 2
        );
    };

    var syncDirection = function(given)
    {
        this._neighbors[given].extent().copyFrom(thisNeighbors[given].extent());
        this._neighbors[given].setExtentOffset(thisNeighbors[given].extentOffset());

        /*_neighbors[given].extent().dump(
            QString("Resulting %1 extent, with extent offset of %2")
                .arg(parsegraph::nameNodeDirection(given))
                .arg(_neighbors[given].extentOffset)
        );*/
    };

    // Set our extents, combined with non-point neighbors.
    parsegraph_forEachCardinalNodeDirection(addLineBounds, this);
    parsegraph_forEachCardinalNodeDirection(syncDirection, this);

    if(this.hasNode(parsegraph_INWARD)) {
        var nestedNode = this.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();
        if(
            this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL
            && nestedNode.scale() * nestedSize.width() <
            bodySize.width() - 2 * (this.horizontalPadding() + this.borderThickness())
        ) {
            this.setPosAt(parsegraph_INWARD,
                nestedNode.scale() * (
                    nestedNode.extentOffsetAt(parsegraph_DOWNWARD)
                    - nestedSize.width() / 2
                ),
                bodySize.height() / 2
                - this.verticalPadding()
                - this.borderThickness()
                + nestedNode.scale() * (
                    - nestedSize.height()
                    + nestedNode.extentOffsetAt(parsegraph_FORWARD)
                )
            );
        }
        else if(
            this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_HORIZONTAL
            && nestedNode.scale() * nestedSize.height() <
            bodySize.height() - 2 * (this.verticalPadding() + this.borderThickness())
        ) {
            this.setPosAt(parsegraph_INWARD,
                bodySize.width() / 2
                - this.horizontalPadding()
                - this.borderThickness()
                + nestedNode.scale() * (
                    - nestedSize.width()
                    + nestedNode.extentOffsetAt(
                        parsegraph_DOWNWARD
                    )
                ),
                nestedNode.scale() * (
                    nestedNode.extentOffsetAt(parsegraph_FORWARD)
                    - nestedSize.height() / 2
                )
            );
        }
        else {
            this.setPosAt(parsegraph_INWARD,
                bodySize.width() / 2
                - this.horizontalPadding()
                - this.borderThickness()
                + nestedNode.scale() * (
                    - nestedSize.width()
                    + nestedNode.extentOffsetAt(
                        parsegraph_DOWNWARD
                    )
                ),
                bodySize.height() / 2
                - this.verticalPadding()
                - this.borderThickness()
                + nestedNode.scale() * (
                    - nestedSize.height()
                    + nestedNode.extentOffsetAt(
                        parsegraph_FORWARD
                    )
                )
            );
        }
    }

    this._layoutState = parsegraph_COMMITTED_LAYOUT;

    // Needed a commit, so return true.
    return true;
}

/**
 * Returns the total distance from the given node, to the furthest node
 * found in the given direction.
 *
 * The result is in node-space; the scale of child nodes is applied.
 */
var parsegraph_findConsecutiveLength = function(node, inDirection)
{
    // Exclude some directions that cannot be calculated.
    if(!parsegraph_isCardinalDirection(inDirection)) {
        throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
    }

    var directionAxis = parsegraph_getNodeDirectionAxis(inDirection);
    if(directionAxis == parsegraph_NULL_AXIS) {
        // This should be impossible.
        throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
    }

    // Calculate the length, starting from the center of this node.
    var total = 0;
    var scale = 1.0;

    // Iterate in the given direction.
    if(node.hasNode(inDirection)) {
        total += node.separationAt(inDirection);

        scale *= node.scaleAt(inDirection);
        var thisNode = node.nodeAt(inDirection);
        var nextNode = thisNode.nodeAt(inDirection);
        while(nextNode != null) {
            total += thisNode.separationAt(inDirection) * scale;
            scale *= thisNode.scaleAt(inDirection);

            thisNode = nextNode;
            nextNode = nextNode.nodeAt(inDirection);
        }
    }

    return total;
};

parsegraph_Node.prototype.commitLayoutIteratively = function()
{
    var startTime = parsegraph_getTimeInMillis();
    this.traverse(
        function(node) {
            return node._layoutState == parsegraph_NEEDS_COMMIT;
        },
        function(node) {
            if(parsegraph_getTimeInMillis() - startTime > parsegraph_TIMEOUT) {
                throw new Error("commitLayout timeout");
            }
            node.commitLayout();
        }
    );
};
