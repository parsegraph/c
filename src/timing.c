#include "timing.h"
#include "graph/initialize.h"
#include "graph/Surface.h"
#include "die.h"
#include <stdlib.h>
#include <string.h>

int parsegraph_TIMEOUT = 40000;

long parsegraph_timediffMs(struct timespec* a, struct timespec* b)
{
    return (b->tv_sec - a->tv_sec) * 1000 + (b->tv_nsec/1e6 - a->tv_nsec/1e6);
}

parsegraph_Timeout* parsegraph_timeout(const char* name, int timeoutMs)
{
    parsegraph_Timeout* timer = malloc(sizeof(*timer));
    if(timeoutMs == -1) {
        timeoutMs = parsegraph_TIMEOUT;
    }
    timer->timeoutMs = timeoutMs;

    if(name) {
        strncpy(timer->name, name, 255);
    }
    clock_gettime(CLOCK_REALTIME, &timer->startTime);

    return timer;
}

void parsegraph_check_timeout(parsegraph_Timeout* timer)
{
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    if(parsegraph_timediffMs(&now, &timer->startTime) <= timer->timeoutMs) {
        // Not timed out yet.
        return;
    }

    // Report the timeout.
    if(timer->name) {
        parsegraph_die("Timeout '%s' after %d msecs exceeded.", timer->name, timer->timeoutMs);
    }
    parsegraph_die("Timeout after %d msecs exceeded.", timer->timeoutMs);
}

void parsegraph_clear_timeout(parsegraph_Timeout* timer)
{
    free(timer);
}

parsegraph_AnimationTimer* parsegraph_AnimationTimer_new(parsegraph_Surface* surface)
{
    parsegraph_AnimationTimer* timer = malloc(sizeof(*timer));
    timer->timerId = 0;
    timer->surface = surface;
    return timer;
};

void parsegraph_AnimationTimer_destroy(parsegraph_AnimationTimer* timer)
{
    parsegraph_AnimationTimer_cancel(timer);
    free(timer);
}

static void parsegraph_AnimationTimer_fire(void* data, float elapsed)
{
    parsegraph_AnimationTimer* timer = data;
    timer->timerId = 0;
    if(timer->listener) {
        timer->listener(timer->listenerThisArg, elapsed);
    }
}

void parsegraph_AnimationTimer_schedule(parsegraph_AnimationTimer* timer)
{
    // Do nothing if the timer is already scheduled.
    if(timer->timerId) {
        return;
    }

    //console.log(new Error("Scheduling animation timer."));
    timer->timerId = parsegraph_Surface_addAnimationCallback(timer->surface, parsegraph_AnimationTimer_fire, timer);
};

void parsegraph_AnimationTimer_setListener(parsegraph_AnimationTimer* timer, void(*listener)(void*, float), void* thisArg)
{
    if(!listener) {
        timer->listener = 0;
        return;
    }

    timer->listener = listener;
    timer->listenerThisArg = thisArg;
};

void parsegraph_AnimationTimer_cancel(parsegraph_AnimationTimer* timer)
{
    if(!timer->timerId) {
        return;
    }

    parsegraph_Surface_removeAnimationCallback(timer->surface, timer->timerId);
    timer->timerId = 0;
};

parsegraph_TimeoutTimer* parsegraph_TimeoutTimer_new(parsegraph_Surface* surface)
{
    parsegraph_TimeoutTimer* timer = malloc(sizeof(*timer));
    timer->surface = surface;
    timer->delay = 0;
    timer->timerId = 0;

    return timer;
};

void parsegraph_TimeoutTimer_destroy(parsegraph_TimeoutTimer* timer)
{
    parsegraph_TimeoutTimer_cancel(timer);
    free(timer);
}

static void parsegraph_TimeoutTimer_fire(void* data)
{
    parsegraph_TimeoutTimer* timer = data;
    timer->timerId = 0;
    if(timer->listener) {
        timer->listener(timer->listenerThisArg);
    }
}

void parsegraph_TimeoutTimer_setDelay(parsegraph_TimeoutTimer* timer, int ms)
{
    timer->delay = ms;
};

int parsegraph_TimeoutTimer_delay(parsegraph_TimeoutTimer* timer)
{
    return timer->delay;
};

void parsegraph_TimeoutTimer_schedule(parsegraph_TimeoutTimer* timer)
{
    if(timer->timerId) {
        return;
    }

    timer->timerId = parsegraph_setTimeout(timer->surface, parsegraph_TimeoutTimer_fire, timer->delay, timer);
}

void parsegraph_TimeoutTimer_setListener(parsegraph_TimeoutTimer* timer, void(*listener)(void*), void* thisArg)
{
    if(!listener) {
        timer->listener = 0;
        return;
    }
    if(!thisArg) {
        thisArg = timer;
    }
    timer->listener = listener;
    timer->listenerThisArg = thisArg;
}

void parsegraph_TimeoutTimer_cancel(parsegraph_TimeoutTimer* timer)
{
    if(timer->timerId) {
        parsegraph_clearTimeout(timer->surface, timer->timerId);
        timer->timerId = 0;
    }
};

parsegraph_IntervalTimer* parsegraph_IntervalTimer_new(parsegraph_Surface* surface)
{
    parsegraph_IntervalTimer* timer = malloc(sizeof(*timer));

    timer->delay = 0;
    timer->timerId = 0;
    timer->surface = surface;

    return timer;
};

/**
 * Sets the delay, in milliseconds.
 */
void parsegraph_IntervalTimer_setDelay(parsegraph_IntervalTimer* timer, int ms)
{
    timer->delay = ms;
};

/**
 * Gets the delay, in milliseconds.
 */
int parsegraph_IntervalTimer_delay(parsegraph_IntervalTimer* timer)
{
    return timer->delay;
};

static void parsegraph_IntervalTimer_fire(void* data)
{
    parsegraph_IntervalTimer* timer = data;
    if(timer->listener) {
        timer->listener(timer->listenerThisArg);
    }
}

void parsegraph_IntervalTimer_schedule(parsegraph_IntervalTimer* timer)
{
    if(timer->timerId) {
        return;
    }

    timer->timerId = parsegraph_setInterval(timer->surface, parsegraph_IntervalTimer_fire, timer->delay, timer);
};

void parsegraph_IntervalTimer_setListener(parsegraph_IntervalTimer* timer, void(*listener)(void*), void* thisArg)
{
    if(!listener) {
        timer->listener = 0;
        return;
    }
    if(!thisArg) {
        thisArg = timer;
    }
    timer->listener = listener;
    timer->listenerThisArg = thisArg;
}

void parsegraph_IntervalTimer_cancel(parsegraph_IntervalTimer* timer)
{
    if(timer->timerId) {
        parsegraph_clearInterval(timer->surface, timer->timerId);
        timer->timerId = 0;
    }
}
