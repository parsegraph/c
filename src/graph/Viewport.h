#ifndef parsegraph_Viewport_INCLUDED
#define parsegraph_Viewport_INCLUDED

#include "Surface.h"
#include "GlyphAtlas.h"
#include "World.h"
#include "CameraBox.h"
#include "Camera.h"
#include "Carousel.h"
#include "AudioKeyboard.h"

struct parsegraph_Input;
typedef struct parsegraph_Input parsegraph_Input;

struct parsegraph_Viewport {
apr_pool_t* pool;
parsegraph_Surface* _surface;
parsegraph_GlyphAtlas* _glyphAtlas;
parsegraph_World* _world;
parsegraph_CameraBox* _cameraBox;
parsegraph_Camera* _camera;
parsegraph_Carousel* _carousel;
parsegraph_Input* _input;
parsegraph_AudioKeyboard* _piano;
apr_hash_t* _shaders;
void(*onScheduleRepaint)(void*);
void* onScheduleRepaintThisArg;
};
typedef struct parsegraph_Viewport parsegraph_Viewport;

parsegraph_Viewport* parsegraph_Viewport_new(parsegraph_Surface* surface);
apr_hash_t* parsegraph_Viewport_shaders(parsegraph_Viewport* graph);
parsegraph_CameraBox* parsegraph_Viewport_cameraBox(parsegraph_Viewport* graph);
parsegraph_World* parsegraph_Viewport_world(parsegraph_Viewport* graph);
parsegraph_Carousel* parsegraph_Viewport_carousel(parsegraph_Viewport* graph);
parsegraph_Camera* parsegraph_Viewport_camera(parsegraph_Viewport* graph);
parsegraph_Surface* parsegraph_Viewport_surface(parsegraph_Viewport* graph);
parsegraph_Input* parsegraph_Viewport_input(parsegraph_Viewport* graph);
void parsegraph_Viewport_scheduleRepaint(parsegraph_Viewport* graph);
void parsegraph_Viewport_setOnScheduleRepaint(parsegraph_Viewport* graph, void(*func)(void*), void* thisArg);
int parsegraph_Viewport_needsRepaint(parsegraph_Viewport* graph);
parsegraph_GlyphAtlas* parsegraph_Viewport_glyphAtlas(parsegraph_Viewport* graph);
void parsegraph_Viewport_setGlyphAtlas(parsegraph_Viewport* graph, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Viewport_plot(parsegraph_Viewport* graph, void* arg);
int parsegraph_Viewport_paint(parsegraph_Viewport* graph, int timeout);
void parsegraph_Viewport_render(parsegraph_Viewport* graph);
void parsegraph_Viewport_destroy(parsegraph_Viewport* graph);

#endif // parsegraph_Graph_INCLUDED
