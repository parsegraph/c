#ifndef parsegraph_TexturePainter_INCLUDED
#define parsegraph_TexturePainter_INCLUDED

#include "../gl.h"
#include "../pagingbuffer.h"
#include "Surface.h"
#include <apr_hash.h>

struct parsegraph_TexturePainter {
GLuint _textureProgram;
int _texture;
float _texWidth;
float _texHeight;
parsegraph_pagingbuffer* _buffer;
int a_position;
int a_color;
int a_backgroundColor;
int a_texCoord;
int u_world;
int u_texture;
float _color[4];
float _backgroundColor[4];
};
typedef struct parsegraph_TexturePainter parsegraph_TexturePainter;

parsegraph_TexturePainter* parsegraph_TexturePainter_new(parsegraph_Surface* surface, int textureId, float texWidth, float texHeight, apr_hash_t* shaders);
int parsegraph_TexturePainter_texture(parsegraph_TexturePainter* painter);
void parsegraph_TexturePainter_drawWholeTexture(parsegraph_TexturePainter* painter, float x, float y, float width, float height, float scale);
void parsegraph_TexturePainter_drawTexture(parsegraph_TexturePainter* painter,
    float iconX, float iconY, float iconWidth, float iconHeight,
    float x, float y, float width, float height,
    float scale);
void parsegraph_TexturePainter_clear(parsegraph_TexturePainter* painter);
void parsegraph_TexturePainter_render(parsegraph_TexturePainter* painter, float* world);

#endif // parsegraph_TexturePainter_INCLUDED
