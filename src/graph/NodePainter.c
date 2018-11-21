#include <stdio.h>
#include "../die.h"
#include "GlyphPainter.h"
#include "NodePainter.h"
#include "NodeAlignment.h"
#include "Label.h"
#include "initialize.h"
#include "TexturePainter.h"
#include "Color.h"
#include "../parsegraph_math.h"
#include "Rect.h"

parsegraph_NodePainter* parsegraph_NodePainter_new(parsegraph_Surface* surface, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    parsegraph_NodePainter* painter = apr_palloc(surface->pool, sizeof(*painter));

    painter->_surface = surface;

    painter->_backgroundColor = parsegraph_BACKGROUND_COLOR;

    painter->_blockPainter = parsegraph_BlockPainter_new(surface, shaders);
    painter->_renderBlocks = 1;

    painter->_extentPainter = parsegraph_BlockPainter_new(surface, shaders);
    painter->_renderExtents = 0;

    painter->_glyphPainter = parsegraph_GlyphPainter_new(glyphAtlas, shaders);

    painter->_renderText = 1;

    painter->_textures = parsegraph_ArrayList_new(surface->pool);

    return painter;
}

float* parsegraph_NodePainter_bounds(parsegraph_NodePainter* painter)
{
    return parsegraph_BlockPainter_bounds(painter->_blockPainter);
}

parsegraph_GlyphPainter* parsegraph_NodePainter_glyphPainter(parsegraph_NodePainter* painter)
{
    return painter->_glyphPainter;
}

void parsegraph_NodePainter_setBackground(parsegraph_NodePainter* painter, float* color)
{
    parsegraph_Color_copy(painter->_backgroundColor, color);
}

float* parsegraph_NodePainter_backgroundColor(parsegraph_NodePainter* painter)
{
    return painter->_backgroundColor;
}

void parsegraph_NodePainter_render(parsegraph_NodePainter* painter, float* world, float scale)
{
    glDisable(GL_CULL_FACE);
    glDisable(GL_DEPTH_TEST);

    glEnable(GL_BLEND);
    glBlendFunc(
        GL_SRC_ALPHA, GL_DST_ALPHA
    );
    glBlendFunc(
        GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    );
    if(painter->_renderBlocks) {
        parsegraph_BlockPainter_render(painter->_blockPainter, world);
    }
    glBlendFunc(
        GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    );

    glBlendFunc(
        GL_SRC_ALPHA, GL_ONE_MINUS_DST_ALPHA
    );
    glBlendFunc(
        GL_DST_ALPHA, GL_SRC_ALPHA
    );
    if(painter->_renderExtents) {
        parsegraph_BlockPainter_render(painter->_extentPainter, world);
    }
    glDisable(GL_CULL_FACE);
    glDisable(GL_DEPTH_TEST);
    glEnable(GL_BLEND);
    glBlendFunc(
        GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    );

    if(painter->_renderText) {
        parsegraph_GlyphPainter_render(painter->_glyphPainter, world, scale);
    }

    for(int i = 0; i < parsegraph_ArrayList_length(painter->_textures); ++i) {
        parsegraph_TexturePainter* t = parsegraph_ArrayList_at(painter->_textures, i);
        parsegraph_TexturePainter_render(t, world);
    }
}

void parsegraph_NodePainter_enableExtentRendering(parsegraph_NodePainter* painter)
{
    painter->_renderExtents = 1;
}

void parsegraph_NodePainter_disableExtentRendering(parsegraph_NodePainter* painter)
{
    painter->_renderExtents = 0;
}

int parsegraph_NodePainter_isExtentRenderingEnabled(parsegraph_NodePainter* painter)
{
    return painter->_renderExtents;
}

void parsegraph_NodePainter_enableBlockRendering(parsegraph_NodePainter* painter)
{
    painter->_renderBlocks = 1;
}

void parsegraph_NodePainter_disableBlockRendering(parsegraph_NodePainter* painter)
{
    painter->_renderBlocks = 0;
}

int parsegraph_NodePainter_isBlockRenderingEnabled(parsegraph_NodePainter* painter)
{
    return painter->_renderBlocks;
};

void parsegraph_NodePainter_enableLineRendering(parsegraph_NodePainter* painter)
{
    painter->_renderLines = 1;
};

void parsegraph_NodePainter_disableLineRendering(parsegraph_NodePainter* painter)
{
    painter->_renderLines = 0;
};

int parsegraph_NodePainter_isLineRenderingEnabled(parsegraph_NodePainter* painter)
{
    return painter->_renderLines;
};

void parsegraph_NodePainter_enableTextRendering(parsegraph_NodePainter* painter)
{
    painter->_renderText = 1;
};

void parsegraph_NodePainter_disableTextRendering(parsegraph_NodePainter* painter)
{
    painter->_renderText = 0;
};

int parsegraph_NodePainter_isTextRenderingEnabled(parsegraph_NodePainter* painter)
{
    return painter->_renderText;
};

void parsegraph_NodePainter_enableSceneRendering(parsegraph_NodePainter* painter)
{
    painter->_renderScenes = 1;
};

void parsegraph_NodePainter_disableSceneRendering(parsegraph_NodePainter* painter)
{
    painter->_renderScenes = 0;
};

int parsegraph_NodePainter_isSceneRenderingEnabled(parsegraph_NodePainter* painter)
{
    return painter->_renderScenes;
}

void parsegraph_NodePainter_clear(parsegraph_NodePainter* painter)
{
    parsegraph_BlockPainter_clear(painter->_blockPainter);
    parsegraph_BlockPainter_clear(painter->_extentPainter);
    parsegraph_GlyphPainter_clear(painter->_glyphPainter);

    for(int i = 0; i < parsegraph_ArrayList_length(painter->_textures); ++i) {
        parsegraph_TexturePainter* t = parsegraph_ArrayList_at(painter->_textures, i);
        parsegraph_TexturePainter_clear(t);
        //gl.deleteTexture(t._texture);
    }
    parsegraph_ArrayList_clear(painter->_textures);
}

static void drawLine(parsegraph_BlockPainter* painter, parsegraph_Node* node, float worldX, float worldY, float userScale, float x1, float y1, float x2, float y2, float thickness)
{
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);

    float cx = x1 + (x2 - x1) / 2;
    float cy = y1 + (y2 - y1) / 2;


    float rx;
    float ry;

    if(x1 == x2) {
        // Vertical line.
        rx = parsegraph_LINE_THICKNESS * userScale * thickness;
        ry = parsegraph_absf(y2 - y1);
    }
    else {
        // Horizontal line.
        rx = parsegraph_absf(x2 - x1);
        ry = parsegraph_LINE_THICKNESS * userScale * thickness;
    }

    float rcolor[4];
    if(parsegraph_Node_isSelected(node)) {
        parsegraph_Color_premultiply(rcolor, parsegraph_SELECTED_LINE_COLOR, style->backgroundColor
        );
    }
    else {
        parsegraph_Color_premultiply(rcolor, parsegraph_LINE_COLOR, style->backgroundColor);
    }
    parsegraph_BlockPainter_setBorderColor(painter, rcolor);
    parsegraph_BlockPainter_setBackgroundColor(painter, rcolor);
    parsegraph_BlockPainter_drawBlock(painter,
        worldX + parsegraph_Node_absoluteX(node) + cx,
        worldY + parsegraph_Node_absoluteY(node) + cy,
        rx,
        ry,
        0,
        0,
        userScale
    );
}

void parsegraph_NodePainter_drawSlider(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, float worldX, float worldY, float userScale)
{
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);
    parsegraph_BlockPainter* painter = nodePainter->_blockPainter;

    float absSize[2];
    parsegraph_Node_absoluteSize(node, absSize);

    // Draw the connecting line into the slider.
    switch(parsegraph_Node_parentDirection(node)) {
    case parsegraph_UPWARD:
        // Draw downward connecting line into the horizontal slider.
        drawLine(painter, node, worldX, worldY, userScale * parsegraph_Node_absoluteScale(node),
            0, -absSize[1] / 2,
            0, 0,
            1
        );

        break;
    case parsegraph_DOWNWARD:
        // Draw upward connecting line into the horizontal slider.
        break;
    }

    // Draw the bar that the slider bud is on.
    drawLine(painter, node, worldX, worldY, userScale * parsegraph_Node_absoluteScale(node),
        -absSize[0] / 2, 0,
        absSize[0] / 2, 0,
        1.5
    );

    // Draw the first and last ticks.

    // If snapping, show the intermediate ticks.

    float sliderWidth = userScale * absSize[0];
    int value = (long)parsegraph_Node_value(node);
    if(value < 0) {
        value = 0.5;
    }
    //if(parsegraph_isVerticalNodeDirection(node.parentDirection())) {
        if(parsegraph_Node_isSelected(node)) {
            float color[4];
            parsegraph_Color_premultiply(color, style->selectedBorderColor,
                parsegraph_Node_backdropColor(node)
            );
            parsegraph_BlockPainter_setBorderColor(painter, color);
            parsegraph_Color_premultiply(color, style->selectedBackgroundColor,
                parsegraph_Node_backdropColor(node)
            );
            parsegraph_BlockPainter_setBackgroundColor(painter, color);
        }
        else {
            float color[4];
            parsegraph_Color_premultiply(color,
                style->borderColor,
                parsegraph_Node_backdropColor(node)
            );
            parsegraph_BlockPainter_setBorderColor(painter, color);

            parsegraph_Color_premultiply(color,
                style->backgroundColor,
                parsegraph_Node_backdropColor(node)
            );
            parsegraph_BlockPainter_setBackgroundColor(painter, color);
        }

        // Draw the slider bud.
        if(value == 0) {
            value = 0;
        }
        float thumbWidth = userScale * absSize[1]/1.5;
        parsegraph_BlockPainter_drawBlock(painter,
            worldX + parsegraph_Node_absoluteX(node) - sliderWidth / 2 + thumbWidth/2 + (sliderWidth - thumbWidth) * value,
            worldY + parsegraph_Node_absoluteY(node),
            userScale * absSize[1]/1.5,
            userScale * absSize[1]/1.5,
            style->borderRoundness/1.5,
            style->borderThickness/1.5,
            userScale * parsegraph_Node_absoluteScale(node)
        );
    //}

    if(!parsegraph_Node_realLabel(node)) {
        return;
    }

    //float fontScale = .7;
//    this._glyphPainter.setFontSize(
//        fontScale * style.fontSize * userScale * node.absoluteScale()
//    );
    parsegraph_GlyphPainter_setColor(nodePainter->_glyphPainter,
        parsegraph_Node_isSelected(node) ?
            style->selectedFontColor :
            style->fontColor
    );

    //this._glyphPainter.setFontSize(
//        fontScale * style.fontSize * userScale * node.absoluteScale()
//    );
    /*if(style->maxLabelChars) {
        parsegraph_GlyphPainter_setWrapWidth(
            nodePainter->_glyphPainter,
            fontScale * style->fontSize * style->maxLabelChars * style->letterWidth * userScale * parsegraph_Node_absoluteScale(node)
        );
    }*/

    parsegraph_Label* l = parsegraph_Node_realLabel(node);
    node->_labelPos[0] = worldX + parsegraph_Node_absoluteX(node) - sliderWidth / 2 + sliderWidth * value - parsegraph_Label_width(l)/2;
    node->_labelPos[1] = worldY + parsegraph_Node_absoluteY(node) - parsegraph_Label_height(l)/2;
    parsegraph_Label_paint(l, nodePainter->_glyphPainter, node->_labelPos[0], node->_labelPos[1], userScale);
}

void parsegraph_NodePainter_drawScene(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, float worldX, float worldY, float userScale, apr_hash_t* shaders)
{
    if(!parsegraph_Node_scene(node)) {
        return;
    }

    float sceneSize[2];
    parsegraph_Node_sizeWithoutPadding(node, sceneSize);
    float sceneX = worldX + parsegraph_Node_absoluteX(node);
    float sceneY = worldY + parsegraph_Node_absoluteY(node);

    // Render and draw the scene texture.
    if(!apr_hash_get(shaders, "framebuffer", APR_HASH_KEY_STRING)) {
        GLuint framebuffer;
        glCreateFramebuffers(1, &framebuffer);
        glBindFramebuffer(GL_FRAMEBUFFER, framebuffer);

        apr_hash_set(shaders, "framebuffer", APR_HASH_KEY_STRING, (void*)(long)framebuffer);

        // Thanks to http://learningwebgl.com/blog/?p=1786
        GLuint t;
        glGenTextures(1, &t);
        glBindTexture(GL_TEXTURE_2D, t);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, sceneSize[0], sceneSize[1], 0, GL_RGBA, GL_UNSIGNED_BYTE, 0);

        GLuint renderbuffer;
        glGenRenderbuffers(1, &renderbuffer);
        glBindRenderbuffer(GL_RENDERBUFFER, renderbuffer);
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT16, sceneSize[0], sceneSize[1]);
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, t, 0);
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, renderbuffer);

        apr_hash_set(shaders, "framebufferTexture", APR_HASH_KEY_STRING, (void*)(long)t);
        apr_hash_set(shaders, "framebufferRenderBuffer", APR_HASH_KEY_STRING, (void*)(long)renderbuffer);
    }
    else {
        glBindTexture(GL_TEXTURE_2D, (long)apr_hash_get(shaders, "framebufferTexture", APR_HASH_KEY_STRING));
        glBindRenderbuffer(GL_RENDERBUFFER, (long)apr_hash_get(shaders, "framebufferRenderBuffer", APR_HASH_KEY_STRING));
        glBindFramebuffer(GL_FRAMEBUFFER, (long)apr_hash_get(shaders, "framebuffer", APR_HASH_KEY_STRING));

        for(int i = 0; i < parsegraph_ArrayList_length(nodePainter->_textures); ++i) {
            parsegraph_TexturePainter* t = parsegraph_ArrayList_at(nodePainter->_textures, i);
            parsegraph_TexturePainter_clear(t);
        }
        parsegraph_ArrayList_clear(nodePainter->_textures);
    }

    parsegraph_die("WHAT?");
    glClearColor(parsegraph_BACKGROUND_COLOR[0],
    parsegraph_BACKGROUND_COLOR[1],
    parsegraph_BACKGROUND_COLOR[2],
    parsegraph_BACKGROUND_COLOR[3]);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glDisable(GL_BLEND);

    parsegraph_Scene* s = parsegraph_Node_scene(node);
    s->paint(s);
    s->render(s, sceneSize[0], sceneSize[1]);

    glBindTexture(GL_TEXTURE_2D, 0);
    glBindRenderbuffer(GL_RENDERBUFFER, 0);
    glBindFramebuffer(GL_FRAMEBUFFER, 0);

    parsegraph_TexturePainter* p = parsegraph_TexturePainter_new(nodePainter->_surface,
        (long)apr_hash_get(shaders, "framebufferTexture", APR_HASH_KEY_STRING), sceneSize[0], sceneSize[1], shaders
    );
    parsegraph_TexturePainter_drawWholeTexture(p,
        sceneX - sceneSize[0]/2, sceneY - sceneSize[1]/2, sceneSize[0], sceneSize[1], userScale * parsegraph_Node_absoluteScale(node)
    );
    parsegraph_ArrayList_push(nodePainter->_textures, p);
}

void parsegraph_NodePainterCounts_reset(parsegraph_NodePainterCounts* counts)
{
    counts->numBlocks = 0;
    counts->numExtents = 0;
}

void parsegraph_NodePainter_initBlockBuffer(parsegraph_NodePainter* nodePainter, parsegraph_NodePainterCounts* counts)
{
    parsegraph_BlockPainter_initBuffer(nodePainter->_blockPainter, counts->numBlocks);
    parsegraph_BlockPainter_initBuffer(nodePainter->_extentPainter, counts->numExtents);
    parsegraph_GlyphPainter_clear(nodePainter->_glyphPainter);
}

struct CountNodeData {
parsegraph_Node* node;
parsegraph_NodePainterCounts* counts;
};

static void countNode(void* d, int direction)
{
    struct CountNodeData* cnd = d;
    if(parsegraph_Node_parentDirection(cnd->node) == direction) {
        return;
    }
    parsegraph_DirectionData* directionData = &cnd->node->_neighbors[direction];
    if(!directionData->node) {
        // Do not count lines unless there is a node.
        return;
    }
    // Count one for the line.
    ++cnd->counts->numBlocks;
}

void parsegraph_NodePainter_countNode(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, parsegraph_NodePainterCounts* counts)
{
    if(parsegraph_NodePainter_isExtentRenderingEnabled(nodePainter) && parsegraph_Node_isRoot(node)) {
        ++counts->numExtents;
    }

    if(parsegraph_Node_type(node) == parsegraph_SLIDER) {
        if(parsegraph_Node_parentDirection(node) == parsegraph_UPWARD) {
            // Only downward direction is currently supported.
            ++counts->numBlocks;
        }
        // One for the joining line.
        ++counts->numBlocks;
        // One for the block.
        ++counts->numBlocks;
    }
    else {
        struct CountNodeData cnd;
        cnd.counts = counts;
        cnd.node = node;
        parsegraph_forEachCardinalNodeDirection(countNode, &cnd);

        // One for the block.
        ++counts->numBlocks;
    }
}

void parsegraph_NodePainter_drawNode(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, apr_hash_t* shaders)
{
    float worldX = 0;
    float worldY = 0;
    float userScale = 1;
    if(parsegraph_NodePainter_isExtentRenderingEnabled(nodePainter) && parsegraph_Node_isRoot(node)) {
        parsegraph_NodePainter_paintExtent(nodePainter, node, worldX, worldY, userScale);
    }

    switch(parsegraph_Node_type(node)) {
    case parsegraph_SLIDER:
        return parsegraph_NodePainter_drawSlider(nodePainter, node, worldX, worldY, userScale);
    case parsegraph_SCENE:
        parsegraph_NodePainter_paintLines(nodePainter, node, worldX, worldY, userScale);
        parsegraph_NodePainter_paintBlock(nodePainter, node, worldX, worldY, userScale);
        return parsegraph_NodePainter_drawScene(nodePainter, node, worldX, worldY, userScale, shaders);
    default:
        parsegraph_NodePainter_paintLines(nodePainter, node, worldX, worldY, userScale);
        parsegraph_NodePainter_paintBlock(nodePainter, node, worldX, worldY, userScale);
    }
}

struct paintLines_drawLineData {
parsegraph_NodePainter* nodePainter;
parsegraph_Node* node;
float worldX;
float worldY;
float userScale;
};

static void paintLines_drawLine(void* data, int direction)
{
    struct paintLines_drawLineData* dld = data;
    parsegraph_Node* node = dld->node;
    parsegraph_NodePainter* nodePainter = dld->nodePainter;
    float worldX = dld->worldX;
    float worldY = dld->worldY;
    float userScale = dld->userScale;

    if(parsegraph_Node_parentDirection(node) == direction) {
        return;
    }
    parsegraph_DirectionData* directionData = &node->_neighbors[direction];
    // Do not draw lines unless there is a node.
    if(!directionData->node) {
        return;
    }

    float selectedColor[4];
    parsegraph_Color_premultiply(selectedColor, parsegraph_SELECTED_LINE_COLOR,
        parsegraph_NodePainter_backgroundColor(nodePainter)
    );
    float color[4];
    parsegraph_Color_premultiply(color, parsegraph_LINE_COLOR,
        parsegraph_NodePainter_backgroundColor(nodePainter)
    );

    parsegraph_BlockPainter* painter = nodePainter->_blockPainter;
    if(parsegraph_Node_isSelected(node) && parsegraph_Node_isSelectedAt(node, direction)) {
        parsegraph_BlockPainter_setBorderColor(painter, selectedColor);
        parsegraph_BlockPainter_setBackgroundColor(painter, selectedColor);
    }
    else {
        // Not selected.
        parsegraph_BlockPainter_setBorderColor(painter, color);
        parsegraph_BlockPainter_setBackgroundColor(painter, color);
    }

    float parentScale = userScale * parsegraph_Node_absoluteScale(node);
    float scale = userScale * parsegraph_Node_absoluteScale(directionData->node);

    if(parsegraph_isVerticalNodeDirection(direction)) {
        float length = parsegraph_nodeDirectionSign(direction)
            * parentScale * (directionData->lineLength + parsegraph_LINE_THICKNESS / 2);
        float thickness = parsegraph_LINE_THICKNESS * scale;
        parsegraph_BlockPainter_drawBlock(painter,
            worldX + parsegraph_Node_absoluteX(node),
            worldY + parsegraph_Node_absoluteY(node) + length / 2,
            thickness,
            parsegraph_absf(length),
            0,
            0,
            scale
        );
    }
    else {
        // Horizontal line.
        float length = parsegraph_nodeDirectionSign(direction)
            * parentScale * (directionData->lineLength + parsegraph_LINE_THICKNESS / 2);
        float thickness = parsegraph_LINE_THICKNESS * scale;
        parsegraph_BlockPainter_drawBlock(painter,
            worldX + parsegraph_Node_absoluteX(node) + length / 2,
            worldY + parsegraph_Node_absoluteY(node),
            parsegraph_absf(length),
            thickness,
            0,
            0,
            scale
        );
    }
}

void parsegraph_NodePainter_paintLines(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, float worldX, float worldY, float userScale)
{
    float bodySize[2];
    parsegraph_Node_size(node, bodySize);

    struct paintLines_drawLineData data;
    data.nodePainter = nodePainter;
    data.node = node;
    data.worldX = worldX;
    data.worldY = worldY;
    data.userScale = userScale;

    parsegraph_forEachCardinalNodeDirection(paintLines_drawLine, &data);
}

struct PaintBoundData {
float rect[4];
parsegraph_BlockPainter* painter;
parsegraph_Node* node;
float worldX;
float worldY;
float userScale;
};

static void paintExtent_paintBound(struct PaintBoundData* pbd)
{
    float* rect = pbd->rect;
    if(isnan(parsegraph_Rect_height(rect)) || isnan(parsegraph_Rect_width(rect))) {
        return;
    }
    parsegraph_BlockPainter_drawBlock(pbd->painter,
        pbd->worldX + parsegraph_Rect_x(rect) + parsegraph_Rect_width(rect) / 2,
        pbd->worldY + parsegraph_Rect_y(rect) + parsegraph_Rect_height(rect) / 2,
        parsegraph_Rect_width(rect),
        parsegraph_Rect_height(rect),
        parsegraph_EXTENT_BORDER_ROUNDEDNESS,
        parsegraph_EXTENT_BORDER_THICKNESS,
        pbd->userScale * parsegraph_Node_absoluteScale(pbd->node)
    );
}

/*static void forEachDownwardExtent(void* data, float length, float size, int index)
{
    struct PaintBoundData* pbd = data;
    float* rect = pbd->rect;
    length *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    size *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    parsegraph_Rect_setWidth(rect, length);
    parsegraph_Rect_setHeight(rect, size);
    paintExtent_paintBound(pbd);
    parsegraph_Rect_setX(rect, parsegraph_Rect_x(rect) + length);
}
*/

/*static void paintExtent_paintDownwardExtent(struct PaintBoundData* pbd)
{
    parsegraph_Extent* extent = parsegraph_Node_extentsAt(pbd->node, parsegraph_DOWNWARD);
    parsegraph_Node* node = pbd->node;

    parsegraph_Rect_set(pbd->rect,
        parsegraph_Node_absoluteX(node) - pbd->userScale * parsegraph_Node_absoluteScale(node) * parsegraph_Node_extentOffsetAt(node, parsegraph_DOWNWARD),
        parsegraph_Node_absoluteY(node),
        0, 0
    );

    parsegraph_Extent_forEach(extent, forEachDownwardExtent, pbd);
}

static void forEachUpwardExtent(void* data, float length, float size, int index)
{
    struct PaintBoundData* pbd = data;
    float* rect = pbd->rect;
    length *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    size *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    parsegraph_Rect_setY(rect, parsegraph_Node_absoluteY(pbd->node) - size);
    parsegraph_Rect_setWidth(rect, length);
    parsegraph_Rect_setHeight(rect, size);
    paintExtent_paintBound(pbd);
    parsegraph_Rect_setX(rect, parsegraph_Rect_x(rect) + length);
}
*/

/*
static void paintExtent_paintUpwardExtent(struct PaintBoundData* pbd)
{
    parsegraph_Extent* extent = parsegraph_Node_extentsAt(pbd->node, parsegraph_UPWARD);
    parsegraph_Node* node = pbd->node;

    parsegraph_Rect_set(pbd->rect,
        parsegraph_Node_absoluteX(node) - pbd->userScale * parsegraph_Node_absoluteScale(node) * parsegraph_Node_extentOffsetAt(node, parsegraph_UPWARD),
        0,
        0, 0
    );

    parsegraph_Extent_forEach(extent, forEachUpwardExtent, pbd);
}
*/

static void forEachBackwardExtent(void* data, float length, float size, int index)
{
    struct PaintBoundData* pbd = data;
    float* rect = pbd->rect;
    length *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    size *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    parsegraph_Rect_setHeight(rect, length);
    parsegraph_Rect_setX(rect, parsegraph_Node_absoluteX(pbd->node) - size);
    parsegraph_Rect_setWidth(rect, size);
    paintExtent_paintBound(pbd);
    parsegraph_Rect_setY(rect, parsegraph_Rect_y(rect) + length);
}

static void paintExtent_paintBackwardExtent(struct PaintBoundData* pbd)
{
    parsegraph_Extent* extent = parsegraph_Node_extentsAt(pbd->node, parsegraph_BACKWARD);
    parsegraph_Rect_set(pbd->rect,
        0,
        parsegraph_Node_absoluteY(pbd->node) - pbd->userScale * parsegraph_Node_absoluteScale(pbd->node) * parsegraph_Node_extentOffsetAt(pbd->node, parsegraph_BACKWARD),
        0, 0
    );

    parsegraph_Extent_forEach(extent, forEachBackwardExtent, pbd);
};

static void forEachForwardExtent(void* data, float length, float size, int index)
{
    struct PaintBoundData* pbd = data;
    float* rect = pbd->rect;
    length *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    size *= pbd->userScale * parsegraph_Node_absoluteScale(pbd->node);
    parsegraph_Rect_setHeight(rect, length);
    parsegraph_Rect_setWidth(rect, size);
    paintExtent_paintBound(pbd);
    parsegraph_Rect_setY(rect, parsegraph_Rect_y(rect) + length);
}

static void paintExtent_paintForwardExtent(struct PaintBoundData* pbd)
{
    parsegraph_Extent* extent = parsegraph_Node_extentsAt(pbd->node, parsegraph_FORWARD);
    parsegraph_Rect_set(pbd->rect,
        parsegraph_Node_absoluteX(pbd->node),
        parsegraph_Node_absoluteY(pbd->node) - parsegraph_Node_extentOffsetAt(pbd->node, parsegraph_FORWARD) * pbd->userScale * parsegraph_Node_absoluteScale(pbd->node),
        0, 0
    );

    parsegraph_Extent_forEach(extent, forEachForwardExtent, pbd);
}

void parsegraph_NodePainter_paintExtent(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, float worldX, float worldY, float userScale)
{
    parsegraph_BlockPainter* painter = nodePainter->_extentPainter;
    parsegraph_BlockPainter_setBorderColor(painter,
        parsegraph_EXTENT_BORDER_COLOR
    );
    parsegraph_BlockPainter_setBackgroundColor(painter,
        parsegraph_EXTENT_BACKGROUND_COLOR
    );

    struct PaintBoundData pbd;
    parsegraph_Rect_set(pbd.rect, 0, 0, 0, 0);
    pbd.node = node;
    pbd.painter = painter;
    pbd.worldX = worldX;
    pbd.worldY = worldY;
    pbd.userScale = userScale;

    //paintExtent_paintDownwardExtent(&pbd);
    //paintExtent_paintUpwardExtent(&pbd);
    paintExtent_paintBackwardExtent(&pbd);
    paintExtent_paintForwardExtent(&pbd);
}

void parsegraph_NodePainter_paintBlock(parsegraph_NodePainter* nodePainter, parsegraph_Node* node, float worldX, float worldY, float userScale)
{
    parsegraph_Style* style = parsegraph_Node_blockStyle(node);
    parsegraph_BlockPainter* painter = nodePainter->_blockPainter;

    // Set colors if selected.
    if(parsegraph_Node_isSelected(node)) {
        float c[4];
        parsegraph_Color_premultiply(c, style->selectedBorderColor, parsegraph_Node_backdropColor(node));
        parsegraph_BlockPainter_setBorderColor(painter, c);
        parsegraph_Color_premultiply(c, style->selectedBackgroundColor, parsegraph_Node_backdropColor(node));
        parsegraph_BlockPainter_setBackgroundColor(painter, c);
    } else {
        float c[4];
        parsegraph_Color_premultiply(c, style->borderColor, parsegraph_Node_backdropColor(node));
        parsegraph_BlockPainter_setBorderColor(painter, c);
        parsegraph_Color_premultiply(c, style->backgroundColor, parsegraph_Node_backdropColor(node));
        parsegraph_BlockPainter_setBackgroundColor(painter, c);
    }

    // Draw the block.
    float size[2];
    parsegraph_Node_absoluteSize(node, size);
    size[0] *= userScale;
    size[1] *= userScale;
    //fprintf(stderr, "Painting node at world %f, %f, %f\nNode at %f, %f\n", worldX, worldY, userScale,
        //userScale * parsegraph_Node_absoluteX(node),
        //userScale * parsegraph_Node_absoluteY(node)
    //);
    parsegraph_BlockPainter_drawBlock(painter,
        worldX + userScale * parsegraph_Node_absoluteX(node),
        worldY + userScale * parsegraph_Node_absoluteY(node),
        size[0],
        size[1],
        style->borderRoundness,
        style->borderThickness,
        parsegraph_Node_absoluteScale(node) * userScale
    );

    // Draw the label.
    parsegraph_Label* label = node->_realLabel;
    if(!label) {
        return;
    }
    float fontScale = (style->fontSize * userScale * parsegraph_Node_absoluteScale(node)) / parsegraph_Label_fontSize(label);
    float labelX, labelY;
    parsegraph_GlyphPainter_setColor(nodePainter->_glyphPainter,
        parsegraph_Node_isSelected(node) ?
            style->selectedFontColor :
            style->fontColor
    );
    if(parsegraph_Node_hasNode(node, parsegraph_INWARD)) {
        parsegraph_Node* nestedNode = parsegraph_Node_nodeAt(node, parsegraph_INWARD);
        float nestedSize[2];
        parsegraph_Node_extentSize(nestedNode, nestedSize);
        float nodeSize[2];
        parsegraph_Node_sizeWithoutPadding(node, nodeSize);
        if(parsegraph_Node_nodeAlignmentMode(node, parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            labelX = worldX + userScale * parsegraph_Node_absoluteX(node) - fontScale * parsegraph_Label_width(label)/2;
            labelY = worldY + userScale * parsegraph_Node_absoluteY(node) - userScale * parsegraph_Node_absoluteScale(node) * nodeSize[1]/2;
        }
        else {
            // Align horizontal.
            labelX = worldX + userScale * parsegraph_Node_absoluteX(node) - userScale * parsegraph_Node_absoluteScale(node) * nodeSize[0]/2;
            labelY = worldY + userScale * parsegraph_Node_absoluteY(node) - fontScale * parsegraph_Label_height(label)/2;
        }
    }
    else {
        labelX = worldX + userScale * parsegraph_Node_absoluteX(node) - fontScale * parsegraph_Label_width(label)/2;
        labelY = worldY + userScale * parsegraph_Node_absoluteY(node) - fontScale * parsegraph_Label_height(label)/2;
    }
    node->_labelPos[0] = labelX;
    node->_labelPos[1] = labelY;
    node->_labelPos[2] = fontScale;
    parsegraph_Label_paint(label, nodePainter->_glyphPainter, labelX, labelY, fontScale);
}
