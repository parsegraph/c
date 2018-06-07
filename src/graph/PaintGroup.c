#include "PaintGroup.h"
#include "NodeList.h"

int parsegraph_NODES_PAINTED = 0;
unsigned int parsegraph_PaintGroup_COUNT = 0;

struct parsegraph_PaintState {
    int i;
    parsegraph_NodeList* ordering;
    void(*commitLayoutFunc)(void*);
    void* commitLayoutFuncThisArg;
};

parsegraph_PaintGroup* parsegraph_PaintGroup_new(apr_pool_t* pool, parsegraph_Node* root)
{
    parsegraph_PaintGroup* pg = apr_palloc(pool, sizeof(*pg));
    pg->pool = pool;

    pg->_id = parsegraph_PaintGroup_COUNT++;

    pg->_root = root;
    pg->_dirty = 1;
    pg->_painter = 0;
    pg->_enabled = 1;

    // Manipulated by node.
    pg->_firstChildPaintGroup = 0;
    pg->_lastChildPaintGroup = 0;
    pg->_nextPaintGroup = 0;

    //pg->_previousPaintState = 

    return pg;
}
