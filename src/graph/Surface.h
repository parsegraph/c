#ifndef parsegraph_Surface_INCLUDED
#define parsegraph_Surface_INCLUDED

struct parsegraph_SurfacePainter {
void(*painter)(void*, void*);
void* data;
struct parsegraph_SurfacePainter* next;
};

struct parsegraph_SurfaceRenderer {
void(*renderer)(void*, void*);
void* data;
struct parsegraph_SurfaceRenderer* next;
};

struct parsegraph_Surface {
float* backgroundColor;
int pendingRender;
int needsRepaint;
struct parsegraph_SurfacePainter* first_painter;
struct parsegraph_SurfacePainter* last_painter;
struct parsegraph_SurfaceRenderer *first_renderer;
struct parsegraph_SurfaceRenderer *last_renderer;
};
typedef parsegraph_Surface parsegraph_Surface;

parsegraph_Surface* parsegraph_Surface_new(apr_pool_t* pool);
void parsegraph_Surface_destroy(parsegraph_Surface* surface);

void parsegraph_Surface_addPainter(parsegraph_Surface* surface, void(*painter)(void*, void*), void* data);
void parsegraph_Surface_addRenderer(parsegraph_Surface* surface, void(*renderer)(void*, void*), void* data);
void parsegraph_Surface_paint(parsegraph_Surface* surface, void* arg);
void parsegraph_Surface_setBackground(parsegraph_Surface* surface, float* bg);
float* parsegraph_Surface_backgroundColor(parsegraph_Surface* surface);
int parsegraph_Surface_canProject(parsegraph_Surface* surface);
void parsegraph_Surface_render(parsegraph_Surface* surface);
void parsegraph_Surface_resize(parsegraph_Surface* surface, int w, int h);

#endif // parsegraph_Surface_INCLUDED
