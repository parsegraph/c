#ifndef parsegraph_timing_INCLUDED
#define parsegraph_timing_INCLUDED

#include <time.h>

struct parsegraph_Timeout {
char name[256];
int timeoutMs;
struct timespec startTime;
};
typedef struct parsegraph_Timeout parsegraph_Timeout;

struct parsegraph_Surface;
typedef struct parsegraph_Surface parsegraph_Surface;

long parsegraph_timediffMs(struct timespec* a, struct timespec* b);
void* parsegraph_setTimeout(parsegraph_Surface*, void(*listener)(void*), int durMs, void* data);
void parsegraph_clearTimeout(parsegraph_Surface*, void* timer);
void parsegraph_clearInterval(parsegraph_Surface* surface, void* timer);
void* parsegraph_setInterval(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data);

parsegraph_Timeout* parsegraph_timeout(const char* name, int timeoutMs);
void parsegraph_check_timeout(parsegraph_Timeout* timer);
void parsegraph_clear_timeout(parsegraph_Timeout* timer);
extern int parsegraph_TIMEOUT;

struct parsegraph_AnimationTimer {
void* timerId;
parsegraph_Surface* surface;
void(*listener)(void*, float);
void* listenerThisArg;
};
typedef struct parsegraph_AnimationTimer parsegraph_AnimationTimer;
parsegraph_AnimationTimer* parsegraph_AnimationTimer_new(parsegraph_Surface*);
void parsegraph_AnimationTimer_destroy(parsegraph_AnimationTimer* timer);
void parsegraph_AnimationTimer_schedule(parsegraph_AnimationTimer* timer);
void parsegraph_AnimationTimer_setListener(parsegraph_AnimationTimer* timer, void(*listener)(void*, float), void* thisArg);
void parsegraph_AnimationTimer_cancel(parsegraph_AnimationTimer* timer);

struct parsegraph_TimeoutTimer {
parsegraph_Surface* surface;
void* timerId;
int delay;
void(*listener)(void*);
void* listenerThisArg;
};
typedef struct parsegraph_TimeoutTimer parsegraph_TimeoutTimer;

parsegraph_TimeoutTimer* parsegraph_TimeoutTimer_new(parsegraph_Surface*);
void parsegraph_TimeoutTimer_setDelay(parsegraph_TimeoutTimer* timer, int ms);
void parsegraph_TimeoutTimer_destroy(parsegraph_TimeoutTimer* timer);
int parsegraph_TimeoutTimer_delay(parsegraph_TimeoutTimer* timer);
void parsegraph_TimeoutTimer_schedule(parsegraph_TimeoutTimer* timer);
void parsegraph_TimeoutTimer_setListener(parsegraph_TimeoutTimer* timer, void(*listener)(void*), void* thisArg);
void parsegraph_TimeoutTimer_cancel(parsegraph_TimeoutTimer* timer);

struct parsegraph_IntervalTimer {
parsegraph_Surface* surface;
void* timerId;
int delay;
void(*listener)(void*);
void* listenerThisArg;
};
typedef struct parsegraph_IntervalTimer parsegraph_IntervalTimer;

parsegraph_IntervalTimer* parsegraph_IntervalTimer_new(parsegraph_Surface*);
void parsegraph_IntervalTimer_setDelay(parsegraph_IntervalTimer* timer, int ms);
int parsegraph_IntervalTimer_delay(parsegraph_IntervalTimer* timer);
void parsegraph_IntervalTimer_schedule(parsegraph_IntervalTimer* timer);
void parsegraph_IntervalTimer_setListener(parsegraph_IntervalTimer* timer, void(*listener)(void*), void* thisArg);
void parsegraph_IntervalTimer_cancel(parsegraph_IntervalTimer* timer);

#endif // parsegraph_timing_INCLUDED
