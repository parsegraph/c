#include "apps/showDirectory.h"
#include <apr_strings.h>
#include "die.h"
#include "graph/log.h"
#include "graph/Node.h"
#include "graph/Graph.h"
#include <string.h>
#include <stdio.h>
#include "graph/Caret.h"
#include "parsegraph_math.h"
#include <dirent.h>
#include <limits.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

struct DirectoryHandler {
int(*handler)(parsegraph_Directory*, parsegraph_Caret*, void*, const char*, const char*);
void* thisArg;
};

parsegraph_Node* parsegraph_Directory_createFileNode(parsegraph_Directory* app, parsegraph_Caret* caret, const char* parent, const char* filename, int depth)
{
    parsegraph_Caret_push(caret);
    parsegraph_Caret_spawnMove(caret, "d", "s", 0);
    parsegraph_Caret_label(caret, filename, 0, 0);
    if(depth >= 0) {
        // Check file handlers.
        for(int i = 0; i < parsegraph_ArrayList_length(app->fileHandlers); ++i) {
            struct DirectoryHandler* dh = parsegraph_ArrayList_at(app->fileHandlers, i);
            if(dh->handler(app, caret, dh->thisArg, parent, filename)) {
                break;
            }
        }
    }
    parsegraph_Caret_pop(caret);
    parsegraph_Caret_shrink(caret, "d");
    return parsegraph_Caret_node(caret);
}

static int sortEntries(void* thisArg, void* aPtr, void* bPtr)
{
    // Files are first; directories are last.
    const char* a = aPtr;
    const char* b = bPtr;
    if(a[0] == '/') {
        if(b[0] == '/') {
            return strcmp(a, b);
        }
        // a is a directory; b is a file.
        return 1;
    }
    if(b[0] == '/') {
        // a is a file, b is a directory.
        return -1;
    }

    // Neither are directories.
    return strcmp(a, b);
}

struct FilenameEntry {
char* filename;
struct parsegraph_Directory* app;
};

static int clickListener(const char* name, void* dataPtr)
{
    //parsegraph_log("CLICKED HERE\n");
    struct FilenameEntry* e = dataPtr;
    parsegraph_Directory_show(e->app, e->filename);
    parsegraph_Graph_scheduleRepaint(e->app->graph);
    return 1;
}

static void installClickListener(parsegraph_Directory* app, apr_pool_t* pool, parsegraph_Node* node, const char* parent, const char* filename)
{
    struct FilenameEntry* fe = malloc(sizeof(*fe));
    if(parent && filename) {
        fe->filename = apr_psprintf(pool, "%s/%s", parent, filename);
    }
    else if(parent) {
        fe->filename = apr_pstrdup(pool, parent);
    }
    else {
        fe->filename = apr_pstrdup(pool, filename);
    }
    //parsegraph_log("Installed click listener for %s\n", fe->filename);
    parsegraph_Node_setClickListener(node, clickListener, fe);
    fe->app = app;
}

static void recurseDirectory(parsegraph_Directory* app, apr_pool_t* pool, parsegraph_Caret* caret, const char* parent, const char* filename, int depth)
{
    if(depth == 0) {
        if(filename) {
            parsegraph_Caret_spawnMove(caret, "d", "b", 0);
            parsegraph_Caret_label(caret, filename, 0, 0);
            installClickListener(app, pool, parsegraph_Caret_node(caret), parent, filename);
            parsegraph_Caret_move(caret, "u");
        }
        return;
    }

    parsegraph_Caret_push(caret);
    if(filename) {
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
            
        parsegraph_Caret_label(caret, filename, 0, 0);
        installClickListener(app, pool, parsegraph_Caret_node(caret), parent, filename);
    }

    // Check directory handlers.
    int fileHandled = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(app->directoryHandlers); ++i) {
        struct DirectoryHandler* dh = parsegraph_ArrayList_at(app->directoryHandlers, i);
        if(dh->handler(app, caret, dh->thisArg, parent, filename)) {
            fileHandled = 1;
            break;
        }
    }
    if(fileHandled) {
        parsegraph_Caret_pop(caret);
        return;
    }

    DIR* dirfd = 0;
    if(!parent) {
        if(!filename) {
            parsegraph_die("recurseDirectory must be given a non-null filename or parent name.");
        }
        dirfd = opendir(filename);
        parent = filename;
    }
    else {
        if(filename) {
            parent = apr_psprintf(pool, "%s/%s", parent, filename);
        }
        dirfd = opendir(parent);
    }
    if(!dirfd) {
        char buf[1024];
        snprintf(buf, sizeof(buf), "%s: %s", filename, strerror(errno));
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
        installClickListener(app, pool, parsegraph_Caret_node(caret), parent, filename);
        parsegraph_Caret_label(caret, buf, 0, 0);
        parsegraph_Caret_move(caret, "u");
    }
    else {
        parsegraph_Caret_spawnMove(caret, "d", "bu", 0);
        struct dirent* ent = 0;

        apr_pool_t* cpool = 0;
        if(APR_SUCCESS != apr_pool_create(&cpool, 0)) {
            parsegraph_die("Failed to create memory pool for directory.");
        }
    
        parsegraph_ArrayList* entries = parsegraph_ArrayList_new(cpool);
        while((ent = readdir(dirfd)) != 0) {
            if(ent->d_type == DT_DIR) {
                if(!strcmp(".", ent->d_name) || !strcmp("..", ent->d_name) || ent->d_name[0] == '.') {
                    continue;
                }
                parsegraph_ArrayList_push(entries, apr_psprintf(cpool, "/%s", ent->d_name));
                continue;
            }
            else if(ent->d_type == DT_LNK) {
                //parsegraph_log("Directory contains a link.\n");
                struct stat path_stat;
                char symPath[PATH_MAX + 1];
                memset(symPath, 0, sizeof(symPath));
                strcat(symPath, parent);
                strcat(symPath, "/");
                strcat(symPath, ent->d_name);
                if(!stat(symPath, &path_stat)) {
                    //parsegraph_log("Found a link\n");
                    if(S_ISDIR(path_stat.st_mode)) {
                        parsegraph_ArrayList_push(entries, apr_psprintf(cpool, "/%s", ent->d_name));
                        continue;
                    }
                    else {
                        //parsegraph_log("Link isn't to a file.\n");
                    }
                }
                else {
                    //parsegraph_log("Failed to stat link: %s\n", strerror(errno));
                }
            }
            if(ent->d_name[0] == '.') {
                continue;
            }
            const char* extension = strrchr(ent->d_name, '.');
            if(extension && extension[1] != 0) {
                extension = extension + 1;
                if(!strcmp(extension, "lo") || !strcmp(extension, "o") || !strcmp(extension, "la")) {
                    continue;
                }
            }
            parsegraph_ArrayList_insert(entries, 0, apr_psprintf(cpool, "%s", ent->d_name));
        }
        parsegraph_ArrayList_sort(entries, sortEntries, 0);
    
        float rowLen = 0;
        if(7 < parsegraph_ArrayList_length(entries)) {
            rowLen = sqrtf(parsegraph_ArrayList_length(entries));
        }
        //parsegraph_log("%d %f\n", parsegraph_ArrayList_length(entries), rowLen);
        parsegraph_Caret_push(caret);
        //parsegraph_Caret_crease(caret, 0);
        int firstOfRow = 1;
        for(int i = 0; i < parsegraph_ArrayList_length(entries); ++i) {
            const char* name = parsegraph_ArrayList_at(entries, i);
            const char* dir = "f";
            if(i == 0) {
                parsegraph_Caret_pull(caret, dir);
            }
            //else if((name[0] == '/' && depth != 1) || (i > 0 && rowLen > 0 && i % ((int)rowLen) == 0)) {
            else if((i > 0 && rowLen > 0 && i % ((int)rowLen) == 0)) {
                parsegraph_Caret_pop(caret);
                parsegraph_Caret_spawnMove(caret, "d", "bu", 0);
                parsegraph_Caret_push(caret);
                firstOfRow = 1;
                parsegraph_Caret_pull(caret, dir);
            }
            else {
                parsegraph_Caret_pull(caret, "d");
            }
            if(name[0] == '/') {
                parsegraph_Caret_spawnMove(caret, dir, "bu", 0);
                recurseDirectory(app, pool, caret, parent, name + 1, depth - 1);
                //installClickListener(app, pool, parsegraph_Caret_node(caret), parent, filename);
            }
            else {
                parsegraph_Caret_spawnMove(caret, dir, "bu", 0);
                parsegraph_Directory_createFileNode(app, caret, parent, name, depth - 1);
            }
            if(rowLen > 0 && firstOfRow) {
                parsegraph_Caret_shrink(caret, 0);
                firstOfRow = 0;
            }
        }
        parsegraph_Caret_pop(caret);

        parsegraph_ArrayList_destroy(entries);
        apr_pool_destroy(cpool);
        closedir(dirfd);
    }

    parsegraph_Caret_pop(caret);
}

parsegraph_Node* parsegraph_Directory_show(parsegraph_Directory* app, const char* filename)
{
    parsegraph_Surface* surface = app->graph->_surface;
    apr_pool_t* pool = surface->pool;

    if(app->root) {
        parsegraph_Node_eraseNode(app->root, parsegraph_DOWNWARD);
    }
    else {
        app->root = parsegraph_Node_new(pool, parsegraph_BUD, 0, 0);
    }
    parsegraph_Caret* caret = parsegraph_Caret_new(surface, app->root);
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_Graph_glyphAtlas(app->graph);
    parsegraph_Caret_setGlyphAtlas(caret, glyphAtlas);

    parsegraph_Caret_spawnMove(caret, "d", "b", 0);
    parsegraph_Caret_label(caret, "/", 0, 0);
    installClickListener(app, pool, parsegraph_Caret_node(caret), "/", 0);

    char parentDir[PATH_MAX+1];
    memset(parentDir, 0, sizeof(parentDir));
    char abspath[PATH_MAX+1];
    char abspathCopy[PATH_MAX+1];
    if(!realpath(filename, abspath)) {
        // Error.
        parsegraph_die("Failed to retrieve path.");
    }
    strcpy(abspathCopy, abspath);
    char* tokPtr = 0;
    char realFilename[PATH_MAX+1];
    memset(realFilename, 0, sizeof(realFilename));

    for(char* token = strtok_r(abspath, "/", &tokPtr); token; token = strtok_r(0, "/", &tokPtr)) {
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
        parsegraph_Caret_label(caret, token, 0, 0);
        strcat(realFilename, "/");
        strcat(realFilename, token);
        installClickListener(app, pool, parsegraph_Caret_node(caret), realFilename, 0);
    }
    recurseDirectory(app, pool, caret, abspathCopy, 0, app->depth);

    parsegraph_Node* node = parsegraph_Caret_root(caret);
    parsegraph_Caret_destroy(caret);
   
    parsegraph_Camera* cam = parsegraph_Graph_camera(app->graph);
    parsegraph_Node_showInCamera(node, cam, 0);

    return node;
}

parsegraph_Directory* parsegraph_Directory_new(apr_pool_t* ppool, parsegraph_Graph* graph, int depth)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create Directory pool.");
    }
    parsegraph_Directory* app = apr_palloc(pool, sizeof(*app));
    app->root = 0;
    app->graph = graph;
    app->pool = pool;
    app->depth = depth;
    app->fileHandlers = parsegraph_ArrayList_new(app->pool);
    app->directoryHandlers = parsegraph_ArrayList_new(app->pool);
    return app;
}

void parsegraph_Directory_destroy(parsegraph_Directory* app)
{
    parsegraph_ArrayList_destroy(app->fileHandlers);
    parsegraph_ArrayList_destroy(app->directoryHandlers);
    apr_pool_destroy(app->pool);
}

void parsegraph_Directory_installFileHandler(parsegraph_Directory* app, int(*handler)(parsegraph_Directory*, parsegraph_Caret*, void*, const char*, const char*), void* thisArg)
{
    struct DirectoryHandler* dh = apr_palloc(app->pool, sizeof(struct DirectoryHandler));
    dh->handler = handler;
    dh->thisArg = thisArg;
    parsegraph_ArrayList_push(app->fileHandlers, dh);
}

void parsegraph_Directory_installDirectoryHandler(parsegraph_Directory* app, int(*handler)(parsegraph_Directory*, parsegraph_Caret*, void*, const char*, const char*), void* thisArg)
{
    struct DirectoryHandler* dh = apr_palloc(app->pool, sizeof(struct DirectoryHandler));
    dh->handler = handler;
    dh->thisArg = thisArg;
    parsegraph_ArrayList_push(app->directoryHandlers, dh);
}
