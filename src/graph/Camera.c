#include "Camera.h"
#include "log.h"
#include "../gl.h"
#include "../die.h"
#include "Rect.h"
#include <stdio.h>
#include <stdlib.h>

int parsegraph_CLICK_DELAY_MILLIS = 500;

parsegraph_Camera* parsegraph_Camera_new(parsegraph_Surface* surface)
{
    parsegraph_Camera* camera = apr_palloc(surface->pool, sizeof(*camera));
    if(!surface) {
        fprintf(stderr, "A surface must be provided");
        abort();
    }
    camera->surface = surface;

    camera->has_pos = 0;
    camera->_cameraX = 0;
    camera->_cameraY = 0;
    camera->_scale = 1;
    memset(camera->_defaultCameraPos, 0, sizeof(float)*2);

    camera->_width = 0;
    camera->_height = 0;
    camera->_aspectRatio = 1;
    camera->_changeVersion = 0;

    return camera;
};

int parsegraph_containsAll(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height)
{
    int viewHalfWidth = viewWidth / 2;
    int viewHalfHeight = viewHeight / 2;
    int halfWidth = width / 2;
    int halfHeight = height / 2;

    if(cx + halfWidth > viewportX + viewHalfWidth) {
        return 0;
    }
    if(cx - halfWidth < viewportX - viewHalfWidth) {
        return 0;
    }
    if(cy + halfHeight > viewportY + viewHalfHeight) {
        return 0;
    }
    if(cy - halfHeight < viewportY - viewHalfHeight) {
        return 0;
    }
    return 1;
}

int parsegraph_containsAny(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height)
{
    int viewHalfWidth = viewWidth / 2;
    int viewHalfHeight = viewHeight / 2;
    int halfWidth = width / 2;
    int halfHeight = height / 2;

    //function dump() {
        //console.log("viewportX=" + viewportX);
        //console.log("viewportY=" + viewportY);
        //console.log("viewWidth=" + viewWidth);
        //console.log("viewHeight=" + viewHeight);
        //console.log("cx=" + cx);
        //console.log("cy=" + cy);
        //console.log("width=" + width);
        //console.log("height=" + height);
    //};

    if(cx - halfWidth > viewportX + viewHalfWidth) {
        //console.log(1);
        //dump();
        return 0;
    }
    if(cx + halfWidth < viewportX - viewHalfWidth) {
        //console.log(2);
        //dump();
        return 0;
    }
    if(cy - halfHeight > viewportY + viewHalfHeight) {
        //console.log("Viewport min is greater than given's max");
        //dump();
        return 0;
    }
    if(cy + halfHeight < viewportY - viewHalfHeight) {
        //console.log("Viewport does not contain any: given vmax is less than viewport's vmin");
        //dump();
        return 0;
    }
    return 1;
}

void parsegraph_Camera_zoomToPoint(parsegraph_Camera* camera, float scaleFactor, int x, int y)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, camera->surface->pool)) {
        parsegraph_die("Failed to create temporary memory pool to calculate zoom location.");
    }

    // Get the current mouse position, in world space.
    float* mouseInWorld = matrixTransform2D(pool,
        makeInverse3x3(pool, parsegraph_Camera_worldMatrix(camera, pool)),
        x, y
    );
    //fprintf(stderr, "mouseInWorld=%f, %f\n", mouseInWorld[0], mouseInWorld[1]);

    // Adjust the scale.
    parsegraph_Camera_setScale(camera, parsegraph_Camera_scale(camera) * scaleFactor);

    // Get the new mouse position, in world space.
    float* mouseAdjustment = matrixTransform2D(pool,
        makeInverse3x3(pool, parsegraph_Camera_worldMatrix(camera, pool)),
        x, y
    );
    //parsegraph_log("mouseAdjustment=%f, %f", mouseAdjustment[0], mouseAdjustment[1]);

    // Adjust the origin by the movement of the fixed point.
    parsegraph_Camera_adjustOrigin(camera,
        mouseAdjustment[0] - mouseInWorld[0],
        mouseAdjustment[1] - mouseInWorld[1]
    );
    apr_pool_destroy(pool);
};

void parsegraph_Camera_setOrigin(parsegraph_Camera* camera, float x, float y)
{
    if(!camera->has_pos) {
        camera->has_pos = 1;
    }
    //parsegraph_log("Setting Camera origin to (%f, %f)\n", x, y);
    camera->_cameraX = x;
    camera->_cameraY = y;
    parsegraph_Camera_hasChanged(camera);
}

int parsegraph_Camera_changeVersion(parsegraph_Camera* camera)
{
    return camera->_changeVersion;
}

void parsegraph_Camera_hasChanged(parsegraph_Camera* camera)
{
    ++camera->_changeVersion;
}

void parsegraph_Camera_saveState(parsegraph_Camera* camera, parsegraph_CameraState* dest)
{
    dest->cameraX = camera->_cameraX;
    dest->cameraY = camera->_cameraY;
    dest->scale = camera->_scale;
    dest->width = camera->_width;
    dest->height = camera->_height;
}

void parsegraph_Camera_restoreState(parsegraph_Camera* camera, parsegraph_CameraState* src)
{
    parsegraph_Camera_setOrigin(camera, src->cameraX, src->cameraY);
    parsegraph_Camera_setScale(camera, src->scale);
}

void parsegraph_Camera_setDefaultOrigin(parsegraph_Camera* camera, float x, float y)
{
    //parsegraph_log("Setting Camera origin to (%f, %f)\n", x, y);
    camera->_defaultCameraPos[0] = x;
    camera->_defaultCameraPos[1] = y;
}

parsegraph_Surface* parsegraph_Camera_surface(parsegraph_Camera* camera)
{
    return camera->surface;
};

float parsegraph_Camera_scale(parsegraph_Camera* camera)
{
    return camera->_scale;
};

float parsegraph_Camera_x(parsegraph_Camera* camera)
{
    if(!camera->has_pos) {
        return camera->_defaultCameraPos[0];
    }
    return camera->_cameraX;
};

float parsegraph_Camera_y(parsegraph_Camera* camera)
{
    if(!camera->has_pos) {
        return camera->_defaultCameraPos[1];
    }
    return camera->_cameraY;
};

void parsegraph_Camera_setScale(parsegraph_Camera* camera, float scale)
{
    camera->_scale = scale;
};

int parsegraph_Camera_toString(parsegraph_Camera* camera, char* buf, int maxlen)
{
    return snprintf(buf, maxlen, "(%f, %f, %f)", parsegraph_Camera_x(camera), parsegraph_Camera_y(camera), parsegraph_Camera_scale(camera));
};

void parsegraph_Camera_adjustOrigin(parsegraph_Camera* camera, float dx, float dy)
{
    if(!camera->has_pos) {
        camera->_cameraX = camera->_defaultCameraPos[0];
        camera->_cameraY = camera->_defaultCameraPos[1];
        camera->has_pos = 1;
    }
    //parsegraph_log("Adjusting Camera origin (%f, %f) by (%f, %f)\n", camera->_cameraX, camera->_cameraY, dx, dy);
    camera->_cameraX += dx;
    camera->_cameraY += dy;
    parsegraph_Camera_hasChanged(camera);
}

float* parsegraph_Camera_worldMatrix(parsegraph_Camera* camera, apr_pool_t* pool)
{
    return matrixMultiply3x3(
        pool,
        makeTranslation3x3(pool, parsegraph_Camera_x(camera), parsegraph_Camera_y(camera)),
        makeScale3x3(pool, parsegraph_Camera_scale(camera), parsegraph_Camera_scale(camera))
    );
};

void parsegraph_Camera_worldMatrixI(parsegraph_Camera* camera, float* dest)
{
    float scale[9];
    makeScale3x3I(scale, parsegraph_Camera_scale(camera), parsegraph_Camera_scale(camera));
    float trans[9];
    makeTranslation3x3I(trans, parsegraph_Camera_x(camera), parsegraph_Camera_y(camera)),
    matrixMultiply3x3I(dest, trans, scale);
}

float parsegraph_Camera_aspectRatio(parsegraph_Camera* camera)
{
    return camera->_aspectRatio;
};

float parsegraph_Camera_width(parsegraph_Camera* camera)
{
    return camera->_width;
};

float parsegraph_Camera_height(parsegraph_Camera* camera)
{
    return camera->_height;
};

int parsegraph_Camera_canProject(parsegraph_Camera* camera)
{
    float displayWidth = parsegraph_Surface_getWidth(camera->surface);
    float displayHeight = parsegraph_Surface_getHeight(camera->surface);
    return displayWidth != 0 && displayHeight != 0;
}

void parsegraph_Camera_projectionMatrix(parsegraph_Camera* camera, float* dest)
{
    if(!parsegraph_Camera_canProject(camera)) {
        parsegraph_die(
            "Camera cannot create a projection matrix because the "
            "target canvas has no size. Use canProject() to handle."
        );
    }

    // http://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // Lookup the size the browser is displaying the canvas.
    float displayWidth = parsegraph_Surface_getWidth(camera->surface);
    float displayHeight = parsegraph_Surface_getHeight(camera->surface);

    // Set the viewport to match
    glViewport(0, 0, displayWidth, displayHeight);

    camera->_aspectRatio = displayWidth / displayHeight;
    camera->_width = displayWidth;
    camera->_height = displayHeight;

    make2DProjectionI(dest, displayWidth, displayHeight, parsegraph_VFLIP);
}

void parsegraph_Camera_project(parsegraph_Camera* camera, float* dest)
{
    float projectionMatrix[9];
    parsegraph_Camera_projectionMatrix(camera, projectionMatrix);
    float worldMatrix[9];
    parsegraph_Camera_worldMatrixI(camera, worldMatrix);
    matrixMultiply3x3I(dest, worldMatrix, projectionMatrix);
}

int parsegraph_Camera_containsAny(parsegraph_Camera* camera, float* rect)
{
    return parsegraph_containsAny(
        -camera->_cameraX + camera->_width/(camera->_scale*2),
        -camera->_cameraY + camera->_height/(camera->_scale*2),
        camera->_width / camera->_scale,
        camera->_height / camera->_scale,
        parsegraph_Rect_x(rect),
        parsegraph_Rect_y(rect),
        parsegraph_Rect_width(rect),
        parsegraph_Rect_height(rect)
    );
}

int parsegraph_Camera_containsAll(parsegraph_Camera* camera, float* rect)
{
    return parsegraph_containsAll(
        -camera->_cameraX + camera->_width/(camera->_scale*2),
        -camera->_cameraY + camera->_height/(camera->_scale*2),
        camera->_width / camera->_scale,
        camera->_height / camera->_scale,
        parsegraph_Rect_x(rect),
        parsegraph_Rect_y(rect),
        parsegraph_Rect_width(rect),
        parsegraph_Rect_height(rect)
    );
}
