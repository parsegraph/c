#ifndef alpha_Input_INCLUDED
#define alpha_Input_INCLUDED

#include "Cam.h"

#include <apr_pools.h>
#include <apr_hash.h>

struct alpha_Input {
    apr_pool_t* pool;
    apr_hash_t* keyPress;

    float mouseSensitivityX;
    float mouseSensitivityY;

    int startX;
    int endX;
    int startY;
    int endY;
    int mouseWheelUp;
    int mouseWheelDown;
    int _done;
    int grabbed;

    alpha_Camera* camera;
};
typedef struct alpha_Input alpha_Input;

void alpha_Input_keyup(alpha_Input* input, const char* key);
void alpha_Input_keydown(alpha_Input* input, const char* key, int ctrlKey, int altKey, int metaKey);
alpha_Input* alpha_Input_new(apr_pool_t* pool, alpha_Camera* camera);
int alpha_Input_Get(alpha_Input* input, const char* key);
float alpha_Input_GetMouseSensitivityY(alpha_Input* input);
void alpha_Input_SetMouseSensitivityY(alpha_Input* input, float sensitivity);
void alpha_Input_SetMouseSensitivity(alpha_Input* input, float sensitivity);
float alpha_Input_GetMouseSensitivityX(alpha_Input* input);
void alpha_Input_SetMouseSensitivityX(alpha_Input* input, float sensitivity);
float alpha_Input_MouseLeft(alpha_Input* input);
float alpha_Input_MouseRight(alpha_Input* input);
float alpha_Input_MouseUp(alpha_Input* input);
float alpha_Input_MouseDown(alpha_Input* input);
float alpha_Input_MouseWheelUp(alpha_Input* input, float degrees);
float alpha_Input_MouseWheelDown(alpha_Input* input);
float alpha_Input_MouseWheelDegreesUp(alpha_Input* input);
float alpha_Input_MouseWheelDegreesDown(alpha_Input* input);
void alpha_Input_Update(alpha_Input* input, float elapsed);
void alpha_Input_keyup(alpha_Input* input, const char* key);
void alpha_Input_keydown(alpha_Input* input, const char* key, int ctrlKey, int altKey, int metaKey);
void alpha_Input_mousedown(alpha_Input* input, const char* button, int x, int y);
void alpha_Input_mouseup(alpha_Input* input, const char* button, int x, int y);
void alpha_Input_mousemove(alpha_Input* input, int x, int y);
void alpha_Input_onWheel(alpha_Input* input, int wheel);

#endif // alpha_Input_INCLUDED
