#include <apr_strings.h>
#include "Input.h"
#include "log.h"
#include "../die.h"
#include <stdio.h>
#include "Rect.h"
#include "gl.h"
#include "Label.h"
#include "Graph.h"
#include "World.h"
#include "timing.h"
#include "Color.h"
#include "parsegraph_math.h"
#include "NodeAlignment.h"
#include <stdlib.h>

const char* parsegraph_RESET_CAMERA_KEY = "Escape";
const char* parsegraph_CLICK_KEY = "q";

const char* parsegraph_MOVE_UPWARD_KEY = "ArrowUp";
const char* parsegraph_MOVE_DOWNWARD_KEY = "ArrowDown";
const char* parsegraph_MOVE_BACKWARD_KEY = "ArrowLeft";
const char* parsegraph_MOVE_FORWARD_KEY = "ArrowRight";
float parsegraph_CARET_COLOR[] = {0, 0, 0, .5};
float parsegraph_FOCUSED_SPOTLIGHT_COLOR[] = {1, 1, 1, .5};
float parsegraph_FOCUSED_SPOTLIGHT_SCALE = 6;

//const char* parsegraph_MOVE_UPWARD_KEY = "w";
//const char* parsegraph_MOVE_DOWNWARD_KEY = "s";
//const char* parsegraph_MOVE_BACKWARD_KEY = "a";
//const char* parsegraph_MOVE_FORWARD_KEY = "d";

const char* parsegraph_ZOOM_IN_KEY = "ZoomIn";
const char* parsegraph_ZOOM_OUT_KEY = "ZoomOut";

static int parsegraph_INPUT_COUNT = 0;

parsegraph_Input* parsegraph_Input_new(parsegraph_Graph* graph, parsegraph_Camera* camera)
{
    parsegraph_Input* input = apr_palloc(graph->_surface->pool, sizeof(*input));
    input->_graph = graph;
    input->_camera = camera;

    input->_id = ++parsegraph_INPUT_COUNT;

    input->attachedMouseListener = 0;

    input->touchX = 0;
    input->touchY = 0;

    input->lastMouseX = 0;
    input->lastMouseY = 0;

    input->mousedownX = 0;
    input->mousedownY = 0;

    input->_updateRepeatedly = 0;

    input->_caretPainter = 0;
    input->_caretPos[0] = 0;
    input->_caretPos[1] = 0;
    parsegraph_Color_copy(input->_caretColor, parsegraph_CARET_COLOR);
    input->_focusedNode = 0;
    input->_focusedLabel = 0;

    input->_spotlightPainter = 0;
    parsegraph_Color_copy(input->_spotlightColor, parsegraph_FOCUSED_SPOTLIGHT_COLOR);

    // Whether the container is focused and not blurred.
    input->focused = 0;

    // A map of event.key's to a true value.
    input->pool = graph->_surface->pool;
    input->keydowns = parsegraph_ArrayList_new(input->pool);

    input->zoomTouchDistance = 0;
    input->monitoredTouches = parsegraph_ArrayList_new(input->pool);

    //parsegraph_addEventListener(graph.container(), "focus", parsegraph_Input_onfocus);
    //parsegraph_addEventListener(graph.container(), "blur", parsegraph_Input_onblur);
    //parsegraph_addEventMethod(graph.canvas(), "DOMMouseScroll", parsegraph_Input_onWheel, this, false);
    //parsegraph_addEventMethod(graph.canvas(), "mousewheel", parsegraph_Input_onWheel, this, false);
    //parsegraph_addEventMethod(graph.canvas(), "touchmove", parsegraph_Input_touchmove);

    input->selectedSlider = 0;

    input->has_touchstartTime = 0;

    //parsegraph_addEventMethod(graph.canvas(), "touchstart", parsegraph_Input_touchstart);

    input->isDoubleTouch = 0;
    input->touchendTimeout = 0;

    //parsegraph_addEventMethod(graph.canvas(), "touchend", removeTouchListener, this);
    //parsegraph_addEventMethod(graph.canvas(), "touchcancel", removeTouchListener, this);

    // Mouse event handling

    //parsegraph_addEventMethod(graph.canvas(), "mousemove", function(event) { }, this);
    //parsegraph_addEventMethod(graph.canvas(), "mousedown", function(event) { }, this);

    input->isDoubleClick = 0;
    input->mouseupTimeout = 0;

    //parsegraph_addEventMethod(graph.canvas(), "keydown", function(event) { }, this);
    //parsegraph_addEventMethod(graph.canvas(), "keyup", function(event) { }, this);

    //parsegraph_addEventMethod(graph.canvas(), "mouseup", removeMouseListener, this);

    // Ensure the mousemove listener is removed if we switch windows or change focus.
    //parsegraph_addEventMethod(graph.canvas(), "mouseout", removeMouseListener, this);

    input->listener = 0;
    input->listenerThisArg = 0;
    return input;
};

void parsegraph_Input_mousemove(parsegraph_Input* input, float clientX, float clientY)
{
    if(parsegraph_Carousel_isCarouselShown(parsegraph_Graph_carousel(input->_graph))) {
        input->lastMouseX = clientX;
        input->lastMouseY = clientY;

        parsegraph_Input_Dispatch(input,
            parsegraph_Carousel_mouseOverCarousel(parsegraph_Graph_carousel(input->_graph), clientX, clientY),
            "mousemove carousel",
            0
        );
        return;
    }

    // Moving during a mousedown i.e. dragging (or zooming)
    if(input->attachedMouseListener) {
        return input->attachedMouseListener(input, clientX, clientY);
    }

    // Just a mouse moving over the (focused) canvas.
    parsegraph_Input_Dispatch(
        input,
        parsegraph_World_mouseOver(parsegraph_Graph_world(input->_graph), clientX, clientY),
        "mousemove world",
        0
    );
    input->lastMouseX = clientX;
    input->lastMouseY = clientY;
}

void parsegraph_Input_mousedown(parsegraph_Input* input, float clientX, float clientY)
{
    input->focused = 1;
    //event.preventDefault();
    //graph.canvas().focus();

    input->lastMouseX = clientX;
    input->lastMouseY = clientY;

    input->mousedownX = clientX;
    input->mousedownY = clientY;

    if(parsegraph_Carousel_clickCarousel(parsegraph_Graph_carousel(input->_graph), clientX, clientY, 1)) {
        //console.log("Carousel click processed.");
        return;
    }

    input->_focusedLabel = 0;
    input->_focusedNode = 0;
    if(input->_caretPainter) {
        parsegraph_BlockPainter_initBuffer(input->_caretPainter, 1);
    }
    if(input->_spotlightPainter) {
        parsegraph_SpotlightPainter_clear(input->_spotlightPainter);
    }

    // Dragging on the canvas.
    input->attachedMouseListener = parsegraph_Input_mouseDragListener;
    //console.log("Repainting graph");
    parsegraph_Input_Dispatch(input, 0, "mousedown canvas", 0);

    //console.log("Setting mousedown time");
    clock_gettime(CLOCK_REALTIME, &input->mousedownTime);

    // This click is a second click following a recent click; it's a double-click.
    if(input->mouseupTimeout) {
        parsegraph_clearTimeout(input->_graph->_surface, input->mouseupTimeout);
        input->mouseupTimeout = 0;
        input->isDoubleClick = 1;
    }
}

void parsegraph_Input_onfocus(parsegraph_Input* input)
{
    input->focused = 1;
}

void parsegraph_Input_onblur(parsegraph_Input* input)
{
    input->focused = 0;
}

/**
 * The receiver of all graph canvas wheel events.
 */
void parsegraph_Input_onWheel(parsegraph_Input* input, float clientX, float clientY, float angleDelta)
{
    //event.preventDefault();

    //input->_graph->_surface->displayWidth
    //

    // Get the mouse coordinates, relative to bottom-left of the canvas.
    //float x = clientX - parsegraph_Camera_x(input->_camera);
    //float y = clientY - parsegraph_Camera_y(input->_camera);
    float x = parsegraph_Camera_x(input->_camera) - clientX;
    float y = parsegraph_Camera_y(input->_camera) - clientY;

    //parsegraph_log("Zooming to %f, %f. Current is %f, %f. Other is %f, %f\n",
            //x, y,
            //parsegraph_Camera_x(input->_camera),
            //parsegraph_Camera_y(input->_camera),
            //parsegraph_Surface_getWidth(input->_graph->_surface) / 2,
            //parsegraph_Surface_getHeight(input->_graph->_surface) / 2
        //);

    // Adjust the scale.
    float numSteps = .4 * -angleDelta;
    //if(numSteps > 0 || parsegraph_Camera_scale(input->_camera) >= .01) {
        parsegraph_Camera_zoomToPoint(input->_camera, powf(1.1, numSteps), x, y
            //parsegraph_Surface_getWidth(input->_graph->_surface) / 2,
            //parsegraph_Surface_getHeight(input->_graph->_surface) / 2
        );
    //}

    parsegraph_Input_Dispatch(input, 0, "wheel", 1);
}

parsegraph_Touch* parsegraph_Input_getTouchByIdentifier(parsegraph_Input* input, const char* identifier)
{
    for(int i = 0; i < parsegraph_ArrayList_length(input->monitoredTouches); ++i) {
        parsegraph_Touch* t = parsegraph_ArrayList_at(input->monitoredTouches, i);
        if(!strcmp(t->identifier, identifier)) {
            return t;
        }
    }
    return 0;
}

parsegraph_Touch* parsegraph_Input_removeTouchByIdentifier(parsegraph_Input* input, const char* identifier)
{
    //parsegraph_log("Removing touch '%s'\n", identifier);
    for(int i = 0; i < parsegraph_ArrayList_length(input->monitoredTouches); ++i) {
        parsegraph_Touch* t = parsegraph_ArrayList_at(input->monitoredTouches, i);
        //parsegraph_log("Checking monitored %s against touch '%s'\n", t->identifier, identifier);
        if(!strcmp(t->identifier, identifier)) {
            parsegraph_ArrayList_splice(input->monitoredTouches, i, 1);
            return t;
        }
    }
    return 0;
}

void parsegraph_Input_afterMouseTimeout(void* data)
{
    parsegraph_Input* input = data;
    input->mouseupTimeout = 0;

    if(input->isDoubleClick) {
        // Double click ended.
        input->isDoubleClick = 0;
        //console.log("Double click detected");
    }
    else {
        //console.log("Single click detected");
    }

    // Single click ended.
    input->isDoubleClick = 0;

    // We double-clicked.
}

void parsegraph_Input_removeMouseListener(parsegraph_Input* input)
{
    //console.log("MOUSEUP");

    if(parsegraph_Carousel_clickCarousel(parsegraph_Graph_carousel(input->_graph), input->lastMouseX, input->lastMouseY, 0)) {
        //console.log("Carousel handled event.");
        return;
    }
    if(!input->attachedMouseListener) {
        //console.log("No attached listeenr");
        return;
    }
    input->attachedMouseListener = 0;

    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    if(
        parsegraph_timediffMs(&now, &input->mousedownTime) < parsegraph_CLICK_DELAY_MILLIS
    ) {
        //console.log("Click detected");
        if(input->isDoubleClick) {
            parsegraph_Input_afterMouseTimeout(input);
            return;
        }
        input->mouseupTimeout = parsegraph_setTimeout(
            input->_graph->_surface,
            parsegraph_Input_afterMouseTimeout,
            parsegraph_CLICK_DELAY_MILLIS/5,
            input
        );

        // test! 12
        if(parsegraph_Input_checkForNodeClick(input, input->lastMouseX, input->lastMouseY)) {
            // A significant node was clicked.
            //console.log("Node clicked.");
            parsegraph_Input_Dispatch(input, 1, "mousedown node", 0);
            return;
        }
    }
    else {
        //console.log("Click missed timeout");
    }
}

/**
 * Receives events that cause the camera to be moved.
 */
void parsegraph_Input_mouseDragListener(parsegraph_Input* input, float mouseX, float mouseY)
{
    float deltaX = mouseX - input->lastMouseX;
    float deltaY = mouseY - input->lastMouseY;
    input->lastMouseX = mouseX;
    input->lastMouseY = mouseY;

    float camScale = parsegraph_Camera_scale(input->_camera);
    //parsegraph_log("%f, %f, %f\n", deltaX, deltaY, camScale);
    parsegraph_Camera_adjustOrigin(input->_camera,
        deltaX / camScale,
        deltaY / camScale
    );
    parsegraph_Input_Dispatch(input, 0, "mouseDrag world", 1);
}

void parsegraph_Input_keydown(parsegraph_Input* input, const char* keyName, int keyCode, int altKey, int metaKey, int ctrlKey, int shiftKey)
{
    if(altKey || metaKey) {
        //console.log("Key event had ignored modifiers");
        return;
    }
    if(ctrlKey && shiftKey) {
        return;
    }

    keyName = parsegraph_Input_getproperkeyname(input, keyName, keyCode);
    //fprintf(stderr, "Key pressed: %s\n", keyName);
    if(input->selectedSlider) {
        if(strlen(keyName) == 0) {
            return;
        }

        long diff = 1;
        if(!strcmp(keyName, parsegraph_MOVE_BACKWARD_KEY)) {
            parsegraph_Node_setValue(input->selectedSlider, (void*)(long)parsegraph_max(0, (long)parsegraph_Node_value(input->selectedSlider) - diff), 1);
            parsegraph_Node_layoutWasChanged(input->selectedSlider, parsegraph_INWARD);
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
        if(!strcmp(keyName, parsegraph_MOVE_FORWARD_KEY)) {
            parsegraph_Node_setValue(input->selectedSlider, (void*)(long)parsegraph_min(1, (long)parsegraph_Node_value(input->selectedSlider) + diff), 1);
            parsegraph_Node_layoutWasChanged(input->selectedSlider, parsegraph_INWARD);
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
        if(!strcmp(keyName, "Space") || !strcmp(keyName, "Spacebar") || !strcmp(keyName, " ") || !strcmp(keyName, parsegraph_RESET_CAMERA_KEY)) {
            parsegraph_Node_layoutWasChanged(input->selectedSlider, parsegraph_INWARD);
            input->attachedMouseListener = 0;
            input->selectedSlider = 0;
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
    }
    else if(input->_focusedNode && input->focused) {
        if(strlen(keyName) == 0) {
            return;
        }
        if(input->_focusedNode->_realLabel && ctrlKey) {
            if(parsegraph_Label_ctrlKey(input->_focusedNode->_realLabel, keyName)) {
                //console.log("LAYOUT CHANGED");
                parsegraph_Node_layoutWasChanged(input->_focusedNode, parsegraph_INWARD);
                parsegraph_Graph_scheduleRepaint(input->_graph);
                return;
            }
        }
        else if(parsegraph_Node_hasKeyListener(input->_focusedNode) && parsegraph_Node_key(input->_focusedNode, keyName) != 0
        ) {
            //console.log("KEY PRESSED FOR LISTENER; LAYOUT CHANGED");
            parsegraph_Node_layoutWasChanged(input->_focusedNode, parsegraph_INWARD);
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
        else if(input->_focusedNode->_realLabel && parsegraph_Label_editable(input->_focusedNode->_realLabel) && parsegraph_Label_key(input->_focusedNode->_realLabel, keyName)) {
            //console.log("LABEL ACCEPTS KEY; LAYOUT CHANGED");
            parsegraph_Node_layoutWasChanged(input->_focusedNode, parsegraph_INWARD);
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
        // Didn't move the caret, so interpret it as a key move
        // on the node itself.
        parsegraph_Node* node = input->_focusedNode;
        int skipHorizontalInward = ctrlKey;
        //int skipVerticalInward = ctrlKey;
        for(;;) {
            if(!strcmp(keyName, parsegraph_RESET_CAMERA_KEY)) {
                input->_focusedNode = 0;
                input->_focusedLabel = 0;
            }
            else if(!strcmp(keyName, parsegraph_MOVE_BACKWARD_KEY)) {
                parsegraph_Node* neighbor = parsegraph_Node_nodeAt(node, parsegraph_BACKWARD);
                if(neighbor) {
                    input->_focusedNode = neighbor;
                    input->_focusedLabel = 1;
                    parsegraph_Graph_scheduleRepaint(node->_graph);
                    return;
                }
                neighbor = parsegraph_Node_nodeAt(node, parsegraph_OUTWARD);
                if(neighbor) {
                    input->_focusedNode = neighbor;
                    input->_focusedLabel = 1;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    return;
                }
            }
            else if(!strcmp(keyName, parsegraph_MOVE_FORWARD_KEY)) {
                if(
                    parsegraph_Node_hasNode(node, parsegraph_INWARD) &&
                    parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) != parsegraph_ALIGN_VERTICAL &&
                    !skipHorizontalInward
                ) {
                    input->_focusedNode = parsegraph_Node_nodeAt(node, parsegraph_INWARD);
                    input->_focusedLabel = 1;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    return;
                }
                //console.log("ArrowRight");
                parsegraph_Node* neighbor = parsegraph_Node_nodeAt(node, parsegraph_FORWARD);
                if(neighbor) {
                    input->_focusedNode = neighbor;
                    input->_focusedLabel = !ctrlKey;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    return;
                }
                neighbor = parsegraph_Node_nodeAt(node, parsegraph_OUTWARD);
                if(neighbor) {
                    //console.log("Going outward");
                    skipHorizontalInward = 1;
                    node = neighbor;
                    continue;
                }
                // Search up the parents hoping that an inward node can be escaped.
                for(;;) {
                    if(parsegraph_Node_isRoot(node)) {
                        // The focused node is not within an inward node.
                        return;
                    }
                    int pdir = parsegraph_Node_parentDirection(node);
                    node = parsegraph_Node_nodeAt(node, pdir);
                    if(pdir == parsegraph_OUTWARD) {
                        // Found the outward node to escape.
                        skipHorizontalInward = 1;
                        break;
                    }
                }
                // Continue traversing using the found node.
                continue;
            }
            else if(!strcmp(keyName, parsegraph_MOVE_DOWNWARD_KEY)) {
                parsegraph_Node* neighbor = parsegraph_Node_nodeAt(node, parsegraph_DOWNWARD);
                if(neighbor) {
                    input->_focusedNode = neighbor;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    input->_focusedLabel = 1;
                    return;
                }
                break;
            }
            else if(!strcmp(keyName, parsegraph_MOVE_DOWNWARD_KEY)) {
                parsegraph_Node* neighbor = parsegraph_Node_nodeAt(node, parsegraph_UPWARD);
                if(neighbor) {
                    input->_focusedNode = neighbor;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    input->_focusedLabel = 1;
                    return;
                }
                break;
            }
            else if(!strcmp(keyName, "Backspace")) {
                break;
            }
            else if(!strcmp(keyName, "Tab")) {
                parsegraph_Node* toNode = shiftKey ?
                    input->_focusedNode->_prevTabNode :
                    input->_focusedNode->_nextTabNode;
                if(toNode) {
                    input->_focusedNode = toNode;
                    parsegraph_Graph_scheduleRepaint(input->_graph);
                    //event.preventDefault();
                    break;
                }
                // Fall through otherwise.
                break;
            }
            else if(!strcmp(keyName, "Enter")) {
                if(parsegraph_Node_hasKeyListener(input->_focusedNode)) {
                    if(parsegraph_Node_key(input->_focusedNode, "Enter")) {
                        // Node handled it.
                        //event.preventDefault();
                        break;
                    }
                    // Nothing handled it.
                }
                // Fall through.
            }
            else {
                return;
            }
            break;
        }

        if(input->_focusedNode) {
            return;
        }
        if(keyName == parsegraph_RESET_CAMERA_KEY) {
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return;
        }
    }

    if(parsegraph_Input_Get(input, keyName)) {
        // Already processed.
        parsegraph_log("Key event, but already processed.");
        return;
    }

    struct parsegraph_KeyDown* kd = malloc(sizeof(*kd));
	clock_gettime(CLOCK_REALTIME, &kd->when);
    strcpy(kd->keyName, keyName);
    //parsegraph_log("Logging %s keypress at %lld.%lld\n", keyName, kd->when.tv_sec, kd->when.tv_nsec);
    parsegraph_ArrayList_push(input->keydowns, kd);
	if(!parsegraph_Input_Get(input, keyName)) {
	    parsegraph_die("Failed to actually save keydown");
	}

    if(!strcmp(keyName, parsegraph_CLICK_KEY)) {
        parsegraph_Carousel* carousel = parsegraph_Graph_carousel(input->_graph);
        //console.log("Q key for click pressed!");
        if(parsegraph_Carousel_clickCarousel(carousel, input->lastMouseX, input->lastMouseY, 1)) {
            return;
        }
        //if(graph.nodeUnderCursor()) {
            //graph.nodeUnderCursor().click();
        //}
        if(parsegraph_Carousel_isShown(carousel)) {
            parsegraph_Carousel_hideCarousel(carousel);
            return;
        }
        parsegraph_Input_Dispatch(input, 0, "keydown", 1);
    }
    else if(!strcmp(keyName, parsegraph_RESET_CAMERA_KEY)) {
        parsegraph_Carousel* carousel = parsegraph_Graph_carousel(input->_graph);
        if(parsegraph_Carousel_isShown(carousel)) {
            parsegraph_Carousel_hideCarousel(carousel);
            return;
        }
    }
    else if(
        !strcmp(keyName, parsegraph_ZOOM_IN_KEY) ||
        !strcmp(keyName, parsegraph_ZOOM_OUT_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_DOWNWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_UPWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_BACKWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_FORWARD_KEY)) {
        parsegraph_Input_Dispatch(input, 0, "keydown", 1);
        return;
    }
}

void parsegraph_Input_keyup(parsegraph_Input* input, const char* keyName, int keyCode)
{
    keyName = parsegraph_Input_getproperkeyname(input, keyName, keyCode);
    //fprintf(stderr, "Key released: %s\n", keyName);

    if(!parsegraph_Input_Get(input, keyName)) {
        // Already processed.
        return;
    }

    for(int i = 0; i < parsegraph_ArrayList_length(input->keydowns); ++i) {
        struct parsegraph_KeyDown* kd = parsegraph_ArrayList_at(input->keydowns, i);
        if(!strcmp(kd->keyName, keyName)) {
            //parsegraph_log("Removing keydown for %s\n", keyName);
            parsegraph_ArrayList_splice(input->keydowns, i, 1);
            free(kd);
            break;
        }
    }

    if(!strcmp(keyName, parsegraph_CLICK_KEY)) {
        parsegraph_Carousel* carousel = parsegraph_Graph_carousel(input->_graph);
        if(parsegraph_Carousel_clickCarousel(carousel, input->lastMouseX, input->lastMouseY, 0)) {
            //console.log("Carousel processed event.");
            return;
        }
        // fall through
    }
    else if(
        !strcmp(keyName, parsegraph_ZOOM_IN_KEY) ||
        !strcmp(keyName, parsegraph_ZOOM_OUT_KEY) ||
        !strcmp(keyName, parsegraph_RESET_CAMERA_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_DOWNWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_UPWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_BACKWARD_KEY) ||
        !strcmp(keyName, parsegraph_MOVE_FORWARD_KEY)
    ) {
        parsegraph_Input_Dispatch(input, 0, "keyup", 1);
        return;
    }
}

void parsegraph_Input_touchmove(parsegraph_Input* input, parsegraph_ArrayList* changedTouches)
{
    if(!input->focused) {
        return;
    }
    //event.preventDefault();
    //console.log("touchmove", event);

    for(int i = 0; i < parsegraph_ArrayList_length(changedTouches); ++i) {
        parsegraph_TouchEvent* touch = parsegraph_ArrayList_at(changedTouches, i);
        parsegraph_Touch* touchRecord = parsegraph_Input_getTouchByIdentifier(input, touch->identifier);

        if(parsegraph_ArrayList_length(input->monitoredTouches) == 1) {
            parsegraph_Carousel* carousel = parsegraph_Graph_carousel(input->_graph);
            if(!parsegraph_Carousel_isShown(carousel)) {
                // Move.
                parsegraph_Camera_adjustOrigin(input->_camera,
                    (touch->clientX - touchRecord->x) / parsegraph_Camera_scale(input->_camera),
                    (touch->clientY - touchRecord->y) / parsegraph_Camera_scale(input->_camera)
                );
                parsegraph_Input_Dispatch(input, 0, "touchmove", 0);
            }
            else {
                parsegraph_Input_Dispatch(input, parsegraph_Carousel_mouseOverCarousel(carousel, touch->clientX, touch->clientY), "mousemove carousel", 0);
            }
        }
        touchRecord->x = touch->clientX;
        touchRecord->y = touch->clientY;
        input->lastMouseX = touch->clientX;
        input->lastMouseY = touch->clientY;
    }

    //parsegraph_log("Touches monitored: %d", parsegraph_ArrayList_length(input->monitoredTouches));
    int realMonitoredTouches = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(input->monitoredTouches); ++i) {
        parsegraph_Touch* touchRec = parsegraph_ArrayList_at(input->monitoredTouches, i);
        if(touchRec->has_touchstart) {
            realMonitoredTouches++;
        }
    }
    if(realMonitoredTouches > 1) {
        parsegraph_Touch* a = parsegraph_ArrayList_at(input->monitoredTouches, 0);
        parsegraph_Touch* b = parsegraph_ArrayList_at(input->monitoredTouches, 1);
        // Zoom.
        float dist = sqrtf(powf(b->x - a->x, 2) + powf(b->y - a->y, 2));
        float zoomCenterX, zoomCenterY;
        midPoint(a->x, a->y, b->x, b->y, &zoomCenterX, &zoomCenterY);
        if((dist / input->zoomTouchDistance) > 1 || parsegraph_Camera_scale(input->_camera) >= 0.01) {
            parsegraph_Camera_zoomToPoint(input->_camera,
                dist / input->zoomTouchDistance,
                zoomCenterX, zoomCenterY
            );
            parsegraph_Input_Dispatch(input, 0, "touchzoom", 0);
        }
        input->zoomTouchDistance = dist;
    }
}

const char* parsegraph_Input_getproperkeyname(parsegraph_Input* input, const char* keyName, int keyCode)
{
    //parsegraph_log("Proper name for %s\n", keyName);
    //console.log(keyName + " " + event.keyCode);
    if(!strcmp(keyName, "Enter")) {
        return keyName;
    }
    if(!strcmp(keyName, "Escape")) {
        return keyName;
    }
    if(!strcmp(keyName, "ArrowLeft")) {
        return keyName;
    }
    if(!strcmp(keyName, "ArrowRight")) {
        return keyName;
    }
    if(!strcmp(keyName, "ArrowUp")) {
        return keyName;
    }
    if(!strcmp(keyName, "ArrowDown")) {
        return keyName;
    }
    if(!strcmp(keyName, "-") || !strcmp(keyName, "_")) {
        return "ZoomOut";
    }
    if(!strcmp(keyName, "+") || !strcmp(keyName, "=")) {
        return "ZoomIn";
    }
    switch(keyCode) {
        case 13: return "Enter"; break;
        case 27: return "Escape"; break;
        case 37: return "ArrowLeft"; break;
        case 38: return "ArrowUp"; break;
        case 39: return "ArrowRight"; break;
        case 40: return "ArrowDown"; break;
    }
    return keyName;
}

void parsegraph_Input_sliderListener(parsegraph_Input* input, float mouseX, float mouseY);

parsegraph_Node* parsegraph_Input_checkForNodeClick(parsegraph_Input* input, float clientX, float clientY)
{
    float* mouseInWorld = matrixTransform2D(input->pool,
        makeInverse3x3(input->pool, parsegraph_Camera_worldMatrix(input->_camera)),
        clientX, clientY
    );
    //console.log(clientX, clientY);
    //console.log(mouseInWorld);
    parsegraph_Node* selectedNode = parsegraph_World_nodeUnderCoords(parsegraph_Graph_world(input->_graph), mouseInWorld[0], mouseInWorld[1]);
    if(!selectedNode) {
        //console.log("No node found under coords:", mouseInWorld);
        return 0;
    }

    //console.log("Node found for coords:", mouseInWorld, selectedNode);

    // Check if the selected node was a slider.
    if(parsegraph_Node_type(selectedNode) == parsegraph_SLIDER) {
        if(selectedNode == input->selectedSlider) {
            //console.log("Removing");
            input->selectedSlider = 0;
            input->attachedMouseListener = 0;
            parsegraph_Graph_scheduleRepaint(input->_graph);
            return 0;
        }
        //console.log("Slider node!");
        input->selectedSlider = selectedNode;
        input->attachedMouseListener = parsegraph_Input_sliderListener;
        parsegraph_Input_sliderListener(input, clientX, clientY);
        parsegraph_Graph_scheduleRepaint(input->_graph);
        return selectedNode;
    }

    // Check if the selected node has a click listener.
    if(parsegraph_Node_hasClickListener(selectedNode)) {
        //console.log("Selected Node has click listener", selectedNode);
        int rv = parsegraph_Node_click(selectedNode, "");
        if(rv != 0) {
            return selectedNode;
        }
    }

    // Check if the label was clicked.
    //console.log("Clicked");
    if(selectedNode->_realLabel && !isnan(selectedNode->_labelPos[0]) && parsegraph_Label_editable(selectedNode->_realLabel)) {
        //console.log("Clicked label");
        parsegraph_Label_click(selectedNode->_realLabel,
            (mouseInWorld[0] - selectedNode->_labelPos[0]) / selectedNode->_labelPos[2],
            (mouseInWorld[1] - selectedNode->_labelPos[1]) / selectedNode->_labelPos[2]
        );
        //console.log(selectedNode._label.caretLine());
        //console.log(selectedNode._label.caretPos());
        input->_focusedLabel = 1;
        input->_focusedNode = selectedNode;
        parsegraph_Graph_scheduleRepaint(input->_graph);
        return selectedNode;
    }
    if(selectedNode && !parsegraph_Node_ignoresMouse(selectedNode)) {
        //console.log("Setting focusedNode to ", selectedNode);
        input->_focusedNode = selectedNode;
        input->_focusedLabel = 0;
        parsegraph_Graph_scheduleRepaint(input->_graph);
        //console.log("Selected Node has nothing", selectedNode);
        return selectedNode;
    }

    return 0;
}

void parsegraph_Input_lastMouseCoords(parsegraph_Input* input, float* coords)
{
    coords[0] = input->lastMouseX;
    coords[1] = input->lastMouseY;
}

float parsegraph_Input_lastMouseX(parsegraph_Input* input)
{
    return input->lastMouseX;
}

float parsegraph_Input_lastMouseY(parsegraph_Input* input)
{
    return input->lastMouseY;
}

int parsegraph_Input_removeTouchListener(parsegraph_Input* input, parsegraph_ArrayList* changedTouches)
{
    //parsegraph_log("touchend\n");
    for(int i = 0; i < parsegraph_ArrayList_length(changedTouches); ++i) {
        parsegraph_Touch* touch = parsegraph_ArrayList_at(changedTouches, i);
        //parsegraph_log("Removing touch %lld (%d) using listener '%s'\n", touch, strlen(touch->identifier), touch->identifier);
        parsegraph_Input_removeTouchByIdentifier(input, touch->identifier);
    }

    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    if(input->has_touchstartTime && parsegraph_timediffMs(&now, &input->touchstartTime) < parsegraph_CLICK_DELAY_MILLIS) {
        input->touchendTimeout = parsegraph_setTimeout(input->_graph->_surface, parsegraph_Input_afterTouchTimeout, parsegraph_CLICK_DELAY_MILLIS, input);
    }

    parsegraph_Carousel_clickCarousel(parsegraph_Graph_carousel(input->_graph), input->lastMouseX, input->lastMouseY, 0);

    if(
        input->has_touchstartTime
        && parsegraph_timediffMs(&now, &input->touchstartTime) < parsegraph_CLICK_DELAY_MILLIS
    ) {
        if(parsegraph_Input_checkForNodeClick(input, input->lastMouseX, input->lastMouseY)) {
            // A significant node was clicked.
            parsegraph_Input_Dispatch(input, 1, "touchstart", 0);
            input->has_touchstartTime = 0;
            return 0;
        }
    }

    return 1;
}

void parsegraph_Input_sliderListener(parsegraph_Input* input, float mouseX, float mouseY)
{
    // Get the current mouse position, in world space.
    float* mouseInWorld = matrixTransform2D(input->pool,
        makeInverse3x3(input->pool, parsegraph_Camera_worldMatrix(input->_camera)),
        mouseX, mouseY
    );
    float x = mouseInWorld[0];
    //float y = mouseInWorld[1];

    //if(parsegraph_isVerticalNodeDirection(selectedSlider.parentDirection())) {
        float nodeSize[2];
        float nodeWidth = nodeSize[0];
        parsegraph_Node_absoluteSize(input->selectedSlider, nodeSize);
        if(x <= parsegraph_Node_absoluteX(input->selectedSlider) - nodeWidth / 2) {
            // To the left!
            parsegraph_Node_setValue(input->selectedSlider, 0, 1);
        }
        else if(x >= parsegraph_Node_absoluteX(input->selectedSlider) + nodeWidth / 2) {
            // To the right!
            parsegraph_Node_setValue(input->selectedSlider, (void*)(long)1, 1);
        }
        else {
            // In between.
            //console.log("x=" + x);
            //console.log("selectedSlider.absoluteX()=" + selectedSlider.absoluteX());
            //console.log("PCT: " + (x - selectedSlider.absoluteX()));
            //console.log("In between: " + ((nodeWidth/2 + x - selectedSlider.absoluteX()) / nodeWidth));
            parsegraph_Node_setValue(input->selectedSlider, (void*)(long)(
                100*((nodeWidth/2 + x - parsegraph_Node_absoluteX(input->selectedSlider)) / nodeWidth)
            ), 1);
        }
        parsegraph_Node_layoutWasChanged(input->selectedSlider, parsegraph_INWARD);
    //}
    if(parsegraph_Node_hasClickListener(input->selectedSlider)) {
        parsegraph_Node_click(input->selectedSlider, "slider");
    }
    parsegraph_Input_Dispatch(input, 1, "slider", 0);
    input->lastMouseX = mouseX;
    input->lastMouseY = mouseY;
};

void parsegraph_Input_SetListener(parsegraph_Input* input, void(*listener)(parsegraph_Input*, int, const char*, int, void*), void* thisArg)
{
    if(!listener) {
        input->listener = 0;
        return;
    }
    if(!thisArg) {
        thisArg = input;
    }
    input->listener = listener;
    input->listenerThisArg = thisArg;
}

void parsegraph_Input_touchstart(parsegraph_Input* input, parsegraph_ArrayList* changedTouches)
{
    //console.log("touchstart", event);
    //event.preventDefault();
    input->focused = 1;

    for(int i = 0; i < parsegraph_ArrayList_length(changedTouches); ++i) {
        parsegraph_TouchEvent* touch = parsegraph_ArrayList_at(changedTouches, i);
        parsegraph_Touch* touchRec = apr_palloc(input->pool, sizeof(*touchRec));
        strcpy(touchRec->identifier, touch->identifier);
        //parsegraph_log("New touch %s from %s\n", touchRec->identifier, touch->identifier);
        touchRec->x = touch->clientX;
        touchRec->y = touch->clientY;
        touchRec->startX = touch->clientX;
        touchRec->startY = touch->clientY;
        touchRec->has_touchstart = 0;
        parsegraph_ArrayList_push(input->monitoredTouches, touchRec);
        input->lastMouseX = touch->clientX;
        input->lastMouseY = touch->clientY;

        // Get the current mouse position, in world space.
        //alert(camera.worldMatrix());
        if(parsegraph_Carousel_clickCarousel(
            parsegraph_Graph_carousel(input->_graph),
            input->lastMouseX, input->lastMouseY, 1)) {
            //console.log("Carousel click processed.");
            return;
        }

        /*if(checkForNodeClick.call(this, lastMouseX, lastMouseY)) {
            // A significant node was clicked.
            this.Dispatch(true, "touchstart");
            touchstartTime = null;
            return;
        }*/

        clock_gettime(CLOCK_REALTIME, &touchRec->touchstart);
        touchRec->has_touchstart = 1;
        input->has_touchstartTime = 1;
        clock_gettime(CLOCK_REALTIME, &input->touchstartTime);
    }

    int realMonitoredTouches = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(input->monitoredTouches); ++i) {
        parsegraph_Touch* touchRec = parsegraph_ArrayList_at(input->monitoredTouches, i);
        if(touchRec->has_touchstart) {
            realMonitoredTouches++;
        }
    }
    if(realMonitoredTouches > 1) {
        parsegraph_Touch* a = parsegraph_ArrayList_at(input->monitoredTouches, 0);
        parsegraph_Touch* b = parsegraph_ArrayList_at(input->monitoredTouches, 1);
        // Zoom.
        input->zoomTouchDistance = sqrtf(
            powf(b->x - a->x, 2) +
            powf(b->y - a->y, 2)
        );
        parsegraph_Input_Dispatch(input, 0, "touchzoomstart", 0);
    }
}

void parsegraph_Input_afterTouchTimeout(void* data)
{
    parsegraph_Input* input = data;
    input->touchendTimeout = 0;

    if(input->isDoubleTouch) {
        // Double touch ended.
        input->isDoubleTouch = 0;
        return;
    }

    // Single touch ended.
    input->isDoubleTouch = 0;
}

int parsegraph_Input_UpdateRepeatedly(parsegraph_Input* input)
{
    return input->_updateRepeatedly || parsegraph_Carousel_updateRepeatedly(parsegraph_Graph_carousel(input->_graph));
}

int parsegraph_Input_Update(parsegraph_Input* input, struct timespec t)
{
    parsegraph_Camera* cam = input->_camera;

    float camScale = parsegraph_Camera_scale(cam);
    float xSpeed = 1000 / camScale;
    float ySpeed = 1000 / camScale;
    float scaleSpeed = 20;

    int inputChangedScene = 0;
    input->_updateRepeatedly = 0;

    //parsegraph_log("Input update\n");
    if(parsegraph_Input_Get(input, parsegraph_RESET_CAMERA_KEY)) {
        //parsegraph_log("RESET CAMERA\n");
        //var defaultScale = .5;
        float defaultScale = 1;
        float x = parsegraph_Surface_getWidth(input->_graph->_surface) / 2;
        float y = parsegraph_Surface_getHeight(input->_graph->_surface) / 2;
        if(parsegraph_Camera_x(cam) == x && parsegraph_Camera_y(cam) == y) {
            parsegraph_Camera_setScale(cam, defaultScale);
        }
        else {
            x = parsegraph_Surface_getWidth(input->_graph->_surface) / (2 * defaultScale);
            y = parsegraph_Surface_getHeight(input->_graph->_surface) / (2 * defaultScale);
            parsegraph_Camera_setOrigin(cam, x, y);
        }
        inputChangedScene = 1;
    }

    if(
        parsegraph_Input_Get(input, parsegraph_MOVE_BACKWARD_KEY)
    ) {
        input->_updateRepeatedly = 1;
        float x = cam->_cameraX + parsegraph_Input_Elapsed(input, parsegraph_MOVE_BACKWARD_KEY, t) * xSpeed;
        float y = cam->_cameraY;
        parsegraph_Camera_setOrigin(cam, x, y);
        inputChangedScene = 1;
    }

    if(parsegraph_Input_Get(input, parsegraph_MOVE_FORWARD_KEY)) {
        input->_updateRepeatedly = 1;
        float x = cam->_cameraX + parsegraph_Input_Elapsed(input, parsegraph_MOVE_FORWARD_KEY, t) * -xSpeed;
        float y = cam->_cameraY;
        parsegraph_Camera_setOrigin(cam, x, y);
        inputChangedScene = 1;
    }

    if(parsegraph_Input_Get(input, parsegraph_MOVE_UPWARD_KEY)) {
        input->_updateRepeatedly = 1;
        float x = cam->_cameraX;
        float y = cam->_cameraY + parsegraph_Input_Elapsed(input, parsegraph_MOVE_UPWARD_KEY, t) * ySpeed;
        parsegraph_Camera_setOrigin(cam, x, y);
        inputChangedScene = 1;
    }

    if(parsegraph_Input_Get(input, parsegraph_MOVE_DOWNWARD_KEY)) {
        input->_updateRepeatedly = 1;
        float x = cam->_cameraX;
        float y = cam->_cameraY + parsegraph_Input_Elapsed(input, parsegraph_MOVE_DOWNWARD_KEY, t) * -ySpeed;
        parsegraph_Camera_setOrigin(cam, x, y);
        inputChangedScene = 1;
    }

    if(parsegraph_Input_Get(input, parsegraph_ZOOM_OUT_KEY)) {
        input->_updateRepeatedly = 1;
        inputChangedScene = 1;
        parsegraph_Camera_zoomToPoint(cam,
        powf(1.1, -scaleSpeed * parsegraph_Input_Elapsed(input, parsegraph_ZOOM_OUT_KEY, t)),
            parsegraph_Surface_getWidth(input->_graph->_surface) / 2,
            parsegraph_Surface_getHeight(input->_graph->_surface) / 2
        );
    }
    if(parsegraph_Input_Get(input, parsegraph_ZOOM_IN_KEY)) {
        //console.log("Continuing to zoom out");
        input->_updateRepeatedly = 1;
        inputChangedScene = 1;
        //if(parsegraph_Camera_scale(cam) >= .01) {
            parsegraph_Camera_zoomToPoint(cam,
            powf(1.1, scaleSpeed * parsegraph_Input_Elapsed(input, parsegraph_ZOOM_IN_KEY, t)),
                parsegraph_Surface_getWidth(input->_graph->_surface) / 2,
                parsegraph_Surface_getHeight(input->_graph->_surface) / 2
            );
        //}
    }
    //this.Dispatch(false, "update", inputChangedScene);

    float x = cam->_cameraX;
    float y = cam->_cameraY;
    float r[4];
    parsegraph_World_boundingRect(input->_graph->_world, r);
    x = parsegraph_max(x, parsegraph_Rect_x(r) - parsegraph_Rect_width(r)/2);
    x = parsegraph_min(x, parsegraph_Rect_x(r) + parsegraph_Rect_width(r)/2);
    y = parsegraph_max(y, parsegraph_Rect_y(r) - parsegraph_Rect_height(r)/2);
    y = parsegraph_min(y, parsegraph_Rect_y(r) + parsegraph_Rect_height(r)/2);
    //console.log("BR", x, y, r);
    //cam.setOrigin(x, y);

    return inputChangedScene;
}

int parsegraph_Input_Get(parsegraph_Input* input, const char* key)
{
    //parsegraph_log("%d key(s) are down\n", parsegraph_ArrayList_length(input->keydowns));
	for(int i = 0; i < parsegraph_ArrayList_length(input->keydowns); ++i) {
		struct parsegraph_KeyDown* kd = parsegraph_ArrayList_at(input->keydowns, i);
        //parsegraph_log("KEY IS DOWN: %s\n", kd->keyName);
		if(!strcmp(kd->keyName, key)) {
            //parsegraph_log("Key is down: %s\n", key);
			return 1;
		}
	}
    //parsegraph_log("Key is NOT down: %s\n", key);
    return 0;
};

float parsegraph_Input_Elapsed(parsegraph_Input* input, const char* key, struct timespec t)
{
	struct parsegraph_KeyDown* kd = 0;
	for(int i = 0; i < parsegraph_ArrayList_length(input->keydowns); ++i) {
		kd = parsegraph_ArrayList_at(input->keydowns, i);
		if(!strcmp(kd->keyName, key)) {
			break;
		}
        //parsegraph_log("KEY IS DOWN: %s\n", kd->keyName);
	}
    if(!kd) {
        return 0;
    }
    struct timespec* v = &kd->when;
    float elapsed = (float)parsegraph_timediffMs(v, &t);
    elapsed /= 1000.0;
    //parsegraph_log("%s elapsed for %f seconds (then=%d.%d versus now=%d.%d).\n", key, elapsed, v->tv_sec, v->tv_nsec, t.tv_sec, t.tv_nsec);
	kd->when = t;

    return elapsed;
}

void parsegraph_Input_paint(parsegraph_Input* input)
{
    if(!input->_caretPainter) {
        input->_caretPainter = parsegraph_BlockPainter_new(input->_graph->_surface, input->_graph->_shaders);
    }
    if(!input->_spotlightPainter) {
        input->_spotlightPainter = parsegraph_SpotlightPainter_new(input->_graph->_surface,
            input->_graph->_shaders
        );
    }

    parsegraph_BlockPainter_initBuffer(input->_caretPainter, 1);
    parsegraph_BlockPainter_setBorderColor(input->_caretPainter, input->_caretColor);
    parsegraph_BlockPainter_setBackgroundColor(input->_caretPainter, input->_caretColor);

    parsegraph_SpotlightPainter_clear(input->_spotlightPainter);

    if(!input->_focusedNode) {
        return;
    }

    parsegraph_Label* label = input->_focusedNode->_realLabel;
    if(!label || !parsegraph_Label_editable(label) || !input->_focusedLabel) {
        float s[2];
        parsegraph_Node_absoluteSize(input->_focusedNode, s);
        float srad = parsegraph_min(
            parsegraph_FOCUSED_SPOTLIGHT_SCALE * s[0] * parsegraph_Node_absoluteScale(input->_focusedNode),
            parsegraph_FOCUSED_SPOTLIGHT_SCALE * s[1] * parsegraph_Node_absoluteScale(input->_focusedNode)
        );
        parsegraph_SpotlightPainter_drawSpotlight(input->_spotlightPainter,
            parsegraph_Node_absoluteX(input->_focusedNode),
            parsegraph_Node_absoluteY(input->_focusedNode),
            srad,
            input->_spotlightColor
        );
        return;
    }

    float cr[4];
    parsegraph_Label_getCaretRect(label, cr);
    if(!isnan(input->_focusedNode->_labelPos[0]) && !isnan(input->_focusedNode->_labelPos[1])) {
        parsegraph_BlockPainter_drawBlock(input->_caretPainter,
            input->_focusedNode->_labelPos[0] + parsegraph_Rect_x(cr) * input->_focusedNode->_labelPos[2],
            input->_focusedNode->_labelPos[1] + parsegraph_Rect_y(cr) * input->_focusedNode->_labelPos[2],
            input->_focusedNode->_labelPos[2] * parsegraph_Rect_width(cr),
            input->_focusedNode->_labelPos[2] * parsegraph_Rect_height(cr),
            0.01,
            0.02,
            1
        );
    }
};

parsegraph_Node* parsegraph_Input_focusedNode(parsegraph_Input* input)
{
    return input->_focusedNode;
}

void parsegraph_Input_setFocusedNode(parsegraph_Input* input, parsegraph_Node* focusedNode)
{
    input->_focusedNode = focusedNode;
    parsegraph_Node* selectedNode = input->_focusedNode;
    //console.log("Clicked");
    input->_focusedLabel = selectedNode && selectedNode->_realLabel && isnan(selectedNode->_labelPos[0]) && parsegraph_Label_editable(selectedNode->_realLabel);
}

int parsegraph_Input_focusedLabel(parsegraph_Input* input)
{
    return input->_focusedLabel;
}

void parsegraph_Input_render(parsegraph_Input* input, float* world)
{
    glDisable(GL_CULL_FACE);
    glDisable(GL_DEPTH_TEST);
    glDisable(GL_BLEND);
    parsegraph_BlockPainter_render(input->_caretPainter, world);
    glEnable(GL_BLEND);
    parsegraph_SpotlightPainter_render(input->_spotlightPainter, world, 1);
}

void parsegraph_Input_Dispatch(parsegraph_Input* input, int argc, const char* event, int argc2)
{
    if(input->listener) {
        input->listener(input, argc, event, argc2, input->listenerThisArg);
    }
};
