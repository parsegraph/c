#include <pango/pangocairo.h>
#include "../die.h"
#include "GlyphAtlas.h"

struct parsegraph_PangoTexture {
cairo_surface_t* surface;
cairo_t* cr;
PangoLayout* layout;
};

struct parsegraph_PangoFont {
void* _font;
struct parsegraph_PangoTexture* measure;
};

// These are platform-specific.
void* parsegraph_GlyphAtlas_createFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    UChar buf[1024];
    u_memset(buf, 0, 1024);
    int32_t len = u_sprintf(buf, "%s %f", glyphAtlas->_fontName, glyphAtlas->_fontSize);
    if(len == 1024) {
        parsegraph_die("Font name too long");
    }

    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, buf, len, &uerr);
    //if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        //parsegraph_die("Unicode error during font conversion to UTF8");
    //}
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    uerr = U_ZERO_ERROR;
    u_strToUTF8(textutf8, neededLen+1, 0, buf, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during font conversion to UTF8");
    }
    struct parsegraph_PangoFont* pf = malloc(sizeof(struct parsegraph_PangoFont));
    pf->_font = pango_font_description_from_string(textutf8);
    glyphAtlas->_font = pf;
    pf->measure = parsegraph_GlyphAtlas_createTexture(glyphAtlas);
    free(textutf8);
    return pf;
}

void parsegraph_GlyphAtlas_destroyFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    struct parsegraph_PangoFont* pf = glyphAtlas->_font;
    if(!pf) {
        return;
    }
    if(pf->measure) {
        parsegraph_GlyphAtlas_destroyTexture(glyphAtlas, pf->measure);
    }
    pango_font_description_free(pf->_font);
    free(pf);
}

int parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* glyph, int len)
{
    struct parsegraph_PangoFont* pf = glyphAtlas->_font;
    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, glyph, len, &uerr);
    //if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        //parsegraph_die("Unicode error during glyph conversion to UTF8");
    //}
    uerr = U_ZERO_ERROR;
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    u_strToUTF8(textutf8, neededLen+1, 0, glyph, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }

    pango_layout_set_text(pf->measure->layout, textutf8, neededLen);

    int width;
    int height;
    pango_layout_get_pixel_size(pf->measure->layout, &width, &height);
    //parsegraph_log("%dx%d\n", width, height);

    free(textutf8);
    return width;
}

void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas)
{
    struct parsegraph_PangoTexture* rv = malloc(sizeof(*rv));
    int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);
    rv->surface = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, maxTextureWidth, maxTextureWidth);

    rv->cr = cairo_create(rv->surface);
    cairo_set_source_rgb(rv->cr, 0, 0, 0);
    cairo_paint(rv->cr);

    rv->layout = pango_cairo_create_layout(rv->cr);
    pango_layout_set_font_description(rv->layout, ((struct parsegraph_PangoFont*)glyphAtlas->_font)->_font);

    return rv;
}

void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* data)
{
    struct parsegraph_PangoTexture* texture = data;
    g_object_unref(texture->layout);
    cairo_destroy(texture->cr);
    cairo_surface_destroy(texture->surface);
    free(texture);
}

void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* data)
{
    struct parsegraph_PangoTexture* texture = data;

    char* textutf8;
    int neededLen;
    UErrorCode uerr = U_ZERO_ERROR;
    u_strToUTF8(0, 0, &neededLen, glyphData->letter, glyphData->length, &uerr);
    //if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        //parsegraph_die("Unicode error during glyph conversion to UTF8");
    //}
    textutf8 = malloc(neededLen+1);
    memset(textutf8, 0, neededLen+1);
    uerr = U_ZERO_ERROR;
    u_strToUTF8(textutf8, neededLen+1, 0, glyphData->letter, glyphData->length, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error during glyph conversion to UTF8");
    }

    pango_layout_set_text(texture->layout, textutf8, neededLen);
    cairo_set_source_rgb(texture->cr, 1, 1, 1);
    cairo_move_to(texture->cr, glyphData->x, glyphData->y);
    pango_cairo_update_layout(texture->cr, texture->layout);
    pango_cairo_show_layout(texture->cr, texture->layout);
    free(textutf8);
}

const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* data)
{
    struct parsegraph_PangoTexture* texture = data;
    return cairo_image_surface_get_data(texture->surface);
}
