#include <stdio.h>
#include "graph/Surface.h"
#include "unicode.h"
#include "die.h"
#include "graph/Input.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include "apps/buildPrimesDemo.h"
#include "timing.h"

struct PrimesAppData {
apr_pool_t* pool;
parsegraph_Graph* graph;
parsegraph_TimeoutTimer* bTimer;
parsegraph_AnimationTimer* renderTimer;
parsegraph_PrimesWidget* widget;
} primesApp;

static int LOOPING_DELAY = 30000;
static void bTimerCallback(void* data)
{
    //if(primesApp.widget->position < MAX_PRIME) {
        //parsegraph_TimeoutTimer_setDelay(primesApp.bTimer, LOOPING_DELAY);
        //parsegraph_TimeoutTimer_schedule(primesApp.bTimer);
    //}
}

static void renderTimerCallback(void* data, float elapsed)
{
    parsegraph_Graph* graph = primesApp.graph;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Input_Update(input, now);
    if(parsegraph_Graph_needsRepaint(graph)) {
        parsegraph_Surface_paint(surface, (void*)(long)30);
    }
    //if(parsegraph_glBufferData_BYTES > 0) {
        //console.log("Wrote " + parsegraph_glBufferData_BYTES + " in pagingbuffer");
        //parsegraph_clearPerformanceCounters();
    //}
    //parsegraph_Surface_render(surface, 0);
    if(parsegraph_Input_UpdateRepeatedly(input) || parsegraph_Graph_needsRepaint(graph)) {
        //fprintf(stderr, "Scheduling because of input(%d) or graph(%d)\n", parsegraph_Input_UpdateRepeatedly(input), parsegraph_Graph_needsRepaint(graph));
        parsegraph_AnimationTimer_schedule(primesApp.renderTimer);
    }
}

static void inputListener(parsegraph_Input* input, int affectedPaint, const char* eventSource, int affectedCamera, void* extra)
{
    if(affectedPaint) {
        parsegraph_Graph_scheduleRepaint(primesApp.graph);
    }
    parsegraph_AnimationTimer_schedule(primesApp.renderTimer);
    parsegraph_Surface_scheduleRepaint(parsegraph_Graph_surface(primesApp.graph));
}

static int clickRoot(const char* button, void* data)
{
    parsegraph_PrimesWidget_step(primesApp.widget, primesApp.widget->position);
    parsegraph_Graph_scheduleRepaint(primesApp.graph);
    parsegraph_AnimationTimer_schedule(primesApp.renderTimer);
    parsegraph_Node_showInCamera(parsegraph_PrimesWidget_root(primesApp.widget), parsegraph_Graph_camera(primesApp.graph), 1);
    return 1;
}

static void onUnicodeLoaded(void* data, parsegraph_Unicode* uni)
{
    parsegraph_Graph* graph = data;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Surface_install(surface, input);

    parsegraph_Graph_setGlyphAtlas(graph, parsegraph_buildGlyphAtlas(surface->pool));
    parsegraph_GlyphAtlas_setUnicode(parsegraph_Graph_glyphAtlas(graph), uni);

    //int COUNT = 25;

    //var linear = new parsegraph_LinearWidget(graph);
    //graph.plot(linear.root());
    parsegraph_PrimesWidget* primes = parsegraph_PrimesWidget_new(graph);
    primesApp.widget = primes;
    parsegraph_Node* plot = parsegraph_PrimesWidget_root(primes);
    parsegraph_Node_setClickListener(plot, clickRoot, 0);
    parsegraph_Graph_plot(graph, plot);

    primesApp.bTimer = parsegraph_TimeoutTimer_new(surface);
    parsegraph_TimeoutTimer_setDelay(primesApp.bTimer, LOOPING_DELAY);
    parsegraph_TimeoutTimer_setListener(primesApp.bTimer, bTimerCallback, 0);
    //parsegraph_TimeoutTimer_schedule(primesApp.bTimer);

    /*
    var aTimer = new parsegraph_TimeoutTimer();
    aTimer.setDelay(10);
    aTimer.setListener(function() {
        linear.step(1);
        graph.scheduleRepaint();
        renderTimer.schedule();
        if(primes.position <= MAX_PRIME) {
            aTimer.setDelay(LOOPING_DELAY);
            aTimer.schedule();
        }
    });
    aTimer.schedule();
    */

    primesApp.renderTimer = parsegraph_AnimationTimer_new(surface);
    parsegraph_AnimationTimer_setListener(primesApp.renderTimer, renderTimerCallback, graph);

    parsegraph_Input_SetListener(input, inputListener, 0);
    parsegraph_AnimationTimer_schedule(primesApp.renderTimer);
}

void parsegraph_stop(parsegraph_Surface* surf)
{
    if(primesApp.widget) {
        parsegraph_PrimesWidget_destroy(primesApp.widget);
    }
    if(primesApp.graph) {
        parsegraph_Graph_destroy(primesApp.graph);
    }
    parsegraph_Surface_destroy(surf);
    apr_pool_destroy(primesApp.pool);
}

parsegraph_Surface* parsegraph_init(void* peer, int w, int h, int argc, const char* const* argv)
{
    primesApp.pool = 0;
    if(APR_SUCCESS != apr_pool_create(&primesApp.pool, 0)) {
        parsegraph_die("Failed to create Primes app memory pool");
    }
    parsegraph_initialize(primesApp.pool, 1);

    parsegraph_Surface* surface = parsegraph_Surface_new(primesApp.pool, peer);
    parsegraph_Surface_setDisplaySize(surface, w, h);
    parsegraph_Graph* graph = parsegraph_Graph_new(surface);
    primesApp.graph = graph;

    parsegraph_Unicode* uni = parsegraph_Unicode_new(surface->pool);
    parsegraph_Unicode_setOnLoad(uni, onUnicodeLoaded, graph);
    parsegraph_UNICODE_INSTANCE = uni;
    parsegraph_Unicode_load(uni, 0);
    return surface;
}
