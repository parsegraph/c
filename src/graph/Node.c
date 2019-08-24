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
#include "Graph.h"
#include <stdlib.h>
#include <stdarg.h>
#include "../die.h"
#include "../timing.h"
#include "../parsegraph_math.h"
#include "Label.h"
#include "Camera.h"
#include "Rect.h"
#include <apr_strings.h>
#include "NodePainter.h"

extern int parsegraph_NODES_PAINTED;

int parsegraph_Node_COUNT = 0;

parsegraph_ExtendedNode* parsegraph_ExtendedNode_new(apr_pool_t* pool)
{
    parsegraph_ExtendedNode* extended;
    extended = apr_palloc(pool, sizeof(*extended));
    extended->ignoresMouse = 1;
    extended->keyListener = 0;
    extended->keyListenerThisArg = 0;
    extended->clickListener = 0;
    extended->clickListenerThisArg = 0;
    extended->changeListener = 0;
    extended->changeListenerThisArg = 0;
    extended->prevTabNode = 0;
    extended->nextTabNode = 0;
    extended->value = 0;
    extended->selected = 0;
    extended->isPaintGroup = 0;
    extended->dirty = 0;
    extended->painter = 0;
    extended->previousPaintState = 0;
    extended->scene = 0;
    return extended;
}

parsegraph_NeighborData* parsegraph_NeighborData_new(parsegraph_Node* node, int inDirection)
{
    parsegraph_NeighborData* neighbor;
    neighbor = apr_palloc(node->pool, sizeof(*neighbor));
    neighbor->owner = node;
    neighbor->direction = inDirection;
    neighbor->alignmentOffset = 0;
    neighbor->hasPos = 0;
    neighbor->separation = 0;
    neighbor->lineLength = 0;
    neighbor->xPos = 0;
    neighbor->yPos = 0;
    neighbor->alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    return neighbor;
}

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
    node->_string = 0;

    //parsegraph_log("NEW node %d\n", node->_id);

    // Appearance
    node->_id = parsegraph_Node_COUNT++;
    node->_type = newType;
    node->_style = parsegraph_style(node->_type);
    node->_rightToLeft = parsegraph_RIGHT_TO_LEFT;
    node->_scale = 1.0;

    // Layout
    for(int i = 0; i < 4; ++i) {
        node->_extents[i] = parsegraph_Extent_new(node->pool);
    }
    for(int i = 0; i < 6; ++i) {
        node->_neighbors[i] = 0;
    }
    node->_parentNeighbor = 0;

    node->_nodeFit = parsegraph_NODE_FIT_LOOSE;
    node->_layoutState = parsegraph_NEEDS_COMMIT;
    node->_absoluteVersion = 0;
    node->_absoluteDirty = 1;
    node->_absoluteXPos = NAN;
    node->_absoluteYPos = NAN;
    node->_absoluteScale = NAN;
    node->_hasGroupPos = 0;
    node->_groupXPos = NAN;
    node->_groupYPos = NAN;
    node->_groupScale = NAN;
    node->_layoutPrev = node;
    node->_layoutNext = node;

    // Paint groups.
    node->_currentPaintGroup = 0;
    node->_paintGroupPrev = node;
    node->_paintGroupNext = node;

    // Internal data.
    node->_extended = 0;
    node->_label = 0;

    parsegraph_Color_SetRGBA(node->_brightnessColor, 0, 0, 0, 0);

    // Check if a parent node was provided.
    if(fromNode != 0) {
        // A parent node was provided; this node is a child.
        parsegraph_Node_connectNode(fromNode, parentDirection, node);
        node->_layoutPreference = parsegraph_PREFER_PERPENDICULAR_AXIS;
    }
    else {
        // No parent was provided; this node is a root.
        node->_layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
    }

    return node;
}

void parsegraph_Node_ref(parsegraph_Node* n)
{
    //parsegraph_log("REF node %d\n", n->_id);
    ++n->refcount;
}

void parsegraph_Node_unref(parsegraph_Node* node)
{
    //parsegraph_log("UNREF node %d\n", node->_id);
    if(--node->refcount > 0) {
        return;
    }

    if(!parsegraph_Node_isRoot(node)) {
        parsegraph_Node_disconnectNode(node, parsegraph_NULL_NODE_DIRECTION);
    }

    // Clear the value.
    parsegraph_Node_setValue(node, 0, 0, 0, 0);

    if(node->_label) {
        parsegraph_Label_destroy(node->_label);
    }

    for(int i = 0; i < 4; ++i) {
        parsegraph_Extent_destroy(node->_extents[i]);
    }

    for(int direction = 0; direction < parsegraph_NUM_DIRECTIONS; ++direction) {
        parsegraph_NeighborData* neighbor = node->_neighbors[direction];
        if(neighbor) {
            parsegraph_Node_unref(neighbor->node);
        }
    }
    if(!node->pool) {
        free(node);
    }
}

void parsegraph_chainTab(parsegraph_Node* a, parsegraph_Node* b, parsegraph_Node** swappedOut)
{
    parsegraph_Node_ensureExtended(a);
    parsegraph_Node_ensureExtended(b);
    if(swappedOut) {
        swappedOut[0] = a ? a->_extended->nextTabNode : 0;
        swappedOut[1] = b ? b->_extended->prevTabNode : 0;
    }
    if(a) {
        a->_extended->nextTabNode = b;
    }
    if(b) {
        b->_extended->prevTabNode = a;
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

parsegraph_NeighborData* parsegraph_Node_neighborAt(parsegraph_Node* node, int inDirection)
{
    return node->_neighbors[inDirection];
}

parsegraph_NeighborData* parsegraph_Node_ensureNeighbor(parsegraph_Node* node, int inDirection)
{
    if(!parsegraph_Node_neighborAt(node, inDirection)) {
        node->_neighbors[inDirection] = parsegraph_NeighborData_new(node, inDirection);
    }
    return parsegraph_Node_neighborAt(node, inDirection);
}

parsegraph_Node* parsegraph_Node_root(parsegraph_Node* node)
{
    parsegraph_Node* p = node;
    while(!parsegraph_Node_isRoot(p)) {
        p = parsegraph_Node_parentNode(p);
    }
    return p;
}

const char* parsegraph_Node_toString(parsegraph_Node* node)
{
    if(!node->_string) {
        node->_string = apr_psprintf(node->pool, "[parsegraph_Node %d]", node->_id);
    }
    return node->_string;
}

float parsegraph_Node_x(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return 0;
    }
    return node->_parentNeighbor->xPos;
}

float parsegraph_Node_y(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return 0;
    }
    return node->_parentNeighbor->yPos;
}

int parsegraph_Node_hasPos(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return 1;
    }
    return node->_parentNeighbor->hasPos;
}

float parsegraph_Node_scale(parsegraph_Node* node)
{
    return node->_scale;
}

void parsegraph_Node_setScale(parsegraph_Node* node, float scale)
{
    //parsegraph_log("Scale set to %f\n", scale);
    node->_scale = scale;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

void parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val)
{
    node->_rightToLeft = !!val;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

float parsegraph_Node_rightToLeft(parsegraph_Node* node)
{
    return node->_rightToLeft;
}

void parsegraph_Node_commitAbsolutePos(parsegraph_Node* nodeRoot)
{
    if(!nodeRoot->_absoluteDirty && (!parsegraph_Node_isRoot(nodeRoot)
        && nodeRoot->_absoluteVersion == parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(nodeRoot))->_absoluteVersion
    )) {
        //parsegraph_log("This node does not need an absolute version update, so just return.");
        return;
    }
    nodeRoot->_absoluteXPos = 0;
    nodeRoot->_absoluteYPos = 0;
    nodeRoot->_absoluteScale = 0;

    // Retrieve a stack of nodes to determine the absolute position.
    parsegraph_Node* node = nodeRoot;
    apr_pool_t* cpool;
    apr_pool_create(&cpool, 0);
    parsegraph_ArrayList* nodeList = parsegraph_ArrayList_new(cpool);
    float parentScale = 1.0;
    float scale = 1.0;
    int neededVersion = 0;
    if(!parsegraph_Node_isRoot(nodeRoot)) {
        neededVersion = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(nodeRoot))->_absoluteVersion;
    }
    for(;;) {
        if(parsegraph_Node_isRoot(node)) {
            nodeRoot->_absoluteXPos = 0;
            nodeRoot->_absoluteYPos = 0;
            break;
        }

        parsegraph_Node* par = parsegraph_Node_nodeParent(node);
        if(!par->_absoluteDirty && par->_absoluteVersion == neededVersion) {
            nodeRoot->_absoluteXPos = par->_absoluteXPos;
            nodeRoot->_absoluteYPos = par->_absoluteYPos;
            scale = par->_absoluteScale * parsegraph_Node_scale(node);
            parentScale = par->_absoluteScale;
            break;
        }

        parsegraph_ArrayList_push(nodeList,
            (void*)(long)parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node))
        );
        node = parsegraph_Node_nodeParent(node);
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromRoot];
    for(int i = parsegraph_ArrayList_length(nodeList) - 1; i >= 0; --i) {
        int directionToChild = (long)parsegraph_ArrayList_at(nodeList, i);

        nodeRoot->_absoluteXPos += parsegraph_Node_x(node) * parentScale;
        nodeRoot->_absoluteYPos += parsegraph_Node_y(node) * parentScale;

        parentScale = scale;
        scale *= parsegraph_Node_scaleAt(node, directionToChild);
        if(node->_absoluteDirty) {
            node->_absoluteXPos = nodeRoot->_absoluteXPos;
            node->_absoluteYPos = nodeRoot->_absoluteYPos;
            node->_absoluteScale = scale;
            node->_absoluteDirty = 0;
            if(!parsegraph_Node_isRoot(node)) {
                node->_absoluteVersion = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node))->_absoluteVersion;
            }
        }
        node = parsegraph_Node_nodeAt(node, directionToChild);
    }

    nodeRoot->_absoluteXPos += parsegraph_Node_x(node) * parentScale;
    nodeRoot->_absoluteYPos += parsegraph_Node_y(node) * parentScale;
    nodeRoot->_absoluteScale = scale;
    nodeRoot->_absoluteDirty = 0;

    if(!parsegraph_Node_isRoot(nodeRoot)) {
        nodeRoot->_absoluteVersion = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(nodeRoot))->_absoluteVersion;
    }

    parsegraph_ArrayList_destroy(nodeList);
    apr_pool_destroy(cpool);
}

int parsegraph_Node_needsCommit(parsegraph_Node* node)
{
    return node->_layoutState == parsegraph_NEEDS_COMMIT;
}

int parsegraph_Node_needsPosition(parsegraph_Node* node)
{
    return parsegraph_Node_needsCommit(node) || !node->_hasGroupPos;
}

float parsegraph_Node_absoluteX(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteXPos;
}

float parsegraph_Node_absoluteY(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteYPos;
}

float parsegraph_Node_absoluteScale(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    parsegraph_Node_commitAbsolutePos(node);
    return node->_absoluteScale;
}

void parsegraph_Node_commitGroupPos(parsegraph_Node* nodeRoot)
{
    if(nodeRoot->_hasGroupPos) {
        return;
    }
    nodeRoot->_hasGroupPos = 1;

    // Retrieve a stack of nodes to determine the group position.
    parsegraph_Node* node = nodeRoot;
    apr_pool_t* cpool;
    apr_pool_create(&cpool, 0);
    parsegraph_ArrayList* nodeList = parsegraph_ArrayList_new(cpool);
    float parentScale = 1.0;
    float scale = 1.0;
    for(;;) {
        if(parsegraph_Node_isRoot(node) || parsegraph_Node_localPaintGroup(node)) {
            nodeRoot->_groupXPos = 0;
            nodeRoot->_groupYPos = 0;
            break;
        }

        parsegraph_Node* par = parsegraph_Node_nodeParent(node);
        if(par->_hasGroupPos) {
            nodeRoot->_groupXPos = par->_groupXPos;
            nodeRoot->_groupYPos = par->_groupYPos;
            scale = par->_groupScale * parsegraph_Node_scale(node);
            parentScale = par->_groupScale;
            break;
        }

        parsegraph_ArrayList_push(nodeList, (void*)(long)parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node)));
        node = parsegraph_Node_nodeParent(node);
    }

    // nodeList contains [directionToThis, directionToParent, ..., directionFromGroupParent];
    for(int i = parsegraph_ArrayList_length(nodeList) - 1; i >= 0; --i) {
        int directionToChild = (int)(long)parsegraph_ArrayList_at(nodeList, i);

        if(i != parsegraph_ArrayList_length(nodeList) - 1) {
            nodeRoot->_groupXPos += parsegraph_Node_x(node) * parentScale;
            nodeRoot->_groupYPos += parsegraph_Node_y(node) * parentScale;
        }

        parentScale = scale;
        scale *= parsegraph_Node_scaleAt(node, directionToChild);
        node = parsegraph_Node_nodeAt(node, directionToChild);
    }
    //parsegraph_log("Assigning scale for %s to %f", parsegraph_Node_toString(nodeRoot), scale);
    nodeRoot->_groupScale = scale;

    if(!parsegraph_Node_localPaintGroup(nodeRoot)) {
        nodeRoot->_groupXPos += parsegraph_Node_x(node) * parentScale;
        nodeRoot->_groupYPos += parsegraph_Node_y(node) * parentScale;
    }
}

float parsegraph_Node_groupX(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    return node->_groupXPos;
}

float parsegraph_Node_groupY(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    return node->_groupYPos;
}

float parsegraph_Node_groupScale(parsegraph_Node* node)
{
    if(parsegraph_Node_needsPosition(parsegraph_Node_findPaintGroup(node))) {
        parsegraph_Node_commitLayoutIteratively(node, 0);
    }
    return node->_groupScale;
}

void parsegraph_Node_setPosAt(parsegraph_Node* node, int inDirection, float x, float y)
{
    parsegraph_NeighborData* neighbor = parsegraph_Node_ensureNeighbor(node, inDirection);
    neighbor->hasPos = 1;
    neighbor->xPos = x;
    neighbor->yPos = y;
}

void parsegraph_Node_removeFromLayout(parsegraph_Node* node, int inDirection)
{
    parsegraph_Node* disconnected = parsegraph_Node_nodeAt(node, inDirection);
    if(!disconnected) {
        return;
    }
    parsegraph_Node* layoutBefore = parsegraph_Node_findEarlierLayoutSibling(node, inDirection);
    parsegraph_Node* earliestDisc = parsegraph_Node_findLayoutHead(disconnected, disconnected);

    if(layoutBefore) {
        parsegraph_connectLayout(layoutBefore, disconnected->_layoutNext);
    }
    else {
        parsegraph_connectLayout(earliestDisc->_layoutPrev, disconnected->_layoutNext);
    }
    parsegraph_connectLayout(disconnected, earliestDisc);
}

void parsegraph_Node_insertIntoLayout(parsegraph_Node* node, int inDirection)
{
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, inDirection);
    if(!child) {
        return;
    }

    parsegraph_Node* nodeHead = parsegraph_Node_findLayoutHead(child, 0);
    parsegraph_Node* layoutAfter = parsegraph_Node_findLaterLayoutSibling(node, inDirection);
    parsegraph_Node* layoutBefore = parsegraph_Node_findEarlierLayoutSibling(node, inDirection);

    parsegraph_Node* nodeTail = child;

    if(layoutBefore) {
        parsegraph_connectLayout(layoutBefore, nodeHead);
    }
    else if(layoutAfter) {
        parsegraph_connectLayout(parsegraph_Node_findLayoutHead(layoutAfter, 0)->_layoutPrev, nodeHead);
    }
    else {
        parsegraph_connectLayout(node->_layoutPrev, nodeHead);
    }

    if(layoutAfter) {
        parsegraph_connectLayout(nodeTail, parsegraph_Node_findLayoutHead(layoutAfter, 0));
    }
    else {
        parsegraph_connectLayout(nodeTail, node);
    }
}

void parsegraph_connectPaintGroup(parsegraph_Node* a, parsegraph_Node* b)
{
    a->_paintGroupNext = b;
    b->_paintGroupPrev = a;
    //parsegraph_log("Connecting paint groups %s to %s", parsegraph_Node_toString(a), parsegraph_Node_toString(b));
}

void parsegraph_Node_setPaintGroup(parsegraph_Node* node, int paintGroup)
{
    if(parsegraph_Node_localPaintGroup(node) == paintGroup) {
        return;
    }
    parsegraph_Node_ensureExtended(node);

    if(paintGroup) {
        //parsegraph_log("%s is becoming a paint group.", parsegraph_Node_toString(node));
        node->_extended->isPaintGroup = 1;

        if(parsegraph_Node_isRoot(node)) {
            // Do nothing; this node was already an implied paint group.
        }
        else {
            parsegraph_Node_removeFromLayout(
                parsegraph_Node_parentNode(node),
                parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node))
            );
            parsegraph_Node* paintGroupFirst = parsegraph_Node_findFirstPaintGroup(node);
            //parsegraph_log("First paint group of %s is %s", parsegraph_Node_toString(node), parsegraph_Node_toString(paintGroupFirst));
            parsegraph_Node* parentsPaintGroup = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node));
            //parsegraph_log("Parent paint group of %s is %s", parsegraph_Node_toString(node), parsegraph_Node_toString(parentsPaintGroup));
            parsegraph_connectPaintGroup(parentsPaintGroup->_paintGroupPrev, paintGroupFirst);
            parsegraph_connectPaintGroup(node, parentsPaintGroup);
        }

        parsegraph_Node_layoutChanged(node, parsegraph_INWARD);
        for(parsegraph_Node* n = node->_layoutNext; n != node; n = n->_layoutNext) {
            n->_currentPaintGroup = node;
        }
        return;
    }

    node->_extended->isPaintGroup = 0;

    //parsegraph_log("%s is no longer a paint group.", parsegraph_Node_toString(node));

    if(!parsegraph_Node_isRoot(node)) {
        parsegraph_Node* paintGroupLast = parsegraph_Node_findLastPaintGroup(node);
        parsegraph_Node_insertIntoLayout(
            parsegraph_Node_parentNode(node),
            parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(node))
        );
        // Remove the paint group's entry in the parent.
        //parsegraph_log("Node %s is not a root, so adding paint groups.", parsegraph_Node_toString(node));
        if(paintGroupLast != node) {
            parsegraph_connectPaintGroup(paintGroupLast, node->_paintGroupNext);
        }
        else {
            parsegraph_connectPaintGroup(node->_paintGroupPrev, node->_paintGroupNext);
        }
        node->_paintGroupNext = node;
        node->_paintGroupPrev = node;

        parsegraph_Node* pg = parsegraph_Node_findPaintGroup(parsegraph_Node_parentNode(node));
        for(parsegraph_Node* n = pg->_layoutNext; n != pg; n = n->_layoutNext) {
            n->_currentPaintGroup = pg;
        }
    }
    else {
        // Retain the paint groups for this implied paint group.
    }

    parsegraph_Node_layoutChanged(node, parsegraph_INWARD);
}

parsegraph_Node* parsegraph_Node_findFirstPaintGroup(parsegraph_Node* node)
{
    parsegraph_Node* candidate = node->_layoutNext;
    while(candidate != node) {
        if(parsegraph_Node_localPaintGroup(candidate)) {
            break;
        }
        candidate = candidate->_layoutNext;
    }
    return candidate;
}

parsegraph_Node* parsegraph_Node_findLastPaintGroup(parsegraph_Node* node)
{
    parsegraph_Node* candidate = node->_layoutPrev;
    while(candidate != node) {
        if(parsegraph_Node_localPaintGroup(candidate)) {
            break;
        }
        candidate = candidate->_layoutPrev;
    }
    return candidate;
}

parsegraph_ExtendedNode* parsegraph_Node_ensureExtended(parsegraph_Node* node)
{
    if(!node->_extended) {
        //parsegraph_log("Extending %s", parsegraph_Node_toString(node));
        node->_extended = parsegraph_ExtendedNode_new(node->pool);
    }
    return node->_extended;
}

parsegraph_PaintState* parsegraph_PaintState_new(apr_pool_t* pool)
{
    parsegraph_PaintState* ps;
    ps = apr_palloc(pool, sizeof(*ps));
    ps->commitInProgress = 0;
    ps->paintGroup = 0;
    return ps;
}

void parsegraph_Node_markDirty(parsegraph_Node* node)
{
    //parsegraph_log("%s marked dirty", parsegraph_Node_toString(node));
    parsegraph_ExtendedNode* extended = parsegraph_Node_ensureExtended(node);
    extended->dirty = 1;
    if(!extended->previousPaintState) {
        extended->previousPaintState = parsegraph_PaintState_new(node->pool);
    }
    else {
        extended->previousPaintState->commitInProgress = 0;
        extended->previousPaintState->paintGroup = 0;
    }
}

int parsegraph_Node_isDirty(parsegraph_Node* node)
{
    return node->_extended ? node->_extended->dirty : 0;
}

parsegraph_NodePainter* parsegraph_Node_painter(parsegraph_Node* node)
{
    return parsegraph_Node_ensureExtended(node)->painter;
}

parsegraph_Node* parsegraph_Node_findPaintGroup(parsegraph_Node* nodeRoot)
{
    if(!nodeRoot->_currentPaintGroup) {
        parsegraph_Node* node = nodeRoot;
        while(!parsegraph_Node_isRoot(node)) {
            if(parsegraph_Node_localPaintGroup(node)) {
                break;
            }
            if(node->_currentPaintGroup) {
                nodeRoot->_currentPaintGroup = node->_currentPaintGroup;
                return nodeRoot->_currentPaintGroup;
            }
            node = parsegraph_Node_parentNode(node);
        }
        nodeRoot->_currentPaintGroup = node;
    }
    else {
        //parsegraph_log("Returning cached paint group %s for node %s", parsegraph_Node_toString(node->_currentPaintGroup), parsegraph_Node_toString(nodeRoot));
    }
    return nodeRoot->_currentPaintGroup;
}

int parsegraph_Node_localPaintGroup(parsegraph_Node* node)
{
    return node->_extended ? node->_extended->isPaintGroup : 0;
}

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

void parsegraph_Node_setClickListener(parsegraph_Node* node, int(*listener)(parsegraph_Node*, const char*, void*), void* thisArg)
{
    if(!listener) {
        if(node->_extended) {
            node->_extended->clickListener = 0;
            node->_extended->clickListenerThisArg = 0;
        }
        return;
    }
    if(!thisArg) {
        thisArg = node;
    }
    parsegraph_ExtendedNode* extended = parsegraph_Node_ensureExtended(node);
    extended->clickListener = listener;
    extended->clickListenerThisArg = thisArg;
    //parsegraph_log("Set click listener for node %d.\n", node->_id);
}

void parsegraph_Node_setChangeListener(parsegraph_Node* node, void(*listener)(void*, parsegraph_Node*), void* thisArg)
{
    if(!listener) {
        if(node->_extended) {
            node->_extended->changeListener = 0;
            node->_extended->changeListenerThisArg = 0;
        }
        return;
    }
    if(!thisArg) {
        thisArg = node;
    }
    parsegraph_ExtendedNode* extended = parsegraph_Node_ensureExtended(node);
    extended->changeListener = listener;
    extended->changeListenerThisArg = thisArg;
    //parsegraph_log("Set change listener for node %d.\n", node->_id);
}

int parsegraph_Node_isClickable(parsegraph_Node* node)
{
    int hasLabel = node->_label != 0 && !isnan(node->_label->_x) && parsegraph_Label_editable(node->_label);
    return parsegraph_Node_type(node) == parsegraph_SLIDER || (parsegraph_Node_hasClickListener(node) || !parsegraph_Node_ignoresMouse(node)) || hasLabel;
}

void parsegraph_Node_setIgnoreMouse(parsegraph_Node* node, int value)
{
    if(!value && node->_extended) {
        return;
    }
    parsegraph_Node_ensureExtended(node)->ignoresMouse = value;
}

int parsegraph_Node_ignoresMouse(parsegraph_Node* node)
{
    if(!node->_extended) {
        return 1;
    }
    return node->_extended->ignoresMouse;
}

int parsegraph_Node_hasClickListener(parsegraph_Node* node)
{
    return node->_extended && node->_extended->clickListener;
}

int parsegraph_Node_hasChangeListener(parsegraph_Node* node)
{
    return node->_extended && node->_extended->changeListener;
}

void parsegraph_Node_valueChanged(parsegraph_Node* node)
{
    // Invoke the listener.
    if(!parsegraph_Node_hasChangeListener(node)) {
        return;
    }
    node->_extended->changeListener(node->_extended->changeListenerThisArg, node);
}

int parsegraph_Node_click(parsegraph_Node* node, const char* button)
{
    //parsegraph_log("Node was clicked!\n");
    // Invoke the click listener.
    if(!parsegraph_Node_hasClickListener(node)) {
        return 0;
    }
    return node->_extended->clickListener(node, button, node->_extended->clickListenerThisArg);
}

void parsegraph_Node_setKeyListener(parsegraph_Node* node, int(*listener)(parsegraph_Node*, const char*, void*), void* thisArg)
{
    if(!listener) {
        if(node->_extended) {
            node->_extended->keyListener = 0;
            node->_extended->keyListenerThisArg = 0;
        }
        return;
    }
    if(!thisArg) {
        thisArg = node;
    }
    parsegraph_ExtendedNode* extended = parsegraph_Node_ensureExtended(node);
    extended->keyListener = listener;
    extended->keyListenerThisArg = thisArg;
}

int parsegraph_Node_hasKeyListener(parsegraph_Node* node)
{
    return node->_extended && node->_extended->keyListener;
}

int parsegraph_Node_key(parsegraph_Node* node, const char* key)
{
    // Invoke the key listener.
    if(!parsegraph_Node_hasKeyListener(node)) {
        return 0;
    }
    return node->_extended->keyListener(node, key, node->_extended->keyListenerThisArg);
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
    return node->_parentNeighbor == 0;
}

int parsegraph_Node_parentDirection(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        return parsegraph_NULL_NODE_DIRECTION;
    }
    return parsegraph_reverseNodeDirection(node->_parentNeighbor->direction);
}

parsegraph_Node* parsegraph_Node_nodeParent(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        parsegraph_die("Node root does not have a root.\n");
    }
    return node->_parentNeighbor->owner;
}

parsegraph_Node* parsegraph_Node_parentNode(parsegraph_Node* node)
{
    return parsegraph_Node_nodeParent(node);
}

parsegraph_Node* parsegraph_Node_parent(parsegraph_Node* node)
{
    return parsegraph_Node_nodeParent(node);
}

int parsegraph_Node_hasNode(parsegraph_Node* node, int atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        return 0;
    }
    if(node->_neighbors[atDirection] && node->_neighbors[atDirection]->node) {
        return 1;
    }
    return parsegraph_Node_isRoot(node) && parsegraph_Node_parentDirection(node) == atDirection;
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

int parsegraph_Node_hasChild(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_hasChildAt(node, direction);
}

int parsegraph_Node_hasAnyNodes(parsegraph_Node* node)
{
    return parsegraph_Node_hasChildAt(node, parsegraph_DOWNWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_UPWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_FORWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_BACKWARD)
        || parsegraph_Node_hasChildAt(node, parsegraph_INWARD);
}

parsegraph_ArrayList* parsegraph_dumpPaintGroups(apr_pool_t* pool, parsegraph_Node* node)
{
    parsegraph_ArrayList* pgs = parsegraph_ArrayList_new(pool);
    parsegraph_Node* pg = node;
    do {
        pg = pg->_paintGroupNext;
        parsegraph_ArrayList_push(pgs, pg);
    } while(pg != node);
    return pgs;
}

parsegraph_Node* parsegraph_Node_nodeAt(parsegraph_Node* node, int atDirection)
{
    parsegraph_NeighborData* n = node->_neighbors[atDirection];
    if(!n) {
        if(node->_parentNeighbor && parsegraph_Node_parentDirection(node) == atDirection) {
            return node->_parentNeighbor->owner;
        }
        return 0;
    }
    return n->node;
}

parsegraph_Node* parsegraph_Node_spawnNode(parsegraph_Node* node, int spawnDirection, int newType)
{
    parsegraph_Node* created = parsegraph_Node_connectNode(node, spawnDirection, parsegraph_Node_new(node->pool, newType, 0, parsegraph_NULL_NODE_DIRECTION));
    parsegraph_Node_setLayoutPreference(created, parsegraph_PREFER_PERPENDICULAR_AXIS);

    // Use the node fitting of the parent.
    parsegraph_Node_setNodeFit(created, parsegraph_Node_nodeFit(node));

    return created;
}

void parsegraph_connectLayout(parsegraph_Node* a, parsegraph_Node* b)
{
    //parsegraph_log("connecting %s to %s", parsegraph_Node_toString(a), parsegraph_Node_toString(b));
    a->_layoutNext = b;
    b->_layoutPrev = a;
}

parsegraph_Node* parsegraph_Node_connectNode(parsegraph_Node* parentNode, int inDirection, parsegraph_Node* nodeToConnect)
{
    parsegraph_logEntercf("Node connections", "Connecting %s to %s in the %s direction.\n",
        parsegraph_Node_toString(nodeToConnect),
        parsegraph_Node_toString(parentNode),
        parsegraph_nameNodeDirection(inDirection)
    );
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
    parsegraph_NeighborData* neighbor = parsegraph_Node_ensureNeighbor(parentNode, inDirection);
    neighbor->node = nodeToConnect;
    parsegraph_Node_ref(nodeToConnect);
    parsegraph_Node_assignParent(nodeToConnect, parentNode, inDirection);

    // Allow alignments to be set before children are spawned.
    if(neighbor->alignmentMode == parsegraph_NULL_NODE_ALIGNMENT) {
        neighbor->alignmentMode = parsegraph_DO_NOT_ALIGN;
    }

    if(parsegraph_Node_localPaintGroup(nodeToConnect)) {
        parsegraph_Node* pg = parsegraph_Node_findPaintGroup(parentNode);
        parsegraph_Node* paintGroupLast = pg->_paintGroupPrev;
        parsegraph_Node* nodeFirst = nodeToConnect->_paintGroupNext;
        parsegraph_connectPaintGroup(paintGroupLast, nodeFirst);
        parsegraph_connectPaintGroup(nodeToConnect, pg);
    }
    else {
        parsegraph_Node_insertIntoLayout(parentNode, inDirection);
        if(nodeToConnect->_paintGroupNext != nodeToConnect) {
            //parsegraph_log("Adding this node's implicit child paintgroups to the parent");
            parsegraph_Node* pg = parsegraph_Node_findPaintGroup(parentNode);
            parsegraph_Node* paintGroupLast = pg->_paintGroupPrev;
            parsegraph_Node* nodeFirst = nodeToConnect->_paintGroupNext;
            parsegraph_Node* nodeLast = nodeToConnect->_paintGroupPrev;
            parsegraph_connectPaintGroup(paintGroupLast, nodeFirst);
            parsegraph_connectPaintGroup(nodeLast, pg);
            nodeToConnect->_paintGroupPrev = nodeToConnect;
            nodeToConnect->_paintGroupNext = nodeToConnect;
        }
    }

    parsegraph_Node_layoutWasChanged(parentNode, inDirection);
    parsegraph_logLeave();

    return nodeToConnect;
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
    parsegraph_NeighborData* neighbor = node->_neighbors[inDirection];
    parsegraph_Node* disconnected = neighbor->node;

    if(!parsegraph_Node_localPaintGroup(disconnected)) {
        parsegraph_Node_removeFromLayout(node, inDirection);
    }
    parsegraph_Node* paintGroupFirst = parsegraph_Node_findFirstPaintGroup(disconnected);
    parsegraph_connectPaintGroup(paintGroupFirst->_paintGroupPrev, disconnected->_paintGroupNext);
    parsegraph_connectPaintGroup(disconnected, paintGroupFirst);

    neighbor->node = 0;
    parsegraph_Node_assignParent(disconnected, 0, 0);

    if(disconnected->_layoutPreference == parsegraph_PREFER_PARENT_AXIS) {
        if(parsegraph_VERTICAL_AXIS == parsegraph_getNodeDirectionAxis(inDirection)) {
            disconnected->_layoutPreference = parsegraph_PREFER_VERTICAL_AXIS;
        }
        else {
            disconnected->_layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        }
    }
    else if(disconnected->_layoutPreference == parsegraph_PREFER_PERPENDICULAR_AXIS) {
        if(parsegraph_VERTICAL_AXIS == parsegraph_getNodeDirectionAxis(inDirection)) {
            disconnected->_layoutPreference = parsegraph_PREFER_HORIZONTAL_AXIS;
        }
        else {
            disconnected->_layoutPreference = parsegraph_PREFER_VERTICAL_AXIS;
        }
    }

    parsegraph_Node_layoutWasChanged(node, inDirection);

    return disconnected;
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

parsegraph_Node* parsegraph_Node_findEarlierLayoutSibling(parsegraph_Node* node, int inDirection)
{
    parsegraph_Node* layoutBefore = 0;
    int* dirs = parsegraph_Node_layoutOrder(node);
    int pastDir = 0;
    for(int i = parsegraph_LAYOUT_ORDER_MAX; i >= 0; --i) {
        int dir = dirs[i];
        if(dir == inDirection) {
            pastDir = 1;
            continue;
        }
        if(!pastDir) {
            continue;
        }
        if(dir == parsegraph_Node_parentDirection(node)) {
            continue;
        }
        if(parsegraph_Node_hasNode(node, dir)) {
            parsegraph_Node* candidate = parsegraph_Node_nodeAt(node, dir);
            if(candidate && !parsegraph_Node_localPaintGroup(candidate)) {
                layoutBefore = candidate;
                break;
            }
        }
    }
    return layoutBefore;
}

parsegraph_Node* parsegraph_Node_findLaterLayoutSibling(parsegraph_Node* node, int inDirection)
{
    parsegraph_Node* layoutAfter = 0;
    int* dirs = parsegraph_Node_layoutOrder(node);
    int pastDir = 0;
    for(int i = 0; i <= parsegraph_LAYOUT_ORDER_MAX; ++i) {
        int dir = dirs[i];
        //parsegraph_log("%s pastDir=%d\n", parsegraph_nameNodeDirection(dir), pastDir);
        if(dir == inDirection) {
            pastDir = 1;
            continue;
        }
        if(!pastDir) {
            continue;
        }
        if(dir == parsegraph_Node_parentDirection(node)) {
            continue;
        }
        if(parsegraph_Node_hasNode(node, dir)) {
            parsegraph_Node* candidate = parsegraph_Node_nodeAt(node, dir);
            if(candidate && !parsegraph_Node_localPaintGroup(candidate)) {
                layoutAfter = candidate;
                break;
            }
        }
    }
    return layoutAfter;
}

parsegraph_Node* parsegraph_Node_findLayoutHead(parsegraph_Node* node, parsegraph_Node* excludeThisNode)
{
    parsegraph_Node* deeplyLinked = node;
    int foundOne = 0;
    for(;;) {
        foundOne = 0;
        int* dirs = parsegraph_Node_layoutOrder(deeplyLinked);
        for(int i = 0; i <= parsegraph_LAYOUT_ORDER_MAX; ++i) {
            int dir = dirs[i];
            parsegraph_Node* candidate = parsegraph_Node_nodeAt(deeplyLinked, dir);
            if(candidate && candidate != excludeThisNode && parsegraph_Node_parentDirection(deeplyLinked) != dir && !parsegraph_Node_localPaintGroup(candidate)) {
                deeplyLinked = candidate;
                foundOne = 1;
                break;
            }
        }
        if(!foundOne) {
            break;
        }
    }
    return deeplyLinked;
}

void parsegraph_Node_eachChild(parsegraph_Node* node, void(*visitor)(void*, parsegraph_Node*, int), void* visitorThisArg)
{
    int* dirs = parsegraph_Node_layoutOrder(node);
    for(int i = 0; i < parsegraph_LAYOUT_ORDER_MAX; ++i) {
        int dir = dirs[i];
        if(!parsegraph_Node_isRoot(node) && dir == parsegraph_Node_parentDirection(node)) {
            continue;
        }
        parsegraph_Node* child = parsegraph_Node_nodeAt(node, dir);
        if(child) {
            visitor(visitorThisArg, child, dir);
        }
    }
}

float parsegraph_Node_scaleAt(parsegraph_Node* node, int direction)
{
    return parsegraph_Node_scale(parsegraph_Node_nodeAt(node, direction));
};

float parsegraph_Node_lineLengthAt(parsegraph_Node* node, int direction)
{
    if(!parsegraph_Node_hasNode(node, direction)) {
        return 0;
    }
    return node->_neighbors[direction]->lineLength;
};

parsegraph_Extent* parsegraph_Node_extentsAt(parsegraph_Node* node, int atDirection)
{
    if(atDirection == parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_abort(parsegraph_BAD_NODE_DIRECTION);
    }
    return node->_extents[atDirection - parsegraph_DOWNWARD];
}

float parsegraph_Node_extentOffsetAt(parsegraph_Node* node, int atDirection)
{
    return parsegraph_Extent_offset(parsegraph_Node_extentsAt(node, atDirection));
}

void parsegraph_Node_setExtentOffsetAt(parsegraph_Node* node, int atDirection, float offset)
{
    parsegraph_Extent_setOffset(parsegraph_Node_extentsAt(node, atDirection), offset);
}

void parsegraph_Node_extentSize(parsegraph_Node* node, float* size)
{
    // We can just use the length to determine the full size.

    // The horizontal extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_FORWARD), size + 1, 0, 0);

    // The vertical extents have length in the vertical direction.
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD), size, 0, 0);
    //parsegraph_log("ExtentSize=(%f, %f)", size[0], size[1]);
}

static void horzToVert(parsegraph_Node* firstHorz, parsegraph_Node* lastHorz, parsegraph_Node* firstVert, parsegraph_Node* lastVert)
{
    //parsegraph_log("horzToVert exec\n");
    if(!firstHorz || !firstVert) {
        return;
    }
    parsegraph_Node* aa = firstHorz->_layoutPrev;
    parsegraph_Node* dd = lastVert->_layoutNext;
    parsegraph_connectLayout(aa, firstVert);
    parsegraph_connectLayout(lastHorz, dd);
    parsegraph_connectLayout(lastVert, firstHorz);
}

static void vertToHorz(parsegraph_Node* firstHorz, parsegraph_Node* lastHorz, parsegraph_Node* firstVert, parsegraph_Node* lastVert)
{
    //parsegraph_log("vertToHorz exec\n");
    if(!firstHorz || !firstVert) {
        return;
    }
    parsegraph_Node* aa = firstHorz->_layoutPrev;
    parsegraph_Node* dd = lastVert->_layoutNext;
    //parsegraph_log("aa=%d\n" aa->_id);
    //parsegraph_log("dd=%d\n" dd->_id);
    //parsegraph_log("firstHorz=%d\n" firstHorz->_id);
    //parsegraph_log("lastVert=%d\n" lastVert->_id);
    //parsegraph_log("lastHorz=%d\n" lastHorz->_id);
    //parsegraph_log("firstVert=%d\n", firstVert->_id);
    parsegraph_connectLayout(aa, firstHorz);
    parsegraph_connectLayout(lastVert, dd);
    parsegraph_connectLayout(lastHorz, firstVert);
}

void parsegraph_Node_setLayoutPreference(parsegraph_Node* node, int given)
{
    parsegraph_Node* b = parsegraph_Node_parentDirection(node) == parsegraph_BACKWARD ? 0 : parsegraph_Node_nodeAt(node, parsegraph_BACKWARD);
    parsegraph_Node* f = parsegraph_Node_parentDirection(node) == parsegraph_FORWARD ? 0 : parsegraph_Node_nodeAt(node, parsegraph_FORWARD);
    parsegraph_Node* u = parsegraph_Node_parentDirection(node) == parsegraph_UPWARD ? 0 : parsegraph_Node_nodeAt(node, parsegraph_UPWARD);
    parsegraph_Node* d = parsegraph_Node_parentDirection(node) == parsegraph_DOWNWARD ? 0 : parsegraph_Node_nodeAt(node, parsegraph_DOWNWARD);
    parsegraph_Node* firstHorz = b ? b : f;
    if(firstHorz) {
        firstHorz = parsegraph_Node_findLayoutHead(firstHorz, 0);
    }
    parsegraph_Node* lastHorz = f ? f : b;
    parsegraph_Node* firstVert = d ? d : u;
    if(firstVert) {
        firstVert = parsegraph_Node_findLayoutHead(firstVert, 0);
    }
    parsegraph_Node* lastVert = u ? u : d;

    if(parsegraph_Node_isRoot(node)) {
        if(given != parsegraph_PREFER_VERTICAL_AXIS && given != parsegraph_PREFER_HORIZONTAL_AXIS) {
            parsegraph_die("Unallowed layout preference: %s", parsegraph_nameLayoutPreference(given));
        }
        if(node->_layoutPreference == given) {
            return;
        }
        if(given == parsegraph_PREFER_VERTICAL_AXIS) {
            // parsegraph_PREFER_HORIZONTAL_AXIS -> parsegraph_PREFER_VERTICAL_AXIS
            horzToVert(firstHorz, lastHorz, firstVert, lastVert);
        }
        else {
            // parsegraph_PREFER_VERTICAL_AXIS -> parsegraph_PREFER_HORIZONTAL_AXIS
            vertToHorz(firstHorz, lastHorz, firstVert, lastVert);
        }
        node->_layoutPreference = given;
        return;
    }

    int curCanon = parsegraph_Node_canonicalLayoutPreference(node);
    node->_layoutPreference = given;
    int newCanon = parsegraph_Node_canonicalLayoutPreference(node);
    if(curCanon == newCanon) {
        return;
    }

    int paxis = parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(node));
    if(curCanon == parsegraph_PREFER_PARENT_AXIS) {
        if(paxis == parsegraph_HORIZONTAL_AXIS) {
            horzToVert(firstHorz, lastHorz, firstVert, lastVert);
        }
        else {
            vertToHorz(firstHorz, lastHorz, firstVert, lastVert);
        }
    }
    else {
        if(paxis == parsegraph_VERTICAL_AXIS) {
            vertToHorz(firstHorz, lastHorz, firstVert, lastVert);
        }
        else {
            horzToVert(firstHorz, lastHorz, firstVert, lastVert);
        }
    }

    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

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

void parsegraph_Node_setNodeAlignmentMode(parsegraph_Node* node, int inDirection, int newAlignmentMode)
{
    parsegraph_Node_ensureNeighbor(node, inDirection)->alignmentMode = newAlignmentMode;
    //parsegraph_log("%s\n", parsegraph_nameNodeAlignment(newAlignmentMode));
    parsegraph_Node_layoutWasChanged(node, inDirection);
}

int parsegraph_Node_nodeAlignmentMode(parsegraph_Node* node, int inDirection)
{
    if(node->_neighbors[inDirection]) {
        return node->_neighbors[inDirection]->alignmentMode;
    }
    return parsegraph_NULL_NODE_ALIGNMENT;
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
    return node->_extended ? node->_extended->value : 0;
};

void parsegraph_Node_setValue(parsegraph_Node* node, void* newValue, int report, void(*destructor)(void*, parsegraph_Node*), void* destructorThisArg)
{
    if(node->_extended && node->_extended->value == newValue) {
        return;
    }
    parsegraph_ExtendedNode* extended = parsegraph_Node_ensureExtended(node);
    if(extended->destructor) {
        extended->destructor(extended->destructorThisArg, node);
    }
    extended->value = newValue;
    extended->destructor = destructor;
    extended->destructorThisArg = destructorThisArg;

    parsegraph_Node_ensureExtended(node)->value = newValue;
    if(report) {
        parsegraph_Node_valueChanged(node);
    }
};

void* parsegraph_Node_scene(parsegraph_Node* node)
{
    return node->_extended ? node->_extended->scene : 0;
}

void parsegraph_Node_setScene(parsegraph_Node* node, void* scene)
{
    parsegraph_Node_ensureExtended(node)->scene = scene;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
};

int parsegraph_Node_typeAt(parsegraph_Node* node, int direction)
{
    if(!parsegraph_Node_hasNode(node, direction)) {
        return parsegraph_NULL_NODE_TYPE;
    }
    return parsegraph_Node_type(parsegraph_Node_nodeAt(node, direction));
}

int parsegraph_Node_label(parsegraph_Node* node, UChar* buf, int len)
{
    if(!node->_label) {
        return 0;
    }
    return parsegraph_Label_text(node->_label, buf, len);
}

int parsegraph_Node_labelUTF8(parsegraph_Node* node, char* buf, int len)
{
    if(!parsegraph_Node_realLabel(node)) {
        return 0;
    }
    int ulen = parsegraph_Label_length(parsegraph_Node_realLabel(node));
    UChar* ubuf = malloc((1+ulen)*sizeof(UChar));
    parsegraph_Node_label(node, ubuf, ulen+1);
    int32_t trueLen = 0;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(buf, len, &trueLen, ubuf, ulen, &uerr);
    free(ubuf);
    if(uerr == U_BUFFER_OVERFLOW_ERROR) {
        buf[len-1] = 0;
    }
    else if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during convert from UTF8 text %s", u_errorName(uerr));
    }
    return trueLen;
}

int parsegraph_Node_glyphCount(parsegraph_Node* node, parsegraph_ArrayList* counts, int pagesPerTexture)
{
    if(!node->_label) {
        return 0;
    }
    return parsegraph_Label_glyphCount(node->_label, counts, pagesPerTexture);
}

parsegraph_Label* parsegraph_Node_realLabel(parsegraph_Node* node)
{
    return node->_label;
}

void parsegraph_Node_setLabel(parsegraph_Node* node, const UChar* text, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!node->_label) {
        node->_label = parsegraph_Label_new(node->pool, glyphAtlas);
    }

    parsegraph_Label_setText(node->_label, text, len);
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

void parsegraph_Node_setLabelUTF8(parsegraph_Node* node, const char* text, int len, parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!node->_label) {
        node->_label = parsegraph_Label_new(node->pool, glyphAtlas);
    }

    parsegraph_Label_setTextUTF8(node->_label, text, len);
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

parsegraph_Style* parsegraph_Node_blockStyle(parsegraph_Node* node)
{
    return node->_style;
}

void parsegraph_Node_setBlockStyle(parsegraph_Node* node, parsegraph_Style* style)
{
    if(node->_style == style) {
        // Ignore idempotent style changes.
        return;
    }
    node->_style = style;
    parsegraph_Node_layoutWasChanged(node, parsegraph_INWARD);
}

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

void parsegraph_Node_groupSize(parsegraph_Node* node, float* bodySize)
{
    parsegraph_Node_size(node, bodySize);
    float s = parsegraph_Node_groupScale(node);
    bodySize[0] *= s;
    bodySize[1] *= s;
}

void parsegraph_Node_assignParent(parsegraph_Node* node, parsegraph_Node* fromParent, int parentDirection)
{
    if(!fromParent) {
        // Clearing the parent.
        node->_parentNeighbor = 0;
        return;
    }
    node->_parentNeighbor = parsegraph_Node_neighborAt(fromParent, parentDirection);
}

int parsegraph_Node_isSelected(parsegraph_Node* node)
{
    return node->_extended ? node->_extended->selected : 0;
};

void parsegraph_Node_setSelected(parsegraph_Node* node, int selected)
{
    parsegraph_Node_ensureExtended(node)->selected = selected;
}

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
}

int parsegraph_Node_inNodeBody(parsegraph_Node* node, float x, float y, float userScale)
{
    float s[2];
    parsegraph_Node_size(node, s);

    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    float aScale = parsegraph_Node_absoluteScale(node);
    if(x < userScale * ax - userScale * aScale * s[0]/2) {
        //parsegraph_log("Given coords are outside this node's body. (Horizontal minimum exceeds X-coord)"\n);
        return 0;
    }
    if(x > userScale * ax + userScale * aScale * s[0]/2) {
        //parsegraph_log("Given coords are outside this node's body. (X-coord exceeds horizontal maximum)"\n);
        return 0;
    }
    if(y < userScale * ay - userScale * aScale * s[1]/2) {
        //parsegraph_log("Given coords are outside this node's body. (Vertical minimum exceeds Y-coord)\n");
        return 0;
    }
    if(y > userScale * ay + userScale * aScale * s[1]/2) {
        //parsegraphlog("Given coords are outside this node's body. (Y-coord exceeds vertical maximum)\n");
        return 0;
    }
    //parsegraph_log("Within node body of %s\n", parsegraph_Node_toString(node));
    return 1;
}

int parsegraph_Node_inNodeExtents(parsegraph_Node* node, float x, float y, float userScale)
{
    float ax = parsegraph_Node_absoluteX(node);
    float ay = parsegraph_Node_absoluteY(node);
    float aScale = parsegraph_Node_absoluteScale(node);
    float eSize[2];
    parsegraph_Node_extentSize(node, eSize);

    parsegraph_log("Checking node extent of size (%f, %f) at absolute X, Y origin of %f, %f\n", eSize[0], eSize[1], ax, ay);
    if(aScale != 1) {
        parsegraph_log("Node absolute scale is %f\n", aScale);
    }
    if(userScale != 1) {
        parsegraph_log("User scale is %f\n", userScale);
    }
    parsegraph_log("Position to test is %f, %f\n", x, y);

    parsegraph_Node_dump(node);

    const float forwardMin = userScale * ax - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD);
    if(x < forwardMin) {
        parsegraph_log("Test X value of %f is behind horizontal node minimum of %f.\n", x, forwardMin);
        return 0;
    }
    const float forwardMax = userScale * ax - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD) + userScale * aScale * eSize[0];
    parsegraph_log("ForwardMax = %f = ax=%f - offset=%f + width=%f\n", forwardMax, ax, parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD), eSize[0]);
    if(x > forwardMax) {
        parsegraph_log("Test X value of %f is ahead of horizontal node maximum of %f.\n", x, forwardMax);
        return 0;
    }
    const float vertMin = userScale * ay - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_FORWARD);
    if(y < vertMin) {
        parsegraph_log("Test Y value of %f is above node vertical minimum of %f.\n", y, vertMin);
        return 0;
    }
    const float vertMax = userScale * ay - userScale * aScale * parsegraph_Node_extentOffsetAt(node, parsegraph_FORWARD) + userScale * aScale * eSize[1];
    if(y > vertMax) {
        parsegraph_log("Test Y value of %f is beneath node vertical maximum of %f.\n", y, vertMax);
        return 0;
    }
    parsegraph_log("Test value is in within node extent.\n");
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
    {
        char buf[1024];
        buf[0] = 0;
        parsegraph_Node_labelUTF8(node, buf, 1023);
        parsegraph_logEntercf("Node under world checks", "Checking from node %d (%s) for node under world coords (%f, %f)\n", node->_id, buf, x, y);
    }
    if(isnan(userScale)) {
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
        char buf[256];
        if(!parsegraph_Node_labelUTF8(candidate, buf, 255)) {
            buf[0] = 0;
        }
        if(buf[0]) {
            parsegraph_log("Checking node %d = %s\n", candidate->_id, buf);
        }
        else {
            parsegraph_log("Checking %s node %d\n", parsegraph_nameNodeType(parsegraph_Node_type(candidate)), candidate->_id);
        }

        if(candidate == &FORCE_SELECT_PRIOR) {
            parsegraph_ArrayList_pop(candidates);
            parsegraph_logLeavef("Using previously selected candidate due to setting.");
            rv = parsegraph_ArrayList_pop(candidates);
            goto end;
        }

        if(parsegraph_Node_inNodeBody(candidate, x, y, userScale)) {
            parsegraph_log("Click is in node body\n");
            if(parsegraph_Node_hasNode(candidate, parsegraph_INWARD)) {
                if(parsegraph_Node_inNodeExtents(
                    parsegraph_Node_nodeAt(candidate, parsegraph_INWARD), x, y, userScale)
                ) {
                    parsegraph_log("Testing inward node\n");
                    parsegraph_ArrayList_push(candidates, &FORCE_SELECT_PRIOR);
                    parsegraph_ArrayList_push(candidates, parsegraph_Node_nodeAt(candidate, parsegraph_INWARD));
                    continue;
                }
                else {
                    parsegraph_log("Click not in inward extents\n");
                }
            }

            // Found the node.
            {
                char buf[256];
                buf[0] = 0;
                parsegraph_Node_labelUTF8(candidate, buf, 255);
                parsegraph_log("Found node(%s).\n", buf);
            }
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
        parsegraph_log("Click is in node extent\n");
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

    parsegraph_log("Found nothing clicked.\n");
end:
    parsegraph_ArrayList_destroy(candidates);
    apr_pool_destroy(spool);
    parsegraph_logLeave();
    return rv;
}

void parsegraph_Node_sizeWithoutPadding(parsegraph_Node* node, float* bodySize)
{
    // Find the size of this node's drawing area.
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);
    if(node->_label && !parsegraph_Label_isEmpty(node->_label)) {
        float scaling = (style->fontSize / parsegraph_GlyphAtlas_fontSize(parsegraph_Label_glyphAtlas(node->_label)));
        bodySize[0] = parsegraph_Label_width(node->_label) * scaling;
        bodySize[1] = parsegraph_Label_height(node->_label) * scaling;
        if(isnan(bodySize[0]) || isnan(bodySize[1])) {
            parsegraph_die(
                "Label returned a NaN size. (%f, %f) to (%f, %f). Scaling is (fontSize:%f/glyphFontSize:%f=%f)",
                parsegraph_Label_width(node->_label), parsegraph_Label_height(node->_label),
                bodySize[0], bodySize[1],
                style->fontSize, parsegraph_GlyphAtlas_fontSize(parsegraph_Label_glyphAtlas(node->_label)),
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
        float scale = parsegraph_Node_scale(nestedNode);

        if(parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            bodySize[0] = parsegraph_max(bodySize[0], nestedSize[0] * scale);

            if(parsegraph_Node_realLabel(node)) {
                // Allow for the content's size.
                bodySize[1] = parsegraph_max(
                    style->minHeight,
                    bodySize[1] + parsegraph_Node_verticalPadding(node) + scale * nestedSize[1]
                );
            }
            else {
                bodySize[1] = parsegraph_max(
                    bodySize[1],
                    scale * nestedSize[1] + 2 * parsegraph_Node_verticalPadding(node)
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
                    + scale * nestedSize[0];
            }
            else {
                bodySize[0] = parsegraph_max(bodySize[0], scale * nestedSize[0]);
            }

            bodySize[1] = parsegraph_max(
                bodySize[1],
                scale * nestedSize[1] + 2 * parsegraph_Node_verticalPadding(node)
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
    parsegraph_Extent* extent = parsegraph_Node_extentsAt(node, inDirection);
    parsegraph_Extent_clear(extent);
    parsegraph_Extent_appendLS(extent, length, size);
    parsegraph_Extent_setOffset(extent, offset);
}

float getAlignment(parsegraph_Node* node, int childDirection)
{
    // Calculate the alignment adjustment for both nodes.
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, childDirection);
    int axis = parsegraph_getPerpendicularAxis(
        parsegraph_getNodeDirectionAxis(childDirection)
    );

    float rv = 0;

    int alignmentMode = parsegraph_Node_nodeAlignmentMode(node, childDirection);
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
    node->_neighbors[childDirection]->alignmentOffset = alignment;
    node->_neighbors[childDirection]->separation = separation;

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
            parsegraph_Node_extentOffsetAt(node->_neighbors[childDirection]->node, reversedDirection) -
            alignment / parsegraph_Node_scaleAt(node, childDirection)
        );
    }
    lineLength = separation - parsegraph_Node_scaleAt(node, childDirection) * extentSize;
    node->_neighbors[childDirection]->lineLength = lineLength;
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
    /*parsegraph_log("%s %s's position set to (%f, %f)\n",
        parsegraph_nameNodeDirection(childDirection),
        parsegraph_nameNodeType(parsegraph_Node_type(child)),
        node->_neighbors[childDirection].xPos, node->_neighbors[childDirection].yPos
    );*/
}

static void combineExtent(parsegraph_Node* node,
    int childDirection,
    int direction,
    float lengthAdjustment,
    float sizeAdjustment)
{
    parsegraph_Node* child = parsegraph_Node_nodeAt(node, childDirection);
    /*parsegraph_log(
        "Combining %s extent of %s child of node %d (lengthAdjustment=%f, sizeAdjustment=%f)\n",
        parsegraph_nameNodeDirection(direction),
        parsegraph_nameNodeDirection(childDirection),
        node->_id,
        lengthAdjustment,
        sizeAdjustment
    );*/
    // Calculate the new offset to this node's center.
    float lengthOffset = parsegraph_Node_extentOffsetAt(node, direction)
        + lengthAdjustment
        - parsegraph_Node_scaleAt(node, childDirection) * parsegraph_Node_extentOffsetAt(child, direction);

    // Combine the two extents in the given direction.
    //parsegraph_log("Length offset: %f\n", lengthOffset);
    parsegraph_Extent* e = parsegraph_Node_extentsAt(node, direction);
    float scale = parsegraph_Node_scaleAt(node, childDirection);
    if(parsegraph_Node_nodeFit(node) == parsegraph_NODE_FIT_LOOSE) {
        parsegraph_Extent_combineExtentAndSimplify(e,
            parsegraph_Node_extentsAt(child, direction),
            lengthOffset,
            sizeAdjustment,
            scale
        );
    }
    else {
        parsegraph_Extent_combineExtent(e,
            parsegraph_Node_extentsAt(child, direction),
            lengthOffset,
            sizeAdjustment,
            scale
        );
    }
    //parsegraph_log("Combine complete.\n");

    // Adjust the length offset to remain positive.
    if(lengthOffset < 0) {
        //parsegraph_log("Adjusting negative extent offset.\n");
        parsegraph_Node_setExtentOffsetAt(node, direction,
            parsegraph_Node_extentOffsetAt(node, direction) + parsegraph_absf(lengthOffset)
        );
    }

    /*parsegraph_Extent_dump(node->_neighbors[direction].extent,
        "New %s extent offset = %f\n",
        parsegraph_nameNodeDirection(direction),
        node->_neighbors[direction].extentOffset
    );*/

    // Assert the extent offset is positive.
    if(parsegraph_Node_extentOffsetAt(node, direction) < 0) {
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
    //parsegraph_logEnterf("Combining extents for %s child of node %d\n", parsegraph_nameNodeDirection(childDirection), node->_id);
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
    //parsegraph_logLeave();
}

static int layoutSingle(parsegraph_Node* node,
    float* bodySize,
    int direction,
    int allowAxisOverlap)
{
    if(!parsegraph_Node_hasNode(node, direction)) {
        return 0;
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

    if(child->_layoutState == parsegraph_NEEDS_COMMIT) {
        node->_layoutState = parsegraph_NEEDS_COMMIT;
        return 1;
    }

    // Separate the child from this node.
    float separationFromChild = parsegraph_Extent_separation(parsegraph_Node_extentsAt(node, direction),
        childExtent,
        parsegraph_Node_extentOffsetAt(node, direction)
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
    if(parsegraph_getNodeDirectionAxis(direction) == parsegraph_VERTICAL_AXIS) {
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

    return 0;
}

static int layoutAxis(parsegraph_Node* node,
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
        //parsegraph_log("No nodes in any direction.\n");
        return 0;
    }

    // Test if this node has a first-axis child in only one direction.
    if(
        firstDirection == parsegraph_NULL_NODE_DIRECTION
        || secondDirection == parsegraph_NULL_NODE_DIRECTION
    ) {
        //parsegraph_log("Only node in one direction\n");
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
        if(layoutSingle(node, bodySize, firstAxisDirection, 0)) {
            node->_layoutState = parsegraph_NEEDS_COMMIT;
            return 1;
        }
        return 0;
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
    //parsegraph_log("firstDirection=%s. firstNode=%d\n", parsegraph_nameNodeDirection(firstDirection), firstNode ? firstNode->_id : -1);
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
    float separationFromFirst = parsegraph_Extent_separation(parsegraph_Node_extentsAt(node, firstDirection),
        parsegraph_Node_extentsAt(firstNode, secondDirection),
        parsegraph_Node_extentOffsetAt(node, firstDirection)
        + firstNodeAlignment
        - parsegraph_Node_scaleAt(node, firstDirection) * parsegraph_Node_extentOffsetAt(firstNode, secondDirection),
        allowAxisOverlap,
        parsegraph_Node_scaleAt(node, firstDirection),
        parsegraph_LINE_THICKNESS / 2
    );

    float separationFromSecond = parsegraph_Extent_separation(parsegraph_Node_extentsAt(node, secondDirection),
        parsegraph_Node_extentsAt(secondNode, firstDirection),
        parsegraph_Node_extentOffsetAt(node, secondDirection)
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
    return 0;
}

static void addLineBounds(void* nodePtr, int given)
{
    parsegraph_Node* node = nodePtr;
    if(!parsegraph_Node_hasChildAt(node, given)) {
        return;
    }

    int perpAxis = parsegraph_getPerpendicularAxis(given);
    int dirSign = parsegraph_nodeDirectionSign(given);

    float positiveOffset = parsegraph_Node_extentOffsetAt(nodePtr,
        parsegraph_getPositiveNodeDirection(perpAxis)
    );

    float negativeOffset = parsegraph_Node_extentOffsetAt(nodePtr,
        parsegraph_getNegativeNodeDirection(perpAxis)
    );

    if(dirSign < 0) {
        float lineSize = parsegraph_Node_sizeIn(node, given);
        positiveOffset -= lineSize + parsegraph_Node_lineLengthAt(node, given);
        negativeOffset -= lineSize + parsegraph_Node_lineLengthAt(node, given);
    }

    if(parsegraph_Node_nodeFit(node) == parsegraph_NODE_FIT_EXACT) {
        // Append the line-shaped bound.
        parsegraph_Extent_combineBound(
            parsegraph_Node_extentsAt(node, parsegraph_getPositiveNodeDirection(perpAxis)),
            positiveOffset,
            parsegraph_Node_lineLengthAt(node, given),
            parsegraph_Node_scaleAt(node, given) * parsegraph_LINE_THICKNESS / 2
        );
        parsegraph_Extent_combineBound(
            parsegraph_Node_extentsAt(node, parsegraph_getNegativeNodeDirection(perpAxis)),
            negativeOffset,
            parsegraph_Node_lineLengthAt(node, given),
            parsegraph_Node_scaleAt(node, given) * parsegraph_LINE_THICKNESS / 2
        );
    }
}

int parsegraph_Node_commitLayout(parsegraph_Node* node)
{
    // Do nothing if this node already has a layout committed.
    if(node->_layoutState == parsegraph_COMMITTED_LAYOUT) {
        return 0;
    }

    parsegraph_logEntercf("Layout commits", "Committing layout for node %d", node->_id);

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

    if(node->_nodeFit == parsegraph_NODE_FIT_NAIVE && (parsegraph_Node_isRoot(node) || parsegraph_Node_hasPos(node))) {
        node->_layoutState = parsegraph_COMMITTED_LAYOUT;
        parsegraph_logLeave();
        return 0;
    }

    // Clear the absolute point values, to be safe.
    node->_absoluteXPos = 0;
    node->_absoluteYPos = 0;

    float bodySize[2];
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
        if(node->_layoutPreference == parsegraph_PREFER_HORIZONTAL_AXIS || node->_layoutPreference == parsegraph_PREFER_VERTICAL_AXIS) {
            // Root-like, so just lay out both axes. (this is a root's default)
            if(layoutAxis(node, bodySize, parsegraph_BACKWARD, parsegraph_FORWARD,
                !parsegraph_Node_hasNode(node, parsegraph_UPWARD) && !parsegraph_Node_hasNode(node, parsegraph_DOWNWARD)
            )) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                return 1;
            }

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            if(layoutAxis(node, bodySize, parsegraph_UPWARD, parsegraph_DOWNWARD, 1)) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                parsegraph_logLeave();
                return 1;
            }
        }
        else {
            // Root-like, so just lay out both axes.
            if(layoutAxis(node, bodySize, parsegraph_UPWARD, parsegraph_DOWNWARD,
                !parsegraph_Node_hasNode(node, parsegraph_BACKWARD) && !parsegraph_Node_hasNode(node, parsegraph_FORWARD)
            )) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                parsegraph_logLeave();
                return 1;
            }

            // This node is root-like, so it lays out the second-axis children in
            // the same method as the first axis.
            if(layoutAxis(node, bodySize, parsegraph_BACKWARD, parsegraph_FORWARD, 1)) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                parsegraph_logLeave();
                return 1;
            }
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
            if(layoutAxis(
                node, bodySize,
                hasFirstAxisNodes[0],
                hasFirstAxisNodes[1],
                0
            )) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                parsegraph_logLeave();
                return 1;
            }

            // Layout this node's second-axis child, if that child exists.
            if(parsegraph_Node_hasNode(node, oppositeFromParent)) {
                // Layout the second-axis child.
                if(layoutSingle(node, bodySize, oppositeFromParent, 1)) {
                    node->_layoutState = parsegraph_NEEDS_COMMIT;
                    parsegraph_logLeave();
                    return 1;
                }
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
                if(layoutSingle(
                    node, bodySize,
                    oppositeFromParent,
                    firstDirection != parsegraph_NULL_NODE_DIRECTION ||
                    secondDirection != parsegraph_NULL_NODE_DIRECTION
                )) {
                    node->_layoutState = parsegraph_NEEDS_COMMIT;
                    parsegraph_logLeave();
                    return 1;
                }
            }

            if(layoutAxis(node, bodySize, perpendicularNodes[0], perpendicularNodes[1], 1)) {
                node->_layoutState = parsegraph_NEEDS_COMMIT;
                parsegraph_logLeave();
                return 1;
            }
        }
    }

    // Set our extents, combined with non-point neighbors.
    parsegraph_forEachCardinalNodeDirection(addLineBounds, node);

    if(parsegraph_Node_hasNode(node, parsegraph_INWARD)) {
        parsegraph_Node* nestedNode = parsegraph_Node_nodeAt(node, parsegraph_INWARD);
        if(nestedNode->_layoutState != parsegraph_COMMITTED_LAYOUT) {
            node->_layoutState = parsegraph_NEEDS_COMMIT;
            parsegraph_logLeave();
            return 1;
        }
        float nestedSize[2];
        parsegraph_Node_extentSize(nestedNode, nestedSize);
        if(parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
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
                parsegraph_Node_scale(nestedNode) * (
                    parsegraph_Node_extentOffsetAt(nestedNode, parsegraph_FORWARD)
                    - nestedSize[1] / 2
                )
            );
        }
    }

    node->_layoutState = parsegraph_COMMITTED_LAYOUT;

    // Needed a commit, so return true.
    parsegraph_Node_dump(node);
    parsegraph_logLeave();
    return 1;
}

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

static int pastTime(parsegraph_CommitLayoutTraversal* cl, int* i, int id)
{
    ++(*i);
    if(*i % parsegraph_NATURAL_GROUP_SIZE == 0) {
        struct timespec ct;
        clock_gettime(CLOCK_REALTIME, &ct);
        long el = parsegraph_timediffMs(&cl->startTime, &ct);
        if(el > 4*1000) {
            //parsegraph_log("%d\n", id);
        }
        if(el > 5*1000) {
            parsegraph_die("Commit Layout is taking too long");
        }
        if(cl->timeout != 0 && parsegraph_timediffMs(&cl->startTime, &ct) > cl->timeout) {
            return 1;
        }
    }
    return 0;
}

int parsegraph_Node_continueCommitLayout(parsegraph_CommitLayoutTraversal* cl)
{
    clock_gettime(CLOCK_REALTIME, &cl->startTime);
    int i = 0;
    // Commit layout for all nodes.
    while(cl->layoutPhase == 1) {
        if(cl->paintGroup == 0) {
            //parsegraph_log("Beginning new commit layout phase 1\n");
            cl->paintGroup = cl->rootPaintGroup->_paintGroupNext;
            cl->root = cl->paintGroup;
            cl->node = cl->root;
        }
        else {
            //parsegraph_log("Continuing commit layout phase 1\n");
        }
        if(pastTime(cl, &i, cl->paintGroup->_id)) {
            return 1;
        }
        if(parsegraph_Node_needsCommit(cl->root)) {
            do {
                // Loop back to the first node, from the root.
                cl->node = cl->node->_layoutNext;
                if(parsegraph_Node_needsCommit(cl->node)) {
                    parsegraph_Node_commitLayout(cl->node);
                    if(parsegraph_Node_needsCommit(cl->node)) {
                        // Node had a child that needed a commit, so reset the layout.
                        //parsegraph_log("Resetting layout\n");
                        cl->paintGroup = 0;
                        return 1;
                    }
                    cl->node->_currentPaintGroup = cl->paintGroup;
                }
                if(pastTime(cl, &i, cl->node->_id)) {
                    return 1;
                }
            } while(cl->node != cl->root);
        }
        if(cl->paintGroup == cl->rootPaintGroup) {
            //parsegraph_log("Commit layout phase 1 done\n");
            ++cl->layoutPhase;
            cl->paintGroup = 0;
            break;
        }
        cl->paintGroup = cl->paintGroup->_paintGroupNext;
        cl->root = cl->paintGroup;
        cl->node = cl->root;
    }
    // Calculate position.
    while(cl->layoutPhase == 2) {
        //parsegraph_log("Now in layout phase 2\n");
        if(cl->paintGroup == 0) {
            //parsegraph_log("Beginning layout phase 2\n");
            cl->paintGroup = cl->rootPaintGroup;
            cl->root = cl->paintGroup;
            cl->node = cl->root;
        }
        else {
            //parsegraph_log("Continuing layout phase 2\n");
        }
        //parsegraph_log("Processing position for %s\n", parsegraph_Node_toString(cl->paintGroup));
        if(pastTime(cl, &i, cl->paintGroup->_id)) {
            //parsegraph_log("Ran out of time\n");
            return 1;
        }
        if(parsegraph_Node_needsPosition(cl->paintGroup) || cl->node) {
            //parsegraph_log("%s needs a position update", parsegraph_Node_toString(cl->paintGroup));
            if(!cl->node) {
                cl->node = cl->paintGroup;
            }
            do {
                // Loop from the root to the last node.
                cl->node->_absoluteDirty = 1;
                cl->node->_hasGroupPos = 0;
                parsegraph_Node_commitGroupPos(cl->node);
                cl->node = cl->node->_layoutPrev;
                if(pastTime(cl, &i, cl->node->_id)) {
                    //parsegraph_log("Ran out of time\n");
                    return 1;
                }
            } while(cl->node != cl->root);
        }
        else {
            //parsegraph_log("%s does not need a position update.\n", parsegraph_Node_toString(cl->paintGroup));
        }
        ++cl->paintGroup->_absoluteVersion;
        cl->paintGroup->_absoluteDirty = 1;
        parsegraph_Node_commitAbsolutePos(cl->paintGroup);
        cl->paintGroup = cl->paintGroup->_paintGroupPrev;
        if(cl->paintGroup == cl->rootPaintGroup) {
            //parsegraph_log("Commit layout phase 2 done\n");
            ++cl->layoutPhase;
            break;
        }
        cl->root = cl->paintGroup;
        cl->node = 0;
    }
    return 0;
}

int parsegraph_Node_commitLayoutIteratively(parsegraph_Node* node, parsegraph_CommitLayoutTraversal* cl)
{
    if(!parsegraph_Node_isRoot(node)) {
        return parsegraph_Node_commitLayoutIteratively(parsegraph_Node_root(node), cl);
    }
    // Avoid needless work if possible.
    if(node->_layoutState == parsegraph_COMMITTED_LAYOUT) {
        return 0;
    }

    if(!cl) {
        parsegraph_CommitLayoutTraversal inlineCL;
        inlineCL.timeout = 0;
        while(0 != parsegraph_Node_commitLayoutIteratively(node, &inlineCL));
        return 0;
    }

    // Reset the traversal.
    cl->rootPaintGroup = node;
    cl->layoutPhase = 1;
    cl->paintGroup = 0;
    cl->root = node;
    cl->node = node;
    clock_gettime(CLOCK_MONOTONIC, &cl->startTime);

    // Traverse the graph depth-first, committing each node's layout in turn.
    return parsegraph_Node_continueCommitLayout(cl);
}

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

    return node->_neighbors[inDirection]->separation;
}

void parsegraph_Node_layoutWasChanged(parsegraph_Node* nodeRoot, int changeDirection)
{
    // Disallow null change directions.
    if(changeDirection == parsegraph_NULL_NODE_DIRECTION) {
        parsegraph_die("Change direction cannot be null.\n");
    }

    parsegraph_Node* node = nodeRoot;
    while(node) {
        int oldLayoutState = node->_layoutState;

        // Set the needs layout flag.
        node->_layoutState = parsegraph_NEEDS_COMMIT;
        node->_hasGroupPos = 0;
        node->_currentPaintGroup = 0;

        parsegraph_Node* pg = parsegraph_Node_findPaintGroup(node);
        parsegraph_Node_markDirty(pg);

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

void parsegraph_Node_layoutHasChanged(parsegraph_Node* node, int changeDirection)
{
    parsegraph_Node_layoutWasChanged(node, changeDirection);
}

void parsegraph_Node_layoutChanged(parsegraph_Node* node, int changeDirection)
{
    parsegraph_Node_layoutWasChanged(node, changeDirection);
}

int* parsegraph_Node_layoutOrder(parsegraph_Node* node)
{
    if(parsegraph_Node_isRoot(node)) {
        if(node->_layoutPreference == parsegraph_PREFER_HORIZONTAL_AXIS || node->_layoutPreference == parsegraph_PREFER_PERPENDICULAR_AXIS) {
            return parsegraph_HORIZONTAL_ORDER;
        }
        return parsegraph_VERTICAL_ORDER;
    }
    if(parsegraph_Node_canonicalLayoutPreference(node) == parsegraph_PREFER_PERPENDICULAR_AXIS) {
        //parsegraph_log("PREFER PERP");
        if(parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(node)) == parsegraph_HORIZONTAL_AXIS) {
            return parsegraph_VERTICAL_ORDER;
        }
        return parsegraph_HORIZONTAL_ORDER;
    }
    //parsegraph_log("PREFER PARALLEL TO PARENT: %s", parsegraph_nameLayoutPreference(node->_layoutPreference));
    // Parallel preference.
    if(parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(node)) == parsegraph_HORIZONTAL_AXIS) {
        return parsegraph_HORIZONTAL_ORDER;
    }
    return parsegraph_VERTICAL_ORDER;
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
}

void parsegraph_Node_dump(parsegraph_Node* node)
{
    // extent.boundingValues() returns [totalLength, minSize, maxSize]
    float backwardOffset = parsegraph_Node_extentOffsetAt(node, parsegraph_BACKWARD);
    float totalLength, minSize, maxSize;
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_BACKWARD), &totalLength, &minSize, &maxSize);
    if(minSize == maxSize) {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_BACKWARD),
            "Backward extent of length %f and size %f (center at %f)", totalLength, minSize, backwardOffset
        );
    }
    else {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_BACKWARD),
            "Backward extent of length %f [min size :%f, max size:%f] (center at %f)", totalLength, minSize, maxSize, backwardOffset
        );
    }

    float forwardOffset = parsegraph_Node_extentOffsetAt(node, parsegraph_FORWARD);
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_FORWARD), &totalLength, &minSize, &maxSize);
    if(minSize == maxSize) {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_FORWARD),
            "Forward extent of length %f and size %f (center at %f)", totalLength, minSize, forwardOffset
        );
    }
    else {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_FORWARD),
            "Forward extent of length %f [min size: %f, max size: %f] (center at %f)", totalLength, minSize, maxSize, forwardOffset
        );
    }

    float downwardOffset = parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD);
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD), &totalLength, &minSize, &maxSize);
    if(minSize == maxSize) {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD),
            "Downward extent of length %f and size %f (center at %f)", totalLength, minSize, downwardOffset
        );
    }
    else {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_DOWNWARD),
            "Downward extent of length %f [min size: %f, max size: %f] (center at %f)", totalLength, minSize, maxSize, downwardOffset
        );
    }

    float upwardOffset = parsegraph_Node_extentOffsetAt(node, parsegraph_UPWARD);
    parsegraph_Extent_boundingValues(parsegraph_Node_extentsAt(node, parsegraph_UPWARD), &totalLength, &minSize, &maxSize);
    if(minSize == maxSize) {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_UPWARD),
            "Upward extent of length %f and size %f (center at %f)", totalLength, minSize, upwardOffset
        );
    }
    else {
        parsegraph_Extent_dump(parsegraph_Node_extentsAt(node, parsegraph_UPWARD),
            "Upward extent of length %f [min size:%f, max size:%f] (center at %f)", totalLength, minSize, maxSize, upwardOffset
        );
    }
}

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

int parsegraph_Node_paint(parsegraph_Node* node, float* backgroundColor, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders, long timeout)
{
    if(!parsegraph_Node_localPaintGroup(node)) {
        return 0;
    }
    if(!parsegraph_Node_isDirty(node)) {
        //parsegraph_log("%s is not dirty", parsegraph_Node_toString(node));
        return 1;
    }
    else {
        //parsegraph_log("%s is dirty", parsegraph_Node_toString(node));
    }

    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);

    // Load saved state.
    if(!node->_extended->previousPaintState) {
        parsegraph_Node_markDirty(node);
    }
    parsegraph_PaintState* savedState = node->_extended->previousPaintState;

    if(savedState->commitInProgress) {
        savedState->commitLayout.timeout = timeout;
        if(0 != parsegraph_Node_continueCommitLayout(&savedState->commitLayout)) {
            //parsegraph_log("Timed out during commitLayout\n");
            return 0;
        }
    }
    else if(!savedState->paintGroup) {
        savedState->commitInProgress = 1;
        savedState->commitLayout.timeout = timeout;
        if(0 != parsegraph_Node_commitLayoutIteratively(node, &savedState->commitLayout)) {
            //parsegraph_log("Timed out during commitLayout\n");
            return 0;
        }
    }

    if(savedState->commitInProgress) {
        //parsegraph_log("Committed all layout\n");
        savedState->commitInProgress = 0;
        savedState->paintGroup = node;
    }

    // Continue painting.
    for(;;) {
        if(timeout != 0 && parsegraph_elapsed(&t)) {
            node->_extended->dirty = 1;
            //parsegraph_log("Painting timed out\n");
            return 0;
        }

        parsegraph_Node* paintGroup = savedState->paintGroup;
        parsegraph_log("Painting %s\n", parsegraph_Node_toString(paintGroup));
        if(parsegraph_Node_isDirty(paintGroup)) {
            // Paint and render nodes marked for the current group.
            parsegraph_NodePainter* painter = paintGroup->_extended->painter;
            if(!painter) {
                paintGroup->_extended->painter = parsegraph_NodePainter_new(node->pool, glyphAtlas, shaders);
                painter = paintGroup->_extended->painter;
                parsegraph_NodePainter_setBackground(painter, backgroundColor);
            }
            parsegraph_NodePainter_resetCounts(painter);
            parsegraph_Node* n = paintGroup;
            do {
                parsegraph_log("Counting node %s", parsegraph_Node_toString(n));
                parsegraph_NodePainter_countNode(painter, n, &painter->_counts);
                n = n->_layoutPrev;
            } while(n != paintGroup);
            //parsegraph_log("Glyphs: %d", counts.numGlyphs);
            parsegraph_NodePainter_initBlockBuffer(painter, &painter->_counts);
            n = paintGroup;
            do {
                parsegraph_NodePainter_drawNode(painter, n, shaders);
                n = n->_layoutPrev;
                ++parsegraph_NODES_PAINTED;
                parsegraph_log("Painted nodes %d\n", parsegraph_NODES_PAINTED);
            } while(n != paintGroup);
        }
        paintGroup->_extended->dirty = 0;
        savedState->paintGroup = paintGroup->_paintGroupNext;
        if(savedState->paintGroup == node) {
            break;
        }
    }

    savedState->paintGroup = 0;
    //parsegraph_log("Completed node painting\n");
    return 1;
}

int parsegraph_Node_renderIteratively(parsegraph_Node* node, float* world, parsegraph_Camera* camera)
{
    parsegraph_log("Rendering iteratively\n");
    parsegraph_Node* paintGroup = node;
    int cleanlyRendered = 1;
    int nodesRendered = 0;
    do {
        if(!parsegraph_Node_localPaintGroup(paintGroup) && !parsegraph_Node_isRoot(paintGroup)) {
            parsegraph_die("Paint group chain must not refer to a non-paint group");
        }
        parsegraph_log("Rendering node %s\n", parsegraph_Node_toString(paintGroup));
        cleanlyRendered = parsegraph_Node_render(paintGroup, world, camera) && cleanlyRendered;
        paintGroup = paintGroup->_paintGroupPrev;
        ++nodesRendered;
    } while(paintGroup != node);
    parsegraph_log("%d paint groups rendered\n", nodesRendered);
    return cleanlyRendered;
}

int parsegraph_Node_render(parsegraph_Node* node, float* world, parsegraph_Camera* camera)
{
    if(!parsegraph_Node_localPaintGroup(node)) {
        parsegraph_die("Cannot render a node that is not a paint group");
    }
    parsegraph_NodePainter* painter = node->_extended->painter;
    if(!painter) {
        return 0;
    }
    if(isnan(node->_absoluteXPos)) {
        return 0;
    }

    // Do not render paint groups that cannot be seen.
    float s[4];
    parsegraph_Rect_copyFrom(s, parsegraph_NodePainter_bounds(painter));
    parsegraph_Rect_scale(s, parsegraph_Node_scale(node), parsegraph_Node_scale(node));
    parsegraph_Rect_translate(s, node->_absoluteXPos, node->_absoluteYPos);
    if(camera && !parsegraph_Camera_containsAny(camera, s)) {
        parsegraph_log("Out of bounds: %s", parsegraph_Node_toString(node));
        return !node->_absoluteDirty;
    }

    parsegraph_log("Rendering %s at absolute pos (%f, %f) scale=%f", parsegraph_Node_toString(node), node->_absoluteXPos, node->_absoluteYPos, node->_absoluteScale);

    float trans[9];
    makeTranslation3x3I(trans, node->_absoluteXPos, node->_absoluteYPos);
    float dest[9];
    matrixMultiply3x3I(dest, trans, world);
    makeScale3x3I(trans, node->_absoluteScale, node->_absoluteScale);
    matrixMultiply3x3I(dest, trans, dest);

    parsegraph_NodePainter_render(painter, dest,
        node->_absoluteScale * (camera ? parsegraph_Camera_scale(camera) : 1)
    );

    return !node->_absoluteDirty;
}

