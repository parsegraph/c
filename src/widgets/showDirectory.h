#ifndef parsegraph_showDirectory_INCLUDED
#define parsegraph_showDirectory_INCLUDED

#include "graph/Node.h"
#include "graph/Graph.h"
#include "graph/Caret.h"

struct parsegraph_Directory {
apr_pool_t* pool;
parsegraph_Graph* graph;
parsegraph_Node* root;
parsegraph_ArrayList* fileHandlers;
parsegraph_ArrayList* directoryHandlers;
int depth;
};
typedef struct parsegraph_Directory parsegraph_Directory;

parsegraph_Node* parsegraph_Directory_show(parsegraph_Directory* app, const char* filename);
void parsegraph_Directory_destroy(parsegraph_Directory* app);

void parsegraph_Directory_installFileHandler(parsegraph_Directory* app, int(*handler)(parsegraph_Directory*, parsegraph_Caret*, void*, const char*, const char*), void*);
void parsegraph_Directory_installDirectoryHandler(parsegraph_Directory* app, int(*handler)(parsegraph_Directory*, parsegraph_Caret*, void*, const char*, const char*), void*);
parsegraph_Directory* parsegraph_Directory_new(apr_pool_t* ppool, parsegraph_Graph* graph, int depth);
void parsegraph_Directory_destroy(parsegraph_Directory* app);
parsegraph_Node* parsegraph_Directory_createFileNode(parsegraph_Directory* app, parsegraph_Caret* caret, const char* parent, const char* filename, int depth);

#endif // parsegraph_showDirectory_INCLUDED
