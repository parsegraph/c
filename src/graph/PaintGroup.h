#ifndef parsegraph_PaintGroup_INCLUDED
#define parsegraph_PaintGroup_INCLUDED

#include <apr_pools.h>
#include "ArrayList.h"
#include "GlyphAtlas.h"
#include "Node.h"
#include "Surface.h"

struct parsegraph_PaintGroup;
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

struct parsegraph_Camera;
typedef struct parsegraph_Camera parsegraph_Camera;

extern int parsegraph_NODES_PAINTED;
extern unsigned int parsegraph_PaintGroup_COUNT;

struct parsegraph_PaintState {
    int i;
    parsegraph_ArrayList* ordering;
    struct parsegraph_CommitLayoutTraversal commitLayout;
    int inProgress;
    int skippedAny;
};
typedef struct parsegraph_PaintState parsegraph_PaintState;

parsegraph_PaintState* parsegraph_PaintState_new();

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;
struct parsegraph_NodePainter;
typedef struct parsegraph_NodePainter parsegraph_NodePainter;
struct parsegraph_PaintGroup {
    int refcount;
    parsegraph_Surface* _surface;
    apr_pool_t* pool;
    float _worldX;
    float _worldY;
    float _userScale;
    parsegraph_PaintState* _previousPaintState;
    parsegraph_ArrayList* _childPaintGroups;
    int _id;
    parsegraph_Node* _root;
    int _dirty;
    parsegraph_NodePainter* _painter;
    int _enabled;
    struct parsegraph_PaintGroup* _parent;
    struct parsegraph_PaintGroup* _firstChildPaintGroup;
    struct parsegraph_PaintGroup* _lastChildPaintGroup;
    struct parsegraph_PaintGroup* _nextPaintGroup;
};
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;
void parsegraph_PaintGroup_ref(parsegraph_PaintGroup* pg);
void parsegraph_PaintGroup_unref(parsegraph_PaintGroup* pg);


parsegraph_PaintGroup* parsegraph_PaintGroup_new(parsegraph_Surface* surface, parsegraph_Node* root, float worldX, float worldY, float userScale);
void parsegraph_PaintGroup_destroy(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_clear(parsegraph_PaintGroup* paintGroup);
void parsegraph_PaintGroup_addChild(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* childPaintGroup);
void parsegraph_PaintGroup_setOrigin(parsegraph_PaintGroup* paintGroup, float x, float y);
void parsegraph_PaintGroup_render(parsegraph_PaintGroup* pg, float* world, parsegraph_Camera* camera);
void parsegraph_PaintGroup_traverseBreadth(parsegraph_PaintGroup* pg, void(*callback)(void*, parsegraph_PaintGroup*, int), void* callbackThisArg);
void parsegraph_PaintGroup_renderIteratively(parsegraph_PaintGroup* pg, float* world, parsegraph_Camera* camera);

void parsegraph_findChildPaintGroups(parsegraph_Node* root, void(*callback)(void*, parsegraph_PaintGroup*), void* callbackThisArg);
void parsegraph_foreachPaintGroupNodes(parsegraph_Node* root, void(*callback)(void*, parsegraph_Node*), void* callbackThisArg);
void parsegraph_PaintGroup_setScale(parsegraph_PaintGroup* paintGroup, float s);
int parsegraph_PaintGroup_toString(parsegraph_PaintGroup* pg, char* buf, size_t len);
int parsegraph_PaintGroup_paint(parsegraph_PaintGroup* pg, float* backgroundColor, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders, int timeout);
void parsegraph_PaintGroup_disable(parsegraph_PaintGroup* pg);
void parsegraph_PaintGroup_enable(parsegraph_PaintGroup* pg);
int parsegraph_PaintGroup_isEnabled(parsegraph_PaintGroup* pg);
parsegraph_NodePainter* parsegraph_PaintGroup_painter(parsegraph_PaintGroup* pg);
int parsegraph_PaintGroup_isDirty(parsegraph_PaintGroup* pg);
void parsegraph_PaintGroup_markDirty(parsegraph_PaintGroup* pg);
void parsegraph_PaintGroup_assignParent(parsegraph_PaintGroup* pg, parsegraph_PaintGroup* parentGroup);
parsegraph_Node* parsegraph_PaintGroup_nodeUnderCoords(parsegraph_PaintGroup* pg, float x, float y);
parsegraph_Node* parsegraph_PaintGroup_root(parsegraph_PaintGroup* pg);
float parsegraph_PaintGroup_scale(parsegraph_PaintGroup* pg);
void parsegraph_PaintGroup_setScale(parsegraph_PaintGroup* pg, float scale);

#endif // parsegraph_PaintGroup_INCLUDED
