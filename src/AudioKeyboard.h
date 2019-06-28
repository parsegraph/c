#ifndef parsegraph_AudioKeyboard_INCLUDED
#define parsegraph_AudioKeyboard_INCLUDED

#include "graph/Camera.h"
#include "graph/GlyphAtlas.h"
#include "graph/BlockPainter.h"

struct parsegraph_AudioKeyboard {
parsegraph_Camera* _camera;
float _worldX;
float _worldY;
float _userScale;
int _paintingDirty;
parsegraph_GlyphAtlas* _glyphAtlas;
apr_hash_t* _shaders;
parsegraph_BlockPainter* _blackKeyPainter;
parsegraph_BlockPainter* _whiteKeyPainter;
};
typedef struct parsegraph_AudioKeyboard parsegraph_AudioKeyboard;

parsegraph_AudioKeyboard* parsegraph_AudioKeyboard_new(parsegraph_Camera* camera, float worldX, float worldY, float userScale);
int parsegraph_AudioKeyboard_prepared(parsegraph_AudioKeyboard* piano);
void parsegraph_AudioKeyboard_prepare(parsegraph_AudioKeyboard* piano, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders);
void parsegraph_AudioKeyboard_paint(parsegraph_AudioKeyboard* piano);
void parsegraph_AudioKeyboard_setOrigin(parsegraph_AudioKeyboard* piano, float x, float y);
void parsegraph_AudioKeyboard_setScale(parsegraph_AudioKeyboard* piano, float scale);
void parsegraph_AudioKeyboard_render(parsegraph_AudioKeyboard* piano, float* world);
void parsegraph_AudioKeyboard_destroy(parsegraph_AudioKeyboard* piano);

#endif // parsegraph_AudioKeyboard_INCLUDED
