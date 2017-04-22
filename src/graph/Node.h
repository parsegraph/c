#ifndef parsegraph_graph_Node_INCLUDED
#define parsegraph_graph_Node_INCLUDED

#include <apr_pools.h>
#include "Extent.h"
#include "NodeType.h"

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

struct parsegraph_Label;
typedef struct parsegraph_Label parsegraph_Label;

struct parsegraph_Style;
typedef struct parsegraph_Style parsegraph_Style;

struct parsegraph_Node {
    apr_pool_t* pool;
    int _id;
    parsegraph_DirectionData _neighbors[6];

    parsegraph_PaintGroup* _paintGroup;
    void(*_keyListener)(void*, const char*);
    void* _keyListenerThisArg;
    void(*_clickListener)(void*, const char*);
    void* _clickListenerThisArg;
    int _type;

    parsegraph_Style* _style;
    parsegraph_Label* _label;
    float _labelX;
    float _labelY;
    int _rightToLeft;

    void* _value;
    int _selected;

    parsegraph_Node* _prevTabNode;
    parsegraph_Node* _nextTabNode;

    void* _scene;

    float _scale;
    float _absoluteXPos;
    float _absoluteYPos;
    float _absoluteScale;

    int _layoutState;
    int _nodeFit;
    int _layoutPreference;
    int _parentDirection;
};

extern int parsegraph_Node_COUNT;

parsegraph_Node* parsegraph_Node_new(apr_pool_t* pool, int newType, parsegraph_Node* fromNode, int parentDirection);
void parsegraph_Node_destroy(parsegraph_Node* node);
void parsegraph_chainTab(parsegraph_Node* a, parsegraph_Node* b, parsegraph_Node** swappedOut);
float parsegraph_Node_x(parsegraph_Node* node);
float parsegraph_Node_y(parsegraph_Node* node);
float parsegraph_Node_scale(parsegraph_Node* node);
float parsegraph_Node_setScale(parsegraph_Node* node, float scale);
float parsegraph_Node_setRightToLeft(parsegraph_Node* node, float val);
float parsegraph_Node_rightToLeft(parsegraph_Node* node);
void parsegraph_Node_commitAbsolutePos(parsegraph_Node* node);
void parsegraph_Node_positionWasChanged(parsegraph_Node* node);
float parsegraph_Node_absoluteX(parsegraph_Node* node);
float parsegraph_Node_absoluteY(parsegraph_Node* node);
float parsegraph_Node_absoluteScale(parsegraph_Node* node);
void parsegraph_Node_setPosAt(parsegraph_Node* node, int inDirection, float x, float y);
void parsegraph_Node_setPaintGroup(parsegraph_Node* node, parsegraph_PaintGroup* paintGroup);

#endif // parsegraph_graph_Node_INCLUDED
