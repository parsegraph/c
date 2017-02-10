/**
 * Creates a new Node.
 *
 * parsegraph_Node(newType) - no parent
 * parsegraph_Node(newType, parentNode, parentDirection)
 */
function parsegraph_Node(newType, fromNode, parentDirection)
{
    this._neighbors = parsegraph_createNeighbors();
    this._clickListener = null;

    this._type = newType;
    this._style = parsegraph_style(this._type);
    this._label = undefined;
    this._labelX = undefined;
    this._labelY = undefined;

    this._value = null;

    this._layoutState = parsegraph_NEEDS_COMMIT;

    this._scale = 1.0;

    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;

    this._selected = false;

    this._nodeFit = parsegraph_NODE_FIT_LOOSE;

    this._paintGroup = null;

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

parsegraph_Node.prototype.graph = function()
{
    return this._graph;
};

/**
 * Returns the color that should be used as the background color for inward nodes.
 */
parsegraph_Node.prototype.backdropColor = function()
{
    var node = this;
    while(true) {
        if(node.isRoot()) {
            return parsegraph_BACKGROUND_COLOR;
        }
        if(node.parentDirection() === parsegraph_OUTWARD) {
            if(node.isSelected()) {
                return node.parentNode().blockStyle().backgroundColor;
            }
            return node.parentNode().blockStyle().selectedBackgroundColor;
        }
        node = node.parentNode();
    }
};

parsegraph_Node.prototype.setClickListener = function(listener, thisArg)
{
    if(!listener) {
        this._clickListener = null;
    }
    else {
        if(!thisArg) {
            thisArg = this;
        }
        this._clickListener = [listener, thisArg];
    }
};

parsegraph_Node.prototype.nodeUnderCoords = function(x, y, userScale)
{
    //console.log("nodeUnderCoords: " + x + ", " + y)
    if(userScale === undefined) {
        userScale = 1;
    }

    /**
     * Returns true if the coordinates are in the node.
     */
    var inNodeBody = function(node) {
        if(
            x < userScale * node.absoluteX()
                - userScale * node.absoluteScale() * node.size().width()/2
        ) {
            //console.log("INB 1" + x + " against " + node.absoluteX());
            return false;
        }
        if(
            x > userScale * node.absoluteX()
                + userScale * node.absoluteScale() * node.size().width()/2
        ) {
            //console.log("INB 2");
            return false;
        }
        if(
            y < userScale * node.absoluteY()
                - userScale * node.absoluteScale() * node.size().height()/2
        ) {
            //console.log("INB 3");
            return false;
        }
        if(
            y > userScale * node.absoluteY()
                + userScale * node.absoluteScale() * node.size().height()/2
        ) {
            //console.log("INB 4");
            return false;
        }

        //console.log("Within node body" + node);
        return true;
    };

    /**
     * Returns true if the coordinates are in the node or its extent.
     */
    var inNodeExtents = function(node) {
        if(
            x < userScale * node.absoluteX() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_DOWNWARD)
        ) {
            return false;
        }
        if(
            x > userScale * node.absoluteX() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_DOWNWARD)
                + userScale * node.absoluteScale() * node.extentSize().width()
        ) {
            return false;
        }
        if(
            y < userScale * node.absoluteY() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_FORWARD)
        ) {
            return false;
        }
        if(
            y > userScale * node.absoluteY() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_FORWARD)
                + userScale * node.absoluteScale() * node.extentSize().height()
        ) {
            return false;
        }
        return true;
    };

    var candidates = [this];

    var addCandidate = function(node, direction) {
        if(direction !== undefined) {
            if(!node.hasChildAt(direction)) {
                return;
            }
            node = node.nodeAt(direction);
        }
        if(node == null) {
            return;
        }
        candidates.push(node);
    };

    var FORCE_SELECT_PRIOR = {};
    while(candidates.length > 0) {
        var candidate = candidates[candidates.length - 1];

        if(candidate === FORCE_SELECT_PRIOR) {
            candidates.pop();
            return candidates.pop();
        }

        if(inNodeBody(candidate)) {
            //console.log("Click is in node body");
            if(
                candidate.hasNode(parsegraph_INWARD)
            ) {
                if(inNodeExtents(candidate.nodeAt(parsegraph_INWARD))) {
                    //console.log("Testing inward node");
                    candidates.push(FORCE_SELECT_PRIOR);
                    candidates.push(candidate.nodeAt(parsegraph_INWARD));
                    continue;
                }
                else {
                    //console.log("Click not in inward extents");
                }
            }

            // Found the node.
            //console.log("Found node.");
            return candidate;
        }
        // Not within this node, so remove it as a candidate.
        candidates.pop();

        // Test if the click is within any child.
        if(!inNodeExtents(candidate)) {
            // Nope, so continue the search.
            continue;
        }
        //console.log("Click is in node extent");

        // It is potentially within some child, so search the children.
        if(Math.abs(y - userScale * candidate.absoluteY()) > Math.abs(x - userScale * candidate.absoluteX())) {
            // Y extent is greater than X extent.
            if(userScale * candidate.absoluteX() > x) {
                addCandidate(candidate, parsegraph_BACKWARD);
                addCandidate(candidate, parsegraph_FORWARD);
            }
            else {
                addCandidate(candidate, parsegraph_FORWARD);
                addCandidate(candidate, parsegraph_BACKWARD);
            }
            if(userScale * candidate.absoluteY() > y) {
                addCandidate(candidate, parsegraph_UPWARD);
                addCandidate(candidate, parsegraph_DOWNWARD);
            }
            else {
                addCandidate(candidate, parsegraph_DOWNWARD);
                addCandidate(candidate, parsegraph_UPWARD);
            }
        }
        else {
            // X extent is greater than Y extent.
            if(userScale * candidate.absoluteY() > y) {
                addCandidate(candidate, parsegraph_UPWARD);
                addCandidate(candidate, parsegraph_DOWNWARD);
            }
            else {
                addCandidate(candidate, parsegraph_DOWNWARD);
                addCandidate(candidate, parsegraph_UPWARD);
            }
            if(userScale * candidate.absoluteX() > x) {
                addCandidate(candidate, parsegraph_BACKWARD);
                addCandidate(candidate, parsegraph_FORWARD);
            }
            else {
                addCandidate(candidate, parsegraph_FORWARD);
                addCandidate(candidate, parsegraph_BACKWARD);
            }
        }
    }

    //console.log("Found nothing.");
    return null;
};

/**
 * Given a click in world (absolute) coordinates, return the index into this node's label.
 *
 * If this node's label === undefined, then null is returned. Otherwise, a value between
 * [0, this.label().length()] is returned. Zero indicates a position before the first
 * character, just as this.label().length() indicates a position past the end.
 *
 * World coordinates are clamped to the boundaries of the node.
 */
parsegraph_Node.prototype.clickToCaret = function(worldX, worldY)
{
    if(this.label() === undefined) {
        return null;
    }

    var labelPosition = this.getLabelPosition();
    var style = this.blockStyle();
    var caretPos = this.paintGroup().worldToTextCaret(
        this.label(),
        style.fontSize * this.absoluteScale(),
        style.maxLabelChars * style.fontSize * style.letterWidth * this.absoluteScale(),
        worldX - labelPosition[0],
        worldY - labelPosition[1]
    );
};

parsegraph_Node.prototype.getLabelSize = function()
{
    return this.paintGroup().measureText(this.label(), this.blockStyle());
};

parsegraph_Node.prototype.getLabelPosition = function()
{
    return [this._labelX, this._labelY];
};

parsegraph_Node.prototype.setPaintGroup = function(paintGroup)
{
    this._paintGroup = paintGroup;
};

/**
 * Returns the node's paint group. If this node does not have a paint group, then
 * the parent's is returned.
 */
parsegraph_Node.prototype.paintGroup = function()
{
    var node = this;
    while(!node.isRoot()) {
        if(node._paintGroup) {
            return node._paintGroup;
        }
        node = node.parentNode();
    }

    return node._paintGroup;
};

/**
 * Returns whether this Node has a command handler.
 */
parsegraph_Node.prototype.hasClickListener = function()
{
    return this._clickListener != null;
};

/**
 * Invokes the click listener on this node.
 *
 * Does nothing if no click listener is present.
 */
parsegraph_Node.prototype.click = function()
{
    // Invoke the click listener.
    if(!this.hasClickListener()) {
        return;
    }
    return this._clickListener[0].apply(this._clickListener[1], arguments);
};

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
parsegraph_Node.prototype.parentNode = parsegraph_Node.prototype.nodeParent;
parsegraph_Node.prototype.parent = parsegraph_Node.prototype.nodeParent;

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
    if(spawnDirection == parsegraph_OUTWARD) {
        throw new Error("By rule, nodes cannot be spawned in the outward direction.");
    }
    if(spawnDirection == parsegraph_NULL_NODE_DIRECTION) {
        throw new Error("Nodes cannot be spawned in the null node direction.");
    }
    if(spawnDirection == this.parentDirection()) {
        throw new Error("Cannot spawn in a node in the parent's direction (" + parsegraph_nameNodeDirection(spawnDirection));
    }
    if(this.hasNode(spawnDirection)) {
        throw new Error("Cannot spawn in a node in the already occupied " + parsegraph_nameNodeDirection(spawnDirection) + " direction. Parent is in the " + parsegraph_nameNodeDirection(this.parentDirection()) + " direction.");
    }
    if(this.type() == parsegraph_SLIDER) {
        throw new Error("Sliders cannot have child nodes.");
    }
    if(this.type() == parsegraph_SCENE && spawnDirection == parsegraph_INWARD) {
        throw new Error("Scenes cannot have inward nodes.");
    }

    // Update the neighbor record.
    var neighbor = this._neighbors[spawnDirection];

    // Looks good; create the node.
    var node = new parsegraph_Node(
        newType,
        this,
        parsegraph_reverseNodeDirection(spawnDirection)
    );
    neighbor.setNode(node);

    // Allow alignments to be set before children are spawned.
    if(neighbor.alignmentMode() == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.setAlignmentMode(parsegraph_DO_NOT_ALIGN);
    }

    this.layoutWasChanged(spawnDirection);

    // Use the node fitting of the parent.
    node.setNodeFit(this.nodeFit());

    // The child will use this node's paint group.
    node.setPaintGroup(this.paintGroup());

    return node;
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
    this.layoutWasChanged(givenDirection);
};

parsegraph_Node.prototype.disconnectNode = function(inDirection)
{
    if(!this.hasNode(givenDirection)) {
        return;
    }
    // Connect the node.
    var neighbor = this._neighbors[inDirection];
    var disconnected = neighbor.node();
    neighbor.erase();
    disconnected.setParent(null);
    this.layoutWasChanged(inDirection);
    return disconnected;
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
    this.commitLayoutIteratively();
    return this._neighbors[atDirection].extent();
};

parsegraph_Node.prototype.extentOffsetAt = function(atDirection)
{
    this.commitLayoutIteratively();
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
    this._style = parsegraph_style(this._type);
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.value = function()
{
    return this._value;
};

parsegraph_Node.prototype.setValue = function(newValue)
{
    this._value = newValue;
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

        if(node.paintGroup()) {
            node.paintGroup().markDirty();
        }

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
    if(this._label == label) {
        return;
    }
    this._label = label;
    this.layoutWasChanged();
};

parsegraph_Node.prototype.blockStyle = function()
{
    return this._style;
};

parsegraph_Node.prototype.setBlockStyle = function(style)
{
    if(this._style == style) {
        // Ignore idempotent style changes.
        return;
    }
    this._style = style;
    this.layoutWasChanged();
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

/**
 * Returns the size of this node, based on this node's type and label.
 *
 * Sliders appear like blocks, though they render buds and their own lines internally.
 * Scenes also appear like boxes.
 *
 * Consequently, since these types work like blocks, there is no special code for them here.
 */
parsegraph_Node.prototype.sizeWithoutPadding = function()
{
    // Find the size of this node's drawing area.
    var bodySize = parsegraph_createSize();

    var style = this.blockStyle();
    if(this.label() !== undefined) {
        if(!this.paintGroup()) {
            throw new Error("Label size cannot be determined without a paint group.");
        }
        var textMetrics = this.paintGroup().measureText(this.label(), style);
        if(!textMetrics) {
            throw new Error("Label size cannot be determined without the painter first being assigned.");
        }
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

parsegraph_Node.prototype.connectNode = function(inDirection, node)
{
    // Ensure the node can be connected in the given direction.
    if(inDirection == parsegraph_OUTWARD) {
        throw new Error("By rule, nodes cannot be spawned in the outward direction.");
    }
    if(inDirection == parsegraph_NULL_NODE_DIRECTION) {
        throw new Error("Nodes cannot be spawned in the null node direction.");
    }
    if(inDirection == this.parentDirection()) {
        throw new Error("Cannot connect a node in the parent's direction (" + parsegraph_nameNodeDirection(inDirection));
    }
    if(this.hasNode(inDirection)) {
        throw new Error("Cannot connect a node in the already occupied " + parsegraph_nameNodeDirection(inDirection) + " direction.");
    }
    if(this.type() == parsegraph_SLIDER) {
        throw new Error("Sliders cannot have child nodes.");
    }
    if(this.type() == parsegraph_SCENE && spawnDirection == parsegraph_INWARD) {
        throw new Error("Scenes cannot have inward nodes.");
    }
    if(node.parentDirection() !== parsegraph_NULL_NODE_DIRECTION) {
        throw new Error("Node to connect must not have a parent.");
    }
    if(node.hasNode(parsegraph_reverseNodeDirection(inDirection))) {
        throw new Error("Node to connect must not have a node in the connecting direction.");
    }

    // Connect the node.
    var neighbor = this._neighbors[inDirection];
    neighbor.setNode(node);
    node.setParent(this, parsegraph_reverseNodeDirection(inDirection));

    if(neighbor.alignmentMode() == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.setAlignmentMode(parsegraph_DO_NOT_ALIGN);
    }

    this.layoutWasChanged(inDirection);

    return node;
};

parsegraph_Node.prototype.setParent = function(fromNode, parentDirection)
{
    this._neighbors[parentDirection].setNode(fromNode);
    this._parentDirection = parentDirection;
};
parsegraph_Node.prototype.setParentNode = parsegraph_Node.prototype.setParent;

parsegraph_Node.prototype.isSelected = function()
{
    return this._selected;
};

parsegraph_Node.prototype.setSelected = function(selected)
{
    this._selected = selected;
};

function parsegraph_labeledBud(label)
{
    var node = new parsegraph_Node(parsegraph_BUD);
    node.setLabel(label);
    return node;
};

function parsegraph_labeledSlot(label)
{
    var node = new parsegraph_Node(parsegraph_SLOT);
    node.setLabel(label);
    return node;
};

function parsegraph_labeledBlock(label)
{
    var node = new parsegraph_Node(parsegraph_BLOCK);
    node.setLabel(label);
    return node;
};
