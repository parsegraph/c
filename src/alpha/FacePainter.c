#include "FacePainter.h"
#include <stdlib.h>
#include <stdio.h>
#include "../die.h"
#include "../graph/log.h"

const char* alpha_FacePainter_VertexShader =
"attribute vec4 a_position;\n"
"attribute vec4 a_color;\n"
"varying vec4 contentColor;\n"
"uniform mat4 u_world;\n"
"void main() {\n"
    "gl_Position = u_world * vec4(a_position.xyz, 1.0);\n"
    "contentColor = a_color;\n"
"}\n";

const char* alpha_FacePainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"varying vec4 contentColor;\n"
"void main() {\n"
    "gl_FragColor = contentColor;\n"
"}\n";

/**
 * Draws 3d faces in a solid color.
 */
struct alpha_FacePainter* alpha_FacePainter_new(apr_pool_t* pool)
{
    struct alpha_FacePainter* painter = apr_pcalloc(pool, sizeof(*painter));
    painter->faceProgram = glCreateProgram();
    if(painter->faceProgram == 0) {
        parsegraph_die("Failed to create GL program");
    }

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_FacePainter_VertexShader,
            GL_VERTEX_SHADER
        )
    );

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_FacePainter_FragmentShader,
            GL_FRAGMENT_SHADER
        )
    );

    glLinkProgram(painter->faceProgram);
    GLint status;
    glGetProgramiv(painter->faceProgram, GL_LINK_STATUS, &status);
    if(status != GL_TRUE) {
        parsegraph_log("GLSL version: %s", glGetString(GL_SHADING_LANGUAGE_VERSION));
        GLsizei logLen;
        char progLog[1024];
        glGetProgramInfoLog(painter->faceProgram, 1024, &logLen, progLog);
        parsegraph_log(alpha_FacePainter_VertexShader);
        parsegraph_log(progLog);
        parsegraph_die("GL program failed to compile and link");
    }

    // Prepare attribute buffers.
    painter->pool = pool;
    painter->numVertices = 0;
    painter->vertexCapacity = 1024;

    painter->positionBuffer = malloc(4*sizeof(float)*painter->vertexCapacity);
    memset(painter->positionBuffer, 0, sizeof(float)*4*painter->vertexCapacity);

    painter->colorBuffer = malloc(4*sizeof(float)*painter->vertexCapacity);
    memset(painter->colorBuffer, 0, sizeof(float)*4*painter->vertexCapacity);

    painter->a_position = glGetAttribLocation(painter->faceProgram, "a_position");
    painter->a_color = glGetAttribLocation(painter->faceProgram, "a_color");

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->faceProgram, "u_world");

    painter->positionGLBuffer = 0;
    painter->colorGLBuffer = 0;

    return painter;
};

void alpha_FacePainter_Clear(struct alpha_FacePainter* painter)
{
    painter->numVertices = 0;
}

void alpha_FacePainter_Quad(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* v4, float* c1, float* c2, float* c3, float* c4)
{
    alpha_FacePainter_TriangleValues(painter, v1, v2, v3, c1, c2, c3);
    alpha_FacePainter_TriangleValues(painter, v1, v3, v4, c1, c3, c4);
};

/**
 * painter.Triangle(v1, v2, v3, c1, c2, c3);
 */
void alpha_FacePainter_TriangleValues(struct alpha_FacePainter* painter, float* v1, float* v2, float* v3, float* c1, float* c2, float* c3)
{
    while(painter->numVertices + 3 >= painter->vertexCapacity) {
        painter->vertexCapacity *= 2;
        painter->positionBuffer = realloc(painter->positionBuffer, painter->vertexCapacity*4*sizeof(float));
        painter->colorBuffer = realloc(painter->colorBuffer, painter->vertexCapacity*4*sizeof(float));
        //memset(painter->positionBuffer + (4*painter->vertexCapacity/2), 0, 4*sizeof(float)*(painter->vertexCapacity/2));
        //memset(painter->colorBuffer + (4*painter->vertexCapacity/2), 0, 4*sizeof(float)*(painter->vertexCapacity/2));
    }

    memcpy(painter->positionBuffer + (4*painter->numVertices), v1, sizeof(float)*4);
    memcpy(painter->positionBuffer + (4*(painter->numVertices + 1)), v2, sizeof(float)*4);
    memcpy(painter->positionBuffer + (4*(painter->numVertices + 2)), v3, sizeof(float)*4);

    memcpy(painter->colorBuffer + (4*painter->numVertices), c1, sizeof(float)*4);
    memcpy(painter->colorBuffer + (4*(painter->numVertices + 1)), c2, sizeof(float)*4);
    memcpy(painter->colorBuffer + (4*(painter->numVertices + 2)), c3, sizeof(float)*4);

    painter->numVertices += 3;
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
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glUniformMatrix4fv(painter->u_world, 1, 0, viewMatrix);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }

    if(!painter->positionGLBuffer) {
        glGenBuffers(1, &painter->positionGLBuffer);
        if(glGetError() != GL_NO_ERROR) {
            fprintf(stderr, "Error encountered.\n");
            return -1;
        }
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->positionGLBuffer);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glBufferData(GL_ARRAY_BUFFER, 4*painter->numVertices * sizeof(float), painter->positionBuffer, GL_STATIC_DRAW);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glVertexAttribPointer(painter->a_position, 4, GL_FLOAT, 0, 0, 0);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glEnableVertexAttribArray(painter->a_position);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }

    if(!painter->colorGLBuffer) {
        glGenBuffers(1, &painter->colorGLBuffer);
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->colorGLBuffer);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glBufferData(GL_ARRAY_BUFFER, 4*painter->numVertices * sizeof(float), painter->colorBuffer, GL_STATIC_DRAW);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glVertexAttribPointer(painter->a_color, 4, GL_FLOAT, 0, 0, 0);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }
    glEnableVertexAttribArray(painter->a_color);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "Error encountered.\n");
        return -1;
    }

    glDrawArrays(GL_TRIANGLES, 0, painter->numVertices);
    if(glGetError() != GL_NO_ERROR) {
        fprintf(stderr, "glDrawArrays error encountered.\n");
        return -1;
    }

    glDisableVertexAttribArray(painter->a_position);
    glDisableVertexAttribArray(painter->a_color);

    return 0;
}
