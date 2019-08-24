#include "log.h"
#include "GlyphAtlas.h"
#include "../unicode.h"
#include <stdlib.h>
#include <stdio.h>
#include <unicode/ustring.h>
#include <time.h>
#include "die.h"

int parsegraph_GlyphPage_COUNT = 0;

#define MAX_TEXTURE_WIDTH 512

parsegraph_GlyphPage* parsegraph_GlyphPage_new(parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_GlyphPage* page = apr_palloc(glyphAtlas->pool, sizeof(*page));
    page->glyphAtlas = glyphAtlas;
    page->_id = glyphAtlas->_maxPage++;
    page->_glyphTexture = 0;
    page->_firstGlyph = 0;
    page->_lastGlyph = 0;
    page->next = 0;
    return page;
}

parsegraph_GlyphData* parsegraph_GlyphData_new(parsegraph_GlyphPage* glyphPage,
    const UChar* glyph, int len, int x, int y,
    int width, int height,
    int ascent, int descent,
    int advance)
{
    parsegraph_GlyphData* glyphData = apr_palloc(glyphPage->glyphAtlas->pool, sizeof(*glyphData));
    glyphData->glyphPage = glyphPage;
    glyphData->letter = apr_palloc(glyphPage->glyphAtlas->pool, len + 1);
    u_memset(glyphData->letter, 0, len + 1);
    u_strncpy(glyphData->letter, glyph, len);
    glyphData->length = len;
    glyphData->painted = 0;
    glyphData->x = x;
    glyphData->y = y;
    glyphData->width = width;
    glyphData->height = height;
    glyphData->ascent = ascent;
    glyphData->descent = descent;
    glyphData->advance = advance;
    glyphData->next = 0;
    return glyphData;
}

/**
 * TODO Allow a max texture width of 1024, by paging the texture.
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
int parsegraph_GlyphAtlas_COUNT = 0;
parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(apr_pool_t* ppool, float fontSizePixels, UChar* fontName, int fontNameLen, const char* fillStyle)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create GlyphAtlas memory pool.");
    }
    parsegraph_GlyphAtlas* atlas = apr_palloc(pool, sizeof(*atlas));
    atlas->pool = pool;

    atlas->_id = ++parsegraph_GlyphAtlas_COUNT;
    atlas->_fontSize = fontSizePixels;
    if(fontNameLen >= sizeof(atlas->_fontName)/sizeof(UChar)) {
        parsegraph_die("Font name is too long");
    }
    u_memset(atlas->_fontName, 0, sizeof(atlas->_fontName)/sizeof(UChar));
    u_strncpy(atlas->_fontName, fontName, fontNameLen);
    atlas->_fillStyle = fillStyle;
    atlas->_font = 0;
    parsegraph_GlyphAtlas_restoreProperties(atlas);

    atlas->_pages = parsegraph_ArrayList_new(atlas->pool);
    atlas->_needsUpdate = 1;

    atlas->_glyphData = apr_hash_make(atlas->pool);
    atlas->_currentRowHeight = 0;

    // Atlas working position.
    atlas->_padding = parsegraph_GlyphAtlas_fontSize(atlas) / 4;
    atlas->_x = atlas->_padding;
    atlas->_y = atlas->_padding;
    atlas->_unicode = 0;

    atlas->_maxPage = 0;
    atlas->_glTextureSize = 0;
    atlas->_renderTexture = 0;

    return atlas;
}

void parsegraph_GlyphAtlas_destroy(parsegraph_GlyphAtlas* atlas)
{
    parsegraph_GlyphAtlas_destroyFont(atlas);
    apr_pool_destroy(atlas->pool);
}

void parsegraph_GlyphAtlas_setUnicode(parsegraph_GlyphAtlas* atlas, parsegraph_Unicode* uni)
{
    if(!parsegraph_Unicode_loaded(uni)) {
        fprintf(stderr, "Unicode provided has not been loaded.\n");
        abort();
    }
    atlas->_unicode = uni;
}

parsegraph_Unicode* parsegraph_GlyphAtlas_unicode(parsegraph_GlyphAtlas* atlas)
{
    return atlas->_unicode;
}

int parsegraph_GlyphAtlas_toString(parsegraph_GlyphAtlas* atlas, char* buf, size_t len)
{
    return snprintf(buf, len, "[GlyphAtlas %d]", atlas->_id);
}

int parsegraph_GlyphAtlas_maxPage(parsegraph_GlyphAtlas* glyphAtlas)
{
    return glyphAtlas->_maxPage;
}

parsegraph_GlyphData* parsegraph_GlyphAtlas_getGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    parsegraph_GlyphData* glyphData = apr_hash_get(glyphAtlas->_glyphData, glyph, len*sizeof(UChar));
    if(glyphData) {
        //parsegraph_log("REUSING!!\n");
        return glyphData;
    }
    else {
        //parsegraph_log("CREATING GLYPH FOR %d!!\n", glyph[0]);
    }
    int letterWidth, letterHeight;
    int letterAscent, letterDescent;
    int advance;
    parsegraph_GlyphAtlas_measureText(glyphAtlas, glyph, len,
        &letterWidth, &letterHeight, &letterAscent, &letterDescent, &advance
    );

    parsegraph_GlyphPage* glyphPage;
    if(parsegraph_ArrayList_length(glyphAtlas->_pages) == 0) {
        glyphPage = parsegraph_GlyphPage_new(glyphAtlas);
        parsegraph_ArrayList_push(glyphAtlas->_pages, glyphPage);
    }
    else {
        glyphPage = parsegraph_ArrayList_at(glyphAtlas->_pages, parsegraph_ArrayList_length(glyphAtlas->_pages) - 1);
    }

    if(glyphAtlas->_currentRowHeight < letterHeight) {
        glyphAtlas->_currentRowHeight = letterHeight;
    }

    int pageTextureSize = parsegraph_GlyphAtlas_pageTextureSize(glyphAtlas);
    if(glyphAtlas->_x + letterWidth + glyphAtlas->_padding > pageTextureSize) {
        // Move to the next row.
        glyphAtlas->_x = glyphAtlas->_padding;
        glyphAtlas->_y += glyphAtlas->_currentRowHeight + glyphAtlas->_padding;
        glyphAtlas->_currentRowHeight = letterHeight;
    }
    if(glyphAtlas->_y + glyphAtlas->_currentRowHeight + glyphAtlas->_padding > pageTextureSize) {
        // Move to the next page.
        glyphPage = parsegraph_GlyphPage_new(glyphAtlas);
        parsegraph_ArrayList_push(glyphAtlas->_pages, glyphPage);
        glyphAtlas->_x = glyphAtlas->_padding;
        glyphAtlas->_y = glyphAtlas->_padding;
        glyphAtlas->_currentRowHeight = letterHeight;
    }

    glyphData = parsegraph_GlyphData_new(glyphPage, glyph, len, glyphAtlas->_x, glyphAtlas->_y,
        letterWidth, letterHeight, letterAscent, letterDescent, advance);

    apr_hash_set(glyphAtlas->_glyphData, glyphData->letter, len*sizeof(UChar), glyphData);
    if(glyphPage->_lastGlyph) {
        glyphPage->_lastGlyph->next = glyphData;
        glyphPage->_lastGlyph = glyphData;
    } else {
        glyphPage->_firstGlyph = glyphData;
        glyphPage->_lastGlyph = glyphData;
    }

    glyphAtlas->_x += glyphData->width + glyphAtlas->_padding;
    glyphAtlas->_needsUpdate = 1;

    return glyphData;
}

parsegraph_GlyphData* parsegraph_GlyphAtlas_get(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    return parsegraph_GlyphAtlas_getGlyph(glyphAtlas, glyph, len);
}

int parsegraph_GlyphAtlas_hasGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    return 0 != apr_hash_get(glyphAtlas->_glyphData, &glyph, len*sizeof(glyph));
}

int parsegraph_GlyphAtlas_has(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    return parsegraph_GlyphAtlas_hasGlyph(glyphAtlas, glyph, len);
}

int parsegraph_getGlyphTextureSize()
{
    int rv;
    glGetIntegerv(GL_MAX_TEXTURE_SIZE, &rv);
    return rv > 2048 ? 2048 : rv;
}

void parsegraph_GlyphAtlas_update(parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!glyphAtlas->_font) {
        parsegraph_GlyphAtlas_restoreProperties(glyphAtlas);
    }
    if(!glyphAtlas->_needsUpdate) {
        //parsegraph_log("GlyphAtlas does not need update\n");
        return;
    }
    //parsegraph_log("GlyphAtlas is updating\n");
    glyphAtlas->_needsUpdate = 0;

    struct timespec td;
    clock_gettime(CLOCK_MONOTONIC, &td);
    int pageTextureSize = parsegraph_GlyphAtlas_pageTextureSize(glyphAtlas);
    if(!glyphAtlas->_renderTexture) {
        glyphAtlas->_glTextureSize = parsegraph_getGlyphTextureSize();
        glyphAtlas->_renderTexture = parsegraph_GlyphAtlas_createTexture(glyphAtlas, pageTextureSize, pageTextureSize);
    }

    int pageX = 0;
    int pageY = 0;
    GLuint curTexture = 0;
    int pagesUpdated = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(glyphAtlas->_pages); ++i) {
        parsegraph_GlyphPage* page = parsegraph_ArrayList_at(glyphAtlas->_pages, i);
        parsegraph_GlyphAtlas_clearTexture(glyphAtlas, glyphAtlas->_renderTexture);
        for(parsegraph_GlyphData* glyphData = page->_firstGlyph; glyphData; glyphData = glyphData->next) {
            parsegraph_GlyphAtlas_renderGlyph(glyphAtlas, glyphData, glyphAtlas->_renderTexture);
        }

        // Create texture.
        if(!curTexture) {
            glGenTextures(1, &curTexture);
            glBindTexture(GL_TEXTURE_2D, curTexture);
            glTexImage2D(GL_TEXTURE_2D, 0, GL_RED, glyphAtlas->_glTextureSize, glyphAtlas->_glTextureSize, 0, GL_RED, GL_UNSIGNED_BYTE, 0);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
            glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        }
        page->_glyphTexture = curTexture;

        // Draw from 2D canvas.
        glTexSubImage2D(GL_TEXTURE_2D, 0, pageX, pageY, pageTextureSize, pageTextureSize, GL_RED, GL_UNSIGNED_BYTE, parsegraph_GlyphAtlas_getTextureData(glyphAtlas, glyphAtlas->_renderTexture));
        pageX += pageTextureSize;
        if(pageX > glyphAtlas->_glTextureSize) {
            pageY += pageTextureSize;
            pageX = 0;
        }
        if(pageY > glyphAtlas->_glTextureSize) {
            pageY = 0;
            pageX = 0;
            glGenerateMipmap(GL_TEXTURE_2D);
            curTexture = 0;
        }
        ++pagesUpdated;
    }
    if(curTexture) {
        glGenerateMipmap(GL_TEXTURE_2D);
    }
    glBindTexture(GL_TEXTURE_2D, 0);
    //parsegraph_log("GlyphAtlas updated %d page(s) in %dms\n", pagesUpdated, parsegraph_elapsed(&td));
}

void parsegraph_GlyphAtlas_clear(parsegraph_GlyphAtlas* glyphAtlas)
{
    for(int i = 0; i < parsegraph_ArrayList_length(glyphAtlas->_pages); ++i) {
        parsegraph_GlyphPage* page = parsegraph_ArrayList_at(glyphAtlas->_pages, i);
        if(page->_glyphTexture) {
            glDeleteTextures(1, &page->_glyphTexture);
        }
    }
}

int parsegraph_GlyphAtlas_needsUpdate(parsegraph_GlyphAtlas* glyphAtlas)
{
    return glyphAtlas->_needsUpdate;
}

void parsegraph_GlyphAtlas_restoreProperties(parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_GlyphAtlas_destroyFont(glyphAtlas);
    glyphAtlas->_font = parsegraph_GlyphAtlas_createFont(glyphAtlas);
    glyphAtlas->_needsUpdate = 1;
}

int parsegraph_GlyphAtlas_pageTextureSize(parsegraph_GlyphAtlas* glyphAtlas)
{
    return MAX_TEXTURE_WIDTH;
}

void parsegraph_GlyphAtlas_font(parsegraph_GlyphAtlas* glyphAtlas, UChar* buf, size_t len)
{
    u_snprintf(buf, len, "%0.2fpx %s", glyphAtlas->_fontSize, glyphAtlas->_fontName);
}

float parsegraph_GlyphAtlas_letterHeight(parsegraph_GlyphAtlas* glyphAtlas)
{
    return parsegraph_GlyphAtlas_fontSize(glyphAtlas) * 1.3;
}

float parsegraph_GlyphAtlas_fontBaseline(parsegraph_GlyphAtlas* glyphAtlas)
{
    return parsegraph_GlyphAtlas_fontSize(glyphAtlas);
}

float parsegraph_GlyphAtlas_fontSize(parsegraph_GlyphAtlas* glyphAtlas)
{
    return glyphAtlas->_fontSize;
}

UChar* parsegraph_GlyphAtlas_fontName(parsegraph_GlyphAtlas* glyphAtlas)
{
    return glyphAtlas->_fontName;
}

int parsegraph_GlyphAtlas_isNewline(parsegraph_GlyphAtlas* glyphAtlas, UChar c)
{
    return c == (UChar)'\n';
}
