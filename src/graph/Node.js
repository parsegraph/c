function parsegraph_createNode(graph, newType, fromNode, parentDirection)
{
    return new parsegraph_Node(graph, newType, fromNode, parentDirection);
}

function parsegraph_Node(graph, newType, fromNode, parentDirection)
{
    this._graph = graph;

    this._neighbors = parsegraph_createNeighbors();

    this._type = newType;
    this._label = undefined;

    this._layoutState = parsegraph_NEEDS_COMMIT;

    this._scale = 1.0;

    this._brightness = 0.75;
    this._brightnessColor = new parsegraph_Color(1.0, 1.0, 1.0, 0.01);

    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;

    this._selected = false;

    this._nodeFit = parsegraph_NODE_FIT_LOOSE;

    // Check if a parent node was provided.
    if(fromNode != null) {
        // A parent node was provided; this node is a child.
        if(!parsegraph_isNodeDirection(parentDirection) ||
            parsegraph_NULL_NODE_DIRECTION === parentDirection
        ) {
            throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
        }
        this._layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
        this._parentDirection = parentDirection;
        this._neighbors[parentDirection].setNode(fromNode);
    }
    else {
        // No parent was provided; this node is a root.
        this._layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        this._parentDirection = parsegraph_NULL_NODE_DIRECTION;
    }
}

parsegraph_Node.prototype.nodeFit = function()
{
    return this._nodeFit;
};

parsegraph_Node.prototype.setNodeFit = function(nodeFit)
{
    this._nodeFit = nodeFit;
    this.layoutWasChanged(parsegraph_INWARD);
};

/**
 * Returns the scale of this node.
 */
parsegraph_Node.prototype.scale = function()
{
    return this._scale;
}

/**
 * Sets the scale of this node.
 *
 * This value is commutative with child scales.
 */
parsegraph_Node.prototype.setScale = function(scale)
{
    this._scale = scale;
    this.layoutWasChanged(parsegraph_INWARD);
}

/**
 * Returns the ID set for this node.
 */
parsegraph_Node.prototype.id = function()
{
    return this._id;
};

/**
 * Sets the ID for this node.
 */
parsegraph_Node.prototype.setId = function(newId)
{
    this._id = newId;
    this._graph.changedId(this);
};

/**
 * Returns whether this node is a root node.
 */
parsegraph_Node.prototype.isRoot = function()
{
    return this._parentDirection === parsegraph_NULL_NODE_DIRECTION;
};

/**
 * Returns the direction of this node's parent.
 */
parsegraph_Node.prototype.parentDirection = function()
{
    if(this.isRoot()) {
        return parsegraph_NULL_NODE_DIRECTION;
    }
    return this._parentDirection;
};

/**
 * Returns this node's parent.
 *
 * Throws parsegraph_NODE_IS_ROOT if this node is a root node.
 */
parsegraph_Node.prototype.nodeParent = function()
{
    if(this.isRoot()) {
        throw parsegraph_createException(parsegraph_NODE_IS_ROOT);
    }
    return this._neighbors[this.parentDirection()].node();
};

/**
 * Returns whether this node has a node in the given direction.
 *
 * Returns false if the given direction is NULL_NODE_DIRECTION.
 */
parsegraph_Node.prototype.hasNode = function(atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        return false;
    }
    return this._neighbors[atDirection].hasNode();
};

/**
 * Returns an array of node directions that indicate a node
 * in that direction. The directions are filtered by the given
 * axis.
 *
 * Nodes in both directions:
 * [negative node direction, positive node direction]
 *
 * Node in negative direction:
 * [negative node direction, parsegraph_NULL_NODE_DIRECTION]
 *
 * Node in positive direction:
 * [parsegraph_NULL_NODE_DIRECTION, positive node direction]
 *
 * Node in no directions:
 * [parsegraph_NULL_NODE_DIRECTION, parsegraph_NULL_NODE_DIRECTION]
 */
parsegraph_Node.prototype.hasNodes = function(axis)
{
    if(axis === parsegraph_NULL_AXIS) {
        throw parsegraph_createException(parsegraph_BAD_AXIS, axis);
    }

    var result = [
        parsegraph_NULL_NODE_DIRECTION,
        parsegraph_NULL_NODE_DIRECTION
    ];

    if(this.hasNode(parsegraph_getNegativeNodeDirection(axis))) {
        result[0] = parsegraph_getNegativeNodeDirection(axis);
    }
    if(this.hasNode(parsegraph_getPositiveNodeDirection(axis))) {
        result[1] = parsegraph_getPositiveNodeDirection(axis);
    }

    return result;
};

/**
 * Returns whether this node has a child node in the given direction.
 *
 * See also nodeAt, which returns true for the parent as well.
 */
parsegraph_Node.prototype.hasChildAt = function(direction)
{
    return this.hasNode(direction) && this.parentDirection() != direction;
};

parsegraph_Node.prototype.hasAnyNodes = function()
{
    return this.hasChildAt(parsegraph_DOWNWARD)
        || this.hasChildAt(parsegraph_UPWARD)
        || this.hasChildAt(parsegraph_FORWARD)
        || this.hasChildAt(parsegraph_BACKWARD);
};

parsegraph_Node.prototype.nodeAt = function(atDirection)
{
    return this._neighbors[atDirection].node();
};

/**
 * Iterates over this node and its children, calling actionFunc whenever
 * filterFunc is true.
 */
parsegraph_Node.prototype.traverse = function(filterFunc, actionFunc, thisArg)
{
    // First, exit immediately if this node doesn't pass the given filter.
    if(!filterFunc.call(thisArg, this)) {
        return;
    }

    var ordering = [this];

    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }
        // Add the node to the ordering if it exists and needs a layout.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);
            if(filterFunc.call(thisArg, child)) {
                ordering.push(child);
            }
        }
    };

    // Build the node list.
    for(var i = 0; i < ordering.length; ++i) {
        var node = ordering[i];
        addNode(node, parsegraph_INWARD);
        addNode(node, parsegraph_DOWNWARD);
        addNode(node, parsegraph_UPWARD);
        addNode(node, parsegraph_BACKWARD);
        addNode(node, parsegraph_FORWARD);
    }

    // Execute the action on allowed nodes.
    for(var i = ordering.length - 1; i >= 0; --i) {
        actionFunc.call(thisArg, ordering[i]);
    }

    return ordering;
};

parsegraph_Node.prototype.spawnNode = function(spawnDirection, newType)
{
    // Ensure the node can be spawned in the given direction.
    if(spawnDirection == parsegraph_OUTWARD ||
        spawnDirection == parsegraph_NULL_NODE_DIRECTION) {
        throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
    }
    if(spawnDirection == this.parentDirection()) {
        throw parsegraph_createException(parsegraph_ALREADY_OCCUPIED);
    }
    if(this.hasNode(spawnDirection)) {
        throw parsegraph_createException(parsegraph_ALREADY_OCCUPIED);
    }

    // Update the neighbor record.
    var neighbor = this._neighbors[spawnDirection];

    // Looks good; create the node.
    var node = new parsegraph_Node(
        this._graph,
        newType,
        this,
        parsegraph_reverseNodeDirection(spawnDirection)
    );
    neighbor.setNode(node);

    // Parent it to ourselves.

    // Allow alignements to be set before children are spawned.
    if(neighbor.alignmentMode() == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.setAlignmentMode(parsegraph_DO_NOT_ALIGN);
    }

    this.layoutWasChanged(spawnDirection);
};

/**
 * Removes the node in the given direction, destroying it and its children
 * in the process.
 *
 * Does nothing if no node is in the given direction.
 */
parsegraph_Node.prototype.eraseNode = function(givenDirection) {
    if(!this.hasNode(givenDirection)) {
        return;
    }
    if(!this.isRoot() && givenDirection == this.parentDirection()) {
        throw parsegraph_createException(parsegraph_CANNOT_AFFECT_PARENT);
    }
    this._neighbors[givenDirection].erase();
};

parsegraph_Node.prototype.scaleAt = function(direction)
{
    return this.nodeAt(direction).scale();
};

parsegraph_Node.prototype.x = function()
{
    if(this.isRoot()) {
        return 0;
    }
    //this.nodeParent().commitLayout();
    return this.nodeParent()._neighbors[parsegraph_reverseNodeDirection(this.parentDirection())].x();
};

parsegraph_Node.prototype.y = function()
{
    if(this.isRoot()) {
        return 0;
    }
    //this.nodeParent().commitLayout();
    return this.nodeParent()._neighbors[parsegraph_reverseNodeDirection(this.parentDirection())].y();
};

parsegraph_Node.prototype.lineLengthAt = function(direction)
{
    return this._neighbors[direction].lineLength();
};

parsegraph_Node.prototype.extentsAt = function(atDirection)
{
    //this.commitLayout();
    return this._neighbors[atDirection].extent();
};

parsegraph_Node.prototype.extentOffsetAt = function(atDirection)
{
    //this.commitLayout();
    return this._neighbors[atDirection].extentOffset();
};

parsegraph_Node.prototype.extentSize = function()
{
    var rv = new parsegraph_Size();

    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    rv.setHeight(
        this.extentsAt(parsegraph_FORWARD).boundingValues()[0]
    );

    // The vertical extents have length in the vertical direction.
    rv.setWidth(
        this.extentsAt(parsegraph_DOWNWARD).boundingValues()[0]
    );

    return rv;
};

parsegraph_Node.prototype.dumpExtentBoundingRect = function()
{
    // extent.boundingValues() returns [totalLength, minSize, maxSize]
    var backwardOffset = this.extentOffsetAt(parsegraph_BACKWARD);
    var backwardValues = this.extentsAt(parsegraph_BACKWARD).boundingValues();
    this.extentsAt(parsegraph_BACKWARD).dump(
        "Backward extent (center at " + backwardOffset + ")"
    );

    var forwardOffset = this.extentOffsetAt(parsegraph_FORWARD);
    var forwardValues = this.extentsAt(parsegraph_FORWARD).boundingValues();
    this.extentsAt(parsegraph_FORWARD).dump(
        "Forward extent (center at " + forwardOffset + ")"
    );

    var downwardOffset = this.extentOffsetAt(parsegraph_DOWNWARD);
    var downwardValues = this.extentsAt(parsegraph_DOWNWARD).boundingValues();
    this.extentsAt(parsegraph_DOWNWARD).dump(
        "Downward extent (center at " + downwardOffset + ")"
    );

    var upwardOffset = this.extentOffsetAt(parsegraph_UPWARD);
    var upwardValues = this.extentsAt(parsegraph_UPWARD).boundingValues();
    this.extentsAt(parsegraph_UPWARD).dump(
        "Upward extent (center at " + upwardOffset + ")"
    );

    /*parsegraph_log("Backward values: " + backwardValues);
    parsegraph_log("Forward values: " + forwardValues);
    parsegraph_log("Upward values: " + upwardValues);
    parsegraph_log("Downward values: " + downwardValues);*/
};

parsegraph_Node.prototype.commitAbsolutePos = function()
{
    //this.commitLayout();

    if(this._absoluteXPos !== null) {
        // No need for an update, so just return.
        return;
    }

    // Retrieve a stack of nodes to determine the absolute position.
    var node = this;
    var nodeList = [];
    var parentScale = 1.0;
    var scale = 1.0;
    while(true) {
        if(node.isRoot()) {
            this._absoluteXPos = 0;
            this._absoluteYPos = 0;
            break;
        }

        nodeList.push(parsegraph_reverseNodeDirection(node.parentDirection()));
        node = node.nodeParent();
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromRoot];
    for(var i = nodeList.length - 1; i >= 0; --i) {
        var directionToChild = nodeList[i];

        this._absoluteXPos += node.x() * parentScale;
        this._absoluteYPos += node.y() * parentScale;

        parentScale = scale;
        scale *= node.scaleAt(directionToChild);
        node = node.nodeAt(directionToChild);
    }

    this._absoluteXPos += node.x() * parentScale;
    this._absoluteYPos += node.y() * parentScale;
    this._absoluteScale = scale;

    this.eachChild(function(node) {
        node.positionWasChanged();
    }, this);
};

parsegraph_Node.prototype.eachChild = function(visitor, visitorThisArg)
{
    this._neighbors.forEach(
        function(neighbor, direction) {
            if(!neighbor.hasNode() || direction == this.parentDirection()) {
                return;
            }
            visitor.call(visitorThisArg, neighbor.node(), direction);
        },
        this
    );
};

parsegraph_Node.prototype.positionWasChanged = function()
{
    this._absoluteXPos = null;
    this._absoluteYPos = null;
};

parsegraph_Node.prototype.absoluteX = function()
{
    this.commitAbsolutePos();
    return this._absoluteXPos;
};

parsegraph_Node.prototype.absoluteY = function()
{
    this.commitAbsolutePos();
    return this._absoluteYPos;
};

parsegraph_Node.prototype.absoluteScale = function()
{
    this.commitAbsolutePos();
    return this._absoluteScale;
};

parsegraph_Node.prototype.setLayoutPreference = function(given)
{
    this._layoutPreference = given;
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.setNodeAlignmentMode = function(inDirection, newAlignmentMode)
{
    this._neighbors[inDirection].setAlignmentMode(newAlignmentMode);
    this.layoutWasChanged(inDirection);
};

parsegraph_Node.prototype.nodeAlignmentMode = function(inDirection)
{
    return this._neighbors[inDirection].alignmentMode();
};

parsegraph_Node.prototype.setPosAt = function(inDirection, x, y)
{
    this._neighbors[inDirection].setPos(x, y);
};

parsegraph_Node.prototype.type = function()
{
    return this._type;
};

parsegraph_Node.prototype.setType = function(newType)
{
    this._type = newType;
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.typeAt = function(direction)
{
    return this.nodeAt(direction).type();
};

/**
 * Returns the separation between this node and the node
 * in the given direction.
 *
 * Throws NO_NODE_FOUND if no node is in the given direction.
 *
 * This commits the layout.
 */
parsegraph_Node.prototype.separationAt = function(inDirection) {
    //this.commitLayout();

    // Exclude some directions that cannot be calculated.
    if(!parsegraph_isCardinalDirection(inDirection)) {
        throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
    }

    // If the given direction is the parent's direction, use
    // their measurement instead.
    if(!this.isRoot() && inDirection == this.parentDirection()) {
        return this.nodeParent().separationAt(
            parsegraph_reverseNodeDirection(inDirection)
        );
    }

    if(!this.hasNode(inDirection)) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }

    return this._neighbors[inDirection].separation();
};

/**
 * Indicate that the layout was changed and thus needs an layout commit.
 */
parsegraph_Node.prototype.layoutWasChanged = function(changeDirection)
{
    // Disallow null change directions.
    if(changeDirection == parsegraph_NULL_NODE_DIRECTION) {
        throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
    }

    // Notifies children that may need to move due to this layout change.
    var notifyChild = function(direction) {
        // Don't recurse into the parent direction.
        if(!this.isRoot() && direction == this.parentDirection()) {
            return;
        }

        // Ignore empty node directions.
        if(!this.hasNode(direction)) {
            return;
        }

        // Recurse the layout change to the affected node.
        this.nodeAt(direction).positionWasChanged(
            parsegraph_reverseNodeDirection(direction)
        );
    };

    var node = this;
    while(node !== null) {
        var oldLayoutState = node._layoutState;

        // Set the needs layout flag.
        node._layoutState = parsegraph_NEEDS_COMMIT;

        // Recurse for the children of this node.
        notifyChild.call(node, parsegraph_DOWNWARD);
        notifyChild.call(node, parsegraph_UPWARD);
        notifyChild.call(node, parsegraph_BACKWARD);
        notifyChild.call(node, parsegraph_FORWARD);
        notifyChild.call(node, parsegraph_INWARD);

        if(node.isRoot()) {
            break;
        }
        else if(oldLayoutState == parsegraph_COMMITTED_LAYOUT) {
            // Notify our parent, if we were previously committed.
            node = node.nodeParent();
            changeDirection = parsegraph_reverseNodeDirection(
                node.parentDirection()
            );
        }
        else {
            // Completed.
            break;
        }
    }
};

parsegraph_Node.prototype.canonicalLayoutPreference = function()
{
    // Root nodes do not have a canonical layout preference.
    if(this.isRoot()) {
        throw parsegraph_createException(parsegraph_NODE_IS_ROOT);
    }

    // Convert the layout preference to either preferring the parent or
    // the perpendicular axis.
    var canonicalPref = this._layoutPreference;
    switch(this._layoutPreference) {
    case parsegraph_PREFER_HORIZONTAL_AXIS:
    {
        if(
            parsegraph_getNodeDirectionAxis(this.parentDirection()) ==
            parsegraph_HORIZONTAL_AXIS
        ) {
            canonicalPref = parsegraph_PREFER_PARENT_AXIS;
        }
        else {
            canonicalPref = parsegraph_PREFER_PERPENDICULAR_AXIS;
        }
        break;
    }
    case parsegraph_PREFER_VERTICAL_AXIS:
    {
        if(
            parsegraph_getNodeDirectionAxis(this.parentDirection()) ==
            parsegraph_VERTICAL_AXIS
        ) {
            canonicalPref = parsegraph_PREFER_PARENT_AXIS;
        }
        else {
            canonicalPref = parsegraph_PREFER_PERPENDICULAR_AXIS;
        }
        break;
    }
    case parsegraph_PREFER_PERPENDICULAR_AXIS:
    case parsegraph_PREFER_PARENT_AXIS:
        canonicalPref = this._layoutPreference;
        break;
    case parsegraph_NULL_LAYOUT_PREFERENCE:
        throw parsegraph_createException(parsegraph_BAD_LAYOUT_PREFERENCE);
    }
    return canonicalPref;
};

parsegraph_Node.prototype.destroy = function()
{
    this._parentDirection = parsegraph_NULL_NODE_DIRECTION;
    this._layoutState = parsegraph_NULL_LAYOUT_STATE;
    this._neighbors.forEach(function(neighbor, direction) {
        // Clear all children.
        if(this.parentDirection() !== direction) {
            neighbor.clear();
        }
    }, this);
    this._neighbors = [];
    this._scale = 1.0;
};

parsegraph_Node.prototype.label = function()
{
    return this._label;
};

parsegraph_Node.prototype.setLabel = function(label)
{
    this._label = label;
};

parsegraph_Node.prototype.blockStyle = function()
{
    switch(this.type()) {
    case parsegraph_BUD:
    {
        return parsegraph_BUD_STYLE;
    }
    case parsegraph_SLOT:
    {
        return parsegraph_SLOT_STYLE;
    }
    case parsegraph_BLOCK:
    {
        return parsegraph_BLOCK_STYLE;
    }
    case parsegraph_NULL_NODE_TYPE:
    default:
        throw new Error("Type must not be null");
    }
};

parsegraph_Node.prototype.isSelectedAt = function(direction)
{
    if(!this.hasNode(direction)) {
        return false;
    }
    return this.nodeAt(direction).isSelected();
};

parsegraph_Node.prototype.sizeIn = function(direction)
{
    var rv = this.size();
    if(parsegraph_isVerticalNodeDirection(direction)) {
        return rv.height() / 2;
    }
    else {
        return rv.width() / 2;
    }
};

parsegraph_Node.prototype.brightness = function()
{
    if(this.type() == parsegraph_BUD) {
        return 2 * this._brightness;
    }
    return this._brightness;
};

parsegraph_Node.prototype.setBrightness = function(brightness)
{
    this._brightness = brightness;
};

parsegraph_Node.prototype.brightnessColor = function()
{
    return this._brightnessColor;
};

parsegraph_Node.prototype.setBrightnessColor = function(brightnessColor)
{
    this._brightnessColor = brightnessColor;
};

parsegraph_Node.prototype.borderThickness = function()
{
    return this.blockStyle().borderThickness;
};

parsegraph_Node.prototype.size = function()
{
    var bodySize = this.sizeWithoutPadding();
    return parsegraph_createSize(
        bodySize.width() + 2 * this.horizontalPadding() + 2 * this.borderThickness(),
        bodySize.height() + 2 * this.verticalPadding() + 2 * this.borderThickness()
    );
};

parsegraph_Node.prototype.absoluteSize = function()
{
    return this.size().scaled(this.absoluteScale());
};

parsegraph_Node.prototype.sizeWithoutPadding = function()
{
    // Find the size of this node's drawing area.
    var bodySize = parsegraph_createSize();

    var style = this.blockStyle();

    if(this.label() !== undefined) {
        // This reference to the painter seems to be an wart of the design.
        var textMetrics = this._graph._nodePainter._textPainter.measureText(
            this.label(),
            style.fontSize,
            style.fontSize * style.letterWidth * style.maxLabelChars
        );
        bodySize.setWidth(
            Math.max(style.minWidth, textMetrics[0])
        );
        bodySize.setHeight(
            Math.max(style.minHeight, textMetrics[1])
        );
    }
    else {
        bodySize.setWidth(style.minWidth);
        bodySize.setHeight(style.minHeight);
    }
    if(this.hasNode(parsegraph_INWARD)) {
        var nestedNode = this.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();

        if(this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            bodySize.setWidth(
                Math.max(bodySize.width(), nestedSize.width() * nestedNode.scale())
            );

            if(this.label() !== undefined) {
                bodySize.setHeight(
                    bodySize.height()
                    + this.verticalPadding()
                    + nestedSize.height() * nestedNode.scale()
                );
            }
            else {
                bodySize.setHeight(
                    nestedSize.height() * nestedNode.scale()
                    + 2 * this.verticalPadding()
                );
            }
        }
        else {
            // Align horizontal.
            if(this.label() !== undefined) {
                bodySize.setWidth(
                    bodySize.width()
                    + this.horizontalPadding()
                    + nestedNode.scale() * nestedSize.width()
                );
            }
            else {
                bodySize.setWidth(
                    nestedNode.scale() * nestedSize.width()
                );
            }

            bodySize.setHeight(
                Math.max(
                    bodySize.height(),
                    nestedNode.scale() * nestedSize.height()
                    + 2 * this.verticalPadding()
                )
            );
        }
    }

    // Buds appear circular
    if(this.type() == parsegraph_BUD) {
        var aspect = bodySize.width() / bodySize.height();
        if(aspect < 2 && aspect > 1 / 2) {
            bodySize.setWidth(
                Math.max(bodySize.width(), bodySize.height())
            );
            bodySize.setHeight(bodySize.width());
        }
    }

    return bodySize;
};

parsegraph_Node.prototype.horizontalPadding = function(direction)
{
    return this.blockStyle().horizontalPadding;
};

parsegraph_Node.prototype.verticalPadding = function(direction)
{
    return this.blockStyle().verticalPadding;
};

parsegraph_Node.prototype.verticalSeparation = function(direction)
{
    if(this.type() == parsegraph_BUD && this.typeAt(direction) == parsegraph_BUD) {
        return this.blockStyle().verticalSeparation + parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION;
    }
    return this.blockStyle().verticalSeparation;
};

parsegraph_Node.prototype.horizontalSeparation = function(direction)
{
    var style = this.blockStyle();

    if(this.hasNode(direction) && this.nodeAt(direction).type() == parsegraph_BUD
        && !this.nodeAt(direction).hasAnyNodes()
    ) {
        return parsegraph_BUD_LEAF_SEPARATION * style.horizontalSeparation;
    }
    return style.horizontalSeparation;
};

parsegraph_Node.prototype.isSelected = function()
{
    return this._selected;
};

parsegraph_Node.prototype.setSelected = function(selected)
{
    this._selected = selected;
};
