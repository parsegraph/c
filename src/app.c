#include "app.h"
#include "graph/initialize.h"
#include "graph/Input.h"
#include "parsegraph_LoginWidget.h"
#include "die.h"
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include "graph/log.h"

parsegraph_Application* parsegraph_Application_new(apr_pool_t* pool, const char* guid)
{
    parsegraph_Application* app;
    app = apr_palloc(pool, sizeof(*app));
    app->pool = pool;
    app->_cameraName = "parsegraph_login_camera";
    app->_guid = guid ? guid : "Rainback";
    app->_graph = 0;

    app->_idleFunc = 0;
    app->_idleFuncThisArg = 0;
    app->_closeFunc = 0;
    app->_closeFuncThisArg = 0;
    app->_renderTimer = 0;
    app->_mathMode = 0;
    app->_renderedMouse = 0;
    clock_gettime(CLOCK_MONOTONIC, &app->_appStartTime);
    app->_lastIdle = app->_appStartTime;

    app->_governor = -1;
    app->_burstIdle = -1;
    app->_interval = -1;
    app->_cameraState.cameraX = 0;
    app->_cameraState.cameraY = 0;
    app->_cameraState.scale = 1;
    return app;
}

void parsegraph_Application_setMathMode(parsegraph_Application* app, int mathMode)
{
    app->_mathMode = mathMode;
}

void parsegraph_Application_setGovernor(parsegraph_Application* app, int governor)
{
    app->_governor = governor;
}

void parsegraph_Application_setBurstIdle(parsegraph_Application* app, int burstIdle)
{
    app->_burstIdle = burstIdle;
}

void parsegraph_Application_setInterval(parsegraph_Application* app, int interval)
{
    app->_interval = interval;
}

static void onUnicodeLoaded(void* pApp, parsegraph_Unicode* unicode)
{
    parsegraph_Application* app = pApp;
    parsegraph_log("Time till unicode loaded: %d\n", parsegraph_elapsed(&app->_appStartTime));
    parsegraph_Application_onUnicodeLoaded(app);
}

parsegraph_ArrayList* parsegraph_Application_args(parsegraph_Application* app)
{
    return app->_arguments;
}

void parsegraph_Application_start(parsegraph_Application* app, void* peer, int w, int h, parsegraph_ArrayList* args, void(*initFunc)(void*, parsegraph_Application*, parsegraph_UserLogin*, parsegraph_Node*), void* initFuncThisArg)
{
    // Always immediately initialize constants for use by application objects.
    parsegraph_initialize(app->pool, app->_mathMode);
    if(app->_governor == -1) {
        app->_governor = parsegraph_GOVERNOR;
    }
    if(app->_burstIdle == -1) {
        app->_burstIdle = parsegraph_BURST_IDLE;
    }
    if(app->_interval == -1) {
        app->_interval = parsegraph_INTERVAL;
    }

    app->_arguments = args;

    // Create and globalize the graph.
    app->_surface = parsegraph_Surface_new(app->pool, peer);
    parsegraph_Surface_setDisplaySize(app->_surface, w, h);
    app->_cameraState.width = w;
    app->_cameraState.height = h;
    app->_graph = parsegraph_Graph_new(app->_surface);
    app->_glyphAtlas = 0;

    // Start initializing by loading Unicode for text.
    app->_unicode = parsegraph_Unicode_new(app->pool);
    app->_initFunc = initFunc;
    app->_initFuncThisArg = initFuncThisArg;

    parsegraph_Unicode_setOnLoad(app->_unicode, onUnicodeLoaded, app);
    // Export the Unicode instance.
    parsegraph_Unicode_load(app->_unicode, 0);
}

void parsegraph_Application_onLogout(parsegraph_Application* app)
{
    //parsegraph_log("onLogout\n");
    parsegraph_Node_disconnectNode(app->_loginNode, parsegraph_DOWNWARD);
    app->_userLogin = 0;
    app->_loginNode = 0;
}

void parsegraph_Application_onLogin(parsegraph_Application* app, parsegraph_UserLogin* userLogin, parsegraph_Node* loginNode)
{
    app->_userLogin = userLogin;
    app->_loginNode = loginNode;

    if(!app->_initFunc) {
        return;
    }
    app->_initFunc(app->_initFuncThisArg, app, userLogin, loginNode);
    parsegraph_Application_scheduleRepaint(app);
}

const char* parsegraph_Application_username(parsegraph_Application* app)
{
    if(!app->_userLogin) {
        return 0;
    }
    return app->_userLogin->username;
}

static void onLogout(void* data, parsegraph_LoginResult* res, parsegraph_Node* node)
{
    parsegraph_Application_onLogout(data);
}

static void onLogin(void* data, parsegraph_LoginResult* res, parsegraph_UserLogin* userLogin, parsegraph_Node* node)
{
    parsegraph_Application* app = data;
    parsegraph_log("Time till authenticated: %d", parsegraph_elapsed(&app->_appStartTime));
    parsegraph_Application_onLogin(app, userLogin, node);
    parsegraph_LoginWidget_setLogoutListener(app->_loginWidget, onLogout, app);
}

static void onRender(void* data, float elapsed)
{
    parsegraph_Application* app = data;
    parsegraph_Application_onRender(app);
}

static void onInput(parsegraph_Input* input, int affectedPaint, const char* eventSource, int inputAffectedCamera, void* data)
{
    parsegraph_Application* app = data;
    if(affectedPaint) {
        parsegraph_Graph_scheduleRepaint(app->_graph);
    }
    parsegraph_Application_scheduleRender(app);
    //if(app->_cameraProtocol) {
        //parsegraph_CameraProtocol_update(app->_cameraProtocol);
    //}
    if(inputAffectedCamera) {
        if(app->_cameraName) {
            parsegraph_Camera_saveState(parsegraph_Graph_camera(app->_graph), &app->_cameraState);
            parsegraph_Application_saveCamera(app);
        }
    }
}

static void onScheduleRepaint(void* data)
{
    parsegraph_Application* app = data;
    parsegraph_Application_scheduleRender(app);
}

void parsegraph_Application_onUnicodeLoaded(parsegraph_Application* app)
{
    //console.log("Unicode loaded")
    // Verify preconditions for this application state.
    parsegraph_Graph* graph = app->_graph;
    parsegraph_Surface* surface = parsegraph_Application_surface(app);
    parsegraph_Unicode* uni = parsegraph_Application_unicode(app);
    if(!graph) {
        parsegraph_die("A graph must have already been constructed.");
    }
    if(!surface) {
        parsegraph_die("A surface must have already been constructed.");
    }
    if(!uni) {
        parsegraph_die("A Unicode object must have already been constructed.");
    }
    parsegraph_UNICODE_INSTANCE = uni;

    // Create and set the glyph atlas if necessary.
    if(!app->_glyphAtlas) {
        app->_glyphAtlas = parsegraph_buildGlyphAtlas(app->pool);
        parsegraph_Graph_setGlyphAtlas(graph, app->_glyphAtlas);
        parsegraph_GlyphAtlas_setUnicode(app->_glyphAtlas, uni);
    }

    app->_loginWidget = parsegraph_LoginWidget_new(surface, graph);
    parsegraph_LoginWidget_setTitle(app->_loginWidget, app->_guid);
    parsegraph_Node* loginRoot = parsegraph_LoginWidget_root(app->_loginWidget);
    parsegraph_World_plot(parsegraph_Graph_world(graph), loginRoot, 0, 0, 1);
    parsegraph_LoginWidget_setLoginListener(app->_loginWidget, onLogin, app);

    if(app->_cameraName) {
        parsegraph_Camera_restoreState(parsegraph_Graph_camera(graph), &app->_cameraState);
    }
    else {
        parsegraph_Node_showInCamera(loginRoot, parsegraph_Graph_camera(graph), 0);
    }

    // Schedule the repaint.
    app->_renderTimer = parsegraph_AnimationTimer_new(app->_surface);
    struct timespec start;
    clock_gettime(CLOCK_MONOTONIC, &start);

    parsegraph_AnimationTimer_setListener(app->_renderTimer, onRender, app);
    parsegraph_Input_SetListener(parsegraph_Graph_input(app->_graph), onInput, app);
    parsegraph_Application_scheduleRender(app);
    parsegraph_Graph_setOnScheduleRepaint(app->_graph, onScheduleRepaint, app);
    parsegraph_LoginWidget_authenticate(app->_loginWidget);
}

parsegraph_Input* parsegraph_Application_input(parsegraph_Application* app)
{
    return parsegraph_Graph_input(app->_graph);
}

void parsegraph_Application_onRender(parsegraph_Application* app)
{
    parsegraph_Graph* graph = parsegraph_Application_graph(app);
    parsegraph_Surface* surface = parsegraph_Application_surface(app);

    struct timespec startTime;
    clock_gettime(CLOCK_MONOTONIC, &startTime);
    int inputChangedScene = parsegraph_Input_Update(parsegraph_Graph_input(graph), &startTime);

    int interval = app->_interval;
    if(inputChangedScene) {
        //parsegraph_log("Input changed scene\n");
    }
    if(!inputChangedScene) {
        inputChangedScene = parsegraph_Graph_needsRepaint(graph);
        if(inputChangedScene) {
            if(parsegraph_World_needsRepaint(parsegraph_Graph_world(graph))) {
                //parsegraph_log("World needs repaint\n");
            }
            else {
                //parsegraph_log("Graph needs repaint\n");
            }
        }
    }
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    if(!inputChangedScene) {
        inputChangedScene = app->_renderedMouse != parsegraph_Input_mouseVersion(input);
        if(inputChangedScene) {
            //parsegraph_log("Mouse changed scene\n");
        }
    }
    if(!inputChangedScene) {
        if(parsegraph_Input_UpdateRepeatedly(input)) {
            //parsegraph_log("Input updating repeatedly\n");
        }
    }
    if(parsegraph_Graph_needsRepaint(graph)) {
        //parsegraph_log("Repainting");
        parsegraph_Surface_paint(surface, 0, interval);
    }
    if(parsegraph_Input_UpdateRepeatedly(input) || inputChangedScene) {
        parsegraph_Surface_render(surface, 0);
        app->_renderedMouse = parsegraph_Input_mouseVersion(input);
    }
    else {
        //parsegraph_log("Avoid rerender\n");
    }
    interval = interval - parsegraph_IDLE_MARGIN;
    if(app->_idleFunc
        && parsegraph_elapsed(&startTime) < interval
        && (!app->_governor || parsegraph_elapsed(&app->_lastIdle) > interval)
    ) {
        //parsegraph_log("Idle looping\n");
        do {
            //parsegraph_log("Idling\n");
            int r = app->_idleFunc(app->_idleFuncThisArg, interval - parsegraph_elapsed(&startTime));
            if(!r) {
                parsegraph_Application_onIdle(app, 0, 0);
            }
        } while(app->_burstIdle && interval - parsegraph_elapsed(&startTime) > 0 && app->_idleFunc);
        if(app->_idleFunc && app->_governor) {
            clock_gettime(CLOCK_MONOTONIC, &app->_lastIdle);
        }
    }
    if(parsegraph_Input_UpdateRepeatedly(input) || parsegraph_Graph_needsRepaint(graph) || app->_idleFunc) {
        //if(app->_cameraProtocol && parsegraph_Input_UpdateRepeatedly(input)) {
            //parsegraph_CameraProtocol_update(app->_cameraProtocol);
        //}
        parsegraph_AnimationTimer_schedule(app->_renderTimer);
    }
    //parsegraph_log("Done rendering in %dms\n", parsegraph_elapsed(&startTime));
}

void parsegraph_Application_onIdle(parsegraph_Application* app, int(*idleFunc)(void*, int), void* idleFuncThisArg)
{
    app->_idleFunc = idleFunc;
    app->_idleFuncThisArg = idleFuncThisArg;
}

parsegraph_Graph* parsegraph_Application_graph(parsegraph_Application* app)
{
    return app->_graph;
}

parsegraph_Unicode* parsegraph_Application_unicode(parsegraph_Application* app)
{
    return app->_unicode;
}

parsegraph_Surface* parsegraph_Application_surface(parsegraph_Application* app)
{
    return app->_surface;
}

parsegraph_GlyphAtlas* parsegraph_Application_glyphAtlas(parsegraph_Application* app)
{
    return app->_glyphAtlas;
}

void parsegraph_Application_scheduleRepaint(parsegraph_Application* app)
{
    parsegraph_Graph_scheduleRepaint(app->_graph);
}

void parsegraph_Application_scheduleRender(parsegraph_Application* app)
{
    if(app->_renderTimer) {
        parsegraph_AnimationTimer_schedule(app->_renderTimer);
    }
}

const char* parsegraph_Application_cameraName(parsegraph_Application* app)
{
    return app->_cameraName;
}

void parsegraph_Application_setCameraName(parsegraph_Application* app, const char* name)
{
    if(strstr(name, "/") || strstr(name, "\\")) {
        parsegraph_die("Invalid camera name");
    }
    app->_cameraName = name;
    char buf[PATH_MAX];
    snprintf(buf, PATH_MAX, "%s/.rainback/%s.camera", getenv("HOME"), name);
    int fd = open(buf, O_RDONLY);
    if(fd < 0) {
        return;
    }
    char cambuf[2048];
    read(fd, cambuf, sizeof(cambuf));
    char* tokptr;
    char* token = strtok_r(cambuf, "\n", &tokptr);
    if(!token) {
        parsegraph_die("Failed to parse camera X");
    }
    app->_cameraState.cameraX = atof(token);
    token = strtok_r(cambuf, "\n", &tokptr);
    if(!token) {
        parsegraph_die("Failed to parse camera Y");
    }
    app->_cameraState.cameraY = atof(token);
    token = strtok_r(cambuf, "\n", &tokptr);
    if(!token) {
        parsegraph_die("Failed to parse camera scale");
    }
    app->_cameraState.scale = atof(token);
    token = strtok_r(cambuf, "\n", &tokptr);
    if(!token) {
        parsegraph_die("Failed to parse camera width");
    }
    app->_cameraState.width = atoi(token);
    token = strtok_r(cambuf, "\n", &tokptr);
    if(!token) {
        parsegraph_die("Failed to parse camera height");
    }
    app->_cameraState.height = atoi(token);
    close(fd);
}

void parsegraph_Application_saveCamera(parsegraph_Application* app)
{
    if(!app->_cameraName) {
        return;
    }
    char buf[PATH_MAX];
    snprintf(buf, PATH_MAX, "%s/.rainback/%s.camera", getenv("HOME"), app->_cameraName);
    int fd = open(buf, O_WRONLY | O_CREAT);
    if(fd < 0) {
        return;
    }
    parsegraph_CameraState* cameraState = &app->_cameraState;
    char cambuf[2048];
    int len = snprintf(cambuf, sizeof(cambuf), "%f\n%f\n%f\n%d\n%d\n",
        cameraState->cameraX,
        cameraState->cameraY,
        cameraState->scale,
        cameraState->width,
        cameraState->height
    );
    write(fd, cambuf, len);
    close(fd);
}

void parsegraph_Application_setOnClose(parsegraph_Application* app, void(*closeFunc)(void*, parsegraph_Application*), void* closeFuncThisArg)
{
    app->_closeFunc = closeFunc;
    app->_closeFuncThisArg = closeFuncThisArg;
}

void parsegraph_Application_close(parsegraph_Application* app)
{
    if(app->_closeFunc) {
        app->_closeFunc(app->_closeFuncThisArg, app);
    }
    parsegraph_ArrayList_destroy(app->_arguments);
}

const char* parsegraph_Application_guid(parsegraph_Application* app)
{
    return app->_guid;
}
