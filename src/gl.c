#include "gl.h"
#include <string.h>
#include <stdio.h>
#include "alpha/Maths.h"
#include <math.h>
#include <stdlib.h>
#include "graph/log.h"
#include "die.h"

GLuint parsegraph_compileProgram(apr_hash_t* shaders, const char* shaderName, const char* vertexShader, const char* fragShader)
{
    // Compile the shader program.
    GLuint* programID = (GLuint*)apr_hash_get(shaders, shaderName, APR_HASH_KEY_STRING);
    if(programID) {
        return *programID;
    }

    GLuint program = glCreateProgram();

    glAttachShader(
        program, compileShader(
            vertexShader, GL_VERTEX_SHADER
        )
    );

    glAttachShader(
        program, compileShader(fragShader, GL_FRAGMENT_SHADER)
    );

    glLinkProgram(program);
    GLint st;
    glGetProgramiv(program, GL_LINK_STATUS, &st);
    if(st != GL_TRUE) {
        parsegraph_die("'%s' shader program failed to link.\n", shaderName);
    }

    GLuint* progId = apr_palloc(apr_hash_pool_get(shaders), sizeof(GLuint));
    *progId = program;
    apr_hash_set(shaders, shaderName, APR_HASH_KEY_STRING, progId);
    return program;
}

// The following methods were copied from webglfundamentals.org:

/**
 * Creates and compiles a shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, VERTEX_SHADER or
 *     FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
GLuint compileShader(const char* shaderSource, GLenum shaderType)
{
  GLint shaderLen = 1 + strlen(shaderSource);

  // Create the shader object
  GLuint shader = glCreateShader(shaderType);
 
  // Set the shader source code.
  glShaderSource(shader, 1, &shaderSource, &shaderLen);
 
  // Compile the shader
  glCompileShader(shader);
 
  // Check if it compiled
  GLint success;
  glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
  if (success != GL_TRUE) {
    // Something went wrong during compilation; get the error
    //
    GLchar shaderLog[4096];
    GLsizei logLen;
    glGetShaderInfoLog(shader, 4096, &logLen, shaderLog);
    parsegraph_log("Could not compile shader: %s", shaderLog);
  }
 
  return shader;

}

/**
 * Returns a list of 2-D vertex coordinates that will create
 * a rectangle, centered at the specified position.
 */
float* parsegraph_generateRectangleVertices(apr_pool_t* pool, float x, float y, float w, float h)
{
    float* m;
    if(pool) {
        m = apr_palloc(pool, sizeof(float)*12);
    }
    else {
        m = malloc(sizeof(float)*12);
    }

    m[0] = x - w / 2;
    m[1] = y - h / 2;
    m[2] = x + w / 2;
    m[3] = y - h / 2;
    m[4] = x + w / 2;
    m[5] = y + h / 2;
    m[6] = x - w / 2;
    m[7] = y - h / 2;
    m[8] = x + w / 2;
    m[9] = y + h / 2;
    m[10] = x - w / 2;
    m[11] = y + h / 2;

    return m;
}

float* getVerts(apr_pool_t* pool, float width, float length, float height)
{
    float* m;
    if(pool) {
        m = apr_palloc(pool, sizeof(float)*3*24);
    }
    else {
        m = malloc(sizeof(float)*3*24);
    }

    // Front
    alpha_Vector_Set(&m[3*0], -width, length,  height);
    alpha_Vector_Set(&m[3*1],  width, length,  height);
    alpha_Vector_Set(&m[3*2],  width, length, -height);
    alpha_Vector_Set(&m[3*3], -width, length, -height);

    // Back
    alpha_Vector_Set(&m[3*4],  width, -length,  height);
    alpha_Vector_Set(&m[3*5], -width, -length,  height);
    alpha_Vector_Set(&m[3*6], -width, -length, -height);
    alpha_Vector_Set(&m[3*7],  width, -length, -height);

    // Left
    alpha_Vector_Set(&m[3*8],  width,  length,  height);
    alpha_Vector_Set(&m[3*9], width, -length,  height);
    alpha_Vector_Set(&m[3*10], width, -length, -height);
    alpha_Vector_Set(&m[3*11], width,  length, -height);

    //Right 
    alpha_Vector_Set(&m[3*12], -width, -length,  height);
    alpha_Vector_Set(&m[3*13], -width,  length,  height);
    alpha_Vector_Set(&m[3*14], -width,  length, -height);
    alpha_Vector_Set(&m[3*15], -width, -length, -height);

    // Top
    alpha_Vector_Set(&m[3*16],  width,  length,  height);
    alpha_Vector_Set(&m[3*17], -width,  length,  height);
    alpha_Vector_Set(&m[3*18], -width, -length,  height);
    alpha_Vector_Set(&m[3*19],  width, -length,  height);

    // Bottom
    alpha_Vector_Set(&m[3*20], -width, -length, -height);
    alpha_Vector_Set(&m[3*21], -width, -length, -height);
    alpha_Vector_Set(&m[3*22], -width,  length, -height);
    alpha_Vector_Set(&m[3*23],  width,  length, -height);

    return m;
}

float* parsegraph_generateRectangleTexcoords(apr_pool_t* pool)
{
    float* m;
    if(pool) {
        m = apr_palloc(pool, sizeof(float)*2*6);
    }
    else {
        m = malloc(sizeof(float)*2*6);
    }

    float tex[] = {
        0, 0,
        1, 0,
        1, 1,

        0, 0,
        1, 1,
        0, 1
    };

    memcpy(m, tex, sizeof(float)*2*6);
    return m;
}

GLuint createProgram(GLuint vertexShader, GLuint fragmentShader) {
  // create a program.
  GLuint program = glCreateProgram();
 
  // attach the shaders.
  glAttachShader(program, vertexShader);
  glAttachShader(program, fragmentShader);
 
  // link the program.
  glLinkProgram(program);
 
  // Check if it linked.
  GLint success;
  glGetProgramiv(program, GL_LINK_STATUS, &success);
  if (!success) {
      // something went wrong with the link
      GLchar programLog[4096];
      GLsizei logLen;
      glGetProgramInfoLog(program, 4096, &logLen, programLog);
      parsegraph_log("Program failed to link:  %s", programLog);
  }
 
  return program;
};

float* matrixIdentity3x3(apr_pool_t* pool)
{
    float* m;
    if(pool) {
        m = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        m = malloc(sizeof(float)*9);
    }
    float ident[] = {
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    };
    memcpy(m, ident, sizeof(float)*9);
    return m;
}

float* matrixCopy3x3(apr_pool_t* pool, float* src)
{
    float cop[] = {
        src[0], src[1], src[2],
        src[3], src[4], src[5],
        src[6], src[7], src[8]
    };

    float* dest;
    if(pool) {
        dest = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        dest = malloc(sizeof(float)*9);
    }
    memcpy(dest, cop, sizeof(float)*9);

    return dest;
}

float* matrixMultiply3x3(apr_pool_t* pool, float* a, float* b)
{
    float* rv = matrixCopy3x3(pool, a);
    matrixMultiply3x3I(rv, a, b);
    return rv;
}

void matrixMultiply3x3I(float* rv, float* a, float* b)
{
    float mult[] = {
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
        a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
        a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
        a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
        a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
        a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
        a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
        a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
        a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    };
    memcpy(rv, mult, sizeof(float)*9);
}

float* matrixTransform2D(apr_pool_t* pool, float* world, float x, float y)
{
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*2);
    }
    else {
        rv = malloc(sizeof(float)*2);
    }
    matrixTransform2DI(rv, world, x, y);
    return rv;
}

void matrixTransform2DI(float* rv, float* world, float x, float y)
{
    rv[0] = world[0] * x + world[1] * y + world[2];
    rv[1] = world[3] * x + world[4] * y + world[5];
}

float* makeTranslation3x3(apr_pool_t* pool, float tx, float ty)
{
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        rv = malloc(sizeof(float)*9);
    }
    makeTranslation3x3I(rv, tx, ty);
    return rv;
}

void makeTranslation3x3I(float* rv, float tx, float ty)
{
    float cop[] = {
        1, 0, 0,
        0, 1, 0,
        tx, ty, 1
    };
    memcpy(rv, cop, sizeof(float)*9);
}

float* makeRotation3x3(apr_pool_t* pool, float angleInRadians)
{
    float c = cosf(angleInRadians);
    float s = sinf(angleInRadians);

    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        rv = malloc(sizeof(float)*9);
    }

    float cop[] = {
        c,-s, 0,
        s, c, 0,
        0, 0, 1
    };
    memcpy(rv, cop, sizeof(float)*9);

    return rv;
}

float* makeScale3x3(apr_pool_t* pool, float sx, float sy)
{
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        rv = malloc(sizeof(float)*9);
    }
    makeScale3x3I(rv, sx, sy);
    return rv;
}

void makeScale3x3I(float* rv, float sx, float sy)
{
    float cop[] = {
        sx, 0, 0,
        0, sy, 0,
        0, 0, 1
    };
    memcpy(rv, cop, sizeof(float)*9);
}

float* makeInverse3x3(apr_pool_t* pool, float* input)
{
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        rv = malloc(sizeof(float)*9);
    }
    makeInverse3x3I(rv, input);
    return rv;
}

// http://stackoverflow.com/questions/983999/simple-3x3-matrix-inverse-code-c
void makeInverse3x3I(float* rv, float* input)
{
    //var m = function(col, row) {
        //return input[row * 3 + col];
    //};

    //m(0, 0) = input[0]
    //m(0, 1) = input[3]
    //m(0, 2) = input[6]
    //m(1, 0) = input[1]
    //m(1, 1) = input[4]
    //m(1, 2) = input[7]
    //m(2, 0) = input[2]
    //m(2, 1) = input[5]
    //m(2, 2) = input[8]
    // computes the inverse of a matrix m
//    var det = m(0, 0) * (m(1, 1) * m(2, 2) - m(2, 1) * m(1, 2)) -
//              m(0, 1) * (m(1, 0) * m(2, 2) - m(1, 2) * m(2, 0)) +
//              m(0, 2) * (m(1, 0) * m(2, 1) - m(1, 1) * m(2, 0));
    float det = input[0] * (input[4] * input[8] - input[5] * input[7]) -
                input[3] * (input[1] * input[8] - input[7] * input[2]) +
                input[6] * (input[1] * input[5] - input[4] * input[2]);
    float invdet = 1 / det;

//    return [
//        (m(1, 1) * m(2, 2) - m(2, 1) * m(1, 2)) * invdet,
//        (m(0, 2) * m(2, 1) - m(0, 1) * m(2, 2)) * invdet,
//        (m(0, 1) * m(1, 2) - m(0, 2) * m(1, 1)) * invdet,
//        (m(1, 2) * m(2, 0) - m(1, 0) * m(2, 2)) * invdet,
//        (m(0, 0) * m(2, 2) - m(0, 2) * m(2, 0)) * invdet,
//        (m(1, 0) * m(0, 2) - m(0, 0) * m(1, 2)) * invdet,
//        (m(1, 0) * m(2, 1) - m(2, 0) * m(1, 1)) * invdet,
//        (m(2, 0) * m(0, 1) - m(0, 0) * m(2, 1)) * invdet,
//        (m(0, 0) * m(1, 1) - m(1, 0) * m(0, 1)) * invdet
//    ];
    float cop[] = {
        (input[4] * input[8] - input[5] * input[7]) * invdet,
        (input[6] * input[5] - input[3] * input[8]) * invdet,
        (input[3] * input[7] - input[6] * input[4]) * invdet,
        (input[7] * input[2] - input[1] * input[8]) * invdet,
        (input[0] * input[8] - input[6] * input[2]) * invdet,
        (input[1] * input[6] - input[0] * input[7]) * invdet,
        (input[1] * input[5] - input[2] * input[4]) * invdet,
        (input[2] * input[3] - input[0] * input[5]) * invdet,
        (input[0] * input[4] - input[1] * input[3]) * invdet
    };
    memcpy(rv, cop, sizeof(float)*9);
}

void midPoint(float x1, float y1, float x2, float y2, float* midX, float* midY)
{
    *midX = x1 + (x2 - x1) * .5;
    *midY = y1 + (y2 - y1) * .5;
}

float* make2DProjection(apr_pool_t* pool, float width, float height, int flipVertical)
{
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*9);
    }
    else {
        rv = malloc(sizeof(float)*9);
    }
    make2DProjectionI(rv, width, height, flipVertical);
    return rv;
}

void make2DProjectionI(float* rv, float width, float height, int flipVertical)
{
    if(!flipVertical) {
        flipVertical = 1;
    }
    else {
        flipVertical = -1;
    }
    float cop[] = {
        2 / width, 0, 0,
        0, -2 / (flipVertical * height), 0,
        -1, flipVertical, 1
    };
    memcpy(rv, cop, sizeof(float)*9);
}

float* subtractVectors3D(apr_pool_t* pool, float* a, float* b) {
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*3);
    }
    else {
        rv = malloc(sizeof(float)*3);
    }
    float cop[] = {a[0] - b[0], a[1] - b[1], a[2] - b[2]};
    memcpy(rv, cop, sizeof(float)*3);
    return rv;
}

float* normalize3D(apr_pool_t* pool, float* v) {
  float length = sqrtf(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // make sure we don't divide by 0.
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*3);
  }
  else {
    rv = malloc(sizeof(float)*3);
  }
  if (length > 0.00001) {
    float cop[] = {v[0] / length, v[1] / length, v[2] / length};
    memcpy(rv, cop, sizeof(float)*3);
  } else {
    memset(rv, 0, 3*sizeof(float));
  }
  return rv;
}

float* cross3D(apr_pool_t* pool, float* a, float* b) {
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*3);
  }
  else {
    rv = malloc(sizeof(float)*3);
  }
  float cop[] = {a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]};
  memcpy(rv, cop, sizeof(float)*3);
  return rv;
}

float* makePerspective(apr_pool_t* pool, float fieldOfViewInRadians, float aspect, float near, float far)
{
  float f = tanf(M_PI * 0.5 - 0.5 * fieldOfViewInRadians);
  float rangeInv = 1.0 / (near - far);

  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float cop[] = {
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
};

float* makeTranslation4x4(apr_pool_t* pool, float tx, float ty, float tz) {
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float cop[] = {
     1,  0,  0,  0,
     0,  1,  0,  0,
     0,  0,  1,  0,
    tx, ty, tz,  1
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
}

float* makeXRotation(apr_pool_t* pool, float angleInRadians) {
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float c = cosf(angleInRadians);
  float s = sinf(angleInRadians);
  float cop[] = {
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
};

float* makeYRotation(apr_pool_t* pool, float angleInRadians) {
  float c = cosf(angleInRadians);
  float s = sinf(angleInRadians);
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float cop[] = {
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
};

float* makeZRotation(apr_pool_t* pool, float angleInRadians) {
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float c = cosf(angleInRadians);
  float s = sinf(angleInRadians);
  float cop[] = {
     c, s, 0, 0,
    -s, c, 0, 0,
     0, 0, 1, 0,
     0, 0, 0, 1,
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
}

float* makeScale4x4(apr_pool_t* pool, float sx, float sy, float sz) {
  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float cop[] = {
    sx, 0,  0,  0,
    0, sy,  0,  0,
    0,  0, sz,  0,
    0,  0,  0,  1,
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
}

float* matrixMultiply4x4(apr_pool_t* pool, float* a, float* b) {
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*16);
    }
    else {
        rv = malloc(sizeof(float)*16);
    }
  float a00 = a[0*4+0];
  float a01 = a[0*4+1];
  float a02 = a[0*4+2];
  float a03 = a[0*4+3];
  float a10 = a[1*4+0];
  float a11 = a[1*4+1];
  float a12 = a[1*4+2];
  float a13 = a[1*4+3];
  float a20 = a[2*4+0];
  float a21 = a[2*4+1];
  float a22 = a[2*4+2];
  float a23 = a[2*4+3];
  float a30 = a[3*4+0];
  float a31 = a[3*4+1];
  float a32 = a[3*4+2];
  float a33 = a[3*4+3];
  float b00 = b[0*4+0];
  float b01 = b[0*4+1];
  float b02 = b[0*4+2];
  float b03 = b[0*4+3];
  float b10 = b[1*4+0];
  float b11 = b[1*4+1];
  float b12 = b[1*4+2];
  float b13 = b[1*4+3];
  float b20 = b[2*4+0];
  float b21 = b[2*4+1];
  float b22 = b[2*4+2];
  float b23 = b[2*4+3];
  float b30 = b[3*4+0];
  float b31 = b[3*4+1];
  float b32 = b[3*4+2];
  float b33 = b[3*4+3];
  float cop[] = {a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
          a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
          a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
          a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
          a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
          a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
          a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
          a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
          a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
          a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
          a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
          a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
          a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
          a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
          a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
          a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33};
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
}

float* makeInverse4x4(apr_pool_t* pool, float* m) {
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*16);
    }
    else {
        rv = malloc(sizeof(float)*16);
    }
  float m00 = m[0 * 4 + 0];
  float m01 = m[0 * 4 + 1];
  float m02 = m[0 * 4 + 2];
  float m03 = m[0 * 4 + 3];
  float m10 = m[1 * 4 + 0];
  float m11 = m[1 * 4 + 1];
  float m12 = m[1 * 4 + 2];
  float m13 = m[1 * 4 + 3];
  float m20 = m[2 * 4 + 0];
  float m21 = m[2 * 4 + 1];
  float m22 = m[2 * 4 + 2];
  float m23 = m[2 * 4 + 3];
  float m30 = m[3 * 4 + 0];
  float m31 = m[3 * 4 + 1];
  float m32 = m[3 * 4 + 2];
  float m33 = m[3 * 4 + 3];
  float tmp_0  = m22 * m33;
  float tmp_1  = m32 * m23;
  float tmp_2  = m12 * m33;
  float tmp_3  = m32 * m13;
  float tmp_4  = m12 * m23;
  float tmp_5  = m22 * m13;
  float tmp_6  = m02 * m33;
  float tmp_7  = m32 * m03;
  float tmp_8  = m02 * m23;
  float tmp_9  = m22 * m03;
  float tmp_10 = m02 * m13;
  float tmp_11 = m12 * m03;
  float tmp_12 = m20 * m31;
  float tmp_13 = m30 * m21;
  float tmp_14 = m10 * m31;
  float tmp_15 = m30 * m11;
  float tmp_16 = m10 * m21;
  float tmp_17 = m20 * m11;
  float tmp_18 = m00 * m31;
  float tmp_19 = m30 * m01;
  float tmp_20 = m00 * m21;
  float tmp_21 = m20 * m01;
  float tmp_22 = m00 * m11;
  float tmp_23 = m10 * m01;

  float t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
  float t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
  float t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
  float t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

  float d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  float cop[] = {
    d * t0,
    d * t1,
    d * t2,
    d * t3,
    d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
    d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
    d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
    d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
    d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
    d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
    d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
    d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
    d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
    d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
    d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
    d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
  };
  memcpy(rv, cop, sizeof(float)*16);
  return rv;
}

float* matrixVectorMultiply4x4(apr_pool_t* pool, float* v, float* m) {
    float* rv;
    if(pool) {
        rv = apr_palloc(pool, sizeof(float)*16);
    }
    else {
        rv = malloc(sizeof(float)*16);
    }
  for (int i = 0; i < 4; ++i) {
    rv[i] = 0.0;
    for (int j = 0; j < 4; ++j)
      rv[i] += v[j] * m[j * 4 + i];
  }
  return rv;
};

/**
 * Returns a 4x4 matrix that, positioned from the camera position,
 * looks at the target, a position in 3-space, angled using the
 * up vector.
 */
float* makeLookAt(apr_pool_t* pool, float* cameraPosition, float* target, float* up) {
  float* zAxis = normalize3D(pool,
      subtractVectors3D(pool, cameraPosition, target));
  float* xAxis = cross3D(pool, up, zAxis);
  float* yAxis = cross3D(pool, zAxis, xAxis);

  float* rv;
  if(pool) {
    rv = apr_palloc(pool, sizeof(float)*16);
  }
  else {
    rv = malloc(sizeof(float)*16);
  }
  float cop[] = {
     xAxis[0], xAxis[1], xAxis[2], 0,
     yAxis[0], yAxis[1], yAxis[2], 0,
     zAxis[0], zAxis[1], zAxis[2], 0,
     cameraPosition[0], cameraPosition[1], cameraPosition[2], 1
  };
    memcpy(rv, cop, sizeof(float)*16);
    return rv;
}

void alpha_dumpError(GLenum err)
{
    const char* fname = "suc";
    switch(err) {
    case GL_STACK_UNDERFLOW: fname = "GL_STACK_UNDERFLOW"; break;
    case GL_STACK_OVERFLOW: fname = "GL_STACK_OVERFLOW"; break;
    case GL_OUT_OF_MEMORY: fname = "GL_OUT_OF_MEMORY"; break;
    case GL_INVALID_ENUM: fname = "GL_INVALID_ENUM"; break;
    case GL_INVALID_VALUE: fname = "GL_INVALID_VALUE"; break;
    case GL_INVALID_OPERATION: fname = "GL_INVALID_OPERATION"; break;
    case GL_NO_ERROR: fname = "GL_NO_ERROR"; break;
    }
    parsegraph_log("%s\n", fname);
}

void alpha_dumpLastError()
{
    alpha_dumpError(glGetError());
}

