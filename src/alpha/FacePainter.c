#include "FacePainter.h"

const char* alpha_FacePainter_VertexShader =
"uniform mat4 u_world;\n"
"\n"
"attribute vec3 a_position;\n"
"attribute vec4 a_color;\n"
"\n"
"varying highp vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_Position = u_world * vec4(a_position, 1.0);"
    "contentColor = a_color;"
"}";

const char* alpha_FacePainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
""
"varying highp vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_FragColor = contentColor;"
"}";

/**
 * Draws 3d faces in a solid color.
 */
struct alpha_FacePainter* alpha_FacePainter_new(apr_pool_t* pool)
{
    struct alpha_FacePainter* painter = apr_pcalloc(pool, sizeof(*painter));
    painter->faceProgram = glCreateProgram();
    if(painter->faceProgram == 0) {
        return 0;
    }

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_FacePainter_VertexShader,
            strlen(alpha_FacePainter_VertexShader),
            GL_VERTEX_SHADER
        )
    );

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_FacePainter_FragmentShader,
            strlen(alpha_FacePainter_FragmentShader),
            GL_FRAGMENT_SHADER
        )
    );

    glLinkProgram(painter->faceProgram);
    GLint status;
    glGetProgramiv(painter->faceProgram, GL_LINK_STATUS, &status);
    if(status != GL_TRUE) {
        return 0;
    }

    // Prepare attribute buffers.
    painter->faceBuffer = parsegraph_pagingbuffer_new(
        painter->pool, painter->faceProgram
    );
    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->faceBuffer, "a_position", 3, GL_STATIC_DRAW);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->faceBuffer, "a_color", 4, GL_STATIC_DRAW);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(
        painter->faceProgram, "u_world"
    );

    parsegraph_PagingBuffer_addDefaultPage(painter->faceBuffer);

    return painter;
};

void alpha_FacePainter_Clear(struct alpha_FacePainter* painter)
{
    parsegraph_PagingBuffer_Clear(painter->faceBuffer);
    parsegraph_PagingBuffer_addDefaultPage(painter->faceBuffer);
}

void alpha_FacePainter_Quad(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* v4, float* c1, float* c2, float* c3, float* c4)
{
    alpha_FacePainter_TriangleValues(painter, v1, v2, v3, c1, c2, c3);
    alpha_FacePainter_TriangleValues(painter, v1, v3, v4, c1, c3, c4);
};

/**
 * painter.Triangle(v1, v2, v3, c1, c2, c3);
 *
 *
 */
void alpha_FacePainter_TriangleValues(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* c1, float* c2, float* c3)
{
    parsegraph_PagingBuffer_appendData(
        painter->faceBuffer,
        painter->a_position,
        9,
        v1[0], v1[1], v1[2],
        v2[0], v2[1], v2[2],
        v3[0], v3[1], v3[2]
    );
    parsegraph_PagingBuffer_appendData(
        painter->faceBuffer,
        painter->a_color,
        12,
        c1[0], c1[1], c1[2], c1[3],
        c2[0], c2[1], c2[2], c2[3],
        c3[0], c3[1], c3[2], c3[3]
    );
}

void alpha_FacePainter_Triangle(struct alpha_FacePainter* painter, float** v, float** c)
{
    alpha_FacePainter_TriangleValues(painter, v[0], v[1], v[2], c[0], c[1], c[2]);
}

int alpha_FacePainter_Draw(struct alpha_FacePainter* painter, float* viewMatrix)
{
    if(!viewMatrix) {
        //throw new Error("A viewMatrix must be provided");
        return -1;
    }
    // Render faces.
    glUseProgram(painter->faceProgram);
    glUniformMatrix4fv(painter->u_world, 4, 0, viewMatrix);
    return parsegraph_pagingbuffer_renderPages(painter->faceBuffer);
};
