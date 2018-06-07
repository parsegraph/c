#ifndef parsegraph_PaintGroup_INCLUDED
#define parsegraph_PaintGroup_INCLUDED

#include <apr_pools.h>

struct parsegraph_PaintGroup;
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

struct parsegraph_PaintGroupListEntry {
parsegraph_PaintGroup* paintGroup;
struct parsegraph_PaintGroupListEntry* next;
};
typedef struct parsegraph_PaintGroupListEntry parsegraph_PaintGroupListEntry;

struct parsegraph_PaintGroupList {
parsegraph_PaintGroupListEntry* firstEntry;
parsegraph_PaintGroupListEntry* lastEntry;
};
typedef struct parsegraph_PaintGroupList parsegraph_PaintGroupList;

extern int parsegraph_NODES_PAINTED;
extern unsigned int parsegraph_PaintGroup_COUNT;

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;
struct parsegraph_NodePainter;
typedef struct parsegraph_NodePainter parsegraph_NodePainter;
struct parsegraph_PaintGroup {
    apr_pool_t* pool;
    double x;
    double y;
    parsegraph_PaintGroupList _childPaintGroups;
    int _id;
    parsegraph_Node* _root;
    int _dirty;
    parsegraph_NodePainter* _painter;
    int _enabled;
    struct parsegraph_PaintGroup* _firstChildPaintGroup;
    struct parsegraph_PaintGroup* _lastChildPaintGroup;
    struct parsegraph_PaintGroup* _nextPaintGroup;
};
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

parsegraph_PaintGroup* parsegraph_PaintGroup_new(apr_pool_t* pool, parsegraph_Node* root);
void parsegraph_PaintGroup_destroy(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_setParent(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* parent);
void parsegraph_PaintGroup_clear(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_addChild(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_setOrigin(parsegraph_PaintGroup* paintGroup, double x, double y);

void parsegraph_findChildPaintGroups(parsegraph_Node* root, void(*callback)(parsegraph_PaintGroup*, void*), void* callbackThisArg);

#endif // parsegraph_PaintGroup_INCLUDED
