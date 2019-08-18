#ifndef parsegraph_graph_Node_INCLUDED
#define parsegraph_graph_Node_INCLUDED

#include <apr_pools.h>
#include "Extent.h"
#include "NodeType.h"
#include "NodeDirection.h"
#include "GlyphAtlas.h"
#include "../ArrayList.h"

extern int parsegraph_Node_COUNT;

struct parsegraph_NodePainter;
typedef struct parsegraph_NodePainter parsegraph_NodePainter;

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;

struct parsegraph_Scene;
typedef struct parsegraph_Scene parsegraph_Scene;

struct parsegraph_CommitLayoutTraversal {
parsegraph_Node* root;
parsegraph_Node* node;
parsegraph_Node* rootPaintGroup;
parsegraph_Node* paintGroup;
int timeout;
int layoutPhase;
struct timespec startTime;
};
typedef struct parsegraph_CommitLayoutTraversal parsegraph_CommitLayoutTraversal;

struct parsegraph_PaintState {
    struct parsegraph_CommitLayoutTraversal commitLayout;
    int commitInProgress;
    parsegraph_Node* paintGroup;
};
typedef struct parsegraph_PaintState parsegraph_PaintState;

struct parsegraph_ExtendedNode {
int ignoresMouse;
int(*keyListener)(parsegraph_Node*, const char*, void*);
void* keyListenerThisArg;
int(*clickListener)(parsegraph_Node*, const char*, void*);
void* clickListenerThisArg;
void(*changeListener)(void*, parsegraph_Node*);
void* changeListenerThisArg;
parsegraph_Node* prevTabNode;
parsegraph_Node* nextTabNode;
void* value;
void(*destructor)(void*, struct parsegraph_Node*);
void* destructorThisArg;
int selected;
int isPaintGroup;
int dirty;
parsegraph_NodePainter* painter;
parsegraph_PaintState* previousPaintState;
parsegraph_Scene* scene;
};
typedef struct parsegraph_ExtendedNode parsegraph_ExtendedNode;
parsegraph_ExtendedNode* parsegraph_ExtendedNode_new(apr_pool_t* pool);

struct parsegraph_NeighborData {
    parsegraph_Node* owner;
    int direction;
    int alignmentMode;
    float alignmentOffset;
    float separation;
    float lineLength;
    float xPos;
    float yPos;
    int hasPos;
    parsegraph_Node* node;
};
typedef struct parsegraph_NeighborData parsegraph_NeighborData;

parsegraph_NeighborData* parsegraph_NeighborData_new(parsegraph_Node* node, int inDirection);

parsegraph_PaintState* parsegraph_PaintState_new(apr_pool_t* pool);

struct parsegraph_NodePainter;
typedef struct parsegraph_NodePainter parsegraph_NodePainter;

struct parsegraph_PaintGroup;
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

struct parsegraph_Graph;
typedef struct parsegraph_Graph parsegraph_Graph;

struct parsegraph_Label;
typedef struct parsegraph_Label parsegraph_Label;

struct parsegraph_Style;
typedef struct parsegraph_Style parsegraph_Style;

struct parsegraph_Camera;
typedef struct parsegraph_Camera parsegraph_Camera;

struct parsegraph_Node {
    apr_pool_t* pool;
    int _id;
    int refcount;
    parsegraph_Extent* _extents[4];
    parsegraph_NeighborData* _neighbors[6];
    parsegraph_NeighborData* _parentNeighbor;

    int _type;
    const char* _string;

    parsegraph_Graph* _graph;
    parsegraph_Style* _style;
    parsegraph_Label* _label;
    float _labelPos[3];
    int _rightToLeft;

    float _scale;
    int _absoluteVersion;
    int _absoluteDirty;
    float _absoluteXPos;
    float _absoluteYPos;
    float _absoluteScale;

    int _hasGroupPos;
    float _groupXPos;
    float _groupYPos;
    float _groupScale;

    parsegraph_Node* _currentPaintGroup;
    parsegraph_Node* _paintGroupPrev;
    parsegraph_Node* _paintGroupNext;

    parsegraph_Node* _layoutPrev;
    parsegraph_Node* _layoutNext;

    parsegraph_ExtendedNode* _extended;

    int _layoutState;
    int _nodeFit;
    int _layoutPreference;
    int _parentDirection;
    int _ignoresMouse;

    float _brightnessColor[4];
};

struct parsegraph_Scene {
void(*paint)(parsegraph_Scene*);
void(*render)(parsegraph_Scene*, float, float);
};

parsegraph_Node* parsegraph_Node_new(apr_pool_t* pool, int newType, parsegraph_Node* fromNode, int parentDirection);
void parsegraph_Node_ref(parsegraph_Node* node);
void parsegraph_Node_unref(parsegraph_Node* node);
void parsegraph_chainTab(parsegraph_Node* a, parsegraph_Node* b, parsegraph_Node** swappedOut);
void parsegraph_chainAllTabs(apr_pool_t* pool, ...);
parsegraph_NeighborData* parsegraph_Node_neighborAt(parsegraph_Node* node, int inDirection);
parsegraph_NeighborData* parsegraph_Node_ensureNeighbor(parsegraph_Node* node, int inDirection);
parsegraph_Node* parsegraph_Node_root(parsegraph_Node* node);
const char* parsegraph_Node_toString(parsegraph_Node* node);
float parsegraph_Node_x(parsegraph_Node* node);
float parsegraph_Node_y(parsegraph_Node* node);
int parsegraph_Node_hasPos(parsegraph_Node* node);
float parsegraph_Node_scale(parsegraph_Node* node);
void parsegraph_Node_setScale(parsegraph_Node* node, float scale);
void parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val);
float parsegraph_Node_rightToLeft(parsegraph_Node* node);
void parsegraph_Node_commitAbsolutePos(parsegraph_Node* nodeRoot);
int parsegraph_Node_needsCommit(parsegraph_Node* node);
int parsegraph_Node_needsPosition(parsegraph_Node* node);
float parsegraph_Node_absoluteX(parsegraph_Node* node);
float parsegraph_Node_absoluteY(parsegraph_Node* node);
float parsegraph_Node_absoluteScale(parsegraph_Node* node);
void parsegraph_Node_commitGroupPos(parsegraph_Node* nodeRoot);
float parsegraph_Node_groupX(parsegraph_Node* node);
float parsegraph_Node_groupY(parsegraph_Node* node);
float parsegraph_Node_groupScale(parsegraph_Node* node);
void parsegraph_Node_setPosAt(parsegraph_Node* node, int inDirection, float x, float y);
void parsegraph_Node_removeFromLayout(parsegraph_Node* node, int inDirection);
void parsegraph_Node_insertIntoLayout(parsegraph_Node* node, int inDirection);
void parsegraph_connectPaintGroup(parsegraph_Node* a, parsegraph_Node* b);
void parsegraph_Node_setPaintGroup(parsegraph_Node* node, int paintGroup);
parsegraph_Node* parsegraph_Node_findFirstPaintGroup(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_findLastPaintGroup(parsegraph_Node* node);
parsegraph_ExtendedNode* parsegraph_Node_ensureExtended(parsegraph_Node* node);
parsegraph_PaintState* parsegraph_PaintState_new(apr_pool_t* pool);
void parsegraph_Node_markDirty(parsegraph_Node* node);
int parsegraph_Node_isDirty(parsegraph_Node* node);
parsegraph_NodePainter* parsegraph_Node_painter(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_findPaintGroup(parsegraph_Node* nodeRoot);
int parsegraph_Node_localPaintGroup(parsegraph_Node* node);
float* parsegraph_Node_backdropColor(parsegraph_Node* node);
void parsegraph_Node_setClickListener(parsegraph_Node* node, int(*listener)(parsegraph_Node*, const char*, void*), void* thisArg);
void parsegraph_Node_setChangeListener(parsegraph_Node* node, void(*listener)(void*, parsegraph_Node*), void* thisArg);
int parsegraph_Node_isClickable(parsegraph_Node* node);
void parsegraph_Node_setIgnoreMouse(parsegraph_Node* node, int value);
int parsegraph_Node_ignoresMouse(parsegraph_Node* node);
int parsegraph_Node_hasClickListener(parsegraph_Node* node);
int parsegraph_Node_hasChangeListener(parsegraph_Node* node);
void parsegraph_Node_valueChanged(parsegraph_Node* node);
int parsegraph_Node_click(parsegraph_Node* node, const char* button);
void parsegraph_Node_setKeyListener(parsegraph_Node* node, int(*listener)(parsegraph_Node*, const char*, void*), void* thisArg);
int parsegraph_Node_hasKeyListener(parsegraph_Node* node);
int parsegraph_Node_key(parsegraph_Node* node, const char* key);
int parsegraph_Node_nodeFit(parsegraph_Node* node);
void parsegraph_Node_setNodeFit(parsegraph_Node* node, int nodeFit);
int parsegraph_Node_isRoot(parsegraph_Node* node);
int parsegraph_Node_parentDirection(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_nodeParent(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_parentNode(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_parent(parsegraph_Node* node);
int parsegraph_Node_hasNode(parsegraph_Node* node, int atDirection);
void parsegraph_Node_hasNodes(parsegraph_Node* node, int axis, int* hasNegative, int* hasPositive);
int parsegraph_Node_hasChildAt(parsegraph_Node* node, int direction);
int parsegraph_Node_hasChild(parsegraph_Node* node, int direction);
int parsegraph_Node_hasAnyNodes(parsegraph_Node* node);
parsegraph_ArrayList* parsegraph_dumpPaintGroups(apr_pool_t* pool, parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_nodeAt(parsegraph_Node* node, int atDirection);
parsegraph_Node* parsegraph_Node_spawnNode(parsegraph_Node* node, int spawnDirection, int newType);
void parsegraph_connectLayout(parsegraph_Node* a, parsegraph_Node* b);
parsegraph_Node* parsegraph_Node_connectNode(parsegraph_Node* node, int inDirection, parsegraph_Node* nodeToConnect);
parsegraph_Node* parsegraph_Node_disconnectNode(parsegraph_Node* node, int givenDirection);
void parsegraph_Node_eraseNode(parsegraph_Node* node, int givenDirection);
parsegraph_Node* parsegraph_Node_findEarlierLayoutSibling(parsegraph_Node* node, int inDirection);
parsegraph_Node* parsegraph_Node_findLaterLayoutSibling(parsegraph_Node* node, int inDirection);
parsegraph_Node* parsegraph_Node_findLayoutHead(parsegraph_Node* node, parsegraph_Node* excludeThisNode);
void parsegraph_Node_eachChild(parsegraph_Node* node, void(*visitor)(void*, parsegraph_Node*, int), void* visitorThisArg);
float parsegraph_Node_scaleAt(parsegraph_Node* node, int direction);
float parsegraph_Node_lineLengthAt(parsegraph_Node* node, int direction);
parsegraph_Extent* parsegraph_Node_extentsAt(parsegraph_Node* node, int atDirection);
float parsegraph_Node_extentOffsetAt(parsegraph_Node* node, int atDirection);
void parsegraph_Node_setExtentOffsetAt(parsegraph_Node* node, int atDirection, float offset);
void parsegraph_Node_extentSize(parsegraph_Node* node, float* size);
void parsegraph_Node_setLayoutPreference(parsegraph_Node* node, int given);
void parsegraph_Node_showNodeInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary);
void parsegraph_Node_showInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary);
void parsegraph_Node_setNodeAlignmentMode(parsegraph_Node* node, int inDirection, int newAlignmentMode);
int parsegraph_Node_nodeAlignmentMode(parsegraph_Node* node, int inDirection);
int parsegraph_Node_type(parsegraph_Node* node);
void parsegraph_Node_setType(parsegraph_Node* node, int newType);
void* parsegraph_Node_value(parsegraph_Node* node);
void parsegraph_Node_setValue(parsegraph_Node* node, void* newValue, int report, void(*destructor)(void*, parsegraph_Node*), void* destructorData);
void* parsegraph_Node_scene(parsegraph_Node* node);
void parsegraph_Node_setScene(parsegraph_Node* node, void* scene);
int parsegraph_Node_typeAt(parsegraph_Node* node, int direction);
int parsegraph_Node_label(parsegraph_Node* node, UChar* buf, int len);
int parsegraph_Node_labelUTF8(parsegraph_Node* node, char* buf, int len);
int parsegraph_Node_glyphCount(parsegraph_Node* node, parsegraph_ArrayList* counts, int pagesPerTexture);
parsegraph_Label* parsegraph_Node_realLabel(parsegraph_Node* node);
void parsegraph_Node_setLabel(parsegraph_Node* node, const UChar* text, int len, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Node_setLabelUTF8(parsegraph_Node* node, const char* text, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Style* parsegraph_Node_blockStyle(parsegraph_Node* node);
void parsegraph_Node_setBlockStyle(parsegraph_Node* node, parsegraph_Style* style);
int parsegraph_Node_isSelectedAt(parsegraph_Node* node, int direction);
float parsegraph_Node_sizeIn(parsegraph_Node* node, int direction);
float* parsegraph_Node_brightnessColor(parsegraph_Node* node);
void parsegraph_Node_setBrightnessColor(parsegraph_Node* node, float* brightnessColor);
float parsegraph_Node_borderThickness(parsegraph_Node* node);
void parsegraph_Node_size(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_absoluteSize(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_groupSize(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_assignParent(parsegraph_Node* node, parsegraph_Node* parentNode, int parentDirection);
int parsegraph_Node_isSelected(parsegraph_Node* node);
void parsegraph_Node_setSelected(parsegraph_Node* node, int selected);
float parsegraph_Node_horizontalPadding(parsegraph_Node* node);
float parsegraph_Node_verticalPadding(parsegraph_Node* node);
float parsegraph_Node_verticalSeparation(parsegraph_Node* node, int direction);
float parsegraph_Node_horizontalSeparation(parsegraph_Node* node, int direction);
int parsegraph_Node_inNodeBody(parsegraph_Node* node, float x, float y, float userScale);
int parsegraph_Node_inNodeExtents(parsegraph_Node* node, float x, float y, float userScale);
parsegraph_Node* parsegraph_Node_nodeUnderCoords(parsegraph_Node* node, float x, float y, float userScale);
void parsegraph_Node_sizeWithoutPadding(parsegraph_Node* node, float* bodySize);
int parsegraph_Node_commitLayout(parsegraph_Node* node);
float parsegraph_findConsecutiveLength(parsegraph_Node* node, int inDirection);

int parsegraph_Node_continueCommitLayout(parsegraph_CommitLayoutTraversal* cl);
int parsegraph_Node_commitLayoutIteratively(parsegraph_Node* node, parsegraph_CommitLayoutTraversal* cl);
float parsegraph_Node_separationAt(parsegraph_Node* node, int inDirection);
void parsegraph_Node_layoutWasChanged(parsegraph_Node* node, int changeDirection);
void parsegraph_Node_layoutHasChanged(parsegraph_Node* node, int changeDirection);
void parsegraph_Node_layoutChanged(parsegraph_Node* node, int changeDirection);
int* parsegraph_Node_layoutOrder(parsegraph_Node* node);
int parsegraph_Node_canonicalLayoutPreference(parsegraph_Node* node);
void parsegraph_Node_dump(parsegraph_Node* node);
parsegraph_Node* parsegraph_labeledBud(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Node* parsegraph_labeledSlot(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Node* parsegraph_labeledBlock(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_Node_paint(parsegraph_Node* node, float* backgroundColor, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders, long timeout);
int parsegraph_Node_renderIteratively(parsegraph_Node* node, float* world, parsegraph_Camera* camera);
int parsegraph_Node_render(parsegraph_Node* node, float* world, parsegraph_Camera* camera);
#endif // parsegraph_graph_Node_INCLUDED
