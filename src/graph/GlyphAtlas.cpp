extern "C" {
#include "GlyphAtlas.h"
#include "log.h"
#include "../die.h"
}

#include <QImage>
#include <QFont>
#include <QFontMetrics>
#include <QPainter>

extern "C" {

void* parsegraph_GlyphAtlas_createFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    glyphAtlas->_font = new QFont(QString::fromUtf16(glyphAtlas->_fontName), glyphAtlas->_fontSize);
    return glyphAtlas->_font;
}

void parsegraph_GlyphAtlas_destroyFont(parsegraph_GlyphAtlas* glyphAtlas)
{
    if(glyphAtlas->_font) {
        delete static_cast<QFont*>(glyphAtlas->_font);
    }
}

void parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* text, int len, 
    int* width, int* height, int* ascent, int* descent, int* advance)
{
    QFontMetrics fm(*static_cast<QFont*>(glyphAtlas->_font));
    auto str = QString::fromUtf16(text, len);
    if(width) {
        *width = fm.size(0, str, 0, 0).width();
        //parsegraph_log("Glyph width (c=%x, len=%d) is %d.\n", text[0], len, *width);
    }
    if(advance) {
        *advance = fm.horizontalAdvance(str);
    }
    if(height) {
        *height= fm.size(0, str, 0, 0).height();
    }
    if(ascent) {
        *ascent = fm.ascent();
    }
    if(descent) {
        *descent = fm.descent();
    }
}

void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas, int width, int height)
{
    auto img = new QImage(width, height, QImage::Format_ARGB32);
    parsegraph_GlyphAtlas_clearTexture(glyphAtlas, img);
    return img;
}

void parsegraph_GlyphAtlas_clearTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    auto img = static_cast<QImage*>(texture);
    img->fill(0);
}

void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    delete static_cast<QImage*>(texture);
}

void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* texture)
{
    QImage* image = static_cast<QImage*>(texture);
    QPainter p;
    if(!p.begin(image)) {
        parsegraph_die("Failed to paint glyph");
    }
    p.setBackground(Qt::black);
    p.setPen(Qt::white);
    p.setFont(*static_cast<QFont*>(glyphAtlas->_font));
    QString glyph = QString::fromUtf16(glyphData->letter, glyphData->length);
    parsegraph_log("Rendering glyph '%s' at (%d, %d)\n", glyph.toUtf8().constData(), glyphData->x, glyphData->y);
    p.drawText(glyphData->x, glyphData->y + glyphData->ascent, glyph);
    p.end();
}

void* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* data)
{
    QImage* img = static_cast<QImage*>(data);
    size_t sz = img->width()*img->height();
    unsigned char* bytes = static_cast<unsigned char*>(malloc(sz));
    QImage alphaImg = img->convertToFormat(QImage::Format_Alpha8);
    memcpy(bytes, alphaImg.constBits(), sz);
    return bytes;
}

void parsegraph_GlyphAtlas_freeTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* data)
{
    free(data);
}

}
