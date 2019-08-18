#ifndef parsegraph_CameraBox_INCLUDED
#define parsegraph_CameraBox_INCLUDED

#include <apr_hash.h>
#include <unicode/ustring.h>

struct parsegraph_Graph;
typedef struct parsegraph_Graph parsegraph_Graph;

struct parsegraph_CameraBoxPainter;
typedef struct parsegraph_CameraBoxPainter parsegraph_CameraBoxPainter;

struct parsegraph_Camera;
typedef struct parsegraph_Camera parsegraph_Camera;

struct parsegraph_GlyphAtlas;
typedef struct parsegraph_GlyphAtlas parsegraph_GlyphAtlas;

struct parsegraph_CameraBox {
apr_pool_t* pool;
int _showCameraBoxes;
int _cameraBoxDirty;
apr_hash_t* _cameraBoxes;
parsegraph_CameraBoxPainter* _cameraBoxPainter;
parsegraph_Graph* _graph;
parsegraph_GlyphAtlas* _glyphAtlas;
apr_hash_t* _shaders;
};
typedef struct parsegraph_CameraBox parsegraph_CameraBox;

struct parsegraph_CameraBoxData {
float width;
float height;
float scale;
float cameraX;
float cameraY;
};

parsegraph_CameraBox* parsegraph_CameraBox_new(parsegraph_Graph* graph);
int parsegraph_CameraBox_needsRepaint(parsegraph_CameraBox* cbox);
parsegraph_GlyphAtlas* parsegraph_CameraBox_glyphAtlas(parsegraph_CameraBox* cbox);
void parsegraph_CameraBox_prepare(parsegraph_CameraBox* cbox, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_CameraBox_setCamera(parsegraph_CameraBox* cbox, UChar* name, int len, parsegraph_Camera* camera);
void parsegraph_CameraBox_removeCamera(parsegraph_CameraBox* cbox, UChar* name, int len);
void parsegraph_CameraBox_destroy(parsegraph_CameraBox* cbox);
void parsegraph_CameraBox_paint(parsegraph_CameraBox* cbox);
void parsegraph_CameraBox_render(parsegraph_CameraBox* cbox, float* world, float scale);
void parsegraph_CameraBox_scheduleRepaint(parsegraph_CameraBox* cbox);
apr_hash_t* parsegraph_CameraBox_shaders(parsegraph_CameraBox* cbox);

#endif // parsegraph_CameraBox_INCLUDED
