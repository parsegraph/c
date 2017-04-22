#ifndef parsegraph_PaintGroup_INCLUDED
#define parsegraph_PaintGroup_INCLUDED

#include <apr_pools.h>

struct parsegraph_PaintGroup {
    apr_pool_t* pool;
};

typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

parsegraph_PaintGroup* parsegraph_PaintGroup_new(apr_pool_t* pool);
void parsegraph_PaintGroup_destroy(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_setParent(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* parent);
void parsegraph_PaintGroup_clear(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_addChild(parsegraph_PaintGroup* paintGroup);

#endif // parsegraph_PaintGroup_INCLUDED
