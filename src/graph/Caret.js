function parsegraph_Caret(nodeRoot, font)
{
    if(arguments.length === 0) {
        nodeRoot = new parsegraph_Node(parsegraph_DEFAULT_NODE_TYPE);
    }
    if(typeof nodeRoot != "object") {
        nodeRoot = new parsegraph_Node(parsegraph_readNodeType(nodeRoot));
    }
    this._nodeRoot = nodeRoot;

    this._mathMode = false;

    // Stack of nodes.
    this._nodes = [this._nodeRoot];

    // A mapping of nodes to their saved names.
    this._savedNodes = null;

    this._labels = [];

    this._font = font ? font : parsegraph_defaultFont();
    this._world = null;
};

parsegraph_Caret.prototype.clone = function()
{
    return new parsegraph_Caret(this.node(), this.font());
};

parsegraph_Caret.prototype.setMathMode = function(mathMode)
{
    this._mathMode = mathMode;
    var curr = this.node();
    if(mathMode) {
        switch(curr.type()) {
        case parsegraph_BLOCK:
            curr.setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            curr.setBlockStyle(parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }
};

parsegraph_Caret.prototype.mathMode = function()
{
    return this._mathMode;
};

parsegraph_Caret_Tests = new parsegraph_TestSuite("parsegraph_Caret");
parsegraph_Caret_Tests.addTest("new parsegraph_Caret", function() {
    var car = new parsegraph_Caret('s');
    var n = new parsegraph_Node(parsegraph_BLOCK);
    car = new parsegraph_Caret(n);
    car = new parsegraph_Caret();
    if(car.node().type() !== parsegraph_DEFAULT_NODE_TYPE) {
        console.log(parsegraph_DEFAULT_NODE_TYPE);
        return car.node().type() + " is not the default.";
    }
});

parsegraph_Caret.prototype.setFont = function(font)
{
    this._font = font;
};

parsegraph_Caret.prototype.font = function()
{
    if(!this._font) {
        throw new Error("Caret does not have a Font");
    }
    return this._font;
};

parsegraph_Caret.prototype.node = function()
{
    if(this._nodes.length === 0) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    return this._nodes[this._nodes.length - 1];
};

parsegraph_Caret.prototype.has = function(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    return this.node().hasNode(inDirection);
};

parsegraph_Caret.prototype.spawn = function(inDirection, newType, newAlignmentMode)
{
    // Interpret the given direction and type for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);
    newType = parsegraph_readNodeType(newType);

    // Spawn a node in the given direction.
    var created = this.node().spawnNode(inDirection, newType);

    // Use the given alignment mode.
    if(newAlignmentMode !== undefined) {
        newAlignmentMode = parsegraph_readNodeAlignment(newAlignmentMode);
        this.align(inDirection, newAlignmentMode);
        if(newAlignmentMode !== parsegraph_DO_NOT_ALIGN) {
            this.node().setNodeFit(parsegraph_NODE_FIT_EXACT);
        }
    }

    if(this._mathMode) {
        switch(newType) {
        case parsegraph_BLOCK:
            created.setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            created.setBlockStyle(parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }

    return created;
};

parsegraph_Caret.prototype.connect = function(inDirection, node)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    this.node().connectNode(inDirection, node);

    return node;
};

parsegraph_Caret.prototype.disconnect = function(inDirection)
{
    if(arguments.length > 0) {
        // Interpret the given direction for ease-of-use.
        inDirection = parsegraph_readNodeDirection(inDirection);
        return this.node().disconnectNode(inDirection);
    }

    if(this.node().isRoot()) {
        return this.node();
    }

    return this.node().parentNode().disconnectNode(parsegraph_reverseNodeDirection(this.node().parentDirection()));
};

parsegraph_Caret.prototype.crease = function(inDirection)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    var node;
    if(arguments.length === 0) {
        node = this.node();
    }
    else {
        node = this.node().nodeAt(inDirection);
    }

    // Create a new paint group for the connection.
    if(!node.localPaintGroup()) {
        node.setPaintGroup(true);
    }
};

parsegraph_Caret.prototype.setWorld = function(world)
{
    this._world = world;
};

parsegraph_Caret.prototype.freeze = function(inDirection)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);
    var node;
    if(arguments.length === 0) {
        node = this.node();
    }
    else {
        node = this.node().nodeAt(inDirection);
    }
    if(!this._world) {
        throw new Error("Caret must have a world in order to freeze nodes");
    }
    node.freeze(this._world.freezer());
};

parsegraph_Caret.prototype.thaw = function(inDirection)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);
    var node;
    if(arguments.length === 0) {
        node = this.node();
    }
    else {
        node = this.node().nodeAt(inDirection);
    }
    node.thaw();
};

parsegraph_Caret.prototype.uncrease = function(inDirection)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    var node;
    if(arguments.length === 0) {
        node = this.node();
    }
    else {
        node = this.node().nodeAt(inDirection);
    }

    // Remove the paint group.
    node.setPaintGroup(false);
};

parsegraph_Caret.prototype.isCreased = function(inDirection)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    var node;
    if(arguments.length === 0) {
        node = this.node();
    }
    else {
        node = this.node().nodeAt(inDirection);
    }

    return !!node.localPaintGroup();
};
parsegraph_Caret.prototype.creased = parsegraph_Caret.prototype.isCreased;

parsegraph_Caret.prototype.erase = function(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    return this.node().eraseNode(inDirection);
};

parsegraph_Caret.prototype.onClick = function(clickListener, thisArg)
{
    this.node().setClickListener(clickListener, thisArg);
};

parsegraph_Caret.prototype.onChange = function(changeListener, thisArg)
{
    this.node().setChangeListener(changeListener, thisArg);
};

parsegraph_Caret.prototype.onKey = function(keyListener, thisArg)
{
    this.node().setKeyListener(keyListener, thisArg);
};

parsegraph_Caret_Tests.addTest("parsegraph_Caret.onKey", function() {
    var car = new parsegraph_Caret();
    car.onKey(function() {
        console.log("Key pressed");
    });
});

parsegraph_Caret.prototype.move = function(toDirection)
{
    toDirection = parsegraph_readNodeDirection(toDirection);
    var dest = this.node().nodeAt(toDirection);
    if(!dest) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes[this._nodes.length - 1] = dest;
};

parsegraph_Caret.prototype.push = function()
{
    this._nodes.push(this.node());
};

parsegraph_Caret.prototype.save = function(id)
{
    if(id === undefined) {
        id = parsegraph_generateID();
    }
    if(!this._savedNodes) {
        this._savedNodes = {};
    }
    this._savedNodes[id] = this.node();
    return id;
}

parsegraph_Caret.prototype.clearSave = function(id)
{
    if(!this._savedNodes) {
        return;
    }
    if(id === undefined) {
        id = "";
    }
    delete this._savedNodes[id];
}

parsegraph_Caret.prototype.restore = function(id)
{
    if(!this._savedNodes) {
        throw new Error("No saved nodes were found for the provided ID '" + id + "'");
    }
    var loadedNode = this._savedNodes[id];
    if(loadedNode == null) {
        throw new Error("No node found for the provided ID '" + id + "'");
    }
    this._nodes[this._nodes.length - 1] = loadedNode;
}
parsegraph_Caret.prototype.moveTo = parsegraph_Caret.prototype.restore;

parsegraph_Caret.prototype.moveToRoot = function()
{
    this._nodes[this._nodes.length - 1] = this._nodeRoot;
};

parsegraph_Caret.prototype.pop = function()
{
    if(this._nodes.length <= 1) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes.pop();
};

parsegraph_Caret.prototype.spawnMove = function(inDirection, newContent, newAlignmentMode)
{
    var created = this.spawn(inDirection, newContent, newAlignmentMode);
    this.move(inDirection);
    return created;
};

parsegraph_Caret.prototype.replace = function()
{
    // Retrieve the arguments.
    var node = this.node();
    var withContent = arguments[0];
    if(arguments.length > 1) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
        withContent = arguments[1];
    }

    // Set the node type.
    withContent = parsegraph_readNodeType(withContent);
    node.setType(withContent);
    if(this._mathMode) {
        switch(newType) {
        case parsegraph_BLOCK:
            this.node().setBlockStyle(parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            this.node().setBlockStyle(parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }
};

parsegraph_Caret.prototype.at = function(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    if(this.node().hasNode(inDirection)) {
        return this.node().nodeAt(inDirection).type();
    }
};

parsegraph_Caret.prototype.align = function(inDirection, newAlignmentMode)
{
    // Interpret the arguments.
    inDirection = parsegraph_readNodeDirection(inDirection);
    newAlignmentMode = parsegraph_readNodeAlignment(newAlignmentMode);

    this.node().setNodeAlignmentMode(inDirection, newAlignmentMode);
    if(newAlignmentMode != parsegraph_DO_NOT_ALIGN) {
        this.node().setNodeFit(parsegraph_NODE_FIT_EXACT);
    }
};

parsegraph_Caret.prototype.overlapAxis = function(inDirection, newAxisOverlap)
{
    if(arguments.length === 0) {
        this.node().setAxisOverlap(parsegraph_ALLOW_AXIS_OVERLAP);
        return;
    }
    if(arguments.length === 1) {
        this.node().setAxisOverlap(parsegraph_readAxisOverlap(arguments[0]));
        return;
    }
    inDirection = parsegraph_readNodeDirection(inDirection);
    newAxisOverlap = parsegraph_readAxisOverlap(newAxisOverlap);
    this.node().setAxisOverlap(inDirection, newAxisOverlap);
};
parsegraph_Caret.prototype.axisOverlap = parsegraph_Caret.prototype.overlapAxis;

parsegraph_Caret.prototype.pull = function(given)
{
    given = parsegraph_readNodeDirection(given);
    if(this.node().isRoot() || this.node().parentDirection() === parsegraph_OUTWARD) {
        if(parsegraph_isVerticalNodeDirection(given)) {
            this.node().setLayoutPreference(parsegraph_PREFER_VERTICAL_AXIS);
        }
        else {
            this.node().setLayoutPreference(parsegraph_PREFER_HORIZONTAL_AXIS);
        }
        return;
    }
    if(
        parsegraph_getNodeDirectionAxis(given)
        == parsegraph_getNodeDirectionAxis(this.node().parentDirection())
    ) {
        //console.log(parsegraph_nameLayoutPreference(parsegraph_PREFER_PARENT_AXIS));
        this.node().setLayoutPreference(parsegraph_PREFER_PARENT_AXIS);
    }
    else {
        //console.log(parsegraph_nameLayoutPreference(parsegraph_PREFER_PERPENDICULAR_AXIS));
        this.node().setLayoutPreference(parsegraph_PREFER_PERPENDICULAR_AXIS);
    }
};

parsegraph_Caret.prototype.shrink = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    if(node) {
        node.setScale(parsegraph_SHRINK_SCALE);
    }
};

parsegraph_Caret.prototype.grow = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    if(node) {
        node.setScale(1.0);
    }
};

parsegraph_Caret.prototype.fitExact = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setNodeFit(parsegraph_NODE_FIT_EXACT);
};

parsegraph_Caret.prototype.fitLoose = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setNodeFit(parsegraph_NODE_FIT_LOOSE);
};

parsegraph_Caret.prototype.fitNaive = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setNodeFit(parsegraph_NODE_FIT_NAIVE);
};

parsegraph_Caret.prototype.label = function(/* ... */)
{
    var node, text, font;
    switch(arguments.length) {
    case 0:
        return this.node().label();
    case 1:
        node = this.node();
        text = arguments[0];
        font = this.font();
        break;
    case 2:
        if(typeof arguments[1] === "object") {
            node = this.node();
            text = arguments[0];
            font = arguments[1];
        }
        else {
            node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
            text = arguments[1];
            font = this.font();
            //console.log(typeof arguments[0]);
            //console.log(typeof arguments[1]);
        }
        break;
    case 3:
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
        text = arguments[1];
        font = arguments[2];
        break;
    }
    node.setLabel(text, font);
};

parsegraph_Caret.prototype.select = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setSelected(true);
};

parsegraph_Caret.prototype.selected = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    return node.isSelected();
};

parsegraph_Caret.prototype.deselect = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setSelected(false);
};

parsegraph_Caret.prototype.graph = function()
{
    return this.node().graph();
};

/**
 * Returns the initiall provided node.
 */
parsegraph_Caret.prototype.root = function()
{
    return this._nodeRoot;
};
