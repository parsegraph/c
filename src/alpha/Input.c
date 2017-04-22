#include "Input.h"
#include <stdio.h>
#include "Maths.h"
#include "../graph/log.h"

alpha_Input* alpha_Input_new(apr_pool_t* pool, alpha_Camera* camera)
{
    alpha_Input* input;
    if(pool) {
        input = apr_palloc(pool, sizeof(*input));
    }
    else {
        input = malloc(sizeof(*input));
    }
    input->pool = pool;

    alpha_Input_SetMouseSensitivityX(input, .005);
    alpha_Input_SetMouseSensitivityY(input, .005);

    input->keyPress = apr_hash_make(pool);
    input->camera = camera;
    input->startX = 0;
    input->endX = 0;
    input->startY = 0;
    input->endY = 0;
    input->mouseWheelUp = 0;
    input->mouseWheelDown = 0;
    input->grabbed = 0;

    return input;
};

void alpha_Input_keyup(alpha_Input* input, const char* key)
{
    apr_hash_set(input->keyPress, key, APR_HASH_KEY_STRING, (const void*)0);
};

void alpha_Input_keydown(alpha_Input* input, const char* key, int ctrlKey, int altKey, int metaKey)
{
    if(ctrlKey || altKey || metaKey) {
        return;
    }
    //parsegraph_log("keydown %s\n", key);
    apr_hash_set(input->keyPress, key, APR_HASH_KEY_STRING, (const void*)1);
}

void alpha_Input_mousedown(alpha_Input* input, const char* button, int x, int y)
{
    apr_hash_set(input->keyPress, button, APR_HASH_KEY_STRING, (const void*)1);

    // reset for a new drag
    input->startX = x;
    input->startY = y;
    input->endX = x;
    input->endY = y;
}

void alpha_Input_mouseup(alpha_Input* input, const char* button, int x, int y)
{
    apr_hash_set(input->keyPress, button, APR_HASH_KEY_STRING, (const void*)0);

    // new end point;
    input->endX = x;
    input->endY = y;
}

void alpha_Input_mousemove(alpha_Input* input, int x, int y)
{
    input->endX = x;
    input->endY = y;
};

void alpha_Input_onWheel(alpha_Input* input, int wheel)
{
    if(wheel > 0) {
        input->mouseWheelUp = input->mouseWheelUp + wheel;
    }
    else if(wheel < 0) {
        // keeping it positive!
        input->mouseWheelDown = input->mouseWheelDown - wheel;
    }
    else {
        // I have no idea how I got here
    }
}

int alpha_Input_Get(alpha_Input* input, const char* key)
{
    void* val = apr_hash_get(input->keyPress, key, APR_HASH_KEY_STRING);
    return val != 0;
};

void alpha_Input_SetMouseSensitivityX(alpha_Input* input, float sensitivity)
{
    input->mouseSensitivityX = sensitivity;
}

float alpha_Input_GetMouseSensitivityX(alpha_Input* input)
{
    return input->mouseSensitivityX;
}

void alpha_Input_SetMouseSensitivityY(alpha_Input* input, float sensitivity)
{
    input->mouseSensitivityY = sensitivity;
}

float alpha_Input_GetMouseSensitivityY(alpha_Input* input)
{
    return input->mouseSensitivityY;
}

// quick set both of them
void alpha_Input_SetMouseSensitivity(alpha_Input* input, float sensitivity)
{
    alpha_Input_SetMouseSensitivityX(input, sensitivity);
    alpha_Input_SetMouseSensitivityY(input, sensitivity);
}

float alpha_Input_MouseLeft(alpha_Input* input)
{
    if(input->endX < input->startX) {
        float change = input->startX - input->endX;
        //parsegraph_log("mouse has moved right %d", change);
        return change * alpha_Input_GetMouseSensitivityX(input);
    }

    return 0;
};

float alpha_Input_MouseRight(alpha_Input* input)
{
    if(input->endX > input->startX) {
        float change = input->endX - input->startX;
        //fprintf(stderr "mouse has moved left %d", change);
        return change * alpha_Input_GetMouseSensitivityX(input);
    }

    return 0;
};

float alpha_Input_MouseUp(alpha_Input* input)
{
    if(input->endY > input->startY) {
        float change = input->endY - input->startY;
        //fprintf("mouse has moved down %d", change);
        return change * alpha_Input_GetMouseSensitivityY(input);
    }

    return 0;
};

float alpha_Input_MouseDown(alpha_Input* input)
{
    if(input->endY < input->startY) {
        float change = input->endY - input->startY;
        //parsegraph_log("mouse has moved up %d", change);
        return change * alpha_Input_GetMouseSensitivityY(input);
    }

    return 0;
};

// mouse wheel data is stored in 1/8 of a degree
// this returns how many ticks of a mousewheel of standard resolution
// has been seen before an Input:Update()
float alpha_Input_MouseWheelUp(alpha_Input* input, float degrees)
{
    return input->mouseWheelUp / 120;
};

float alpha_Input_MouseWheelDown(alpha_Input* input)
{
    return input->mouseWheelDown / 120;
};

float alpha_Input_MouseWheelDegreesUp(alpha_Input* input)
{
    return input->mouseWheelUp / 8;
};

float alpha_Input_MouseWheelDegreesDown(alpha_Input* input)
{
    return input->mouseWheelDown / 8;
};

/**
 * Sets the start to the end, and clears mousewheel totals.
 */
void alpha_Input_Update(alpha_Input* input, float elapsed)
{
    if(alpha_Input_Get(input, "Shift") > 0) {
        elapsed = elapsed * 10;
    }

    if(alpha_Input_Get(input, "Shift") > 0) {
        elapsed = elapsed / 10;
    }

    //console.log("LeftMouseButton: " + alpha_Input_Get(input, "LeftMouseButton"));
    //console.log("MouseLeft: " + alpha_Input_MouseLeft(input) * elapsed);
    //console.log("MouseLeft: " + (alpha_Input_Get(input, "LeftMouseButton") * alpha_Input_MouseLeft(input) * elapsed));
    //console.log("LeftMouse: " + alpha_Input_Get(input, "LeftMouseButton"));
    //console.log("TurnLeft: " + alpha_Input_MouseLeft(input) * elapsed);
    alpha_Camera_TurnLeft(input->camera,
        alpha_Input_Get(input, "LeftMouseButton") * alpha_Input_MouseLeft(input) * elapsed
    );
    alpha_Camera_TurnRight(input->camera,
        alpha_Input_Get(input, "LeftMouseButton") * alpha_Input_MouseRight(input) * elapsed
    );
    alpha_Camera_PitchUp(input->camera,
        alpha_Input_Get(input, "LeftMouseButton") * alpha_Input_MouseUp(input) * elapsed
    );
    alpha_Camera_PitchDown(input->camera,
        alpha_Input_Get(input, "LeftMouseButton") * alpha_Input_MouseDown(input) * elapsed
    );
    alpha_Camera_MoveForward(input->camera, alpha_Input_MouseWheelDegreesUp(input) * elapsed);
    alpha_Camera_MoveBackward(input->camera, alpha_Input_MouseWheelDegreesDown(input) * elapsed);
    //alpha_Camera_ZoomIn(input->camera, alpha_Input_Get(input, "y"), elapsed);
    //alpha_Camera_ZoomOut(input->camera, alpha_Input_Get(input, "h"), elapsed);

    if(!alpha_Camera_GetParentIsPhysical(input->camera)) {
        alpha_Camera_MoveForward(alpha_Camera_GetParent(input->camera), alpha_Input_Get(input, "w") * elapsed );
        alpha_Camera_MoveBackward(alpha_Camera_GetParent(input->camera), alpha_Input_Get(input, "s") * elapsed );
    }
    else {
        alpha_Physical* parent = alpha_Camera_GetParent(input->camera);
        //parsegraph_log("W state=%d", alpha_Input_Get(input, "w"));
        alpha_Physical_MoveForward(parent, 100*alpha_Input_Get(input, "t") * elapsed );
        alpha_Physical_MoveBackward(parent, 100*alpha_Input_Get(input, "g") * elapsed );
        alpha_Physical_MoveLeft(parent, 100*alpha_Input_Get(input, "f") * elapsed );
        alpha_Physical_MoveRight(parent, 100*alpha_Input_Get(input, "h") * elapsed );
        alpha_Physical_MoveForward(parent, alpha_Input_Get(input, "w") * elapsed );
        alpha_Physical_MoveBackward(parent, alpha_Input_Get(input, "s") * elapsed );
        alpha_Physical_MoveLeft(parent, alpha_Input_Get(input, "a") * elapsed );
        alpha_Physical_MoveRight(parent, alpha_Input_Get(input, "d") * elapsed );
        alpha_Physical_MoveUp(parent, alpha_Input_Get(input, " ") * elapsed );
        alpha_Physical_MoveDown(parent, alpha_Input_Get(input, "Shift") * elapsed );
        alpha_Physical_YawLeft(parent, alpha_Input_Get(input, "j") * elapsed );
        alpha_Physical_YawRight(parent, alpha_Input_Get(input, "l") * elapsed );
        alpha_Physical_PitchUp(parent, alpha_Input_Get(input, "k") * elapsed );
        alpha_Physical_PitchDown(parent, alpha_Input_Get(input, "i") * elapsed );
        alpha_Physical_RollLeft(parent, alpha_Input_Get(input, "u") * elapsed );
        alpha_Physical_RollRight(parent, alpha_Input_Get(input, "o") * elapsed );
    }

    if(alpha_Input_Get(input, "RightMouseButton") > 0) {
        if(!input->_done) {
            alpha_Camera_AlignParentToMy(input->camera, 0, 1);
            input->_done = 1;
        }
    }
    else {
        input->_done = 0;
    }
    input->startX = input->endX;
    input->startY = input->endY;
    input->mouseWheelUp = 0;
    input->mouseWheelDown = 0;
};
