#include "CameraBox.h"
#include "Graph.h"
#include "Camera.h"
#include "CameraBoxPainter.h"
#include "gl.h"
#include "BlockPainter.h"
#include "Rect.h"

parsegraph_CameraBox* parsegraph_CameraBox_new(parsegraph_Graph* graph)
{
    apr_pool_t* pool = parsegraph_Graph_surface(graph)->pool;
    parsegraph_CameraBox* cbox = apr_palloc(pool, sizeof(*cbox));

    // Camera boxes.
    cbox->_showCameraBoxes = 1;
    cbox->_cameraBoxDirty = 1;
    cbox->_cameraBoxes = apr_hash_make(pool);
    cbox->_cameraBoxPainter = 0;

    cbox->_graph = graph;
    cbox->_glyphAtlas = 0;
    cbox->_shaders = 0;

    return cbox;
}

int parsegraph_CameraBox_needsRepaint(parsegraph_CameraBox* cbox)
{
    return cbox->_cameraBoxDirty;
}

parsegraph_GlyphAtlas* parsegraph_CameraBox_glyphAtlas(parsegraph_CameraBox* cbox)
{
    return cbox->_glyphAtlas;
}

void parsegraph_CameraBox_prepare(parsegraph_CameraBox* cbox, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    cbox->_glyphAtlas = glyphAtlas;
    cbox->_shaders = shaders;
}

void parsegraph_CameraBox_setCamera(parsegraph_CameraBox* cbox, UChar* name, int len, parsegraph_Camera* camera)
{
    apr_hash_set(cbox->_cameraBoxes, name, sizeof(UChar)*len, camera);
    cbox->_cameraBoxDirty = 1;
    parsegraph_Graph_scheduleRepaint(cbox->_graph);
};

void parsegraph_CameraBox_removeCamera(parsegraph_CameraBox* cbox, UChar* name, int len)
{
    apr_hash_set(cbox->_cameraBoxes, name, sizeof(UChar)*len, 0);
    cbox->_cameraBoxDirty = 1;
    parsegraph_CameraBox_scheduleRepaint(cbox);
};

void parsegraph_CameraBox_scheduleRepaint(parsegraph_CameraBox* cbox)
{
    parsegraph_Graph_scheduleRepaint(cbox->_graph);
}

void parsegraph_CameraBox_paint(parsegraph_CameraBox* cbox)
{
    if(cbox->_showCameraBoxes && cbox->_cameraBoxDirty) {
        if(!cbox->_cameraBoxPainter) {
            cbox->_cameraBoxPainter = parsegraph_CameraBoxPainter_new(
                parsegraph_CameraBox_glyphAtlas(cbox),
                parsegraph_CameraBox_shaders(cbox)
            );
        }
        else {
            parsegraph_CameraBoxPainter_clear(cbox->_cameraBoxPainter);
        }
        parsegraph_BlockPainter_initBuffer(cbox->_cameraBoxPainter->_blockPainter, apr_hash_count(cbox->_cameraBoxes));
        apr_pool_t* pool = parsegraph_Graph_surface(cbox->_graph)->pool;
        float rect[4];
        parsegraph_Rect_set(rect, 0, 0, 0, 0);
        apr_hash_index_t* hi = apr_hash_first(pool, cbox->_cameraBoxes);
        for(; hi; hi = apr_hash_next(hi)) {
            const UChar* name = apr_hash_this_key(hi);
            struct parsegraph_CameraBoxData* cameraBox = apr_hash_this_val(hi);
            float hw = cameraBox->width/cameraBox->scale;
            float hh = cameraBox->height/cameraBox->scale;
            parsegraph_Rect_setX(rect, -cameraBox->cameraX + hw/2);
            parsegraph_Rect_setY(rect, -cameraBox->cameraY + hh/2);
            parsegraph_Rect_setWidth(rect, cameraBox->width/cameraBox->scale);
            parsegraph_Rect_setHeight(rect, cameraBox->height/cameraBox->scale);
            parsegraph_CameraBoxPainter_drawBox(cbox->_cameraBoxPainter, name, u_strlen(name), rect, cameraBox->scale);
        }
        cbox->_cameraBoxDirty = 0;
    }
}

void parsegraph_CameraBox_render(parsegraph_CameraBox* cbox, float* world)
{
    if(cbox->_showCameraBoxes && !cbox->_cameraBoxDirty) {
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_DST_ALPHA);
        parsegraph_CameraBoxPainter_render(cbox->_cameraBoxPainter, world);
    }
}

apr_hash_t* parsegraph_CameraBox_shaders(parsegraph_CameraBox* cbox)
{
    return cbox->_shaders;
}

