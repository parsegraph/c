#include "PaintGroup.h"
#include "NodeList.h"
#include "NodePainter.h"
#include "Camera.h"
#include "Node.h"
#include <math.h>
#include <time.h>
#include "../die.h"
#include "log.h"
#include "../timing.h"
#include <stdio.h>

int parsegraph_NODES_PAINTED = 0;
unsigned int parsegraph_PaintGroup_COUNT = 0;

parsegraph_PaintState* parsegraph_PaintState_new(apr_pool_t* pool, parsegraph_PaintGroup* pg)
{
    parsegraph_PaintState* ps = apr_palloc(pool, sizeof(*ps));
    ps->i = 0;
    ps->ordering = parsegraph_ArrayList_new(pool);
    parsegraph_ArrayList_push(ps->ordering, pg);
    ps->inProgress = 0;
    return ps;
}

parsegraph_PaintGroup* parsegraph_PaintGroup_new(parsegraph_Surface* surface, parsegraph_Node* root, float worldX, float worldY, float userScale)
{
    parsegraph_PaintGroup* pg = apr_palloc(surface->pool, sizeof(*pg));
    pg->_surface = surface;
    pg->pool = surface->pool;

    pg->_id = parsegraph_PaintGroup_COUNT++;

    pg->_childPaintGroups = parsegraph_ArrayList_new(surface->pool);

    pg->_root = root;
    pg->_dirty = 1;
    pg->_painter = 0;
    pg->_enabled = 1;

    // Manipulated by node.
    pg->_firstChildPaintGroup = 0;
    pg->_lastChildPaintGroup = 0;
    pg->_nextPaintGroup = 0;

    pg->_previousPaintState = parsegraph_PaintState_new(pg->pool, pg);

    pg->_worldX = worldX;
    pg->_worldY = worldY;
    pg->_userScale = userScale;

    return pg;
}

void parsegraph_PaintGroup_clear(parsegraph_PaintGroup* pg)
{
    pg->_firstChildPaintGroup = 0;
    pg->_lastChildPaintGroup = 0;
    pg->_nextPaintGroup = 0;
}

void parsegraph_PaintGroup_setOrigin(parsegraph_PaintGroup* pg, float x, float y)
{
    pg->_worldX = x;
    pg->_worldY = y;

    if(isnan(pg->_worldX)) {
        parsegraph_die("WorldX must not be NaN.");
    }
    if(isnan(pg->_worldY)) {
        parsegraph_die("WorldY must not be NaN.");
    }
}

void parsegraph_PaintGroup_setScale(parsegraph_PaintGroup* pg, float scale)
{
    pg->_userScale = scale;
    if(isnan(pg->_userScale)) {
        parsegraph_die("Scale must not be NaN.");
    }
}

float parsegraph_PaintGroup_scale(parsegraph_PaintGroup* pg)
{
    return pg->_userScale;
}

parsegraph_Node* parsegraph_PaintGroup_root(parsegraph_PaintGroup* pg)
{
    return pg->_root;
}

parsegraph_Node* parsegraph_PaintGroup_nodeUnderCoords(parsegraph_PaintGroup* pg, float x, float y)
{
    return parsegraph_Node_nodeUnderCoords(pg->_root,
        x - pg->_worldX,
        y - pg->_worldY,
        pg->_userScale
    );
}

void parsegraph_PaintGroup_assignParent(parsegraph_PaintGroup* pg, parsegraph_PaintGroup* parentGroup)
{
    pg->_parent = parentGroup;
}

void parsegraph_PaintGroup_markDirty(parsegraph_PaintGroup* pg)
{
    pg->_dirty = 1;
    pg->_previousPaintState->inProgress = 0;
    pg->_previousPaintState->i = 0;
    parsegraph_ArrayList_clear(pg->_previousPaintState->ordering);
    parsegraph_ArrayList_push(pg->_previousPaintState->ordering, pg);
    /*this._childPaintGroups.forEach(function(pg) {
        pg.markDirty();
    }, this);*/
};

int parsegraph_PaintGroup_isDirty(parsegraph_PaintGroup* pg)
{
    return pg->_dirty;
}

parsegraph_NodePainter* parsegraph_PaintGroup_painter(parsegraph_PaintGroup* pg)
{
    return pg->_painter;
}

int parsegraph_PaintGroup_isEnabled(parsegraph_PaintGroup* pg)
{
    return pg->_enabled;
}

void parsegraph_PaintGroup_enable(parsegraph_PaintGroup* pg)
{
    pg->_enabled = 1;
}

void parsegraph_PaintGroup_disable(parsegraph_PaintGroup* pg)
{
    pg->_enabled = 0;
}

static int pastTime(int timeout, struct timespec* t)
{
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);

    return timeout > 0 && (parsegraph_timediffMs(&now, t) > timeout);
}

struct NodeCountingData {
parsegraph_NodePainterCounts counts;
parsegraph_PaintGroup* paintGroup;
};

struct NodeRenderData {
parsegraph_PaintGroup* paintGroup;
apr_hash_t* shaders;
};

static void countNode(void* d, parsegraph_Node* node)
{
    struct NodeCountingData* ncd = d;
    parsegraph_NodePainter_countNode(ncd->paintGroup->_painter, node, &ncd->counts);
}

static void drawNode(void* d, parsegraph_Node* node)
{
    struct NodeRenderData* nrd = d;
    //parsegraph_log("Drawing one node.\n");
    parsegraph_NodePainter_drawNode(nrd->paintGroup->_painter, node, nrd->shaders);
    parsegraph_NODES_PAINTED++;
}

int parsegraph_PaintGroup_paint(parsegraph_PaintGroup* pg, float* backgroundColor, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders, int timeout)
{
    parsegraph_PaintGroup_enable(pg);
    //fprintf(stderr, "Trying to paint!\n");

    if(!parsegraph_PaintGroup_isDirty(pg)) {
        //fprintf(stderr, "Paint group is clean\n");
        return 1;
    }

    struct timespec t;
    clock_gettime(CLOCK_REALTIME, &t);

    // Load saved state.
    parsegraph_PaintState* savedState = pg->_previousPaintState;
    int i = savedState->i;
    parsegraph_ArrayList* ordering = savedState->ordering;

    if(savedState->inProgress) {
        //fprintf(stderr, "Continuing paint job in progress\n");
        if(parsegraph_Node_continueCommitLayout(&savedState->commitLayout) == 0) {
            savedState->inProgress = 0;
        }
    }
    else if(i == 0) {
        //fprintf(stderr, "Beginning new paint job\n");
        savedState->inProgress = 0;
        savedState->commitLayout.timeout = timeout;
        if(parsegraph_Node_commitLayoutIteratively(pg->_root, &savedState->commitLayout) != 0) {
            savedState->inProgress = 1;
        }
    }

    if(savedState->inProgress) {
        //fprintf(stderr, "Timed out during commitLayout\n");
        return 0;
    }
    else {
        // Committed all layout
        savedState->skippedAny = 0;
    }

    // Continue painting.
    while(i < parsegraph_ArrayList_length(ordering)) {
        if(pastTime(timeout, &t)) {
            savedState->i = i;
            pg->_dirty = 1;
            //fprintf(stderr, "Past time during painting\n");
            return 0;
        }

        parsegraph_PaintGroup* paintGroup = parsegraph_ArrayList_at(ordering, i);
        //parsegraph_log("Painting paintgroup %d (%d, %d)\n", paintGroup->_id, parsegraph_PaintGroup_isEnabled(paintGroup), parsegraph_PaintGroup_isDirty(paintGroup));
        if(parsegraph_PaintGroup_isEnabled(paintGroup) && parsegraph_PaintGroup_isDirty(paintGroup)) {
            // Paint and render nodes marked for the current group.
            if(!paintGroup->_painter) {
                paintGroup->_painter = parsegraph_NodePainter_new(paintGroup->_surface, glyphAtlas, shaders);
                parsegraph_NodePainter_setBackground(paintGroup->_painter, backgroundColor);
            }
            parsegraph_Node* root = parsegraph_PaintGroup_root(paintGroup);
            struct NodeCountingData ncd;
            ncd.paintGroup = paintGroup;
            memset(&ncd.counts, 0, sizeof(ncd.counts));
            parsegraph_foreachPaintGroupNodes(root, countNode, &ncd);
            //parsegraph_log("Initializing block buffer of size %d.\n", ncd.counts);
            parsegraph_NodePainter_initBlockBuffer(paintGroup->_painter, &ncd.counts);

            struct NodeRenderData nrd;
            nrd.paintGroup = paintGroup;
            nrd.shaders = shaders;
            parsegraph_foreachPaintGroupNodes(root, drawNode, &nrd);
        }

        //parsegraph_log("Paint group %d is done drawing and no longer dirty.\n", paintGroup->_id);
        paintGroup->_dirty = 0;
        parsegraph_ArrayList_concat(ordering, paintGroup->_childPaintGroups);
        ++i;
    }

    savedState->i = 0;
    parsegraph_ArrayList_clear(savedState->ordering);
    pg->_dirty = 0;
    //fprintf(stderr, "Done painting\n");
    return 1;
}

int parsegraph_PaintGroup_toString(parsegraph_PaintGroup* pg, char* buf, size_t len)
{
    return snprintf(buf, len, "[parsegraph_PaintGroup %d]", pg->_id);
}

struct IterativeRenderData {
float* world;
parsegraph_Camera* camera;
};

static void iterativeRenderCallback(void* irdPtr, parsegraph_PaintGroup* pg, int i)
{
    struct IterativeRenderData* ird = irdPtr;
    parsegraph_PaintGroup_render(pg, ird->world, ird->camera);
}

void parsegraph_PaintGroup_renderIteratively(parsegraph_PaintGroup* pg, float* world, parsegraph_Camera* camera)
{
    parsegraph_PaintGroup_enable(pg);

    struct IterativeRenderData ird;
    ird.world = world;
    ird.camera = camera;
    parsegraph_PaintGroup_traverseBreadth(pg, iterativeRenderCallback, &ird);
}

void parsegraph_PaintGroup_traverseBreadth(parsegraph_PaintGroup* pg, void(*callback)(void*, parsegraph_PaintGroup*, int), void* callbackThisArg)
{
    parsegraph_ArrayList* ordering = parsegraph_ArrayList_new(pg->pool);
    parsegraph_ArrayList_push(ordering, pg);

    // Build the node list.
    for(int i = 0; i < parsegraph_ArrayList_length(ordering); ++i) {
        parsegraph_PaintGroup* paintGroup = parsegraph_ArrayList_at(ordering, i);
        callback(callbackThisArg, paintGroup, i);
        parsegraph_ArrayList_concat(ordering, paintGroup->_childPaintGroups);
    }
}

void parsegraph_PaintGroup_addChild(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* childPaintGroup)
{
    parsegraph_ArrayList_push(paintGroup->_childPaintGroups, childPaintGroup);
}

void parsegraph_PaintGroup_render(parsegraph_PaintGroup* pg, float* world, parsegraph_Camera* camera)
{
    if(!parsegraph_PaintGroup_isEnabled(pg)) {
        return;
    }
    if(!pg->_painter) {
        return;
    }

    // Do not render paint groups that cannot be seen.
    float* s = parsegraph_NodePainter_bounds(pg->_painter);
    if(camera && !parsegraph_Camera_ContainsAny(camera, s)) {
        //parsegraph_log(camera);
        return;
    }

    //console.log("Rendering paint group: " + this._worldX + " " + this._worldY + " " + this._userScale);
    //console.log("Rendering", this, this._painter.bounds());
    apr_pool_t* pool = pg->pool;
    parsegraph_NodePainter_render(
        pg->_painter,
        matrixMultiply3x3(pool,
            makeScale3x3(pool, pg->_userScale, pg->_userScale),
            matrixMultiply3x3(pool, makeTranslation3x3(pool, pg->_worldX, pg->_worldY), world)
        ),
        pg->_userScale * (camera ? parsegraph_Camera_scale(camera) : 1)
    );
}

static void addNodeForeach(parsegraph_ArrayList* ordering, parsegraph_Node* node, int direction)
{
    // Do not add the parent.
    if(!parsegraph_Node_isRoot(node) && parsegraph_Node_parentDirection(node) == direction) {
        return;
    }

    // Add the node to the ordering if it exists.
    if(parsegraph_Node_hasNode(node, direction)) {
        parsegraph_Node* child = parsegraph_Node_nodeAt(node, direction);

        // Do not add nodes foreign to the given group.
        parsegraph_PaintGroup* lpg = parsegraph_Node_localPaintGroup(child);
        if(!lpg || !parsegraph_PaintGroup_isEnabled(lpg)) {
            parsegraph_ArrayList_push(ordering, child);
        }
    }
}

void parsegraph_foreachPaintGroupNodes(parsegraph_Node* root, void(*callback)(void*, parsegraph_Node*), void* callbackThisArg)
{
    // TODO Make this overwrite the current node, since it's no longer needed, and see
    // if this increases performance.
    parsegraph_ArrayList* ordering = parsegraph_ArrayList_new(root->pool);
    parsegraph_ArrayList_push(ordering, root);

    for(int i = 0; i < parsegraph_ArrayList_length(ordering); ++i) {
        parsegraph_Node* node = parsegraph_ArrayList_at(ordering, i);
        addNodeForeach(ordering, node, parsegraph_INWARD);
        addNodeForeach(ordering, node, parsegraph_DOWNWARD);
        addNodeForeach(ordering, node, parsegraph_UPWARD);
        addNodeForeach(ordering, node, parsegraph_BACKWARD);
        addNodeForeach(ordering, node, parsegraph_FORWARD);
        callback(callbackThisArg, node);
    }
}

static void addNodeFind(parsegraph_ArrayList* ordering, parsegraph_Node* node, int direction, void(*callback)(void*, parsegraph_PaintGroup*), void* callbackThisArg)
{
    // Do not add the parent.
    if(!parsegraph_Node_isRoot(node) && parsegraph_Node_parentDirection(node) == direction) {
        return;
    }

    // Add the node to the ordering if it exists.
    if(parsegraph_Node_hasNode(node, direction)) {
        parsegraph_Node* child = parsegraph_Node_nodeAt(node, direction);
        if(parsegraph_Node_localPaintGroup(child)) {
            callback(callbackThisArg, parsegraph_Node_localPaintGroup(child));
        }
        else {
            parsegraph_ArrayList_push(ordering, child);
        }
    }
};

void parsegraph_findChildPaintGroups(parsegraph_Node* root, void(*callback)(void*, parsegraph_PaintGroup*), void* callbackThisArg)
{
    // TODO Make this overwrite the current node, since it's no longer needed, and see
    // if this increases performance.
    parsegraph_ArrayList* ordering = parsegraph_ArrayList_new(root->pool);
    parsegraph_ArrayList_push(ordering, root);

    for(int i = 0; i < parsegraph_ArrayList_length(ordering); ++i) {
        parsegraph_Node* node = parsegraph_ArrayList_at(ordering, i);
        addNodeFind(ordering, node, parsegraph_INWARD, callback, callbackThisArg);
        addNodeFind(ordering, node, parsegraph_DOWNWARD, callback, callbackThisArg);
        addNodeFind(ordering, node, parsegraph_UPWARD, callback, callbackThisArg);
        addNodeFind(ordering, node, parsegraph_BACKWARD, callback, callbackThisArg);
        addNodeFind(ordering, node, parsegraph_FORWARD, callback, callbackThisArg);
    }
};
