#include "Node.h"
#include "initialize.h"
#include "LayoutState.h"
#include "LayoutPreference.h"
#include "NodeAlignment.h"
#include "NodeDirection.h"
#include "log.h"
#include <stdlib.h>

int parsegraph_Node_COUNT = 0;

parsegraph_Node* parsegraph_Node_new(apr_pool_t* pool, int newType, parsegraph_Node* fromNode, int parentDirection)
{
    parsegraph_Node* node;
    if(pool) {
        node = apr_palloc(pool, sizeof(*node));
    }
    else {
        node = malloc(sizeof(*node));
    }
    node->pool = pool;

    node->_id = parsegraph_Node_COUNT++;

    node->_paintGroup = 0;
    node->_keyListener = 0;
    node->_keyListenerThisArg = 0;
    node->_clickListener = 0;
    node->_clickListenerThisArg = 0;
    node->_type = newType;
    node->_style = parsegraph_style(node->_type);
    node->_label = 0;
    node->_labelX = 0;
    node->_labelY = 0;
    node->_rightToLeft = parsegraph_RIGHT_TO_LEFT;

    node->_value = 0;
    node->_selected = 0;

    node->_prevTabNode = 0;
    node->_nextTabNode = 0;

    node->_scene = 0;

    node->_scale = 1.0;
    node->_absoluteXPos = 0;
    node->_absoluteYPos = 0;
    node->_absoluteScale = 0;

    // Check if a parent node was provided.
    node->_layoutState = parsegraph_NEEDS_COMMIT;
    node->_nodeFit = parsegraph_NODE_FIT_LOOSE;
    for(int i = 0; i <= parsegraph_NUM_DIRECTIONS; ++i) {
        parsegraph_DirectionData* data = &node->_neighbors[i];
        data->direction = i;
        data->extent = parsegraph_Extent_new(pool);
        data->extentOffset = 0;
        data->alignmentOffset = 0;
        data->separation = 0;
        data->lineLength = 0;
        data->xPos = 0;
        data->yPos = 0;
        data->node = 0;
        data->alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    }

    if(fromNode != 0) {
        // A parent node was provided; this node is a child.
        if(!parsegraph_isNodeDirection(parentDirection) ||
            parsegraph_NULL_NODE_DIRECTION == parentDirection
        ) {
            parsegraph_log("A parent node was provided; this node is a child.");
            parsegraph_Node_destroy(node);
            return 0;
        }
        node->_layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
        node->_parentDirection = parentDirection;
        node->_neighbors[parentDirection].node = fromNode;
    }
    else {
        // No parent was provided; this node is a root.
        node->_layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        node->_parentDirection = parsegraph_NULL_NODE_DIRECTION;
    }

    return node;
}

void parsegraph_chainTab(parsegraph_Node* a, parsegraph_Node* b, parsegraph_Node** swappedOut)
{
    if(swappedOut) {
        swappedOut[0] = a ? a->_nextTabNode : 0;
        swappedOut[1] = b ? b->_prevTabNode : 0;
    }
    if(a) {
        a->_nextTabNode = b;
    }
    if(b) {
        b->_prevTabNode = a;
    }
}

void parsegraph_Node_destroy(parsegraph_Node* node)
{
    for(int direction = 0; direction < parsegraph_NUM_DIRECTIONS; ++direction) {
        parsegraph_Node* neighbor = node->_neighbors[i].node;
        if(node->_parentDirection != direction) {
            // Clear all children.
            neighbor->node = 0;
        }
    }
    node->_parentDirection = parsegraph_NULL_NODE_DIRECTION;
    node->_layoutState = parsegraph_NULL_LAYOUT_STATE;
    node->_scale = 1.0;
    if(!node->pool) {
        free(node);
    }
};
.
float parsegraph_Node_x(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return 0;
    }
    return parsegraph_Node_nodeParent(node)->_neighbors[parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node))].xPos;
}

float parsegraph_Node_y(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return 0;
    }
    return parsegraph_Node_nodeParent(node)->_neighbors[parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node))].yPos;
}

/**
 * Returns the scale of this node.
 */
float parsegraph_Node_scale(parsegraph_Node* node)
{
    return node->_scale;
}

/**
 * Sets the scale of this node.
 *
 * This value is commutative with child scales.
 */
float parsegraph_Node_setScale(parsegraph_Node* node, float scale)
{
    node->_scale = scale;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

/**
 * This sets whether the node's forward and backward nodes will be
 * reversed.
 *
 * If rightToLeft() == true, parsegraph_FORWARD goes to the left.
 * If rightToLeft() == false, parsegraph_FORWARD goes to the right.
 */
float parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val)
{
    node->_rightToLeft = !!val;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

float parsegraph_Node_rightToLeft(parsegraph_Node* node)
{
    return node->_rightToLeft;
};

void parsegraph_Node_commitAbsolutePos(parsegraph_Node* node)
{
    if(node->_absoluteXPos != 0) {
        // No need for an update, so just return.
        return;
    }

    // Retrieve a stack of nodes to determine the absolute position.
    parsegraph_Node* iterNode = node;
    int nodeList[1024];
    int nodeListI = 0;
    float parentScale = 1.0;
    float scale = 1.0;
    while(1) {
        if(parsegraph_Node_isRoot(node)) {
            node->_absoluteXPos = 0;
            node->_absoluteYPos = 0;
            break;
        }

        nodeList[nodeListI++] = parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node)));
        node = parsegraph_Node_nodeParent(node);
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromRoot];
    for(int i = nodeListI; i >= 0; --i) {
        int directionToChild = nodeList[i];

        node->_absoluteXPos += parsegraph_Node_x(node) * parentScale;
        node->_absoluteYPos += parsegraph_Node_y(node) * parentScale;

        parentScale = scale;
        scale *= parsegraph_Node_scaleAt(node, directionToChild);
        node = parsegraph_Node_nodeAt(node, directionToChild);
    }

    node->_absoluteXPos += parsegraph_Node_x(node) * parentScale;
    node->_absoluteYPos += parsegraph_Node_y(node) * parentScale;
    node->_absoluteScale = scale;

    parsegraph_Node_eachChild(node, parsegraph_Node_positionWasChanged, 0);
};

void parsegraph_Node_positionWasChanged(parsegraph_Node* node)
{
    node->_absoluteXPos = 0;
    node->_absoluteYPos = 0;
};

float parsegraph_Node_absoluteX(parsegraph_Node* node)
{
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteXPos;
};

float parsegraph_Node_absoluteY(parsegraph_Node* node)
{
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteYPos;
};

float parsegraph_Node_absoluteScale(parsegraph_Node* node)
{
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteScale;
};

void parsegraph_Node_setPosAt(parsegraph_Node* node, int inDirection, float x, float y)
{
    node->_neighbors[inDirection].xPos = x;
    node->_neighbors[inDirection].yPos = y;
};

void parsegraph_reparentPaintGroup(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* parentPaintGroup)
{
    parentsPaintGroup->_childPaintGroups.push(paintGroup);
    paintGroup.setParent(parentsPaintGroup);
}

void parsegraph_Node_setPaintGroup(parsegraph_Node* node, parsegraph_PaintGroup* paintGroup)
{
    if(!node->_paintGroup) {
        node->_paintGroup = paintGroup;

        // Parent this paint group to this node, since it now has a paint group.
        if(paintGroup && !parsegraph_Node_isRoot(node)) {
            parsegraph_PaintGroup* parentsPaintGroup = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node));
            if(parentsPaintGroup) {
                parsegraph_reparentPaintGroup(paintGroup, parentsPaintGroup);
            }
        }

        // Find the child paint groups and add them to this paint group.
        parsegraph_findChildPaintGroups(this, function(childPaintGroup) {
            parsegraph_reparentPaintGroup(childPaintGroup, paintGroup);
        });

        return;
    }

    // This node has an existing paint group.

    // Remove the paint group's entry in the parent.
    if(!parsegraph_Node_isRoot(node)) {
        parsegraph_PaintGroup* parentsPaintGroup = parsegraph_findPaintGroup(parsegraph_Node_parentNode(node));
        for(var i in parentsPaintGroup._childPaintGroups) {
            parsegraph_PaintGroup* childGroup = parentsPaintGroup._childPaintGroups[i];
            if(childGroup != node->_paintGroup) {
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

    parsegraph_PaintGroup_clear(node->_paintGroup);
    node->_paintGroup = paintGroup;
}

/**
 * Returns the node's paint group. If this node does not have a paint group, then
 * the parent's is returned.
 */
parsegraph_Node_findPaintGroup(parsegraph_Node* node)
{
    while(!parsegraph_Node_isRoot(node)) {
        if(node->_paintGroup && parsegraph_PaintGroup_isEnabled(node->_paintGroup)) {
            return node->_paintGroup;
        }
        node = parsegraph_Node_parentNode(node);
    }

    return node->_paintGroup;
}

parsegraph_PaintGroup* parsegraph_Node_localPaintGroup(parsegraph_Node* node)
{
    return node->_paintGroup;
}

parsegraph_Graph* parsegraph_Node_graph(parsegraph_Node* node)
{
    return node->_graph;
}

/**
 * Returns the color that should be used as the background color for inward nodes.
 */
parsegraph_Color* parsegraph_Node_backdropColor(parsegraph_Node* node)
{
    if(parsegraph_Node_isSelected(node)) {
        return parsegraph_Node_blockStyle(node)->backgroundColor;
    }
    return parsegraph_Node_blockStyle(node)->selectedBackgroundColor;
    while(1) {
        if(parsegraph_Node_isRoot(node)) {
            return parsegraph_BACKGROUND_COLOR;
        }
        if(parsegraph_Node_parentDirection(node) == parsegraph_OUTWARD) {
            if(parsegraph_Node_isSelected(node)) {
                return parsegraph_Node_blockStyle(parsegraph_Node_parentNode(node))->backgroundColor;
            }
            return parsegraph_Node_blockStyle(parsegraph_Node_parentNode(node))->selectedBackgroundColor;
        }
        node = parsegraph_Node_parentNode(node);
    }
}

void parsegraph_Node_setClickListener(parsegraph_Node* node, void(*listener)(const char*, void*), void* thisArg)
{
    if(!listener) {
        node->_clickListener = 0;
    }
    else {
        if(!thisArg) {
            thisArg = node;
        }
        node->_clickListener = listener;
        node->_clickListenerThisArg = thisArg;
    }
}

int parsegraph_Node_hasClickListener(parsegraph_Node* node)
{
    return node->_clickListener != 0;
}

int parsegraph_Node_click(parsegraph_Node* node, const char* button)
{
    // Invoke the click listener.
    if(!parsegraph_Node_hasClickListener(node)) {
        return 0;
    }
    return node->_clickListener(button, node->_clickListenerThisArg);
}

void parsegraph_Node_setKeyListener(parsegraph_Node* node, void(*listener)(cosnt char*, void*), void* thisArg)
{
    if(!listener) {
        node->_keyListener = 0;
    }
    else {
        if(!thisArg) {
            thisArg = node;
        }
        node->_keyListener = listener;
        node->_keyListenerThisArg = thisArg;
    }
}

int parsegraph_Node_hasKeyListener(parsegraph_Node* node)
{
    return node->_keyListener != 0;
}

int parsegraph_Node_key(parsegraph_Node* node, const char* key)
{
    // Invoke the key listener.
    if(!parsegraph_Node_hasKeyListener(node)) {
        return 0;
    }
    return node->_keyListener(key, node->_keyListenerThisArg);
}

int parsegraph_Node_nodeFit(parsegraph_Node* node)
{
    return node->_nodeFit;
}

void parsegraph_Node_setNodeFit(parsegraph_Node* node, int nodeFit)
{
    node->_nodeFit = nodeFit;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

int parsegraph_Node_isRoot(parsegraph_Node* noode)
{
    return node->_parentDirection == parsegraph_NULL_NODE_DIRECTION;
}

int parsegraph_Node_parentDirection(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return parsegraph_NULL_NODE_DIRECTION;
    }
    return node->_parentDirection;
}

parsegraph_Node* parsegraph_Node_nodeParent(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        parsegraph_log("Node root does not have a root.");
        return 0;
    }
    return node->_neighbors[parsegraph_Node_parentDirection(node)].node;
}

parsegraph_Node* parsegraph_Node_parentNode(parsegraph_Node* node)
{
    return parsegraph_Node_nodeParent(node);
}

int parsegraph_Node_hasNode(parsegraph_Node* node, int atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        return 0;
    }
    return node->_neighbors[atDirection].node != 0;
}

void parsegraph_Node_hasNodes(parsegraph_Node* node, int axis, int* hasNegative, int* hasPositive)
{
    if(axis == parsegraph_NULL_AXIS) {
        parsegraph_log("Axis cannot be null");
        return;
    }

    if(parsegraph_Node_hasNode(node, parsegraph_getNegativeNodeDirection(axis))) {
        *hasNegative = parsegraph_getNegativeNodeDirection(axis);
    }
    if(parsegraph_Node_hasNode(node, parsegraph_getPositiveNodeDirection(axis))) {
        *hasPositive = parsegraph_getPositiveNodeDirection(axis);
    }
}

int parsegraph_Node_hasChildAt(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_hasNode(node, direction) && parsegraph_Node_parentDirection(node) != direction;
}

int parsegraph_Node_hasAnyNodes(parsegraph_Node* node)
{
    return parsegraph_Node_hasChildAt(node, parsegraph_DOWNWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_UPWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_FORWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_BACKWARD);
}

parsegraph_Node* parsegraph_Node_nodeAt(parsegraph_Node* node, int atDirection)
{
    return node->_neighbors[atDirection].node;
}

/**
 * Iterates over this node and its children, calling actionFunc whenever
 * filterFunc is true.
 */
void parsegraph_Node_traverse(parsegraph_Node* node, int(*filterFunc)(void*, parsegraph_Node*), void(*actionFunc)(void*,parsegraph_Node*), void* thisArg, int timeout)
{
    // First, exit immediately if this node doesn't pass the given filter.
    if(!filterFunc(thisArg, this)) {
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
}

parsegraph_Node* parsegraph_Node_spawnNode(parsegraph_Node* node, int spawnDirection, int newType)
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
    neighbor.node = node;

    // Allow alignments to be set before children are spawned.
    if(neighbor.alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.alignmentMode = parsegraph_DO_NOT_ALIGN;
    }

    this.layoutWasChanged(spawnDirection);

    // Use the node fitting of the parent.
    node.setNodeFit(this.nodeFit());

    return node;
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
    node.setParent(this, parsegraph_reverseNodeDirection(inDirection));

    if(neighbor.alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor.alignmentMode = parsegraph_DO_NOT_ALIGN;
    }

    this.layoutWasChanged(inDirection);

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
    this._neighbors[givenDirection].node = null;
    this.layoutWasChanged(givenDirection);
};

parsegraph_Node.prototype.disconnectNode = function(inDirection)
{
    if(!this.hasNode(inDirection)) {
        return;
    }
    // Connect the node.
    var neighbor = this._neighbors[inDirection];
    var disconnected = neighbor.node;
    neighbor.node = null;
    disconnected.setParent(null);
    this.layoutWasChanged(inDirection);
    return disconnected;
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

float parsegraph_Node_scaleAt(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_scale(parsegraph_Node_nodeAt(node, direction));
};

float parsegraph_Node_lineLengthAt(parsegraph_Node* node, int direction)
{
    return node->_neighbors[direction].lineLength;
};

parsegraph_Extent* parsegraph_Node_extentsAt(parsegraph_Node* node, int atDirection)
{
    return node->_neighbors[atDirection].extent;
};

float parsegraph_Node_extentOffsetAt(parsegraph_Node* node, int atDirection)
{
    return node->_neighbors[atDirection].extentOffset;
};

void parsegraph_Node_extentSize(parsegraph_Node* node, float* width, float* height)
{
    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_FORWARD), height, 0, 0);

    // The vertical extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD), width, 0, 0);

    return outPos;
};

void parsegraph_Node_setLayoutPreference(parsegraph_Node* node, int given)
{
    node->_layoutPreference = given;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

void parsegraph_Node_setNodeAlignmentMode(parsegraph_Node* node, int inDirection, int newAlignmentMode)
{
    node->_neighbors[inDirection].alignmentMode = newAlignmentMode;
    parsegraph_Node_layoutWasChanged(node, inDirection);
};

int parsegraph_Node_nodeAlignmentMode(parsegraph_Node* node, int inDirection)
{
    return node->_neighbors[inDirection].alignmentMode;
};

int parsegraph_Node_type(parsegraph_Node* node)
{
    return node->_type;
};

void parsegraph_Node_setType(parsegraph_Node* node, int newType)
{
    node->_type = newType;
    node->_style = parsegraph_style(node->_type);
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

void* parsegraph_Node_value(parsegraph_Node* node)
{
    return node->_value;
};

void parsegraph_Node_setValue(parsegraph_Node* node, void* newValue)
{
    node->_value = newValue;
};

void parsegraph_Node_scene(parsegraph_Node* node)
{
    return node->_scene;
}

void parsegraph_Node_setScene(parsegraph_Node* node, void* scene)
{
    node->_scene = scene;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

int parsegraph_Node_typeAt(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_type(parsegraph_Node_nodeAt(node, direction));
};

const char* parsegraph_Node_label(parsegraph_Node* node)
{
    if(!node->_label) {
        return 0;
    }
    return parsegraph_Label_text(node->_label);
};

void parsegraph_Node_setLabel(parsegraph_Node* node, const char* text, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!node->_label) {
        node->_label = parsegraph_Label_new(node->pool, glyphAtlas);
    }
    parsegraph_Label_setText(node->_label, text);
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

parsegraph_Style* parsegraph_Node_blockStyle(parsegraph_Node* node)
{
    return node->_style;
};

void parsegraph_Node_setBlockStyle(parsegraph_Node* node, parsegraph_Style* style)
{
    if(node->_style == style) {
        // Ignore idempotent style changes.
        return;
    }
    node->_style = style;
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

parsegraph_Node.prototype.setParent = function(fromNode, parentDirection)
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
parsegraph_Node.prototype.setParentNode = parsegraph_Node.prototype.setParent;

parsegraph_Node.prototype.isSelected = function()
{
    return this._selected;
};

void parsegraph_Node_setSelected(parsegraph_Node* node, int selected)
{
    node->_selected = selected;
};

float parsegraph_Node_horizontalPadding(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_blockStyle(node)->horizontalPadding;
};

float parsegraph_Node_verticalPadding(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_blockStyle(node)->verticalPadding;
};

float parsegraph_Node_verticalSeparation(parsegraph_Node* node, int direction)
{
    if(parsegraph_Node_type(node) == parsegraph_BUD && parsegraph_Node_typeAt(node, direction) == parsegraph_BUD) {
        return parsegraph_Node_blockStyle(node)->verticalSeparation + parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION;
    }
    return parsegraph_Node_blockStyle(node)->verticalSeparation;
};

float parsegraph_Node_horizontalSeparation(parsegraph_Node* node, int direction)
{
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);

    if(parsegraph_Node_hasNode(node, direction) && parsegraph_Node_type(parsegraph_Node_nodeAt(node, direction)) == parsegraph_BUD
        && !parsegraph_Node_hasAnyNodes(parsegraph_Node_nodeAt(node, direction))
    ) {
        return parsegraph_BUD_LEAF_SEPARATION * style->horizontalSeparation;
    }
    return style->horizontalSeparation;
};

parsegraph_Node* parsegraph_Node_nodeUnderCoords(parsegraph_Node* node, float x, float y, float userScale)
{
    //console.log("nodeUnderCoords: " + x + ", " + y)
    if(userScale === undefined) {
        userScale = 1;
    }

    /**
     * Returns true if the coordinates are in the node.
     */
    var inNodeBody = function(node) {
        var s = node.size();
        if(
            x < userScale * node.absoluteX()
                - userScale * node.absoluteScale() * s.width()/2
        ) {
            //console.log("INB 1" + x + " against " + node.absoluteX());
            return false;
        }
        if(
            x > userScale * node.absoluteX()
                + userScale * node.absoluteScale() * s.width()/2
        ) {
            //console.log("INB 2");
            return false;
        }
        if(
            y < userScale * node.absoluteY()
                - userScale * node.absoluteScale() * s.height()/2
        ) {
            //console.log("INB 3");
            return false;
        }
        if(
            y > userScale * node.absoluteY()
                + userScale * node.absoluteScale() * s.height()/2
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
 * Returns the size of this node, based on this node's type and label.
 *
 * Sliders appear like blocks, though they render buds and their own lines internally.
 * Scenes also appear like boxes.
 *
 * Consequently, since these types work like blocks, there is no special code for them here.
 */
void parsegraph_Node_sizeWithoutPadding(parsegraph_Node* node, float* bodyWidth, float* bodyHeight)
{
    // Find the size of this node's drawing area.
    var style = this.blockStyle();
    if(this._label && !this._label.isEmpty()) {
        if(!bodySize) {
            bodySize = new parsegraph_Size();
        }
        bodySize[0] = this._label.width() * (style.fontSize / this._label.glyphAtlas().fontSize());
        bodySize[1] = this._label.height() * (style.fontSize / this._label.glyphAtlas().fontSize());
        bodySize[0] = Math.max(style.minWidth, bodySize[0]);
        bodySize[1] = Math.max(style.minHeight, bodySize[1]);
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

        if(this.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            bodySize.setWidth(
                Math.max(bodySize.width(), nestedSize.width() * nestedNode.scale())
            );

            if(this.label()) {
                // Allow for the content's size.
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
            if(this.label()) {
                // Allow for the content's size.
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

/**
 * Sets the position, calculates extents, and
 * clears the needs commit flag.
 */
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

    var initExtent = function(
        inDirection,
        length,
        size,
        offset)
    {
        this._neighbors[inDirection].extent.clear();
        this._neighbors[inDirection].extent.appendLS(length, size);
        this._neighbors[inDirection].extentOffset = offset;
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
        var reversedDirection = parsegraph_reverseNodeDirection(childDirection)

        // Save alignment parameters.
        this._neighbors[childDirection].alignmentOffset = alignment;
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
            //console.log("Combining " + parsegraph_nameNodeDirection(direction) + ", " );
            //console.log("Length offset: " + lengthOffset);
            //console.log("Size adjustment: " + sizeAdjustment);
            if(this.nodeFit() == parsegraph_NODE_FIT_LOOSE) {
                var e = this._neighbors[direction].extent;
                var bv = child.extentsAt(direction).boundingValues();
                var scale = this.scaleAt(childDirection);
                if(lengthOffset === 0) {
                    //console.log("lengthOffset == 0");
                    e.setBoundLengthAt(0, Math.max(e.boundLengthAt(0), bv[0]*scale + lengthOffset));
                    e.setBoundSizeAt(0, Math.max(e.boundSizeAt(0), bv[2]*scale + sizeAdjustment));
                }
                else if(lengthOffset < 0) {
                    //console.log("lengthOffset < 0");
                    e.setBoundLengthAt(0, Math.max(
                        e.boundLengthAt(0) + Math.abs(lengthOffset),
                        bv[0]*scale
                    ));
                    e.setBoundSizeAt(0, Math.max(e.boundSizeAt(0), bv[2]*scale + sizeAdjustment));
                }
                else {
                    //console.log("lengthOffset > 0");
                    e.setBoundLengthAt(
                        0, Math.max(e.boundLengthAt(0), lengthOffset + bv[0]*scale)
                    );
                    e.setBoundSizeAt(
                        0, Math.max(e.boundSizeAt(0), bv[2]*scale + sizeAdjustment)
                    );
                }
                /*e.combineExtent(
                    child.extentsAt(direction),
                    lengthOffset,
                    sizeAdjustment,
                    this.scaleAt(childDirection)
                );
                e.simplify();*/
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
            });
            */

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

parsegraph_Node.prototype.commitLayoutIteratively = function(timeout)
{
    // Avoid needless work if possible.
    if(this._layoutState === parsegraph_COMMITTED_LAYOUT) {
        return;
    }

    // Traverse the graph depth-first, committing each node's layout in turn.
    var bodySize = new parsegraph_Size();
    var startTime = parsegraph_getTimeInMillis();
    return this.traverse(
        function(node) {
            return node._layoutState === parsegraph_NEEDS_COMMIT;
        },
        function(node) {
            node.commitLayout(bodySize);
        },
        this,
        timeout
    );
};

/**
 * Returns the separation between this node and the node
 * in the given direction.
 *
 * Throws NO_NODE_FOUND if no node is in the given direction.
 *
 * @see #commitLayout()
 */
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

/**
 * Indicate that the layout was changed and thus needs an layout commit.
 */
void parsegraph_Node_layoutWasChanged(parsegraph_Node* node, int changeDirection)
{
    // Disallow null change directions.
    if(changeDirection == parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_log("Change direction cannot be null.");
        return;
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

parsegraph_Node* parsegraph_labeledBud(const char* label, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(parsegraph_BUD, 0, 0);
    parsegraph_Node_setLabel(node, label, glyphAtlas);
    return node;
}

parsegraph_Node* parsegraph_labeledSlot(const char* label, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(parsegraph_SLOT, 0, 0);
    parsegraph_Node_setLabel(node, label, glyphAtlas);
    return node;
}

parsegraph_Node* parsegraph_labeledBlock(const char* label, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setLabel(node, label, glyphAtlas);
    return node;
}
