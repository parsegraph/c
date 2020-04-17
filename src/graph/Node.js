parsegraph_NODES_PAINTED = 0;
parsegraph_Node_COUNT = 0;

function parsegraph_NeighborData(owner, dir)
{
    this.owner = owner;
    this.direction = dir;
    this.alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    this.allowAxisOverlap = parsegraph_DEFAULT_AXIS_OVERLAP;
    this.alignmentOffset = 0;
    this.separation = 0;
    this.lineLength = 0;
    this.xPos = null;
    this.yPos = null;
    this.node = null;
}

function parsegraph_ExtendedNode()
{
    this.ignoresMouse = true;
    this.keyListener = null;
    this.keyListenerThisArg = null;
    this.clickListener = null;
    this.clickListenerThisArg = null;
    this.changeListener = null;
    this.changeListenerThisArg = null;
    this.prevTabNode = null;
    this.nextTabNode = null;
    this.value = null;
    this.selected = false;

    this.isPaintGroup = false;
    this.dirty = true;
    this.windowPainter = {};
    this.windowPaintGroup = {};
    this.commitLayoutFunc = null;
    this.scene = null;
}

function parsegraph_Node(newType, fromNode, parentDirection)
{
    this._id = parsegraph_Node_COUNT++;

    // Appearance
    this._type = newType;
    this._style = parsegraph_style(this._type);
    this._rightToLeft = parsegraph_RIGHT_TO_LEFT;
    this._scale = 1.0;

    // Layout
    this._extents = [
        new parsegraph_Extent(),
        new parsegraph_Extent(),
        new parsegraph_Extent(),
        new parsegraph_Extent()
    ];
    this._neighbors = [];
    for(var i = 0; i < parsegraph_NUM_DIRECTIONS; ++i) {
        this._neighbors.push(null);
    }
    this._parentNeighbor = null;

    this._nodeFit = parsegraph_NODE_FIT_LOOSE;
    this._layoutState = parsegraph_NEEDS_COMMIT;
    this._absoluteVersion = 0;
    this._absoluteDirty = true;
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;
    this._hasGroupPos = false;
    this._groupXPos = NaN;
    this._groupYPos = NaN;
    this._groupScale = NaN;
    this._layoutPrev = this;
    this._layoutNext = this;

    // Paint groups.
    this._currentPaintGroup = null;
    this._paintGroupNext = this;
    this._paintGroupPrev = this;

    // Internal data.
    this._extended = null;
    this._label = null;

    // Check if a parent node was provided.
    if(fromNode != null) {
        // A parent node was provided; this node is a child.
        fromNode.connectNode(parentDirection, this);
        this._layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
    }
    else {
        // No parent was provided; this node is a root.
        this._layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
    }
}

function parsegraph_chainTab(a, b, swappedOut)
{
    a.ensureExtended();
    b.ensureExtended();
    if(swappedOut) {
        swappedOut[0] = a ? a._extended.nextTabNode : null;
        swappedOut[1] = b ? b._extended.prevTabNode : null;
    }
    //console.log(a, b);
    if(a) {
        a._extended.nextTabNode = b;
    }
    if(b) {
        b._extended.prevTabNode = a;
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

parsegraph_Node.prototype.neighborAt = function(dir)
{
    return this._neighbors[dir];
};

parsegraph_Node.prototype.ensureNeighbor = function(inDirection)
{
    if(!this.neighborAt(inDirection)) {
        this._neighbors[inDirection] = new parsegraph_NeighborData(this, inDirection);
    }
    return this.neighborAt(inDirection);
};

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
    return this._parentNeighbor.xPos;
};

parsegraph_Node.prototype.y = function()
{
    if(this.isRoot()) {
        return 0;
    }
    return this._parentNeighbor.yPos;
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
    if(!this._absoluteDirty && (!this.isRoot()
            && this._absoluteVersion === this.parentNode().findPaintGroup()._absoluteVersion
    )) {
        //console.log(this + " does not need an absolute version update, so just return.");
        return;
    }
    //console.log(this + " needs an absolute version update");
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;

    // Retrieve a stack of nodes to determine the absolute position.
    var node = this;
    var nodeList = [];
    var parentScale = 1.0;
    var scale = 1.0;
    var neededVersion;
    if(!this.isRoot()) {
        neededVersion = this.parentNode().findPaintGroup()._absoluteVersion;
    }
    while(true) {
        if(node.isRoot()) {
            this._absoluteXPos = 0;
            this._absoluteYPos = 0;
            break;
        }

        var par = node.nodeParent();
        if(!par._absoluteDirty && par._absoluteVersion === neededVersion) {
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
        if(node._absoluteDirty) {
            node._absoluteXPos = this._absoluteXPos;
            node._absoluteYPos = this._absoluteYPos;
            node._absoluteScale = scale;
            node._absoluteDirty = false;
            if(!node.isRoot()) {
                node._absoluteVersion = node.parentNode().findPaintGroup()._absoluteVersion;
            }
        }
        scale *= node.scaleAt(directionToChild);
        node = node.nodeAt(directionToChild);
    }

    //console.log(this + " has absolute pos " + this._absoluteXPos + ", " + this._absoluteYPos);
    this._absoluteXPos += node.x() * parentScale;
    this._absoluteYPos += node.y() * parentScale;
    this._absoluteScale = scale;
    this._absoluteDirty = false;
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
    return this.needsCommit() || !this._hasGroupPos;
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
    if(this._hasGroupPos) {
        //console.log(this + " does not need a position update.");
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

    this._hasGroupPos = true;
};

parsegraph_Node.prototype.groupX = function()
{
    if(this.findPaintGroup().needsPosition()) {
        this.commitLayoutIteratively();
    }
    if(this._groupXPos === null || Number.isNaN(this._groupXPos)) {
        throw new Error("Group X position must not be " + this._groupXPos);
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
    //console.log("Connecting paint groups " + a + " to " + b);
};

parsegraph_Node.prototype.setPaintGroup = function(paintGroup)
{
    paintGroup = !!paintGroup;
    if(this.localPaintGroup() === paintGroup) {
        return;
    }
    this.ensureExtended();

    if(paintGroup) {
        //console.log(this + " is becoming a paint group.");
        this._extended.isPaintGroup = true;

        if(this.isRoot()) {
            // Do nothing; this node was already an implied paint group.
        }
        else {
            this.parentNode().removeFromLayout(parsegraph_reverseNodeDirection(this.parentDirection()));
            var paintGroupFirst = this.findFirstPaintGroup();
            //console.log("First paint group of " + this + " is " + paintGroupFirst);
            var parentsPaintGroup = this.parentNode().findPaintGroup();
            //console.log("Parent paint group of " + this + " is " + parentsPaintGroup);
            parsegraph_connectPaintGroup(parentsPaintGroup._paintGroupPrev, paintGroupFirst);
            parsegraph_connectPaintGroup(this, parentsPaintGroup);
        }

        this.layoutChanged();
        for(var n = this._layoutNext; n !== this; n = n._layoutNext) {
            n._currentPaintGroup = this;
        }
        return;
    }

    this.thaw();
    this._extended.isPaintGroup = false;

    //console.log(this + " is no longer a paint group.");
    if(!this.isRoot()) {
        var paintGroupLast = this.findLastPaintGroup();
        this.parentNode().insertIntoLayout(parsegraph_reverseNodeDirection(this.parentDirection()));

        // Remove the paint group's entry in the parent.
        //console.log("Node " + this + " is not a root, so adding paint groups.");
        if(paintGroupLast !== this) {
            parsegraph_connectPaintGroup(paintGroupLast, this._paintGroupNext);
        }
        else {
            parsegraph_connectPaintGroup(this._paintGroupPrev, this._paintGroupNext);
        }
        this._paintGroupNext = this;
        this._paintGroupPrev = this;

        var pg = this.parentNode().findPaintGroup();
        for(var n = pg._layoutNext; n !== pg; n = n._layoutNext) {
            n._currentPaintGroup = pg;
        }
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

parsegraph_Node.prototype.ensureExtended = function()
{
    if(!this._extended) {
        //console.log(new Error("Extending"));
        this._extended = new parsegraph_ExtendedNode();
    }
    return this._extended;
};

parsegraph_Node.prototype.markDirty = function()
{
    //console.log(this + " marked dirty");
    this.ensureExtended();
    this._extended.dirty = true;
    this._extended.commitLayoutFunc = null;
    for(var wid in this._extended.windowPaintGroup) {
        this._extended.windowPaintGroup[wid] = null;
    }
};

parsegraph_Node.prototype.isDirty = function()
{
    return this._extended && this._extended.dirty;
};

parsegraph_Node.prototype.painter = function(window)
{
    this.ensureExtended();
    if(!window) {
        throw new Error("A window must be provided for a NodePainter to be selected");
    }
    return this._extended.windowPainter[window.id()];
};

parsegraph_Node.prototype.findPaintGroup = function()
{
    if(!this._currentPaintGroup) {
        var node = this;
        while(!node.isRoot()) {
            if(node.localPaintGroup()) {
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
    return !!this._extended && !!this._extended.isPaintGroup;
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
    throw new Error("Unreachable");
};

parsegraph_Node.prototype.setClickListener = function(listener, thisArg)
{
    if(!listener) {
        if(this._extended) {
            this._extended.clickListener = null;
            this._extended.clickListenerThisArg = null;
        }
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    this.ensureExtended();
    this._extended.clickListener = listener;
    this._extended.clickListenerThisArg = thisArg;
    //console.log("Set click listener for node " + this._id);
};

parsegraph_Node.prototype.setChangeListener = function(listener, thisArg)
{
    if(!listener) {
        if(this._extended) {
            this._extended.changeListener = null;
            this._extended.changeListenerThisArg = null;
        }
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    this.ensureExtended();
    this._extended.changeListener = listener;
    this._extended.changeListenerThisArg = thisArg;
    //console.log("Set change listener for node " + this._id);
};

parsegraph_Node.prototype.isClickable = function()
{
    var hasLabel = this._label && !Number.isNaN(this._label._x) && this._label.editable();
    return this.type() === parsegraph_SLIDER || (this.hasClickListener() || !this.ignoresMouse()) || hasLabel;
};

parsegraph_Node.prototype.setIgnoreMouse = function(value)
{
    if(!value && !this._extended) {
        return;
    }
    this.ensureExtended();
    this._extended.ignoresMouse = value;
};

parsegraph_Node.prototype.ignoresMouse = function()
{
    if(!this._extended) {
        return true;
    }
    return this._extended.ignoresMouse;
};

/**
 */
parsegraph_Node.prototype.hasClickListener = function()
{
    return this._extended && this._extended.clickListener != null;
};

parsegraph_Node.prototype.hasChangeListener = function()
{
    return this._extended && this._extended.changeListener != null;
};

parsegraph_Node.prototype.valueChanged = function()
{
    // Invoke the listener.
    if(!this.hasChangeListener()) {
        return;
    }
    this._extended.changeListener.apply(this._extended.changeListenerThisArg, arguments);
};

parsegraph_Node.prototype.click = function(viewport)
{
    // Invoke the click listener.
    if(!this.hasClickListener()) {
        return;
    }
    return this._extended.clickListener.call(this._extended.clickListenerThisArg, viewport);
};

parsegraph_Node.prototype.setKeyListener = function(listener, thisArg)
{
    if(!listener) {
        if(this._extended) {
            this._extended.keyListener = null;
            this._extended.keyListenerThisArg = null;
        }
        return;
    }
    if(!thisArg) {
        thisArg = this;
    }
    if(!this._extended) {
        this._extended = new parsegraph_ExtendedNode();
    }
    this._extended.keyListener = listener;
    this._extended.keyListenerThisArg = thisArg;
};

parsegraph_Node.prototype.hasKeyListener = function()
{
    return this._extended && this._extended.keyListener != null;
};

parsegraph_Node.prototype.key = function()
{
    // Invoke the key listener.
    if(!this.hasKeyListener()) {
        return;
    }
    return this._extended.keyListener.apply(this._extended.keyListenerThisArg, arguments);
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
    return !this._parentNeighbor;
};

parsegraph_Node.prototype.parentDirection = function()
{
    if(this.isRoot()) {
        return parsegraph_NULL_NODE_DIRECTION;
    }
    return parsegraph_reverseNodeDirection(this._parentNeighbor.direction);
};

parsegraph_Node.prototype.nodeParent = function()
{
    if(this.isRoot()) {
        throw parsegraph_createException(parsegraph_NODE_IS_ROOT);
    }
    return this._parentNeighbor.owner;
};
parsegraph_Node.prototype.parentNode = parsegraph_Node.prototype.nodeParent;
parsegraph_Node.prototype.parent = parsegraph_Node.prototype.nodeParent;

parsegraph_Node.prototype.hasNode = function(atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        return false;
    }
    if(this._neighbors[atDirection] && this._neighbors[atDirection].node) {
        return true;
    }
    return !this.isRoot() && this.parentDirection() === atDirection;
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
parsegraph_Node.prototype.hasChild = parsegraph_Node.prototype.hasChildAt;

parsegraph_Node.prototype.hasAnyNodes = function()
{
    return this.hasChildAt(parsegraph_DOWNWARD)
        || this.hasChildAt(parsegraph_UPWARD)
        || this.hasChildAt(parsegraph_FORWARD)
        || this.hasChildAt(parsegraph_BACKWARD)
        || this.hasChildAt(parsegraph_INWARD);
};

function parsegraph_dumpPaintGroups(node)
{
    var pgs = [];
    var pg = node;
    do {
        pg = pg._paintGroupNext;
        pgs.push(pg);
    } while(pg !== node);
    return pgs;
}

parsegraph_Node.prototype.nodeAt = function(atDirection)
{
    var n = this._neighbors[atDirection];
    if(!n) {
        if(this._parentNeighbor && this.parentDirection() === atDirection) {
            return this._parentNeighbor.owner;
        }
        return null;
    }
    return n.node;
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
    //console.log("Connecting " + node + " to " + this + " in the " + parsegraph_nameNodeDirection(inDirection) + " direction.");

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
    var neighbor = this.ensureNeighbor(inDirection);
    neighbor.node = node;
    node.assignParent(this, inDirection);

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
    if(arguments.length === 0) {
        if(this.isRoot()) {
            throw new Error("Cannot disconnect a root node.");
        }
        return this.parentNode().disconnectNode(
            parsegraph_reverseNodeDirection(this.parentDirection())
        );
    }
    if(!this.hasNode(inDirection)) {
        return;
    }
    // Disconnect the node.
    var neighbor = this._neighbors[inDirection];
    var disconnected = neighbor.node;

    if(!disconnected.localPaintGroup()) {
        this.removeFromLayout(inDirection);
    }
    var paintGroupFirst = disconnected.findFirstPaintGroup();
    parsegraph_connectPaintGroup(paintGroupFirst._paintGroupPrev, disconnected._paintGroupNext);
    parsegraph_connectPaintGroup(disconnected, paintGroupFirst);

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

parsegraph_Node.prototype.eraseNode = function(givenDirection) {
    if(!this.hasNode(givenDirection)) {
        return;
    }
    if(!this.isRoot() && givenDirection == this.parentDirection()) {
        throw parsegraph_createException(parsegraph_CANNOT_AFFECT_PARENT);
    }
    this.disconnectNode(givenDirection);
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
        if(dir === this.parentDirection()) {
            continue;
        }
        if(this.hasNode(dir)) {
            var candidate = this.nodeAt(dir);
            if(candidate && !candidate.localPaintGroup()) {
                layoutBefore = candidate;
                break;
            }
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
        if(dir === this.parentDirection()) {
            continue;
        }
        if(this.hasNode(dir)) {
            var candidate = this.nodeAt(dir);
            if(candidate && !candidate.localPaintGroup()) {
                layoutAfter = candidate;
                break;
            }
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

parsegraph_Node.prototype.eachChild = function(visitor, visitorThisArg)
{
    var dirs = this.layoutOrder();
    for(var i = 0; i < dirs.length; ++i) {
        var dir = dirs[i];
        if(!this.isRoot() && dir === this.parentDirection()) {
            continue;
        }
        var node = this.nodeAt(dir);
        if(node) {
            visitor.call(visitorThisArg, node, dir);
        }
    }
};

parsegraph_Node.prototype.scaleAt = function(direction)
{
    return this.nodeAt(direction).scale();
};

parsegraph_Node.prototype.lineLengthAt = function(direction)
{
    if(!this.hasNode(direction)) {
        return 0;
    }
    return this._neighbors[direction].lineLength;
};

parsegraph_Node.prototype.extentsAt = function(atDirection)
{
    if(atDirection === parsegraph_NULL_NODE_DIRECTION) {
        throw new Error(parsegraph_BAD_NODE_DIRECTION);
    }
    return this._extents[atDirection - parsegraph_DOWNWARD];
};

parsegraph_Node.prototype.extentOffsetAt = function(atDirection)
{
    return this.extentsAt(atDirection).offset();
};

parsegraph_Node.prototype.setExtentOffsetAt = function(atDirection, offset)
{
    this.extentsAt(atDirection).setOffset(offset);
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

parsegraph_Node.prototype.showNodeInCamera = function(cam, onlyScaleIfNecessary)
{
    this.commitLayoutIteratively();
    var bodySize = this.absoluteSize();

    var bodyRect = new parsegraph_Rect(
        this.absoluteX(),
        this.absoluteY(),
        bodySize[0],
        bodySize[1]
    );
    //if(cam.ContainsAll(bodyRect)) {
        //return;
    //}

    var nodeScale = this.absoluteScale();

    var camScale = cam.scale();
    var screenWidth = cam.width();
    var screenHeight = cam.height();

    var scaleAdjustment;
    var widthIsBigger = screenWidth / (bodySize[0]*nodeScale) < screenHeight / (bodySize[1]*nodeScale);
    if(widthIsBigger) {
        scaleAdjustment = screenWidth / (bodySize[0]*nodeScale);
    }
    else {
        scaleAdjustment = screenHeight / (bodySize[1]*nodeScale);
    }
    if(scaleAdjustment > camScale) {
        scaleAdjustment = camScale;
    }
    else {
        cam.setScale(scaleAdjustment);
    }

    var ax = this.absoluteX();
    var ay = this.absoluteY();
    cam.setOrigin(-ax + screenWidth/(scaleAdjustment*2), -ay + screenHeight/(scaleAdjustment*2));
};

parsegraph_Node.prototype.showInCamera = function(cam, onlyScaleIfNecessary)
{
    //console.log("Showing node in camera");
    this.commitLayoutIteratively();
    var bodySize = this.extentSize();
    var nodeScale = this.absoluteScale();
    var camScale = cam.scale();
    var screenWidth = cam.width();
    var screenHeight = cam.height();
    if(Number.isNaN(screenWidth) || Number.isNaN(screenHeight)) {
        throw new Error("Camera size must be set before a node can be shown in it.");
    }

    // Adjust camera scale.
    var scaleAdjustment;
    var widthIsBigger = screenWidth / bodySize[0] < screenHeight / bodySize[1];
    if(widthIsBigger) {
        scaleAdjustment = screenWidth / bodySize[0];
    }
    else {
        scaleAdjustment = screenHeight / bodySize[1];
    }
    var scaleMaxed = scaleAdjustment > parsegraph_NATURAL_VIEWPORT_SCALE;
    if(scaleMaxed) {
        scaleAdjustment = parsegraph_NATURAL_VIEWPORT_SCALE;
    }
    if(onlyScaleIfNecessary && scaleAdjustment/nodeScale > camScale) {
        scaleAdjustment = camScale;
    }
    else {
        cam.setScale(scaleAdjustment/nodeScale);
    }

    // Get node extents.
    var x, y;
    var bv = [null, null, null];
    this.extentsAt(parsegraph_BACKWARD).boundingValues(bv);
    x = bv[2]*nodeScale;
    this.extentsAt(parsegraph_UPWARD).boundingValues(bv);
    y = bv[2]*nodeScale;

    if(widthIsBigger || scaleMaxed) {
        y += screenHeight/(cam.scale()*2) - nodeScale*bodySize[1]/2;
    }
    if(!widthIsBigger || scaleMaxed) {
        x += screenWidth/(cam.scale()*2) - nodeScale*bodySize[0]/2;
    }

    // Move camera into position.
    var ax = this.absoluteX();
    var ay = this.absoluteY();
    cam.setOrigin(x - ax, y - ay);
};

parsegraph_Node.prototype.setNodeAlignmentMode = function(inDirection, newAlignmentMode)
{
    if(arguments.length === 1) {
        return this.parentNode().setNodeAlignmentMode(
            parsegraph_reverseNodeDirection(this.parentDirection()),
            arguments[0]
        );
    }
    this.ensureNeighbor(inDirection).alignmentMode = newAlignmentMode;
    //console.log(parsegraph_nameNodeAlignment(newAlignmentMode));
    this.layoutWasChanged(inDirection);
};

parsegraph_Node.prototype.nodeAlignmentMode = function(inDirection)
{
    if(this._neighbors[inDirection]) {
        return this._neighbors[inDirection].alignmentMode;
    }
    return parsegraph_NULL_NODE_ALIGNMENT;
};

parsegraph_Node.prototype.setAxisOverlap = function(inDirection, newAxisOverlap)
{
    if(arguments.length === 1) {
        return this.parentNode().setAxisOverlap(
            parsegraph_reverseNodeDirection(this.parentDirection()),
            arguments[0]
        );
    }
    this.ensureNeighbor(inDirection).allowAxisOverlap = newAxisOverlap;
    this.layoutWasChanged(inDirection);
};

parsegraph_Node.prototype.axisOverlap = function(inDirection)
{
    if(arguments.length === 0) {
        return this.parentNode().axisOverlap(
            parsegraph_reverseNodeDirection(this.parentDirection())
        );
    }
    if(this._neighbors[inDirection]) {
        return this._neighbors[inDirection].allowAxisOverlap;
    }
    return parsegraph_NULL_AXIS_OVERLAP;
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
    return this._extended && this._extended.value;
};

parsegraph_Node.prototype.setValue = function(newValue, report)
{
    this.ensureExtended();
    //console.log("Setting value to ", newValue);
    if(this._extended.value === newValue) {
        return;
    }
    this._extended.value = newValue;
    if(arguments.length === 1 || report) {
        this.valueChanged();
    }
};

parsegraph_Node.prototype.scene = function()
{
    return this._extended && this._extended.scene;
};

parsegraph_Node.prototype.setScene = function(scene)
{
    this.ensureExtended().scene = scene;
    this.layoutWasChanged(parsegraph_INWARD);
};

parsegraph_Node.prototype.typeAt = function(direction)
{
    if(!this.hasNode(direction)) {
        return parsegraph_NULL_NODE_TYPE;
    }
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
    return this._label;
};

parsegraph_Node.prototype.setLabel = function(text, font)
{
    if(!font) {
        font = parsegraph_defaultFont();
    }
    if(!this._label) {
        this._label = new parsegraph_Label(font);
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
    //console.log("Calculated " + parsegraph_nameNodeType(this.type()) + " node size of (" + bodySize[0] + ", " + bodySize[1] + ")");
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
        this._parentNeighbor = null;
        return;
    }
    this._parentNeighbor = fromNode.neighborAt(parentDirection);
    if(!this._parentNeighbor) {
        throw new Error("Parent neighbor must be found when being assigned.");
    }
};

parsegraph_Node.prototype.isSelected = function()
{
    return this._extended && this._extended.selected;
};

parsegraph_Node.prototype.setSelected = function(selected)
{
    //console.log(new Error("setSelected(" + selected + ")"));
    this.ensureExtended().selected = selected;
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

parsegraph_Node.prototype.inNodeBody = function(x, y, userScale, bodySize)
{
    var s = this.size(bodySize);
    var ax = this.absoluteX();
    var ay = this.absoluteY();
    var aScale = this.absoluteScale();
    if(x < userScale * ax - userScale * aScale * s.width()/2) {
        //console.log("Given coords are outside this node's body. (Horizontal minimum exceeds X-coord)");
        return false;
    }
    if(x > userScale * ax + userScale * aScale * s.width()/2) {
        //console.log("Given coords are outside this node's body. (X-coord exceeds horizontal maximum)");
        return false;
    }
    if(y < userScale * ay - userScale * aScale * s.height()/2) {
        //console.log("Given coords are outside this node's body. (Vertical minimum exceeds Y-coord)");
        return false;
    }
    if(y > userScale * ay + userScale * aScale * s.height()/2) {
        //console.log("Given coords are outside this node's body. (Y-coord exceeds vertical maximum)");
        return false;
    }
    //console.log("Within node body" + this);
    return true;
};

parsegraph_Node.prototype.inNodeExtents = function(x, y, userScale, extentSize)
{
    var ax = this.absoluteX();
    var ay = this.absoluteY();
    var aScale = this.absoluteScale();
    extentSize = this.extentSize(extentSize);

    //console.log("Checking node extent of size (" + extentSize[0] + ", " + extentSize[1] + ") at absolute X, Y origin of " + ax + ", " + ay");
    if(aScale != 1) {
        //console.log("Node absolute scale is " + aScale);
    }
    if(userScale != 1) {
        //console.log("User scale is " + userScale);
    }
    //console.log("Position to test is (" + x + ", " + y + ")");

    //this.dump();
    var forwardMin = userScale * ax - userScale * aScale * this.extentOffsetAt(parsegraph_DOWNWARD);
    if(x < forwardMin) {
        //console.log("Test X value of " + x + " is behind horizontal node minimum of " + forwardMin + ".");
        return false;
    }
    var forwardMax = userScale * ax - userScale * aScale * this.extentOffsetAt(parsegraph_DOWNWARD) + userScale * aScale * extentSize.width();
    //console.log("ForwardMax = " + forwardMax + " = ax=" + this.absoluteX() + " - offset=" + this.extentOffsetAt(parsegraph_DOWNWARD) + " + width=" + extentSize.width());
    if(x > forwardMax) {
        //console.log("Test X value of " + x + " is ahead of horizontal node maximum of " + forwardMax + ".");
        return false;
    }
    var vertMin = userScale * ay - userScale * aScale * this.extentOffsetAt(parsegraph_FORWARD);
    if(y < vertMin) {
        //console.log("Test Y value of " + y + " is above node vertical minimum of " + vertMin + ".");
        return false;
    }
    var vertMax = userScale * ay - userScale * aScale * this.extentOffsetAt(parsegraph_FORWARD) + userScale * aScale * extentSize.height();
    if(y > vertMax) {
        //console.log("Test Y value of " + y + " is beneath node vertical maximum of " + vertMax + ".");
        return false;
    }
    //console.log("Test value is in within node extent.");
    return true;
};

parsegraph_Node.prototype.nodeUnderCoords = function(x, y, userScale)
{
    //console.log("nodeUnderCoords: " + x + ", " + y)
    if(userScale === undefined) {
        userScale = 1;
    }

    var extentSize = new parsegraph_Size();
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
        //console.log("Checking node " + candidate._id + " = " + candidate.label());

        if(candidate === FORCE_SELECT_PRIOR) {
            candidates.pop();
            return candidates.pop();
        }

        if(candidate.inNodeBody(x, y, userScale, extentSize)) {
            //console.log("Click is in node body");
            if(candidate.hasNode(parsegraph_INWARD)) {
                if(candidate.nodeAt(parsegraph_INWARD).inNodeExtents(x, y, userScale, extentSize)) {
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
        if(!candidate.inNodeExtents(x, y, userScale, extentSize)) {
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
            //console.log(new Error("Creating size"));
            bodySize = new parsegraph_Size();
        }
        var scaling = style.fontSize / this._label.font().fontSize();
        bodySize[0] = this._label.width() * scaling;
        bodySize[1] = this._label.height() * scaling;
        if(Number.isNaN(bodySize[0]) || Number.isNaN(bodySize[1])) {
            throw new Error("Label returned a NaN size.");
        }
    }
    else if(!bodySize) {
        //console.log(new Error("Creating size"));
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
                bodySize.setHeight(Math.max(
                    style.minHeight,
                    bodySize.height() + this.verticalPadding() + scale * nestedSize.height()
                ));
            }
            else {
                bodySize.setHeight(Math.max(
                    bodySize.height(),
                    scale * nestedSize.height() + 2 * this.verticalPadding()
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

function parsegraph_CommitLayoutData()
{
    this.bodySize = new parsegraph_Size();
    this.lineBounds = new parsegraph_Size();
    this.bv = [null, null, null];
    this.firstSize = new parsegraph_Size();
    this.secondSize = new parsegraph_Size();
    this.needsPosition = false;
}

parsegraph_Node.prototype.commitLayout = function(cld)
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

    if(this._nodeFit === parsegraph_NODE_FIT_NAIVE && (this.isRoot() || this.x() !== null)) {
        this._layoutState = parsegraph_COMMITTED_LAYOUT;
        return;
    }

    var initExtent = function(
        inDirection,
        length,
        size,
        offset)
    {
        var extent = this.extentsAt(inDirection);
        extent.clear();
        extent.appendLS(length, size);
        this.setExtentOffsetAt(inDirection, offset);
        //console.log(new Error("OFFSET = " + offset));
    };

    var bodySize, lineBounds, bv, firstSize, secondSize;
    if(cld) {
        bodySize = cld.bodySize;
        lineBounds = cld.lineBounds;
        bv = cld.bv;
        firstSize = cld.firstSize;
        secondSize = cld.secondSize;
    }
    else {
        lineBounds = new parsegraph_Size();
        bv = [null, null, null];
        firstSize = new parsegraph_Size();
        secondSize = new parsegraph_Size();
    }
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

        var alignmentMode = this.nodeAlignmentMode(childDirection);
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
            child.size(firstSize);
            if(parsegraph_isVerticalNodeDirection(childDirection)) {
                extentSize = firstSize.height() / 2;
            }
            else {
                extentSize = firstSize.width() / 2;
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
            var lengthOffset = this.extentOffsetAt(direction)
                + lengthAdjustment
                - this.scaleAt(childDirection) * child.extentOffsetAt(direction);

            // Combine the two extents in the given direction.
            /*console.log("Combining " + parsegraph_nameNodeDirection(direction) + ", " );
            console.log("Child: " + parsegraph_nameLayoutState(child._layoutState));
            console.log("Length offset: " + lengthOffset);
            console.log("Size adjustment: " + sizeAdjustment);
            console.log("ExtentOffset : " + this._neighbors[direction].extentOffset);
            console.log("Scaled child ExtentOffset : " + (this.scaleAt(childDirection) * child.extentOffsetAt(direction)));*/
            var e = this.extentsAt(direction);
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
                this.setExtentOffsetAt(direction,
                    this.extentOffsetAt(direction) + Math.abs(lengthOffset)
                );
            }

            /*console.log(
                "New "
                + parsegraph_nameNodeDirection(direction)
                + " extent offset = "
                + this.extentOffsetAt(direction)
            );
            this.extentsAt(direction).forEach(function(l, s, i) {
                console.log(i + ". length=" + l + ", size=" + s);
            });*/

            // Assert the extent offset is positive.
            if(this.extentOffsetAt(direction) < 0) {
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

        switch(this.axisOverlap(direction)) {
        case parsegraph_PREVENT_AXIS_OVERLAP:
            allowAxisOverlap = false;
            break;
        case parsegraph_ALLOW_AXIS_OVERLAP:
            allowAxisOverlap = true;
            break;
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
            this._layoutState = parsegraph_NEEDS_COMMIT;
            //console.log(parsegraph_getLayoutNodes(child.findPaintGroup()));
            //console.log(parsegraph_nameLayoutPreference(child._layoutPreference));
            //console.log("Child's paint group is dirty: " + child.findPaintGroup().isDirty());
            //console.log(parsegraph_nameNodeDirection(direction) + " Child " + parsegraph_nameNodeType(child.type()) + " " + (child._id) + " does not have a committed layout. Child's layout state is " + parsegraph_nameLayoutState(child._layoutState), child);
            return true;
        }

        // Separate the child from this node.
        var separationFromChild = this.extentsAt(direction).separation(childExtent,
            this.extentOffsetAt(direction)
            + alignment
            - this.scaleAt(direction) * child.extentOffsetAt(reversed),
            allowAxisOverlap,
            this.scaleAt(direction),
            parsegraph_LINE_THICKNESS / 2
        );
        //console.log("Calculated unpadded separation of " + separationFromChild + ".");

        // Add padding and ensure the child is not separated less than
        // it would be if the node was not offset by alignment.
        child.size(firstSize);
        if(parsegraph_getNodeDirectionAxis(direction) == parsegraph_VERTICAL_AXIS) {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (firstSize.height() / 2) + bodySize.height() / 2
            );
            separationFromChild
                += this.verticalSeparation(direction) * this.scaleAt(direction);
        }
        else {
            separationFromChild = Math.max(
                separationFromChild,
                this.scaleAt(direction) * (firstSize.width() / 2) + bodySize.width() / 2
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
        if(firstDirection === secondDirection && firstDirection != parsegraph_NULL_NODE_DIRECTION) {
            throw new Error("Bad node direction");
        }
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
            if(layoutSingle.call(this, firstAxisDirection, allowAxisOverlap)) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }
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

        /*
        var firstExtent = this.extentsAt(firstDirection);
        console.log(
            "This " +
            parsegraph_nameNodeDirection(firstDirection) +
            " extent (offset to center=" +
            this.extentOffsetAt(firstDirection) +
            ")"
        );
        firstExtent.forEach(
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
            "firstDirection extentOffset=" +
                this.extentOffsetAt(firstDirection)
        );
        console.log(
            "firstNode.extentOffsetAt(secondDirection)=" + firstNode.extentOffsetAt(secondDirection)
        );*/

        var firstAxisOverlap = allowAxisOverlap;
        switch(this.nodeAt(firstDirection).axisOverlap()) {
        case parsegraph_PREVENT_AXIS_OVERLAP:
            firstAxisOverlap = false;
            break;
        case parsegraph_ALLOW_AXIS_OVERLAP:
            firstAxisOverlap = true;
            break;
        }
        var secondAxisOverlap = allowAxisOverlap;
        switch(this.nodeAt(secondDirection).axisOverlap()) {
        case parsegraph_PREVENT_AXIS_OVERLAP:
            secondAxisOverlap = false;
            break;
        case parsegraph_ALLOW_AXIS_OVERLAP:
            secondAxisOverlap = true;
            break;
        }

        // Allow some overlap if we have both first-axis sides, but
        // nothing ahead on the second axis.
        var separationFromFirst = this.extentsAt(firstDirection).separation(
                firstNode.extentsAt(secondDirection),
                this.extentOffsetAt(firstDirection)
                + firstNodeAlignment
                - this.scaleAt(firstDirection) * firstNode.extentOffsetAt(secondDirection),
                firstAxisOverlap,
                this.scaleAt(firstDirection),
                parsegraph_LINE_THICKNESS / 2
            );

        var separationFromSecond = this.extentsAt(secondDirection)
            .separation(
                secondNode.extentsAt(firstDirection),
                this.extentOffsetAt(secondDirection)
                + secondNodeAlignment
                - this.scaleAt(secondDirection) * secondNode.extentOffsetAt(firstDirection),
                secondAxisOverlap,
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

        firstNode.size(firstSize);
        secondNode.size(secondSize);
        if(
            parsegraph_getNodeDirectionAxis(firstDirection)
            == parsegraph_VERTICAL_AXIS
        ) {
            separationFromFirst = Math.max(
                separationFromFirst,
                this.scaleAt(firstDirection) * (firstSize.height() / 2)
                + bodySize.height() / 2
            );
            separationFromFirst
                += this.verticalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondSize.height() / 2)
                + bodySize.height() / 2
            );
            separationFromSecond
                += this.verticalSeparation(secondDirection)
                * this.scaleAt(secondDirection);
        }
        else {
            separationFromFirst = Math.max(
                separationFromFirst,
                this.scaleAt(firstDirection) * (firstSize.width() / 2)
                + bodySize.width() / 2
            );
            separationFromFirst
                += this.horizontalSeparation(firstDirection)
                * this.scaleAt(firstDirection);

            separationFromSecond = Math.max(
                separationFromSecond,
                this.scaleAt(secondDirection) * (secondSize.width() / 2)
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
            if(layoutAxis.call(this, parsegraph_BACKWARD, parsegraph_FORWARD,
                !this.hasNode(parsegraph_UPWARD) && !this.hasNode(parsegraph_DOWNWARD)
            )) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            if(layoutAxis.call(this, parsegraph_UPWARD, parsegraph_DOWNWARD, true)) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }
        }
        else {
            // Root-like, so just lay out both axes.
            if(layoutAxis.call(this, parsegraph_UPWARD, parsegraph_DOWNWARD,
                !this.hasNode(parsegraph_BACKWARD) && !this.hasNode(parsegraph_FORWARD)
            )) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            if(layoutAxis.call(this, parsegraph_BACKWARD, parsegraph_FORWARD, true)) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }
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
            if(layoutAxis.call(
                this,
                hasFirstAxisNodes[0],
                hasFirstAxisNodes[1],
                false
            )) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }

            // Layout this node's second-axis child, if that child exists.
            if(this.hasNode(oppositeFromParent)) {
                // Layout the second-axis child.
                if(layoutSingle.call(this, oppositeFromParent, true)) {
                    this._layoutState = parsegraph_NEEDS_COMMIT;
                    return true;
                }
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
                if(layoutSingle.call(
                    this,
                    oppositeFromParent,
                    true //firstDirection != parsegraph_NULL_NODE_DIRECTION || secondDirection != parsegraph_NULL_NODE_DIRECTION
                )) {
                    this._layoutState = parsegraph_NEEDS_COMMIT;
                    return true;
                }
            }

            if(layoutAxis.call(this, perpendicularNodes[0], perpendicularNodes[1], true)) {
                this._layoutState = parsegraph_NEEDS_COMMIT;
                return true;
            }
        }
    }

    var addLineBounds = function(given)
    {
        if(!this.hasChild(given)) {
            return;
        }

        var perpAxis = parsegraph_getPerpendicularAxis(given);
        var dirSign = parsegraph_nodeDirectionSign(given);

        var positiveOffset = this.extentOffsetAt(parsegraph_getPositiveNodeDirection(perpAxis));

        var negativeOffset = this.extentOffsetAt(parsegraph_getNegativeNodeDirection(perpAxis));

        if(dirSign < 0) {
            var lineSize = this.sizeIn(given, lineBounds)
            positiveOffset -= lineSize + this.lineLengthAt(given);
            negativeOffset -= lineSize + this.lineLengthAt(given);
        }

        if(this.nodeFit() == parsegraph_NODE_FIT_EXACT) {
            // Append the line-shaped bound.
            var lineSize;
            if(perpAxis === parsegraph_VERTICAL_AXIS) {
                lineSize = bodySize.height()/2;
            }
            else {
                lineSize = bodySize.width()/2;
            }
            //lineSize = this.scaleAt(given) * parsegraph_LINE_THICKNESS / 2;
            this.extentsAt(parsegraph_getPositiveNodeDirection(perpAxis)).combineBound(
                positiveOffset,
                this.lineLengthAt(given),
                lineSize
            );
            this.extentsAt(parsegraph_getNegativeNodeDirection(perpAxis)).combineBound(
                negativeOffset,
                this.lineLengthAt(given),
                lineSize
            );
        }
    };

    // Set our extents, combined with non-point neighbors.
    parsegraph_forEachCardinalNodeDirection(addLineBounds, this);

    if(this.hasNode(parsegraph_INWARD)) {
        var nestedNode = this.nodeAt(parsegraph_INWARD);
        if(nestedNode._layoutState !== parsegraph_COMMITTED_LAYOUT) {
            this._layoutState = parsegraph_NEEDS_COMMIT;
            return true;
        }
        var nestedSize = nestedNode.extentSize(firstSize);
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
    if(!this.isRoot()) {
        return this.root().commitLayoutIteratively(timeout);
    }

    var layoutPhase = 1;
    var rootPaintGroup = this;
    var paintGroup = null;
    var root = null;
    var node = null;
    var cld = new parsegraph_CommitLayoutData();

    // Traverse the graph depth-first, committing each node's layout in turn.
    var commitLayoutLoop = function(timeout) {
        if(timeout <= 0) {
            return false;
        }
        var startTime = new Date();
        var i = 0;
        var pastTime = function(val) {
            ++i;
            if(i % 10 === 0) {
                var ct = new Date();
                var el = parsegraph_elapsed(startTime, ct);
                if(el > 4*1000) {
                    console.log(val);
                }
                if(el > 5*1000) {
                    throw new Error("Commit Layout is taking too long");
                }
                if(timeout !== undefined && el > timeout) {
                    return true;
                }
            }
            return false;
        };
        // Commit layout for all nodes.
        while(layoutPhase === 1) {
            if(paintGroup === null) {
                //console.log("Beginning new commit layout phase 1");
                paintGroup = rootPaintGroup._paintGroupNext;
                root = paintGroup;
                node = root;
            }
            else {
                //console.log("Continuing commit layout phase 1");
            }
            if(pastTime(node._id)) {
                //console.log("Ran out of time between groups during phase 1 (Commit layout, timeout=" + timeout +")");
                return commitLayoutLoop;
            }
            if(root.needsCommit()) {
                cld.needsPosition = true;
                do {
                    // Loop back to the first node, from the root.
                    node = node._layoutNext;
                    if(node.needsCommit()) {
                        node.commitLayout(cld);
                        if(node.needsCommit()) {
                            // Node had a child that needed a commit, so reset the layout.
                            //console.log("Resetting layout");
                            paintGroup = null;
                            return commitLayoutLoop;
                        }
                        node._currentPaintGroup = paintGroup;
                    }
                    if(pastTime(node._id)) {
                        //console.log("Ran out of time mid-group during phase 1 (Commit layout)");
                        return commitLayoutLoop;
                    }
                } while(node !== root);
            }
            else {
                cld.needsPosition = cld.needsPosition || root.needsPosition();
            }
            if(paintGroup === rootPaintGroup) {
                //console.log("Commit layout phase 1 done");
                ++layoutPhase;
                paintGroup = null;
                break;
            }
            paintGroup = paintGroup._paintGroupNext;
            root = paintGroup;
            node = root;
        }
        // Calculate position.
        while(cld.needsPosition && layoutPhase === 2) {
            //console.log("Now in layout phase 2");
            if(paintGroup === null) {
                //console.log("Beginning layout phase 2");
                paintGroup = rootPaintGroup;
                root = paintGroup;
                node = root;
            }
            else {
                //console.log("Continuing layout phase 2");
            }
            //console.log("Processing position for ", paintGroup);
            if(pastTime(paintGroup._id)) {
                //console.log("Ran out of time between groups during phase 2 (Commit group position). Next node is ", paintGroup);
                return commitLayoutLoop;
            }
            if(paintGroup.needsPosition() || node) {
                //console.log(paintGroup + " needs a position update");
                if(!node) {
                    node = paintGroup;
                }
                do {
                    // Loop from the root to the last node.
                    node._absoluteDirty = true;
                    node._hasGroupPos = false;
                    node.commitGroupPos();
                    node = node._layoutPrev;
                    if(pastTime(node._id)) {
                        //console.log("Ran out of time mid-group during phase 2 (Commit group position). Next node is ", node);
                        paintGroup._hasGroupPos = false;
                        return commitLayoutLoop;
                    }
                } while(node !== root);
            }
            else {
                //console.log(paintGroup + " does not need a position update.");
            }
            ++paintGroup._absoluteVersion;
            paintGroup._absoluteDirty = true;
            paintGroup.commitAbsolutePos();
            paintGroup = paintGroup._paintGroupPrev;
            if(paintGroup === rootPaintGroup) {
                //console.log("Commit layout phase 2 done");
                ++layoutPhase;
                break;
            }
            root = paintGroup;
            node = null;
        }
        cld.needsPosition = false;
        return null;
    };

    return commitLayoutLoop(timeout);
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

    var node = this;
    while(node !== null) {
        //console.log("Node " + node + " has layout changed");
        var oldLayoutState = node._layoutState;

        // Set the needs layout flag.
        node._layoutState = parsegraph_NEEDS_COMMIT;
        node._hasGroupPos = false;
        node._currentPaintGroup = null;

        node.findPaintGroup().markDirty();

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

    if(this._extended && this._extended.cache) {
        this._extended.cache.invalidate();
    }
};
parsegraph_Node.prototype.layoutHasChanged = parsegraph_Node.prototype.layoutWasChanged;
parsegraph_Node.prototype.layoutChanged = parsegraph_Node.prototype.layoutWasChanged;

parsegraph_Node.prototype.freeze = function(freezer)
{
    if(!this.localPaintGroup()) {
        throw new Error("A node must be a paint group in order to be frozen.");
    }
    this.ensureExtended().cache = freezer.cache(this);
};

parsegraph_Node.prototype.isFrozen = function()
{
    return this._extended && this._extended.cache;
};

parsegraph_Node.prototype.thaw = function()
{
    if(!this.localPaintGroup()) {
        throw new Error("A node must be a paint group in order to be thawed.");
    }
    if(this.ensureExtended().cache) {
        this.ensureExtended().cache.invalidate();
        this.ensureExtended().cache = null;
    }
};

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
        neighbor.node = null;
    }, this);
    this._layoutState = parsegraph_NULL_LAYOUT_STATE;
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

function parsegraph_labeledBud(label, font)
{
    var node = new parsegraph_Node(parsegraph_BUD);
    node.setLabel(label, font);
    return node;
};

function parsegraph_labeledSlot(label, font)
{
    var node = new parsegraph_Node(parsegraph_SLOT);
    node.setLabel(label, font);
    return node;
};

function parsegraph_labeledBlock(label, font)
{
    var node = new parsegraph_Node(parsegraph_BLOCK);
    node.setLabel(label, font);
    return node;
};

parsegraph_Node.prototype.contextChanged = function(isLost, window)
{
    if(!this.localPaintGroup()) {
        return;
    }
    var node = this;
    do {
        node.markDirty();
        for(var wid in node._extended.windowPainter) {
            var painter = node._extended.windowPainter[wid];
            if(window.id() === wid) {
                painter.contextChanged(isLost);
            }
        }
        node = node._paintGroupNext;
    } while(node !== this);
};

parsegraph_Node.prototype.paint = function(window, timeout)
{
    if(!this.localPaintGroup()) {
        throw new Error("A node must be a paint group in order to be painted");
    }
    if(!this.isDirty()) {
        //console.log(this + " is not dirty");
        return false;
    }
    else {
        //console.log(this + " is dirty");
    }
    if(window.gl().isContextLost()) {
        return false;
    }
    if(timeout <= 0) {
        return true;
    }

    var t = new Date().getTime();
    var pastTime = function() {
        var isPast = timeout !== undefined && (new Date().getTime() - t > timeout);
        if(isPast) {
            //console.log("Past time: timeout=" + timeout + ", elapsed="+(new Date().getTime() - t));
        }
        return isPast;
    };

    // Load saved state.
    var wid = window.id();
    var savedPaintGroup = this._extended.windowPaintGroup[wid];

    var cont;
    if(this._extended.commitLayoutFunc) {
        //console.log("Continuing commit layout in progress");
        cont = this._extended.commitLayoutFunc(timeout);
    }
    else if(!savedPaintGroup) {
        //console.log("Starting new commit layout");
        cont = this.commitLayoutIteratively(timeout);
    }

    if(cont) {
        //console.log(this + " Timed out during commitLayout");
        this._extended.commitLayoutFunc = cont;
        return true;
    }
    else {
        //console.log(this + " Committed all layout");
        this._extended.commitLayoutFunc = null;
        this._extended.windowPaintGroup[wid] = this;
        savedPaintGroup = this;
    }

    // Continue painting.
    while(true) {
        if(pastTime()) {
            this._extended.dirty = true;
            //console.log("Ran out of time during painting (timeout=" + timeout + "). is " + savedPaintGroup);
            return true;
        }

        var paintGroup = savedPaintGroup;
        if(paintGroup.isDirty()) {
            // Paint and render nodes marked for the current group.
            //console.log("Painting " + paintGroup);
            var painter = paintGroup._extended.windowPainter[wid];
            if(!painter) {
                painter = new parsegraph_NodePainter(window);
                paintGroup._extended.windowPainter[wid] = painter;
            }
            var counts = {};
            var node = paintGroup;
            do {
                //console.log("Counting node " + node);
                painter.countNode(node, counts);
                node = node._layoutPrev;
            } while(node !== paintGroup);
            //console.log("Glyphs: " + counts.numGlyphs);
            painter.initBlockBuffer(counts);
            node = paintGroup;
            do {
                painter.drawNode(node);
                node = node._layoutPrev;
                ++parsegraph_NODES_PAINTED;
                //console.log("Painted nodes " + parsegraph_NODES_PAINTED);
            } while(node !== paintGroup);
            if(paintGroup.isFrozen()) {
                paintGroup.ensureExtended().cache.paint(window);
            }
        }
        paintGroup._extended.dirty = false;
        this._extended.windowPaintGroup[wid] = paintGroup._paintGroupNext;
        savedPaintGroup = this._extended.windowPaintGroup[wid];
        if(this._extended.windowPaintGroup[wid] === this) {
            break;
        }
    }

    this._extended.windowPaintGroup[wid] = null;
    //console.log("Completed node painting");
    return false;
};

function parsegraph_NodeRenderData()
{
    this.bounds = new parsegraph_Rect();
    this.scaleMat = matrixIdentity3x3();
    this.transMat = matrixIdentity3x3();
    this.worldMat = matrixIdentity3x3();
}

var renderTimes = [];
var renderData = new parsegraph_NodeRenderData();
var CACHED_RENDERS = 0;
var IMMEDIATE_RENDERS = 0;

parsegraph_Node.prototype.renderIteratively = function(window, camera)
{
    CACHED_RENDERS = 0;
    IMMEDIATE_RENDERS = 0;
    var start = new Date();
    //console.log("Rendering iteratively");
    var paintGroup = this;
    var dirtyRenders = 0;
    var nodesRendered = 0;
    var heaviestPaintGroup = null;
    var mostRenders = 0;

    do {
        if(!paintGroup.localPaintGroup() && !paintGroup.isRoot()) {
            throw new Error("Paint group chain must not refer to a non-paint group");
        }
        //console.log("Rendering node " + paintGroup);
        var painter = paintGroup.painter(window);
        if(!paintGroup.render(window, camera, renderData)) {
            ++dirtyRenders;
        }
        else if(painter._consecutiveRenders > 1) {
            mostRenders = Math.max(painter._consecutiveRenders, mostRenders);
            if(heaviestPaintGroup === null) {
                heaviestPaintGroup = paintGroup;
            }
            else if(painter.weight() > heaviestPaintGroup.painter(window).weight()) {
                heaviestPaintGroup = paintGroup;
            }
        }
        paintGroup = paintGroup._paintGroupPrev;
        ++nodesRendered;
    } while(paintGroup !== this);
    //console.log(nodesRendered + " paint groups rendered " + (dirtyRenders > 0 ? "(" + dirtyRenders + " dirty)" : ""));
    var renderTime = parsegraph_elapsed(start);
    if(renderTimes.length == 11) {
        renderTimes.splice(Math.floor(Math.random() * 11), 1);
    }
    if(mostRenders > 1) {
        renderTimes.push(renderTime);
        renderTimes.sort(function(a, b) {
            return a - b;
        });
        var meanRenderTime = renderTimes[Math.floor(renderTimes.length/2)];
        if(meanRenderTime > parsegraph_INTERVAL / 2) {
            //console.log("Freezing heaviest node " + heaviestPaintGroup + " (weight=" + heaviestPaintGroup.painter(window).weight() + ") because rendering took " + meanRenderTime + "ms (most renders = " + mostRenders + ")");
            var str = "[";
            for(var i = 0; i < renderTimes.length; ++i) {
                if(i > 0) {
                    str += ", ";
                }
                str += renderTimes[i];
            }
            str += "]";
            //console.log(str);
        }
    }
    return dirtyRenders > 0;
};

parsegraph_Node.prototype.getHeaviestNode = function(window)
{
    var node = this;
    var heaviest = 0;
    var heaviestNode = this;
    do {
        if(node._extended) {
            var painter = node._extended.windowPainter[window.id()];
            if(painter) {
                var nodeWeight = painter.weight();
                if(heaviest < nodeWeight) {
                    heaviestNode = node;
                    heaviest = nodeWeight;
                }
            }
        }
        node = node._paintGroupNext;
    } while(node !== this);
    return heaviestNode;
}

parsegraph_Node.prototype.renderOffscreen = function(window, renderWorld, renderScale, forceSimple)
{
    if(!this.localPaintGroup()) {
        throw new Error("Cannot render a node that is not a paint group");
    }
    var painter = this._extended.windowPainter[window.id()];
    if(!painter) {
        return false;
    }
    painter.render(renderWorld, renderScale, forceSimple);
};

parsegraph_Node.prototype.render = function(window, camera, renderData)
{
    if(!this.localPaintGroup()) {
        throw new Error("Cannot render a node that is not a paint group");
    }
    var painter = this._extended.windowPainter[window.id()];
    if(!painter) {
        return false;
    }
    if(this._absoluteXPos === null) {
        return false;
    }

    if(!renderData) {
        renderData = new parsegraph_NodeRenderData();
    }

    // Do not render paint groups that cannot be seen.
    var s = painter.bounds().clone(renderData.bounds);
    s.scale(this.scale());
    s.translate(this._absoluteXPos, this._absoluteYPos);
    if(camera && !camera.containsAny(s)) {
        //console.log("Out of bounds: " + this);
        return !this._absoluteDirty;
    }

    var world = camera.project();
    makeScale3x3I(renderData.scaleMat, this._absoluteScale);
    makeTranslation3x3I(renderData.transMat, this._absoluteXPos, this._absoluteYPos);
    matrixMultiply3x3I(renderData.worldMat, renderData.scaleMat, renderData.transMat);
    var renderWorld = matrixMultiply3x3I(renderData.worldMat, renderData.worldMat, world);
    var renderScale = this._absoluteScale * (camera ? camera.scale() : 1);

    //console.log("Rendering paint group: " + this.absoluteX() + " " + this.absoluteY() + " " + this.absoluteScale());
    if(this._extended.cache && renderScale < parsegraph_CACHE_ACTIVATION_SCALE) {
        //console.log("Rendering " + this + " from cache.");
        var cleanRender = this._extended.cache.render(window, renderWorld, renderData, CACHED_RENDERS === 0);
        if(IMMEDIATE_RENDERS > 0) {
            //console.log("Immediately rendered " +IMMEDIATE_RENDERS + " times");
            IMMEDIATE_RENDERS = 0;
        }
        ++CACHED_RENDERS;
        return cleanRender && !this._absoluteDirty;
    }
    if(CACHED_RENDERS > 0) {
        //console.log("Rendered from cache " + CACHED_RENDERS + " times");
        CACHED_RENDERS = 0;
    }
    ++IMMEDIATE_RENDERS;

    //console.log("Rendering " + this + " in scene.");
    painter.render(renderWorld, renderScale);

    if(this._absoluteDirty) {
        //console.log("Node was rendered with dirty absolute position.");
    }
    return !this.isDirty() && !this._absoluteDirty;
};
