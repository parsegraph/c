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
    auto img = new QImage(width, height, QImage::Format_Alpha8);
    parsegraph_GlyphAtlas_clearTexture(glyphAtlas, img);
    return img;
}

void parsegraph_GlyphAtlas_clearTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    auto img = static_cast<QImage*>(texture);
    QPainter p;
    if(!p.begin(img)) {
        parsegraph_die("Failed to create texture");
    }
    p.setBackground(Qt::black);
    p.setPen(QPen(Qt::white));
    p.fillRect(0, 0, img->width(), img->height(), Qt::black);
    p.end();
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
    p.setPen(QPen(Qt::black));
    p.setFont(*static_cast<QFont*>(glyphAtlas->_font));
    p.fillRect(glyphData->x, glyphData->y, glyphData->width, glyphData->height, Qt::black);
    p.setPen(QPen(Qt::white));
    p.drawText(glyphData->x, glyphData->y + glyphData->ascent, QString::fromUtf16(glyphData->letter, glyphData->length));
    p.end();
}

const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    return static_cast<QImage*>(texture)->constBits();
}

}
