#include "CameraBoxPainter.h"
#include "BlockPainter.h"
#include "Surface.h"
#include "GlyphAtlas.h"
#include "Color.h"
#include "Rect.h"
#include "Label.h"

parsegraph_CameraBoxPainter* parsegraph_CameraBoxPainter_new(parsegraph_Surface* surface, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    apr_pool_t* pool = surface->pool;
    parsegraph_CameraBoxPainter* painter = apr_palloc(pool, sizeof(*painter));
    painter->_pool = pool;
    painter->_blockPainter = parsegraph_BlockPainter_new(pool, shaders);
    painter->_glyphPainter = parsegraph_GlyphPainter_new(pool, glyphAtlas, shaders);

    painter->_glyphAtlas = glyphAtlas;
    parsegraph_Color_SetRGBA(painter->_borderColor, 1, 1, 1, 0.1);
    parsegraph_Color_SetRGBA(painter->_backgroundColor, 1, 1, 1, 0.1);
    parsegraph_Color_SetRGBA(painter->_textColor, 1, 1, 1, 1);
    painter->_fontSize = 24;

    return painter;
}

void parsegraph_CameraBoxPainter_destroy(parsegraph_CameraBoxPainter* painter)
{
    parsegraph_GlyphPainter_destroy(painter->_glyphPainter);
    parsegraph_BlockPainter_destroy(painter->_blockPainter);
}

void parsegraph_CameraBoxPainter_clear(parsegraph_CameraBoxPainter* painter)
{
    parsegraph_GlyphPainter_clear(painter->_glyphPainter);
    parsegraph_BlockPainter_clear(painter->_blockPainter);
}

void parsegraph_CameraBoxPainter_drawBox(parsegraph_CameraBoxPainter* painter, const UChar* name, int len, float* rect, float scale)
{
    parsegraph_BlockPainter* blockPainter = painter->_blockPainter;
    parsegraph_BlockPainter_setBorderColor(blockPainter, painter->_borderColor);
    parsegraph_BlockPainter_setBackgroundColor(blockPainter, painter->_backgroundColor);
    parsegraph_BlockPainter_drawBlock(blockPainter,
        parsegraph_Rect_x(rect),
        parsegraph_Rect_y(rect),
        parsegraph_Rect_width(rect),
        parsegraph_Rect_height(rect),
        0.01,
        .1,
        scale
    );

    parsegraph_Label* label = parsegraph_Label_new(painter->_pool, painter->_glyphAtlas);
    parsegraph_Label_setText(label, name, len);
    float lw = parsegraph_Label_width(label)*(painter->_fontSize/parsegraph_GlyphAtlas_fontSize(painter->_glyphAtlas))/scale;

    parsegraph_Label_paint(label, painter->_glyphPainter,
        parsegraph_Rect_x(rect) - lw/2,
        parsegraph_Rect_y(rect) - parsegraph_Rect_height(rect)/2,
        (painter->_fontSize/parsegraph_GlyphAtlas_fontSize(painter->_glyphAtlas))/scale
    );

    parsegraph_Label_destroy(label);
}

void parsegraph_CameraBoxPainter_render(parsegraph_CameraBoxPainter* painter, float* world, float scale)
{
    parsegraph_BlockPainter_render(painter->_blockPainter, world, scale);
    parsegraph_GlyphPainter_render(painter->_glyphPainter, world, scale);
}
