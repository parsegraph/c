#ifndef parsegraph_graph_Node_INCLUDED
#define parsegraph_graph_Node_INCLUDED

#include <apr_pools.h>
#include "Extent.h"
#include "NodeType.h"
#include "NodeDirection.h"
#include "GlyphAtlas.h"
#include "../ArrayList.h"

struct parsegraph_Node;
typedef struct parsegraph_Node parsegraph_Node;

struct parsegraph_DirectionData {
    int direction;
    parsegraph_Extent* extent;
    float extentOffset;
    int alignmentMode;
    float alignmentOffset;
    float separation;
    float lineLength;
    float xPos;
    float yPos;
    parsegraph_Node* node;
};
typedef struct parsegraph_DirectionData parsegraph_DirectionData;

struct parsegraph_PaintGroup;
typedef struct parsegraph_PaintGroup parsegraph_PaintGroup;

struct parsegraph_Graph;
typedef struct parsegraph_Graph parsegraph_Graph;

struct parsegraph_Label;
typedef struct parsegraph_Label parsegraph_Label;

struct parsegraph_Style;
typedef struct parsegraph_Style parsegraph_Style;

struct parsegraph_Scene;
typedef struct parsegraph_Scene parsegraph_Scene;

struct parsegraph_Camera;
typedef struct parsegraph_Camera parsegraph_Camera;

struct parsegraph_Node {
    apr_pool_t* pool;
    int _id;
    int refcount;
    parsegraph_DirectionData _neighbors[6];

    parsegraph_PaintGroup* _paintGroup;
    parsegraph_Node* _paintGroupNext;
    parsegraph_Node* _paintGroupPrev;

    parsegraph_Node* _worldNext;
    parsegraph_Node* _worldPrev;
    int(*_keyListener)(const char*, void*);
    void* _keyListenerThisArg;
    int(*_clickListener)(const char*, void*);
    void* _clickListenerThisArg;
    void(*_changeListener)(void*, parsegraph_Node*);
    void* _changeListenerThisArg;
    int _type;

    parsegraph_Graph* _graph;
    parsegraph_Style* _style;
    parsegraph_Label* _realLabel;
    float _labelPos[3];
    int _rightToLeft;

    void* _value;
    int _selected;

    parsegraph_Node* _prevTabNode;
    parsegraph_Node* _nextTabNode;

    parsegraph_Scene* _scene;

    float _scale;
    int _hasAbsolutePos;
    float _absoluteXPos;
    float _absoluteYPos;
    float _absoluteScale;

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

extern int parsegraph_Node_COUNT;

parsegraph_Node* parsegraph_Node_new(apr_pool_t* pool, int newType, parsegraph_Node* fromNode, int parentDirection);
void parsegraph_Node_ref(parsegraph_Node* node);
void parsegraph_Node_unref(parsegraph_Node* node);
void parsegraph_chainTab(parsegraph_Node* a, parsegraph_Node* b, parsegraph_Node** swappedOut);
float parsegraph_Node_x(parsegraph_Node* node);
float parsegraph_Node_y(parsegraph_Node* node);
float parsegraph_Node_scale(parsegraph_Node* node);
void parsegraph_Node_setScale(parsegraph_Node* node, float scale);
void parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val);
float parsegraph_Node_rightToLeft(parsegraph_Node* node);
void parsegraph_Node_commitAbsolutePos(parsegraph_Node* node);
void parsegraph_Node_positionWasChanged(parsegraph_Node* node);
float parsegraph_Node_absoluteX(parsegraph_Node* node);
float parsegraph_Node_absoluteY(parsegraph_Node* node);
float parsegraph_Node_absoluteScale(parsegraph_Node* node);
void parsegraph_Node_absoluteSize(parsegraph_Node* node, float* bodySize);
float parsegraph_Node_borderThickness(parsegraph_Node* node);
void parsegraph_Node_sizeWithoutPadding(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_size(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_absoluteSize(parsegraph_Node* node, float* bodySize);
float parsegraph_Node_sizeIn(parsegraph_Node* node, int direction);
float* parsegraph_Node_brightnessColor(parsegraph_Node* node);
void parsegraph_Node_setBrightnessColor(parsegraph_Node* node, float* brightnessColor);
void parsegraph_Node_setPosAt(parsegraph_Node* node, int inDirection, float x, float y);
void parsegraph_Node_setPaintGroup(parsegraph_Node* node, parsegraph_PaintGroup* paintGroup);
int parsegraph_Node_isRoot(parsegraph_Node* noode);
parsegraph_Node* parsegraph_Node_nodeParent(parsegraph_Node* node);
int parsegraph_Node_parentDirection(parsegraph_Node* node);
void parsegraph_Node_layoutWasChanged(parsegraph_Node* node, int changeDirection);
float parsegraph_Node_scaleAt(parsegraph_Node* node, int direction);
parsegraph_Node* parsegraph_Node_nodeAt(parsegraph_Node* node, int atDirection);
void parsegraph_Node_eachChild(parsegraph_Node* node, void(*visitor)(void*, parsegraph_Node*, int), void* visitorThisArg);
void parsegraph_reparentPaintGroup(parsegraph_PaintGroup* paintGroup, parsegraph_PaintGroup* parentPaintGroup);
parsegraph_PaintGroup* parsegraph_Node_findPaintGroup(parsegraph_Node* node);
parsegraph_PaintGroup* parsegraph_Node_localPaintGroup(parsegraph_Node* node);
parsegraph_Graph* parsegraph_Node_graph(parsegraph_Node* node);
float* parsegraph_Node_backdropColor(parsegraph_Node* node);
void parsegraph_Node_setClickListener(parsegraph_Node* node, int(*listener)(const char*, void*), void* thisArg);
void parsegraph_Node_setChangeListener(parsegraph_Node* node, void(*listener)(void*, parsegraph_Node*), void* thisArg);
int parsegraph_Node_hasClickListener(parsegraph_Node* node);
int parsegraph_Node_click(parsegraph_Node* node, const char* button);
void parsegraph_Node_valueChanged(parsegraph_Node* node);
void parsegraph_Node_setKeyListener(parsegraph_Node* node, int(*listener)(const char*, void*), void* thisArg);
int parsegraph_Node_hasKeyListener(parsegraph_Node* node);
int parsegraph_Node_key(parsegraph_Node* node, const char* key);
int parsegraph_Node_nodeFit(parsegraph_Node* node);
void parsegraph_Node_setNodeFit(parsegraph_Node* node, int nodeFit);
int parsegraph_Node_isRoot(parsegraph_Node* node);
parsegraph_Node* parsegraph_Node_parentNode(parsegraph_Node* node);
parsegraph_PaintGroup* parsegraph_Node_localPaintGroup(parsegraph_Node* node);
int parsegraph_Node_hasNode(parsegraph_Node* node, int atDirection);
void parsegraph_Node_hasNodes(parsegraph_Node* node, int axis, int* hasNegative, int* hasPositive);
void parsegraph_Node_setIgnoreMouse(parsegraph_Node* node, int value);
int parsegraph_Node_ignoresMouse(parsegraph_Node* node);
int parsegraph_Node_isClickable(parsegraph_Node* node);
int parsegraph_Node_hasChildAt(parsegraph_Node* node, int direction);
int parsegraph_Node_hasAnyNodes(parsegraph_Node* node);

parsegraph_Node* parsegraph_Node_nodeUnderCoords(parsegraph_Node* node, float x, float y, float userScale);
parsegraph_Style* parsegraph_Node_blockStyle(parsegraph_Node* node);
int parsegraph_Node_isSelected(parsegraph_Node* node);
void parsegraph_Node_setSelected(parsegraph_Node* node, int selected);
int parsegraph_Node_isSelectedAt(parsegraph_Node* node, int direction);
float parsegraph_Node_horizontalPadding(parsegraph_Node* node);
float parsegraph_Node_verticalPadding(parsegraph_Node* node);
float parsegraph_Node_verticalSeparation(parsegraph_Node* node, int direction);
float parsegraph_Node_horizontalSeparation(parsegraph_Node* node, int direction);

struct parsegraph_NodeTraversal {
parsegraph_ArrayList* ordering;
int(*filterFunc)(void*, parsegraph_Node*);
void(*actionFunc)(void*, parsegraph_Node*);
void* thisArg;
int timeout;
int i;
};
typedef struct parsegraph_NodeTraversal parsegraph_NodeTraversal;
parsegraph_NodeTraversal* parsegraph_Node_traverse(parsegraph_Node* node, int(*filterFunc)(void*, parsegraph_Node*), void(*actionFunc)(void*,parsegraph_Node*), void* thisArg, int timeout);
int parsegraph_Node_continueTraverse(parsegraph_NodeTraversal* nd);
parsegraph_Node* parsegraph_Node_spawnNode(parsegraph_Node* node, int spawnDirection, int newType);
parsegraph_Node* parsegraph_Node_connectNode(parsegraph_Node* node, int inDirection, parsegraph_Node* nodeToConnect);
int parsegraph_Node_type(parsegraph_Node* node);
void parsegraph_Node_setType(parsegraph_Node* node, int newType);
void parsegraph_Node_assignParent(parsegraph_Node* node, parsegraph_Node* parentNode, int fromDirection);
void parsegraph_Node_eraseNode(parsegraph_Node* node, int givenDirection);
parsegraph_Node* parsegraph_Node_disconnectNode(parsegraph_Node* node, int givenDirection);
int parsegraph_Node_hasChangeListener(parsegraph_Node* node);
float parsegraph_Node_lineLengthAt(parsegraph_Node* node, int direction);
parsegraph_Extent* parsegraph_Node_extentsAt(parsegraph_Node* node, int atDirection);
float parsegraph_Node_extentOffsetAt(parsegraph_Node* node, int atDirection);
void parsegraph_Node_extentSize(parsegraph_Node* node, float* bodySize);
void parsegraph_Node_setLayoutPreference(parsegraph_Node* node, int given);
void parsegraph_Node_setNodeAlignmentMode(parsegraph_Node* node, int inDirection, int newAlignmentMode);
int parsegraph_Node_nodeAlignmentMode(parsegraph_Node* node, int inDirection);
int parsegraph_Node_type(parsegraph_Node* node);
void parsegraph_Node_setType(parsegraph_Node* node, int newType);
void* parsegraph_Node_value(parsegraph_Node* node);
void parsegraph_Node_setValue(parsegraph_Node* node, void* newValue, int report);
void* parsegraph_Node_scene(parsegraph_Node* node);
void parsegraph_Node_setScene(parsegraph_Node* node, void* scene);
int parsegraph_Node_typeAt(parsegraph_Node* node, int direction);
int parsegraph_Node_label(parsegraph_Node* node, UChar* buf, int len);
int parsegraph_Node_labelUTF8(parsegraph_Node* node, char* buf, int len);
parsegraph_Label* parsegraph_Node_realLabel(parsegraph_Node* node);
void parsegraph_Node_setLabel(parsegraph_Node* node, const UChar* text, int len, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Node_setLabelUTF8(parsegraph_Node* node, const char* text, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Style* parsegraph_Node_blockStyle(parsegraph_Node* node);
void parsegraph_Node_setBlockStyle(parsegraph_Node* node, parsegraph_Style* style);
int parsegraph_Node_inNodeBody(parsegraph_Node* node, float x, float y, float userScale);
int parsegraph_Node_inNodeExtents(parsegraph_Node* node, float x, float y, float userScale);

struct parsegraph_CommitLayoutTraversal {
parsegraph_Node* root;
parsegraph_Node* node;
int timeout;
struct timespec startTime;
};
typedef struct parsegraph_CommitLayoutTraversal parsegraph_CommitLayoutTraversal;
int parsegraph_Node_commitLayout(parsegraph_Node* node, float* bodySize);
int parsegraph_Node_continueCommitLayout(parsegraph_CommitLayoutTraversal* cl);
int parsegraph_Node_commitLayoutIteratively(parsegraph_Node* node, parsegraph_CommitLayoutTraversal* cl);
float parsegraph_findConsecutiveLength(parsegraph_Node* node, int inDirection);
int parsegraph_Node_canonicalLayoutPreference(parsegraph_Node* node);
float parsegraph_Node_separationAt(parsegraph_Node* node, int inDirection);
parsegraph_Node* parsegraph_labeledBud(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Node* parsegraph_labeledSlot(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
parsegraph_Node* parsegraph_labeledBlock(apr_pool_t* pool, UChar* label, int len, parsegraph_GlyphAtlas* glyphAtlas);
int parsegraph_Node_ignoresMouse(parsegraph_Node*);
void parsegraph_Node_showInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary);
void parsegraph_Node_showNodeInCamera(parsegraph_Node* node, parsegraph_Camera* cam, int onlyScaleIfNecessary);
void parsegraph_Node_dump(parsegraph_Node* node);
#endif // parsegraph_graph_Node_INCLUDED
