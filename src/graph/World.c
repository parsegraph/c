#include <stdio.h>
#include "log.h"
#include "World.h"
#include "Node.h"
#include "Graph.h"
#include "PaintGroup.h"
#include "parsegraph_math.h"
#include "../die.h"
#include "graph/Rect.h"
#include "timing.h"

parsegraph_World* parsegraph_World_new(parsegraph_Graph* graph)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, graph->_surface->pool)) {
        parsegraph_die("Failed to create world memory pool.");
    }
    parsegraph_World* world = apr_palloc(pool, sizeof(*world));
    world->pool = pool;

    // World-rendered graphs.
    world->_worldPaintingDirty = 1;
    world->_worldRoots = parsegraph_ArrayList_new(pool);

    // The node currently under the cursor.
    world->_nodeUnderCursor = 0;

    world->_previousWorldPaintState = 0;

    world->_camera = 0;

    world->_graph = graph;

    return world;
}

void parsegraph_World_destroy(parsegraph_World* world)
{
    for(int i = 0; i < parsegraph_ArrayList_length(world->_worldRoots); ++i) {
        parsegraph_Node* node = parsegraph_ArrayList_at(world->_worldRoots, i);
        parsegraph_Node_unref(node);
    }
    parsegraph_ArrayList_destroy(world->_worldRoots);
    apr_pool_destroy(world->pool);
}

parsegraph_Camera* parsegraph_World_camera(parsegraph_World* world)
{
    if(!world->_camera) {
        world->_camera = parsegraph_Camera_new(world->_graph->_surface);
    }
    return world->_camera;
};

void parsegraph_World_setCamera(parsegraph_World* world, parsegraph_Camera* camera)
{
    world->_camera = camera;
};

void parsegraph_World_plot(parsegraph_World* world, parsegraph_Node* node, float worldX, float worldY, float userScale)
{
    if(!node) {
        parsegraph_die("Node must not be null");
    }
    if(!parsegraph_Node_localPaintGroup(node)) {
        parsegraph_PaintGroup* pg = parsegraph_PaintGroup_new(world->_graph->_surface, node, worldX, worldY, userScale);
        parsegraph_Node_setPaintGroup(node, pg);
        parsegraph_PaintGroup_unref(pg);
    }
    parsegraph_ArrayList_push(world->_worldRoots, node);
};

int parsegraph_World_removePlot(parsegraph_World* world, parsegraph_Node* plot)
{
    for(int i = 0; i < parsegraph_ArrayList_length(world->_worldRoots); ++i) {
        parsegraph_Node* node = parsegraph_ArrayList_at(world->_worldRoots, i);
        if(node == plot) {
            if(world->_previousWorldPaintState) {
                world->_previousWorldPaintState = 0;
            }
            parsegraph_Node_unref(node);
            parsegraph_ArrayList_splice(world->_worldRoots, i, 1);
            return 1;
        }
    }
    return 0;
};

int parsegraph_World_mouseOver(parsegraph_World* world, float x, float y)
{
    if(!world->_camera) {
        // Never rendered.
        return 0;
    }
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, world->pool)) {
        parsegraph_die("Failed to create temporary memory pool for mouseover.");
    }
    //console.log("mouseover: " + x + ", " + y);
    float* mouseInWorld = matrixTransform2D(pool,
        makeInverse3x3(pool, parsegraph_Camera_worldMatrix(parsegraph_World_camera(world), pool)),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];
    apr_pool_destroy(pool);

    parsegraph_Node* selectedNode = parsegraph_World_nodeUnderCoords(world, x, y);
    if(world->_nodeUnderCursor == selectedNode) {
        // The node under cursor is already the node under cursor, so don't
        // do anything.
        //console.log("Node was the same");
        return 0;
    }

    if(world->_nodeUnderCursor && world->_nodeUnderCursor != selectedNode) {
        //console.log("Node is changing, so repainting.");
        parsegraph_Node_setSelected(world->_nodeUnderCursor, 0);
        parsegraph_World_scheduleRepaint(world);
    }

    world->_nodeUnderCursor = selectedNode;
    if(!selectedNode) {
        // No node was actually found.
        //console.log("No node actually found.");
        return 0;
    }

    if(parsegraph_Node_type(selectedNode) == parsegraph_SLIDER) {
        //console.log("Selecting slider and repainting");
        parsegraph_Node_setSelected(selectedNode, 1);
        parsegraph_World_scheduleRepaint(world);
    }
    else if(parsegraph_Node_hasClickListener(selectedNode) && !parsegraph_Node_isSelected(selectedNode)) {
        //console.log("Selecting node and repainting");
        parsegraph_Node_setSelected(selectedNode, 1);
        parsegraph_World_scheduleRepaint(world);
    }

    return 1;
}

void parsegraph_World_boundingRect(parsegraph_World* world, float* outRect)
{
    memset(outRect, 0, sizeof(float)*4);
    for(int i = 0; i < parsegraph_ArrayList_length(world->_worldRoots); ++i) {
        parsegraph_Node* plot = parsegraph_ArrayList_at(world->_worldRoots, i);
        parsegraph_CommitLayoutTraversal clt;
        clt.timeout = 0;
        clt.root = plot;
        clt.node = plot;
        parsegraph_Node_commitLayoutIteratively(plot, &clt);

        // Get plot extent data.
        parsegraph_PaintGroup* pg = parsegraph_Node_localPaintGroup(plot);
        float nx = pg->_worldX;
        float ny = pg->_worldY;

        float boundingValues[3];
        boundingValues[0] = 0;
        boundingValues[1] = 0;
        boundingValues[2] = 0;

        parsegraph_Extent* e = parsegraph_Node_extentsAt(plot, parsegraph_FORWARD);
        parsegraph_Extent_boundingValues(e, boundingValues, boundingValues + 1, boundingValues + 2);
        float h = boundingValues[0];

        e = parsegraph_Node_extentsAt(plot, parsegraph_DOWNWARD);
        parsegraph_Extent_boundingValues(e, boundingValues, boundingValues + 1, boundingValues + 2);
        float w = boundingValues[0];

        float be = nx - parsegraph_Node_extentOffsetAt(plot, parsegraph_FORWARD);
        float ue = ny - parsegraph_Node_extentOffsetAt(plot, parsegraph_DOWNWARD);
        float fe = be + w;
        float de = ue + h;

        // Get rect values.
        w = fe + be;
        h = de + ue;

        // Calculate center by averaging axis extremes.
        float cx = be + w/2.0f;
        float cy = ue + h/2.0f;

        // Get current bounding rect.
        float inx = parsegraph_Rect_x(outRect);
        float iny = parsegraph_Rect_y(outRect);
        float inw = parsegraph_Rect_width(outRect);
        float inh = parsegraph_Rect_height(outRect);

        float outw;
        float outh;
        float outx;
        float outy;

        if(!inw || !inh || !inx || !iny) {
            outw = w;
            outh = h;
            outx = cx;
            outy = cy;
        }
        else {
            // Combine rect extents.
            float hmin = parsegraph_min(inx - inw/2.0f, cx - w/2.0f);
            float hmax = parsegraph_max(inx + inw/2.0f, cx + w/2.0f);
            float vmin = parsegraph_min(iny - inh/2.0f, cy - h/2.0f);
            float vmax = parsegraph_max(iny + inh/2.0f, cy + h/2.0f);

            // Calculate width and center.
            outw = hmax - hmin;
            outh = vmax - vmin;
            outx = hmin + outw/2.0f;
            outy = vmin + outh/2.0f;
        }

        // Store results.
        parsegraph_Rect_set(outRect, outx, outy, outw, outh);
    }
}

void parsegraph_World_scheduleRepaint(parsegraph_World* world)
{
    //fprintf(stderr, "Scheduling World repaint\n");
    world->_worldPaintingDirty = 1;
    world->_previousWorldPaintState = 0;
};

parsegraph_Node* parsegraph_World_nodeUnderCursor(parsegraph_World* world)
{
    return world->_nodeUnderCursor;
};

/**
 * Tests whether the given position, in world space, is within a node.
 */
parsegraph_Node* parsegraph_World_nodeUnderCoords(parsegraph_World* world, float x, float y)
{
    // Test if there is a node under the given coordinates.
    for(int i = parsegraph_ArrayList_length(world->_worldRoots) - 1; i >= 0; --i) {
        parsegraph_Node* selectedNode = parsegraph_Node_nodeUnderCoords(
            parsegraph_ArrayList_at(world->_worldRoots, i), x, y, 1.0);
        if(selectedNode) {
            // Node located; no further search.
            return selectedNode;
        }
    }
    return 0;
};

int parsegraph_World_needsRepaint(parsegraph_World* world)
{
    return world->_worldPaintingDirty;
}

static int pastTime(int timeout, struct timespec* t)
{
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    return timeout > 0 && (parsegraph_timediffMs(&now, t) > timeout);
}

static int timeRemaining(int timeout, struct timespec* t)
{
    if(timeout <= 0) {
        return timeout;
    }
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);

    return parsegraph_max(0, timeout - parsegraph_timediffMs(&now, t));
}

static struct timespec parsegraph_PAINT_START;
struct parsegraph_GlyphAtlas* parsegraph_PAINTING_GLYPH_ATLAS = 0;

int parsegraph_World_paint(parsegraph_World* world, int timeout)
{
    //parsegraph_log("Painting world, timeout=%d\n", timeout);
    struct timespec t;
    clock_gettime(CLOCK_REALTIME, &t);

    if(world->_worldPaintingDirty) {
        // Restore the last state.
        int i = 0;
        int savedState = 0;
        if(world->_previousWorldPaintState != 0) {
            savedState = world->_previousWorldPaintState;
            world->_previousWorldPaintState = 0;
            i = savedState;
        }
        else {
            clock_gettime(CLOCK_MONOTONIC, &parsegraph_PAINT_START);
            parsegraph_NODES_PAINTED = 0;
        }

        while(i < parsegraph_ArrayList_length(world->_worldRoots)) {
            if(pastTime(timeout, &t)) {
                world->_previousWorldPaintState = i;
                return 0;
            }
            parsegraph_Node* plot = parsegraph_ArrayList_at(world->_worldRoots, i);
            parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(plot);
            if(!paintGroup) {
                parsegraph_die("Plot no longer has a paint group?!");
            }
            parsegraph_PAINTING_GLYPH_ATLAS = parsegraph_Graph_glyphAtlas(world->_graph);
            int paintCompleted = parsegraph_PaintGroup_paint(paintGroup,
                parsegraph_Surface_backgroundColor(parsegraph_Graph_surface(world->_graph)),
                parsegraph_Graph_glyphAtlas(world->_graph),
                world->_graph->_shaders,
                timeRemaining(timeout, &t)
            );
            parsegraph_PAINTING_GLYPH_ATLAS = 0;

            if(!paintCompleted) {
                world->_previousWorldPaintState = i;
                return 0;
            }

            //fprintf(stderr, "Painted world root %d\n", i);
            ++i;
        }
        //fprintf(stderr, "World is no longer dirty.\n");
        world->_worldPaintingDirty = 0;
    }

    if(!world->_worldPaintingDirty && parsegraph_NODES_PAINTED > 0) {
        long paintDuration = parsegraph_elapsed(&parsegraph_PAINT_START);
        if(paintDuration > 0) {
            //parsegraph_log("Painted %d nodes over %dms. (%d nodes/ms)\n",
                //parsegraph_NODES_PAINTED,
                //paintDuration,
                //(parsegraph_NODES_PAINTED/(paintDuration))
            //);
        }
        else {
            //parsegraph_log("Painted %d nodes in <0ms.\n", parsegraph_NODES_PAINTED);
        }
        parsegraph_NODES_PAINTED = 0;
    }

    return 1;
}

void parsegraph_World_render(parsegraph_World* world, float* worldMat)
{
    for(int i = 0; i < parsegraph_ArrayList_length(world->_worldRoots); ++i) {
        parsegraph_Node* plot = parsegraph_ArrayList_at(world->_worldRoots, i);
        parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(plot);
        if(!paintGroup) {
            parsegraph_die("Plot no longer has a paint group?!");
        }
        parsegraph_PaintGroup_renderIteratively(paintGroup, worldMat, parsegraph_World_camera(world));
    }
}
