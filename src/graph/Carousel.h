#ifndef parsegraph_Carousel_INCLUDED
#define parsegraph_Carousel_INCLUDED

#include <apr_hash.h>
#include <time.h>

#include "../ArrayList.h"
#include "GlyphAtlas.h"
#include "FanPainter.h"
#include "Camera.h"
#include "Node.h"

struct parsegraph_CarouselCallback {
void(*callback)(void*);
void* thisArg;
};

struct parsegraph_CarouselPlot {
parsegraph_Node* node;
float x;
float y;
float scale;
};
typedef struct parsegraph_CarouselPlot parsegraph_CarouselPlot;

struct parsegraph_Carousel {
apr_pool_t* pool;
float _backgroundColor[4];
parsegraph_Camera* _camera;

parsegraph_ArrayList* _carouselPlots;
parsegraph_ArrayList* _carouselCallbacks;

parsegraph_CarouselPlot* _selectedCarouselPlot;
int _selectedCarouselPlotIndex;

float _carouselX;
float _carouselY;
float _carouselSize;
int _showCarousel;
float _showScale;
int _updateRepeatedly;
int _carouselPaintingDirty;
void(*onScheduleRepaint)(void*);
void* onScheduleRepaintThisArg;
parsegraph_GlyphAtlas* _glyphAtlas;
apr_hash_t* _shaders;
struct timespec _showTime;
struct timespec _hideTime;
parsegraph_FanPainter* _fanPainter;
parsegraph_Node* _selectedPlot;
};

typedef struct parsegraph_Carousel parsegraph_Carousel;

parsegraph_Carousel* parsegraph_Carousel_new(parsegraph_Camera* camera, float* backgroundColor);
parsegraph_Camera* parsegraph_Carousel_camera(parsegraph_Carousel* carousel);
void parsegraph_Carousel_destroy(parsegraph_Carousel* carousel);
int parsegraph_Carousel_needsRepaint(parsegraph_Carousel* carousel);
void parsegraph_Carousel_prepare(parsegraph_Carousel* carousel, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_Carousel_moveCarousel(parsegraph_Carousel* carousel, float worldX, float worldY);
void parsegraph_Carousel_setCarouselSize(parsegraph_Carousel* carousel, float size);
void parsegraph_Carousel_showCarousel(parsegraph_Carousel* carousel);
int parsegraph_Carousel_isCarouselShown(parsegraph_Carousel* carousel);
int parsegraph_Carousel_isShown(parsegraph_Carousel* carousel);
void parsegraph_Carousel_hideCarousel(parsegraph_Carousel* carousel);
void parsegraph_Carousel_addToCarousel(parsegraph_Carousel* carousel, parsegraph_Node* node, void(*callback)(void*), void* thisArg);
void parsegraph_Carousel_clearCarousel(parsegraph_Carousel* carousel);
int parsegraph_Carousel_removeFromCarousel(parsegraph_Carousel* carousel, parsegraph_Node* node);
int parsegraph_Carousel_updateRepeatedly(parsegraph_Carousel* carousel);
int parsegraph_Carousel_clickCarousel(parsegraph_Carousel* carousel, float x, float y, int asDown);
int parsegraph_Carousel_mouseOverCarousel(parsegraph_Carousel* carousel, float x, float y);
float parsegraph_Carousel_showScale(parsegraph_Carousel* carousel);
void parsegraph_Carousel_arrangeCarousel(parsegraph_Carousel* carousel);
void parsegraph_Carousel_setOnScheduleRepaint(parsegraph_Carousel* carousel, void(*func)(void*), void* thisArg);
void parsegraph_Carousel_scheduleCarouselRepaint(parsegraph_Carousel* carousel);
parsegraph_GlyphAtlas* parsegraph_Carousel_glyphAtlas(parsegraph_Carousel* carousel);
float* parsegraph_Carousel_backgroundColor(parsegraph_Carousel* carousel);
void parsegraph_Carousel_setBackgroundColor(parsegraph_Carousel* carousel, float* backgroundColor);
void parsegraph_Carousel_paint(parsegraph_Carousel* carousel);
void parsegraph_Carousel_render(parsegraph_Carousel* carousel, float* world);

#endif // parsegraph_Carousel_INCLUDED
