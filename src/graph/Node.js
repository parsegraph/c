parsegraph_Node_COUNT = 0;
function parsegraph_Node(newType, fromNode, parentDirection)
{
    this._id = parsegraph_Node_COUNT++;

    this._paintGroup = null;
    this._keyListener = null;
    this._keyListenerThisArg = null;
    this._clickListener = null;
    this._clickListenerThisArg = null;
    this._changeListener = null;
    this._changeListenerThisArg = null;
    this._type = newType;
    this._style = parsegraph_style(this._type);
    this._label = null;
    this._labelX = null;
    this._labelY = null;
    this._rightToLeft = parsegraph_RIGHT_TO_LEFT;

    this._value = null;
    this._selected = false;
    this._ignoresMouse = true;

    this._prevTabNode = null;
    this._nextTabNode = null;

    this._scene = null;

    this._scale = 1.0;
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._absoluteScale = null;
    this._groupXPos = null;
    this._groupYPos = null;
    this._groupScale = null;

    this._paintGroupNext = this;
    this._paintGroupPrev = this;
    this._layoutPrev = this;
    this._layoutNext = this;

    // Check if a parent node was provided.
    this._layoutState = parsegraph_NEEDS_COMMIT;
    this._nodeFit = parsegraph_NODE_FIT_LOOSE;
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

parsegraph_Node_Tests = new parsegraph_TestSuite("parsegraph_Node");

parsegraph_Node_Tests.AddTest("Right-to-left test", function() {
    var node = new parsegraph_Node(parsegraph_BUD);
    node.setRightToLeft(true);
});

parsegraph_Node_Tests.AddTest("Disconnect trivial test", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    car.disconnect();
    originalRoot.commitLayoutIteratively();
    newRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Disconnect simple test", function() {
    //console.log("DISCONNECT SIMPLE TEST");
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    var midRoot = car.spawnMove('f', 'b');
    car.spawnMove('f', 'b');
    // *=[]=[] <--newRoot == car
    // ^oldRoot
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    if(originalRoot._layoutNext != newRoot) {
        console.log("originalRoot", originalRoot);
        console.log("midRoot", midRoot);
        console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
        console.log("newRoot", newRoot);
        throw new Error("Original's previous should be newroot");
    }
    //console.log("Doing disconnect");
    car.disconnect();
    newRoot.commitLayoutIteratively();
    if(originalRoot._layoutNext != midRoot) {
        console.log("originalRoot", originalRoot);
        console.log("midRoot", midRoot);
        console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
        console.log("newRoot", newRoot);
        throw new Error("layoutAfter is invalid");
    }
    originalRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Disconnect simple test, reversed", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    var midRoot = car.spawnMove('f', 'b');
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    car.disconnect();
    originalRoot.commitLayoutIteratively();
    newRoot.commitLayoutIteratively();
    if(originalRoot._layoutNext != midRoot) {
        throw new Error("layoutAfter is invalid");
    }
});

function parsegraph_getLayoutNodes(node)
{
    var list = [];
    var orig = node;
    var start = new Date();
    do {
        node = node._layoutNext;
        //console.log(node._id);
        for(var i = 0; i < list.length; ++i) {
            if(list[i] == node) {
                console.log(list);
                throw new Error("Layout list has loop");
            }
        }
        list.push(node);
        if(parsegraph_elapsed(start) > 5000) {
            throw new Error("Infinite loop");
        }
    } while(orig != node);
    return list;
}

parsegraph_Node_Tests.AddTest("Disconnect complex test", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    car.spawnMove('f', 'b');
    car.push();
    //console.log("NODE WITH CHILD", car.node());
    car.spawnMove('d', 'u');
    //console.log("MOST DOWNWARD NODE OF CHILD", car.node());
    car.pop();
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    var newLastNode = newRoot.nodeAt(parsegraph_BACKWARD);
    //console.log("Doing complex disc", originalRoot);
    //console.log(parsegraph_getLayoutNodes(originalRoot));
    car.disconnect();
    //console.log("COMPLEX DISCONNECT DONE");
    //console.log(parsegraph_getLayoutNodes(originalRoot));
    //newRoot.commitLayoutIteratively();
    originalRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Proportion pull test", function() {
    var atlas = parsegraph_buildGlyphAtlas();
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.setGlyphAtlas(atlas);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    originalRoot._id = "ROOT";
    //car.spawn('b', 'u');
    //car.spawn('f', 'u');

/*    car.spawnMove('d', 'b');
    car.push();
    car.spawnMove('b', 'u');
    car.spawnMove('d', 'u');
    car.spawnMove('d', 's');
    car.label('2');
    car.pop();

    car.push();
    car.spawnMove('f', 'u');
    car.spawnMove('d', 'u');
    car.spawnMove('d', 's');
    car.label('2');
    car.pop();

    car.pull('d');
    */

    car.spawnMove('d', 'b');
    car.node()._id = "CENTER BLOCK";
    car.push();
    car.spawnMove('b', 'u');
    car.node()._id = "DOWN BUD";
    //car.spawnMove('d', 's');
    //car.label('1');
    car.pop();

    //car.push();
    //car.spawnMove('f', 'u');
    //car.spawnMove('d', 's');
    //car.label('1');
    //car.pop();

    //console.log("Proportion test start");
    car.pull('d');

    //car.spawnMove('d', 's');

    try {
        originalRoot.commitLayoutIteratively();
        //console.log("Proportion test SUCCESS");
    }
    finally {
        //console.log("Proportion test finished");
    }
});

parsegraph_Node.prototype.root = function()
{
    var p = this;
    while(!p.isRoot()) {
        p = p.parentNode();
    }
    return p;
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

parsegraph_Node.prototype.positionWasChanged = function()
{
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._groupXPos = null;
    this._groupYPos = null;
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

parsegraph_Node.prototype.commitGroupPos = function()
{
    if(this._groupXPos !== null) {
        // No need for an update, so just return.
        return;
    }

    // Retrieve a stack of nodes to determine the group position.
    var node = this;
    var nodeList = [];
    while(!node.localPaintGroup()) {
        nodeList.push(parsegraph_reverseNodeDirection(node.parentDirection()));
        node = node.nodeParent();
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromGroupParent];
    this._groupXPos = 0;
    this._groupYPos = 0;
    var parentScale = 1.0;
    var scale = 1.0;
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
    this._groupScale = scale;

    if(this.localPaintGroup()) {
        this.localPaintGroup().setOrigin(this.absoluteX(), this.absoluteY());
        this.localPaintGroup().setScale(this.absoluteScale());
    }
    else {
        this._groupXPos += node.x() * parentScale;
        this._groupYPos += node.y() * parentScale;
    }
    /*
    var exp = this.absoluteX();
    var act = this.findPaintGroup().scale() * this.groupX() + this.findPaintGroup()._worldX;
    if(exp != act) {
        console.log("Local=(" + node.x() + ", " + node.y() + ")");
        throw new Error("X mismatch: abs=" + exp + " versus group=" + act + " diff=" + (act - exp));
    }
    var exp = this.absoluteY();
    var act = this.findPaintGroup().scale() * this.groupY() + this.findPaintGroup()._worldY;
    if(exp != act) {
        console.log("Local=(" + node.x() + ", " + node.y() + ")");
        throw new Error("Y mismatch: " + act + " versus " + exp);
    }
    */
};

parsegraph_Node.prototype.groupX = function()
{
    this.commitGroupPos();
    return this._groupXPos;
};

parsegraph_Node.prototype.groupY = function()
{
    this.commitGroupPos();
    return this._groupYPos;
};

parsegraph_Node.prototype.groupScale = function()
{
    this.commitGroupPos();
    return this._groupScale;
};

parsegraph_Node.prototype.setPosAt = function(inDirection, x, y)
{
    this._neighbors[inDirection].xPos = x;
    this._neighbors[inDirection].yPos = y;
};

parsegraph_Node.prototype.setPaintGroup = function(paintGroup)
{
    if(!this._paintGroup) {
        this._paintGroup = paintGroup;

        // Parent this paint group to this node, since it now has a paint group.
        if(paintGroup && !this.isRoot()) {
            var parentsPaintGroup = this.parentNode().findPaintGroup();
            if(parentsPaintGroup) {
                parentsPaintGroup._childPaintGroups.push(paintGroup);
                paintGroup.assignParent(parentsPaintGroup);
            }
        }

        // Find the child paint groups and add them to this paint group.
        parsegraph_findChildPaintGroups(this, function(childPaintGroup) {
            paintGroup._childPaintGroups.push(childPaintGroup);
            childPaintGroup.assignParent(paintGroup);
        });

        return;
    }

    // This node has an existing paint group.

    // Remove the paint group's entry in the parent.
    if(!this.isRoot()) {
        var parentsPaintGroup = this.parentNode().findPaintGroup();
        for(var i in parentsPaintGroup._childPaintGroups) {
            var childGroup = parentsPaintGroup._childPaintGroups[i];
            if(childGroup !== this._paintGroup) {
                // Some other child that's not us, so just continue.
                continue;
            }

            // This child is our current paint group, so replace it with the new.
            if(paintGroup) {
                parentsPaintGroup._childPaintGroups[i] = paintGroup;
            }
            else {
                // The new group is no group.
                parentsPaintGroup._childPaintGroups.splice(i, 1);
            }
        }
    }

    // Copy the current paint group's children, if present.
    if(paintGroup) {
        var childGroups = paintGroup._childPaintGroups;
        childGroups.push.apply(childGroups, this._paintGroup._childPaintGroups);
    }
    else {
        parsegraph_findChildPaintGroups(this, function(childPaintGroup) {
            paintGroup.addChild(childPaintGroup);
        });
    }

    this._paintGroup.clear();
    this._paintGroup = paintGroup;
}

parsegraph_Node.prototype.findPaintGroup = function()
{
    var node = this;
    while(!node.isRoot()) {
        if(node._paintGroup && node._paintGroup.isEnabled()) {
            return node._paintGroup;
        }
        node = node.parentNode();
    }

    return node._paintGroup;
};

parsegraph_Node.prototype.localPaintGroup = function()
{
    return this._paintGroup;
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

parsegraph_Node_Tests.addTest("parsegraph_Node.setClickListener", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.setClickListener(function() {
    });
});

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

parsegraph_Node_Tests.addTest("parsegraph_Node.setKeyListener", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.setKeyListener(function() {
    });
});

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
        || this.hasChildAt(parsegraph_BACKWARD);
};

parsegraph_Node.prototype.nodeAt = function(atDirection)
{
    return this._neighbors[atDirection].node;
};

parsegraph_Node.prototype.traverse = function(filterFunc, actionFunc, thisArg, timeout)
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
    var i = ordering.length - 1;
    var loop = function() {
        var t = new Date().getTime();
        var pastTime = function() {
            return timeout !== undefined && (new Date().getTime() - t > timeout);
        };

        while(true) {
            if(i < 0) {
                // Indicate completion.
                return null;
            }
            actionFunc.call(thisArg, ordering[i]);
            --i;
            if(pastTime()) {
                return loop;
            }
        }
    }

    return loop();
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

    var nodeHead = node.findLayoutHead();

    // Connect the node.
    var neighbor = this._neighbors[inDirection];
    neighbor.node = node;
    node.assignParent(this, parsegraph_reverseNodeDirection(inDirection));

    var layoutAfter = this.findLaterLayoutSibling(inDirection);
    var layoutBefore = this.findEarlierLayoutSibling(inDirection);

    var nodeTail = node;
    //console.log(this._id + ".connectNode(" + parsegraph_nameNodeDirection(inDirection) + ", " + node._id + ") layoutBefore=" + (layoutBefore ? layoutBefore._id : "null") + " layoutAfter=" + (layoutAfter ? layoutAfter._id : "null") + " nodeHead=" + nodeHead._id);

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

    // Allow alignments to be set before children are spawned.
    if(neighbor.alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.alignmentMode = parsegraph_DO_NOT_ALIGN;
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

    // Disconnect the node.
    var neighbor = this._neighbors[inDirection];
    var disconnected = neighbor.node;
    neighbor.node = null;
    disconnected.assignParent(null);

    var layoutAfter = this.findLaterLayoutSibling(inDirection);
    var layoutBefore = this.findEarlierLayoutSibling(inDirection);
    var earliestDisc = disconnected.findLayoutHead();

    if(layoutBefore) {
        parsegraph_connectLayout(layoutBefore, disconnected._layoutNext);
    }
    else {
        parsegraph_connectLayout(earliestDisc._layoutPrev, disconnected._layoutNext);
    }
    parsegraph_connectLayout(disconnected, earliestDisc);

    this.layoutWasChanged(inDirection);

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
        layoutBefore = this._neighbors[dir].node;
        if(layoutBefore) {
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
        layoutAfter = this._neighbors[dir].node;
        if(layoutAfter) {
            break;
        }
    }
    return layoutAfter;
};

parsegraph_Node.prototype.findLayoutHead = function()
{
    var deeplyLinked = this;
    var foundOne;
    while(true) {
        foundOne = false;
        var dirs = deeplyLinked.layoutOrder();
        for(var i = 0; i < dirs.length; ++i) {
            var dir = dirs[i];
            if(deeplyLinked.nodeAt(dir) && deeplyLinked.parentDirection() !== dir) {
                deeplyLinked = deeplyLinked.nodeAt(dir);
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
    this._neighbors.forEach(function(neighbor, direction) {
            if(!neighbor.node || direction == this.parentDirection()) {
                return;
            }
            visitor.call(visitorThisArg, neighbor.node, direction);
        },
        this
    );
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

parsegraph_Node_Tests.addTest("parsegraph_Node.setLabel", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    var atlas = parsegraph_buildGlyphAtlas();
    n.setLabel("No time", atlas);
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading spawned", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
});

function makeChild() {
    var car = new parsegraph_Caret(parsegraph_BLOCK);
    car.spawnMove('f', 'b');
    car.spawnMove('i', 'b');
    car.spawnMove('f', 's');
    return car.root();
};

function makeChild2() {
    var car = new parsegraph_Caret(parsegraph_SLOT);
    car.spawnMove('i', 'b');
    car.spawnMove('f', 's');
    car.spawnMove('i', 'b');
    car.spawnMove('f', 'b');
    return car.root();
};

parsegraph_Node_Tests.addTest("parsegraph_Node lisp test", function(out) {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.push();
    car.spawnMove('f', 's');
    car.spawnMove('f', 's');
    car.pop();
    car.spawnMove('d', 'u');
    car.push();
    car.spawnMove('f', 's');
    car.push();
    car.spawnMove('f', 's');
    car.spawnMove('i', 'b');
    car.spawnMove('d', 'u');
    car.spawnMove('f', 'b');
    car.spawnMove('i', 's');
    car.spawnMove('f', 's');
    car.pop();
    car.pull('f');
    car.spawnMove('d', 'u');
    car.connect('f', makeChild2());
    car.spawnMove('d', 'u');
    car.connect('f', makeChild2());
    car.pop();
    car.spawnMove('d', 'u');
    car.root().commitLayoutIteratively();
    //parsegraph_getLayoutNodes(car.root());
    var g = new parsegraph_Graph();
    g.setGlyphAtlas(parsegraph_buildGlyphAtlas());
    out.appendChild(g.surface().container());
    g.plot(car.root());
    g.scheduleRepaint();
    g.input().SetListener(function() {
        g.surface().paint();
        g.surface().render();
    });
});

parsegraph_Node_Tests.addTest("parsegraph_Node lisp test simplified", function(out) {
    var root = new parsegraph_Node(parsegraph_BUD);
    root._id = "root";

    var a = new parsegraph_Node(parsegraph_BLOCK);
    a._id = "a";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";

    var chi = new parsegraph_Node(parsegraph_BUD);
    chi._id = "chi";

    chi.connectNode(parsegraph_FORWARD, c);

    a.connectNode(parsegraph_DOWNWARD, chi);
    a.connectNode(parsegraph_FORWARD, b);
    //console.log("LISP TEST");
    //console.log(parsegraph_getLayoutNodes(a));
    root.connectNode(parsegraph_FORWARD, a);

    root.commitLayoutIteratively();
});

parsegraph_Node_Tests.addTest("parsegraph_Node layout preference test", function(out) {
    var root = new parsegraph_Node(parsegraph_BUD);
    root._id = "root";

    var a = new parsegraph_Node(parsegraph_BLOCK);
    a._id = "a";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";

    var chi = new parsegraph_Node(parsegraph_BUD);
    chi._id = "chi";

    chi.connectNode(parsegraph_FORWARD, c);

    //console.log("cur a", parsegraph_nameLayoutPreference(a._layoutPreference));
    a.connectNode(parsegraph_DOWNWARD, chi);
    a.connectNode(parsegraph_FORWARD, b);
    root.connectNode(parsegraph_FORWARD, a);
    a.setLayoutPreference(parsegraph_PREFER_PERPENDICULAR_AXIS);

    //console.log("new a", parsegraph_nameLayoutPreference(a._layoutPreference));
    var r = parsegraph_getLayoutNodes(root)[0];
    if(r !== c) {
        throw new Error("Expected c, got " + r._id);
    }

    root.commitLayoutIteratively();

    root.disconnectNode(parsegraph_FORWARD);
    if(a._layoutPreference !== parsegraph_PREFER_VERTICAL_AXIS) {
        throw new Error("a layoutPreference was not VERT but " + parsegraph_nameLayoutPreference(a._layoutPreference));
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    if(b._layoutNext != b) {
        throw new Error("Previous sanity");
    }
    if(b._layoutPrev != b) {
        throw new Error("Next sanity");
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != n) {
        return false;
    }
    if(n._layoutNext != b) {
        return false;
    }
    if(b._layoutNext != n) {
        return false;
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    if(b._layoutNext != b) {
        throw new Error("Previous sanity");
    }
    if(b._layoutPrev != b) {
        throw new Error("Next sanity");
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != n) {
        throw new Error("Next connected sanity");
    }
    if(n._layoutNext != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutNext != n) {
        throw new Error("Next connected sanity");
    }
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);

    var nodes = parsegraph_getLayoutNodes(n);
    if(nodes[0] != c) {
        throw new Error("First node is not C");
    }
    if(nodes[1] != b) {
        throw new Error("Second node is not B");
    }
    if(nodes[2] != n) {
        throw new Error("Third node is not n");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings and disconnected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";

    var inner = b.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    inner._id = "inner";
    if(b._layoutPrev != inner) {
        return "B layoutBefore isn't inner";
    }
    if(inner._layoutPrev != b) {
        return "Inner layoutBefore isn't B";
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != inner) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(inner._layoutPrev != n) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(n._layoutNext != inner) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(inner._layoutNext != b) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(b._layoutNext != n) {
        throw new Error("N layoutBefore wasn't B");
    }
    //console.log("LNS");
    //console.log(parsegraph_getLayoutNodes(n));
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);
    //console.log("PLNS");
    //console.log(parsegraph_getLayoutNodes(n));

    var nodes = parsegraph_getLayoutNodes(n);
    if(nodes[0] != c) {
        throw new Error("First node is not C");
    }
    if(nodes[1] != inner) {
        throw new Error("Second node is not inner");
    }
    if(nodes[2] != b) {
        throw new Error("Third node is not b");
    }
    if(nodes[3] != n) {
        throw new Error("Third node is not n");
    }
    if(b !== n.disconnectNode(parsegraph_FORWARD)) {
        throw new Error("Not even working properly");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings and disconnected 2", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    parsegraph_testLayoutNodes([b]);

    var inner = b.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    inner._id = "inner";
    parsegraph_testLayoutNodes([inner, b]);

    n.connectNode(parsegraph_FORWARD, b);
    parsegraph_testLayoutNodes([inner, b, n]);
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);
    parsegraph_testLayoutNodes([c, inner, b, n]);
    if(c !== n.disconnectNode(parsegraph_BACKWARD)) {
        throw new Error("Not even working properly");
    }
    parsegraph_testLayoutNodes([c], "disconnected");
    parsegraph_testLayoutNodes([inner, b, n], "finished");
});

function parsegraph_testLayoutNodes(expected, name)
{
    var node = expected[expected.length - 1];
    var nodes = parsegraph_getLayoutNodes(node);
    for(var i = 0; i < expected.length; ++i) {
        if(nodes[i] != expected[i]) {
            //console.log("TESTLAYOUTNODES");
            //console.log(nodes);
            throw new Error((name ? name : "") + " index " + i + ": Node " + (expected[i] ? expected[i]._id : "null") + " expected, not " + (nodes[i] ? nodes[i]._id : "null"));
        }
    }
}

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading deeply connected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    parsegraph_testLayoutNodes([n], "deeply conn 1");
    var b = n.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    b._id = "b";
    parsegraph_testLayoutNodes([b, n], "deeply conn 2");
    var c = b.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
    c._id = "c";
    parsegraph_testLayoutNodes([c, b, n], "deeply conn 3");
    var d = b.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    d._id = "d";
    parsegraph_testLayoutNodes([c, d, b, n], "deeply conn 4");

    if(n._layoutNext !== c) {
        throw new Error("Previous sanity 1: got " + n._layoutNext._id + " expected " + c._id);
    }
    if(d._layoutNext !== b) {
        throw new Error("Previous sanity 2");
    }
    if(c._layoutNext !== d) {
        throw new Error("Previous sanity 3");
    }
    if(b._layoutNext !== n) {
        throw new Error("Previous sanity 4");
    }
});

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
    return this.size(bodySize).scaled(this.groupScale());
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
    //console.log(new Error("Setsel"));
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
        var scale = nestedNode.scale();//this.scaleAt(parsegraph_INWARD);

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

parsegraph_Node.prototype.commitLayout = function(bodySize)
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

    // Clear the absolute point values, to be safe.
    this._absoluteXPos = null;
    this._absoluteYPos = null;
    this._groupXPos = null;
    this._groupYPos = null;

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
            if(this.nodeFit() == parsegraph_NODE_FIT_LOOSE) {
                var e = this._neighbors[direction].extent;
                var scale = this.scaleAt(childDirection);
                e.combineExtent(
                    child.extentsAt(direction),
                    lengthOffset,
                    sizeAdjustment,
                    scale
                );
                e.simplify();
            }
            else {
                this._neighbors[direction].extent.combineExtent(
                    child.extentsAt(direction),
                    lengthOffset,
                    sizeAdjustment,
                    this.scaleAt(childDirection)
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
            positiveOffset -= this.sizeIn(given) + this.lineLengthAt(given);
            negativeOffset -= this.sizeIn(given) + this.lineLengthAt(given);
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
        return this.parentNode().commitLayoutIteratively();
    }

    // Avoid needless work if possible.
    if(this._layoutState === parsegraph_COMMITTED_LAYOUT) {
        return;
    }

    var root = this;
    var node = root;
    var bodySize = new parsegraph_Size();

    var startTime = new Date();

    // Traverse the graph depth-first, committing each node's layout in turn.
    var loop = function() {
        var t;
        if(timeout !== undefined) {
            t = new Date().getTime();
        }
        while(true) {
            // Loop back to the first node, from the root.
            node = node._layoutNext;
            if(node._layoutState === parsegraph_NEEDS_COMMIT) {
                node.commitLayout(bodySize);
            }
            if(parsegraph_elapsed(startTime) > 4*1000) {
                console.log(node._id);
            }
            if(parsegraph_elapsed(startTime) > 5*1000) {
                throw new Error("Commit Layout is taking too long");
            }
            if(timeout !== undefined && (new Date().getTime() - t > timeout)) {
                return loop;
            }
            if(node === root) {
                // Terminal condition reached.
                return null;
            }
        }
    };

    return loop();
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

        if(node.findPaintGroup()) {
            node.findPaintGroup().markDirty();
        }

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
            // Completed.
            break;
        }
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
