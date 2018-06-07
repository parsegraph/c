#ifndef alpha_Cam_INCLUDED
#define alpha_Cam_INCLUDED

#include "Physical.h"

struct alpha_Camera {
    apr_pool_t* pool;
    float fovX;
    float fovY;
    float zoomSpeed;
    float zoomFactor;
    float farDistance;
    float nearDistance;

    unsigned int width;
    unsigned int height;

    int projectionDirty;
    float* projectionMatrix;
    int modelDirty;
    float* modelMatrix;
    float* viewMatrix;

    float pitch;
    float rotationSpeedX;
    float rotationSpeedY;
    float maxRange;
    float speed;
    float* offset;
    float* orientation;
    float* position;
    int freeFloating;
    void* reengage;
    alpha_PhysicalType reengageType;
    alpha_PhysicalType parentType;
    void* parent;
};

typedef struct alpha_Camera alpha_Camera;

struct alpha_Camera* alpha_Camera_new();

float* alpha_Camera_UpdateProjection(struct alpha_Camera* cam, int renderWidth, int renderHeight);
float* alpha_Camera_GetViewMatrix(alpha_Camera* cam, void* requestor);
void* alpha_Camera_GetParent(alpha_Camera* cam);
int alpha_Camera_GetParentIsPhysical(alpha_Camera* cam);
void alpha_Camera_SetParent(alpha_Camera* cam, alpha_PhysicalType parentType, void* parent);
alpha_Physical* alpha_Camera_GetInvisiblePhysical(alpha_Camera* cam);
void alpha_Camera_Disengage(alpha_Camera* cam);
void alpha_Camera_Engage(alpha_Camera* cam);
float* alpha_Camera_GetModelMatrix(alpha_Camera* cam);
void alpha_Camera_SetPosition(alpha_Camera* cam, float* vec);
void alpha_Camera_SetOrientation(alpha_Camera* cam, float* orientation);
void alpha_Camera_SetOrientationEach(alpha_Camera* cam, float ox, float oy, float oz, float ow);
void alpha_Camera_AlignParentToMy(alpha_Camera* cam, float x, float y);
void alpha_Camera_SetRotationSpeeds(alpha_Camera* cam, float x, float y);
void alpha_Camera_GetRotationSpeeds(alpha_Camera* cam, float* x, float* y);
void alpha_Camera_SetRotationSpeed(alpha_Camera* cam, float speed);
void alpha_Camera_Pitch(alpha_Camera* cam, float angle);
void alpha_Camera_PitchDown(alpha_Camera* cam, float elapsed);
void alpha_Camera_PitchUp(alpha_Camera* cam, float elapsed);
void alpha_Camera_TurnRight(alpha_Camera* cam, float elapsed);
void alpha_Camera_TurnLeft(alpha_Camera* cam, float elapsed);
void alpha_Camera_Turn(alpha_Camera* cam, float angle);
void alpha_Camera_SetPositionEach(alpha_Camera* cam, float x, float y, float z);
void alpha_Camera_SetRange(alpha_Camera* cam, float range);
void alpha_Camera_SetFovX(alpha_Camera* cam, float fovX);
void alpha_Camera_SetFovY(alpha_Camera* cam, float fovY);
float alpha_Camera_GetFovX(alpha_Camera* cam);
float alpha_Camera_GetFovY(alpha_Camera* cam);
void alpha_Camera_SetProperFOV(alpha_Camera* cam, float vpWidth, float eyeDistance);
void alpha_Camera_SetZoom(alpha_Camera* cam, float factor);
float alpha_Camera_GetZoom(alpha_Camera* cam);
void alpha_Camera_SetZoomSpeed(alpha_Camera* cam, float speed);
void alpha_Camera_ZoomIn(alpha_Camera* cam, int bind, float elapsed);
void alpha_Camera_ZoomOut(alpha_Camera* cam, int bind, float elapsed);
void alpha_Camera_CancelZoom(alpha_Camera* cam);
void alpha_Camera_ZoomUntil(alpha_Camera* cam, float zoom, int bind, float elapsed);
void alpha_Camera_SetFarDistance(alpha_Camera* cam, float distance);
float alpha_Camera_GetFarDistance(alpha_Camera* cam);
void alpha_Camera_SetNearDistance(alpha_Camera* cam, float distance);
float alpha_Camera_GetNearDistance(alpha_Camera* cam);
float* alpha_Camera_GetPosition(alpha_Camera* cam);
void alpha_Camera_ChangePosition(alpha_Camera* cam, float* vec);
void alpha_Camera_ChangePositionEach(alpha_Camera* cam, float x, float y, float z);
void alpha_Camera_SetOffset(alpha_Camera* cam, float* vec);
void alpha_Camera_SetOffsetEach(alpha_Camera* cam, float x, float y, float z);
float* alpha_Camera_GetOffset(alpha_Camera* cam);
void alpha_Camera_ChangeOffset(alpha_Camera* cam, float* vec);
void alpha_Camera_ChangeOffsetEach(alpha_Camera* cam, float x, float y, float z);
void alpha_Camera_MoveForward(alpha_Camera* cam, float elapsed);
void alpha_Camera_MoveBackward(alpha_Camera* cam, float elapsed);
void alpha_Camera_destroy(alpha_Camera* cam);
#endif // alpha_Cam_INCLUDED
