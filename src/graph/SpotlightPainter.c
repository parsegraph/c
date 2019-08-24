#include "SpotlightPainter.h"
#include "log.h"
#include "../die.h"

const char* parsegraph_SpotlightPainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec2 a_texCoord;\n"
"attribute vec4 a_color;\n"
"\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " vec4 contentColor;\n"
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
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec2 texCoord;\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    HIGHP " float d = min(1.0, length(abs(st)));\n"
    "d = 1.0 - pow(d, 0.3);\n"
    "gl_FragColor = vec4(contentColor.rgb, d*contentColor.a);\n"
    //"gl_FragColor = vec4(1.0, 1.0, 1.0, d);\n"
"}\n";

static const char* shaderName = "parsegraph_SpotlightPainter";

parsegraph_SpotlightPainter* parsegraph_SpotlightPainter_new(apr_pool_t* ppool, apr_hash_t* shaders)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create SpotlightPainter memory pool.");
    }
    parsegraph_SpotlightPainter* painter = apr_palloc(pool, sizeof(*painter));
    painter->pool = pool;

    painter->_program = parsegraph_compileProgram(shaders, shaderName,
        parsegraph_SpotlightPainter_VertexShader,
        parsegraph_SpotlightPainter_FragmentShader
    );

    // Prepare attribute buffers.
    painter->_spotlightBuffer = parsegraph_pagingbuffer_new(pool, painter->_program);

    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_position", 2, GL_STATIC_DRAW);
    painter->a_texCoord = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_texCoord", 2, GL_STATIC_DRAW);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->_spotlightBuffer, "a_color", 4, GL_STATIC_DRAW);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->_program, "u_world");

    parsegraph_pagingbuffer_addDefaultPage(painter->_spotlightBuffer);
    return painter;
}

void parsegraph_SpotlightPainter_destroy(parsegraph_SpotlightPainter* painter)
{
    parsegraph_pagingbuffer_destroy(painter->_spotlightBuffer);
    apr_pool_destroy(painter->pool);
}

void parsegraph_SpotlightPainter_drawSpotlight(parsegraph_SpotlightPainter* painter, float cx, float cy, float radius, float* color)
{
    //parsegraph_log("Spotlight at (%f, %f) of size %f\n", cx, cy, radius);
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

    //parsegraph_log("Color is %f, %f, %f, %f\n", color[0], color[1], color[2], color[3]);
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
    parsegraph_PagingBuffer_addDefaultPage(painter->_spotlightBuffer);
}

void parsegraph_SpotlightPainter_render(parsegraph_SpotlightPainter* painter, float* world, float scale)
{
    // Render spotlights.
    glUseProgram(painter->_program);
    glUniformMatrix3fv(painter->u_world, 1, 0, world);
    parsegraph_pagingbuffer_renderPages(painter->_spotlightBuffer);
}
