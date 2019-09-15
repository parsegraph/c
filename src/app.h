#ifndef parsegraph_Application_INCLUDED
#define parsegraph_Application_INCLUDED

#include <time.h>
#include "graph/Graph.h"
#include "graph/Camera.h"
#include "timing.h"
#include "graph/GlyphAtlas.h"
#include "unicode.h"

struct parsegraph_Application {
apr_pool_t* pool;
struct timespec _appStartTime;
struct timespec _lastIdle;
int _interval;
parsegraph_Graph* _graph;
const char* _cameraName;
int(*_idleFunc)(void*, int);
void* _idleFuncThisArg;
void(*_closeFunc)(void*, struct parsegraph_Application*);
void* _closeFuncThisArg;
int _governor;
int _burstIdle;
parsegraph_CameraState _cameraState;
parsegraph_ArrayList* _arguments;
parsegraph_AnimationTimer* _renderTimer;
parsegraph_Surface* _surface;
parsegraph_GlyphAtlas* _glyphAtlas;
parsegraph_Unicode* _unicode;
parsegraph_Node* _root;
void(*_initFunc)(void*, struct parsegraph_Application*, parsegraph_Node*);
void* _initFuncThisArg;
int _renderedMouse;
};
typedef struct parsegraph_Application parsegraph_Application;

parsegraph_Application* parsegraph_Application_new(apr_pool_t* pool);
void parsegraph_Application_setGovernor(parsegraph_Application* app, int governor);
void parsegraph_Application_setBurstIdle(parsegraph_Application* app, int burstIdle);
void parsegraph_Application_setInterval(parsegraph_Application* app, int interval);
parsegraph_ArrayList* parsegraph_Application_args(parsegraph_Application* app);
void parsegraph_Application_start(parsegraph_Application* app, void* peer, int w, int h, parsegraph_ArrayList* args, void(*initFunc)(void*, parsegraph_Application*, parsegraph_Node*), void* initFuncThisArg);
void parsegraph_Application_onUnicodeLoaded(parsegraph_Application* app);
void parsegraph_Application_onRender(parsegraph_Application* app);
void parsegraph_Application_onIdle(parsegraph_Application* app, int(*idleFunc)(void*, int), void* idleFuncThisArg);
parsegraph_Graph* parsegraph_Application_graph(parsegraph_Application* app);
parsegraph_Unicode* parsegraph_Application_unicode(parsegraph_Application* app);
parsegraph_Surface* parsegraph_Application_surface(parsegraph_Application* app);
parsegraph_GlyphAtlas* parsegraph_Application_glyphAtlas(parsegraph_Application* app);
void parsegraph_Application_scheduleRepaint(parsegraph_Application* app);
void parsegraph_Application_scheduleRender(parsegraph_Application* app);
const char* parsegraph_Application_cameraName(parsegraph_Application* app);
void parsegraph_Application_setCameraName(parsegraph_Application* app, const char* name);
void parsegraph_Application_saveCamera(parsegraph_Application* app);
void parsegraph_Application_setOnClose(parsegraph_Application* app, void(*closeFunc)(void*, parsegraph_Application*), void* closeFuncThisArg);
void parsegraph_Application_close(parsegraph_Application* app);
parsegraph_Input* parsegraph_Application_input(parsegraph_Application* app);

#endif // parsegraph_Application_INCLUDED
