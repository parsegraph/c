#ifndef alpha_WeetCubeWidget_INCLUDED
#define alpha_WeetCubeWidget_INCLUDED

#include <apr_pools.h>
#include "../alpha/WeetPainter.h"
#include "../alpha/Input.h"
#include "../alpha/Cam.h"

struct alpha_WeetCubeWidget {
    apr_pool_t* pool;
    struct alpha_WeetPainter* cubePainter;
    float rotq;
    float _elapsed;
    int _frozen;
    int _xMax;
    int _yMax;
    int _zMax;
    //void* surface;
    struct alpha_Camera* camera;
    alpha_Input* input;

    void(*_listener)(void*);
    void* _listenerThisArg;
};

struct parsegraph_Surface;
typedef struct parsegraph_Surface parsegraph_Surface;

struct alpha_WeetCubeWidget* alpha_WeetCubeWidget_new(parsegraph_Surface* surface);
void alpha_WeetCubeWidget_Tick(struct alpha_WeetCubeWidget* widget, float elapsed, int frozen);
void alpha_WeetCubeWidget_setMax(struct alpha_WeetCubeWidget* widget, float max);
void alpha_WeetCubeWidget_setXMax(struct alpha_WeetCubeWidget* widget, float xMax);
void alpha_WeetCubeWidget_setYMax(struct alpha_WeetCubeWidget* widget, float yMax);
void alpha_WeetCubeWidget_setZMax(struct alpha_WeetCubeWidget* widget, float zMax);
void alpha_WeetCubeWidget_setRotq(struct alpha_WeetCubeWidget* widget, float rotq);
void alpha_WeetCubeWidget_paint(struct alpha_WeetCubeWidget* widget);
void alpha_WeetCubeWidget_setUpdateListener(struct alpha_WeetCubeWidget* widget, void(*listener)(void*), void* listenerThisArg);
void alpha_WeetCubeWidget_render(struct alpha_WeetCubeWidget* widget, int renderWidth, int renderHeight);

#endif // alpha_WeetCubeWidget_INCLUDED
