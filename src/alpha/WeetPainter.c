#include "WeetPainter.h"
#include <stdio.h>
#include <stdlib.h>
#include "alpha/Maths.h"

const char* alpha_WeetPainter_VertexShader =
"uniform mat4 u_world;\n"
"\n"
"attribute vec4 a_position;\n"
"attribute vec4 a_color;\n"
"\n"
"varying vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_Position = u_world * a_position;"
    "contentColor = a_color;"
"}";

const char* alpha_WeetPainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
""
"varying vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_FragColor = contentColor;"
"}";

alpha_WeetPainter* alpha_WeetPainter_new(apr_pool_t* pool)
{
    alpha_WeetPainter* painter;
    if(pool) {
        painter = apr_palloc(pool, sizeof(*painter));
    }
    else {
        painter = malloc(sizeof(*painter));
    }
    painter->pool = pool;
    painter->_numCubes = 0;

    painter->_posData = 0;
    painter->_colorData = 0;

    painter->faceProgram = glCreateProgram();

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_WeetPainter_VertexShader,
            GL_VERTEX_SHADER
        )
    );

    glAttachShader(
        painter->faceProgram,
        compileShader(
            alpha_WeetPainter_FragmentShader,
            GL_FRAGMENT_SHADER
        )
    );

    glLinkProgram(painter->faceProgram);
    GLint success;
    glGetProgramiv(
        painter->faceProgram, GL_LINK_STATUS, &success
    );
    if(!success) {
        fprintf(stderr, "alpha_WeetPainter program failed to link.");
        GLchar programLog[4096];
        GLsizei logLen;
        glGetProgramInfoLog(painter->faceProgram, 4096, &logLen, programLog);
    }

    // Prepare attribute buffers.
    painter->a_position = glGetAttribLocation(painter->faceProgram, "a_position");
    painter->a_color = glGetAttribLocation(painter->faceProgram, "a_color");

    // Cache program locations.
    painter->u_world = glGetUniformLocation(
        painter->faceProgram, "u_world"
    );

    painter->_posBuffer = 0;
    painter->_colorBuffer = 0;

    return painter;
}

static float alpha_CUBE_VERTICES[] = {
    // Front
    -1, 1, 1, // v0
     1, 1, 1, // v1
     1, 1,-1, // v2
    -1, 1,-1, // v3

    // Back
     1,-1, 1, // v4
    -1,-1, 1, // v5
    -1,-1,-1, // v6
     1,-1,-1, // v7

    // Left
    1, 1, 1, // v1
    1,-1, 1, // v4
    1,-1,-1, // v7
    1, 1,-1, // v2

    // Right
    -1,-1, 1, // v5
    -1, 1, 1, // v0
    -1, 1,-1, // v3
    -1,-1,-1, // v6

    // Top
     1, 1, 1, // v1
    -1, 1, 1, // v0
    -1,-1, 1, // v5
     1,-1, 1, // v4

    // Bottom
     1,-1,-1, // v7
    -1,-1,-1, // v6
    -1, 1,-1, // v3
     1, 1,-1 //v2
};

static float alpha_CUBE_COLORS[] = {
    1, 1, 0, // 0
    0, 1, 1, // 5
    1, 0, 1, // 1
    0, 0, 1, // 2
    1, 0, 0, // 3
    0, 1, 0 // 4
};

void alpha_WeetPainter_Init(alpha_WeetPainter* painter, unsigned int numCubes)
{
    if(!painter->_posBuffer) {
        glGenBuffers(1, &painter->_posBuffer);
    }

    if(painter->_posData && !painter->pool) {
        free(painter->_posData);
        painter->_posData = 0;
    }
    if(painter->_colorData && !painter->pool) {
        free(painter->_colorData);
        painter->_colorData = 0;
    }

    int vertexCount = numCubes*6*6;
    int floatCount = vertexCount*4;
    int byteCount = floatCount*sizeof(float);
    if(painter->pool) {
        painter->_posData = apr_palloc(painter->pool, byteCount);
        painter->_colorData = apr_palloc(painter->pool, byteCount);
    }
    else {
        painter->_posData = malloc(byteCount);
        painter->_colorData = malloc(byteCount);
    }
    //fprintf(stderr, "Data is %d floats large\n", floatCount);

    painter->_dataX = 0;

    if(!painter->_colorBuffer) {
        glGenBuffers(1, &painter->_colorBuffer);
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->_colorBuffer);
    unsigned int x = 0;
    for(unsigned int i = 0; i < numCubes; ++i) {
        // Cube
        for(unsigned int j = 0; j < 6; ++j) {
            // Face
            float* col = &alpha_CUBE_COLORS[3*j];
            for(unsigned int k = 0; k < 6; ++k) {
                // Vertex
                painter->_colorData[x++] = col[0];
                painter->_colorData[x++] = col[1];
                painter->_colorData[x++] = col[2];
                painter->_colorData[x++] = 1.0;
            }
        }
    }
    //fprintf(stderr, "color floats rendered = %d\n", sizeof(float)*x);
    glBufferData(GL_ARRAY_BUFFER, sizeof(float)*x, painter->_colorData, GL_STATIC_DRAW);
    painter->_numCubes = numCubes;
}

void alpha_WeetPainter_Clear(alpha_WeetPainter* painter)
{
    painter->_dataX = 0;
}

int alpha_WeetPainter_Cube(alpha_WeetPainter* painter, float* m)
{
    if(!painter->_posData) {
        fprintf(stderr, "Init must be called first");
        return -1;
    }

    int idx[] = {
        // Front, COLOR
        0, 1, 2, 3, 0,
        // Back
        4, 5, 6, 7, 5,
        // Left
        8, 9, 10, 11, 1,
        // Right
        12, 13, 14, 15, 2,
        // Top
        16, 17, 18, 19, 3,
        // Bottom
        20, 21, 22, 23, 4
    };

    int fdx[] = {
        0, 1, 2, 0, 2, 3
    };

    for(int faceNum = 0; faceNum < 6; ++faceNum) {
        float* cf[4];
        cf[0] = &alpha_CUBE_VERTICES[3 * idx[faceNum * 5]];
        cf[1] = &alpha_CUBE_VERTICES[3 * idx[faceNum * 5 + 1]];
        cf[2] = &alpha_CUBE_VERTICES[3 * idx[faceNum * 5 + 2]];
        cf[3] = &alpha_CUBE_VERTICES[3 * idx[faceNum * 5 + 3]];
        //int cc = idx[faceNum * 6 + 4];

        for(int vertexNum = 0; vertexNum < 6; ++vertexNum) {
            float* v = cf[fdx[vertexNum]];
            painter->_posData[painter->_dataX++] = (m[0] * v[0] + m[1] * v[1] + m[2] * v[2]) + m[12];
            painter->_posData[painter->_dataX++] = (m[4] * v[0] + m[5] * v[1] + m[6] * v[2]) + m[13];
            painter->_posData[painter->_dataX++] = (m[8] * v[0] + m[9] * v[1] + m[10] * v[2]) + m[14];
            painter->_posData[painter->_dataX++] = 1.0;
            //fprintf(stderr, "%d.%d (%f, %f, %f)\n", faceNum, vertexNum,
	//(m[0] * v[0] + m[1] * v[1] + m[2] * v[2]) + m[12],
	//(m[4] * v[0] + m[5] * v[1] + m[6] * v[2]) + m[13],
	//(m[8] * v[0] + m[9] * v[1] + m[10] * v[2]) + m[14]
	 //);
        }
    }
    //fprintf(stderr, "Populating cube with %d \n", painter->_dataX);

    return 0;
}

void alpha_WeetPainter_Draw(alpha_WeetPainter* painter, float* viewMatrix)
{
    if(!viewMatrix) {
        fprintf(stderr, "A viewMatrix must be provided");
        return;
    }

    // Render faces.
    glUseProgram(painter->faceProgram);
    //glDisable(GL_CULL_FACE);
    //glDisable(GL_DEPTH_TEST);

    glUniformMatrix4fv(painter->u_world, 1, GL_FALSE, viewMatrix);

    glBindBuffer(GL_ARRAY_BUFFER, painter->_posBuffer);
    if(!painter->_posData) {
        fprintf(stderr, "Position data is falsy!");
        exit(-1);
    }

    glBindBuffer(GL_ARRAY_BUFFER, painter->_posBuffer);
    //fprintf(stderr, "dataX * sizeof(float)= %d\n", sizeof(float)*painter->_dataX);
    glBufferData(GL_ARRAY_BUFFER, sizeof(float)*painter->_dataX, painter->_posData, GL_STREAM_DRAW);
    glVertexAttribPointer(painter->a_position, 4, GL_FLOAT, GL_FALSE, 0, 0);
    glEnableVertexAttribArray(painter->a_position);

    glBindBuffer(GL_ARRAY_BUFFER, painter->_colorBuffer);
    glVertexAttribPointer(painter->a_color, 4, GL_FLOAT, GL_FALSE, 0, 0);
    glEnableVertexAttribArray(painter->a_color);

    //fprintf(stderr, "num rendered = %d\n", (int)(painter->_dataX/4));
    glDrawArrays(GL_TRIANGLES, 0, painter->_dataX/4);

    glDisableVertexAttribArray(painter->a_position);
    glDisableVertexAttribArray(painter->a_color);
}
