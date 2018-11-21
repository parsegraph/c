#include <pango/pangocairo.h>
#include "../die.h"
#include "GlyphAtlas.h"

// These are platform-specific.
void* parsegraph_GlyphAtlas_createFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    UChar buf[1024];
    u_memset(buf, 0, 1024);
    int32_t len = u_sprintf(buf, "%s %d", glyphAtlas->_fontName, glyphAtlas->_fontSize);
    if(len == 1024) {
        parsegraph_die("Font name too long");
    }

    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, buf, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during font conversion to UTF8");
    }
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    u_strToUTF8(textutf8, neededLen, 0, buf, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during font conversion to UTF8");
    }

    glyphAtlas->_font = pango_font_description_from_string(textutf8);

    free(textutf8);
    return glyphAtlas->_font;
}

void parsegraph_GlyphAtlas_destroyFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    pango_font_description_free(glyphAtlas->_font);
}

int parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    PangoContext* pango = pango_context_new();
    PangoLayout* layout = pango_layout_new(pango);
    pango_layout_set_font_description(layout, glyphAtlas->_font);

    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, glyph, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    u_strToUTF8(textutf8, neededLen, 0, glyph, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }

    pango_layout_set_text(layout, textutf8, neededLen);

    int width;
    int height;
    pango_layout_get_size(layout, &width, &height);

    g_object_unref(layout);
    g_object_unref(pango);
    free(textutf8);

    return width;
}

void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas)
{
    int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);
    cairo_surface_t* surface = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, maxTextureWidth, maxTextureWidth);

    cairo_t* cr = cairo_create(surface);
    cairo_set_source_rgb(cr, 0, 0, 0);
    cairo_paint(cr);
    cairo_destroy(cr);

    return surface;
}

void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    cairo_surface_destroy(texture);
}

void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* texture)
{
    cairo_t* cr = cairo_create(texture);
    cairo_set_source_rgb(cr, 0, 0, 0);
    cairo_paint(cr);

    PangoLayout* layout = pango_cairo_create_layout(cr);
    pango_layout_set_font_description(layout, glyphAtlas->_font);

    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, glyphData->letter, glyphData->length, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    u_strToUTF8(textutf8, neededLen, 0, glyphData->letter, glyphData->length, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }

    pango_layout_set_text(layout, textutf8, neededLen);
    pango_cairo_update_layout(cr, layout);
    pango_cairo_show_layout(cr, layout);

    g_object_unref(layout);
    cairo_destroy(cr);
    free(textutf8);
}

const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    return cairo_image_surface_get_data(texture);
}
