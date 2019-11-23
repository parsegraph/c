#ifndef parsegraph_Camera_INCLUDED
#define parsegraph_Camera_INCLUDED

#include <apr_pools.h>

struct parsegraph_Camera {
float _cameraX;
float _cameraY;
int has_pos;
float _defaultCameraPos[2];
float _scale;
float _width;
float _height;
float _aspectRatio;
int _changeVersion;
int _vflip;
};
typedef struct parsegraph_Camera parsegraph_Camera;

struct parsegraph_CameraState {
float cameraX;
float cameraY;
float scale;
int width;
int height;
};
typedef struct parsegraph_CameraState parsegraph_CameraState;

extern int parsegraph_CLICK_DELAY_MILLIS;

parsegraph_Camera* parsegraph_Camera_new(apr_pool_t* pool);
int parsegraph_containsAll(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height);
int parsegraph_containsAny(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height);
void parsegraph_Camera_zoomToPoint(parsegraph_Camera* camera, float scaleFactor, int x, int y);
void parsegraph_Camera_setDefaultOrigin(parsegraph_Camera* camera, float x, float y);
void parsegraph_Camera_setOrigin(parsegraph_Camera* camera, float x, float y);
int parsegraph_Camera_changeVersion(parsegraph_Camera* camera);
void parsegraph_Camera_hasChanged(parsegraph_Camera* camera);
float parsegraph_Camera_scale(parsegraph_Camera* camera);
float parsegraph_Camera_x(parsegraph_Camera* camera);
float parsegraph_Camera_y(parsegraph_Camera* camera);
void parsegraph_Camera_setScale(parsegraph_Camera* camera, float scale);
int parsegraph_Camera_toString(parsegraph_Camera* camera, char* buf, int maxlen);
void parsegraph_Camera_adjustOrigin(parsegraph_Camera* camera, float dx, float dy);
float* parsegraph_Camera_worldMatrix(parsegraph_Camera* camera, apr_pool_t* pool);
void parsegraph_Camera_worldMatrixI(parsegraph_Camera* camera, float* dest);
float parsegraph_Camera_aspectRatio(parsegraph_Camera* camera);
float parsegraph_Camera_width(parsegraph_Camera* camera);
float parsegraph_Camera_height(parsegraph_Camera* camera);
int parsegraph_Camera_canProject(parsegraph_Camera* camera);
int parsegraph_Camera_getVflip(parsegraph_Camera* camera);
void parsegraph_Camera_setVflip(parsegraph_Camera* camera, int vflip);
void parsegraph_Camera_projectionMatrix(parsegraph_Camera* camera, float* dest);
void parsegraph_Camera_project(parsegraph_Camera* camera, float* dest);
int parsegraph_Camera_containsAny(parsegraph_Camera* camera, float* rect);
int parsegraph_Camera_containsAll(parsegraph_Camera* camera, float* rect);
void parsegraph_Camera_saveState(parsegraph_Camera* camera, parsegraph_CameraState* dest);
void parsegraph_Camera_restoreState(parsegraph_Camera* camera, parsegraph_CameraState* src);

#endif // parsegraph_Camera_INCLUDED
