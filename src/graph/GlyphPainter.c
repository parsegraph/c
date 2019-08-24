#include "GlyphPainter.h"
#include "../die.h"
#include "log.h"
#include "../gl.h"
#include "Color.h"
#include "GlyphAtlas.h"
#include <math.h>
#include <GL/glu.h>

#include <stdio.h>
#include <stdlib.h>

//#define parsegraph_GlyphPainter_DEBUG

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
"}\n";

#ifdef parsegraph_GlyphPainter_DEBUG
static const char* parsegraph_GlyphPainter_VertexShader_debug =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec2 a_texCoord;\n"
"\n"
"varying " HIGHP " vec2 texCoord;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
   "texCoord = a_texCoord;\n"
"}\n";

static const char* parsegraph_GlyphPainter_FragmentShader_debug =
"uniform sampler2D u_glyphTexture;\n"
"varying " HIGHP " vec2 texCoord;\n"
"\n"
"void main() {\n"
    "gl_FragColor = vec4(texture2D(u_glyphTexture, texCoord.st).argb);\n"
"}\n";
#endif

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
    #ifdef parsegraph_GlyphPainter_DEBUG
        parsegraph_GlyphPainter_VertexShader_debug,
        parsegraph_GlyphPainter_FragmentShader_debug
    #else
        parsegraph_GlyphPainter_VertexShader,
        parsegraph_GlyphPainter_FragmentShader
    #endif
    );
    GLenum err = glGetError();
    if(GL_NO_ERROR != err) {
        parsegraph_die("GL error while creating text program for glyph painter: %s\n", gluErrorString(err));
    }

    painter->_textBuffers = parsegraph_ArrayList_new(pool);
    painter->_maxSize = 0;

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    painter->_stride = sizeof(float)*(2+4+4+2);
    painter->_vertexBuffer = apr_palloc(painter->pool, painter->_stride);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->_textProgram, "u_world");
    painter->u_glyphTexture = glGetUniformLocation(painter->_textProgram, "u_glyphTexture");
    painter->a_position = glGetAttribLocation(painter->_textProgram, "a_position");
    #ifndef parsegraph_GlyphPainter_DEBUG
    painter->a_color = glGetAttribLocation(painter->_textProgram, "a_color");
    painter->a_backgroundColor = glGetAttribLocation(painter->_textProgram, "a_backgroundColor");
    #endif
    painter->a_texCoord = glGetAttribLocation(painter->_textProgram, "a_texCoord");

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

parsegraph_GlyphPageRenderer* parsegraph_GlyphPageRenderer_new(parsegraph_GlyphPainter* painter, int textureIndex)
{
    parsegraph_GlyphPageRenderer* pageRender;
    pageRender = apr_palloc(painter->pool, sizeof(*pageRender));
    pageRender->_painter = painter;
    pageRender->_textureIndex = textureIndex;
    pageRender->_glyphBuffer = 0;
    pageRender->_glyphBufferNumVertices = 0;
    pageRender->_glyphBufferVertexIndex = 0;
    pageRender->_dataBufferVertexIndex = 0;
    pageRender->_dataBufferNumVertices = 6;
    pageRender->_dataBuffer = apr_palloc(painter->pool, sizeof(float)*(pageRender->_dataBufferNumVertices*painter->_stride/sizeof(float)));
    return pageRender;
}

void parsegraph_GlyphPageRenderer_initBuffer(parsegraph_GlyphPageRenderer* pageRender, int numGlyphs)
{
    if(pageRender->_glyphBufferNumVertices/6 == numGlyphs) {
        //parsegraph_log("Reusing existing buffer\n");
        pageRender->_glyphBufferVertexIndex = 0;
        pageRender->_dataBufferVertexIndex = 0;
        return;
    }
    else {
        //parsegraph_log("Recreating buffer with %d from %d\n", numGlyphs, pageRender->_glyphBufferNumVertices);
    }
    if(pageRender->_glyphBuffer) {
        parsegraph_GlyphPageRenderer_clear(pageRender);
    }
    glGenBuffers(1, &pageRender->_glyphBuffer);
    glBindBuffer(GL_ARRAY_BUFFER, pageRender->_glyphBuffer);
    glBufferData(GL_ARRAY_BUFFER, pageRender->_painter->_stride*6*numGlyphs, 0, GL_STATIC_DRAW);
    pageRender->_glyphBufferNumVertices = numGlyphs*6;
}

void parsegraph_GlyphPageRenderer_clear(parsegraph_GlyphPageRenderer* pageRender)
{
    if(!pageRender->_glyphBuffer) {
        return;
    }
    glDeleteBuffers(1, &pageRender->_glyphBuffer);
    pageRender->_glyphBuffer = 0;
    pageRender->_glyphBufferNumVertices = 0;
    pageRender->_dataBufferVertexIndex = 0;
    pageRender->_glyphBufferVertexIndex = 0;
}

void parsegraph_GlyphPageRenderer_flush(parsegraph_GlyphPageRenderer* pageRender)
{
    if(pageRender->_dataBufferVertexIndex == 0) {
        return;
    }
    int stride = pageRender->_painter->_stride;
    glBindBuffer(GL_ARRAY_BUFFER, pageRender->_glyphBuffer);

    if(pageRender->_dataBufferVertexIndex + pageRender->_glyphBufferVertexIndex > pageRender->_glyphBufferNumVertices) {
        parsegraph_die("GL buffer of %d vertices is full; cannot flush all %d vertices because the GL buffer already has %d vertices.\n", pageRender->_glyphBufferNumVertices, pageRender->_dataBufferVertexIndex, pageRender->_glyphBufferVertexIndex);
    }
    if(pageRender->_dataBufferVertexIndex >= pageRender->_dataBufferNumVertices) {
        glBufferSubData(GL_ARRAY_BUFFER, pageRender->_glyphBufferVertexIndex*stride, pageRender->_dataBufferNumVertices*stride, pageRender->_dataBuffer);
    }
    else {
        glBufferSubData(GL_ARRAY_BUFFER, pageRender->_glyphBufferVertexIndex*stride, pageRender->_dataBufferVertexIndex*stride, pageRender->_dataBuffer);
    }
    pageRender->_glyphBufferVertexIndex += pageRender->_dataBufferVertexIndex;
    pageRender->_dataBufferVertexIndex = 0;
}

void parsegraph_GlyphPageRenderer_writeVertex(parsegraph_GlyphPageRenderer* pageRender)
{
    int stride = pageRender->_painter->_stride;
    int pos = pageRender->_dataBufferVertexIndex++ * stride/sizeof(float);
    float* buf = pageRender->_painter->_vertexBuffer;
    /*parsegraph_log("Writing glyph vertex with position (%f, %f) and texcoord (%f, %f)\n",
        buf[0], buf[1], buf[10], buf[11]);*/
    memcpy(pageRender->_dataBuffer + pos, buf, stride);
    if(pageRender->_dataBufferVertexIndex >= pageRender->_dataBufferNumVertices) {
        parsegraph_GlyphPageRenderer_flush(pageRender);
    }
}

void parsegraph_GlyphPageRenderer_drawGlyph(parsegraph_GlyphPageRenderer* pageRender, parsegraph_GlyphData* glyphData, float x, float y, float fontScale)
{
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_GlyphPainter_glyphAtlas(pageRender->_painter);
    float glTextureSize = parsegraph_getGlyphTextureSize();
    int pageTextureSize = parsegraph_GlyphAtlas_pageTextureSize(glyphAtlas);
    int pagesPerRow = glTextureSize / pageTextureSize;
    int pagesPerTexture = (int)pow(pagesPerRow, 2);
    int pageIndex = glyphData->glyphPage->_id % pagesPerTexture;
    int pageX = pageTextureSize * (pageIndex % pagesPerRow);
    int pageY = pageTextureSize * (int)floor(pageIndex / pagesPerRow);
    parsegraph_log("Drawing glyph with glyphPage %d at page coords (%d, %d)\n", glyphData->glyphPage->_id, pageX, pageY);

    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    float* buf = pageRender->_painter->_vertexBuffer;

    #ifndef parsegraph_GlyphPainter_DEBUG
    // Append color data.
    float* color = pageRender->_painter->_color;
    buf[2] = color[0];
    buf[3] = color[1];
    buf[4] = color[2];
    buf[5] = color[3];

    // Append background color data.
    float* bg = pageRender->_painter->_backgroundColor;
    buf[6] = bg[0];
    buf[7] = bg[1];
    buf[8] = bg[2];
    buf[9] = bg[3];
    #endif

    // Position data.
    buf[0] = x;
    buf[1] = y;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);

    // Position data.
    buf[0] = x + glyphData->width * fontScale;
    buf[1] = y;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x + glyphData->width) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);

    // Position data.
    buf[0] = x + glyphData->width * fontScale;
    buf[1] = y + glyphData->height * fontScale;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x + glyphData->width) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y + glyphData->height) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);

    // Position data.
    buf[0] = x;
    buf[1] = y;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);

    // Position data.
    buf[0] = x + glyphData->width * fontScale;
    buf[1] = y + glyphData->height * fontScale;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x + glyphData->width) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y + glyphData->height) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);

    // Position data.
    buf[0] = x;
    buf[1] = y + glyphData->height * fontScale;
    // Texcoord data
    buf[10] = (float)(pageX + glyphData->x) / glTextureSize;
    buf[11] = (float)(pageY + glyphData->y + glyphData->height) / glTextureSize;
    parsegraph_GlyphPageRenderer_writeVertex(pageRender);
}

void parsegraph_GlyphPageRenderer_render(parsegraph_GlyphPageRenderer* pageRender)
{
    if(!pageRender->_glyphBuffer) {
        parsegraph_die("GlyphPageRenderer must be initialized before rendering\n");
    }
    parsegraph_GlyphPageRenderer_flush(pageRender);
    if(pageRender->_glyphBufferVertexIndex == 0) {
        return;
    }
    GLuint glyphTexture = ((parsegraph_GlyphPage*)parsegraph_ArrayList_at(pageRender->_painter->_glyphAtlas->_pages, pageRender->_textureIndex))->_glyphTexture;
    //parsegraph_log("Rendering %d glyphs of glyph page %d\n", pageRender->_glyphBufferVertexIndex/6, pageRender->_textureIndex);
    glBindTexture(GL_TEXTURE_2D, glyphTexture);
    glUniform1i(pageRender->_painter->u_glyphTexture, 0);

    glBindBuffer(GL_ARRAY_BUFFER, pageRender->_glyphBuffer);
    // Position: 2 * 4 (two floats) : 0-7
    // Color: 4 * 4 (four floats) : 8-23
    // Background Color: 4 * 4 (four floats) : 24 - 39
    // Texcoord: 2 * 4 (two floats): 40-48
    parsegraph_GlyphPainter* painter = pageRender->_painter;
    int stride = painter->_stride;
    glVertexAttribPointer(painter->a_position, 2, GL_FLOAT, 0, stride, 0);
    #ifndef parsegraph_GlyphPainter_DEBUG
    glVertexAttribPointer(painter->a_color, 4, GL_FLOAT, 0, stride, (void*)8);
    glVertexAttribPointer(painter->a_backgroundColor, 4, GL_FLOAT, 0, stride, (void*)24);
    #endif
    glVertexAttribPointer(painter->a_texCoord, 2, GL_FLOAT, 0, stride, (void*)40);
    glDrawArrays(GL_TRIANGLES, 0, pageRender->_glyphBufferVertexIndex);
}

void parsegraph_GlyphPageRenderer_destroy(parsegraph_GlyphPageRenderer* pageRender)
{
    parsegraph_GlyphPageRenderer_clear(pageRender);
}

void parsegraph_GlyphPainter_drawGlyph(parsegraph_GlyphPainter* painter, parsegraph_GlyphData* glyphData, float x, float y, float fontScale)
{
    //fprintf(stderr, "Drawing glyph with letter %c at (%f, %f), [w=%d, h=%d]\n", glyphData->letter[0], x, y, glyphData->width, glyphData->height);
    glyphData->painted = 1;

    int glTextureSize = parsegraph_getGlyphTextureSize();
    int pagesPerRow = glTextureSize / parsegraph_GlyphAtlas_pageTextureSize(painter->_glyphAtlas);
    int pagesPerTexture = (int)pow(pagesPerRow, 2);

    int pageId = (int)floorf(glyphData->glyphPage->_id/pagesPerTexture);
    parsegraph_GlyphPageRenderer* gp = parsegraph_ArrayList_at(painter->_textBuffers, pageId);
    if(!gp) {
        parsegraph_die("GlyphPageRenderer must be available when drawing glyph.");
    }

    if(painter->_maxSize < glyphData->width * fontScale) {
        painter->_maxSize = glyphData->width * fontScale;
    }
    parsegraph_GlyphPageRenderer_drawGlyph(gp, glyphData, x, y, fontScale);
}

void parsegraph_GlyphPainter_initBuffer(parsegraph_GlyphPainter* painter, parsegraph_ArrayList* numGlyphs)
{
    int numGlyphLength = parsegraph_ArrayList_length(numGlyphs);
    int gpl = parsegraph_ArrayList_length(painter->_textBuffers);
    int i = 0;
    parsegraph_log("Initializing GlyphPainter with %d pages", numGlyphLength);
    for(; i < numGlyphLength; ++i) {
        parsegraph_GlyphPageRenderer* gp;
        if(i >= gpl) {
            gp = parsegraph_GlyphPageRenderer_new(painter, i);
            parsegraph_ArrayList_push(painter->_textBuffers, gp);
        }
        else {
            gp = parsegraph_ArrayList_at(painter->_textBuffers, i);
        }
        parsegraph_GlyphPageRenderer_initBuffer(gp, (int)(long)parsegraph_ArrayList_at(numGlyphs, i));
    }
    for(int j=i+1; j < gpl; ++j) {
        parsegraph_GlyphPageRenderer* gp = parsegraph_ArrayList_at(painter->_textBuffers, j);
        parsegraph_GlyphPageRenderer_destroy(gp);
    }
    if(gpl-(i+1) > 0) {
        parsegraph_ArrayList_splice(painter->_textBuffers, i+1, gpl-(i+1));
    }
}

void parsegraph_GlyphPainter_destroy(parsegraph_GlyphPainter* painter)
{
    apr_pool_destroy(painter->pool);
}

void parsegraph_GlyphPainter_clear(parsegraph_GlyphPainter* painter)
{
    for(int i = 0; i < parsegraph_ArrayList_length(painter->_textBuffers); ++i) {
        parsegraph_GlyphPageRenderer* gp = parsegraph_ArrayList_at(painter->_textBuffers, i);
        parsegraph_GlyphPageRenderer_clear(gp);
    }
    parsegraph_ArrayList_clear(painter->_textBuffers);
    painter->_maxSize = 0;
}

void parsegraph_GlyphPainter_render(parsegraph_GlyphPainter* painter, float* world, float scale)
{
    parsegraph_log("scale=%f\n", scale);
    parsegraph_log("Max scale of a single largest glyph would be: %f\n", (painter->_maxSize*scale));
    if(scale < .1 && painter->_maxSize*scale < 2) {
        return;
    }

    if(painter->_maxSize / (world[0]/world[8]) < 1) {
        return;
    }

    // Load program.
    glUseProgram(painter->_textProgram);
    glActiveTexture(GL_TEXTURE0);
    glUniformMatrix3fv(painter->u_world, 1, 0, world);

    // Render glyphs for each page.
    glEnableVertexAttribArray(painter->a_position);
    glEnableVertexAttribArray(painter->a_texCoord);
    #ifndef parsegraph_GlyphPainter_DEBUG
    glEnableVertexAttribArray(painter->a_color);
    glEnableVertexAttribArray(painter->a_backgroundColor);
    #endif
    for(int i = 0; i < parsegraph_ArrayList_length(painter->_textBuffers); ++i) {
        parsegraph_GlyphPageRenderer* gp = parsegraph_ArrayList_at(painter->_textBuffers, i);
        parsegraph_GlyphPageRenderer_render(gp);
    }
    glDisableVertexAttribArray(painter->a_position);
    glDisableVertexAttribArray(painter->a_texCoord);
    #ifndef parsegraph_GlyphPainter_DEBUG
    glDisableVertexAttribArray(painter->a_color);
    glDisableVertexAttribArray(painter->a_backgroundColor);
    #endif
}
