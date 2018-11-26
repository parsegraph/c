#ifndef parsegraph_Graph_INCLUDED
#define parsegraph_Graph_INCLUDED

#include "Surface.h"
#include "GlyphAtlas.h"
#include "World.h"
#include "CameraBox.h"
#include "Camera.h"
#include "Carousel.h"
#include "AudioKeyboard.h"

struct parsegraph_Input;
typedef struct parsegraph_Input parsegraph_Input;

struct parsegraph_Graph {
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
typedef struct parsegraph_Graph parsegraph_Graph;

parsegraph_Graph* parsegraph_Graph_new(parsegraph_Surface* surface);
apr_hash_t* parsegraph_Graph_shaders(parsegraph_Graph* graph);
parsegraph_CameraBox* parsegraph_Graph_cameraBox(parsegraph_Graph* graph);
parsegraph_World* parsegraph_Graph_world(parsegraph_Graph* graph);
parsegraph_Carousel* parsegraph_Graph_carousel(parsegraph_Graph* graph);
parsegraph_Camera* parsegraph_Graph_camera(parsegraph_Graph* graph);
parsegraph_Surface* parsegraph_Graph_surface(parsegraph_Graph* graph);
parsegraph_Input* parsegraph_Graph_input(parsegraph_Graph* graph);
void parsegraph_Graph_scheduleRepaint(parsegraph_Graph* graph);
void parsegraph_Graph_setOnScheduleRepaint(parsegraph_Graph* graph, void(*func)(void*), void* thisArg);
int parsegraph_Graph_needsRepaint(parsegraph_Graph* graph);
parsegraph_GlyphAtlas* parsegraph_Graph_glyphAtlas(parsegraph_Graph* graph);
void parsegraph_Graph_setGlyphAtlas(parsegraph_Graph* graph, parsegraph_GlyphAtlas* glyphAtlas);
void parsegraph_Graph_plot(parsegraph_Graph* graph, void* arg);
int parsegraph_Graph_paint(parsegraph_Graph* graph, int timeout);
void parsegraph_Graph_render(parsegraph_Graph* graph);
void parsegraph_Graph_destroy(parsegraph_Graph* graph);

#endif // parsegraph_Graph_INCLUDED
