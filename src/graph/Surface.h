#ifndef parsegraph_Surface_INCLUDED
#define parsegraph_Surface_INCLUDED

#include <apr_pools.h>
#include <pthread.h>

struct parsegraph_Input;
typedef struct parsegraph_Input parsegraph_Input;

struct apr_pool_t;
struct parsegraph_SurfacePainter {
void(*painter)(void*, void*);
void* data;
struct parsegraph_SurfacePainter* next;
};
typedef struct parsegraph_SurfacePainter parsegraph_SurfacePainter;

struct parsegraph_SurfaceRenderer {
void(*renderer)(void*, void*);
void* data;
struct parsegraph_SurfaceRenderer* next;
};
typedef struct parsegraph_SurfaceRenderer parsegraph_SurfaceRenderer;

struct parsegraph_AnimationCallback {
int active;
void(*listener)(void*, float);
void* listenerThisArg;
struct parsegraph_AnimationCallback* next;
};
typedef struct parsegraph_AnimationCallback parsegraph_AnimationCallback;

struct parsegraph_Surface {
pthread_mutex_t lock;
parsegraph_AnimationCallback* firstAnimationCallback;
parsegraph_AnimationCallback* lastAnimationCallback;
parsegraph_Input* input;
float displayWidth;
float displayHeight;
void* peer;
struct apr_pool_t* pool;
float backgroundColor[4];
int pendingRender;
struct parsegraph_SurfacePainter* first_painter;
struct parsegraph_SurfacePainter* last_painter;
struct parsegraph_SurfaceRenderer *first_renderer;
struct parsegraph_SurfaceRenderer *last_renderer;
};
typedef struct parsegraph_Surface parsegraph_Surface;

parsegraph_Surface* parsegraph_Surface_new(apr_pool_t*, void*);
parsegraph_AnimationCallback* parsegraph_Surface_addAnimationCallback(parsegraph_Surface* surface, void(*listener)(void*, float), void* thisArg);
void parsegraph_Surface_removeAnimationCallback(parsegraph_Surface* surface, parsegraph_AnimationCallback* given);
void parsegraph_Surface_runAnimationCallbacks(parsegraph_Surface* surface, float elapsed);
void parsegraph_Surface_destroy(parsegraph_Surface* surface);
void parsegraph_Surface_setDisplaySize(parsegraph_Surface* surface, float w, float h);

void parsegraph_Surface_addPainter(parsegraph_Surface* surface, void(*painter)(void*, void*), void* data);
void parsegraph_Surface_addRenderer(parsegraph_Surface* surface, void(*renderer)(void*, void*), void* data);
void parsegraph_Surface_paint(parsegraph_Surface* surface, void* arg);
void parsegraph_Surface_setBackground(parsegraph_Surface* surface, float* bg);
float* parsegraph_Surface_backgroundColor(parsegraph_Surface* surface);
int parsegraph_Surface_canProject(parsegraph_Surface* surface);
void parsegraph_Surface_render(parsegraph_Surface* surface, void* arg);
void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface);
float parsegraph_Surface_getWidth(parsegraph_Surface* surface);
float parsegraph_Surface_getHeight(parsegraph_Surface* surface);
void parsegraph_Surface_install(parsegraph_Surface* surface, parsegraph_Input* input);
void parsegraph_Surface_uninstall(parsegraph_Surface* surface);

#endif // parsegraph_Surface_INCLUDED
