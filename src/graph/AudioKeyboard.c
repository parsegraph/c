#include "AudioKeyboard.h"
#include <math.h>
#include "die.h"

parsegraph_AudioKeyboard* parsegraph_AudioKeyboard_new(parsegraph_Camera* camera, float worldX, float worldY, float userScale)
{
    parsegraph_AudioKeyboard* piano = apr_palloc(camera->surface->pool, sizeof(*piano));
    piano->_camera = camera;

    piano->_worldX = 0;
    piano->_worldY = 0;
    piano->_userScale = 1;
    piano->_paintingDirty = 1;

    piano->_shaders = 0;
    piano->_glyphAtlas = 0;

    piano->_blackKeyPainter = 0;
    piano->_whiteKeyPainter = 0;

    return piano;
}

int parsegraph_AudioKeyboard_prepared(parsegraph_AudioKeyboard* piano)
{
    return 1;
};

void parsegraph_AudioKeyboard_prepare(parsegraph_AudioKeyboard* piano, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    piano->_glyphAtlas = glyphAtlas;
    piano->_shaders = shaders;
}

void parsegraph_AudioKeyboard_paint(parsegraph_AudioKeyboard* piano)
{
    if(!piano->_paintingDirty) {
        return;
    }
    float white[] = {1,1,1,1};
    float highlight = 0.2;
    float whiteBorder[] = {1-highlight, 1-highlight, 1-highlight, 1};
    float black[] = {0, 0, 0, 1};
    float blackBorder[] = {2*highlight, 2*highlight, 2*highlight, 1};
    if(!piano->_whiteKeyPainter) {
        piano->_whiteKeyPainter = parsegraph_BlockPainter_new(piano->_camera->surface, piano->_shaders);
        parsegraph_BlockPainter_setBorderColor(piano->_whiteKeyPainter, whiteBorder);
        parsegraph_BlockPainter_setBackgroundColor(piano->_whiteKeyPainter, white);
    }
    else {
        parsegraph_BlockPainter_clear(piano->_whiteKeyPainter);
    }
    if(!piano->_blackKeyPainter) {
        piano->_blackKeyPainter = parsegraph_BlockPainter_new(piano->_camera->surface, piano->_shaders);
        parsegraph_BlockPainter_setBorderColor(piano->_blackKeyPainter, blackBorder);
        parsegraph_BlockPainter_setBackgroundColor(piano->_blackKeyPainter, black);
    }
    else {
        parsegraph_BlockPainter_clear(piano->_blackKeyPainter);
    }

    int maxKeys = 1000;
    parsegraph_BlockPainter_initBuffer(piano->_whiteKeyPainter, maxKeys);
    parsegraph_BlockPainter_initBuffer(piano->_blackKeyPainter, maxKeys);

    float borderRoundedess = 2;
    float borderThickness = 2;

    float whiteKeyWidth = 36;
    float whiteKeyHeight = 210;
    for(int i = 0; i < maxKeys; ++i) {
        parsegraph_BlockPainter_drawBlock(piano->_whiteKeyPainter,
            piano->_worldX + whiteKeyWidth * i + whiteKeyWidth/2,
            piano->_worldY + whiteKeyHeight/2,
            whiteKeyWidth,
            whiteKeyHeight,
            borderRoundedess,
            borderThickness,
            piano->_userScale
        );
    }

    float blackKeyWidth = 22.5;
    float blackKeyHeight = 138;
    for(int i = 0; i < maxKeys; ++i) {
        if(i == maxKeys - 1) {
            continue;
        }
        float wx = piano->_worldX + whiteKeyWidth * (i+.5);
        float kx = 0;
        switch(i % 7) {
        case 0:
            kx = wx + blackKeyWidth*(25/36);
            break;
        case 1:
            kx = wx + blackKeyWidth*(34/36);
            break;
        case 2:
            continue;
        case 3:
            kx = wx + blackKeyWidth*(20.5/36);
            break;
        case 4:
            kx = wx + blackKeyWidth*(28.5/36);
            break;
        case 5:
            kx = wx + blackKeyWidth*(36/36);
            break;
        case 6:
            continue;
        }
        parsegraph_BlockPainter_drawBlock(piano->_blackKeyPainter,
            kx,
            piano->_worldY + blackKeyHeight/2,
            blackKeyWidth,
            blackKeyHeight,
            borderRoundedess,
            borderThickness,
            piano->_userScale
        );
    }
    piano->_paintingDirty = 0;
}

void parsegraph_AudioKeyboard_setOrigin(parsegraph_AudioKeyboard* piano, float x, float y)
{
    piano->_worldX = x;
    piano->_worldY = y;

    if(isnan(piano->_worldX)) {
        parsegraph_die("WorldX must not be NaN.");
    }
    if(isnan(piano->_worldY)) {
        parsegraph_die("WorldY must not be NaN.");
    }
}

void parsegraph_AudioKeyboard_setScale(parsegraph_AudioKeyboard* piano, float scale)
{
    piano->_userScale = scale;
    if(isnan(piano->_userScale)) {
        parsegraph_die("Scale must not be NaN.");
    }
}

void parsegraph_AudioKeyboard_render(parsegraph_AudioKeyboard* piano, float* world)
{
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    //glDisable(GL_DEPTH_TEST);
    //glDisable(GL_BLEND);
    parsegraph_BlockPainter_render(piano->_whiteKeyPainter, world);
    parsegraph_BlockPainter_render(piano->_blackKeyPainter, world);
}
