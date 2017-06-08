/**
 * High-level Node graph builder.
 */
function parsegraph_Caret(nodeRoot)
{
    if(arguments.length === 0) {
        nodeRoot = new parsegraph_Node(parsegraph_DEFAULT_NODE_TYPE);
    }
    if(typeof nodeRoot != "object") {
        nodeRoot = new parsegraph_Node(parsegraph_readNodeType(nodeRoot));
    }
    this._nodeRoot = nodeRoot;

    // Stack of nodes.
    this._nodes = [this._nodeRoot];

    // A mapping of nodes to their saved names.
    this._savedNodes = null;

    this._labels = [];

    this._glyphAtlas = null;
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

parsegraph_Caret.prototype.setGlyphAtlas = function(glyphAtlas)
{
    this._glyphAtlas = glyphAtlas;
};

parsegraph_Caret.prototype.glyphAtlas = function()
{
    if(!this._glyphAtlas) {
        throw new Error("Caret does not have a GlyphAtlas");
    }
    return this._glyphAtlas;
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

/**
 * Spawns a node of the specified type in the given direction, with the optional alignment
 * mode.
 *
 * The node fit of the child is set to the node fit of the parent.
 */
parsegraph_Caret.prototype.spawn = function(inDirection, newContent, newAlignmentMode)
{
    // Interpret the given direction and type for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);
    newContent = parsegraph_readNodeType(newContent);

    // Spawn a node in the given direction.
    var created = this.node().spawnNode(inDirection, newContent);

    // Use the given alignment mode.
    if(newAlignmentMode !== undefined) {
        newAlignmentMode = parsegraph_readNodeAlignment(newAlignmentMode);
        this.align(inDirection, newAlignmentMode);
        if(newAlignmentMode !== parsegraph_DO_NOT_ALIGN) {
            this.node().setNodeFit(parsegraph_NODE_FIT_EXACT);
        }
    }

    return created;
};

/**
 * Connects the provided node to the node at this caret's position.
 *
 * caret.connect(inDirection, node)
 */
parsegraph_Caret.prototype.connect = function(inDirection, node)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    this.node().connectNode(inDirection, node);

    return node;
};

/**
 * Introduces a new paint group at the node in the given direction.
 *
 * The paint group is returned.
 */
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
        node.setPaintGroup(new parsegraph_PaintGroup(node));
    }

    return node.localPaintGroup();
};

parsegraph_Caret.prototype.erase = function(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    this.node().eraseNode(inDirection);
};

/**
 * Sets the click listener on the current node.
 *
 * caret.spawnMove('f', 'b');
 * caret.onClick(this.handle, this);
 */
parsegraph_Caret.prototype.onClick = function(clickListener, thisArg)
{
    this.node().setClickListener(clickListener, thisArg);
};

parsegraph_Caret.prototype.onChange = function(clickListener, thisArg)
{
    this.node().setChangeListener(clickListener, thisArg);
};

/**
 * Sets the click listener on the current node.
 *
 * caret.spawnMove('f', 'b');
 * caret.onKey(this.handle, this);
 */
parsegraph_Caret.prototype.onKey = function(clickListener, thisArg)
{
    this.node().setKeyListener(clickListener, thisArg);
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

/**
 * Saves the current node using the given ID. If no value is given, an
 * autogenerated one is used.
 *
 * The ID is returned.
 */
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

/**
 * Clears the saved node named by the given ID.
 */
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

/**
 * Moves the graph to the node named by ID.
 */
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

/**
 * Change the type of the specified node.
 *
 * replace(withContent) replaces the current node.
 * replace(inDirection, withContent) replaces the node in the given direction.
 */
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
};

parsegraph_Caret.prototype.at = function(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    if(this.node().hasNode(inDirection)) {
        return this.node().noteAt(inDirection).type();
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
        this.node().setLayoutPreference(parsegraph_PREFER_PARENT_AXIS);
    }
    else {
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

/**
 * car.label(text);
 * car.label(text, glyphAtlas);
 * car.label(inDirection, text);
 * car.label(inDirection, text, glyphAtlas);
 */
parsegraph_Caret.prototype.label = function(/* ... */)
{
    var node, text, glyphAtlas;
    switch(arguments.length) {
    case 1:
        node = this.node();
        text = arguments[0];
        glyphAtlas = this.glyphAtlas();
        break;
    case 2:
        if(typeof arguments[1] === "object") {
            node = this.node();
            text = arguments[0];
            glyphAtlas = arguments[1];
        }
        else {
            node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
            text = arguments[1];
            glyphAtlas = this.glyphAtlas();
            //console.log(typeof arguments[0]);
            //console.log(typeof arguments[1]);
        }
        break;
    case 3:
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
        text = arguments[1];
        glyphAtlas = arguments[2];
        break;
    }
    node.setLabel(text, glyphAtlas);
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
