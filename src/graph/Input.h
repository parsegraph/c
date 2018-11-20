#ifndef parsegraph_Input_INCLUDED
#define parsegraph_Input_INCLUDED

#include "Graph.h"
#include "time.h"
#include "Camera.h"
#include "SpotlightPainter.h"
#include <time.h>

struct parsegraph_Label;
typedef struct parsegraph_Label parsegraph_Label;

struct parsegraph_Touch {
char identifier[64];
float x;
float y;
float startX;
float startY;
struct timespec touchstart;
int has_touchstart;
};
typedef struct parsegraph_Touch parsegraph_Touch;

struct parsegraph_TouchEvent {
float clientX;
float clientY;
char identifier[64];
};
typedef struct parsegraph_TouchEvent parsegraph_TouchEvent;

struct parsegraph_Input {
apr_pool_t* pool;
parsegraph_Graph* _graph;
parsegraph_Camera* _camera;
void(*listener)(parsegraph_Input*, int, const char*, int, void*);
void* listenerThisArg;
void(*attachedMouseListener)(parsegraph_Input*, float, float);
struct timespec mousedownTime;
float touchX;
float touchY;
float lastMouseX;
float lastMouseY;
float mousedownX;
float mousedownY;
float zoomTouchDistance;
parsegraph_ArrayList* monitoredTouches;
int _updateRepeatedly;
parsegraph_BlockPainter* _caretPainter;
float _caretPos[2];
float _caretColor[4];
parsegraph_Node* _focusedNode;
int _focusedLabel;
parsegraph_SpotlightPainter* _spotlightPainter;
float _spotlightColor[4];
int focused;
apr_hash_t* keydowns;
parsegraph_Node* selectedSlider;
struct timespec touchstartTime;
int has_touchstartTime;
int isDoubleTouch;
void* touchendTimeout;
int isDoubleClick;
void* mouseupTimeout;
};
typedef struct parsegraph_Input parsegraph_Input;

parsegraph_Input* parsegraph_Input_new();
void parsegraph_Input_paint(parsegraph_Input* input);
void parsegraph_Input_render(parsegraph_Input* input, float* world);
parsegraph_Node* parsegraph_Input_checkForNodeClick(parsegraph_Input* input, float clientX, float clientY);
void parsegraph_Input_Dispatch(parsegraph_Input* input, int arg1, const char* event, int arg2);
void parsegraph_Input_mouseDragListener(parsegraph_Input* input, float mouseX, float mouseY);
const char* parsegraph_Input_getproperkeyname(parsegraph_Input* input, const char* keyName, int keyCode);
void parsegraph_Input_removeMouseListener(parsegraph_Input* input);
void parsegraph_Input_mousedown(parsegraph_Input* input, float clientX, float clientY);
void parsegraph_Input_mousemove(parsegraph_Input* input, float clientX, float clientY);
int parsegraph_Input_removeTouchListener(parsegraph_Input* input, parsegraph_ArrayList* changedTouches);
void parsegraph_Input_afterTouchTimeout(void* data);
void parsegraph_Input_keydown(parsegraph_Input* input, const char* keyName, int keyCode, int altKey, int metaKey, int ctrlKey, int shiftKey);
void parsegraph_Input_onblur(parsegraph_Input* input);
void parsegraph_Input_onfocus(parsegraph_Input* input);
void parsegraph_Input_onWheel(parsegraph_Input* input, float clientX, float clientY, float angleDelta);
void parsegraph_Input_keyup(parsegraph_Input* input, const char* keyName, int keyCode);
int parsegraph_Input_Get(parsegraph_Input* input, const char* key);
float parsegraph_Input_Elapsed(parsegraph_Input* input, const char* key, struct timespec t);
int parsegraph_Input_UpdateRepeatedly(parsegraph_Input* input);
int parsegraph_Input_Update(parsegraph_Input* input, struct timespec t);
void parsegraph_Input_setFocusedNode(parsegraph_Input* input, parsegraph_Node* focusedNode);
int parsegraph_Input_focusedLabel(parsegraph_Input* input);
void parsegraph_Input_render(parsegraph_Input* input, float* world);
void parsegraph_Input_touchstart(parsegraph_Input* input, parsegraph_ArrayList* changedTouches);
void parsegraph_Input_touchmove(parsegraph_Input* input, parsegraph_ArrayList* changedTouches);
void parsegraph_Input_SetListener(parsegraph_Input* input, void(*listener)(parsegraph_Input*, int, const char*, int, void*), void* thisArg);

#endif // parsegraph_Input_INCLUDED
