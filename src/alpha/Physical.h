#ifndef alpha_Physical_INCLUDED
#define alpha_Physical_INCLUDED

#include <apr_pools.h>

#define alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE 1
#define alpha_PHYSICAL_SCALE_ROTATE_TRANSLATE 2
#define alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE 3

struct alpha_Physical {
    apr_pool_t* pool;
    int modelMode;
    float* orientation;
    float* position;
    float* modelMatrix;
    float* viewMatrix;
    int modelDirty;
    float* velocity;
    float* rotationSpeed;
    float* speed;
    float* scale;
    int parentIsPhysical;
    void* parent;
};

typedef struct alpha_Physical alpha_Physical;

struct alpha_Physical* alpha_Physical_new(apr_pool_t* pool, int parentIsPhysical, void* parent);
void alpha_Physical_destroy(struct alpha_Physical* phys);
void alpha_Physical_SetParent(struct alpha_Physical* phys, int parentIsPhysical, void* parent);
void alpha_Physical_SetScale(struct alpha_Physical* phys, float x, float y, float z);
float* alpha_Physical_GetScale(struct alpha_Physical* phys);
void alpha_Physical_Rotate(struct alpha_Physical* phys, float angle, float x, float y, float z);
void alpha_Physical_SetPosition(struct alpha_Physical* phys, float x, float y, float z);
void alpha_Physical_CopyPosition(struct alpha_Physical* phys, float* src);
float* alpha_Physical_GetPosition(struct alpha_Physical* phys);
float* alpha_Physical_GetModelMatrix(struct alpha_Physical* phys);
void alpha_Physical_SetOrientation(struct alpha_Physical* phys, float angle, float x, float y, float z);
void alpha_Physical_SetOrientationEach(struct alpha_Physical* phys, float angle, float x, float y, float z);
void alpha_Physical_CopyOrientation(struct alpha_Physical* phys, float* orientation);
float* alpha_Physical_GetOrientation(struct alpha_Physical* phys);
void alpha_Physical_SetRotationSpeeds(struct alpha_Physical* phys, float x, float y, float z);
void alpha_Physical_WarpEach(struct alpha_Physical* phys, float x, float y, float z);
void alpha_Physical_Warp(struct alpha_Physical* phys, float* val);
void alpha_Physical_ChangeEachPosition(struct alpha_Physical* phys, float x, float y, float z);
void alpha_Physical_ChangePosition(struct alpha_Physical* phys, float* val);

void alpha_Physical_WarpForward(struct alpha_Physical* phys, float distance);
void alpha_Physical_WarpBackward(struct alpha_Physical* phys, float distance);
void alpha_Physical_WarpLeft(struct alpha_Physical* phys, float distance);
void alpha_Physical_WarpRight(struct alpha_Physical* phys, float distance);
void alpha_Physical_WarpUp(struct alpha_Physical* phys, float distance);
void alpha_Physical_WarpDown(struct alpha_Physical* phys, float distance);
void* alpha_Physical_GetParent(alpha_Physical* phys);
float* alpha_Physical_GetViewMatrix(alpha_Physical* phys, void* requestor);
float* alpha_Physical_GetWorldPositionByViewMatrix(alpha_Physical* phys);
float* alpha_Physical_GetWorldPosition(alpha_Physical* phys, void* requestor);
float* alpha_Physical_GetWorldOrientation(alpha_Physical* phys, void* requestor);
int alpha_Physical_GetParentIsPhysical(alpha_Physical* phys);
void alpha_Physical_MoveForward(alpha_Physical* phys, float elapsed);
void alpha_Physical_MoveBackward(alpha_Physical* phys, float elapsed);
void alpha_Physical_MoveLeft(alpha_Physical* phys, float elapsed);
void alpha_Physical_MoveRight(alpha_Physical* phys, float elapsed);
void alpha_Physical_MoveDown(alpha_Physical* phys, float elapsed);
void alpha_Physical_MoveUp(alpha_Physical* phys, float elapsed);
void alpha_Physical_ApplyVelocity(alpha_Physical* phys);
int alpha_Physical_IsGoodLineageFor(alpha_Physical* phys, alpha_Physical* prospectiveChild);
void alpha_Physical_YawLeft(struct alpha_Physical* phys, float elapsed);
void alpha_Physical_YawRight(struct alpha_Physical* phys, float elapsed);
void alpha_Physical_PitchUp(struct alpha_Physical* phys, float elapsed);
void alpha_Physical_PitchDown(struct alpha_Physical* phys, float elapsed);
void alpha_Physical_RollLeft(struct alpha_Physical* phys, float elapsed);
void alpha_Physical_RollRight(struct alpha_Physical* phys, float elapsed);

#endif // alpha_Physical_INCLUDED
