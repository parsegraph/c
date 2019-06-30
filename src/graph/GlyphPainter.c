#include "GlyphPainter.h"
#include "../die.h"
#include "log.h"
#include "../gl.h"
#include "Color.h"
#include "GlyphAtlas.h"

#include <stdio.h>
#include <stdlib.h>

// TODO Test lots of glyphs; set a limit if one can be found to exist
// TODO Add caret
// TODO Add runs of selected text

static const char* parsegraph_GlyphPainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec4 a_color;\n"
"attribute vec4 a_backgroundColor;\n"
"attribute vec2 a_texCoord;\n"
"\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " vec4 fragmentColor;\n"
"varying " HIGHP " vec4 backgroundColor;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
   "fragmentColor = a_color;\n"
   "backgroundColor = a_backgroundColor;\n"
   "texCoord = a_texCoord;\n"
"}\n";

static const char* parsegraph_GlyphPainter_FragmentShader =
"uniform sampler2D u_glyphTexture;\n"
"varying " HIGHP " vec4 fragmentColor;\n"
"varying " HIGHP " vec4 backgroundColor;\n"
"varying " HIGHP " vec2 texCoord;\n"
"\n"
"void main() {\n"
    HIGHP " float opacity = texture2D(u_glyphTexture, texCoord.st).r;\n"
    "if(backgroundColor.a == 0.0) {\n"
        "gl_FragColor = vec4(fragmentColor.rgb, fragmentColor.a * opacity);\n"
    "}\n"
    "else {\n"
        "gl_FragColor = mix(backgroundColor, fragmentColor, opacity);\n"
    "}\n"
    //"gl_FragColor = vec4(texture2D(u_glyphTexture, texCoord.st).rgb, 1.0);\n"
"}\n";

static const char* shaderName = "parsegraph_GlyphPainter";
int parsegraph_GlyphPainter_COUNT = 0;

parsegraph_GlyphPainter* parsegraph_GlyphPainter_new(apr_pool_t* ppool, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    if(!glyphAtlas) {
        parsegraph_die("Glyph atlas must be provided.");
    }
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create GlyphPainter memory pool.");
    }
    parsegraph_GlyphPainter* painter = apr_palloc(pool, sizeof(*painter));
    painter->pool = pool;

    painter->_glyphAtlas = glyphAtlas;
    painter->_id = ++parsegraph_GlyphPainter_COUNT;

    // Compile the shader program.
    painter->_textProgram = parsegraph_compileProgram(shaders, shaderName,
        parsegraph_GlyphPainter_VertexShader,
        parsegraph_GlyphPainter_FragmentShader
    );

    // Prepare attribute buffers.
    painter->_textBuffer = parsegraph_pagingbuffer_new(pool, painter->_textProgram);
    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->_textBuffer, "a_position", 2, GL_STATIC_DRAW);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->_textBuffer, "a_color", 4, GL_STATIC_DRAW);
    painter->a_backgroundColor = parsegraph_pagingbuffer_defineAttrib(painter->_textBuffer, "a_backgroundColor", 4, GL_STATIC_DRAW);
    painter->a_texCoord = parsegraph_pagingbuffer_defineAttrib(painter->_textBuffer, "a_texCoord", 2, GL_STATIC_DRAW);
    painter->_textBuffers = apr_hash_make(pool);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(
        painter->_textProgram, "u_world"
    );
    painter->u_glyphTexture = glGetUniformLocation(
        painter->_textProgram, "u_glyphTexture"
    );

    painter->_maxSize = 0;

    parsegraph_Color_SetRGBA(painter->_color, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(painter->_backgroundColor, 0,0,0,0);

    return painter;
}

float* parsegraph_GlyphPainter_color(parsegraph_GlyphPainter* glyphPainter)
{
    return glyphPainter->_color;
}

void parsegraph_GlyphPainter_setColor(parsegraph_GlyphPainter* glyphPainter, float* color)
{
    parsegraph_Color_copy(glyphPainter->_color, color);
}

float* parsegraph_GlyphPainter_backgroundColor(parsegraph_GlyphPainter* glyphPainter)
{
    return glyphPainter->_backgroundColor;
}

void parsegraph_GlyphPainter_setBackgroundColor(parsegraph_GlyphPainter* glyphPainter, float* color)
{
    parsegraph_Color_copy(glyphPainter->_backgroundColor, color);
}

float parsegraph_GlyphPainter_fontSize(parsegraph_GlyphPainter* glyphPainter)
{
    return parsegraph_GlyphAtlas_fontSize(glyphPainter->_glyphAtlas);
}

parsegraph_GlyphAtlas* parsegraph_GlyphPainter_glyphAtlas(parsegraph_GlyphPainter* glyphPainter)
{
    return glyphPainter->_glyphAtlas;
}

parsegraph_GlyphRenderData* parsegraph_GlyphRenderData_new(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData)
{
    parsegraph_GlyphRenderData* grd = apr_palloc(painter->pool, sizeof(*grd));
    grd->painter = painter;
    grd->glyphData = glyphData;
    return grd;
}

static void renderText(void* glyphDataPtr, int numIndices)
{
    parsegraph_GlyphRenderData* grd = glyphDataPtr;
    //parsegraph_log("Rendering %d indices of glyph page\n", numIndices);
    parsegraph_GlyphPainter* glyphPainter = grd->painter;
    parsegraph_GlyphData* glyphData = grd->glyphData;
    glBindTexture(GL_TEXTURE_2D, glyphData->glyphPage->_glyphTexture);
    glUniform1i(glyphPainter->u_glyphTexture, 0);
    glDrawArrays(GL_TRIANGLES, 0, numIndices);
}

void parsegraph_GlyphPainter_drawGlyph(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData, float x, float y, float fontScale)
{
    //fprintf(stderr, "Drawing glyph with letter %c at (%f, %f), [w=%d, h=%d]\n", glyphData->letter[0], x, y, glyphData->width, glyphData->height);
    glyphData->painted = 1;

    // Select the correct buffer.
    parsegraph_BufferPage* page = apr_hash_get(painter->_textBuffers, &glyphData->glyphPage->_id, sizeof(int));
    if(!page) {
        page = parsegraph_PagingBuffer_addPage(painter->_textBuffer, renderText, parsegraph_GlyphRenderData_new(painter, glyphData));
        apr_hash_set(painter->_textBuffers, &glyphData->glyphPage->_id, sizeof(int), page);
        //parsegraph_log("Created paging buffer page %d for painter %d\n", glyphData->glyphPage->_id, painter->_id);
    }
    else {
        //parsegraph_log("Reused paging buffer page %d for painter %d\n", glyphData->glyphPage->_id, painter->_id);
    }


    // Append position data.
    //parsegraph_log("Glyph Position Values: (%f, %f)\n(%f, %f)\n(%f, %f)\n(%f, %f)\n(%f, %f)\n(%f, %f)\n",
        //x, y,
        //x + glyphData->width * fontScale, y,
        //x + glyphData->width * fontScale, y + glyphData->height * fontScale,
        //x, y,
        //x + glyphData->width * fontScale, y + glyphData->height * fontScale,
        //x, y + glyphData->height * fontScale
    //);
    parsegraph_BufferPage_appendData(page,
        painter->a_position,
        12,
        x, y,
        x + glyphData->width * fontScale, y,
        x + glyphData->width * fontScale, y + glyphData->height * fontScale,

        x, y,
        x + glyphData->width * fontScale, y + glyphData->height * fontScale,
        x, y + glyphData->height * fontScale
    );

    if(painter->_maxSize < glyphData->width * fontScale) {
        painter->_maxSize = glyphData->width * fontScale;
    }

    // Append color data.
    //parsegraph_log("%f, %f, %f, %f", painter->_color[0],
    //painter->_color[1],
    //painter->_color[2],
    //painter->_color[3]);
    for(int k = 0; k < 3 * 2; ++k) {
        parsegraph_BufferPage_appendData(page,
            painter->a_color, 4,
            painter->_color[0],
            painter->_color[1],
            painter->_color[2],
            painter->_color[3]
        );
    }
    for(int k = 0; k < 3 * 2; ++k) {
        parsegraph_BufferPage_appendData(page,
            painter->a_backgroundColor, 4,
            painter->_backgroundColor[0],
            painter->_backgroundColor[1],
            painter->_backgroundColor[2],
            painter->_backgroundColor[3]
        );
    }

    // Append texture coordinate data.
    float textureWidth = parsegraph_GlyphAtlas_maxTextureWidth(painter->_glyphAtlas);
    parsegraph_BufferPage_appendData(page,
        painter->a_texCoord, 12,
        (float)glyphData->x / textureWidth,
        (float)glyphData->y / textureWidth,

        ((float)glyphData->x + (float)glyphData->width) / textureWidth,
        (float)glyphData->y / textureWidth,

        ((float)glyphData->x + (float)glyphData->width) / textureWidth,
        ((float)glyphData->y + (float)glyphData->height) / textureWidth,

        (float)glyphData->x / textureWidth,
        (float)glyphData->y / textureWidth,

        ((float)glyphData->x + (float)glyphData->width) / textureWidth,
        ((float)glyphData->y + (float)glyphData->height) / textureWidth,

        (float)glyphData->x / textureWidth,
        ((float)glyphData->y + (float)glyphData->height) / textureWidth
    );
}

void parsegraph_GlyphPainter_destroy(parsegraph_GlyphPainter* painter)
{
    parsegraph_pagingbuffer_destroy(painter->_textBuffer);
    apr_pool_destroy(painter->_renderPool);
    apr_pool_destroy(painter->pool);
}

void parsegraph_GlyphPainter_clear(parsegraph_GlyphPainter* glyphPainter)
{
    //parsegraph_log("Clearing glyph painter\n");
    parsegraph_pagingbuffer_clear(glyphPainter->_textBuffer);
    apr_pool_destroy(glyphPainter->_renderPool);
    if(APR_SUCCESS != apr_pool_create(&glyphPainter->_renderPool, glyphPainter->pool)) {
        parsegraph_die("Failed to create GlyphPainter memory pool.");
    }
    glyphPainter->_maxSize = 0;
}

void parsegraph_GlyphPainter_render(parsegraph_GlyphPainter* painter, float* world, float scale)
{
    //fprintf(stderr, "%f\n", scale);
    //fprintf(stderr, "Max scale of a single largest glyph would be: %f\n", painter->_maxSize*scale);
    if(scale < .1 && painter->_maxSize*scale < 2) {
        //parsegraph_log("Not drawing glyphs because the scale is too small to see them\n");
        return;
    }

    if(painter->_maxSize / (world[0]/world[8]) < 1) {
        //parsegraph_log("Not drawing glyphs because the world matrix is too small to see them\n");
        return;
    }

    parsegraph_GlyphAtlas_update(parsegraph_GlyphPainter_glyphAtlas(painter));

    // Load program.
    glUseProgram(painter->_textProgram);

    glActiveTexture(GL_TEXTURE0);

    // Render text.
    glUniformMatrix3fv(
        painter->u_world,
        1,
        0,
        world
    );
    //fprintf(stderr, "Rendering glyphs\n");
    parsegraph_pagingbuffer_renderPages(painter->_textBuffer);
    //fprintf(stderr, "Done rendering glyphs\n");
}
