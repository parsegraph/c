#include "alpha_WeetCubeWidget.h"
#include "alpha/GLWidget.h"
#include "alpha/Physical.h"
#include "alpha/Maths.h"
#include "alpha/Cam.h"
#include "graph/Surface.h"
#include <stdio.h>
#include <stdlib.h>

static void renderWidget(void* widgetPtr, void* renderData)
{
    alpha_RenderData* rd = renderData;
    alpha_WeetCubeWidget_render(widgetPtr, rd->width, rd->height);
}

static void paintWidget(void* widgetPtr, void* renderData)
{
    alpha_WeetCubeWidget_paint(widgetPtr);
}

struct alpha_WeetCubeWidget* alpha_WeetCubeWidget_new(parsegraph_Surface* surface)
{
    struct alpha_WeetCubeWidget* widget = malloc(sizeof(*widget));
    widget->pool = surface->pool;
    widget->camera = alpha_Camera_new(widget->pool);
    parsegraph_Surface_addPainter(surface, paintWidget, widget);
    parsegraph_Surface_addRenderer(surface, renderWidget, widget);
    alpha_Camera_SetFovX(widget->camera, 60);
    alpha_Camera_SetFarDistance(widget->camera, 1000);
    alpha_Camera_SetNearDistance(widget->camera, .1);

    widget->input = alpha_Input_new(surface, widget->camera);
    alpha_Input_SetMouseSensitivity(widget->input, .4);

    widget->cubePainter = 0;
    widget->rotq = 0;
    widget->_elapsed = 0.0;
    widget->_frozen = 0;
    int amt = 30;
    widget->_xMax = amt;
    widget->_yMax = amt;
    widget->_zMax = amt;
    alpha_Camera_SetPositionEach(widget->camera, -1, -1, widget->_zMax * -5.5);

    widget->_listener = 0;
    widget->_listenerThisArg = 0;



    return widget;
}

void alpha_WeetCubeWidget_refresh(struct alpha_WeetCubeWidget* widget)
{
    if(widget->cubePainter) {
        alpha_WeetPainter_Init(widget->cubePainter,
            widget->_xMax * widget->_yMax * widget->_zMax
        );
    }
}

void alpha_WeetCubeWidget_setMax(struct alpha_WeetCubeWidget* widget, float max)
{
    widget->_xMax = max;
    widget->_yMax = max;
    widget->_zMax = max;
    alpha_WeetCubeWidget_refresh(widget);
}

void alpha_WeetCubeWidget_setXMax(struct alpha_WeetCubeWidget* widget, float xMax)
{
    widget->_xMax = xMax;
    alpha_WeetCubeWidget_refresh(widget);
}

void alpha_WeetCubeWidget_setYMax(struct alpha_WeetCubeWidget* widget, float yMax)
{
    widget->_yMax = yMax;
    alpha_WeetCubeWidget_refresh(widget);
    if(widget->cubePainter) {
        alpha_WeetPainter_Init(widget->cubePainter,
            widget->_xMax * widget->_yMax * widget->_zMax
        );
    }
}

void alpha_WeetCubeWidget_setZMax(struct alpha_WeetCubeWidget* widget, float zMax)
{
    widget->_zMax = zMax;
    alpha_WeetCubeWidget_refresh(widget);
}

void alpha_WeetCubeWidget_setRotq(struct alpha_WeetCubeWidget* widget, float rotq)
{
    widget->rotq = rotq;
}

void alpha_WeetCubeWidget_Tick(struct alpha_WeetCubeWidget* widget, float elapsed, int frozen)
{
    alpha_Input_Update(widget->input, elapsed);
    widget->_elapsed = elapsed;
    widget->_frozen = frozen;
}

void alpha_WeetCubeWidget_paint(struct alpha_WeetCubeWidget* widget)
{
    float elapsed = widget->_elapsed;
    float rotq = widget->rotq;

    if(!widget->cubePainter) {
        widget->cubePainter = alpha_WeetPainter_new(widget->pool);
        alpha_WeetPainter_Init(widget->cubePainter, widget->_xMax * widget->_yMax * widget->_zMax);
    }
    else {
        alpha_WeetPainter_Clear(widget->cubePainter);
    }

    struct alpha_Physical* c = alpha_Physical_new(widget->pool, 0, widget->camera);
    for(int i = 0; i < widget->_xMax; ++i) {
        for(int j = 0; j < widget->_yMax; ++j) {
            for(int k = 0; k < widget->_zMax; ++k) {
                c->modelMode = alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE;
                alpha_Physical_SetScale(c, 1, 1, 1);
                alpha_Quaternion_SetIdentity(c->orientation);
                alpha_Vector_Set(c->position, 0, 0, 0);
                alpha_Vector_Set(c->scale, 1, 1, 1);
                alpha_Physical_Rotate(c, rotq*2*k/10, 0, 1, 1);
                alpha_Physical_Rotate(c, rotq*2*i/15, 1, 0, 0);
                alpha_Physical_Rotate(c, rotq*2*j/10, 1, 0, 1);
                alpha_Physical_SetPosition(c, 2*i, 2*j, 2*k);
                alpha_Physical_SetScale(c, 1, 1, 1);
                alpha_WeetPainter_Cube(widget->cubePainter, alpha_Physical_GetModelMatrix(c));
            }
        }
        rotq = rotq + 0.001 * elapsed;
    }
    //fprintf(stderr, "dataX=%d\n", widget->cubePainter->_dataX);

    widget->rotq = rotq;
    if(widget->_listener) {
        widget->_listener(widget->_listenerThisArg);
    }
}

void alpha_WeetCubeWidget_setUpdateListener(struct alpha_WeetCubeWidget* widget, void(*listener)(void*), void* listenerThisArg)
{
    widget->_listener = listener;
    widget->_listenerThisArg = listenerThisArg != 0 ? listenerThisArg : widget;
}

void alpha_WeetCubeWidget_render(struct alpha_WeetCubeWidget* widget, int renderWidth, int renderHeight)
{
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);

    float* projection = alpha_Camera_UpdateProjection(widget->camera, renderWidth, renderHeight);
    //alpha_dumpMatrix("projection is", projection);
    float* viewMatrix = alpha_RMatrix4_Multiplied(widget->pool, alpha_Camera_GetViewMatrix(widget->camera, 0), projection);
    //alpha_dumpMatrix("CameraViewMatrix is", alpha_Camera_GetViewMatrix(widget->camera, 0));
    //alpha_dumpMatrix("viewMatrix is", viewMatrix);
    alpha_WeetPainter_Draw(widget->cubePainter, viewMatrix);
}
