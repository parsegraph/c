parsegraph_NODES_PAINTED = 0;
parsegraph_Node_COUNT = 0;

function parsegraph_Node(newType, fromNode, parentDirection)
{
    this._id = parsegraph_Node_COUNT++;

    // Appearance
    this._type = newType;
    this._style = parsegraph_style(this._type);
    this._rightToLeft = parsegraph_RIGHT_TO_LEFT;
    this._selected = false;
    this._scale = 1.0;
    this._scene = null;

    // Layout
    this._neighbors = [];
    for(var i = 0; i < parsegraph_NUM_DIRECTIONS; ++i) {
        this._neighbors.push({
            direction: i,
            extent: new parsegraph_Extent(),
            extentOffset: 0,
            alignmentMode: parsegraph_NULL_NODE_ALIGNMENT,
            alignmentOffset: 0,
            separation: 0,
            lineLength: 0,
            xPos: 0,
            yPos: 0,
            node: null
        });
    }
    this._nodeFit = parsegraph_NODE_FIT_LOOSE;
    this._layoutState = parsegraph_NEEDS_COMMIT;
    this._absoluteVersion = 0;
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;
    this._groupXPos = null;
    this._groupYPos = null;
    this._groupScale = null;
    this._layoutPrev = this;
    this._layoutNext = this;

    // Paint groups.
    this._dirty = true;
    this._painter = null;
    this._paintGroupNext = this;
    this._paintGroupPrev = this;
    this._isPaintGroup = false;
    this._previousPaintState = null;
    this._currentPaintGroup = null;

    // Event listeners
    this._ignoresMouse = true;
    this._keyListener = null;
    this._keyListenerThisArg = null;
    this._clickListener = null;
    this._clickListenerThisArg = null;
    this._changeListener = null;
    this._changeListenerThisArg = null;
    this._prevTabNode = null;
    this._nextTabNode = null;

    // Labels.
    this._label = null;
    this._labelX = null;
    this._labelY = null;

    // User data
    this._value = null;

    // Check if a parent node was provided.
    if(fromNode != null) {
        // A parent node was provided; this node is a child.
        fromNode.connectNode(parentDirection, this);
        this._layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
    }
    else {
        // No parent was provided; this node is a root.
        this._parentDirection = parsegraph_NULL_NODE_DIRECTION;
        this._layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
    }
}

function parsegraph_chainTab(a, b, swappedOut)
{
    if(swappedOut) {
        swappedOut[0] = a ? a._nextTabNode : null;
        swappedOut[1] = b ? b._prevTabNode : null;
    }
    //console.log(a, b);
    if(a) {
        a._nextTabNode = b;
    }
    if(b) {
        b._prevTabNode = a;
    }
}

function parsegraph_chainAllTabs()
{
    if(arguments.length < 2) {
        return;
    }
    var firstNode = arguments[0];
    var lastNode = arguments[arguments.length - 1];

    for(var i = 0; i <= arguments.length - 2; ++i) {
        parsegraph_chainTab(
            arguments[i], arguments[i + 1]
        );
    }
    parsegraph_chainTab(lastNode, firstNode);
}

parsegraph_Node.prototype.root = function()
{
    var p = this;
    while(!p.isRoot()) {
        p = p.parentNode();
    }
    return p;
};

parsegraph_Node.prototype.toString = function()
{
    return "[parsegraph_Node " + this._id + "]";
};

parsegraph_Node.prototype.x = function()
{
    if(this.isRoot()) {
        return 0;
    }
    return this.nodeParent()._neighbors[parsegraph_reverseNodeDirection(this.parentDirection())].xPos;
};

parsegraph_Node.prototype.y = function()
{
    if(this.isRoot()) {
        return 0;
    }
    return this.nodeParent()._neighbors[parsegraph_reverseNodeDirection(this.parentDirection())].yPos;
};

parsegraph_Node.prototype.scale = function()
{
    return this._scale;
}

parsegraph_Node.prototype.setScale = function(scale)
{
    this._scale = scale;
    this.layoutWasChanged(parsegraph_INWARD);
}

parsegraph_Node.prototype.setRightToLeft = function(val)
{
    this._rightToLeft = !!val;
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.rightToLeft = function()
{
    return this._rightToLeft;
};

parsegraph_Node.prototype.commitAbsolutePos = function()
{
    if(this._absoluteXPos !== null
        && (!this.isRoot()
            && this._absoluteVersion === this.parentNode().findPaintGroup()._absoluteVersion
    )) {
        // No need for an update, so just return.
        return;
    }
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;

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

        var par = node.nodeParent();
        if(par._absoluteXPos !== null) {
            // Just use the parent's absolute position to start.
            this._absoluteXPos = par._absoluteXPos;
            this._absoluteYPos = par._absoluteYPos;
            scale = par._absoluteScale * node.scale();
            parentScale = par._absoluteScale;
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
    if(!this.isRoot()) {
        this._absoluteVersion = this.parentNode().findPaintGroup()._absoluteVersion;
    }
};

parsegraph_Node.prototype.needsCommit = function()
{
    return this._layoutState === parsegraph_NEEDS_COMMIT;
};

parsegraph_Node.prototype.needsPosition = function()
{
    return this.needsCommit() || this._groupXPos === null;
};

parsegraph_Node.prototype.absoluteX = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteXPos;
};

parsegraph_Node.prototype.absoluteY = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteYPos;
};

parsegraph_Node.prototype.absoluteScale = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    this.commitAbsolutePos();
    return this._absoluteScale;
};

parsegraph_Node.prototype.commitGroupPos = function()
{
    if(this._groupXPos !== null) {
        // No need for an update, so just return.
        return;
    }

    // Retrieve a stack of nodes to determine the group position.
    var node = this;
    var nodeList = [];
    var parentScale = 1.0;
    var scale = 1.0;
    while(true) {
        if(node.isRoot() || node.localPaintGroup()) {
            this._groupXPos = 0;
            this._groupYPos = 0;
            break;
        }

        var par = node.nodeParent();
        if(par._groupXPos !== null) {
            // Just use the parent's position to start.
            this._groupXPos = par._groupXPos;
            this._groupYPos = par._groupYPos;
            scale = par._groupScale * node.scale();
            parentScale = par._groupScale;
            break;
        }

        nodeList.push(parsegraph_reverseNodeDirection(node.parentDirection()));
        node = node.nodeParent();
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromGroupParent];
    for(var i = nodeList.length - 1; i >= 0; --i) {
        var directionToChild = nodeList[i];

        if(i !== nodeList.length - 1) {
            this._groupXPos += node.x() * parentScale;
            this._groupYPos += node.y() * parentScale;
        }

        parentScale = scale;
        scale *= node.scaleAt(directionToChild);
        node = node.nodeAt(directionToChild);
    }
    //console.log("Assigning scale for " + this + " to " + scale);
    this._groupScale = scale;

    if(!this.localPaintGroup()) {
        this._groupXPos += node.x() * parentScale;
        this._groupYPos += node.y() * parentScale;
    }
};

parsegraph_Node.prototype.groupX = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    return this._groupXPos;
};

parsegraph_Node.prototype.groupY = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    return this._groupYPos;
};

parsegraph_Node.prototype.groupScale = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    return this._groupScale;
};

parsegraph_Node.prototype.setPosAt = function(inDirection, x, y)
{
    this._neighbors[inDirection].xPos = x;
    this._neighbors[inDirection].yPos = y;
};

parsegraph_Node.prototype.removeFromLayout = function(inDirection)
{
    var disconnected = this.nodeAt(inDirection);
    if(!disconnected) {
        return;
    }
    var layoutAfter = this.findLaterLayoutSibling(inDirection);
    var layoutBefore = this.findEarlierLayoutSibling(inDirection);
    var earliestDisc = disconnected.findLayoutHead(disconnected);

    if(layoutBefore) {
        parsegraph_connectLayout(layoutBefore, disconnected._layoutNext);
    }
    else {
        parsegraph_connectLayout(earliestDisc._layoutPrev, disconnected._layoutNext);
    }
    parsegraph_connectLayout(disconnected, earliestDisc);
};

parsegraph_Node.prototype.insertIntoLayout = function(inDirection)
{
    var node = this.nodeAt(inDirection);
    if(!node) {
        return;
    }

    var nodeHead = node.findLayoutHead();

    var layoutAfter = this.findLaterLayoutSibling(inDirection);
    var layoutBefore = this.findEarlierLayoutSibling(inDirection);

    var nodeTail = node;
    //console.log(this + ".connectNode(" + parsegraph_nameNodeDirection(inDirection) + ", " + node + ") layoutBefore=" + layoutBefore + " layoutAfter=" + layoutAfter + " nodeHead=" + nodeHead);

    if(layoutBefore) {
        parsegraph_connectLayout(layoutBefore, nodeHead);
    }
    else if(layoutAfter) {
        parsegraph_connectLayout(layoutAfter.findLayoutHead()._layoutPrev, nodeHead);
    }
    else {
        parsegraph_connectLayout(this._layoutPrev, nodeHead);
    }

    if(layoutAfter) {
        parsegraph_connectLayout(nodeTail, layoutAfter.findLayoutHead());
    }
    else {
        parsegraph_connectLayout(nodeTail, this);
    }
};

function parsegraph_connectPaintGroup(a, b)
{
    a._paintGroupNext = b;
    b._paintGroupPrev = a;
};

parsegraph_Node.prototype.setPaintGroup = function(paintGroup)
{
    paintGroup = !!paintGroup;
    if(this._isPaintGroup === paintGroup) {
        return;
    }
    this._isPaintGroup = paintGroup;
    if(paintGroup) {
        // Node is becoming a paint group.

        if(this.isRoot()) {
            // Do nothing; this node was already an implied paint group.
        }
        else {
            this.parentNode().removeFromLayout(parsegraph_reverseNodeDirection(this.parentDirection()));
            var paintGroupFirst = this.findFirstPaintGroup();
            //console.log("First paint group of " + this._id + " is " + paintGroupFirst._id);
            var parentsPaintGroup = this.parentNode().findPaintGroup();
            //console.log("Parent paint group of " + this._id + " is " + parentsPaintGroup._id);
            parsegraph_connectPaintGroup(parentsPaintGroup._paintGroupPrev, paintGroupFirst);
            parsegraph_connectPaintGroup(this, parentsPaintGroup);
        }

        this.layoutChanged();
        return;
    }

    //console.log("Node " + this + " is no longer a paint group.");
    if(!this.isRoot()) {
        var paintGroupLast = this.findLastPaintGroup();
        this.parentNode().insertIntoLayout(parsegraph_reverseNodeDirection(this.parentDirection()));

        // Remove the paint group's entry in the parent.
        //console.log("Node " + this + " is not a root, so adding paint groups.");
        parsegraph_connectPaintGroup(paintGroupLast, this._paintGroupNext);
        this._paintGroupNext = this;
        this._paintGroupPrev = this;
    }
    else {
        // Retain the paint groups for this implied paint group.
    }

    this.layoutChanged();
}

parsegraph_Node.prototype.findFirstPaintGroup = function()
{
    var candidate = this._layoutNext;
    while(candidate !== this) {
        if(candidate.localPaintGroup()) {
            break;
        }
        candidate = candidate._layoutNext;
    }
    return candidate;
};

parsegraph_Node.prototype.findLastPaintGroup = function()
{
    var candidate = this._layoutPrev;
    while(candidate !== this) {
        if(candidate.localPaintGroup()) {
            break;
        }
        candidate = candidate._layoutPrev;
    }
    return candidate;
};

parsegraph_Node.prototype.markDirty = function()
{
    //console.log(this + " marked dirty");
    this._dirty = true;
    if(!this._previousPaintState) {
        this._previousPaintState = {
            paintGroup: null,
            commitLayoutFunc: null
        };
    }
    else {
        this._previousPaintState.commitLayoutFunc = null;
        this._previousPaintState.paintGroup = null;
    }
};

parsegraph_Node.prototype.isDirty = function()
{
    return this._dirty;
};

parsegraph_Node.prototype.painter = function()
{
    return this._painter;
};

parsegraph_Node.prototype.findPaintGroup = function()
{
    if(!this._currentPaintGroup) {
        var node = this;
        while(!node.isRoot()) {
            if(node._isPaintGroup) {
                break;
            }
            if(node._currentPaintGroup) {
                this._currentPaintGroup = node._currentPaintGroup;
                return this._currentPaintGroup;
            }
            node = node.parentNode();
        }
        this._currentPaintGroup = node;
    }
    else {
        //console.log("Returning cached paint group " + this._currentPaintGroup._id + " for node " + this._id);
    }
    return this._currentPaintGroup;
};

parsegraph_Node.prototype.localPaintGroup = function()
{
    return this._isPaintGroup;
};

parsegraph_Node.prototype.graph = function()
{
    return this._graph;
};

parsegraph_Node.prototype.backdropColor = function()
{
    var node = this;
    if(node.isSelected()) {
        return node.blockStyle().backgroundColor;
    }
    return node.blockStyle().selectedBackgroundColor;
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
        this._clickListenerThisArg = null;
    }
    else {
        if(!thisArg) {
            thisArg = this;
        }
        this._clickListener = listener;
        this._clickListenerThisArg = thisArg;
    }
};

parsegraph_Node.prototype.setChangeListener = function(listener, thisArg)
{
    if(!listener) {
        this._changeListener = null;
    }
    else {
        if(!thisArg) {
            thisArg = this;
        }
        this._changeListener = listener;
        this._changeListenerThisArg = thisArg;
    }
};

parsegraph_Node.prototype.isClickable = function()
{
    var hasLabel = this._label && !Number.isNaN(this._labelX) && this._label.editable();
    return this.type() === parsegraph_SLIDER || (this.hasClickListener() || !this.ignoresMouse()) || hasLabel;
};

parsegraph_Node.prototype.setIgnoreMouse = function(value)
{
    this._ignoresMouse = value;
};

parsegraph_Node.prototype.ignoresMouse = function()
{
    return this._ignoresMouse;
};

/**
 */
parsegraph_Node.prototype.hasClickListener = function()
{
    return this._clickListener != null;
};

parsegraph_Node.prototype.hasChangeListener = function()
{
    return this._changeListener != null;
};

parsegraph_Node.prototype.valueChanged = function()
{
    // Invoke the listener.
    if(!this.hasChangeListener()) {
        return;
    }
    return this._changeListener.apply(this._changeListenerThisArg, arguments);
};

parsegraph_Node.prototype.click = function()
{
    // Invoke the click listener.
    if(!this.hasClickListener()) {
        return;
    }
    return this._clickListener.apply(this._clickListenerThisArg, arguments);
};

parsegraph_Node.prototype.setKeyListener = function(listener, thisArg)
{
    if(!listener) {
        this._keyListener = null;
    }
    else {
        if(!thisArg) {
            thisArg = this;
        }
        this._keyListener = [listener, thisArg];
    }
};

parsegraph_Node.prototype.hasKeyListener = function()
{
    return this._keyListener != null;
};

parsegraph_Node.prototype.key = function()
{
    // Invoke the key listener.
    if(!this.hasKeyListener()) {
        return;
    }
    return this._keyListener[0].apply(this._keyListener[1], arguments);
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

parsegraph_Node.prototype.isRoot = function()
{
    return this._parentDirection === parsegraph_NULL_NODE_DIRECTION;
};

parsegraph_Node.prototype.parentDirection = function()
{
    if(this.isRoot()) {
        return parsegraph_NULL_NODE_DIRECTION;
    }
    return this._parentDirection;
};

parsegraph_Node.prototype.nodeParent = function()
{
    if(this.isRoot()) {
        throw parsegraph_createException(parsegraph_NODE_IS_ROOT);
    }
    return this._neighbors[this.parentDirection()].node;
};
parsegraph_Node.prototype.parentNode = parsegraph_Node.prototype.nodeParent;
parsegraph_Node.prototype.parent = parsegraph_Node.prototype.nodeParent;

parsegraph_Node.prototype.hasNode = function(atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        return false;
    }
    return this._neighbors[atDirection].node;
};

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

parsegraph_Node.prototype.hasChildAt = function(direction)
{
    return this.hasNode(direction) && this.parentDirection() != direction;
};

parsegraph_Node.prototype.hasAnyNodes = function()
{
    return this.hasChildAt(parsegraph_DOWNWARD)
        || this.hasChildAt(parsegraph_UPWARD)
        || this.hasChildAt(parsegraph_FORWARD)
        || this.hasChildAt(parsegraph_BACKWARD)
        || this.hasChildAt(parsegraph_INWARD);
};

parsegraph_Node.prototype.nodeAt = function(atDirection)
{
    return this._neighbors[atDirection].node;
};

parsegraph_Node.prototype.spawnNode = function(spawnDirection, newType)
{
    var created = this.connectNode(spawnDirection, new parsegraph_Node(newType));
    created.setLayoutPreference(parsegraph_PREFER_PERPENDICULAR_AXIS);

    // Use the node fitting of the parent.
    created.setNodeFit(this.nodeFit());

    return created;
};

function parsegraph_connectLayout(a, b)
{
    //console.log("connecting " +  a._id + " to " + b._id);
    a._layoutNext = b;
    b._layoutPrev = a;
}

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
        throw new Error("Cannot connect a node in the parent's direction (" + parsegraph_nameNodeDirection(inDirection) +")");
    }
    if(this.hasNode(inDirection)) {
        throw new Error("Cannot connect a node in the already occupied " + parsegraph_nameNodeDirection(inDirection) + " direction.");
    }
    if(this.type() == parsegraph_SLIDER) {
        throw new Error("Sliders cannot have child nodes.");
    }
    if(this.type() == parsegraph_SCENE && inDirection == parsegraph_INWARD) {
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
    neighbor.node = node;
    node.assignParent(this, parsegraph_reverseNodeDirection(inDirection));

    // Allow alignments to be set before children are spawned.
    if(neighbor.alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.alignmentMode = parsegraph_DO_NOT_ALIGN;
    }

    if(node.localPaintGroup()) {
        var pg = this.findPaintGroup();
        var paintGroupLast = pg._paintGroupPrev;
        var nodeFirst = node._paintGroupNext;
        parsegraph_connectPaintGroup(paintGroupLast, nodeFirst);
        parsegraph_connectPaintGroup(node, pg);
    }
    else {
        this.insertIntoLayout(inDirection);
        if(node._paintGroupNext !== node) {
            //console.log("Adding this node's implicit child paintgroups to the parent");
            var pg = this.findPaintGroup();
            var paintGroupLast = pg._paintGroupPrev;
            var nodeFirst = node._paintGroupNext;
            var nodeLast = node._paintGroupPrev;
            parsegraph_connectPaintGroup(paintGroupLast, nodeFirst);
            parsegraph_connectPaintGroup(nodeLast, pg);
            node._paintGroupPrev = node;
            node._paintGroupNext = node;
        }
    }

    this.layoutWasChanged(inDirection);

    return node;
};

parsegraph_Node.prototype.disconnectNode = function(inDirection)
{
    if(arguments.length === 0 || inDirection == this._parentDirection) {
        if(this.isRoot()) {
            throw new Error("Cannot disconnect a root node.");
        }
        return this.parentNode().disconnectNode(
            parsegraph_reverseNodeDirection(this._parentDirection)
        );
    }
    if(!this.hasNode(inDirection)) {
        return;
    }

    var neighbor = this._neighbors[inDirection];
    var disconnected = neighbor.node;

    if(!disconnected.localPaintGroup()) {
        this.removeFromLayout(inDirection);
    }
    var paintGroupFirst = disconnected.findFirstPaintGroup();
    parsegraph_connectPaintGroup(paintGroupFirst._paintGroupPrev, disconnected._paintGroupNext);
    parsegraph_connectPaintGroup(disconnected, paintGroupFirst);

    // Disconnect the node.
    neighbor.node = null;
    disconnected.assignParent(null);

    if(disconnected._layoutPreference === parsegraph_PREFER_PARENT_AXIS) {
        if(parsegraph_VERTICAL_AXIS === parsegraph_getNodeDirectionAxis(inDirection)) {
            disconnected._layoutPreference = parsegraph_PREFER_VERTICAL_AXIS;
        }
        else {
            disconnected._layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        }
    }
    else if(disconnected._layoutPreference === parsegraph_PREFER_PERPENDICULAR_AXIS) {
        if(parsegraph_VERTICAL_AXIS === parsegraph_getNodeDirectionAxis(inDirection)) {
            disconnected._layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        }
        else {
            disconnected._layoutPreference = parsegraph_PREFER_VERTICAL_AXIS;
        }
    }

    this.layoutWasChanged(inDirection);

    return disconnected;
};

parsegraph_Node.prototype.findEarlierLayoutSibling = function(inDirection)
{
    var layoutBefore;
    var dirs = this.layoutOrder();
    var pastDir = false;
    for(var i = dirs.length - 1; i >= 0; --i) {
        var dir = dirs[i];
        if(dir === inDirection) {
            pastDir = true;
            continue;
        }
        if(!pastDir) {
            continue;
        }
        if(dir === this._parentDirection) {
            continue;
        }
        var candidate = this._neighbors[dir].node;
        if(candidate && !candidate.localPaintGroup()) {
            layoutBefore = candidate;
            break;
        }
    }
    return layoutBefore;
};

parsegraph_Node.prototype.findLaterLayoutSibling = function(inDirection) {
    var layoutAfter;
    var dirs = this.layoutOrder();
    var pastDir = false;
    for(var i = 0; i < dirs.length; ++i) {
        var dir = dirs[i];
        //console.log(parsegraph_nameNodeDirection(dir) + " pastDir=" + pastDir);
        if(dir === inDirection) {
            pastDir = true;
            continue;
        }
        if(!pastDir) {
            continue;
        }
        if(dir === this._parentDirection) {
            continue;
        }
        var candidate = this._neighbors[dir].node;
        if(candidate && !candidate.localPaintGroup()) {
            layoutAfter = candidate;
            break;
        }
    }
    return layoutAfter;
};

parsegraph_Node.prototype.findLayoutHead = function(excludeThisNode)
{
    var deeplyLinked = this;
    var foundOne;
    while(true) {
        foundOne = false;
        var dirs = deeplyLinked.layoutOrder();
        for(var i = 0; i < dirs.length; ++i) {
            var dir = dirs[i];
            var candidate = deeplyLinked.nodeAt(dir);
            if(candidate && candidate != excludeThisNode && deeplyLinked.parentDirection() !== dir && !candidate.localPaintGroup()) {
                deeplyLinked = candidate;
                foundOne = true;
                break;
            }
        }
        if(!foundOne) {
            break;
        }
    }
    return deeplyLinked;
}

parsegraph_Node.prototype.eraseNode = function(givenDirection) {
    if(!this.hasNode(givenDirection)) {
        return;
    }
    if(!this.isRoot() && givenDirection == this.parentDirection()) {
        throw parsegraph_createException(parsegraph_CANNOT_AFFECT_PARENT);
    }
    return this.disconnectNode(givenDirection);
};

parsegraph_Node.prototype.eachChild = function(visitor, visitorThisArg)
{
    var dirs = this.layoutOrder();
    for(var i = 0; i < dirs.length; ++i) {
        var dir = dirs[i];
        if(!this.isRoot() && dir === this.parentDirection()) {
            continue;
        }
        var node = this.nodeAt(dir);
        if(!node) {
            continue;
        }
        visitor.call(visitorThisArg, node, dir);
    }
};

parsegraph_Node.prototype.scaleAt = function(direction)
{
    return this.nodeAt(direction).scale();
};

parsegraph_Node.prototype.lineLengthAt = function(direction)
{
    return this._neighbors[direction].lineLength;
};

parsegraph_Node.prototype.extentsAt = function(atDirection)
{
    return this._neighbors[atDirection].extent;
};

parsegraph_Node.prototype.extentOffsetAt = function(atDirection)
{
    return this._neighbors[atDirection].extentOffset;
};

parsegraph_Node.prototype.extentSize = function(outPos)
{
    if(!outPos) {
        outPos = new parsegraph_Size();
    }

    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    outPos.setHeight(
        this.extentsAt(parsegraph_FORWARD).boundingValues()[0]
    );

    // The vertical extents have length in the vertical direction.
    outPos.setWidth(
        this.extentsAt(parsegraph_DOWNWARD).boundingValues()[0]
    );

    //console.log("Extent Size = " + outPos.width() + " " + outPos.height());

    return outPos;
};

parsegraph_Node.prototype.setLayoutPreference = function(given)
{
    var b = this.parentDirection() === parsegraph_BACKWARD ? null : this.nodeAt(parsegraph_BACKWARD);
    var f = this.parentDirection() === parsegraph_FORWARD ? null : this.nodeAt(parsegraph_FORWARD);
    var u = this.parentDirection() === parsegraph_UPWARD ? null : this.nodeAt(parsegraph_UPWARD);
    var d = this.parentDirection() === parsegraph_DOWNWARD ? null : this.nodeAt(parsegraph_DOWNWARD);
    var firstHorz = b || f;
    if(firstHorz) {
        firstHorz = firstHorz.findLayoutHead();
    }
    var lastHorz = f || b;
    var firstVert = d || u;
    if(firstVert) {
        firstVert = firstVert.findLayoutHead();
    }
    var lastVert = u || d;

    var horzToVert = function() {
        //console.log("horzToVert exec");
        if(!firstHorz || !firstVert) {
            return;
        }
        var aa = firstHorz._layoutPrev;
        var dd = lastVert._layoutNext;
        parsegraph_connectLayout(aa, firstVert);
        parsegraph_connectLayout(lastHorz, dd);
        parsegraph_connectLayout(lastVert, firstHorz);
    };
    var vertToHorz = function() {
        //console.log("vertToHorz exec");
        if(!firstHorz || !firstVert) {
            return;
        }
        var aa = firstHorz._layoutPrev;
        var dd = lastVert._layoutNext;
        //console.log("aa=" + aa._id);
        //console.log("dd=" + dd._id);
        //console.log("firstHorz=" + firstHorz._id);
        //console.log("lastVert=" + lastVert._id);
        //console.log("lastHorz=" + lastHorz._id);
        //console.log("firstVert=" + firstVert._id);
        parsegraph_connectLayout(aa, firstHorz);
        parsegraph_connectLayout(lastVert, dd);
        parsegraph_connectLayout(lastHorz, firstVert);
    };
    if(this.isRoot()) {
        if(given !== parsegraph_PREFER_VERTICAL_AXIS && given !== parsegraph_PREFER_HORIZONTAL_AXIS) {
            throw new Error("Unallowed layout preference: " + parsegraph_nameLayoutPreference(given));
        }
        if(this._layoutPreference === given) {
            return;
        }
        if(given === parsegraph_PREFER_VERTICAL_AXIS) {
            // parsegraph_PREFER_HORIZONTAL_AXIS -> parsegraph_PREFER_VERTICAL_AXIS
            horzToVert.call(this);
        }
        else {
            // parsegraph_PREFER_VERTICAL_AXIS -> parsegraph_PREFER_HORIZONTAL_AXIS
            vertToHorz.call(this);
        }
        this._layoutPreference = given;
        return;
    }

    var curCanon = this.canonicalLayoutPreference();
    this._layoutPreference = given;
    var newCanon = this.canonicalLayoutPreference();
    if(curCanon === newCanon) {
        return;
    }

    var paxis = parsegraph_getNodeDirectionAxis(this.parentDirection());
    if(curCanon === parsegraph_PREFER_PARENT_AXIS) {
        if(paxis === parsegraph_HORIZONTAL_AXIS) {
            horzToVert.call(this);
        }
        else {
            vertToHorz.call(this);
        }
    }
    else {
        if(paxis === parsegraph_VERTICAL_AXIS) {
            vertToHorz.call(this);
        }
        else {
            horzToVert.call(this);
        }
    }

    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.showInCamera = function(cam, onlyScaleIfNecessary)
{
    this.commitLayoutIteratively();
    var bodySize = this.extentSize();

    var surface = cam.surface()
    var camScale = cam.scale();
    var screenWidth = surface.getWidth();
    var screenHeight = surface.getHeight();

    var scaleAdjustment;
    var widthIsBigger = screenWidth / bodySize[0] < screenHeight / bodySize[1];
    if(widthIsBigger) {
        scaleAdjustment = screenWidth / bodySize[0];
    }
    else {
        scaleAdjustment = screenHeight / bodySize[1];
    }
    if(onlyScaleIfNecessary && scaleAdjustment > camScale) {
        scaleAdjustment = camScale;
    }
    else {
        cam.setScale(scaleAdjustment);
    }

    var x, y;
    var bv = [null, null, null];
    this.extentsAt(parsegraph_BACKWARD).boundingValues(bv);
    x = bv[1];
    this.extentsAt(parsegraph_UPWARD).boundingValues(bv);
    y = bv[1];

    if(widthIsBigger || scaleAdjustment < 1.0) {
        y += (screenHeight - bodySize[1]*scaleAdjustment)/(scaleAdjustment*2);
    }
    if(!widthIsBigger || scaleAdjustment < 1.0) {
        x += (screenWidth - bodySize[0]*scaleAdjustment)/(scaleAdjustment*2);
    }

    var ax = this.absoluteX();
    var ay = this.absoluteY();
    cam.setOrigin(x - ax, y - ay);
};

parsegraph_Node.prototype.setNodeAlignmentMode = function(inDirection, newAlignmentMode)
{
    if(arguments.length === 1) {
        return this.parentNode().setNodeAlignmentMode(
            parsegraph_reverseNodeDirection(this._parentDirection),
            arguments[0]
        );
    }
    this._neighbors[inDirection].alignmentMode = newAlignmentMode;
    this.layoutWasChanged(inDirection);
};

parsegraph_Node.prototype.nodeAlignmentMode = function(inDirection)
{
    return this._neighbors[inDirection].alignmentMode;
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

parsegraph_Node.prototype.setValue = function(newValue, report)
{
    if(this._value === newValue) {
        return;
    }
    this._value = newValue;
    if(arguments.length === 1 || report) {
        this.valueChanged();
    }
};

parsegraph_Node.prototype.scene = function()
{
    return this._scene;
};

parsegraph_Node.prototype.setScene = function(scene)
{
    this._scene = scene;
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.typeAt = function(direction)
{
    return this.nodeAt(direction).type();
};

parsegraph_Node.prototype.label = function()
{
    if(!this._label) {
        return null;
    }
    return this._label.text();
};

parsegraph_Node.prototype.glyphCount = function(counts, pagesPerTexture)
{
    if(!this._label) {
        return 0;
    }
    return this._label.glyphCount(counts, pagesPerTexture);
};

parsegraph_Node.prototype.realLabel = function()
{
    if(!this._label) {
        return null;
    }
    return this._label;
};

parsegraph_Node.prototype.setLabel = function(text, glyphAtlas)
{
    if(!this._label) {
        this._label = new parsegraph_Label(glyphAtlas);
    }
    this._label.setText(text);
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
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.isSelectedAt = function(direction)
{
    if(!this.hasNode(direction)) {
        return false;
    }
    return this.nodeAt(direction).isSelected();
};

parsegraph_Node.prototype.sizeIn = function(direction, bodySize)
{
    var rv = this.size(bodySize);
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

parsegraph_Node.prototype.size = function(bodySize)
{
    bodySize = this.sizeWithoutPadding(bodySize);
    bodySize[0] += 2 * this.horizontalPadding() + 2 * this.borderThickness();
    bodySize[1] += 2 * this.verticalPadding() + 2 * this.borderThickness();
    return bodySize;
};

parsegraph_Node.prototype.absoluteSize = function(bodySize)
{
    return this.size(bodySize).scaled(this.absoluteScale());
};

parsegraph_Node.prototype.groupSize = function(bodySize)
{
    bodySize = this.size(bodySize);
    bodySize.scale(this.groupScale());
    return bodySize;
};

parsegraph_Node.prototype.assignParent = function(fromNode, parentDirection)
{
    if(arguments.length === 0 || !fromNode) {
        // Clearing the parent.
        if(this._parentDirection !== parsegraph_NULL_NODE_DIRECTION) {
            this._neighbors[this._parentDirection].node = null;
            this._parentDirection = parsegraph_NULL_NODE_DIRECTION;
        }
        return;
    }
    this._neighbors[parentDirection].node = fromNode;
    this._parentDirection = parentDirection;
};

parsegraph_Node.prototype.isSelected = function()
{
    return this._selected;
};

parsegraph_Node.prototype.setSelected = function(selected)
{
    //console.log(new Error("setSelected(" + selected + ")"));
    this._selected = selected;
};

parsegraph_Node.prototype.horizontalPadding = function()
{
    return this.blockStyle().horizontalPadding;
};

parsegraph_Node.prototype.verticalPadding = function()
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

parsegraph_Node.prototype.inNodeBody = function(x, y, userScale)
{
    var s = this.size();
    if(
        x < userScale * this.absoluteX()
            - userScale * this.absoluteScale() * s.width()/2
    ) {
        //console.log("Given coords are outside this node's body. (Horizontal minimum exceeds X-coord)");
        return false;
    }
    if(
        x > userScale * this.absoluteX()
            + userScale * this.absoluteScale() * s.width()/2
    ) {
        //console.log("Given coords are outside this node's body. (X-coord exceeds horizontal maximum)");
        return false;
    }
    if(
        y < userScale * this.absoluteY()
            - userScale * this.absoluteScale() * s.height()/2
    ) {
        //console.log("Given coords are outside this node's body. (Vertical minimum exceeds Y-coord)");
        return false;
    }
    if(
        y > userScale * this.absoluteY()
            + userScale * this.absoluteScale() * s.height()/2
    ) {
        //console.log("Given coords are outside this node's body. (Y-coord exceeds vertical maximum)");
        return false;
    }

    //console.log("Within node body" + this);
    return true;
};

parsegraph_Node.prototype.inNodeExtents = function(x, y, userScale)
{
    if(
        x < userScale * this.absoluteX() - userScale * this.absoluteScale() * this.extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return false;
    }
    //console.log("This node is " + this._id);
    var forwardMax = userScale * this.absoluteX() - userScale * this.absoluteScale() * this.extentOffsetAt(parsegraph_DOWNWARD) + userScale * this.absoluteScale() * this.extentSize().width();
    //console.log("ForwardMax = " + forwardMax + " = ax=" + this.absoluteX() + " - offset=" + this.extentOffsetAt(parsegraph_DOWNWARD) + " + width=" + this.extentSize().width());
    if(
        x > forwardMax
    ) {
        return false;
    }
    if(
        y < userScale * this.absoluteY() - userScale * this.absoluteScale() * this.extentOffsetAt(parsegraph_FORWARD)
    ) {
        return false;
    }
    if(
        y > userScale * this.absoluteY() - userScale * this.absoluteScale() * this.extentOffsetAt(parsegraph_FORWARD)
            + userScale * this.absoluteScale() * this.extentSize().height()
    ) {
        return false;
    }

    //console.log("Within extent of node " + this._id);
    return true;
};

parsegraph_Node.prototype.nodeUnderCoords = function(x, y, userScale)
{
    //console.log("nodeUnderCoords: " + x + ", " + y)
    if(userScale === undefined) {
        userScale = 1;
    }

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

        if(candidate.inNodeBody(x, y, userScale)) {
            //console.log("Click is in node body");
            if(
                candidate.hasNode(parsegraph_INWARD)
            ) {
                if(candidate.nodeAt(parsegraph_INWARD).inNodeExtents(x, y, userScale)) {
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
            //console.log("Mouse under node " + candidate._id);
            return candidate;
        }
        // Not within this node, so remove it as a candidate.
        candidates.pop();

        // Test if the click is within any child.
        if(!candidate.inNodeExtents(x, y, userScale)) {
            // Nope, so continue the search.
            //console.log("Click is not in node extents.");
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

parsegraph_Node.prototype.sizeWithoutPadding = function(bodySize)
{
    // Find the size of this node's drawing area.
    var style = this.blockStyle();
    if(this._label && !this._label.isEmpty()) {
        if(!bodySize) {
            bodySize = new parsegraph_Size();
        }
        bodySize[0] = this._label.width() * (style.fontSize / this._label.glyphAtlas().fontSize());
        bodySize[1] = this._label.height() * (style.fontSize / this._label.glyphAtlas().fontSize());
        if(Number.isNaN(bodySize[0]) || Number.isNaN(bodySize[1])) {
            throw new Error("Label returned a NaN size.");
        }
    }
    else if(!bodySize) {
        bodySize = new parsegraph_Size(style.minWidth, style.minHeight);
    }
    else {
        bodySize[0] = style.minWidth;
        bodySize[1] = style.minHeight;
    }
    if(this.hasNode(parsegraph_INWARD)) {
        var nestedNode = this.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();
        var scale = nestedNode.scale();

        if(this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            bodySize.setWidth(
                Math.max(bodySize.width(), scale * nestedSize.width())
            );

            if(this.label()) {
                // Allow for the content's size.
                bodySize.setHeight(Math.max(style.minHeight,
                    bodySize.height()
                    + this.verticalPadding()
                    + scale * nestedSize.height()
                ));
            }
            else {
                bodySize.setHeight(
                    Math.max(bodySize.height(),
                    scale * nestedSize.height()
                    + 2 * this.verticalPadding()
                ));
            }
        }
        else {
            // Align horizontal.
            if(this.label()) {
                // Allow for the content's size.
                bodySize.setWidth(
                    bodySize.width()
                    + this.horizontalPadding()
                    + scale * nestedSize.width()
                );
            }
            else {
                bodySize.setWidth(
                    Math.max(bodySize.width(), scale * nestedSize.width())
                );
            }

            bodySize.setHeight(
                Math.max(
                    bodySize.height(),
                    scale * nestedSize.height() + 2 * this.verticalPadding()
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

    bodySize[0] = Math.max(style.minWidth, bodySize[0]);
    bodySize[1] = Math.max(style.minHeight, bodySize[1]);
    return bodySize;
};

parsegraph_Node.prototype.commitLayout = function(bodySize, lineBounds, bv)
{
    // Do nothing if this node already has a layout committed.
    if(this._layoutState === parsegraph_COMMITTED_LAYOUT) {
        return false;
    }

    // Check for invalid layout states.
    if(this._layoutState === parsegraph_NULL_LAYOUT_STATE) {
        throw parsegraph_createException(parsegraph_BAD_LAYOUT_STATE);
    }

    // Do not allow overlapping layout commits.
    if(this._layoutState === parsegraph_IN_COMMIT) {
        throw parsegraph_createException(parsegraph_BAD_LAYOUT_STATE);
    }

    // Begin the layout.
    this._layoutState = parsegraph_IN_COMMIT;

    var initExtent = function(
        inDirection,
        length,
        size,
        offset)
    {
        this._neighbors[inDirection].extent.clear();
        this._neighbors[inDirection].extent.appendLS(length, size);
        this._neighbors[inDirection].extentOffset = offset;
        //console.log(new Error("OFFSET = " + offset));
    };

    bodySize = this.size(bodySize);

    // This node's horizontal bottom, used with downward nodes.
    initExtent.call(
        this,
        parsegraph_DOWNWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2
    );

    // This node's horizontal top, used with upward nodes.
    initExtent.call(
        this,
        parsegraph_UPWARD,
        // Length:
        bodySize.width(),
        // Size:
        bodySize.height() / 2,
        // Offset to body center:
        bodySize.width() / 2
    );

    // This node's vertical back, used with backward nodes.
    initExtent.call(
        this,
        parsegraph_BACKWARD,
        // Length:
        bodySize.height(),
        // Size:
        bodySize.width() / 2,
        // Offset to body center:
        bodySize.height() / 2
    );

    // This node's vertical front, used with forward nodes.
    initExtent.call(
        this,
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

        var alignmentMode = this._neighbors[childDirection].alignmentMode;
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
        // Validate arguments.
        if(separation < 0) {
            throw new Error("separation must always be positive.");
        }
        if(!parsegraph_isCardinalDirection(childDirection)) {
            throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION);
        }
        var child = this.nodeAt(childDirection);
        var reversedDirection = parsegraph_reverseNodeDirection(childDirection);

        // Save alignment parameters.
        this._neighbors[childDirection].alignmentOffset = alignment;
        //console.log("Alignment = " + alignment);
        this._neighbors[childDirection].separation = separation;

        // Determine the line length.
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
                this._neighbors[childDirection].node.extentOffsetAt(reversedDirection) -
                alignment / this.scaleAt(childDirection)
            );
        }
        lineLength = separation - this.scaleAt(childDirection) * extentSize;
        this._neighbors[childDirection].lineLength = lineLength;
        //console.log("Line length: " + lineLength + ", separation: " + separation + ", extentSize: " + extentSize);

        // Set the position.
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
            this._neighbors[childDirection].xPos + ", " + this._neighbors[childDirection].yPos + ")"
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
            var lengthOffset = this._neighbors[direction].extentOffset
                + lengthAdjustment
                - this.scaleAt(childDirection) * child.extentOffsetAt(direction);

            // Combine the two extents in the given direction.
            /*console.log("Combining " + parsegraph_nameNodeDirection(direction) + ", " );
            console.log("Child: " + parsegraph_nameLayoutState(child._layoutState));
            console.log("Length offset: " + lengthOffset);
            console.log("Size adjustment: " + sizeAdjustment);
            console.log("ExtentOffset : " + this._neighbors[direction].extentOffset);
            console.log("Scaled child ExtentOffset : " + (this.scaleAt(childDirection) * child.extentOffsetAt(direction)));*/
            var e = this._neighbors[direction].extent;
            var scale = this.scaleAt(childDirection);
            if(this.nodeFit() == parsegraph_NODE_FIT_LOOSE) {
                e.combineExtentAndSimplify(
                    child.extentsAt(direction),
                    lengthOffset,
                    sizeAdjustment,
                    scale,
                    bv
                );
            }
            else {
                e.combineExtent(
                    child.extentsAt(direction),
                    lengthOffset,
                    sizeAdjustment,
                    scale
                );
            }

            // Adjust the length offset to remain positive.
            if(lengthOffset < 0) {
                //console.log("Adjusting negative extent offset.");
                this._neighbors[direction].extentOffset =
                    this._neighbors[direction].extentOffset + Math.abs(lengthOffset);
            }

            /*console.log(
                "New "
                + parsegraph_nameNodeDirection(direction)
                + " extent offset = "
                + this._neighbors[direction].extentOffset
            );
            this._neighbors[direction].extent.forEach(function(l, s, i) {
                console.log(i + ". length=" + l + ", size=" + s);
            });*/

            // Assert the extent offset is positive.
            if(this._neighbors[direction].extentOffset < 0) {
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
            combineExtent.call(this, parsegraph_DOWNWARD, separation, alignment);
            combineExtent.call(this, parsegraph_UPWARD, separation, -alignment);

            combineExtent.call(this, parsegraph_FORWARD, alignment, separation);
            combineExtent.call(this, parsegraph_BACKWARD, alignment, -separation);
            break;
        case parsegraph_BACKWARD:
            // Backward child.
            combineExtent.call(this, parsegraph_DOWNWARD, -separation, alignment);
            combineExtent.call(this, parsegraph_UPWARD, -separation, -alignment);

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

        if(child._layoutState !== parsegraph_COMMITTED_LAYOUT) {
            console.log(parsegraph_getLayoutNodes(child.root()));
            console.log(parsegraph_nameLayoutPreference(child._layoutPreference));
            throw new Error(parsegraph_nameNodeDirection(direction) + " Child " + parsegraph_nameNodeType(child.type()) + " " + (child._id) + " does not have a committed layout. Child's layout state is " + parsegraph_nameLayoutState(child._layoutState), child);
        }

        // Separate the child from this node.
        var separationFromChild = this._neighbors[direction].extent.separation(
            childExtent,
            this._neighbors[direction].extentOffset
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
            parsegraph_getNodeDirectionAxis(direction) == parsegraph_VERTICAL_AXIS
        ) {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (child.size().height() / 2) + bodySize.height() / 2
            );
            separationFromChild
                += this.verticalSeparation(direction) * this.scaleAt(direction);
        }
        else {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (child.size().width() / 2) + bodySize.width() / 2
            );
            separationFromChild
                += this.horizontalSeparation(direction) * this.scaleAt(direction);
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
            layoutSingle.call(this, firstAxisDirection, false);
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
                this.scaleAt(secondDirection) / this.scaleAt(firstDirection),
                0
            );
        separationBetweenChildren *= this.scaleAt(firstDirection);

        //console.log("Separation between children=" + separationBetweenChildren);

        var separationFromSecond = this._neighbors[secondDirection].extent;

        /*console.log(
            "This " +
            parsegraph_nameNodeDirection(firstDirection) +
            " extent (offset to center=" +
            this._neighbors[firstDirection].extentOffset +
            ")"
        );
        this._neighbors[firstDirection].extent.forEach(
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
            "this._neighbors[firstDirection].extentOffset=" +
                this._neighbors[firstDirection].extentOffset
        );
        console.log(
            "firstNode.extentOffsetAt(secondDirection)=" + firstNode.extentOffsetAt(secondDirection)
        );*/

        // Allow some overlap if we have both first-axis sides, but
        // nothing ahead on the second axis.
        var separationFromFirst = this._neighbors[firstDirection].extent
            .separation(
                firstNode.extentsAt(secondDirection),
                this._neighbors[firstDirection].extentOffset
                + firstNodeAlignment
                - this.scaleAt(firstDirection) * firstNode.extentOffsetAt(secondDirection),
                allowAxisOverlap,
                this.scaleAt(firstDirection),
                parsegraph_LINE_THICKNESS / 2
            );

        var separationFromSecond = this._neighbors[secondDirection].extent
            .separation(
                secondNode.extentsAt(firstDirection),
                this._neighbors[secondDirection].extentOffset
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
                + bodySize.height() / 2
            );
            separationFromFirst
                += this.verticalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondNode.size().height() / 2)
                + bodySize.height() / 2
            );
            separationFromSecond
                += this.verticalSeparation(secondDirection)
                * this.scaleAt(secondDirection);
        }
        else {
            separationFromFirst = Math.max(
                separationFromFirst,
                this.scaleAt(firstDirection) * (firstNode.size().width() / 2)
                + bodySize.width() / 2
            );
            separationFromFirst
                += this.horizontalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondNode.size().width() / 2)
                + bodySize.width() / 2
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
        if(this._layoutPreference == parsegraph_PREFER_HORIZONTAL_AXIS || this._layoutPreference == parsegraph_PREFER_PERPENDICULAR_AXIS) {
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
                    true //firstDirection != parsegraph_NULL_NODE_DIRECTION || secondDirection != parsegraph_NULL_NODE_DIRECTION
                );
            }

            layoutAxis.call(this, perpendicularNodes[0], perpendicularNodes[1], true);
        }
    }

    if(!lineBounds) {
        lineBounds = new parsegraph_Size();
    }
    var addLineBounds = function(given)
    {
        if(!this.hasNode(given)) {
            return;
        }

        var perpAxis = parsegraph_getPerpendicularAxis(given);
        var dirSign = parsegraph_nodeDirectionSign(given);

        var positiveOffset = this._neighbors[
            parsegraph_getPositiveNodeDirection(perpAxis)
        ].extentOffset;

        var negativeOffset = this._neighbors[
            parsegraph_getNegativeNodeDirection(perpAxis)
        ].extentOffset;

        if(dirSign < 0) {
            var lineSize = this.sizeIn(given, lineBounds)
            positiveOffset -= lineSize + this.lineLengthAt(given);
            negativeOffset -= lineSize + this.lineLengthAt(given);
        }

        if(this.nodeFit() == parsegraph_NODE_FIT_EXACT) {
            // Append the line-shaped bound.
            this._neighbors[
                parsegraph_getPositiveNodeDirection(perpAxis)
            ].extent.combineBound(
                positiveOffset,
                this.lineLengthAt(given),
                this.scaleAt(given) * parsegraph_LINE_THICKNESS / 2
            );
            this._neighbors[
                parsegraph_getNegativeNodeDirection(perpAxis)
            ].extent.combineBound(
                negativeOffset,
                this.lineLengthAt(given),
                this.scaleAt(given) * parsegraph_LINE_THICKNESS / 2
            );
        }
    };

    // Set our extents, combined with non-point neighbors.
    parsegraph_forEachCardinalNodeDirection(addLineBounds, this);

    if(this.hasNode(parsegraph_INWARD)) {
        var nestedNode = this.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();
        if(this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
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
        else {
            //console.log(this.horizontalPadding(), this.borderThickness());
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
    }

    this._layoutState = parsegraph_COMMITTED_LAYOUT;

    // Needed a commit, so return true.
    return true;
}

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

parsegraph_Node.prototype.commitLayoutIteratively = function(timeout)
{
    //console.log("Committing layout");
    if(!this.isRoot()) {
        return this.parentNode().commitLayoutIteratively();
    }

    // Avoid needless work if possible.
    if(this._layoutState === parsegraph_COMMITTED_LAYOUT) {
        return;
    }

    var layoutPhase = 1;
    var rootPaintGroup = this;
    var paintGroup = null;
    var root = null;
    var node = null;
    var bodySize = new parsegraph_Size();
    var lineSize = new parsegraph_Size();
    var bv = [null, null, null];
    var j = null;

    // Traverse the graph depth-first, committing each node's layout in turn.
    var commitLayoutLoop = function() {
        var startTime = new Date();
        var i = 0;
        var pastTime = function(val) {
            ++i;
            if(i % parsegraph_NATURAL_GROUP_SIZE === 0) {
                var ct = new Date();
                var el = parsegraph_elapsed(startTime, ct);
                if(el > 4*1000) {
                    console.log(val);
                }
                if(el > 5*1000) {
                    throw new Error("Commit Layout is taking too long");
                }
                if(timeout !== undefined && parsegraph_elapsed(startTime, ct) > timeout) {
                    return true;
                }
            }
            return false;
        };
        // Commit layout for all nodes.
        while(layoutPhase === 1) {
            if(paintGroup === null) {
                paintGroup = rootPaintGroup._paintGroupNext;
                root = paintGroup;
                node = root;
            }
            if(pastTime(paintGroup._id)) {
                return commitLayoutLoop;
            }
            if(root.needsCommit()) {
                do {
                    // Loop back to the first node, from the root.
                    node = node._layoutNext;
                    if(node.needsCommit()) {
                        node.commitLayout(bodySize, lineSize, bv);
                        node._currentPaintGroup = paintGroup;
                    }
                    if(pastTime(node._id)) {
                        return commitLayoutLoop;
                    }
                } while(node !== root);
            }
            if(paintGroup === rootPaintGroup) {
                //console.log("Commit layout done");
                ++layoutPhase;
                paintGroup = null;
                break;
            }
            paintGroup = paintGroup._paintGroupNext;
            root = paintGroup;
            node = root;
        }
        // Calculate position.
        while(layoutPhase === 2) {
            //console.log("Now in layout phase 2");
            if(paintGroup === null) {
                paintGroup = rootPaintGroup;
                root = paintGroup;
                node = root;
            }
            //console.log("Processing position for ", paintGroup);
            if(pastTime(paintGroup._id)) {
                return commitLayoutLoop;
            }
            if(paintGroup.needsPosition() || node) {
                if(!node) {
                    //console.log(paintGroup + " needs a position update");
                    node = paintGroup;
                }
                do {
                    // Loop from the root to the last node.
                    node._absoluteXPos = null;
                    node._groupXPos = null;
                    node.commitGroupPos();
                    node = node._layoutPrev;
                    if(pastTime(node._id)) {
                        return commitLayoutLoop;
                    }
                } while(node !== root);
            }
            else {
                //console.log(paintGroup);
                //console.log(paintGroup + " does not need a position update.");
            }
            ++paintGroup._absoluteVersion;
            paintGroup._absoluteXPos = null;
            paintGroup.commitAbsolutePos();
            paintGroup = paintGroup._paintGroupPrev;
            if(paintGroup === rootPaintGroup) {
                //console.log("Commit layout done");
                ++layoutPhase;
                break;
            }
            root = paintGroup;
            node = null;
        }
        return null;
    };

    return commitLayoutLoop();
};

parsegraph_Node.prototype.separationAt = function(inDirection) {
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

    return this._neighbors[inDirection].separation;
};

parsegraph_Node.prototype.layoutWasChanged = function(changeDirection)
{
    //console.log("layoutWasChanged(" + (changeDirection != null ? parsegraph_nameNodeDirection(changeDirection) : "null") +")")
    // Disallow null change directions.
    if(arguments.length === 0) {
        changeDirection = parsegraph_INWARD;
    }
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
    };

    var node = this;
    while(node !== null) {
        //console.log("Node " + node + " has layout changed");
        var oldLayoutState = node._layoutState;

        // Set the needs layout flag.
        node._layoutState = parsegraph_NEEDS_COMMIT;
        node._groupXPos = null;
        node._currentPaintGroup = null;

        node.findPaintGroup().markDirty();

        // Recurse for the children of this node.
        var dirs = this.layoutOrder();
        for(var i = 0; i < dirs.length; ++i) {
            notifyChild.call(node, dirs[i]);
        }

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
            break;
        }
    }
};
parsegraph_Node.prototype.layoutHasChanged = parsegraph_Node.prototype.layoutWasChanged;
parsegraph_Node.prototype.layoutChanged = parsegraph_Node.prototype.layoutWasChanged;

parsegraph_Node.prototype.layoutOrder = function()
{
    if(this.isRoot()) {
        if(this._layoutPreference === parsegraph_PREFER_HORIZONTAL_AXIS || this._layoutPreference === parsegraph_PREFER_PERPENDICULAR_AXIS) {
            return parsegraph_HORIZONTAL_ORDER;
        }
        return parsegraph_VERTICAL_ORDER;
    }
    if(this.canonicalLayoutPreference() == parsegraph_PREFER_PERPENDICULAR_AXIS) {
        //console.log("PREFER PERP");
        if(parsegraph_getNodeDirectionAxis(this.parentDirection()) == parsegraph_HORIZONTAL_AXIS) {
            return parsegraph_VERTICAL_ORDER;
        }
        return parsegraph_HORIZONTAL_ORDER;
    }
    //console.log("PREFER PARALLEL TO PARENT: " + parsegraph_nameLayoutPreference(this._layoutPreference));
    // Parallel preference.
    if(parsegraph_getNodeDirectionAxis(this.parentDirection()) == parsegraph_HORIZONTAL_AXIS) {
        return parsegraph_HORIZONTAL_ORDER;
    }
    return parsegraph_VERTICAL_ORDER;
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
    if(!this.isRoot()) {
        this.disconnectNode();
    }
    this._neighbors.forEach(function(neighbor, direction) {
        // Clear all children.
        if(this._parentDirection !== direction) {
            neighbor.node = null;
        }
    }, this);
    this._layoutState = parsegraph_NULL_LAYOUT_STATE;
    this._parentDirection = parsegraph_NULL_NODE_DIRECTION;
    this._scale = 1.0;
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

function parsegraph_labeledBud(label, glyphAtlas)
{
    var node = new parsegraph_Node(parsegraph_BUD);
    node.setLabel(label, glyphAtlas);
    return node;
};

function parsegraph_labeledSlot(label, glyphAtlas)
{
    var node = new parsegraph_Node(parsegraph_SLOT);
    node.setLabel(label, glyphAtlas);
    return node;
};

function parsegraph_labeledBlock(label, glyphAtlas)
{
    var node = new parsegraph_Node(parsegraph_BLOCK);
    node.setLabel(label, glyphAtlas);
    return node;
};

parsegraph_Node.prototype.paint = function(gl, backgroundColor, glyphAtlas, shaders, timeout)
{
    if(!this._isPaintGroup) {
        return;
    }
    if(!this.isDirty()) {
        //console.log(this + " is not dirty");
        return true;
    }
    else {
        //console.log(this + " is dirty");
    }
    if(!gl) {
        throw new Error("A WebGL context must be provided.");
    }

    var t = new Date().getTime();
    var pastTime = function() {
        return timeout !== undefined && (new Date().getTime() - t > timeout);
    };

    // Load saved state.
    if(!this._previousPaintState) {
        this.markDirty();
    }
    var savedState = this._previousPaintState;
    var paintGroup = savedState.paintGroup;

    var cont;
    if(savedState.commitLayoutFunc) {
        cont = savedState.commitLayoutFunc();
    }
    else if(!savedState.paintGroup) {
        cont = this.commitLayoutIteratively(timeout);
    }

    if(cont) {
        // Timed out during commitLayout
        savedState.commitLayoutFunc = cont;
        return false;
    }
    else {
        // Committed all layout
        savedState.commitLayoutFunc = null;
        savedState.skippedAny = false;
        savedState.paintGroup = this;

    }

    // Continue painting.
    while(true) {
        if(pastTime()) {
            this._dirty = true;
            return false;
        }

        var paintGroup = savedState.paintGroup;
        //console.log("Painting " + paintGroup);
        if(paintGroup.isDirty()) {
            // Paint and render nodes marked for the current group.
            if(!paintGroup._painter) {
                paintGroup._painter = new parsegraph_NodePainter(gl, glyphAtlas, shaders);
                paintGroup._painter.setBackground(backgroundColor);
            }
            var counts = {};
            var node = paintGroup;
            do {
                //console.log("Counting node " + node);
                paintGroup._painter.countNode(node, counts);
                node = node._layoutPrev;
            } while(node !== paintGroup);
            //console.log("Glyphs: " + counts.numGlyphs);
            paintGroup._painter.initBlockBuffer(counts);
            node = paintGroup;
            do {
                //console.log("Drawing node " + node);
                paintGroup._painter.drawNode(node, shaders);
                node = node._layoutPrev;
                ++parsegraph_NODES_PAINTED;
            } while(node !== paintGroup);
        }
        paintGroup._dirty = false;
        savedState.paintGroup = paintGroup._paintGroupPrev;
        if(savedState.paintGroup === this) {
            break;
        }
    }

    savedState.paintGroup = null;
    //console.log("Completed node painting");
    return this._dirty;
};

parsegraph_Node.prototype.renderIteratively = function(world, camera)
{
    //console.log("Rendering iteratively");
    var paintGroup = this;
    do {
        //console.log("Rendering node " + paintGroup);
        paintGroup.render(world, camera);
        paintGroup = paintGroup._paintGroupPrev;
    } while(paintGroup !== this);
};

parsegraph_Node.prototype.render = function(world, camera)
{
    if(!this.localPaintGroup()) {
        return;
    }
    if(!this._painter) {
        return;
    }

    // Do not render paint groups that cannot be seen.
    var s = this._painter.bounds().clone();
    //console.log(this.absoluteX(), this.absoluteY(), this.scale());
    s.scale(this.scale());
    s.translate(this.absoluteX(), this.absoluteY());
    if(camera && !camera.contains(s)) {
        //console.log("Out of bounds: " + this);
        return;
    }

    //console.log("Rendering paint group: " + this.absoluteX() + " " + this.absoluteY() + " " + this.absoluteScale());
    //console.log("Rendering " + this, this._painter.bounds());

    this._painter.render(
        matrixMultiply3x3(
            makeScale3x3(this.absoluteScale()),
            matrixMultiply3x3(makeTranslation3x3(this.absoluteX(), this.absoluteY()), world)
        ),
        this.absoluteScale() * (camera ? camera.scale() : 1)
    );
};
