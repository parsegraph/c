#include "NodeList.h"
#include "Node.h"

parsegraph_NodeList* parsegraph_NodeList_new(apr_pool_t* pool)
{
    parsegraph_NodeList* nl = apr_palloc(pool, sizeof(*nl));
    return nl;
}

void parsegraph_NodeList_push(parsegraph_NodeList* nl, parsegraph_Node* node)
{
}
