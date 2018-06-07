#include "Physical.h"
#include "Cam.h"
#include "Maths.h"
#include <stdlib.h>
#include <stdio.h>
#include <math.h>
#include "../graph/log.h"

struct alpha_Physical* alpha_Physical_new(apr_pool_t* pool, alpha_PhysicalType parentType, void* parent)
{
    struct alpha_Physical* phys;
    if(pool) {
        phys = apr_palloc(pool, sizeof(*phys));
    }
    else {
        phys = malloc(sizeof(*phys));
    }
    phys->pool = pool;

    phys->modelMode = alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE;
    phys->orientation = alpha_Quaternion_new(pool);
    phys->position = alpha_Vector_new(pool);
    phys->modelMatrix = alpha_RMatrix4_new(pool);
    phys->viewMatrix = alpha_RMatrix4_new(pool);
    phys->modelDirty = 0;
    phys->velocity = alpha_Vector_new(pool);
    phys->rotationSpeed = alpha_Vector_create(pool, 1, 1, 1);
    phys->speed = alpha_Vector_create(pool, 5, 5, 5);
    phys->scale = alpha_Vector_create(pool, 1, 1, 1);
    alpha_Physical_SetParent(phys, parentType, parent);
    return phys;
}

void alpha_Physical_destroy(struct alpha_Physical* phys)
{
    alpha_Quaternion_destroy(phys->pool, phys->orientation);
    alpha_Vector_destroy(phys->pool, phys->position);
    alpha_RMatrix4_destroy(phys->pool, phys->modelMatrix);
    alpha_RMatrix4_destroy(phys->pool, phys->viewMatrix);
    alpha_Vector_destroy(phys->pool, phys->velocity);
    alpha_Vector_destroy(phys->pool, phys->rotationSpeed);
    alpha_Vector_destroy(phys->pool, phys->speed);
    alpha_Vector_destroy(phys->pool, phys->scale);
    if(phys->pool) {
        return;
    }
    free(phys);
}

void alpha_Physical_SetOrientation(struct alpha_Physical* phys, float angle, float x, float y, float z)
{
    alpha_Quaternion_Set(phys->orientation, angle, x, y, z);
    phys->modelDirty = 1;

    float q[4];
    alpha_Quaternion_SetIdentity(q);
    alpha_Quaternion_FromAxisAndAngleEach(q, x, y, z, angle);
    alpha_Physical_CopyOrientation(phys, q);
}

void alpha_Physical_CopyOrientation(struct alpha_Physical* phys, float* orientation)
{
    alpha_Quaternion_Copy(phys->orientation, orientation);
    phys->modelDirty = 1;
}

float* alpha_Physical_GetOrientation(struct alpha_Physical* phys)
{
    return phys->orientation;
}

void alpha_Physical_SetRotationSpeeds(struct alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_Set(phys->rotationSpeed, x, y, z);
}

float* alpha_Physical_GetRotationSpeeds(struct alpha_Physical* phys)
{
    return phys->rotationSpeed;
}

void alpha_Physical_Rotate(struct alpha_Physical* phys, float angle, float x, float y, float z)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }
    float* q = alpha_QuaternionFromAxisAndAngleEach(0, x, y, z, angle);
    alpha_Quaternion_Multiply(phys->orientation, q);
    alpha_Quaternion_destroy(0, q);
    phys->modelDirty = 1;
}

void alpha_Physical_RotateGlobal(struct alpha_Physical* phys, float angle, float x, float y, float z)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }
    float* q = alpha_QuaternionFromAxisAndAngleEach(0, x, y, z, angle);
    alpha_Quaternion_Multiply(q, phys->orientation);
    alpha_Quaternion_Copy(phys->orientation, q);
    alpha_Quaternion_destroy(0, q);
    phys->modelDirty = 1;
}

void alpha_Physical_YawLeft(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[1];
    alpha_Physical_Rotate(phys, angle, 0, 1, 0);
}

void alpha_Physical_YawRight(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[1];
    alpha_Physical_Rotate(phys, -angle, 0, 1, 0);
}

void alpha_Physical_PitchUp(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[0];
    alpha_Physical_Rotate(phys, angle, 1, 0, 0);
}

void alpha_Physical_PitchDown(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[0];
    alpha_Physical_Rotate(phys, -angle, 1, 0, 0);
}

void alpha_Physical_RollLeft(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[2];
    alpha_Physical_Rotate(phys, angle, 0, 0, 1);
}

void alpha_Physical_RollRight(struct alpha_Physical* phys, float elapsed)
{
    float angle = elapsed * phys->rotationSpeed[2];
    alpha_Physical_Rotate(phys, -angle, 0, 0, 1);
}

void alpha_Physical_SetPosition(struct alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_Set(phys->position, x, y, z);
    phys->modelDirty = 1;
    if(isnan(phys->position[0])) {
        parsegraph_log("Position became NaN.");
    }
}

void alpha_Physical_CopyPosition(struct alpha_Physical* phys, float* src)
{
    alpha_Vector_Copy(phys->position, src);
    phys->modelDirty = 1;
    if(isnan(phys->position[0])) {
        parsegraph_log("Position became NaN.");
    }
}

float* alpha_Physical_GetPosition(struct alpha_Physical* phys)
{
    return phys->position;
}

void alpha_Physical_ChangeEachPosition(struct alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_AddEach(phys->position, x, y, z);
    phys->modelDirty = 1;
    if(isnan(phys->position[0])) {
        parsegraph_log("Position became NaN!");
    }
}

void alpha_Physical_ChangePosition(struct alpha_Physical* phys, float* val)
{
    //parsegraph_log("Changed position from (%f, %f, %f) ", phys->position[0], phys->position[1], phys->position[2]);
    alpha_Vector_Add(phys->position, val);
    //parsegraph_log("Changed position to (%f, %f, %f)\n", phys->position[0], phys->position[1], phys->position[2]);
    phys->modelDirty = 1;
    if(isnan(phys->position[0])) {
        parsegraph_log("Position became NaN!\n");
    }
}

void alpha_Physical_Warp(struct alpha_Physical* phys, float* v)
{
    alpha_Physical_WarpEach(phys, v[0], v[1], v[2]);
}

void alpha_Physical_WarpEach(struct alpha_Physical* phys, float x, float y, float z)
{
    if(x == 0 && y == 0 && z == 0) {
        return;
    }

    // Quaternions don't work correctly if they aren't normalized
    //alpha_Quaternion_Normalize(phys->orientation);

    // get our new position; if we started at 0,0,0
    float* d = alpha_Quaternion_RotatedVectorEach(phys->orientation, phys->pool, x, y, z);

    // add it to our current position to get our new position
    //parsegraph_log("Warping vec (%f, %f, %f)\n", d[0], d[1], d[2]);
    alpha_Physical_ChangePosition(phys, d);
}

void alpha_Physical_WarpForward(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, 0, 0, -distance);
};

void alpha_Physical_WarpBackward(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, 0, 0, distance);
}

void alpha_Physical_WarpLeft(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, -distance, 0, 0);
};

void alpha_Physical_WarpRight(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, distance, 0, 0);
};

void alpha_Physical_WarpUp(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, 0, distance, 0);
}

void alpha_Physical_WarpDown(struct alpha_Physical* phys, float distance)
{
    alpha_Physical_WarpEach(phys, 0, -distance, 0);
}

// speed is in units per second
void alpha_Physical_SetSpeeds(alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_Set(phys->speed, x, y, z);
}

float* alpha_Physical_GetSpeeds(alpha_Physical* phys)
{
    return phys->speed;
}

/**
 * sets x,y,z and z speeds to the same thing
 */
void alpha_Physical_SetSpeed(alpha_Physical* phys, float speed)
{
    alpha_Physical_SetSpeeds(phys, speed, speed, speed);
}

/**
 * set as x,y,z
 */
void alpha_Physical_SetVelocity(alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_Set(phys->velocity, x, y, z);
}

/**
 * return as vector
 */
float* alpha_Physical_GetVelocity(alpha_Physical* phys)
{
    return phys->velocity;
}

void alpha_Physical_AddVelocity(alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_AddEach(phys->velocity, x, y, z);
    phys->modelDirty = 1;
}

// Move commands adjust the velocity
// using the set speed
void alpha_Physical_MoveForward(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[2];
    alpha_Physical_AddVelocity(phys, 0, 0, -distance);
};

void alpha_Physical_MoveBackward(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[2];
    alpha_Physical_AddVelocity(phys, 0, 0, distance);
};

void alpha_Physical_MoveLeft(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[0];
    alpha_Physical_AddVelocity(phys, -distance, 0, 0);
};

void alpha_Physical_MoveRight(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[0];
    alpha_Physical_AddVelocity(phys, distance, 0, 0);
};

void alpha_Physical_MoveUp(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[1];
    alpha_Physical_AddVelocity(phys, 0, -distance, 0);
};

void alpha_Physical_MoveDown(alpha_Physical* phys, float elapsed)
{
    float distance = elapsed * phys->speed[1];
    alpha_Physical_AddVelocity(phys, 0, distance, 0);
};

// calculates our new position using our current velocity
// and then resets the velocity
void alpha_Physical_ApplyVelocity(alpha_Physical* phys)
{
    alpha_Physical_Warp(phys, phys->velocity);
    alpha_Vector_Set(phys->velocity, 0, 0, 0);
};

//------------------------------------------
//--------------  PARENTING ----------------
//------------------------------------------

// in order to be a good lineage:
// a camera must be reached
// // therefore it must not infinitely loop
int alpha_Physical_IsGoodLineageFor(alpha_Physical* phys, alpha_Physical* prospectiveChild)
{
    void* parent = alpha_Physical_GetParent(phys);

    // no parent = no lineage
    if(!parent) {
        return 0;
    }
    else if(parent == prospectiveChild) {
        // the initator already has this physical as an ancestor
        // setting this as a parent would make an infinite loop
        return 0;
        // note that we don't check self == prospectiveChild
        // that would throw an error if you tried to reparent to the same parent
        // it's assumed that if its a parent now, its still a good parent;
    }

    if(phys->parentType == alpha_PhysicalType_PHYSICAL) {
        return alpha_Physical_IsGoodLineageFor(
            (alpha_Physical*)parent,
            prospectiveChild
        );
    }

    // CAMERAS MAKE THE BEST PARENTS
    return 1;
};

void alpha_Physical_SetParent(alpha_Physical* phys, alpha_PhysicalType parentType, void* parent)
{
    if(!parent) {
        parsegraph_log("A Physical must have a parent. Set it to the camera for a default");
        exit(-1);
        return;
    }

    if(parent && parentType == alpha_PhysicalType_PHYSICAL && !alpha_Physical_IsGoodLineageFor(parent, phys)) {
        parsegraph_log("Setting this is a parent would result in a lineage that never reaches the camera" );
    }
    phys->parentType = parentType;
    phys->parent = parent;
}

void* alpha_Physical_GetParent(alpha_Physical* phys)
{
    return phys->parent;
}

int alpha_Physical_GetParentIsPhysical(alpha_Physical* phys)
{
    return alpha_Physical_GetParentType(phys) == alpha_PhysicalType_PHYSICAL;
}

alpha_PhysicalType alpha_Physical_GetParentType(alpha_Physical* phys)
{
    return phys->parentType;
}

//------------------------------------------
//-----------  MODELVIEW MATRIX ------------
//------------------------------------------

void alpha_Physical_SetScale(struct alpha_Physical* phys, float x, float y, float z)
{
    alpha_Vector_Set(phys->scale, x, y, z);
    phys->modelDirty = 1;
}

float* alpha_Physical_GetScale(struct alpha_Physical* phys)
{
    return phys->scale;
}

// combine our position and orientation into a matrix;
float* alpha_Physical_GetModelMatrix(struct alpha_Physical* phys)
{
    float x, y, z;
    x = phys->velocity[0];
    y = phys->velocity[1];
    z = phys->velocity[2];
    if(x != 0 || y != 0 || z != 0) {
        alpha_Physical_ApplyVelocity(phys);
    }

    // if w == 1 then a 4d vector is a position
    // if w == 0 then a 4d vector is a direction
    if(phys->modelDirty) {
        // this.modelMatrix = rotation * translation;
        // this.modelMatrix.FromQuaternionAtVector(self.orientation, self.position);
        float* m = phys->modelMatrix;
        // this.modelMatrix = rotate * translate * identity
        alpha_RMatrix4_SetIdentity(m);

        switch(phys->modelMode) {
        case alpha_PHYSICAL_TRANSLATE_ROTATE_SCALE:
            alpha_RMatrix4_Translate(m, phys->position);
            alpha_RMatrix4_Rotate(m, phys->orientation);
            alpha_RMatrix4_Scale(m, phys->scale);
            break;
        case alpha_PHYSICAL_SCALE_ROTATE_TRANSLATE:
            alpha_RMatrix4_Scale(m, phys->scale);
            alpha_RMatrix4_Rotate(m, phys->orientation);
            alpha_RMatrix4_Translate(m, phys->position);
            break;
        case alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE:
            alpha_RMatrix4_Rotate(m, phys->orientation);
            alpha_RMatrix4_Translate(m, phys->position);
            alpha_RMatrix4_Scale(m, phys->scale);
            break;
        }

        phys->modelDirty = 0;
    }

    return phys->modelMatrix;
}

// when fully returned it looks like this
// A -> B -> CAM -> A -> B
// Mults as A * B * (CAM * A * B):Inverse()

// in order for this to work properly make sure that the camera's
// GetViewMatrix() is called before any physicals
// otherwise the physical's will be outdated
// this is to prevent having to retrace the camera's lineage more than once

// this would be a good thing to do for any matrix that has many descendants
// say a ship with lots of npcs / players on it

// but this would require a proper ordering of physicals
// which isn't feasible atm
// physicals would need to know who is the child of who.
// something like:
/*
	camera:CalculateViewMatrix();
	while SomePhysicalsNotCalculated do
		for all physicalsNotCalculated do
			if parentPhysicalCalculated then
				physical:CalculateViewMatrix()
			end
		end
	end	
*/

// a more feasible method would be to
// to have a bunch of children known by the physical
// then we simply chain down the list starting at the camera;
// this is a far better solution.
/*
	function CalculateViewMatrices()
		self:CalculateViewMatrix(); -- for myself
		for each child in children do
			child:CalculateViewMatrices() -- for my children
		end
	end
*/
// it starts with a simple camera:CalculateViewMatrices();
// I will return to this.

float* alpha_Physical_GetViewMatrix(alpha_Physical* phys, void* requestor)
{
    // if this was just called then we need to set who sent it
    if(!requestor) {
        requestor = phys;
    }

    if(phys->parent && phys->parent != requestor) {
        if(phys->parentType == alpha_PhysicalType_PHYSICAL) {
            phys->viewMatrix = alpha_RMatrix4_Multiplied(phys->pool,
                alpha_Physical_GetModelMatrix(phys),
                alpha_Physical_GetViewMatrix(phys->parent, requestor)
            );
        }
        else {
            // It's a camera.
            phys->viewMatrix = alpha_RMatrix4_Multiplied(phys->pool,
                alpha_Physical_GetModelMatrix(phys),
                alpha_Camera_GetViewMatrix(phys->parent, requestor)
            );
        }
        return phys->viewMatrix;
    }

    float* modelMatrix = alpha_Physical_GetModelMatrix(phys);
    return alpha_RMatrix4_Inversed(phys->pool, modelMatrix);
}

float* alpha_Physical_GetWorldPositionByViewMatrix(alpha_Physical* phys)
{
    float* rv = alpha_RMatrix4_Create(phys->pool,
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        phys->position[0], phys->position[1], phys->position[2], 1
    );
    float* vm = alpha_Physical_GetViewMatrix(phys, 0);
    alpha_RMatrix4_Inverse(vm);
    alpha_RMatrix4_Multiply(rv, vm);
    return rv;
}


// legacy code; left in case I try this again
// it does not work correctly, in all cases
float* alpha_Physical_GetWorldPosition(alpha_Physical* phys, void* requestor)
{
    void* parent = phys->parent;
    if(parent && phys->parentType == alpha_PhysicalType_PHYSICAL && parent != requestor) {
        float* rot = alpha_Physical_GetWorldOrientation(parent, requestor);
        float* pos = alpha_Quaternion_RotatedVectorEach(rot, phys->pool, phys->position[0], phys->position[1], phys->position[2]);
        alpha_Vector_Add(pos, alpha_Physical_GetWorldPosition(parent, requestor));
        return pos;
    };
    return phys->position;
}

// legacy code; left in case I try this again
// it DOES work
float* alpha_Physical_GetWorldOrientation(alpha_Physical* phys, void* requestor)
{
    void* parent = phys->parent;
    if(parent && phys->parentType == alpha_PhysicalType_PHYSICAL && parent != requestor) {
        return alpha_Quaternion_Multiplied(
            phys->pool,
            alpha_Physical_GetWorldOrientation(parent, requestor),
            phys->orientation
        );
    }
    return phys->orientation;
}

void alpha_Physical_Dump(struct alpha_Physical* phys)
{
    fprintf(stderr, "([%f, %f, %f], {%f, %f, %f, %f})\n",
        phys->position[0],
        phys->position[1],
        phys->position[2],
        phys->orientation[0],
        phys->orientation[1],
        phys->orientation[2],
        phys->orientation[3]
    );
}
