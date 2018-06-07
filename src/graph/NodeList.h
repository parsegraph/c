#ifndef parsegraph_NodeList_INCLUDED
#define parsegraph_NodeList_INCLUDED

#include <apr_pools.h>

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;

struct parsegraph_NodeListEntry {
parsegraph_Node* node;
struct parsegraph_NodeListEntry* nextEntry;
};
typedef struct parsegraph_NodeListEntry parsegraph_NodeListEntry;

struct parsegraph_NodeList {
parsegraph_NodeListEntry* firstEntry;
parsegraph_NodeListEntry* lastEntry;
};
typedef struct parsegraph_NodeList parsegraph_NodeList;

parsegraph_NodeList* parsegraph_NodeList_new(apr_pool_t* pool);

#endif // parsegraph_NodeList_INCLUDED
