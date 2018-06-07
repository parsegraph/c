#include "Surface.h"
#include "Color.h"
#include <stdio.h>
#include <stdlib.h>
#include <GL/gl.h>

parsegraph_Surface* parsegraph_Surface_new(void* peer)
{
    parsegraph_Surface* rv = malloc(sizeof(*rv));
    if(APR_SUCCESS != apr_pool_create(&rv->pool, 0)) {
        fprintf(stderr, "Failed to create parsegraph_Surface\n");
        abort();
    }
    rv->peer = peer;

    parsegraph_Color_copy(rv->backgroundColor, parsegraph_BACKGROUND_COLOR);

    // The identifier used to cancel a pending Render.
    rv->pendingRender = 0;
    rv->needsRepaint = 1;

    rv->first_painter = 0;
    rv->last_painter = 0;
    rv->first_renderer = 0;
    rv->last_renderer = 0;

    return rv;
}

void parsegraph_Surface_destroy(parsegraph_Surface* surface)
{
    for(parsegraph_SurfacePainter* p = surface->first_painter; p;) {
        parsegraph_SurfacePainter* next = p->next;
        free(p);
        p = next;
    }
    for(parsegraph_SurfaceRenderer* r = surface->first_renderer; r;) {
        parsegraph_SurfaceRenderer* next = r->next;
        free(r);
        r = next;
    }
    free(surface);
}

void parsegraph_Surface_addPainter(parsegraph_Surface* surface, void(*painterFunc)(void*, void*), void* data)
{
    parsegraph_SurfacePainter* painter = malloc(sizeof(*painter));
    painter->painter = painterFunc;
    painter->data = data;
    painter->next = 0;
    if(surface->last_painter) {
        surface->last_painter->next = painter;
        surface->last_painter = painter;
    }
    else {
        surface->first_painter = painter;
        surface->last_painter = painter;
    }
}

void parsegraph_Surface_addRenderer(parsegraph_Surface* surface, void(*rendererFunc)(void*, void*), void* data)
{
    parsegraph_SurfaceRenderer* renderer = malloc(sizeof(*renderer));
    renderer->renderer = rendererFunc;
    renderer->data = data;
    renderer->next = 0;
    if(surface->last_renderer) {
        surface->last_renderer->next = renderer;
        surface->last_renderer = renderer;
    }
    else {
        surface->first_renderer = renderer;
        surface->last_renderer = renderer;
    }
}

void parsegraph_Surface_paint(parsegraph_Surface* surface, void* arg)
{
    if(!surface->needsRepaint) {
        return;
    }
    for(parsegraph_SurfacePainter* painter = surface->first_painter; painter; painter = painter->next) {
        painter->painter(painter->data, arg);
    }
    surface->needsRepaint = 0;
}

void parsegraph_Surface_render(parsegraph_Surface* surface, void* arg)
{
    glClearColor(
        surface->backgroundColor[0],
        surface->backgroundColor[1],
        surface->backgroundColor[2],
        surface->backgroundColor[3]);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    for(parsegraph_SurfaceRenderer* renderer = surface->first_renderer; renderer; renderer = renderer->next) {
        renderer->renderer(renderer->data, arg);
    }
}

void parsegraph_Surface_setBackground(parsegraph_Surface* surface, float* color)
{
    parsegraph_Color_copy(surface->backgroundColor, color);
}

/**
 * Retrieves the current background color.
 */
float* parsegraph_Surface_backgroundColor(parsegraph_Surface* surface)
{
    return surface->backgroundColor;
}
