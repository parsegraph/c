#ifndef parsegraph_Camera_INCLUDED
#define parsegraph_Camera_INCLUDED

#include <apr_pools.h>
#include "Surface.h"

extern int parsegraph_VFLIP;

struct parsegraph_Camera {
parsegraph_Surface* surface;
float _cameraX;
float _cameraY;
int has_pos;
float _defaultCameraPos[2];
float _scale;
float _width;
float _height;
float _aspectRatio;
};
typedef struct parsegraph_Camera parsegraph_Camera;

extern int parsegraph_CLICK_DELAY_MILLIS;

parsegraph_Camera* parsegraph_Camera_new(parsegraph_Surface* surface);
int parsegraph_containsAll(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height);
int parsegraph_containsAny(int viewportX, int viewportY, int viewWidth, int viewHeight, int cx, int cy, int width, int height);
void parsegraph_Camera_zoomToPoint(parsegraph_Camera* camera, float scaleFactor, int x, int y);
void parsegraph_Camera_setDefaultOrigin(parsegraph_Camera* camera, float x, float y);
void parsegraph_Camera_setOrigin(parsegraph_Camera* camera, float x, float y);
parsegraph_Surface* parsegraph_Camera_surface(parsegraph_Camera* camera);
float parsegraph_Camera_scale(parsegraph_Camera* camera);
float parsegraph_Camera_x(parsegraph_Camera* camera);
float parsegraph_Camera_y(parsegraph_Camera* camera);
void parsegraph_Camera_setScale(parsegraph_Camera* camera, float scale);
int parsegraph_Camera_toString(parsegraph_Camera* camera, char* buf, int maxlen);
void parsegraph_Camera_adjustOrigin(parsegraph_Camera* camera, float dx, float dy);
float* parsegraph_Camera_worldMatrix(parsegraph_Camera* camera);
float parsegraph_Camera_aspectRatio(parsegraph_Camera* camera);
float parsegraph_Camera_width(parsegraph_Camera* camera);
float parsegraph_Camera_height(parsegraph_Camera* camera);
int parsegraph_Camera_canProject(parsegraph_Camera* camera);
float* parsegraph_Camera_project(parsegraph_Camera* camera);
int parsegraph_Camera_ContainsAny(parsegraph_Camera* camera, float* rect);

#endif // parsegraph_Camera_INCLUDED
