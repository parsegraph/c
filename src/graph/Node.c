#include <stdio.h>
#include "Rect.h"
#include "Node.h"
#include "Status.h"
#include "Color.h"
#include "initialize.h"
#include "LayoutState.h"
#include "LayoutPreference.h"
#include "NodeAlignment.h"
#include "NodeDirection.h"
#include "NodeFit.h"
#include "log.h"
#include "PaintGroup.h"
#include "Graph.h"
#include <stdlib.h>
#include <stdarg.h>
#include "../die.h"
#include "../timing.h"
#include "../parsegraph_math.h"
#include "Label.h"
#include "Camera.h"

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
    node->refcount = 1;

    node->_id = parsegraph_Node_COUNT++;
    //parsegraph_log("NEW node %d\n", node->_id);

    node->_paintGroup = 0;
    node->_keyListener = 0;
    node->_keyListenerThisArg = 0;
    node->_clickListener = 0;
    node->_clickListenerThisArg = 0;
    node->_changeListener = 0;
    node->_changeListenerThisArg = 0;
    node->_type = newType;
    node->_style = parsegraph_style(node->_type);
    node->_realLabel = 0;
    node->_labelPos[0] = 0;
    node->_labelPos[1] = 0;
    node->_rightToLeft = parsegraph_RIGHT_TO_LEFT;

    node->_value = 0;
    node->_selected = 0;
    node->_ignoresMouse = 0;

    parsegraph_Color_SetRGBA(node->_brightnessColor, 0, 0, 0, 0);

    node->_prevTabNode = 0;
    node->_nextTabNode = 0;

    node->_scene = 0;

    node->_scale = 1.0;
    node->_hasAbsolutePos = 0;
    node->_absoluteXPos = 0;
    node->_absoluteYPos = 0;
    node->_absoluteScale = 0;

    node->_paintGroupNext = node;
    node->_paintGroupPrev = node;
    node->_worldNext = node;
    node->_worldPrev = node;

    // Check if a parent node was provided.
    node->_layoutState = parsegraph_NEEDS_COMMIT;
    node->_nodeFit = parsegraph_NODE_FIT_LOOSE;
    for(int i = 0; i < parsegraph_NUM_DIRECTIONS; ++i) {
        parsegraph_DirectionData* neighbor = node->_neighbors + i;
        neighbor->direction = i;
        neighbor->extent = parsegraph_Extent_new(pool);
        neighbor->extentOffset = 0;
        neighbor->alignmentOffset = 0;
        neighbor->separation = 0;
        neighbor->lineLength = 0;
        neighbor->xPos = 0;
        neighbor->yPos = 0;
        neighbor->node = 0;
        neighbor->alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    }

    if(fromNode != 0) {
        // A parent node was provided; this node is a child.
        node->_layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
        parsegraph_Node_connectNode(fromNode, parentDirection, node);
    }
    else {
        // No parent was provided; this node is a root.
        node->_layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        node->_parentDirection = parsegraph_NULL_NODE_DIRECTION;
    }

    return node;
}

void parsegraph_Node_ref(parsegraph_Node* n)
{
    //parsegraph_log("REF node %d\n", n->_id);
    ++n->refcount;
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

void parsegraph_chainAllTabs(apr_pool_t* pool, ...)
{
    va_list ap;
    va_start(ap, 0);

    apr_pool_t* tpool;
    apr_pool_create(&tpool, pool);

    parsegraph_ArrayList* al = parsegraph_ArrayList_new(tpool);

    for(;;) {
        parsegraph_Node* node = va_arg(ap, parsegraph_Node*);
        if(!node) {
            break;
        }
        parsegraph_ArrayList_push(al, node);
    }

    va_end(ap);

    if(parsegraph_ArrayList_length(al) > 2) {
        parsegraph_Node* firstNode = parsegraph_ArrayList_at(al, 0);
        parsegraph_Node* lastNode = parsegraph_ArrayList_at(al, parsegraph_ArrayList_length(al) - 1);

        for(int i = 0; i <= parsegraph_ArrayList_length(al) - 2; ++i) {
            parsegraph_chainTab(parsegraph_ArrayList_at(al, i), parsegraph_ArrayList_at(al, i + 1), 0);
        }
        parsegraph_chainTab(lastNode, firstNode, 0);
    }

    parsegraph_ArrayList_destroy(al);
    apr_pool_destroy(tpool);
}

void parsegraph_Node_unref(parsegraph_Node* node)
{
    //parsegraph_log("UNREF node %d\n", node->_id);
    if(--node->refcount > 0) {
        return;
    }

    if(node->_realLabel) {
        parsegraph_Label_destroy(node->_realLabel);
    }

    for(int direction = 0; direction < parsegraph_NUM_DIRECTIONS; ++direction) {
        parsegraph_DirectionData* neighbor = neighbor = node->_neighbors + direction;
        if(neighbor->node && node->_parentDirection != direction) {
            parsegraph_Node_unref(neighbor->node);
        }
    }
    if(node->_paintGroup) {
        parsegraph_PaintGroup_unref(node->_paintGroup);
    }
    if(!node->pool) {
        free(node);
    }
};

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
void parsegraph_Node_setScale(parsegraph_Node* node, float scale)
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
void parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val)
{
    node->_rightToLeft = !!val;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

float parsegraph_Node_rightToLeft(parsegraph_Node* node)
{
    return node->_rightToLeft;
};

static void resetPosition(void* data, parsegraph_Node* node, int direction)
{
    parsegraph_Node_positionWasChanged(node);
}

void parsegraph_Node_commitAbsolutePos(parsegraph_Node* nodeRoot)
{
    if(nodeRoot->_hasAbsolutePos) {
        // No need for an update, so just return.
        return;
    }

    parsegraph_Node* givenNode = nodeRoot;
    apr_pool_t* cpool;
    apr_pool_create(&cpool, 0);

    // Retrieve a stack of nodes to determine the absolute position.
    parsegraph_ArrayList* nodeList = parsegraph_ArrayList_new(cpool);
    float parentScale = 1.0;
    float scale = 1.0;
    for(;;) {
        if(parsegraph_Node_isRoot(givenNode)) {
            nodeRoot->_absoluteXPos = 0;
            nodeRoot->_absoluteYPos = 0;
            break;
        }

        parsegraph_ArrayList_push(nodeList, (void*)(long)parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(givenNode)));
        givenNode = parsegraph_Node_nodeParent(givenNode);
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromRoot];
    for(int i = parsegraph_ArrayList_length(nodeList) - 1; i >= 0; --i) {
        int directionToChild = (long)parsegraph_ArrayList_at(nodeList, i);

        nodeRoot->_absoluteXPos += parsegraph_Node_x(givenNode) * parentScale;
        nodeRoot->_absoluteYPos += parsegraph_Node_y(givenNode) * parentScale;

        parentScale = scale;
        scale *= parsegraph_Node_scaleAt(givenNode, directionToChild);
        givenNode = parsegraph_Node_nodeAt(givenNode, directionToChild);
    }

    nodeRoot->_absoluteXPos += parsegraph_Node_x(givenNode) * parentScale;
    nodeRoot->_absoluteYPos += parsegraph_Node_y(givenNode) * parentScale;
    nodeRoot->_absoluteScale = scale;
    nodeRoot->_hasAbsolutePos = 1;

    parsegraph_Node_eachChild(nodeRoot, resetPosition, nodeRoot);
    parsegraph_ArrayList_destroy(nodeList);
    apr_pool_destroy(cpool);
};

void parsegraph_Node_positionWasChanged(parsegraph_Node* node)
{
    node->_hasAbsolutePos = 0;
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

static void reparenter(void* extra, parsegraph_PaintGroup* childPaintGroup)
{
    parsegraph_reparentPaintGroup(childPaintGroup, extra);
}

static void addChild(void* d, parsegraph_PaintGroup* childPaintGroup)
{
    parsegraph_PaintGroup* paintGroup = d;
    parsegraph_PaintGroup_addChild(paintGroup, childPaintGroup);
}

void parsegraph_Node_setPaintGroup(parsegraph_Node* node, parsegraph_PaintGroup* paintGroup)
{
    if(!node->_paintGroup) {
        // No prior paint group.
        node->_paintGroup = paintGroup;
        if(paintGroup) {
            parsegraph_PaintGroup_ref(paintGroup);
            // Parent this paint group to this node, since it now has a paint group.
            if(!parsegraph_Node_isRoot(node)) {
                parsegraph_PaintGroup* parentsPaintGroup = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node));
                if(parentsPaintGroup) {
                    parsegraph_reparentPaintGroup(paintGroup, parentsPaintGroup);
                }
            }
        }

        // Find the child paint groups and add them to this paint group.
        parsegraph_findChildPaintGroups(node, reparenter, paintGroup);
        return;
    }

    // This node has an existing paint group.

    // Remove the paint group's entry in the parent.
    if(!parsegraph_Node_isRoot(node)) {
        parsegraph_PaintGroup* parentsPaintGroup = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node));
        for(int i = 0; i < parsegraph_ArrayList_length(parentsPaintGroup->_childPaintGroups); ++i) {
            parsegraph_PaintGroup* childGroup = parsegraph_ArrayList_at(parentsPaintGroup->_childPaintGroups, i);
            if(childGroup != node->_paintGroup) {
                // Some other child that's not us, so just continue.
                continue;
            }
            // childGroup == node->_paintGroup

            // This child is our current paint group, so replace it with the new.
            if(paintGroup) {
                //parsegraph_PaintGroup_unref(childGroup);
                parsegraph_ArrayList_replace(parentsPaintGroup->_childPaintGroups, i, paintGroup);
            }
            else {
                // The new group is no group.
                //parsegraph_PaintGroup_unref(childGroup);
                parsegraph_ArrayList_splice(parentsPaintGroup->_childPaintGroups, i, 1);
            }
        }
    }

    // Copy the current paint group's children, if present.
    if(paintGroup) {
        parsegraph_ArrayList* childGroups = paintGroup->_childPaintGroups;
        for(int i = 0; i < parsegraph_ArrayList_length(childGroups); ++i) {
            parsegraph_PaintGroup* child = parsegraph_ArrayList_at(childGroups, i);
            addChild(paintGroup, child);
        }
    }
    else {
        parsegraph_findChildPaintGroups(node, addChild, paintGroup);
    }

    parsegraph_PaintGroup_clear(node->_paintGroup);
    if(node->_paintGroup) {
        parsegraph_PaintGroup_unref(node->_paintGroup);
    }
    node->_paintGroup = paintGroup;
    if(node->_paintGroup) {
        parsegraph_PaintGroup_ref(node->_paintGroup);
    }
}

void parsegraph_reparentPaintGroup(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* parentPaintGroup)
{
    parsegraph_ArrayList_push(parentPaintGroup->_childPaintGroups, paintGroup);
    parsegraph_PaintGroup_assignParent(paintGroup, parentPaintGroup);
}

/**
 * Returns the node's paint group. If this node does not have a paint group, then
 * the parent's is returned.
 */
parsegraph_PaintGroup* parsegraph_Node_findPaintGroup(parsegraph_Node* node)
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
float* parsegraph_Node_backdropColor(parsegraph_Node* node)
{
    if(parsegraph_Node_isSelected(node)) {
        return parsegraph_Node_blockStyle(node)->backgroundColor;
    }
    return parsegraph_Node_blockStyle(node)->selectedBackgroundColor;
    for(;;) {
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
    parsegraph_die("Unreachable");
}

void parsegraph_Node_setClickListener(parsegraph_Node* node, int(*listener)(const char*, void*), void* thisArg)
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
    //parsegraph_log("Set click listener for node %d.\n", node->_id);
}

void parsegraph_Node_setChangeListener(parsegraph_Node* node, void(*listener)(void*, parsegraph_Node*), void* thisArg)
{
    if(!listener) {
        node->_changeListener = 0;
    }
    else {
        if(!thisArg) {
            thisArg = node;
        }
        node->_changeListener = listener;
        node->_changeListenerThisArg = thisArg;
    }
}

int parsegraph_Node_isClickable(parsegraph_Node* node)
{
    int hasLabel = node->_realLabel != 0 && !isnan(node->_labelPos[0]) && parsegraph_Label_editable(node->_realLabel);
    return parsegraph_Node_type(node) == parsegraph_SLIDER || (parsegraph_Node_hasClickListener(node) || !parsegraph_Node_ignoresMouse(node)) || hasLabel;
};

void parsegraph_Node_setIgnoreMouse(parsegraph_Node* node, int value)
{
    node->_ignoresMouse = value;
}

int parsegraph_Node_ignoresMouse(parsegraph_Node* node)
{
    return node->_ignoresMouse;
};

int parsegraph_Node_hasClickListener(parsegraph_Node* node)
{
    return node->_clickListener != 0;
}

int parsegraph_Node_click(parsegraph_Node* node, const char* button)
{
    //parsegraph_log("Node was clicked!\n");
    // Invoke the click listener.
    if(!parsegraph_Node_hasClickListener(node)) {
        return 0;
    }
    return node->_clickListener(button, node->_clickListenerThisArg);
}

int parsegraph_Node_hasChangeListener(parsegraph_Node* node)
{
    return node->_changeListener != 0;
}

void parsegraph_Node_valueChanged(parsegraph_Node* node)
{
    // Invoke the listener.
    if(!parsegraph_Node_hasChangeListener(node)) {
        return;
    }
    return node->_changeListener(node->_changeListenerThisArg, node);
}

void parsegraph_Node_setKeyListener(parsegraph_Node* node, int(*listener)(const char*, void*), void* thisArg)
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

int parsegraph_Node_isRoot(parsegraph_Node* node)
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
        parsegraph_log("Node root does not have a root.\n");
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
        parsegraph_log("Axis cannot be null\n");
        return;
    }

    if(parsegraph_Node_hasNode(node, parsegraph_getNegativeNodeDirection(axis))) {
        *hasNegative = parsegraph_getNegativeNodeDirection(axis);
    }
    else {
        *hasNegative = parsegraph_NULL_NODE_DIRECTION;
    }
    if(parsegraph_Node_hasNode(node, parsegraph_getPositiveNodeDirection(axis))) {
        *hasPositive = parsegraph_getPositiveNodeDirection(axis);
    }
    else {
        *hasPositive = parsegraph_NULL_NODE_DIRECTION;
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

struct AddNodeData {
parsegraph_Node* node;
parsegraph_ArrayList* ordering;
int(*filterFunc)(void*, parsegraph_Node*);
void* thisArg;
};

static void addNode(struct AddNodeData* and, int direction)
{
    parsegraph_Node* node = and->node;
    // Do not add the parent.
    if(!parsegraph_Node_isRoot(node) && parsegraph_Node_parentDirection(node) == direction) {
        return;
    }
    // Add the node to the ordering if it exists and needs a layout.
    if(parsegraph_Node_hasNode(node, direction)) {
        parsegraph_Node* child = parsegraph_Node_nodeAt(node, direction);
        if(and->filterFunc(and->thisArg, child)) {
            parsegraph_ArrayList_push(and->ordering, child);
        }
    }
}

int parsegraph_Node_continueTraverse(parsegraph_NodeTraversal* nd)
{
    struct timespec t;
    if(nd->timeout > 0) {
        clock_gettime(CLOCK_REALTIME, &t);
    }

    for(;;) {
        if(nd->i < 0) {
            // Indicate completion.
            return 0;
        }
        nd->actionFunc(nd->thisArg, parsegraph_ArrayList_at(nd->ordering, nd->i));
        --nd->i;
        if(nd->timeout > 0) {
            struct timespec now;
            clock_gettime(CLOCK_REALTIME, &now);
            if(nd->timeout > 0 && parsegraph_timediffMs(&now, &t) > nd->timeout) {
                return 1;
            }
        }
    }
    parsegraph_die("Unreachable");
}

/**
 * Iterates over this node and its children, calling actionFunc whenever
 * filterFunc is true.
 */
parsegraph_NodeTraversal* parsegraph_Node_traverse(parsegraph_Node* node, int(*filterFunc)(void*, parsegraph_Node*), void(*actionFunc)(void*,parsegraph_Node*), void* thisArg, int timeout)
{
    // First, exit immediately if this node doesn't pass the given filter.
    if(!filterFunc(thisArg, node)) {
        return 0;
    }

    parsegraph_ArrayList* ordering = parsegraph_ArrayList_new(node->pool);
    parsegraph_ArrayList_push(ordering, node);

    struct AddNodeData and;
    and.ordering = ordering;
    and.filterFunc = filterFunc;
    and.thisArg = thisArg;

    // Build the node list.
    for(int i = 0; i < parsegraph_ArrayList_length(ordering); ++i) {
        and.node = parsegraph_ArrayList_at(ordering, i);
        addNode(&and, parsegraph_INWARD);
        addNode(&and, parsegraph_DOWNWARD);
        addNode(&and, parsegraph_UPWARD);
        addNode(&and, parsegraph_BACKWARD);
        addNode(&and, parsegraph_FORWARD);
    }


    parsegraph_NodeTraversal ld;
    ld.timeout = timeout;
    ld.actionFunc = actionFunc;
    ld.thisArg = thisArg;
    ld.ordering = ordering;
    ld.i = parsegraph_ArrayList_length(ordering) - 1;

    // Execute the action on allowed nodes.
    if(parsegraph_Node_continueTraverse(&ld) != 0) {
        // Completed action before timeout.
        return 0;
    }

    // Did not complete action, so return the continuation.
    struct parsegraph_NodeTraversal* anld = apr_palloc(node->pool, sizeof(ld));
    memcpy(anld, &ld, sizeof(ld));
    return anld;
}

parsegraph_Node* parsegraph_Node_spawnNode(parsegraph_Node* node, int spawnDirection, int newType)
{
    parsegraph_Node* created = parsegraph_Node_connectNode(node, spawnDirection, parsegraph_Node_new(node->pool, newType, 0, parsegraph_NULL_NODE_DIRECTION));

    // Use the node fitting of the parent.
    parsegraph_Node_setNodeFit(created, parsegraph_Node_nodeFit(node));

    return created;
}

parsegraph_Node* parsegraph_Node_connectNode(parsegraph_Node* parentNode, int inDirection, parsegraph_Node* nodeToConnect)
{
    // Ensure the node can be connected in the given direction.
    if(inDirection == parsegraph_OUTWARD) {
        parsegraph_die("By rule, nodes cannot be spawned in the outward direction.");
    }
    if(inDirection == parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_die("Nodes cannot be spawned in the null node direction.");
    }
    if(inDirection == parsegraph_Node_parentDirection(parentNode)) {
        parsegraph_die("Cannot connect a node in the parent's direction (%s)", parsegraph_nameNodeDirection(inDirection));
    }
    if(parsegraph_Node_hasNode(parentNode, inDirection)) {
        parsegraph_die("Cannot connect a node in the already occupied %s direction.", parsegraph_nameNodeDirection(inDirection));
    }
    if(parsegraph_Node_type(parentNode) == parsegraph_SLIDER) {
        parsegraph_die("Sliders cannot have child nodes.");
    }
    if(parsegraph_Node_type(parentNode) == parsegraph_SCENE && inDirection == parsegraph_INWARD) {
        parsegraph_die("Scenes cannot have inward nodes.");
    }
    if(parsegraph_Node_parentDirection(nodeToConnect) != parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_die("Node to connect must not have a parent.");
    }
    if(parsegraph_Node_hasNode(nodeToConnect, parsegraph_reverseNodeDirection(inDirection))) {
        parsegraph_die("Node to connect must not have a node in the connecting direction.");
    }

    // Connect the node.
    parsegraph_DirectionData* neighbor = &parentNode->_neighbors[inDirection];
    neighbor->node = nodeToConnect;
    parsegraph_Node_ref(nodeToConnect);
    parsegraph_Node_assignParent(nodeToConnect, parentNode, parsegraph_reverseNodeDirection(inDirection));

    parsegraph_Node* prevSibling = 0;
    for(int i = inDirection; i >= 0; --i) {
        if(i == inDirection) {
            continue;
        }
        if(i == parentNode->_parentDirection) {
            continue;
        }
        prevSibling = parentNode->_neighbors[i].node;
        if(prevSibling) {
            break;
        }
    }
    parsegraph_Node* deeplyLinked = 0;
    if(prevSibling) {
        deeplyLinked = prevSibling;
        int foundOne = 0;
        for(;;) {
            foundOne = 0;
            for(int i = parsegraph_NUM_DIRECTIONS - 1; i >= 0; --i) {
                if(parsegraph_Node_nodeAt(deeplyLinked, i) && parsegraph_Node_parentDirection(deeplyLinked) != i) {
                    deeplyLinked = parsegraph_Node_nodeAt(deeplyLinked, i);
                    foundOne = 1;
                    break;
                }
            }
            if(foundOne) {
                continue;
            }
            else {
                break;
            }
        }
        prevSibling = deeplyLinked;
    }

    parsegraph_Node* nextSibling = 0;
    for(int i = inDirection; i < parsegraph_NUM_DIRECTIONS; ++i) {
        if(i == inDirection) {
            continue;
        }
        if(i == parentNode->_parentDirection) {
            continue;
        }
        nextSibling = parentNode->_neighbors[i].node;
        if(nextSibling) {
            break;
        }
    }
    if(nextSibling) {
        deeplyLinked = nextSibling;
        int foundOne = 0;
        for(;;) {
            foundOne = 0;
            for(int i = 0; i < parsegraph_NUM_DIRECTIONS; ++i) {
                if(parsegraph_Node_nodeAt(deeplyLinked, i) && parsegraph_Node_parentDirection(deeplyLinked) != i) {
                    deeplyLinked = parsegraph_Node_nodeAt(deeplyLinked, i);
                    foundOne = 1;
                    break;
                }
            }
            if(foundOne) {
                continue;
            }
            else {
                break;
            }
        }
        nextSibling = deeplyLinked;
    }

    if(nextSibling && prevSibling) {
        //console.log("Adding " + parsegraph_nameNodeType(node.type()) + " child between node siblings");
        parsegraph_Node* lastOfNode = nodeToConnect->_worldPrev;
        parsegraph_Node* prevExisting = nextSibling->_worldPrev;
        prevExisting->_worldNext = nodeToConnect;
        nodeToConnect->_worldPrev = prevExisting;
        lastOfNode->_worldNext = nextSibling;
        nextSibling->_worldPrev = lastOfNode;
    }
    else if(nextSibling) {
        //console.log("Adding child with only next siblings");
        // No previous sibling.
        parsegraph_Node* oldNext = parentNode->_worldNext;
        parentNode->_worldNext = nodeToConnect;
        parsegraph_Node* lastOfNode = nodeToConnect->_worldPrev;
        nodeToConnect->_worldPrev = parentNode;

        lastOfNode->_worldNext = oldNext;
        oldNext->_worldPrev = lastOfNode;
    }
    else if(prevSibling) {
        //console.log("Adding child " + parsegraph_nameNodeType(node.type()) + " with only previous siblings in " + parsegraph_nameNodeDirection(inDirection) + " direction.");
        parsegraph_Node* oldNext = prevSibling->_worldNext;
        parsegraph_Node* lastOfNode = nodeToConnect->_worldPrev;

        oldNext->_worldPrev = lastOfNode;
        prevSibling->_worldNext = nodeToConnect;

        lastOfNode->_worldNext = oldNext;
        nodeToConnect->_worldPrev = prevSibling;
    }
    else {
        //console.log("Connecting only child " + parsegraph_nameNodeType(node.type()) + " in " + parsegraph_nameNodeDirection(inDirection) + " direction.");
        // Connected node has no neighbors.
        parsegraph_Node* oldNext = parentNode->_worldNext;
        parentNode->_worldNext = nodeToConnect;

        parsegraph_Node* lastOfNode = nodeToConnect->_worldPrev;
        lastOfNode->_worldNext = oldNext;
        oldNext->_worldPrev = lastOfNode;

        nodeToConnect->_worldPrev = parentNode;
    }

    // Allow alignments to be set before children are spawned.
    if(neighbor->alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor->alignmentMode = parsegraph_DO_NOT_ALIGN;
    }

    parsegraph_Node_layoutWasChanged(parentNode, inDirection);

    return nodeToConnect;
}

void parsegraph_Node_eraseNode(parsegraph_Node* node, int givenDirection)
{
    if(!parsegraph_Node_hasNode(node, givenDirection)) {
        return;
    }
    if(!parsegraph_Node_isRoot(node) && givenDirection == parsegraph_Node_parentDirection(node)) {
        parsegraph_abort(parsegraph_CANNOT_AFFECT_PARENT);
    }
    parsegraph_Node* disconnected = parsegraph_Node_disconnectNode(node, givenDirection);
    parsegraph_Node_unref(disconnected);
}

parsegraph_Node* parsegraph_Node_disconnectNode(parsegraph_Node* node, int inDirection)
{
    if(inDirection == parsegraph_NULL_NODE_DIRECTION) {
        if(parsegraph_Node_isRoot(node)) {
            parsegraph_die("Cannot disconnect a root node.");
        }
        return parsegraph_Node_disconnectNode(parsegraph_Node_parentNode(node),
            parsegraph_reverseNodeDirection(node->_parentDirection)
        );
    }
    if(!parsegraph_Node_hasNode(node, inDirection)) {
        return 0;
    }
    // Disconnect the node.
    parsegraph_DirectionData* neighbor = &node->_neighbors[inDirection];
    parsegraph_Node* disconnected = neighbor->node;
    neighbor->node = 0;
    parsegraph_Node_assignParent(disconnected, 0, parsegraph_NULL_NODE_DIRECTION);

    parsegraph_Node* prevSibling = 0;
    for(int i = inDirection; i >= 0; --i) {
        if(i == inDirection) {
            continue;
        }
        if(i == node->_parentDirection) {
            continue;
        }
        prevSibling = node->_neighbors[i].node;
        if(prevSibling) {
            break;
        }
    }
    parsegraph_Node* nextSibling;
    for(int i = inDirection; i < parsegraph_NUM_DIRECTIONS; ++i) {
        if(i == inDirection) {
            continue;
        }
        if(i == node->_parentDirection) {
            continue;
        }
        nextSibling = node->_neighbors[i].node;
        if(nextSibling) {
            break;
        }
    }

    if(nextSibling && prevSibling) {
        parsegraph_Node* oldPrev = disconnected->_worldPrev;
        parsegraph_Node* lastOfDisconnected = nextSibling->_worldPrev;

        disconnected->_worldPrev = lastOfDisconnected;
        lastOfDisconnected->_worldNext = disconnected;

        nextSibling->_worldPrev = oldPrev;
        oldPrev->_worldNext = nextSibling;
    }
    else if(nextSibling) {
        parsegraph_Node* oldPrev = nextSibling->_worldPrev;

        nextSibling->_worldPrev = node;
        node->_worldNext = nextSibling;

        oldPrev->_worldNext = disconnected;
        disconnected->_worldPrev = oldPrev;
    }
    else if(prevSibling) {
        parsegraph_Node* oldPrev = disconnected->_worldPrev;
        parsegraph_Node* lastOfDisconnected = node->_worldPrev;

        disconnected->_worldPrev = lastOfDisconnected;
        lastOfDisconnected->_worldNext = disconnected;

        oldPrev->_worldNext = node;
        node->_worldPrev = oldPrev;
    }
    else {
        parsegraph_Node* lastOfDisconnected = node->_worldPrev;
        node->_worldNext = node;
        node->_worldPrev = node;

        disconnected->_worldPrev = lastOfDisconnected;
        lastOfDisconnected->_worldNext = disconnected;
    }

    parsegraph_Node_layoutWasChanged(node, inDirection);
    return disconnected;
}

void parsegraph_Node_eachChild(parsegraph_Node* node, void(*visitor)(void*, parsegraph_Node*, int), void* visitorThisArg)
{
    for(int i = 0; i < parsegraph_NUM_DIRECTIONS; ++i) {
        parsegraph_DirectionData* neighbor = &node->_neighbors[i];
        if(!neighbor->node || i == parsegraph_Node_parentDirection(node)) {
            return;
        }
        visitor(visitorThisArg, neighbor->node, i);
    }
}

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

void parsegraph_Node_extentSize(parsegraph_Node* node, float* size)
{
    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_FORWARD), size + 1, 0, 0);

    // The vertical extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD), size, 0, 0);
};

void parsegraph_Node_showNodeInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary)
{
    parsegraph_CommitLayoutTraversal cl;
    cl.root = node;
    cl.node = node;
    cl.timeout = 0;
    while(0 != parsegraph_Node_commitLayoutIteratively(node, &cl));
    float bodySize[2];
    parsegraph_Node_absoluteSize(node, bodySize);

    float bodyRect[4];
    parsegraph_Rect_set(bodyRect,
        parsegraph_Node_absoluteX(node),
        parsegraph_Node_absoluteY(node),
        bodySize[0],
        bodySize[1]
    );
    //if(parsegraph_Camera_ContainsAll(cam, bodyRect)) {
        //return;
    //}

    float nodeScale = parsegraph_Node_absoluteScale(node);

    parsegraph_Surface* surface = parsegraph_Camera_surface(cam);
    float camScale = parsegraph_Camera_scale(cam);
    float screenWidth = parsegraph_Surface_getWidth(surface);
    float screenHeight = parsegraph_Surface_getHeight(surface);

    float scaleAdjustment;
    int widthIsBigger = screenWidth / (bodySize[0]*nodeScale) < screenHeight / (bodySize[1]*nodeScale);
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
        parsegraph_Camera_setScale(cam, scaleAdjustment);
    }   

    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    parsegraph_Camera_setOrigin(cam, -ax + screenWidth/(scaleAdjustment*2), -ay + screenHeight/(scaleAdjustment*2));
}

void parsegraph_Node_showInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary)
{
    parsegraph_CommitLayoutTraversal cl;
    cl.root = node;
    cl.node = node;
    cl.timeout = 0;
    while(0 != parsegraph_Node_commitLayoutIteratively(node, &cl));
    float bodySize[2];
    parsegraph_Node_extentSize(node, bodySize);

    parsegraph_Surface* surface = parsegraph_Camera_surface(cam);
    float camScale = parsegraph_Camera_scale(cam);
    float screenWidth = parsegraph_Surface_getWidth(surface);
    float screenHeight = parsegraph_Surface_getHeight(surface);

    float scaleAdjustment;
    int widthIsBigger = screenWidth / bodySize[0] < screenHeight / bodySize[1];
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
        parsegraph_Camera_setScale(cam, scaleAdjustment);
    }   

    float x, y;
    float bv[3];
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_BACKWARD), bv, bv + 1, bv + 2);
    x = bv[1];
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_UPWARD), bv, bv + 1, bv + 2);
    y = bv[1];

    if(widthIsBigger || scaleAdjustment < 1.0) {
        y += (screenHeight - bodySize[1]*scaleAdjustment)/(scaleAdjustment*2);
    }
    if(!widthIsBigger || scaleAdjustment < 1.0) {
        x += (screenWidth - bodySize[0]*scaleAdjustment)/(scaleAdjustment*2);
    }

    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    
    parsegraph_Camera_setOrigin(cam, x - ax, y - ay);
}

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

void parsegraph_Node_setValue(parsegraph_Node* node, void* newValue, int report)
{
    if(node->_value == newValue) {
        return;
    }
    node->_value = newValue;
    if(report) {
        parsegraph_Node_valueChanged(node);
    }
};

void* parsegraph_Node_scene(parsegraph_Node* node)
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

int parsegraph_Node_label(parsegraph_Node* node, UChar* buf, int len)
{
    if(!node->_realLabel) {
        return 0;
    }
    return parsegraph_Label_getText(node->_realLabel, buf, len);
};

parsegraph_Label* parsegraph_Node_realLabel(parsegraph_Node* node)
{
    return node->_realLabel;
};

void parsegraph_Node_setLabelUTF8(parsegraph_Node* node, const char* text, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!node->_realLabel) {
        node->_realLabel = parsegraph_Label_new(node->pool, glyphAtlas);
    }

    parsegraph_Label_setTextUTF8(node->_realLabel, text, len);
    /*    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);*/
};

void parsegraph_Node_setLabel(parsegraph_Node* node, const UChar* text, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!node->_realLabel) {
        node->_realLabel = parsegraph_Label_new(node->pool, glyphAtlas);
    }

    parsegraph_Label_setText(node->_realLabel, text, len);
    /*    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);*/
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

int parsegraph_Node_isSelectedAt(parsegraph_Node* node, int direction)
{
    if(!parsegraph_Node_hasNode(node, direction)) {
        return 0;
    }
    return parsegraph_Node_isSelected(parsegraph_Node_nodeAt(node, direction));
}

float parsegraph_Node_sizeIn(parsegraph_Node* node, int direction)
{
    float rv[2];
    parsegraph_Node_size(node, rv);
    if(parsegraph_isVerticalNodeDirection(direction)) {
        return rv[1]/2;
    }
    return rv[0]/2;
}

float* parsegraph_Node_brightnessColor(parsegraph_Node* node)
{
    return node->_brightnessColor;
}

void parsegraph_Node_setBrightnessColor(parsegraph_Node* node, float* brightnessColor)
{
    parsegraph_Color_copy(node->_brightnessColor, brightnessColor);
}

float parsegraph_Node_borderThickness(parsegraph_Node* node)
{
    return parsegraph_Node_blockStyle(node)->borderThickness;
}

void parsegraph_Node_size(parsegraph_Node* node, float* bodySize)
{
    parsegraph_Node_sizeWithoutPadding(node, bodySize);
    bodySize[0] += 2 * parsegraph_Node_horizontalPadding(node) + 2 * parsegraph_Node_borderThickness(node);
    bodySize[1] += 2 * parsegraph_Node_verticalPadding(node) + 2 * parsegraph_Node_borderThickness(node);
    //parsegraph_log("Calculated %s node size of (%f, %f)\n", parsegraph_nameNodeType(parsegraph_Node_type(node)), bodySize[0], bodySize[1]);
}

void parsegraph_Node_absoluteSize(parsegraph_Node* node, float* bodySize)
{
    parsegraph_Node_size(node, bodySize);
    float s = parsegraph_Node_absoluteScale(node);
    bodySize[0] *= s;
    bodySize[1] *= s;
}

void parsegraph_Node_assignParent(parsegraph_Node* node, parsegraph_Node* fromParent, int parentDirection)
{
    if(!fromParent) {
        // Clearing the parent.
        if(node->_parentDirection != parsegraph_NULL_NODE_DIRECTION) {
            if(node->_neighbors[node->_parentDirection].node) {
                //parsegraph_Node_unref(node->_neighbors[node->_parentDirection].node);
            }
            node->_neighbors[node->_parentDirection].node = 0;
            node->_parentDirection = parsegraph_NULL_NODE_DIRECTION;
        }
        return;
    }
    //parsegraph_Node_ref(fromParent);
    node->_neighbors[parentDirection].node = fromParent;
    node->_parentDirection = parentDirection;
}

int parsegraph_Node_isSelected(parsegraph_Node* node)
{
    return node->_selected;
};

void parsegraph_Node_setSelected(parsegraph_Node* node, int selected)
{
    node->_selected = selected;
};

float parsegraph_Node_horizontalPadding(parsegraph_Node* node)
{
    return parsegraph_Node_blockStyle(node)->horizontalPadding;
};

float parsegraph_Node_verticalPadding(parsegraph_Node* node)
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

/**
 * Returns true if the coordinates are in the node.
 */
int parsegraph_Node_inNodeBody(parsegraph_Node* node, float x, float y, float userScale)
{
    float s[2];
    parsegraph_Node_size(node, s);

    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    float aScale = parsegraph_Node_absoluteScale(node);
    if(x < userScale * ax - userScale * aScale * s[0]/2) {
        //console.log("INB 1" + x + " against " + node.absoluteX());
        return 0;
    }
    if(x > userScale * ax + userScale * aScale * s[0]/2) {
        //console.log("INB 2");
        return 0;
    }
    if(y < userScale * ay - userScale * aScale * s[1]/2) {
        //console.log("INB 3");
        return 0;
    }
    if(y > userScale * ay + userScale * aScale * s[1]/2) {
        //console.log("INB 4");
        return 0;
    }

    //console.log("Within node body" + node);
    return 1;
}

/**
 * Returns true if the coordinates are in the node or its extent.
 */
int parsegraph_Node_inNodeExtents(parsegraph_Node* node, float x, float y, float userScale)
{
    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    float aScale = parsegraph_Node_absoluteScale(node);
    float eSize[2];
    parsegraph_Node_extentSize(node, eSize);

    if(x < userScale * ax - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD)) {
        return 0;
    }
    if(x > userScale * ax - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD) + userScale * aScale * eSize[0]) {
        return 0;
    }
    if(y < userScale * ay - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_FORWARD)) {
        return 0;
    }
    if(y > userScale * ay - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_FORWARD)
            + userScale * aScale * eSize[1]
    ) {
        return 0;
    }
    return 1;
}

static void addCandidate(parsegraph_ArrayList* candidates, parsegraph_Node* node, int direction)
{
    if(direction != parsegraph_NULL_NODE_DIRECTION) {
        if(!parsegraph_Node_hasChildAt(node, direction)) {
            return;
        }
        node = parsegraph_Node_nodeAt(node, direction);
    }
    if(node == 0) {
        return;
    }
    parsegraph_ArrayList_push(candidates, node);
}

parsegraph_Node* parsegraph_Node_nodeUnderCoords(parsegraph_Node* node, float x, float y, float userScale)
{
    //parsegraph_log("nodeUnderCoords: %0.2f, %0.2f\n", x, y);
    if(userScale == NAN) {
        userScale = 1;
    }

    apr_pool_t* spool = 0;
    if(APR_SUCCESS != apr_pool_create(&spool, node->pool)) {
        parsegraph_die("Failed to create memory pool to check for Node click.");
    }

    parsegraph_Node* rv = 0;
    parsegraph_ArrayList* candidates = parsegraph_ArrayList_new(spool);
    parsegraph_ArrayList_push(candidates, node);

    parsegraph_Node FORCE_SELECT_PRIOR;
    while(parsegraph_ArrayList_length(candidates) > 0) {
        parsegraph_Node* candidate = parsegraph_ArrayList_at(candidates, parsegraph_ArrayList_length(candidates) - 1);

        if(candidate == &FORCE_SELECT_PRIOR) {
            parsegraph_ArrayList_pop(candidates);
            return parsegraph_ArrayList_pop(candidates);
        }

        if(parsegraph_Node_inNodeBody(candidate, x, y, userScale)) {
            //parsegraph_log("Click is in node body\n");
            if(
                parsegraph_Node_hasNode(candidate, parsegraph_INWARD)
            ) {
                if(parsegraph_Node_inNodeExtents(
                    parsegraph_Node_nodeAt(candidate, parsegraph_INWARD), x, y, userScale)
                ) {
                    //parsegraph_log("Testing inward node\n");
                    parsegraph_ArrayList_push(candidates, &FORCE_SELECT_PRIOR);
                    parsegraph_ArrayList_push(candidates, parsegraph_Node_nodeAt(candidate, parsegraph_INWARD));
                    continue;
                }
                else {
                    //parsegraph_log("Click not in inward extents\n");
                }
            }

            // Found the node.
            //parsegraph_log("Found clicked node.\n");
            rv = candidate;
            goto end;
        }
        // Not within this node, so remove it as a candidate.
        parsegraph_ArrayList_pop(candidates);

        // Test if the click is within any child.
        if(!parsegraph_Node_inNodeExtents(candidate, x, y, userScale)) {
            // Nope, so continue the search.
            continue;
        }
        //parsegraph_log("Click is in node extent\n");
        float ax = parsegraph_Node_absoluteX(candidate);
        float ay = parsegraph_Node_absoluteY(candidate);

        // It is potentially within some child, so search the children.
        if(parsegraph_absf(y - userScale * ay) > parsegraph_absf(x - userScale * ax)) {
            // Y extent is greater than X extent.
            if(userScale * ax > x) {
                addCandidate(candidates, candidate, parsegraph_BACKWARD);
                addCandidate(candidates, candidate, parsegraph_FORWARD);
            }
            else {
                addCandidate(candidates, candidate, parsegraph_FORWARD);
                addCandidate(candidates, candidate, parsegraph_BACKWARD);
            }
            if(userScale * ay > y) {
                addCandidate(candidates, candidate, parsegraph_UPWARD);
                addCandidate(candidates, candidate, parsegraph_DOWNWARD);
            }
            else {
                addCandidate(candidates, candidate, parsegraph_DOWNWARD);
                addCandidate(candidates, candidate, parsegraph_UPWARD);
            }
        }
        else {
            // X extent is greater than Y extent.
            if(userScale * ay > y) {
                addCandidate(candidates, candidate, parsegraph_UPWARD);
                addCandidate(candidates, candidate, parsegraph_DOWNWARD);
            }
            else {
                addCandidate(candidates, candidate, parsegraph_DOWNWARD);
                addCandidate(candidates, candidate, parsegraph_UPWARD);
            }
            if(userScale * ax > x) {
                addCandidate(candidates, candidate, parsegraph_BACKWARD);
                addCandidate(candidates, candidate, parsegraph_FORWARD);
            }
            else {
                addCandidate(candidates, candidate, parsegraph_FORWARD);
                addCandidate(candidates, candidate, parsegraph_BACKWARD);
            }
        }
    }

    //parsegraph_log("Found nothing clicked.\n");
end:
    parsegraph_ArrayList_destroy(candidates);
    apr_pool_destroy(spool);
    return rv;
}

void parsegraph_Node_sizeWithoutPadding(parsegraph_Node* node, float* bodySize)
{
    // Find the size of this node's drawing area.
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);
    if(node->_realLabel && !parsegraph_Label_isEmpty(node->_realLabel)) {
        float scaling = (style->fontSize / parsegraph_GlyphAtlas_fontSize(parsegraph_Label_glyphAtlas(node->_realLabel)));
        bodySize[0] = parsegraph_Label_width(node->_realLabel) * scaling;
        bodySize[1] = parsegraph_Label_height(node->_realLabel) * scaling;
        if(isnan(bodySize[0]) || isnan(bodySize[1])) {
            parsegraph_die(
                "Label returned a NaN size. (%f, %f) to (%f, %f). Scaling is (fontSize:%f/glyphFontSize:%f=%f)",
                parsegraph_Label_width(node->_realLabel), parsegraph_Label_height(node->_realLabel),
                bodySize[0], bodySize[1],
                style->fontSize, parsegraph_GlyphAtlas_fontSize(parsegraph_Label_glyphAtlas(node->_realLabel)),
                scaling
            );
        }
    }
    else {
        bodySize[0] = style->minWidth;
        bodySize[1] = style->minHeight;
    }
    if(parsegraph_Node_hasNode(node, parsegraph_INWARD)) {
        parsegraph_Node* nestedNode = parsegraph_Node_nodeAt(node, parsegraph_INWARD);
        float nestedSize[2];
        parsegraph_Node_extentSize(nestedNode, nestedSize);

        if(parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            bodySize[0] = parsegraph_max(bodySize[0], nestedSize[0] * parsegraph_Node_scale(nestedNode));

            if(parsegraph_Node_realLabel(node)) {
                // Allow for the content's size.
                bodySize[1] = parsegraph_max(style->minHeight,
                    bodySize[1]
                    + parsegraph_Node_verticalPadding(node)
                    + nestedSize[1] * parsegraph_Node_scale(nestedNode)
                );
            }
            else {
                bodySize[1] = parsegraph_max(bodySize[1],
                    nestedSize[1] * parsegraph_Node_scale(nestedNode)
                    + 2 * parsegraph_Node_verticalPadding(node)
                );
            }
        }
        else {
            // Align horizontal.
            if(parsegraph_Node_realLabel(node)) {
                // Allow for the content's size.
                bodySize[0] =
                    bodySize[0]
                    + parsegraph_Node_horizontalPadding(node)
                    + parsegraph_Node_scale(nestedNode) * nestedSize[0];
            }
            else {
                bodySize[0] = parsegraph_max(bodySize[0], parsegraph_Node_scale(nestedNode) * nestedSize[0]);
            }

            bodySize[1] = parsegraph_max(
                bodySize[1],
                parsegraph_Node_scale(nestedNode) * nestedSize[1]
                + 2 * parsegraph_Node_verticalPadding(node)
            );
        }
    }

    // Buds appear circular
    if(parsegraph_Node_type(node) == parsegraph_BUD) {
        float aspect = bodySize[0] / bodySize[1];
        if(aspect < 2 && aspect > 1 / 2) {
            bodySize[0] = parsegraph_max(bodySize[0], bodySize[1]);
            bodySize[1] = bodySize[0];
        }
    }

    bodySize[0] = parsegraph_max(style->minWidth, bodySize[0]);
    bodySize[1] = parsegraph_max(style->minHeight, bodySize[1]);
}

static void initExtent(
    parsegraph_Node* node,
    int inDirection,
    float length,
    float size,
    float offset)
{
    parsegraph_Extent_clear(node->_neighbors[inDirection].extent);
    parsegraph_Extent_appendLS(node->_neighbors[inDirection].extent, length, size);
    node->_neighbors[inDirection].extentOffset = offset;
}

/**
 * Returns the offset of the child's center in the given direction from
 * this node's center.
 *
 * This offset is in a direction perpendicular to the given direction
 * and is positive to indicate a negative offset.
 *
 * The result is in this node's space.
 */
float getAlignment(parsegraph_Node* node, int childDirection)
{
    // Calculate the alignment adjustment for both nodes.
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, childDirection);
    int axis = parsegraph_getPerpendicularAxis(
        parsegraph_getNodeDirectionAxis(childDirection)
    );

    float rv = 0;

    int alignmentMode = node->_neighbors[childDirection].alignmentMode;
    switch(alignmentMode) {
    case parsegraph_NULL_NODE_ALIGNMENT:
        parsegraph_abort(parsegraph_BAD_NODE_ALIGNMENT);
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
        float negativeLength = parsegraph_findConsecutiveLength(
            child, parsegraph_getNegativeNodeDirection(axis)
        );

        float positiveLength = parsegraph_findConsecutiveLength(
            child, parsegraph_getPositiveNodeDirection(axis)
        );

        float halfLength = (negativeLength + positiveLength) / 2;

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
    default:
        parsegraph_die("Unreachable");
    }
    //console.log("Found alignment of " + rv);
    return rv * parsegraph_Node_scaleAt(node, childDirection);
}

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
static void positionChild(parsegraph_Node* node, int childDirection, int alignment, float separation) {
    // Validate arguments.
    if(separation < 0) {
        parsegraph_die("separation must always be positive.");
    }
    if(!parsegraph_isCardinalDirection(childDirection)) {
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, childDirection);
    int reversedDirection = parsegraph_reverseNodeDirection(childDirection);

    // Save alignment parameters.
    node->_neighbors[childDirection].alignmentOffset = alignment;
    node->_neighbors[childDirection].separation = separation;

    // Determine the line length.
    float lineLength;
    float extentSize;
    if(parsegraph_Node_nodeAlignmentMode(node, childDirection) == parsegraph_DO_NOT_ALIGN) {
        float childSize[2];
        parsegraph_Node_size(child, childSize);
        if(parsegraph_isVerticalNodeDirection(childDirection)) {
            extentSize = childSize[1] / 2;
        }
        else {
            extentSize = childSize[0] / 2;
        }
    }
    else {
        extentSize = parsegraph_Extent_sizeAt(parsegraph_Node_extentsAt(child, reversedDirection),
            parsegraph_Node_extentOffsetAt(node->_neighbors[childDirection].node, reversedDirection) -
            alignment / parsegraph_Node_scaleAt(node, childDirection)
        );
    }
    lineLength = separation - parsegraph_Node_scaleAt(node, childDirection) * extentSize;
    node->_neighbors[childDirection].lineLength = lineLength;
    //parsegraph_log("Line length: %f, separation: %f, extentSize: %f\n", lineLength, separation, extentSize);

    // Set the position.
    int dirSign = parsegraph_nodeDirectionSign(childDirection);
    if(parsegraph_isVerticalNodeDirection(childDirection)) {
        // The child is positioned vertically.
        parsegraph_Node_setPosAt(node, childDirection, alignment, dirSign * separation);
    }
    else {
        parsegraph_Node_setPosAt(node, childDirection, dirSign * separation, alignment);
    }
    //parsegraph_log("%s %s's position set to (%f, %f)\n",
        //parsegraph_nameNodeDirection(childDirection),
        //parsegraph_nameNodeType(parsegraph_Node_type(child)),
        //node->_neighbors[childDirection].xPos, node->_neighbors[childDirection].yPos
    //);
};

/**
 * Combine an extent.
 *
 * lengthAdjustment and sizeAdjustment are in this node's space.
 */
static void combineExtent(parsegraph_Node* node,
    int childDirection,
    int direction,
    float lengthAdjustment,
    float sizeAdjustment)
{
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, childDirection);
    /*console.log(
        "combineExtent(" +
        parsegraph_nameNodeDirection(direction) + ", " +
        lengthAdjustment + ", " +
        sizeAdjustment + ")"
    );*/
    // Calculate the new offset to this node's center.
    float lengthOffset = node->_neighbors[direction].extentOffset
        + lengthAdjustment
        - parsegraph_Node_scaleAt(node, childDirection) * parsegraph_Node_extentOffsetAt(child, direction);

    // Combine the two extents in the given direction.
    //parsegraph_log("Combining %s\n", parsegraph_nameNodeDirection(direction));
    //parsegraph_log("Length offset: %f\n", lengthOffset);
    //parsegraph_log("Size adjustment: %f\n", sizeAdjustment);
    parsegraph_Extent_combineExtent(node->_neighbors[direction].extent,
        parsegraph_Node_extentsAt(child, direction),
        lengthOffset,
        sizeAdjustment,
        parsegraph_Node_scaleAt(node, childDirection)
    );
    if(parsegraph_Node_nodeFit(node) == parsegraph_NODE_FIT_LOOSE) {
        parsegraph_Extent_simplify(node->_neighbors[direction].extent);
    }
    //parsegraph_log("Combine complete.\n");

    // Adjust the length offset to remain positive.
    if(lengthOffset < 0) {
        //console.log("Adjusting negative extent offset.");
        node->_neighbors[direction].extentOffset =
            node->_neighbors[direction].extentOffset + parsegraph_absf(lengthOffset);
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
    if(node->_neighbors[direction].extentOffset < 0) {
        parsegraph_die("Extent offset must not be negative.");
    }
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
static void combineExtents(
    parsegraph_Node* node,
    int childDirection,
    int alignment,
    float separation)
{
    switch(childDirection) {
    case parsegraph_DOWNWARD:
        // Downward child.
        combineExtent(node, childDirection, parsegraph_DOWNWARD, alignment, separation);
        combineExtent(node, childDirection, parsegraph_UPWARD, alignment, -separation);

        combineExtent(node, childDirection, parsegraph_FORWARD, separation, alignment);
        combineExtent(node, childDirection, parsegraph_BACKWARD, separation, -alignment);
        break;
    case parsegraph_UPWARD:
        // Upward child.
        combineExtent(node, childDirection, parsegraph_DOWNWARD, alignment, -separation);
        combineExtent(node, childDirection, parsegraph_UPWARD, alignment, separation);

        combineExtent(node, childDirection, parsegraph_FORWARD, -separation, alignment);
        combineExtent(node, childDirection, parsegraph_BACKWARD, -separation, -alignment);
        break;
    case parsegraph_FORWARD:
        // Forward child.
        combineExtent(node, childDirection, parsegraph_DOWNWARD, separation, alignment);
        combineExtent(node, childDirection, parsegraph_UPWARD, separation, -alignment);

        combineExtent(node, childDirection, parsegraph_FORWARD, alignment, separation);
        combineExtent(node, childDirection, parsegraph_BACKWARD, alignment, -separation);
        break;
    case parsegraph_BACKWARD:
        // Backward child.
        combineExtent(node, childDirection, parsegraph_DOWNWARD, -separation, alignment);
        combineExtent(node, childDirection, parsegraph_UPWARD, -separation, -alignment);

        combineExtent(node, childDirection, parsegraph_FORWARD, alignment, -separation);
        combineExtent(node, childDirection, parsegraph_BACKWARD, alignment, separation);
        break;
    default:
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }
};

/**
 * Layout a single node in the given direction.
 */
void layoutSingle(parsegraph_Node* node,
    float* bodySize,
    int direction,
    int allowAxisOverlap)
{
    if(!parsegraph_Node_hasNode(node, direction)) {
        return;
    }

    //parsegraph_log(
        //"Laying out single %s child, %s axis overlap.\n",
        //parsegraph_nameNodeDirection(direction),
        //(allowAxisOverlap ? "with" : "without")
    //);

    // Get the alignment for the children.
    int alignment = getAlignment(node, direction);
    //parsegraph_log("Calculated alignment of %d.\n", alignment);

    parsegraph_Node* child = parsegraph_Node_nodeAt(node, direction);
    int reversed = parsegraph_reverseNodeDirection(direction);
    parsegraph_Extent* childExtent = parsegraph_Node_extentsAt(child, reversed);

    // Separate the child from this node.
    float separationFromChild = parsegraph_Extent_separation(node->_neighbors[direction].extent,
        childExtent,
        node->_neighbors[direction].extentOffset
            + alignment
            - parsegraph_Node_scaleAt(node, direction) * parsegraph_Node_extentOffsetAt(child, reversed),
        allowAxisOverlap,
        parsegraph_Node_scaleAt(node, direction),
        parsegraph_LINE_THICKNESS / 2
    );
    //parsegraph_log("Calculated unpadded separation of %f.\n", separationFromChild);

    float childSize[2];
    parsegraph_Node_size(child, childSize);
    // Add padding and ensure the child is not separated less than
    // it would be if the node was not offset by alignment.
    if(
        parsegraph_getNodeDirectionAxis(direction) == parsegraph_VERTICAL_AXIS
    ) {
        separationFromChild = parsegraph_max(
            separationFromChild,
            parsegraph_Node_scaleAt(node, direction) * (childSize[1] / 2) + bodySize[1] / 2
        );
        separationFromChild
            += parsegraph_Node_verticalSeparation(node, direction) * parsegraph_Node_scaleAt(node, direction);
    }
    else {
        separationFromChild = parsegraph_max(
            separationFromChild,
            parsegraph_Node_scaleAt(node, direction) * (childSize[0] / 2) + bodySize[0] / 2
        );
        separationFromChild
            += parsegraph_Node_horizontalSeparation(node, direction) * parsegraph_Node_scaleAt(node, direction);
    }
    //parsegraph_log("Calculated padded separation of %f.\n", separationFromChild);

    // Set the node's position.
    positionChild(
        node,
        direction,
        alignment,
        separationFromChild
    );

    // Combine the extents of the child and this node.
    combineExtents(
        node,
        direction,
        alignment,
        separationFromChild
    );
}

/**
 * Layout a pair of nodes in the given directions.
 */
void layoutAxis(parsegraph_Node* node,
    float* bodySize,
    int firstDirection,
    int secondDirection,
    int allowAxisOverlap)
{
    if(firstDirection == secondDirection && firstDirection != parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_die("Bad node directions");
    }
    // Change the node direction to null if there is no node in that
    // direction.
    if(!parsegraph_Node_hasNode(node, firstDirection)) {
        firstDirection = parsegraph_NULL_NODE_DIRECTION;
    }
    if(!parsegraph_Node_hasNode(node, secondDirection)) {
        secondDirection = parsegraph_NULL_NODE_DIRECTION;
    }

    // Return if there are no directions.
    if(
        firstDirection == parsegraph_NULL_NODE_DIRECTION
        && secondDirection == parsegraph_NULL_NODE_DIRECTION
    ) {
        //fprintf(stderr, "No nodes in any direction.\n");
        return;
    }

    // Test if this node has a first-axis child in only one direction.
    if(
        firstDirection == parsegraph_NULL_NODE_DIRECTION
        || secondDirection == parsegraph_NULL_NODE_DIRECTION
    ) {
        //fprintf(stderr, "Only node in one direction\n");
        // Find the direction of the only first-axis child.
        int firstAxisDirection;
        if(firstDirection != parsegraph_NULL_NODE_DIRECTION) {
            firstAxisDirection = firstDirection;
        }
        else {
            // It must be the second direction.
            firstAxisDirection = secondDirection;
        }

        // Layout that node.
        layoutSingle(node, bodySize, firstAxisDirection, allowAxisOverlap);
        return;
    }

    //parsegraph_log(
        //"Laying out %s and %s children.\n",
        //parsegraph_nameNodeDirection(firstDirection),
        //parsegraph_nameNodeDirection(secondDirection)
    //);

    // This node has first-axis children in both directions.
    parsegraph_Node* firstNode = parsegraph_Node_nodeAt(node, firstDirection);
    parsegraph_Node* secondNode = parsegraph_Node_nodeAt(node, secondDirection);

    // Get the alignments for the children.
    //fprintf(stderr, "firstDirection=%s. firstNode=%d\n", parsegraph_nameNodeDirection(firstDirection), firstNode ? firstNode->_id : -1);
    int firstNodeAlignment = firstNode != 0 ? getAlignment(node, firstDirection) : parsegraph_NULL_NODE_DIRECTION;
    int secondNodeAlignment = secondNode != 0 ? getAlignment(node, secondDirection) : parsegraph_NULL_NODE_DIRECTION;
    //parsegraph_log("First alignment: " + firstNodeAlignment);
    //parsegraph_log("Second alignment: " + secondNodeAlignment);

    float separationBetweenChildren = parsegraph_Extent_separation(
        parsegraph_Node_extentsAt(firstNode, secondDirection),
        parsegraph_Node_extentsAt(secondNode, firstDirection),
        (parsegraph_Node_scaleAt(node, secondDirection) / parsegraph_Node_scaleAt(node, firstDirection))
        * (secondNodeAlignment - parsegraph_Node_extentOffsetAt(secondNode, firstDirection))
        - (firstNodeAlignment - parsegraph_Node_extentOffsetAt(firstNode, secondDirection)),
        1,
        parsegraph_Node_scaleAt(node, secondDirection) / parsegraph_Node_scaleAt(node, firstDirection),
        0
    );
    separationBetweenChildren *= parsegraph_Node_scaleAt(node, firstDirection);

    //parsegraph_log("Separation between children=" + separationBetweenChildren);

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
    float separationFromFirst = parsegraph_Extent_separation(node->_neighbors[firstDirection].extent,
        parsegraph_Node_extentsAt(firstNode, secondDirection),
        node->_neighbors[firstDirection].extentOffset
        + firstNodeAlignment
        - parsegraph_Node_scaleAt(node, firstDirection) * parsegraph_Node_extentOffsetAt(firstNode, secondDirection),
        allowAxisOverlap,
        parsegraph_Node_scaleAt(node, firstDirection),
        parsegraph_LINE_THICKNESS / 2
    );

    float separationFromSecond = parsegraph_Extent_separation(node->_neighbors[secondDirection].extent,
        parsegraph_Node_extentsAt(secondNode, firstDirection),
        node->_neighbors[secondDirection].extentOffset
        + secondNodeAlignment
        - parsegraph_Node_scaleAt(node, secondDirection) * parsegraph_Node_extentOffsetAt(secondNode, firstDirection),
        allowAxisOverlap,
        parsegraph_Node_scaleAt(node, secondDirection),
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
        separationFromFirst = parsegraph_max(
            separationFromFirst,
            separationBetweenChildren / 2
        );
        separationFromSecond = parsegraph_max(
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

    float firstNodeSize[2];
    parsegraph_Node_size(firstNode, firstNodeSize);
    float secondNodeSize[2];
    parsegraph_Node_size(secondNode, secondNodeSize);

    if(
        parsegraph_getNodeDirectionAxis(firstDirection)
        == parsegraph_VERTICAL_AXIS
    ) {
        separationFromFirst = parsegraph_max(
            separationFromFirst,
            parsegraph_Node_scaleAt(node, firstDirection) * (firstNodeSize[1] / 2)
            + bodySize[1] / 2
        );
        separationFromFirst
            += parsegraph_Node_verticalSeparation(node, firstDirection)
            * parsegraph_Node_scaleAt(node, firstDirection);

        separationFromSecond = parsegraph_max(
            separationFromSecond,
            parsegraph_Node_scaleAt(node, secondDirection) * (secondNodeSize[1] / 2)
            + bodySize[1] / 2
        );
        separationFromSecond
            += parsegraph_Node_verticalSeparation(node, secondDirection)
            * parsegraph_Node_scaleAt(node, secondDirection);
    }
    else {
        separationFromFirst = parsegraph_max(
            separationFromFirst,
            parsegraph_Node_scaleAt(node, firstDirection) * (firstNodeSize[0] / 2)
            + bodySize[0] / 2
        );
        separationFromFirst
            += parsegraph_Node_horizontalSeparation(node, firstDirection)
            * parsegraph_Node_scaleAt(node, firstDirection);

        separationFromSecond = parsegraph_max(
            separationFromSecond,
            parsegraph_Node_scaleAt(node, secondDirection) * (secondNodeSize[0] / 2)
            + bodySize[0] / 2
        );
        separationFromSecond
            += parsegraph_Node_horizontalSeparation(node, secondDirection)
            * parsegraph_Node_scaleAt(node, secondDirection);
    }

    // Set the positions of the nodes.
    positionChild(
        node,
        firstDirection,
        firstNodeAlignment,
        separationFromFirst
    );
    positionChild(
        node,
        secondDirection,
        secondNodeAlignment,
        separationFromSecond
    );

    // Combine their extents.
    combineExtents(
        node,
        firstDirection,
        firstNodeAlignment,
        separationFromFirst
    );
    combineExtents(
        node,
        secondDirection,
        secondNodeAlignment,
        separationFromSecond
    );
}

static void addLineBounds(void* nodePtr, int given)
{
    parsegraph_Node* node = nodePtr;
    if(!parsegraph_Node_hasNode(node, given)) {
        return;
    }

    int perpAxis = parsegraph_getPerpendicularAxis(given);
    int dirSign = parsegraph_nodeDirectionSign(given);

    float positiveOffset = node->_neighbors[
        parsegraph_getPositiveNodeDirection(perpAxis)
    ].extentOffset;

    float negativeOffset = node->_neighbors[
        parsegraph_getNegativeNodeDirection(perpAxis)
    ].extentOffset;

    if(dirSign < 0) {
        positiveOffset -= parsegraph_Node_sizeIn(node, given) + parsegraph_Node_lineLengthAt(node, given);
        negativeOffset -= parsegraph_Node_sizeIn(node, given) + parsegraph_Node_lineLengthAt(node, given);
    }

    if(parsegraph_Node_nodeFit(node) == parsegraph_NODE_FIT_EXACT) {
        // Append the line-shaped bound.
        parsegraph_Extent_combineBound(node->_neighbors[
            parsegraph_getPositiveNodeDirection(perpAxis)
        ].extent,
            positiveOffset,
            parsegraph_Node_lineLengthAt(node, given),
            parsegraph_Node_scaleAt(node, given) * parsegraph_LINE_THICKNESS / 2
        );
        parsegraph_Extent_combineBound(node->_neighbors[
            parsegraph_getNegativeNodeDirection(perpAxis)
        ].extent,
            negativeOffset,
            parsegraph_Node_lineLengthAt(node, given),
            parsegraph_Node_scaleAt(node, given) * parsegraph_LINE_THICKNESS / 2
        );
    }
};

/**
 * Sets the position, calculates extents, and
 * clears the needs commit flag.
 */
int parsegraph_Node_commitLayout(parsegraph_Node* node, float* bodySize)
{
    // Do nothing if this node already has a layout committed.
    if(node->_layoutState == parsegraph_COMMITTED_LAYOUT) {
        return 0;
    }

    // Check for invalid layout states.
    if(node->_layoutState == parsegraph_NULL_LAYOUT_STATE) {
        parsegraph_abort(parsegraph_BAD_LAYOUT_STATE);
    }

    // Do not allow overlapping layout commits.
    if(node->_layoutState == parsegraph_IN_COMMIT) {
        parsegraph_abort(parsegraph_BAD_LAYOUT_STATE);
    }

    // Begin the layout.
    node->_layoutState = parsegraph_IN_COMMIT;

    // Clear the absolute point values, to be safe.
    node->_hasAbsolutePos = 0;
    node->_absoluteXPos = 0;
    node->_absoluteYPos = 0;

    parsegraph_Node_size(node, bodySize);

    // This node's horizontal bottom, used with downward nodes.
    initExtent(
        node,
        parsegraph_DOWNWARD,
        // Length:
        bodySize[0],
        // Size:
        bodySize[1] / 2,
        // Offset to body center:
        bodySize[0] / 2
    );

    // This node's horizontal top, used with upward nodes.
    initExtent(
        node,
        parsegraph_UPWARD,
        // Length:
        bodySize[0],
        // Size:
        bodySize[1] / 2,
        // Offset to body center:
        bodySize[0] / 2
    );

    // This node's vertical back, used with backward nodes.
    initExtent(
        node,
        parsegraph_BACKWARD,
        // Length:
        bodySize[1],
        // Size:
        bodySize[0] / 2,
        // Offset to body center:
        bodySize[1] / 2
    );

    // This node's vertical front, used with forward nodes.
    initExtent(
        node,
        parsegraph_FORWARD,
        // Length:
        bodySize[1],
        // Size:
        bodySize[0] / 2,
        // Offset to body center:
        bodySize[1] / 2
    );

    if(
        parsegraph_Node_isRoot(node)
        || parsegraph_Node_parentDirection(node) == parsegraph_INWARD
        || parsegraph_Node_parentDirection(node) == parsegraph_OUTWARD
    ) {
        if(node->_layoutPreference == parsegraph_PREFER_HORIZONTAL_AXIS) {
            // Root-like, so just lay out both axes. (this is a root's default)
            layoutAxis(node, bodySize, parsegraph_BACKWARD, parsegraph_FORWARD,
                !parsegraph_Node_hasNode(node, parsegraph_UPWARD) && !parsegraph_Node_hasNode(node, parsegraph_DOWNWARD)
            );

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            layoutAxis(node, bodySize, parsegraph_UPWARD, parsegraph_DOWNWARD, 1);
        }
        else {
            // Root-like, so just lay out both axes.
            layoutAxis(node, bodySize, parsegraph_UPWARD, parsegraph_DOWNWARD,
                !parsegraph_Node_hasNode(node, parsegraph_BACKWARD) && !parsegraph_Node_hasNode(node, parsegraph_FORWARD)
            );

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            layoutAxis(node, bodySize, parsegraph_BACKWARD, parsegraph_FORWARD, 1);
        }
    }
    else {
        // Layout based upon the axis preference.
        if(parsegraph_Node_canonicalLayoutPreference(node) == parsegraph_PREFER_PERPENDICULAR_AXIS) {
            // firstDirection and secondDirection, if not NULL_NODE_DIRECTION,
            // indicate a neighboring node in at least that direction.
            //int firstDirection
            //    = parsegraph_NULL_NODE_DIRECTION;
            //int secondDirection
            //    = parsegraph_NULL_NODE_DIRECTION;

            // firstAxis indicates the first-axis.
            int firstAxis =
                parsegraph_getPerpendicularAxis(parsegraph_Node_parentDirection(node));

            // Check for nodes perpendicular to parent's direction
            //parsegraph_Node_hasNodes(node, int axis, int* hasNegative, int* hasPositive)
            int hasFirstAxisNodes[2];
            parsegraph_Node_hasNodes(node, firstAxis, hasFirstAxisNodes, hasFirstAxisNodes + 1);
            int oppositeFromParent =
                parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node));
            layoutAxis(
                node, bodySize,
                hasFirstAxisNodes[0],
                hasFirstAxisNodes[1],
                0
            );

            // Layout this node's second-axis child, if that child exists.
            if(parsegraph_Node_hasNode(node, oppositeFromParent)) {
                // Layout the second-axis child.
                layoutSingle(node, bodySize, oppositeFromParent, 1);
            }
        }
        else {
            // Layout this node's second-axis child, if that child exists.
            int oppositeFromParent =
                parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node));

            // firstDirection and secondDirection, if not NULL_NODE_DIRECTION,
            // indicate a neighboring node in at least that direction.
            int firstDirection
                = parsegraph_NULL_NODE_DIRECTION;
            int secondDirection
                = parsegraph_NULL_NODE_DIRECTION;

            // Check for nodes perpendicular to parent's direction
            int perpendicularNodes[2];
            parsegraph_Node_hasNodes(node,
                parsegraph_getPerpendicularAxis(parsegraph_Node_parentDirection(node)),
                perpendicularNodes, perpendicularNodes + 1
            );

            if(parsegraph_Node_hasNode(node, oppositeFromParent)) {
                // Layout the second-axis child.
                layoutSingle(
                    node, bodySize,
                    oppositeFromParent,
                    firstDirection != parsegraph_NULL_NODE_DIRECTION ||
                    secondDirection != parsegraph_NULL_NODE_DIRECTION
                );
            }

            layoutAxis(node, bodySize, perpendicularNodes[0], perpendicularNodes[1], 1);
        }
    }

    // Set our extents, combined with non-point neighbors.
    parsegraph_forEachCardinalNodeDirection(addLineBounds, node);

    if(parsegraph_Node_hasNode(node, parsegraph_INWARD)) {
        parsegraph_Node* nestedNode = parsegraph_Node_nodeAt(node, parsegraph_INWARD);
        float nestedSize[2];
        parsegraph_Node_extentSize(nestedNode, nestedSize);
        if(
            parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL
            && parsegraph_Node_scale(nestedNode) * nestedSize[0] <
            bodySize[0] - 2 * (parsegraph_Node_horizontalPadding(node) + parsegraph_Node_borderThickness(node))
        ) {
            parsegraph_Node_setPosAt(node, parsegraph_INWARD,
                parsegraph_Node_scale(nestedNode) * (
                    parsegraph_Node_extentOffsetAt(nestedNode, parsegraph_DOWNWARD)
                    - nestedSize[0] / 2
                ),
                bodySize[1] / 2
                - parsegraph_Node_verticalPadding(node)
                - parsegraph_Node_borderThickness(node)
                + parsegraph_Node_scale(nestedNode) * (
                    - nestedSize[1]
                    + parsegraph_Node_extentOffsetAt(nestedNode, parsegraph_FORWARD)
                )
            );
        }
        else if(
            parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_HORIZONTAL
            && parsegraph_Node_scale(nestedNode) * nestedSize[1] <
            bodySize[1] - 2 * (parsegraph_Node_verticalPadding(node) + parsegraph_Node_borderThickness(node))
        ) {
            parsegraph_Node_setPosAt(node, parsegraph_INWARD,
                bodySize[0] / 2
                - parsegraph_Node_horizontalPadding(node)
                - parsegraph_Node_borderThickness(node)
                + parsegraph_Node_scale(nestedNode) * (
                    - nestedSize[0]
                    + parsegraph_Node_extentOffsetAt(nestedNode,
                        parsegraph_DOWNWARD
                    )
                ),
                parsegraph_Node_scale(nestedNode) * (
                    parsegraph_Node_extentOffsetAt(nestedNode, parsegraph_FORWARD)
                    - nestedSize[1] / 2
                )
            );
        }
        else {
            parsegraph_Node_setPosAt(node, parsegraph_INWARD,
                bodySize[0] / 2
                - parsegraph_Node_horizontalPadding(node)
                - parsegraph_Node_borderThickness(node)
                + parsegraph_Node_scale(nestedNode) * (
                    - nestedSize[0]
                    + parsegraph_Node_extentOffsetAt(nestedNode,
                        parsegraph_DOWNWARD
                    )
                ),
                bodySize[1] / 2
                - parsegraph_Node_verticalPadding(node)
                - parsegraph_Node_borderThickness(node)
                + parsegraph_Node_scale(nestedNode) * (
                    - nestedSize[1]
                    + parsegraph_Node_extentOffsetAt(nestedNode,
                        parsegraph_FORWARD
                    )
                )
            );
        }
    }

    node->_layoutState = parsegraph_COMMITTED_LAYOUT;

    // Needed a commit, so return true.
    return 1;
}

/**
 * Returns the total distance from the given node, to the furthest node
 * found in the given direction.
 *
 * The result is in node-space; the scale of child nodes is applied.
 */
float parsegraph_findConsecutiveLength(parsegraph_Node* node, int inDirection)
{
    // Exclude some directions that cannot be calculated.
    if(!parsegraph_isCardinalDirection(inDirection)) {
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }

    int directionAxis = parsegraph_getNodeDirectionAxis(inDirection);
    if(directionAxis == parsegraph_NULL_AXIS) {
        // This should be impossible.
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }

    // Calculate the length, starting from the center of this node.
    float total = 0;
    float scale = 1.0;

    // Iterate in the given direction.
    if(parsegraph_Node_hasNode(node, inDirection)) {
        total += parsegraph_Node_separationAt(node, inDirection);

        scale *= parsegraph_Node_scaleAt(node, inDirection);
        parsegraph_Node* thisNode = parsegraph_Node_nodeAt(node, inDirection);
        parsegraph_Node* nextNode = parsegraph_Node_nodeAt(thisNode, inDirection);
        while(nextNode != 0) {
            total += parsegraph_Node_separationAt(thisNode, inDirection) * scale;
            scale *= parsegraph_Node_scaleAt(thisNode, inDirection);

            thisNode = nextNode;
            nextNode = parsegraph_Node_nodeAt(nextNode, inDirection);
        }
    }

    return total;
}

int parsegraph_Node_continueCommitLayout(parsegraph_CommitLayoutTraversal* cl)
{
    struct timespec t;
    if(cl->timeout > 0) {
        clock_gettime(CLOCK_REALTIME, &t);
    }
    float bodySize[2];
    parsegraph_Node* node = cl->node;
    for(;;) {
        node = node->_worldPrev;
        //parsegraph_log("Committing layout for node %d\n", node->_id);
        if(node->_layoutState == parsegraph_NEEDS_COMMIT) {
            parsegraph_Node_commitLayout(node, bodySize);
        }
        if(cl->timeout > 0) {
            struct timespec now;
            clock_gettime(CLOCK_REALTIME, &now);
            if(parsegraph_timediffMs(&now, &t) > cl->timeout) {
                cl->node = node;
                return 1;
            }
        }
        if(node == cl->root) {
            // Terminal condition reached.
            return 0;
        }
    }
    parsegraph_die("Unreachable");
}

int parsegraph_Node_commitLayoutIteratively(parsegraph_Node* node, parsegraph_CommitLayoutTraversal* cl)
{
    // Avoid needless work if possible.
    if(node->_layoutState == parsegraph_COMMITTED_LAYOUT) {
        return 0;
    }

    // Reset the traversal.
    cl->root = node;
    cl->node = node;

    // Traverse the graph depth-first, committing each node's layout in turn.
    return parsegraph_Node_continueCommitLayout(cl);
}

/**
 * Returns the separation between this node and the node
 * in the given direction.
 *
 * Throws NO_NODE_FOUND if no node is in the given direction.
 *
 * @see #commitLayout()
 */
float parsegraph_Node_separationAt(parsegraph_Node* node, int inDirection)
{
    // Exclude some directions that cannot be calculated.
    if(!parsegraph_isCardinalDirection(inDirection)) {
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }

    // If the given direction is the parent's direction, use
    // their measurement instead.
    if(!parsegraph_Node_isRoot(node) && inDirection == parsegraph_Node_parentDirection(node)) {
        return parsegraph_Node_separationAt(
            parsegraph_Node_nodeParent(node),
            parsegraph_reverseNodeDirection(inDirection)
        );
    }

    if(!parsegraph_Node_hasNode(node, inDirection)) {
        parsegraph_abort(parsegraph_NO_NODE_FOUND);
    }

    return node->_neighbors[inDirection].separation;
};

// Notifies children that may need to move due to this layout change.
static void notifyChild(parsegraph_Node* node, int direction) {
    // Don't recurse into the parent direction.
    if(!parsegraph_Node_isRoot(node) && direction == parsegraph_Node_parentDirection(node)) {
        return;
    }

    // Ignore empty node directions.
    if(!parsegraph_Node_hasNode(node, direction)) {
        return;
    }

    // Recurse the layout change to the affected node.
    parsegraph_Node_positionWasChanged(
        parsegraph_Node_nodeAt(node, direction)
    );
}

/**
 * Indicate that the layout was changed and thus needs an layout commit.
 */
void parsegraph_Node_layoutWasChanged(parsegraph_Node* node, int changeDirection)
{
    // Disallow null change directions.
    if(changeDirection == parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_log("Change direction cannot be null.\n");
        return;
    }

    while(node) {
        int oldLayoutState = node->_layoutState;

        // Set the needs layout flag.
        node->_layoutState = parsegraph_NEEDS_COMMIT;

        parsegraph_PaintGroup* pg = parsegraph_Node_findPaintGroup(node);
        if(pg) {
            parsegraph_PaintGroup_markDirty(pg);
        }

        // Recurse for the children of this node.
        notifyChild(node, parsegraph_DOWNWARD);
        notifyChild(node, parsegraph_UPWARD);
        notifyChild(node, parsegraph_BACKWARD);
        notifyChild(node, parsegraph_FORWARD);
        notifyChild(node, parsegraph_INWARD);

        if(parsegraph_Node_isRoot(node)) {
            break;
        }
        else if(oldLayoutState == parsegraph_COMMITTED_LAYOUT) {
            // Notify our parent, if we were previously committed.
            node = parsegraph_Node_nodeParent(node);
            changeDirection = parsegraph_reverseNodeDirection(
                parsegraph_Node_parentDirection(node)
            );
        }
        else {
            // Completed.
            break;
        }
    }
}

int parsegraph_Node_canonicalLayoutPreference(parsegraph_Node* node)
{
    // Root nodes do not have a canonical layout preference.
    if(parsegraph_Node_isRoot(node)) {
        parsegraph_abort(parsegraph_NODE_IS_ROOT);
    }

    // Convert the layout preference to either preferring the parent or
    // the perpendicular axis.
    int canonicalPref = node->_layoutPreference;
    switch(node->_layoutPreference) {
    case parsegraph_PREFER_HORIZONTAL_AXIS:
    {
        if(
            parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(node)) ==
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
            parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(node)) ==
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
        canonicalPref = node->_layoutPreference;
        break;
    case parsegraph_NULL_LAYOUT_PREFERENCE:
        parsegraph_abort(parsegraph_BAD_LAYOUT_PREFERENCE);
    }
    return canonicalPref;
};

parsegraph_Node* parsegraph_labeledBud(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(pool, parsegraph_BUD, 0, 0);
    parsegraph_Node_setLabel(node, label, len, glyphAtlas);
    return node;
}

parsegraph_Node* parsegraph_labeledSlot(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(pool, parsegraph_SLOT, 0, 0);
    parsegraph_Node_setLabel(node, label, len, glyphAtlas);
    return node;
}

parsegraph_Node* parsegraph_labeledBlock(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_Node* node = parsegraph_Node_new(pool, parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setLabel(node, label, len, glyphAtlas);
    return node;
}
