extern "C" {
#include "GlyphAtlas.h"
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
    return fm.width(QString::fromUtf16(text, len));
}

void* parsegraph_GlyphAtlas_createTexture(parsegraph_GlyphAtlas* glyphAtlas)
{
    int maxTextureWidth = parsegraph_GlyphAtlas_maxTextureWidth(glyphAtlas);
    return new QImage(maxTextureWidth, maxTextureWidth, QImage::Format_RGB888);
}

void parsegraph_GlyphAtlas_destroyTexture(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    delete static_cast<QImage*>(texture);
}

void parsegraph_GlyphAtlas_renderGlyph(parsegraph_GlyphAtlas* glyphAtlas, parsegraph_GlyphData* glyphData, void* texture)
{
    QPainter p(static_cast<QImage*>(texture));
    p.setFont(*static_cast<QFont*>(glyphAtlas->_font));
    p.drawText(glyphData->x, glyphData->y + parsegraph_GlyphAtlas_fontBaseline(glyphAtlas), glyphData->width, glyphData->height, 0, QString::fromUtf16(glyphData->letter, glyphData->length), nullptr);
}

const GLvoid* parsegraph_GlyphAtlas_getTextureData(parsegraph_GlyphAtlas* glyphAtlas, void* texture)
{
    return static_cast<QImage*>(texture)->constBits();
}

}
