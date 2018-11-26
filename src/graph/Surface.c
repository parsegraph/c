#include <pthread.h>
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

    rv->first_painter = 0;
    rv->last_painter = 0;
    rv->first_renderer = 0;
    rv->last_renderer = 0;

    rv->displayWidth = 0;
    rv->displayHeight = 0;

    rv->firstAnimationCallback = 0;
    rv->lastAnimationCallback = 0;

    rv->first_destructor = 0;
    rv->last_destructor = 0;

    pthread_mutexattr_t mutexattr;
    if(0 != pthread_mutexattr_init(&mutexattr)) {
        parsegraph_die("Failed to initialize Surface's mutex attributes");
    }
    if(0 != pthread_mutexattr_settype(&mutexattr, PTHREAD_MUTEX_RECURSIVE)) {
        parsegraph_die("Failed to set Surface's mutex type");
    }
    if(0 != pthread_mutex_init(&rv->lock, &mutexattr)) {
        parsegraph_die("Failed to initialize Surface's mutex");
    }

    return rv;
}

parsegraph_SurfaceDestructor* parsegraph_Surface_addDestructor(parsegraph_Surface* surface, void(*listener)(parsegraph_Surface*,void*), void* thisArg)
{
    parsegraph_SurfaceDestructor* cb = malloc(sizeof(*cb));
    cb->listener = listener;
    cb->listenerThisArg = thisArg;
    cb->prev = 0;
    cb->next = 0;
    if(!surface->last_destructor) {
        surface->first_destructor = cb;
        surface->last_destructor = cb;
    }
    else {
        cb->prev = surface->last_destructor;
        surface->last_destructor->next = cb;
        surface->last_destructor = cb;
    }
    return cb;
}

void parsegraph_Surface_removeDestructor(parsegraph_Surface* surface, parsegraph_SurfaceDestructor* given)
{
    parsegraph_SurfaceDestructor* cb = surface->first_destructor;
    parsegraph_SurfaceDestructor* prev = 0;
    for(; cb; cb = cb->next) {
        if(cb == given) {
            prev->next = cb->next;
            if(cb->next) {
                cb->prev = prev;
            }
            if(surface->first_destructor == cb) {
                surface->first_destructor = surface->first_destructor->next;
            }
            if(surface->last_destructor == cb) {
                surface->last_destructor = prev;
            }
            free(cb);
            return;
        }
        prev = cb;
    }
}

parsegraph_AnimationCallback* parsegraph_Surface_addAnimationCallback(parsegraph_Surface* surface, void(*listener)(void*, float), void* thisArg)
{
    if(0 != pthread_mutex_lock(&surface->lock)) {
        parsegraph_die("Failed to lock surface to add animation callback");
    }
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
    if(0 != pthread_mutex_unlock(&surface->lock)) {
        parsegraph_die("Failed to unlock surface to add animation callback");
    }
    return cb;
}

void parsegraph_Surface_removeAnimationCallback(parsegraph_Surface* surface, parsegraph_AnimationCallback* given)
{
    if(0 != pthread_mutex_lock(&surface->lock)) {
        parsegraph_die("Failed to lock surface to remove animation callback");
    }
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
            goto end;
        }
        prev = cb;
    }
end:
    if(0 != pthread_mutex_unlock(&surface->lock)) {
        parsegraph_die("Failed to unlock surface after removing animation callback");
    }
}

void parsegraph_Surface_runAnimationCallbacks(parsegraph_Surface* surface, float elapsed)
{
    if(0 != pthread_mutex_lock(&surface->lock)) {
        parsegraph_die("Failed to lock surface before running animation callbacks");
    }
    parsegraph_AnimationCallback* cb = surface->firstAnimationCallback;
    surface->firstAnimationCallback = 0;
    surface->lastAnimationCallback = 0;
    if(0 != pthread_mutex_unlock(&surface->lock)) {
        parsegraph_die("Failed to unlock surface after running animation callbacks");
    }
    for(; cb;) {
        cb->listener(cb->listenerThisArg, elapsed);
        parsegraph_AnimationCallback* old = cb;
        cb = cb->next;
        free(old);
    }
}

void parsegraph_Surface_destroy(parsegraph_Surface* surface)
{
    if(0 != pthread_mutex_lock(&surface->lock)) {
        parsegraph_die("Failed to lock surface before destruction");
    }
    for(parsegraph_SurfaceDestructor* d = surface->last_destructor; d;) {
        parsegraph_SurfaceDestructor* next = d->prev;
        d->listener(surface, d->listenerThisArg);
        free(d);
        d = next;
    }
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
    for(parsegraph_AnimationCallback* cb = surface->firstAnimationCallback; cb;) {
        parsegraph_AnimationCallback* next = cb->next;
        free(cb);
        cb = next;
    }
    if(0 != pthread_mutex_unlock(&surface->lock)) {
        parsegraph_die("Failed to unlock surface after destruction");
    }
    apr_pool_destroy(surface->pool);
    pthread_mutex_destroy(&surface->lock);
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
    for(parsegraph_SurfacePainter* painter = surface->first_painter; painter; painter = painter->next) {
        painter->painter(painter->data, arg);
    }
}

void parsegraph_Surface_render(parsegraph_Surface* surface, void* arg)
{
    //fprintf(stderr, "Background color is (%f, %f, %f, %f)\n", surface->backgroundColor[0], surface->backgroundColor[1], surface->backgroundColor[2], surface->backgroundColor[3]);
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
