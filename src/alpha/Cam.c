#include "Cam.h"
#include "Maths.h"
#include <math.h>
#include <GL/gl.h>
#include "../gl.h"
#include <stdio.h>

struct alpha_Camera* alpha_Camera_new(apr_pool_t* pool)
{
    struct alpha_Camera* cam;
    if(pool) {
        cam = apr_palloc(pool, sizeof(*cam));
    }
    else {
        cam = malloc(sizeof(*cam));
    }
    cam->pool = pool;

    cam->fovX = alpha_toRadians(60.1);
    cam->fovY = 0;

    // zoomFactor = zoomSpeed ^ elapsed -- strange but yields a nice zoom
    cam->zoomSpeed = 1;
    cam->zoomFactor = 1;
    cam->farDistance = 2500;
    cam->nearDistance = 1; // with collision detection I may be able to increase this

    // Dimensions of the surface's size.
    cam->width = 0;
    cam->height = 0;

    cam->projectionDirty = 1; // dirty until you call UpdateProjection();
    cam->projectionMatrix = alpha_RMatrix4_new(pool);
    cam->modelDirty = 1;
    cam->modelMatrix = alpha_RMatrix4_new(pool);
    cam->viewMatrix = alpha_RMatrix4_new(pool);

    cam->pitch = 0; // a check value
    cam->rotationSpeedX = 1;
    cam->rotationSpeedY = 1;
    cam->maxRange = 50;
    cam->speed = 5; // speed the camera changes range at
    cam->orientation = alpha_Quaternion_new(pool);
    cam->position = alpha_Vector_new(pool);
    cam->offset = alpha_Vector_new(pool);
    cam->reengage = 0; // here for completeness sake, setting it to null does null
    cam->reengageIsPhysical = 0;
    cam->freeFloating = 0;

    // not using disengage because we are not engaged
    cam->parent = 0;
    alpha_Camera_SetParent(cam, 1, alpha_Camera_GetInvisiblePhysical(cam));
    return cam;
}

float* alpha_Camera_GetOrientation(alpha_Camera* cam)
{
    return cam->orientation;
}

alpha_Physical* alpha_Camera_GetInvisiblePhysical(alpha_Camera* cam)
{
    float* position;
    float* orientation;
    if(cam->parent) {
        void* currentParent = alpha_Camera_GetParent(cam);
        if(cam->parentIsPhysical) {
            position = alpha_Physical_GetPosition(currentParent);
            orientation = alpha_Physical_GetOrientation(currentParent);
        }
        else {
            position = alpha_Camera_GetPosition(currentParent);
            orientation = alpha_Camera_GetOrientation(currentParent);
        }
    }
    else {
        // this shouldn't happen outside of construction;
        position = cam->position;
        orientation = cam->orientation;
    }

    alpha_Physical* p = alpha_Physical_new(cam->pool, 0, cam);
    alpha_Physical_CopyPosition(p, position);
    alpha_Physical_CopyOrientation(p, orientation);
    if(cam->parent) {
	    alpha_Physical_SetParent(p, cam->parentIsPhysical, cam->parent);
    }
    return p;
}

// ----------------------------------------------
// ------------ PROJECTION MATRIX ---------------
// ----------------------------------------------

// -- we set FOV in degrees
// -- we get in radians;
void alpha_Camera_SetFovX(alpha_Camera* cam, float fovX)
{
    cam->fovX = alpha_toRadians(fovX);
    cam->projectionDirty = 1;
}

void alpha_Camera_SetFovY(alpha_Camera* cam, float fovY)
{
    cam->fovY = alpha_toRadians(fovY);
    cam->projectionDirty = 1;
}

float alpha_Camera_GetFovX(alpha_Camera* cam)
{
    // autoadjust if fovX == 0
    float fovX = cam->fovX;
    if(!fovX || fovX == 0) {
        float aspect = cam->width / cam->height;
        fovX = cam->fovY * aspect;
    }
    return fovX;
}

float alpha_Camera_GetFovY(alpha_Camera* cam)
{
    float fovY = cam->fovY;
    // autoadjust if fovY == 0
    if(!fovY || fovY == 0) {
        float aspect = cam->width / cam->height;
        fovY = cam->fovX / aspect;
    }
    return fovY;
    // if you set them both to zero, you won't see anything. Working as expected.
}

// sets the fov
// unless you have a huge screen and sit very close I do not recommend
// width = width of the viewport
// distance = distance of eyes from viewport
// use the same units for both;
void alpha_Camera_SetProperFOV(alpha_Camera* cam, float vpWidth, float eyeDistance)
{
    float fovx = atanf((vpWidth * 0.5) / eyeDistance) * 2;
    alpha_Camera_SetFovY(cam, 0); // set this to autoadjust;
    alpha_Camera_SetFovX(cam, alpha_toDegrees(fovx)); // and set this to the proper fov;
}

void alpha_Camera_SetZoom(alpha_Camera* cam, float factor)
{
    if(factor < 1) {
        return; // assholes
    }

    cam->zoomFactor = factor;
    cam->projectionDirty = 1;
}

float alpha_Camera_GetZoom(alpha_Camera* cam)
{
    return cam->zoomFactor;
}

void alpha_Camera_SetZoomSpeed(alpha_Camera* cam, float speed)
{
    cam->zoomSpeed = speed;
}

void alpha_Camera_ZoomIn(alpha_Camera* cam, int bind, float elapsed)
{
    if(!bind || bind <= 0) {
        return;
    }
    else if(bind > 1) {
        bind = 1;
    }

    float zoom = cam->zoomFactor + powf(cam->zoomSpeed, bind * elapsed);
    if(zoom < 1) {
        zoom = 1;
    }
    alpha_Camera_SetZoom(cam, zoom);
}

void alpha_Camera_ZoomOut(alpha_Camera* cam, int bind, float elapsed)
{
    if(!bind || !elapsed) {
        return;
    }

    if(bind <= 0) {
        return;
    }
    else if(bind > 1) {
        bind = 1;
    }

    float zoom = cam->zoomFactor - powf(cam->zoomSpeed, bind * elapsed);
    if(zoom < 1) {
        zoom = 1;
    }
    alpha_Camera_SetZoom(cam, zoom);
}

void alpha_Camera_CancelZoom(alpha_Camera* cam)
{
    alpha_Camera_SetZoom(cam, 1);
}

// continues to zoom until the zoom is reached;
// broken until I am less tired
void alpha_Camera_ZoomUntil(alpha_Camera* cam, float zoom, int bind, float elapsed)
{
    if(!zoom || !bind || !elapsed) {
        return;
    }
    if(bind <= 0) {
        return;
    }

    float factor = cam->zoomFactor;
    if(zoom > factor) {
        // need to increase zoom;
        alpha_Camera_ZoomIn(cam, 1, elapsed);
	if(alpha_Camera_GetZoom(cam) > factor) {
            // oops we overshot
            alpha_Camera_SetZoom(cam, factor);
        }
    }
    if(zoom < factor) {
        // XXX
    }
}

// anything further than this is clipped
void alpha_Camera_SetFarDistance(alpha_Camera* cam, float distance)
{
    cam->farDistance = distance;
    cam->projectionDirty = 1;
}

float alpha_Camera_GetFarDistance(alpha_Camera* cam)
{
    return cam->farDistance;
}

// anything nearer than this is clipped
void alpha_Camera_SetNearDistance(alpha_Camera* cam, float distance)
{
    cam->nearDistance = distance;
    cam->projectionDirty = 1;
}

float alpha_Camera_GetNearDistance(alpha_Camera* cam)
{
    return cam->nearDistance;
}

float* alpha_Camera_UpdateProjection(struct alpha_Camera* cam, int renderWidth, int renderHeight)
{
    cam->width = renderWidth;
    cam->height = renderHeight;
    glViewport(0, 0, cam->width, cam->height);

    alpha_RMatrix4_Copy(cam->projectionMatrix, makePerspective(cam->pool,
        alpha_Camera_GetFovX(cam) / cam->zoomFactor,
        cam->width / cam->height,
        cam->nearDistance,
        cam->farDistance
    ));
    cam->projectionDirty = 0;
    return cam->projectionMatrix;

}

// -------------------------------------
// ------------ Rotation ---------------
// -------------------------------------

void alpha_Camera_SetOrientation(alpha_Camera* cam, float* orientation)
{
    alpha_Quaternion_Copy(cam->orientation, orientation);
    cam->modelDirty = 1;
}

void alpha_Camera_SetOrientationEach(alpha_Camera* cam, float ox, float oy, float oz, float ow)
{
    alpha_Quaternion_Set(cam->orientation, ox, oy, oz, ow);
    cam->modelDirty = 1;
}

// in radians / second
void alpha_Camera_SetRotationSpeeds(alpha_Camera* cam, float x, float y)
{
    cam->rotationSpeedX = x;
    cam->rotationSpeedY = y;
}

void alpha_Camera_GetRotationSpeeds(alpha_Camera* cam, float* x, float* y)
{
    *x = cam->rotationSpeedX;
    *y = cam->rotationSpeedY;
}

void alpha_Camera_SetRotationSpeed(alpha_Camera* cam, float speed)
{
    cam->rotationSpeedX = speed;
    cam->rotationSpeedY = speed;
}

void alpha_Camera_Pitch(alpha_Camera* cam, float angle)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }

    // preventing tons of tiny adjustments
    float pi_2 = M_PI / 2;
    if(cam->pitch >= pi_2 && angle > 0) {
        return;
    }
    if(cam->pitch <= -pi_2 && angle < 0) {
        return;
    }

    float pitch = cam->pitch + angle;

    if(pitch < -pi_2) {
        // reduce the angle so that it makes pitch == -pi;
        angle = -pi_2 - cam->pitch;
        pitch = -pi_2;
    }

    if(pitch > pi_2) {
        // reduce the angle so that it makes pitch == pi;
        angle = pi_2 - cam->pitch;
        pitch = pi_2;
    }

    cam->pitch = pitch;
    // now rotate by that angle about the x axis;
    float q[4];
    alpha_Quaternion_SetIdentity(q);
    alpha_Quaternion_FromAxisAndAngleEach(q, 1, 0, 0, angle);

    float orient[4];
    alpha_Quaternion_Copy(orient, cam->orientation);
    alpha_Quaternion_Multiply(orient, q);
    alpha_Camera_SetOrientation(cam, orient);
}

void alpha_Camera_Turn(alpha_Camera* cam, float angle)
{
    // if you aren't rotating about an angle, then you aren't rotating
    if(angle == 0) {
        return;
    }

    float q[4];
    alpha_Quaternion_SetIdentity(q);
    alpha_Quaternion_FromAxisAndAngleEach(q, 0, 1, 0, angle);

    float orient[4];
    alpha_Quaternion_Copy(orient, cam->orientation);
    alpha_Quaternion_Multiply(q, orient);
    alpha_Camera_SetOrientation(cam, orient);
}

// these rotations take place at the speeds set by rotationSpeed
void alpha_Camera_TurnLeft(alpha_Camera* cam, float elapsed)
{
    float angle = elapsed * cam->rotationSpeedX;
    alpha_Camera_Turn(cam, angle);
}

void alpha_Camera_TurnRight(alpha_Camera* cam, float elapsed)
{
    float angle = elapsed * cam->rotationSpeedY;
    alpha_Camera_Turn(cam, -angle);
}

void alpha_Camera_PitchUp(alpha_Camera* cam, float elapsed)
{
    float angle = elapsed * cam->rotationSpeedX;
    alpha_Camera_Pitch(cam, angle);
}

void alpha_Camera_PitchDown(alpha_Camera* cam, float elapsed)
{
    float angle = elapsed * cam->rotationSpeedX;
    alpha_Camera_Pitch(cam, -angle);
}

// set which axis you want to align to
void alpha_Camera_AlignParentToMy(alpha_Camera* cam, float x, float y)
{
    float q[4];
    alpha_Quaternion_SetIdentity(q);
    float pitch = cam->pitch;
    // no matter what, when we leave here there will be no pitch;
    cam->pitch = 0;

    void* parent = alpha_Camera_GetParent(cam);
    int parentIsPhysical = alpha_Camera_GetParentIsPhysical(cam);
    // if we want to match yaw only
    if(y && !x) {
        // find the quaternion of our pitch; inverted.
        alpha_Quaternion_FromAxisAndAngleEach(q, 1, 0, 0, -pitch);

        float res[4];
        alpha_Quaternion_SetIdentity(res);

        // our yaw in player space
        if(parentIsPhysical) {
            alpha_Quaternion_Copy(res, alpha_Physical_GetOrientation(parent));
        }
        else {
            alpha_Quaternion_Copy(res, alpha_Camera_GetOrientation(parent));
        }
        alpha_Quaternion_Multiply(res, alpha_Camera_GetOrientation(cam));
        alpha_Quaternion_Multiply(res, q);
        // set the parent to the new quaternion
        if(parentIsPhysical) {
            alpha_Physical_CopyOrientation(parent, res);
        }
        else {
            alpha_Camera_SetOrientation(parent, res);
        }
        // set the camera to default identity
        // these makes the camera not move
        alpha_Camera_SetOrientationEach(cam, 0, 0, 0, 1);
        // set our pitch back to where it was
        alpha_Camera_Pitch(cam, pitch);
    }
    // if we want to match pitch only
    // no idea why you would want to do this
    else if(x && !y) {
        // the quaternion of our pitch
        alpha_Quaternion_FromAxisAndAngleEach(q, 1, 0, 0, pitch);

        // our pitch in parent space;
        float res[4];
        alpha_Quaternion_SetIdentity(res);
        if(parentIsPhysical) {
            alpha_Quaternion_Copy(res, alpha_Physical_GetOrientation(parent));
        }
        else {
            alpha_Quaternion_Copy(res, alpha_Camera_GetOrientation(parent));
        }
        alpha_Quaternion_Multiply(res, q);
        if(parentIsPhysical) {
            alpha_Physical_CopyOrientation(parent, res);
        }
        else {
            alpha_Camera_SetOrientation(parent, res);
        }
        alpha_Camera_SetOrientationEach(cam, 0, 0, 0, 1);

        // not bothering to set our yaw back to where it was because
        // this option shouldn't be used
        // it's bizarre

        // match pitch and yaw with the camera
    }
    else {
        // camera's orientation in parent space
        float res[4];
        if(parentIsPhysical) {
            alpha_Quaternion_Copy(res, alpha_Physical_GetOrientation(parent));
        }
        else {
            alpha_Quaternion_Copy(res, alpha_Camera_GetOrientation(parent));
        }
        alpha_Quaternion_Multiply(res, alpha_Camera_GetOrientation(cam));
        if(parentIsPhysical) {
            alpha_Physical_CopyOrientation(parent, res);
        }
        else {
            alpha_Camera_SetOrientation(parent, res);
        }
        alpha_Camera_SetOrientationEach(cam, 0, 0, 0, 1);
    }
}

// -------------------------------------
// ------------ POSITION ---------------
// -------------------------------------

// send as x,y,z or vector
void alpha_Camera_SetPositionEach(alpha_Camera* cam, float x, float y, float z)
{
    alpha_Vector_Set(cam->position, x, y, z);
    cam->modelDirty = 1;
}

void alpha_Camera_SetPosition(alpha_Camera* cam, float* vec)
{
    alpha_Camera_SetPositionEach(cam, vec[0], vec[1], vec[2]);
}

void alpha_Camera_SetRange(alpha_Camera* cam, float range)
{
    alpha_Camera_SetPositionEach(cam, 0, 0, range);
}

// return as Vector
float* alpha_Camera_GetPosition(alpha_Camera* cam)
{
    return cam->position;
}

void alpha_Camera_ChangePosition(alpha_Camera* cam, float* vec)
{
    alpha_Camera_ChangePositionEach(cam, vec[0], vec[1], vec[2]);
}

void alpha_Camera_ChangePositionEach(alpha_Camera* cam, float x, float y, float z)
{
    float cop[3];
    alpha_Vector_Copy(cop, cam->position);
    alpha_Vector_AddEach(cop, x, y, z);
    alpha_Camera_SetPosition(cam, cop);
}

// offset from the physical
void alpha_Camera_SetOffset(alpha_Camera* cam, float* vec)
{
    alpha_Camera_SetOffsetEach(cam, vec[0], vec[1], vec[2]);
}

void alpha_Camera_SetOffsetEach(alpha_Camera* cam, float x, float y, float z)
{
    alpha_Vector_Set(cam->offset, x, y, z);
    cam->modelDirty = 1;
}

// return as Vector
float* alpha_Camera_GetOffset(alpha_Camera* cam)
{
    return cam->offset;
}

void alpha_Camera_ChangeOffset(alpha_Camera* cam, float* vec)
{
    alpha_Camera_ChangeOffsetEach(cam, vec[0], vec[1], vec[2]);
}

void alpha_Camera_ChangeOffsetEach(alpha_Camera* cam, float x, float y, float z)
{
    float cop[3];
    alpha_Vector_Copy(cop, cam->offset);
    alpha_Vector_AddEach(cop, x, y, z);
    alpha_Camera_SetOffset(cam, cop);
}

// ------------------------------------------
// -----------  MOVEMENT --------------------
// ------------------------------------------

void alpha_Camera_SetMaxRange(alpha_Camera* cam, float maxRange)
{
    cam->maxRange = maxRange;
}

float alpha_Camera_GetMaxRange(alpha_Camera* cam)
{
    return cam->maxRange;
}

// camera movement is easy; it can only move in and out
void alpha_Camera_Warp(alpha_Camera* cam, float distance)
{
    float z = cam->position[2];

    // preventing tons of tiny adjustments
    if(z <= 0 && distance < 0) {
        return;
    }
    if(z >= cam->maxRange && distance > 0) {
        return;
    }

    // add it to our current position to get our new position
    /*float cz = z + distance;
    if(cz < 0) {
        distance = -z;
    }
    if(cz > cam->maxRange) {
        distance = cam->maxRange - z;
    }*/

    alpha_Camera_ChangePositionEach(cam, 0, 0, distance);
}

void alpha_Camera_WarpIn(alpha_Camera* cam, float distance)
{
    alpha_Camera_Warp(cam, -distance);
}

void alpha_Camera_WarpOut(alpha_Camera* cam, float distance)
{
    alpha_Camera_Warp(cam, distance);
}
// alias for end-user use

// ------------------------------------------
// --------------- VELOCITY -----------------
// ------------------------------------------

// -- since we can only move in one direction
// -- there isn't any velocity
// -- these are the commands needed for expected movement
void alpha_Camera_SetSpeed(alpha_Camera* cam, float speed)
{
    cam->speed = speed;
}

float alpha_Camera_GetSpeed(alpha_Camera* cam)
{
    return cam->speed;
}

void alpha_Camera_MoveForward(alpha_Camera* cam, float elapsed)
{
    float distance = elapsed * cam->speed;
    alpha_Camera_Warp(cam, -distance);
}

void alpha_Camera_MoveBackward(alpha_Camera* cam, float elapsed)
{
    float distance = elapsed * cam->speed;
    alpha_Camera_Warp(cam, distance);
}

// ------------------------------------------
// --------------  PARENTING ----------------
// ------------------------------------------

void alpha_Camera_Disengage(alpha_Camera* cam)
{
    if(!cam->freeFloating) {
        cam->reengage = cam->parent;
        cam->reengageIsPhysical = cam->parentIsPhysical;
        alpha_Camera_SetParent(cam, cam->reengageIsPhysical, alpha_Camera_GetInvisiblePhysical(cam));
        cam->freeFloating = 0;
    }
}

// sends it back to its previous physical
void alpha_Camera_Engage(alpha_Camera* cam)
{
    if(cam->freeFloating) {
        //this.parent.Destroy(); // get rid of the invisible fucker
        // if called from setparent reengage is already updated
        // just set this bool so we don't go in an infinite loop
        // been there, it sucks  -- GOD
        cam->freeFloating = 0;
        alpha_Camera_SetParent(cam, cam->reengageIsPhysical, cam->reengage);
        cam->reengage = cam->parent;
        cam->reengageIsPhysical = cam->parentIsPhysical;
    }
}

void alpha_Camera_SetParent(alpha_Camera* cam, int parentIsPhysical, void* parent)
{
    // setting the camera to itself sets it to an invisble physical
    if(cam == parent) {
        alpha_Camera_Disengage(cam);
        return;
    }

    // drunken me says this works
    // lets see if he is as stupid as I suspect;
    if(cam->freeFloating) {
        cam->reengage = parent;
        alpha_Camera_Engage(cam);
        return;
    }
    else {
        cam->reengage = cam->parent; // who we reengage to;
    }

    cam->parentIsPhysical = parentIsPhysical;
    cam->parent = parent;
}

void* alpha_Camera_GetParent(alpha_Camera* cam)
{
    return cam->parent;
}

int alpha_Camera_GetParentIsPhysical(alpha_Camera* cam)
{
    return cam->parentIsPhysical;
}

float* alpha_Camera_GetViewMatrix(alpha_Camera* cam, void* requestor)
{
    void* parent = cam->parent;
    if(requestor) {
        // the camera is always loaded first(properly)
        // therefore if something other than the camera asks for camera info
        // simply give it to them.
        return cam->viewMatrix;
    }
    else {
        requestor = cam;
    }

	//alpha_dumpMatrix("modelMatrix:", alpha_Camera_GetModelMatrix(cam));
    if(parent && cam->parentIsPhysical && parent != requestor) {
        float* ancestors = alpha_Physical_GetViewMatrix(parent, requestor);
        //console.log("this.modelMatrix:\n" + this.GetModelMatrix());
        //console.log("parent.viewMatrix:\n" + ancestors.toString());
        //console.log("modelMatrix * ancestors:\n" + this.GetModelMatrix().Multiplied(ancestors));
        cam->viewMatrix = alpha_RMatrix4_Multiplied(cam->pool, alpha_Camera_GetModelMatrix(cam), ancestors);
        //console.log("this.viewMatrix:\n" + this.viewMatrix.toString());
        return cam->viewMatrix;
    }
    else {
        // you could also do a dummy identity matrix as the ancestor
        // but why do extra math?
	//
	return alpha_RMatrix4_Inversed(cam->pool, alpha_Camera_GetModelMatrix(cam));
    }
};

float* alpha_Camera_GetModelMatrix(alpha_Camera* cam)
{
    if(cam->modelDirty) {
        float* p = cam->position;
        float* o = cam->offset;
        float* r = cam->orientation;

	//fprintf(stderr, "position=(%f %f %f)\n", p[0], p[1], p[2]);
	//fprintf(stderr, "offset=(%f %f %f)\n", o[0], o[1], o[2]);
    //fprintf(stderr, "orientation=(%f %f %f %f)\n", r[0], r[1], r[2], r[3]);
	alpha_RMatrix4_SetIdentity(cam->modelMatrix);
    alpha_RMatrix4_FromVectorAroundQuaternionAtVector(cam->modelMatrix, p, r, o); // oh yea;
	//alpha_dumpMatrix("modelMat=", cam->modelMatrix);
        cam->modelDirty = 0;
    }
    return cam->modelMatrix;
}
