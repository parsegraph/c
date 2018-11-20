#include "Caret.h"
#include <stdio.h>
#include <stdlib.h>

parsegraph_Caret::parsegraph_Caret(parsegraph_Node* nodeRoot)
{
    if(!nodeRoot) {
        parsegraph_die("Null nodeRoots are not allowed.");
    }
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
}

void parsegraph_Caret::setGlyphAtlas(parsegraph_GlyphAtlas* glyphAtlas)
{
    this->_glyphAtlas = glyphAtlas;
}

parsegraph_GlyphAtlas* parsegraph_Caret::glyphAtlas()
{
    if(!this->_glyphAtlas) {
        parsegraph_die("Caret does not have a GlyphAtlas");
    }
    return this->_glyphAtlas;
}

parsegraph_Node* parsegraph_Caret::node()
{
    int s = parsegraph_ArrayList_length(this->_nodes);
    if(s == 0) {
        parsegraph_abort(parsegraph_NO_NODE_FOUND);
    }
    return parsegraph_ArrayList_at(this->_nodes, s - 1);
}

int parsegraph_Caret::has(parsegraph_NodeDirection inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    return parsegraph_Node_hasNode(this.node(), inDirection);
}

parsegraph_Node* parsegraph_Caret::spawn(const char* inDirection, const char* newType, int newAlignmentMode)
{
    return spawn(parsegraph_readNodeDirection(inDirection), parsegraph_readNodeType(newType), newAlignmentMode);

}

parsegraph_Node* parsegraph_Caret::spawn(int inDirection, parsegraph_NodeType newType, int newAlignmentMode)
{
    // Interpret the given direction and type for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);
    newType = parsegraph_readNodeType(newType);

    // Spawn a node in the given direction.
    parsegraph_Node* created = parsegraph_Node_spawnNode(this.node(), inDirection, newType);

    // Use the given alignment mode.
    if(newAlignmentMode !== undefined) {
        newAlignmentMode = parsegraph_readNodeAlignment(newAlignmentMode);
        this.align(inDirection, newAlignmentMode);
        if(newAlignmentMode !== parsegraph_DO_NOT_ALIGN) {
            parsegraph_Node_setNodeFit(this.node(), parsegraph_NODE_FIT_EXACT);
        }
    }

    return created;
};

parsegraph_Node* parsegraph_Caret::connect(int inDirection, parsegraph_Node* node)
{
    // Interpret the given direction for ease-of-use.
    inDirection = parsegraph_readNodeDirection(inDirection);

    this.node().connectNode(inDirection, node);

    return node;
};

parsegraph_Caret::disconnect(int inDirection)
{
    if(arguments.length > 0) {
        // Interpret the given direction for ease-of-use.
        inDirection = parsegraph_readNodeDirection(inDirection);
        return this.node().disconnectNode(inDirection);
    }

    if(this.node().isRoot()) {
        throw new Error("A root node cannot be disconnected.");
    }

    return this.node().parentNode().disconnectNode(parsegraph_reverseNodeDirection(this.node().parentDirection()));
};

parsegraph_Caret::crease(int inDirection)
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

parsegraph_Caret::erase(int inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    return this.node().eraseNode(inDirection);
};

parsegraph_Caret::onClick(clickListener, thisArg)
{
    this.node().setClickListener(clickListener, thisArg);
};

parsegraph_Caret::onChange(changeListener, thisArg)
{
    this.node().setChangeListener(changeListener, thisArg);
};

parsegraph_Caret::onKey(keyListener, thisArg)
{
    this.node().setKeyListener(keyListener, thisArg);
};

parsegraph_Caret::move(toDirection)
{
    toDirection = parsegraph_readNodeDirection(toDirection);
    var dest = this.node().nodeAt(toDirection);
    if(!dest) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes[this._nodes.length - 1] = dest;
};

parsegraph_Caret::push()
{
    this._nodes.push(this.node());
};

parsegraph_Caret::save(id)
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

parsegraph_Caret::clearSave(id)
{
    if(!this._savedNodes) {
        return;
    }
    if(id === undefined) {
        id = "";
    }
    delete this._savedNodes[id];
}

parsegraph_Caret::restore(id)
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

parsegraph_Caret::moveTo(id)
{
    restore(id);
}

parsegraph_Caret::moveToRoot()
{
    this._nodes[this._nodes.length - 1] = this._nodeRoot;
};

parsegraph_Caret::pop()
{
    if(this._nodes.length <= 1) {
        throw parsegraph_createException(parsegraph_NO_NODE_FOUND);
    }
    this._nodes.pop();
};

parsegraph_Caret::spawnMove(inDirection, newContent, newAlignmentMode)
{
    var created = this.spawn(inDirection, newContent, newAlignmentMode);
    this.move(inDirection);
    return created;
};

parsegraph_Caret::replace()
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

parsegraph_Caret::at(inDirection)
{
    inDirection = parsegraph_readNodeDirection(inDirection);
    if(this.node().hasNode(inDirection)) {
        return this.node().noteAt(inDirection).type();
    }
};

parsegraph_Caret::align(inDirection, newAlignmentMode)
{
    // Interpret the arguments.
    inDirection = parsegraph_readNodeDirection(inDirection);
    newAlignmentMode = parsegraph_readNodeAlignment(newAlignmentMode);

    this.node().setNodeAlignmentMode(inDirection, newAlignmentMode);
    if(newAlignmentMode != parsegraph_DO_NOT_ALIGN) {
        this.node().setNodeFit(parsegraph_NODE_FIT_EXACT);
    }
};

parsegraph_Caret::pull(given)
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

parsegraph_Caret::shrink()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    if(node) {
        node.setScale(parsegraph_SHRINK_SCALE);
    }
};

parsegraph_Caret::grow()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    if(node) {
        node.setScale(1.0);
    }
};

parsegraph_Caret::fitExact()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setNodeFit(parsegraph_NODE_FIT_EXACT);
};

parsegraph_Caret::fitLoose()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setNodeFit(parsegraph_NODE_FIT_LOOSE);
};

parsegraph_Caret::label(/* ... */)
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

parsegraph_Caret::select()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setSelected(true);
};

parsegraph_Caret::selected()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    return node.isSelected();
};

parsegraph_Caret::deselect()
{
    var node = this.node();
    if(arguments.length > 0) {
        node = node.nodeAt(parsegraph_readNodeDirection(arguments[0]));
    }
    node.setSelected(false);
};

parsegraph_Caret::graph()
{
    return this.node().graph();
};

/**
 * Returns the initiall provided node.
 */
parsegraph_Caret::root()
{
    return this._nodeRoot;
};
