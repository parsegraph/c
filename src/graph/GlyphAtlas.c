#include "GlyphAtlas.h"
#include "Surface.h"
#include "../unicode.h"
#include <stdlib.h>
#include <stdio.h>
#include <unicode/ustring.h>
#include "die.h"

int parsegraph_GlyphPage_COUNT = 0;

parsegraph_GlyphPage* parsegraph_GlyphPage_new(parsegraph_GlyphAtlas* glyphAtlas)
{
    parsegraph_GlyphPage* page = apr_palloc(glyphAtlas->pool, sizeof(*page));
    page->glyphAtlas = glyphAtlas;
    page->_id = parsegraph_GlyphPage_COUNT++;
    page->_glyphTexture = 0;
    page->_firstGlyph = 0;
    page->_lastGlyph = 0;
    page->next = 0;
    return page;
}

parsegraph_GlyphData* parsegraph_GlyphData_new(parsegraph_GlyphPage* glyphPage, const UChar* glyph, int len, unsigned int x, unsigned int y, unsigned int width, unsigned int height)
{
    if(len > U16_MAX_LENGTH) {
        parsegraph_die("Glyph length is too large");
    }
    parsegraph_GlyphData* glyphData = apr_palloc(glyphPage->glyphAtlas->pool, sizeof(*glyphData));
    glyphData->glyphPage = glyphPage;
    u_memset(glyphData->letter, 0, U16_MAX_LENGTH);
    u_strncpy(glyphData->letter, glyph, len);
    glyphData->length = len;
    glyphData->painted = 0;
    glyphData->x = x;
    glyphData->y = y;
    glyphData->width = width;
    glyphData->height = height;
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
parsegraph_GlyphAtlas* parsegraph_GlyphAtlas_new(parsegraph_Surface* surface, float fontSizePixels, UChar* fontName, int fontNameLen, const char* fillStyle)
{
    parsegraph_GlyphAtlas* atlas = apr_palloc(surface->pool, sizeof(*atlas));
    atlas->surface = surface;
    atlas->pool = surface->pool;

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

    atlas->_firstPage = 0;
    atlas->_lastPage = 0;
    atlas->_needsUpdate = 1;

    atlas->_glyphData = apr_hash_make(atlas->pool);

    // Atlas working position.
    atlas->_padding = parsegraph_GlyphAtlas_fontSize(atlas) / 4;
    atlas->_x = atlas->_padding;
    atlas->_y = atlas->_padding;
    atlas->_unicode = 0;

    return atlas;
}

parsegraph_Surface* parsegraph_GlyphAtlas_surface(parsegraph_GlyphAtlas* atlas)
{
    return atlas->surface;
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

parsegraph_GlyphData* parsegraph_GlyphAtlas_getGlyph(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    parsegraph_GlyphData* glyphData = apr_hash_get(glyphAtlas->_glyphData, &glyph, len*sizeof(glyph));
    if(glyphData) {
        return glyphData;
    }
    int letterWidth = parsegraph_GlyphAtlas_measureText(glyphAtlas, glyph, len);

    parsegraph_GlyphPage* glyphPage = glyphAtlas->_lastPage;
    if(!glyphPage) {
        glyphPage = parsegraph_GlyphPage_new(glyphAtlas);
        glyphAtlas->_lastPage = glyphPage;
        glyphAtlas->_firstPage = glyphPage;
    }

    float letterHeight = parsegraph_GlyphAtlas_letterHeight(glyphAtlas);
    int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);
    if(glyphAtlas->_x + letterWidth + glyphAtlas->_padding > maxTextureWidth) {
        // Move to the next row.
        glyphAtlas->_x = glyphAtlas->_padding;
        glyphAtlas->_y += letterHeight + glyphAtlas->_padding;
    }
    if(glyphAtlas->_y + letterHeight + glyphAtlas->_padding > parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas)) {
        // Move to the next page.
        glyphPage = parsegraph_GlyphPage_new(glyphAtlas);
        glyphAtlas->_lastPage->next = glyphPage;
        glyphAtlas->_lastPage = glyphPage;
        glyphAtlas->_x = glyphAtlas->_padding;
        glyphAtlas->_y = glyphAtlas->_padding;
    }

    glyphData = parsegraph_GlyphData_new(glyphPage, glyph, len, glyphAtlas->_x, glyphAtlas->_y, letterWidth, letterHeight);

    apr_hash_set(glyphAtlas->_glyphData, &glyphData->letter, len*sizeof(UChar), glyphData);
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

void parsegraph_GlyphAtlas_update(parsegraph_GlyphAtlas* glyphAtlas)
{
    if(!glyphAtlas->_font) {
        parsegraph_GlyphAtlas_restoreProperties(glyphAtlas);
    }
    if(!glyphAtlas->_needsUpdate) {
        return;
    }
    glyphAtlas->_needsUpdate = 0;

    for(parsegraph_GlyphPage* page = glyphAtlas->_firstPage; page; page = page->next) {
        int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);

        void* texture = parsegraph_GlyphAtlas_createTexture(glyphAtlas);
        for(parsegraph_GlyphData* glyphData = page->_firstGlyph; glyphData; glyphData = glyphData->next) {
            parsegraph_GlyphAtlas_renderGlyph(glyphAtlas, glyphData, texture);
        }

        // Create texture.
        if(!page->_glyphTexture) {
            glGenTextures(1, &page->_glyphTexture);
        }

        const GLvoid* glyphCanvas = parsegraph_GlyphAtlas_getTextureData(glyphAtlas, texture);

        // Draw from 2D canvas.
        glBindTexture(GL_TEXTURE_2D, page->_glyphTexture);
        glTexImage2D(
            GL_TEXTURE_2D, 0, GL_RGB, maxTextureWidth, maxTextureWidth, 0, GL_RGB, GL_UNSIGNED_BYTE, glyphCanvas
        );
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        // Prevents t-coordinate wrapping (repeating).
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        glGenerateMipmap(GL_TEXTURE_2D);

        parsegraph_GlyphAtlas_destroyTexture(glyphAtlas, texture);
    }
};

void parsegraph_GlyphAtlas_clear(parsegraph_GlyphAtlas* glyphAtlas)
{
    for(parsegraph_GlyphPage* page = glyphAtlas->_firstPage; page; page = page->next) {
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

void parsegraph_GlyphAtlas_font(parsegraph_GlyphAtlas* glyphAtlas, UChar* buf, size_t len)
{
    u_snprintf(buf, len, "%0.2fpx %s", glyphAtlas->_fontSize, glyphAtlas->_fontName);
}

int parsegraph_GlyphAtlas_maxTextureWidth(parsegraph_GlyphAtlas* glyphAtlas)
{
    return 1024;
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
