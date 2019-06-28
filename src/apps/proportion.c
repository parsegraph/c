#include <stdio.h>
#include "graph/log.h"
#include "graph/Surface.h"
#include "unicode.h"
#include "die.h"
#include "graph/Input.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include "apps/showProportionTest.h"
#include "timing.h"

struct ProportionAppData {
apr_pool_t* pool;
parsegraph_Graph* graph;
parsegraph_AnimationTimer* renderTimer;
} proportionApp;

static void renderTimerCallback(void* data, float elapsed)
{
    parsegraph_Graph* graph = proportionApp.graph;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Input_Update(input, now);
    if(parsegraph_Graph_needsRepaint(graph)) {
        parsegraph_Surface_paint(surface, (void*)(long)30);
    }
    //parsegraph_Surface_render(surface, 0);
    if(parsegraph_Input_UpdateRepeatedly(input) || parsegraph_Graph_needsRepaint(graph)) {
        //fprintf(stderr, "Scheduling because of input(%d) or graph(%d)\n", parsegraph_Input_UpdateRepeatedly(input), parsegraph_Graph_needsRepaint(graph));
        parsegraph_AnimationTimer_schedule(proportionApp.renderTimer);
    }
}

static void inputListener(parsegraph_Input* input, int affectedPaint, const char* eventSource, int affectedCamera, void* extra)
{
    if(affectedPaint) {
        parsegraph_Graph_scheduleRepaint(proportionApp.graph);
    }
    parsegraph_AnimationTimer_schedule(proportionApp.renderTimer);
    parsegraph_Surface_scheduleRepaint(parsegraph_Graph_surface(proportionApp.graph));
}

static void onUnicodeLoaded(void* data, parsegraph_Unicode* uni)
{
    parsegraph_Graph* graph = data;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Surface_install(surface, input);

    parsegraph_Graph_setGlyphAtlas(graph, parsegraph_buildGlyphAtlas(surface));
    parsegraph_GlyphAtlas_setUnicode(parsegraph_Graph_glyphAtlas(graph), uni);

    int COUNT = 256;
    parsegraph_Node* plot = showProportionTest(graph, COUNT);
    parsegraph_Graph_plot(graph, plot);
    parsegraph_Node_showInCamera(plot, parsegraph_Graph_camera(graph), 0);

    proportionApp.renderTimer = parsegraph_AnimationTimer_new(surface);
    parsegraph_AnimationTimer_setListener(proportionApp.renderTimer, renderTimerCallback, graph);

    parsegraph_Input_SetListener(input, inputListener, 0);
    parsegraph_AnimationTimer_schedule(proportionApp.renderTimer);
}

void parsegraph_stop(parsegraph_Surface* surf)
{
    parsegraph_Surface_uninstall(surf);
    if(proportionApp.graph) {
        if(proportionApp.graph->_glyphAtlas) {
            parsegraph_GlyphAtlas_destroy(proportionApp.graph->_glyphAtlas);
        }
        parsegraph_Graph_destroy(proportionApp.graph);
    }
    parsegraph_Surface_destroy(surf);
    apr_pool_destroy(proportionApp.pool);
}

parsegraph_Surface* parsegraph_init(void* peer, int w, int h, int argc, const char* const* argv)
{
    memset(&proportionApp, 0, sizeof(proportionApp));
    if(APR_SUCCESS != apr_pool_create(&proportionApp.pool, 0)) {
        parsegraph_die("Failed to create proportion app memory pool");
    }
    parsegraph_initialize(proportionApp.pool, 0);

    parsegraph_Surface* surface = parsegraph_Surface_new(proportionApp.pool, peer);
    parsegraph_Surface_setDisplaySize(surface, w, h);
    parsegraph_Graph* graph = parsegraph_Graph_new(surface);
    proportionApp.graph = graph;

    parsegraph_Unicode* uni = parsegraph_Unicode_new(surface->pool);
    parsegraph_Unicode_setOnLoad(uni, onUnicodeLoaded, graph);
    parsegraph_UNICODE_INSTANCE = uni;
    parsegraph_Unicode_load(uni, 0);
    return surface;
}
