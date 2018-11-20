#include "Surface.h"
#include "die.h"
#include "Color.h"
#include <stdio.h>
#include <stdlib.h>
#include <GL/gl.h>

parsegraph_Surface* parsegraph_Surface_new(apr_pool_t* pool, void* peer)
{
    parsegraph_Surface* rv = malloc(sizeof(*rv));
    if(APR_SUCCESS != apr_pool_create(&rv->pool, pool)) {
        parsegraph_die("Failed to create pool for parsegraph_Surface");
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

    rv->displayWidth = 0;
    rv->displayHeight = 0;

    rv->firstAnimationCallback = 0;
    rv->lastAnimationCallback = 0;

    return rv;
}

parsegraph_AnimationCallback* parsegraph_Surface_addAnimationCallback(parsegraph_Surface* surface, void(*listener)(void*, float), void* thisArg)
{
    parsegraph_AnimationCallback* cb = malloc(sizeof(*cb));
    cb->listener = listener;
    cb->listenerThisArg = thisArg;
    cb->next = 0;
    if(!surface->lastAnimationCallback) {
        surface->firstAnimationCallback = cb;
        surface->lastAnimationCallback = cb;
    }
    else {
        surface->lastAnimationCallback->next = cb;
        surface->lastAnimationCallback = cb;
    }
    return cb;
}

void parsegraph_Surface_removeAnimationCallback(parsegraph_Surface* surface, parsegraph_AnimationCallback* given)
{
    parsegraph_AnimationCallback* cb = surface->firstAnimationCallback;
    parsegraph_AnimationCallback* prev = 0;
    for(; cb; cb = cb->next) {
        if(cb == given) {
            prev->next = cb->next;
            if(surface->firstAnimationCallback == cb) {
                surface->firstAnimationCallback = surface->firstAnimationCallback->next;
            }
            if(surface->lastAnimationCallback == cb) {
                surface->lastAnimationCallback = prev;
            }
            free(cb);
            return;
        }
        prev = cb;
    }
}

void parsegraph_Surface_runAnimationCallbacks(parsegraph_Surface* surface, float elapsed)
{
    parsegraph_AnimationCallback* cb = surface->firstAnimationCallback;
    surface->firstAnimationCallback = 0;
    surface->lastAnimationCallback = 0;
    for(; cb;) {
        cb->listener(cb->listenerThisArg, elapsed);
        parsegraph_AnimationCallback* old = cb;
        cb = cb->next;
        free(old);
    }
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
    for(parsegraph_AnimationCallback* cb = surface->firstAnimationCallback; cb; cb = cb->next) {
        free(cb);
    }
    apr_pool_destroy(surface->pool);
    free(surface);
}

void parsegraph_Surface_setDisplaySize(parsegraph_Surface* surface, float w, float h)
{
    surface->displayWidth = w;
    surface->displayHeight = h;
}

float parsegraph_Surface_getWidth(parsegraph_Surface* surface)
{
    return surface->displayWidth;
}

float parsegraph_Surface_getHeight(parsegraph_Surface* surface)
{
    return surface->displayHeight;
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
