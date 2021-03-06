#include <stdio.h>
#include "Graph.h"
#include "Input.h"
#include "World.h"
#include "Carousel.h"
#include "die.h"
#include "log.h"

static void paintGraph(void* d, void* rd, int timeout)
{
    parsegraph_Graph_paint(d, timeout);
}

static void renderGraph(void* d, void* rd)
{
    parsegraph_Graph_render(d);
}

parsegraph_Graph* parsegraph_Graph_new(parsegraph_Surface* surface)
{
    // Disallow implicit surface creation.
    if(!surface) {
        parsegraph_die("Surface must be explicitly provided.");
    }

    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, surface->pool)) {
        parsegraph_die("Failed to create Graph memory pool.");
    }

    // Construct the graph.
    parsegraph_Graph* graph = apr_palloc(pool, sizeof(*graph));
    graph->pool = pool;
    graph->_surface = surface;
    graph->_shaders = apr_hash_make(pool);
    graph->_glyphAtlas = 0;
    graph->_world = parsegraph_World_new(graph);
    graph->_cameraBox = parsegraph_CameraBox_new(graph);

    graph->_camera = parsegraph_World_camera(graph->_world);
    graph->_carousel = parsegraph_Carousel_new(graph->_camera, parsegraph_Surface_backgroundColor(surface));
    graph->_input = parsegraph_Input_new(graph, parsegraph_Graph_camera(graph));
    graph->_piano = parsegraph_AudioKeyboard_new(graph->_camera, 0, 0, 1);

    graph->onScheduleRepaint = 0;
    graph->onScheduleRepaintThisArg = 0;

    // Install the graph.
    parsegraph_Surface_addPainter(graph->_surface, paintGraph, graph);
    parsegraph_Surface_addRenderer(graph->_surface, renderGraph, graph);

    return graph;
}

void parsegraph_Graph_destroy(parsegraph_Graph* graph)
{
    parsegraph_AudioKeyboard_destroy(graph->_piano);
    parsegraph_Input_destroy(graph->_input);
    parsegraph_Carousel_destroy(graph->_carousel);
    parsegraph_World_destroy(graph->_world);
    parsegraph_CameraBox_destroy(graph->_cameraBox);
    apr_pool_destroy(graph->pool);
}

apr_hash_t* parsegraph_Graph_shaders(parsegraph_Graph* graph)
{
    return graph->_shaders;
}

parsegraph_CameraBox* parsegraph_Graph_cameraBox(parsegraph_Graph* graph)
{
    return graph->_cameraBox;
}

parsegraph_World* parsegraph_Graph_world(parsegraph_Graph* graph)
{
    return graph->_world;
}

parsegraph_Carousel* parsegraph_Graph_carousel(parsegraph_Graph* graph)
{
    return graph->_carousel;
}

parsegraph_Camera* parsegraph_Graph_camera(parsegraph_Graph* graph)
{
    return parsegraph_World_camera(graph->_world);
}

parsegraph_Surface* parsegraph_Graph_surface(parsegraph_Graph* graph)
{
    return graph->_surface;
}

parsegraph_Input* parsegraph_Graph_input(parsegraph_Graph* graph)
{
    return graph->_input;
}

void parsegraph_Graph_scheduleRepaint(parsegraph_Graph* graph)
{
    parsegraph_logEntercf("Repaint scheduling", "Scheduling graph repaint\n");
    parsegraph_World_scheduleRepaint(graph->_world);
    if(graph->onScheduleRepaint) {
        graph->onScheduleRepaint(graph->onScheduleRepaintThisArg);
    }
    parsegraph_logLeave();
}

void parsegraph_Graph_setOnScheduleRepaint(parsegraph_Graph* graph, void(*func)(void*), void* thisArg)
{
    if(!thisArg) {
        thisArg = graph;
    }
    graph->onScheduleRepaint = func;
    graph->onScheduleRepaintThisArg = thisArg;
};

int parsegraph_Graph_needsRepaint(parsegraph_Graph* graph)
{
    //fprintf(stderr, "Repaint state: World=%d, Carousel=%d, CameraBox=%d\n", parsegraph_World_needsRepaint(graph->_world),
        //(parsegraph_Carousel_isShown(graph->_carousel) && parsegraph_Carousel_needsRepaint(graph->_carousel)),
        //parsegraph_CameraBox_needsRepaint(graph->_cameraBox)
    //);
    return parsegraph_World_needsRepaint(graph->_world)
        || (parsegraph_Carousel_isShown(graph->_carousel) && parsegraph_Carousel_needsRepaint(graph->_carousel))
        || parsegraph_CameraBox_needsRepaint(graph->_cameraBox);
}

parsegraph_GlyphAtlas* parsegraph_Graph_glyphAtlas(parsegraph_Graph* graph)
{
    if(!graph->_glyphAtlas) {
        parsegraph_die("Graph does not have a glyph atlas.");
    }
    return graph->_glyphAtlas;
}

void parsegraph_Graph_setGlyphAtlas(parsegraph_Graph* graph, parsegraph_GlyphAtlas* glyphAtlas)
{
    graph->_glyphAtlas = glyphAtlas;
}

void parsegraph_Graph_plot(parsegraph_Graph* graph, void* arg)
{
    return parsegraph_World_plot(parsegraph_Graph_world(graph), arg, 0, 0, 1);
}

int parsegraph_Graph_paint(parsegraph_Graph* graph, int timeout)
{
    if(!graph->_glyphAtlas) {
        return 0;
    }
    parsegraph_logEntercf("Graph paints", "Painting Graph, timeout=%d\n", timeout);
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_Graph_glyphAtlas(graph);
    parsegraph_GlyphAtlas_update(glyphAtlas);
    apr_hash_set(graph->_shaders, "glyphAtlas", APR_HASH_KEY_STRING, glyphAtlas);
    apr_hash_set(graph->_shaders, "timeout", APR_HASH_KEY_STRING, (void*)(long)timeout);

    parsegraph_CameraBox_prepare(graph->_cameraBox, glyphAtlas, graph->_shaders);
    parsegraph_CameraBox_paint(graph->_cameraBox);

    parsegraph_Carousel_prepare(graph->_carousel, glyphAtlas, graph->_shaders);
    parsegraph_Carousel_paint(graph->_carousel);
    int rv = parsegraph_World_paint(graph->_world, timeout);

    //parsegraph_Input_paint(graph->_input);
    //parsegraph_AudioKeyboard_prepare(graph->_piano, glyphAtlas, graph->_shaders);
    //parsegraph_AudioKeyboard_paint(graph->_piano);
    parsegraph_logLeave();
    return rv;
}

void parsegraph_Graph_render(parsegraph_Graph* graph)
{
    if(!graph->_glyphAtlas) {
        return;
    }
    parsegraph_Camera* cam = parsegraph_Graph_camera(graph);

    float world[9];
    parsegraph_log("Rendering Parsegraph at origin (%f, %f) with scale=%f\n",
        parsegraph_Camera_x(cam),
        parsegraph_Camera_y(cam),
        parsegraph_Camera_scale(cam)
    );
    parsegraph_Camera_project(cam, world);
    if(!parsegraph_World_render(graph->_world, world)) {
        parsegraph_Graph_scheduleRepaint(graph);
    }

    glBlendFunc(GL_SRC_ALPHA, GL_DST_ALPHA);
    parsegraph_Carousel_render(graph->_carousel, world);
    float scale = parsegraph_Camera_scale(cam);
    parsegraph_CameraBox_render(graph->_cameraBox, world, scale);
    parsegraph_Input_render(graph->_input, world, scale);
    //parsegraph_AudioKeyboard_render(graph->_piano, world, scale);
}
