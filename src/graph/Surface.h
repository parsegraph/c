#ifndef parsegraph_Surface_INCLUDED
#define parsegraph_Surface_INCLUDED

struct apr_pool_t;
struct parsegraph_SurfacePainter {
void(*painter)(void*, void*);
void* data;
struct parsegraph_SurfacePainter* next;
};
typedef struct parsegraph_SurfacePainter parsegraph_SurfacePainter;

struct parsegraph_SurfaceRenderer {
void(*renderer)(void*, void*);
void* data;
struct parsegraph_SurfaceRenderer* next;
};
typedef struct parsegraph_SurfaceRenderer parsegraph_SurfaceRenderer;

struct parsegraph_Surface {
void* peer;
struct apr_pool_t* pool;
float backgroundColor[4];
int pendingRender;
int needsRepaint;
struct parsegraph_SurfacePainter* first_painter;
struct parsegraph_SurfacePainter* last_painter;
struct parsegraph_SurfaceRenderer *first_renderer;
struct parsegraph_SurfaceRenderer *last_renderer;
};
typedef struct parsegraph_Surface parsegraph_Surface;

parsegraph_Surface* parsegraph_Surface_new(void*);
void parsegraph_Surface_destroy(parsegraph_Surface* surface);

void parsegraph_Surface_addPainter(parsegraph_Surface* surface, void(*painter)(void*, void*), void* data);
void parsegraph_Surface_addRenderer(parsegraph_Surface* surface, void(*renderer)(void*, void*), void* data);
void parsegraph_Surface_paint(parsegraph_Surface* surface, void* arg);
void parsegraph_Surface_setBackground(parsegraph_Surface* surface, float* bg);
float* parsegraph_Surface_backgroundColor(parsegraph_Surface* surface);
int parsegraph_Surface_canProject(parsegraph_Surface* surface);
void parsegraph_Surface_render(parsegraph_Surface* surface, void* arg);
void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface);

#endif // parsegraph_Surface_INCLUDED
