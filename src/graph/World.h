#ifndef parsegraph_graph_World_INCLUDED
#define parsegraph_graph_World_INCLUDED

#include "Camera.h"
#include "ArrayList.h"
#include "BlockPainter.h"

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;

struct parsegraph_Graph;
typedef struct parsegraph_Graph parsegraph_Graph;

struct parsegraph_World {
apr_pool_t* pool;
int _worldPaintingDirty;
parsegraph_ArrayList* _worldRoots;
parsegraph_Node* _nodeUnderCursor;
int _previousWorldPaintState;
parsegraph_Camera* _camera;
parsegraph_Graph* _graph;
parsegraph_BlockPainter* _testPainter;
};
typedef struct parsegraph_World parsegraph_World;

parsegraph_World* parsegraph_World_new(parsegraph_Graph* graph);
parsegraph_Camera* parsegraph_World_camera(parsegraph_World* world);
parsegraph_Node* parsegraph_World_nodeUnderCoords(parsegraph_World* world, float x, float y);
void parsegraph_World_scheduleRepaint(parsegraph_World* world);
parsegraph_Node* parsegraph_World_nodeUnderCursor(parsegraph_World* world);
int parsegraph_World_readyForInput(parsegraph_World* world);
int parsegraph_World_commitLayout(parsegraph_World* world, long timeout);
int parsegraph_World_needsRepaint(parsegraph_World* world);
void parsegraph_World_plot(parsegraph_World* world, parsegraph_Node* node, float worldX, float worldY, float userScale);
int parsegraph_World_paint(parsegraph_World* world, int timeout);
int parsegraph_World_render(parsegraph_World* world, float* worldMat);
int parsegraph_World_mouseOver(parsegraph_World* world, float x, float y);
void parsegraph_World_boundingRect(parsegraph_World* world, float* outRect);
void parsegraph_World_destroy(parsegraph_World* world);

#endif // parsegraph_graph_World_INCLUDED
