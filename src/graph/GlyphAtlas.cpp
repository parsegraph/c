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

int parsegraph_GlyphAtlas_measureText(parsegraph_GlyphAtlas* glyphAtlas, const UChar* text, int len)
{
    QFontMetrics fm(*static_cast<QFont*>(glyphAtlas->_font));
    int w = fm.size(0, QString::fromUtf16(text, len), 0, 0).width();
    //fprintf(stderr, "Glyph width (len=%d) is %d\n", len, w);
    return w;
}

void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas)
{
    int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);
    auto img = new QImage(maxTextureWidth, maxTextureWidth, QImage::Format_RGB888);
    QPainter p;
    if(!p.begin(img)) {
        parsegraph_die("Failed to create texture");
    }
    p.setBackground(Qt::black);
    p.setPen(QPen(Qt::white));
    p.fillRect(0, 0, maxTextureWidth, maxTextureWidth, Qt::black);
    p.end();

    return img;
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
    p.drawText(glyphData->x, glyphData->y, glyphData->width, glyphData->height, 0, QString::fromUtf16(glyphData->letter, glyphData->length), nullptr);
    p.end();
}

const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    return static_cast<QImage*>(texture)->constBits();
}

}
