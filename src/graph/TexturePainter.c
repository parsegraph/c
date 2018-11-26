#include "TexturePainter.h"
#include "../die.h"
#include "Color.h"

static const char* parsegraph_TexturePainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec2 a_texCoord;\n"
"\n"
"varying highp vec2 texCoord;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
   "texCoord = a_texCoord;\n"
"}\n";

static const char* parsegraph_TexturePainter_FragmentShader =
"uniform sampler2D u_texture;\n"
"varying highp vec2 texCoord;\n"
"\n"
"void main() {\n"
    "gl_FragColor = texture2D(u_texture, texCoord.st);\n"
"}\n";

parsegraph_TexturePainter* parsegraph_TexturePainter_new(parsegraph_Surface* surface, int textureId, float texWidth, float texHeight, apr_hash_t* shaders)
{
    parsegraph_TexturePainter* painter = apr_palloc(surface->pool, sizeof(*painter));

    // Compile the shader program.
    painter->_textureProgram = parsegraph_compileProgram(shaders, "parsegraph_TexturePainter",
        parsegraph_TexturePainter_VertexShader,
        parsegraph_TexturePainter_FragmentShader
    );
    painter->_texture = textureId;
    painter->_texWidth = texWidth;
    painter->_texHeight = texHeight;

    // Prepare attribute buffers.
    painter->_buffer = parsegraph_pagingbuffer_new(surface->pool, painter->_textureProgram);
    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->_buffer, "a_position", 2, 0);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->_buffer, "a_color", 4, 0);
    painter->a_backgroundColor = parsegraph_pagingbuffer_defineAttrib(painter->_buffer, "a_backgroundColor", 4, 0);
    painter->a_texCoord = parsegraph_pagingbuffer_defineAttrib(painter->_buffer, "a_texCoord", 2, 0);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(
        painter->_textureProgram, "u_world"
    );
    painter->u_texture = glGetUniformLocation(
        painter->_textureProgram, "u_texture"
    );

    parsegraph_Color_SetRGBA(painter->_color, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(painter->_backgroundColor, 0, 0, 0, 0);

    parsegraph_PagingBuffer_addDefaultPage(painter->_buffer);

    return painter;
}

int parsegraph_TexturePainter_texture(parsegraph_TexturePainter* painter)
{
    return painter->_texture;
}

void parsegraph_TexturePainter_drawWholeTexture(parsegraph_TexturePainter* painter, float x, float y, float width, float height, float scale)
{
    parsegraph_TexturePainter_drawTexture(painter,
        0, 0, painter->_texWidth, painter->_texHeight,
        x, y, width, height, scale
    );
}

void parsegraph_TexturePainter_drawTexture(parsegraph_TexturePainter* painter,
    float iconX, float iconY, float iconWidth, float iconHeight,
    float x, float y, float width, float height,
    float scale)
{
    // Append position data.
    parsegraph_PagingBuffer_appendData(painter->_buffer,
        painter->a_position,
        12,
        x, y,
        x + width * scale, y,
        x + width * scale, y + height * scale,
        x, y,
        x + width * scale, y + height * scale,
        x, y + height * scale
    );

    // Append texture coordinate data.
    parsegraph_PagingBuffer_appendData(painter->_buffer,
        painter->a_texCoord,
        12,
        iconX / painter->_texWidth,
        (iconY + iconHeight) / painter->_texHeight,

        (iconX + iconWidth) / painter->_texWidth,
        (iconY + iconHeight) / painter->_texHeight,

        (iconX + iconWidth) / painter->_texWidth,
        iconY / painter->_texHeight,

        iconX / painter->_texWidth,
        (iconY + iconHeight) / painter->_texHeight,

        (iconX + iconWidth) / painter->_texWidth,
        iconY / painter->_texHeight,

        iconX / painter->_texWidth,
        iconY / painter->_texHeight
    );
}

void parsegraph_TexturePainter_clear(parsegraph_TexturePainter* painter)
{
    parsegraph_pagingbuffer_clear(painter->_buffer);
    parsegraph_PagingBuffer_addDefaultPage(painter->_buffer);
};

void parsegraph_TexturePainter_render(parsegraph_TexturePainter* painter, float* world)
{
    // Load program.
    glUseProgram(painter->_textureProgram);

    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, painter->_texture);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glUniform1i(painter->u_texture, 0);

    // Render text.
    glUniformMatrix3fv(painter->u_world, 1, 0, world);
    parsegraph_pagingbuffer_renderPages(painter->_buffer);
}
