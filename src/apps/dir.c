#include <stdio.h>
#include "graph/Surface.h"
#include "graph/log.h"
#include "unicode.h"
#include "die.h"
#include "graph/Input.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include "timing.h"
#include <stdio.h>
#include "graph/Surface.h"
#include "unicode.h"
#include "die.h"
#include "graph/Input.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include "apps/showDirectory.h"
#include "timing.h"
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <dirent.h>
#include <dlfcn.h>
#include <stdlib.h>

struct {
apr_pool_t* pool;
parsegraph_Graph* graph;
parsegraph_AnimationTimer* renderTimer;
int argc;
const char* const* argv;
parsegraph_Directory* app;
} app;

static void renderTimerCallback(void* data, float elapsed)
{
    parsegraph_Graph* graph = app.graph;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Input_Update(input, now);
    if(parsegraph_Graph_needsRepaint(graph)) {
        parsegraph_Surface_paint(surface, (void*)(long)30);
    }
    //if(parsegraph_glBufferData_BYTES > 0) {
        //console.log("Wrote " + parsegraph_glBufferData_BYTES + " in pagingbuffer");
        //parsegraph_clearPerformanceCounters();
    //}
    //parsegraph_Surface_render(surface, 0);
    if(parsegraph_Input_UpdateRepeatedly(input) || parsegraph_Graph_needsRepaint(graph)) {
        //fprintf(stderr, "Scheduling because of input(%d) or graph(%d)\n", parsegraph_Input_UpdateRepeatedly(input), parsegraph_Graph_needsRepaint(graph));
        parsegraph_AnimationTimer_schedule(app.renderTimer);
    }
}

static void inputListener(parsegraph_Input* input, int affectedPaint, const char* eventSource, int affectedCamera, void* extra)
{
    if(affectedPaint) {
        parsegraph_Graph_scheduleRepaint(app.graph);
    }
    parsegraph_AnimationTimer_schedule(app.renderTimer);
    parsegraph_Surface_scheduleRepaint(parsegraph_Graph_surface(app.graph));
}

static int showTextFile(parsegraph_Directory* app, parsegraph_Caret* caret, void* thisArg, const char* parent, const char* filename)
{
    const char* extension = strrchr(filename, '.');
    if(extension && extension[1] != 0) {
        extension = extension + 1;
        if(
            strcmp(extension, "txt") && strcmp(extension, "h") && strcmp(extension, "c") &&
            strcmp(extension, "cpp") && strcmp(extension, "hpp") && strcmp(extension, "js") &&
            strcmp(extension, "log") && strcmp(extension, "html") && strcmp(extension, "lua") &&
            strcmp(extension, "xml")
        ) {
            return 0;
        }
    }
    else {
        return 0;
    }

    char buf[PATH_MAX + 1];
    memset(buf, 0, sizeof(buf));
    strcat(buf, parent);
    strcat(buf, "/");
    strcat(buf, filename);
    int fd = open(buf, O_RDONLY);
    if(fd < 0) {
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
        parsegraph_Caret_label(caret, strerror(errno), 0, 0);
        parsegraph_Caret_move(caret, "u");
        return 1;
    }

    int wanted = PATH_MAX;
    memset(buf, 0, sizeof(buf));
    int nread = read(fd, buf, wanted);
    if(nread < 0) {
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
        parsegraph_Caret_label(caret, strerror(errno), 0, 0);
        parsegraph_Caret_move(caret, "u");
        return 1;
    }
    close(fd);

    parsegraph_Caret_spawnMove(caret, "d", "b", 0);
    //parsegraph_log(buf);
    //snprintf(buf, sizeof(buf)-1, "%d", nread);
    parsegraph_Caret_label(caret, buf, 0, 0);
    parsegraph_Caret_move(caret, "u");

    return 1;
}

static void loadModules(const char* path)
{
    parsegraph_log("Loading modules from %s\n", path);
    char* olddir = 0;
    {
        int n = 1;
        olddir = malloc(PATH_MAX+1);
        while(!getcwd(olddir, n*PATH_MAX+1)) {
            if(errno == ENAMETOOLONG) {
                ++n;
                olddir = realloc(olddir, n*PATH_MAX+1);
            }
            else {
                parsegraph_log("Failed to save old directory\n");
                return;
            }
        }
    }

    DIR* userfd = opendir(path);
    if(!userfd) {
        return;
    }
    if(0 != chdir(path)) {
        parsegraph_log("Failed to change directory to %s: %s\n", path, strerror(errno));
        closedir(userfd);
        free(olddir);
        return;
    }
    struct dirent* d = 0;
    while(0 != (d = readdir(userfd))) {
        parsegraph_log("Found file %s\n", d->d_name);
        if(!strcmp(".", d->d_name) || !strcmp("..", d->d_name)) {
            continue;
        }
        char* dot = strrchr(d->d_name, '.');
        if(!dot) {
            continue;
        }
        const char* extension = dot + 1;
        if(!extension) {
            continue;
        }
        if(strcmp(extension, "so")) {
            continue;
        }
        char moduleName[PATH_MAX+1];
        memset(moduleName, 0, sizeof(moduleName));
        strcat(moduleName, path);
        strcat(moduleName, "/");
        strcat(moduleName, d->d_name);
        parsegraph_log("Found module %s\n", moduleName);
        void* handle = dlopen(moduleName, RTLD_LAZY);
        if(handle) {
            void* init = dlsym(handle, "rainback_init");
            if(!init) {
                parsegraph_log("Did not find rainback_init for %s\n", moduleName);
                continue;
            }
            void(*initFunc)(parsegraph_Directory*) = init;
            initFunc(app.app);
        }
        else {
            parsegraph_log("Error while loading module: %s\n", dlerror());
        }
    }
    closedir(userfd);
    chdir(olddir);
    free(olddir);
}

static void onUnicodeLoaded(void* data, parsegraph_Unicode* uni)
{
    parsegraph_Graph* graph = data;
    parsegraph_Surface* surface = parsegraph_Graph_surface(graph);
    parsegraph_Input* input = parsegraph_Graph_input(graph);
    parsegraph_Surface_install(surface, input);

    parsegraph_Graph_setGlyphAtlas(graph, parsegraph_buildGlyphAtlas(surface->pool));
    parsegraph_GlyphAtlas_setUnicode(parsegraph_Graph_glyphAtlas(graph), uni);

    const char* filename = ".";
    int depth = 3;
    if(app.argc > 1) {
        if(app.argc > 2) {
            sscanf(app.argv[1], "%d", &depth);
            filename = app.argv[2];
        }
        else {
            filename = app.argv[1];
        }
    }
    app.app = parsegraph_Directory_new(app.pool, graph, depth);

    char userModules[PATH_MAX+1];
    memset(userModules, 0, PATH_MAX+1);
    strcpy(userModules, getenv("HOME"));
    strcat(userModules, "/.rainback");
    loadModules(userModules);
    strcpy(userModules, "/usr/lib64/rainback");
    loadModules(userModules);

    parsegraph_Directory_installFileHandler(app.app, showTextFile, 0);

    parsegraph_Directory_show(app.app, filename);
    parsegraph_Graph_plot(graph, app.app->root);

    app.renderTimer = parsegraph_AnimationTimer_new(surface);
    parsegraph_AnimationTimer_setListener(app.renderTimer, renderTimerCallback, graph);

    parsegraph_Input_SetListener(input, inputListener, 0);
    parsegraph_AnimationTimer_schedule(app.renderTimer);
}

void parsegraph_stop(parsegraph_Surface* surf)
{
    parsegraph_Directory_destroy(app.app);
    if(app.graph) {
        parsegraph_Graph_destroy(app.graph);
    }
    parsegraph_Surface_destroy(surf);
    apr_pool_destroy(app.pool);
}

parsegraph_Surface* parsegraph_init(void* peer, int w, int h, int argc, const char* const* argv)
{
    app.pool = 0;
    if(APR_SUCCESS != apr_pool_create(&app.pool, 0)) {
        parsegraph_die("Failed to create text app memory pool");
    }
    parsegraph_initialize(app.pool, 0);

    parsegraph_Surface* surface = parsegraph_Surface_new(app.pool, peer);
    parsegraph_Surface_setDisplaySize(surface, w, h);
    parsegraph_Graph* graph = parsegraph_Graph_new(surface);

    app.graph = graph;
    app.argc = argc;
    app.argv = argv;

    parsegraph_Unicode* uni = parsegraph_Unicode_new(surface->pool);
    parsegraph_Unicode_setOnLoad(uni, onUnicodeLoaded, graph);
    parsegraph_UNICODE_INSTANCE = uni;
    parsegraph_Unicode_load(uni, 0);
    return surface;
}
