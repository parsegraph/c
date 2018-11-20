#include "SpotlightPainter.h"
#include "../die.h"

const char* parsegraph_SpotlightPainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec2 a_texCoord;\n"
"attribute vec4 a_color;\n"
"\n"
"varying highp vec2 texCoord;\n"
"varying highp vec4 contentColor;\n"
"\n"
"void main() {\n"
    "contentColor = a_color;\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
    "texCoord = a_texCoord;\n"
"}\n";

const char* parsegraph_SpotlightPainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying highp vec4 contentColor;\n"
"varying highp vec2 texCoord;\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    "highp float d = min(1.0, length(abs(st)));\n"
    "d = 1.0 - pow(d, 0.2);\n"
    "gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);\n"
"}\n";

static const char* shaderName = "parsegraph_SpotlightPainter";

parsegraph_SpotlightPainter* parsegraph_SpotlightPainter_new(parsegraph_Surface* surface, apr_hash_t* shaders)
{
    parsegraph_SpotlightPainter* painter = apr_palloc(surface->pool, sizeof(*painter));
    painter->pool = surface->pool;

    // Compile the shader program.
    if(!apr_hash_get(shaders, shaderName, APR_HASH_KEY_STRING)) {
        GLuint program = glCreateProgram();

        glAttachShader(
            program,
            compileShader(
                parsegraph_SpotlightPainter_VertexShader,
                GL_VERTEX_SHADER
            )
        );

        glAttachShader(
            program,
            compileShader(
                parsegraph_SpotlightPainter_FragmentShader,
                GL_FRAGMENT_SHADER
            )
        );

        glLinkProgram(program);
        GLint linkStatus;
        glGetProgramiv(program, GL_LINK_STATUS, &linkStatus);
        if(linkStatus != GL_TRUE) {
            parsegraph_die("SpotlightPainter program failed to link.");
        }

        apr_hash_set(shaders, shaderName, APR_HASH_KEY_STRING, (void*)(long)program);
    }
    painter->_program = (long)apr_hash_get(shaders, shaderName, APR_HASH_KEY_STRING);

    // Prepare attribute buffers.
    painter->_spotlightBuffer = parsegraph_pagingbuffer_new(surface->pool, painter->_program);

    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_position", 2, GL_STATIC_DRAW);
    painter->a_texCoord = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_texCoord", 2, GL_STATIC_DRAW);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_color", 4, GL_STATIC_DRAW);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->_program, "u_world");

    parsegraph_pagingbuffer_addDefaultPage(painter->_spotlightBuffer);
    return painter;
}

void parsegraph_SpotlightPainter_drawSpotlight(parsegraph_SpotlightPainter* painter, float cx, float cy, float radius, float* color)
{
    //console.log(cx + ", " + cy + ", " + radius + " " + color.toString());
    // Append position data.
    parsegraph_pagingbuffer_appendArray(painter->_spotlightBuffer,
        painter->a_position,
        12,
        parsegraph_generateRectangleVertices(
            painter->pool,
            cx, cy, radius * 2, radius * 2
        )
    );

    // Append texture coordinate data.
    parsegraph_pagingbuffer_appendArray(painter->_spotlightBuffer, painter->a_texCoord,
        12,
        parsegraph_generateRectangleTexcoords(painter->pool)
    );

    // Append color data.
    for(int k = 0; k < 3 * 2; ++k) {
        parsegraph_PagingBuffer_appendRGBA(painter->_spotlightBuffer, painter->a_color,
            color[0],
            color[1],
            color[2],
            color[3]
        );
    }
}

void parsegraph_SpotlightPainter_drawRectSpotlight(parsegraph_SpotlightPainter* painter, float cx, float cy, float w, float h, float* color)
{
    // Append position data.
    parsegraph_pagingbuffer_appendArray(painter->_spotlightBuffer,
        painter->a_position, 12,
        parsegraph_generateRectangleVertices(painter->pool,
            cx, cy, w, h
        )
    );

    // Append texture coordinate data.
    parsegraph_pagingbuffer_appendArray(painter->_spotlightBuffer,
        painter->a_texCoord, 12,
        parsegraph_generateRectangleTexcoords(painter->pool)
    );

    // Append color data.
    for(int k = 0; k < 3 * 2; ++k) {
        parsegraph_PagingBuffer_appendRGBA(painter->_spotlightBuffer,
            painter->a_color,
            color[0],
            color[1],
            color[2],
            color[3]
        );
    }
}

void parsegraph_SpotlightPainter_clear(parsegraph_SpotlightPainter* painter)
{
    parsegraph_pagingbuffer_clear(painter->_spotlightBuffer);
    parsegraph_pagingbuffer_addDefaultPage(painter->_spotlightBuffer);
}

void parsegraph_SpotlightPainter_render(parsegraph_SpotlightPainter* painter, float* world, float scale)
{
    // Render spotlights.
    glUseProgram(painter->_program);
    glUniformMatrix3fv(painter->u_world, 1, 0, world);
    parsegraph_pagingbuffer_renderPages(painter->_spotlightBuffer);
}
