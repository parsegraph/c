function parsegraph_Caret()
{
    if(arguments.length > 1) {
        var graph, rootType;
        graph = arguments[0];
        rootType = arguments[1];
        if(!rootType) {
            rootType = parsegraph_SLOT;
        }
        // Create the root node.
        rootType = parsegraph_readNodeType(rootType);
        this._nodeRoot = new parsegraph_Node(graph, rootType);
    }
    else {
        // The root is provided.
        var node = arguments[0];
        this._nodeRoot = node;
    }

    // Stack of nodes.
    this._nodes = [this._nodeRoot];

    // A mapping of nodes to their IDs.
    this._namedNodes = null;

    // A mapping of nodes to their saved names.
    this._savedNodes = null;
};

parsegraph_Caret.prototype.nodeUnderCoords = function(x, y, userScale)
{
    //console.log("nodeUnderCoords: " + x + ", " + y)
    if(userScale === undefined) {
        userScale = 1;
    }
    this.root().commitLayoutIteratively();

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

    var candidates = [this.root()];

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
 * Retrieves the node named by ID.
 */
parsegraph_Caret.prototype.getNodeById = function(id)
{
    if(!this._namedNodes) {
        return null;
    }
    return this._namedNodes[id];
}

/**
 * Used to indicate that a node's ID has changed.
 */
parsegraph_Caret.prototype.changedId = function(changedNode)
{
    if(!this._namedNodes) {
        this._namedNodes = {};
    }
    this._namedNodes[id] = changedNode;
}

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

parsegraph_Caret.prototype.content = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    return node.content();
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
    if(this.node().isRoot()) {
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
    node.setScale(parsegraph_SHRINK_SCALE);
};

parsegraph_Caret.prototype.grow = function()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setScale(1.0);
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

parsegraph_Caret.prototype.grow = function(/* ... */)
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setScale(1.0);
};

parsegraph_Caret.prototype.label = function(/* ... */)
{
    var node = this.node();
    var text = arguments[0];
    if(arguments.length > 1) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
        text = arguments[1];
    }
    node.setLabel(text);
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

parsegraph_Caret.prototype.root = function()
{
    return this._nodeRoot;
};
