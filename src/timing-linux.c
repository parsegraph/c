#include "timing.h"
#include "graph/Surface.h"
#include <signal.h>
#include <stdlib.h>
#include <time.h>
#include "die.h"
#include <pthread.h>

struct TimerData {
void* callback;
parsegraph_Surface* surface;
timer_t timer;
pthread_attr_t tattr;
void(*listener)(void*);
void* data;
};

static void
animationhandler(void* data, float elapsed)
{
    struct TimerData* td = data;
    td->callback = 0;
    td->listener(td->data);
}

static void
handler(union sigval data)
{
    struct TimerData* td = data.sival_ptr;
    td->callback = parsegraph_Surface_addAnimationCallback(td->surface, animationhandler, td);
    parsegraph_Surface_scheduleRepaint(td->surface);
}

static struct TimerData* createTimer(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data, int repeat)
{
    struct TimerData* td = malloc(sizeof(*td));
    td->surface = surface;
    td->listener = listener;
    td->data = data;
    td->callback = 0;

    if(pthread_attr_init(&td->tattr) != 0) {
        parsegraph_die("Failed to create timer thread attribute");
    }

    /* Create the timer */
    struct sigevent sev;
    sev.sigev_notify = SIGEV_THREAD;
    sev.sigev_notify_function = handler;
    sev.sigev_value.sival_ptr = td;
    sev.sigev_notify_attributes = &td->tattr;
    if(timer_create(CLOCK_REALTIME, &sev, &td->timer) == -1) {
        parsegraph_die("Failed to create timer");
    }

    /* Start the timer */
    struct itimerspec its;
    long long freq_nanosecs = durMs * 1000000;
    its.it_value.tv_sec = freq_nanosecs / 1000000000;
    its.it_value.tv_nsec = freq_nanosecs % 1000000000;
    if(repeat) {
        its.it_interval.tv_sec = its.it_value.tv_sec;
        its.it_interval.tv_nsec = its.it_value.tv_nsec;
    }
    else {
        its.it_interval.tv_sec = 0;
        its.it_interval.tv_nsec = 0;
    }
    if(timer_settime(td->timer, 0, &its, NULL) == -1) {
        parsegraph_die("Failed to set timer time");
    }

    return td;
}

void* parsegraph_setTimeout(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data)
{
    return createTimer(surface, listener, durMs, data, 0);
}

void parsegraph_clearTimeout(parsegraph_Surface* surface, void* timer)
{
    struct TimerData* td = timer;
    if(td->callback) {
        parsegraph_Surface_removeAnimationCallback(surface, td->callback);
    }
    if(0 != timer_delete(td->timer)) {
        parsegraph_die("Failed to end timer");
    }
    free(td);
}

void* parsegraph_setInterval(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data)
{
    return createTimer(surface, listener, durMs, data, 0);
}

void parsegraph_clearInterval(parsegraph_Surface* surface, void* timer)
{
    parsegraph_clearTimeout(surface, timer);
}
