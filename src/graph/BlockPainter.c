#include "BlockPainter.h"
#include "log.h"
#include <stdlib.h>
#include <math.h>
#include <stdio.h>
#include "Rect.h"
#include "Color.h"
#include "../die.h"
#include <apr_strings.h>

const char* parsegraph_BlockPainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec2 a_texCoord;\n"
"attribute vec4 a_color;\n"
"attribute vec4 a_borderColor;\n"
"attribute float a_borderRoundedness;\n"
"attribute float a_borderThickness;\n"
"attribute float a_aspectRatio;\n"
"\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
    "contentColor = a_color;\n"
    "borderColor = a_borderColor;\n"
    "borderRoundedness = max(0.001, a_borderRoundedness);\n"
    "texCoord = a_texCoord;\n"
    "borderThickness = a_borderThickness;\n"
    "aspectRatio = a_aspectRatio;\n"
"}";

const char* parsegraph_BlockPainter_VertexShader_Simple =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec4 a_color;\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);"
    "contentColor = a_color;"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"

    // Calculate the distance function.
    HIGHP " float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));\n"

    // Default antialias implementation.
    HIGHP " float borderTolerance = 0.0;\n"
    HIGHP " float inBorder = 1.0 - smoothstep(\n"
        "borderRoundedness - borderTolerance,\n"
        "borderRoundedness + borderTolerance,\n"
        "d\n"
    ");\n"
    HIGHP " float edgeWidth = 0.0;\n"
    HIGHP " float inContent = 1.0 - smoothstep(\n"
        "(borderRoundedness - borderThickness) - edgeWidth,\n"
        "(borderRoundedness - borderThickness) + edgeWidth,\n"
        "d\n"
    ");\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);\n"
"}";

const char* parsegraph_BlockPainter_FragmentShader_Simple =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"\n"
"void main() {\n"
    "gl_FragColor = contentColor;"
"}";

// Same as above, but using a better antialiasing technique.
const char* parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives =
"#extension GL_OES_standard_derivatives : enable\n"
"\n"
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"highp float aastep(float threshold, float value)\n"
"{\n"
    HIGHP " float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));\n"
    "return smoothstep(threshold - afwidth, threshold + afwidth, value);\n"
    //"return step(threshold, value);\n"
"}\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"

    // Calculate the distance function.
    HIGHP " float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));\n"

    // Using 'OpenGL insights' antialias implementation
    HIGHP " float inBorder = 1.0 - aastep(borderRoundedness, d);\n"
    HIGHP " float inContent = 1.0 - aastep(borderRoundedness - borderThickness, d);\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);\n"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_SquareFragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"
    "\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"
    "if(st.y < 1.0 - borderThickness && st.x < 1.0 - borderThickness) {\n"
        "gl_FragColor = contentColor;\n"
    "} else {\n"
        "gl_FragColor = borderColor;\n"
    "}\n"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_ShadyFragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
// Plot a line on Y using a value between 0.0-1.0
"float plot(vec2 st, float pct) {\n"
  "return smoothstep(pct-0.02, pct, st.y) - smoothstep(pct, pct+0.02, st.y);\n"
"}\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"
    "\n"
    "gl_FragColor = vec4(vec3(0.5 - (0.3 * st.y)), 1.0);\n"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_AngleFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n"
"\n"
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
// borderThickness is in [0, 1] terms.
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    // Adjust for the aspect ratio.
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    // 1.0 if st is inside the X-axis border.
    HIGHP " float t = borderThickness;\n"
    HIGHP " float insideYContent = 1.0 - step(1.0 - t, st.y);\n"
    HIGHP " float insideXBorder = step(1.0 - t, st.x);\n"

    // y = y1 + m(x - x1)
    HIGHP " float insideBorderAngle = 1.0 - step((st.x - 1.0)/-t, st.y);\n"
    HIGHP " float insideContentAngle = 1.0 - step((st.x - 1.0)/-t - aspectRatio, st.y);\n"

    HIGHP " float inBorder = step(1.0, insideBorderAngle);\n"
    HIGHP " float inContent = step(1.0, insideContentAngle * insideYContent);\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);\n"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_ParenthesisFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n"
"\n"
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    // 1.0 if st is inside the X-axis border.
    HIGHP " float t = borderThickness;\n"
    HIGHP " float insideYContent = step(1.0 - t, st.y);\n"
    HIGHP " float insideXBorder = step(1.0 - t, st.x/(1.0 - t/2.0));\n"

    HIGHP " float inBorder = step(1.0, 1.0 - insideXBorder + 1.0 - step(1.0, length(vec2((st.x - (1.0 - t))/t, st.y/(1.0 + 2.0*t)))));\n"
    HIGHP " float inContent = step(1.0, 1.0 - step(1.0 - t, st.x)*(1.0 - insideYContent) + 1.0 - step(1.0 - t, length(vec2((st.x/(1.0 - t) - (1.0 - t))/t, st.y/(1.0 + 3.0*t)))));\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);\n"
"}";

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_CurlyFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n"
"\n"
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec4 borderColor;\n"
"varying " HIGHP " float borderRoundedness;\n"
"varying " HIGHP " vec2 texCoord;\n"
// borderThickness is in [0, 1] terms.
"varying " HIGHP " float borderThickness;\n"
"varying " HIGHP " float aspectRatio;\n"
"\n"
"void main() {\n"
    // Adjust for the aspect ratio.
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    HIGHP " float t = borderThickness;\n"
    HIGHP " float inBorder = step(st.y, smoothstep(0.0, t, 1.0 - st.x));\n"
    HIGHP " float inContent = step(1.0, step(st.y, (1.0-t)*smoothstep(0.0, t, 1.0 - (st.x + t*aspectRatio))));\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);\n"
"}";

static const char* shaderName = "parsegraph_BlockPainter";
static const char* simpleShaderName = "parsegraph_BlockPainter_Simple";

int parsegraph_BlockPainter_COUNT = 0;

parsegraph_BlockPainter* parsegraph_BlockPainter_new(apr_pool_t* ppool, apr_hash_t* shaders)
{
    if(!shaders) {
        parsegraph_die("A shaders object must be given.");
    }
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create BlockPainter memory pool.");
    }

    parsegraph_BlockPainter* painter = apr_palloc(pool, sizeof(*painter));
    painter->pool = pool;
    painter->_id = ++parsegraph_BlockPainter_COUNT;
    painter->_string = 0;

    const char* fragProgram = parsegraph_BlockPainter_FragmentShader;
    if(strstr((const char*)glGetString(GL_EXTENSIONS), "GL_OES_standard_derivatives")) {
        fragProgram = parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives;
    }
    painter->_blockProgram = parsegraph_compileProgram(shaders, shaderName, parsegraph_BlockPainter_VertexShader, fragProgram);

    // Prepare buffer using initBuffer(numBlocks). BlockPainter supports a fixed number of blocks.
    painter->_blockBuffer = 0;
    painter->_blockBufferNumVertices = 0;
    painter->_blockBufferVertexIndex = 0;

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->_blockProgram, "u_world");

    // Setup initial uniform values.
    parsegraph_Color_SetRGBA(painter->_backgroundColor, 1, 1, 1, .15);
    parsegraph_Color_SetRGBA(painter->_borderColor, 1, 1, 1, 1);

    parsegraph_Rect_set(painter->_bounds, 0, 0, 0, 0);

    painter->a_position = glGetAttribLocation(painter->_blockProgram, "a_position");
    painter->a_texCoord = glGetAttribLocation(painter->_blockProgram, "a_texCoord");
    painter->a_color = glGetAttribLocation(painter->_blockProgram, "a_color");
    painter->a_borderColor = glGetAttribLocation(painter->_blockProgram, "a_borderColor");
    painter->a_borderRoundedness = glGetAttribLocation(painter->_blockProgram, "a_borderRoundedness");
    painter->a_borderThickness = glGetAttribLocation(painter->_blockProgram, "a_borderThickness");
    painter->a_aspectRatio = glGetAttribLocation(painter->_blockProgram, "a_aspectRatio");

    // Position: 2 * 4 (two floats)  0-7
    // TexCoord: 2 * 4 (two floats)  8-15
    // Color:    4 * 4 (four floats) 16-31
    // BorColor: 4 * 4 (four floats) 32-47
    // BorRound: 1 * 4 (one float)   48-51
    // BorThick: 1 * 4 (one float)   52-55
    // AspectRa: 1 * 4 (one float)   56-59
    painter->_stride = 15*sizeof(float);
    parsegraph_log("BlockPainter stride is %d\n", painter->_stride);
    painter->_vertexBuffer = apr_palloc(painter->pool, painter->_stride);
    painter->_dataBufferVertexIndex = 0;
    painter->_dataBufferNumVertices = 6;
    painter->_dataBuffer = apr_palloc(painter->pool, painter->_dataBufferNumVertices*painter->_stride);

    painter->_blockProgramSimple = parsegraph_compileProgram(shaders, simpleShaderName,
        parsegraph_BlockPainter_VertexShader_Simple,
        parsegraph_BlockPainter_FragmentShader_Simple
    );
    painter->simple_u_world = glGetUniformLocation(painter->_blockProgramSimple, "u_world");
    painter->simple_a_position = glGetAttribLocation(painter->_blockProgramSimple, "a_position");
    painter->simple_a_color = glGetAttribLocation(painter->_blockProgramSimple, "a_color");

    painter->_maxSize = 0;

    return painter;
}

void parsegraph_BlockPainter_destroy(parsegraph_BlockPainter* painter)
{
    apr_pool_destroy(painter->pool);
}

float* parsegraph_BlockPainter_bounds(parsegraph_BlockPainter* painter)
{
    return painter->_bounds;
}

float* parsegraph_BlockPainter_borderColor(parsegraph_BlockPainter* painter)
{
    return painter->_borderColor;
};

void parsegraph_BlockPainter_setBorderColor(parsegraph_BlockPainter* painter, float* borderColor)
{
    parsegraph_Color_copy(painter->_borderColor, borderColor);
};

float* parsegraph_BlockPainter_backgroundColor(parsegraph_BlockPainter* painter)
{
    return painter->_backgroundColor;
};

void parsegraph_BlockPainter_setBackgroundColor(parsegraph_BlockPainter* painter, float* backgroundColor)
{
    parsegraph_Color_copy(painter->_backgroundColor, backgroundColor);
}

void parsegraph_BlockPainter_initBuffer(parsegraph_BlockPainter* painter, unsigned int numBlocks)
{
    parsegraph_logEntercf("Painter initialization", "Initializing BlockPainter with %d blocks.", numBlocks);
    if(painter->_blockBufferNumVertices/6 == numBlocks) {
        // Same number of blocks, so just reset the counters and overwrite.
        painter->_blockBufferVertexIndex = 0;
        painter->_dataBufferVertexIndex = 0;
        parsegraph_logLeavef("Painter can reuse existing buffers.\n");
        return;
    }
    if(painter->_blockBuffer) {
        parsegraph_BlockPainter_clear(painter);
    }
    glGenBuffers(1, &painter->_blockBuffer);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while creating GL buffer for block painter\n");
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while binding GL buffer for block painter\n");
    }
    glBufferData(GL_ARRAY_BUFFER, painter->_stride*6*numBlocks, 0, GL_STATIC_DRAW);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while creating GL buffer for block painter\n");
    }
    painter->_blockBufferNumVertices = numBlocks*6;
    parsegraph_logLeavef("Painter recreated buffers.\n");
}

void parsegraph_BlockPainter_clear(parsegraph_BlockPainter* painter)
{
    if(!painter->_blockBuffer) {
        return;
    }
    glDeleteBuffers(1, &painter->_blockBuffer);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while deleting GL buffer for block painter\n");
    }
    painter->_blockBuffer = 0;
    parsegraph_Rect_set(painter->_bounds, 0, 0, 0, 0);
    painter->_blockBufferNumVertices = 0;
    painter->_dataBufferVertexIndex = 0;
    painter->_blockBufferVertexIndex = 0;
    painter->_maxSize = 0;
}

void parsegraph_BlockPainter_writeVertex(parsegraph_BlockPainter* painter)
{
    parsegraph_log("Writing one vertex with pos [%f, %f] with color(%f, %f, %f, %f)\n",
        painter->_vertexBuffer[0],
        painter->_vertexBuffer[1],
        painter->_vertexBuffer[4],
        painter->_vertexBuffer[5],
        painter->_vertexBuffer[6],
        painter->_vertexBuffer[7]
    );
    int pos = painter->_dataBufferVertexIndex++ * painter->_stride/sizeof(float);
    memcpy(painter->_dataBuffer + pos, painter->_vertexBuffer, painter->_stride);
    if(painter->_dataBufferVertexIndex >= painter->_dataBufferNumVertices) {
        parsegraph_BlockPainter_flush(painter);
    }
    //parsegraph_log("Data buffer vertex index of %s is now %d\n", parsegraph_BlockPainter_toString(painter), painter->_dataBufferVertexIndex);
}

void parsegraph_BlockPainter_flush(parsegraph_BlockPainter* painter)
{
    if(painter->_dataBufferVertexIndex == 0) {
        //parsegraph_log("BlockPainter has no vertices to flush.\n");
        return;
    }
    int stride = painter->_stride;
    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while binding GL buffer for block painter\n");
    }

    if(painter->_dataBufferVertexIndex + painter->_blockBufferVertexIndex > painter->_blockBufferNumVertices) {
        parsegraph_die("GL buffer of %d vertices is full; cannot flush all %d vertices because the GL buffer already has %d vertices.", painter->_blockBufferNumVertices, painter->_dataBufferVertexIndex, painter->_blockBufferVertexIndex);
    }
    if(painter->_dataBufferVertexIndex >= painter->_dataBufferNumVertices) {
        parsegraph_log("Writing %d vertices to offset %d of %d vertices", painter->_dataBufferNumVertices, painter->_blockBufferVertexIndex, painter->_blockBufferNumVertices);
        glBufferSubData(GL_ARRAY_BUFFER, painter->_blockBufferVertexIndex*stride, painter->_dataBufferNumVertices, painter->_dataBuffer);
    }
    else {
        parsegraph_log("Partial flush (%d/%d from %d)", painter->_blockBufferVertexIndex, painter->_blockBufferNumVertices, painter->_dataBufferVertexIndex*stride/4);
        glBufferSubData(GL_ARRAY_BUFFER, painter->_blockBufferVertexIndex*stride, painter->_dataBufferVertexIndex*stride/sizeof(float), painter->_dataBuffer);
    }
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while flushing block painter buffer\n");
    }
    painter->_blockBufferVertexIndex += painter->_dataBufferVertexIndex;
    painter->_dataBufferVertexIndex = 0;
    //parsegraph_log("Block buffer vertex index of %s is now %d.\n", parsegraph_BlockPainter_toString(painter), painter->_blockBufferVertexIndex);
}

void parsegraph_BlockPainter_drawBlock(parsegraph_BlockPainter* painter, float cx, float cy, float width, float height, float borderRoundedness, float borderThickness, float borderScale)
{
    if(!painter->_blockBuffer) {
        parsegraph_die("BlockPainter.initBuffer(numBlocks) must be called first.");
    }
    if(painter->_blockBufferVertexIndex >= painter->_blockBufferNumVertices) {
        parsegraph_die("BlockPainter is full and cannot draw any more blocks.");
    }
    parsegraph_Rect_include(painter->_bounds, cx, cy, width, height);
    if(isnan(cx)) {
        parsegraph_die("cx must be a number, but was NaN");
    }
    if(isnan(cy)) {
        parsegraph_die("cy must be a number, but was NaN");
    }
    if(isnan(width)) {
        parsegraph_die("width must be a number, but was NaN");
    }
    if(isnan(height)) {
        parsegraph_die("height must be a number, but was NaN");
    }
    if(isnan(borderRoundedness)) {
        parsegraph_die("borderRoundedness must be a number, but was NaN");
    }
    if(isnan(borderThickness)) {
        parsegraph_die("borderThickness must be a number, but was NaN");
    }
    if(isnan(borderScale)) {
        parsegraph_die("borderScale must be a number, but was NaN");
    }
    parsegraph_log("Drawing block of size %fx%f centered at world position (%f, %f).\n", width, height, cx, cy);

    float* buf = painter->_vertexBuffer;

    // Append color data.
    float* bg = parsegraph_BlockPainter_backgroundColor(painter);
    buf[4] = bg[0];
    buf[5] = bg[1];
    buf[6] = bg[2];
    buf[7] = bg[3];

    // Append border color data.
    float* borC = parsegraph_BlockPainter_borderColor(painter);
    buf[8] = borC[0];
    buf[9] = borC[1];
    buf[10] = borC[2];
    buf[11] = borC[3];

    // Append border radius data.
    if(height < width) {
        buf[12] = borderScale * borderRoundedness / height;
        buf[13] = borderScale * borderThickness / height;
    }
    else {
        // height > width
        buf[12] = borderScale * borderRoundedness / width;
        buf[13] = borderScale * borderThickness / width;
    }
    buf[14] = height/width;

    // Append position and texture coordinate data.
    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    parsegraph_BlockPainter_writeVertex(painter);

    buf[0] = cx + width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 1;
    buf[3] = 0;
    parsegraph_BlockPainter_writeVertex(painter);

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    parsegraph_BlockPainter_writeVertex(painter);

    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    parsegraph_BlockPainter_writeVertex(painter);

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    parsegraph_BlockPainter_writeVertex(painter);

    buf[0] = cx - width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 0;
    buf[3] = 1;
    parsegraph_BlockPainter_writeVertex(painter);

    painter->_maxSize = fmaxf(painter->_maxSize, fmaxf(width, height));
}

const char* parsegraph_BlockPainter_toString(parsegraph_BlockPainter* painter)
{
    if(!painter->_string) {
        painter->_string = apr_psprintf(painter->pool, "[parsegraph_BlockPainter %d]", painter->_id);
    }
    return painter->_string;
};

void parsegraph_BlockPainter_render(parsegraph_BlockPainter* painter, float* world, float scale)
{
    parsegraph_BlockPainter_flush(painter);
    if(painter->_blockBufferVertexIndex == 0) {
        parsegraph_log("This painter %s has no vertices.\n", parsegraph_BlockPainter_toString(painter));
        return;
    }
    int usingSimple = (painter->_maxSize * scale) < 5;
    usingSimple = 1;
    parsegraph_log("BlockPainter %d %f %d %d\n", painter->_id, painter->_maxSize * scale, usingSimple, painter->_blockBufferVertexIndex);

    if(usingSimple) {
        glUseProgram(painter->_blockProgramSimple);
        if(GL_NO_ERROR != glGetError()) {
            parsegraph_die("GL error while using GL program for block painter\n");
        }
        glUniformMatrix3fv(painter->simple_u_world, 1, 0, world);
        if(GL_NO_ERROR != glGetError()) {
            parsegraph_die("GL error while transferring world matrix to GL for block painter\n");
        }
        glEnableVertexAttribArray(painter->simple_a_position);
        glEnableVertexAttribArray(painter->simple_a_color);
    }
    else {
        glUseProgram(painter->_blockProgram);
        if(GL_NO_ERROR != glGetError()) {
            parsegraph_die("GL error while using GL program for block painter\n");
        }
        glUniformMatrix3fv(painter->u_world, 1, 0, world);
        if(GL_NO_ERROR != glGetError()) {
            parsegraph_die("GL error while transferring world matrix to GL for block painter\n");
        }
        glEnableVertexAttribArray(painter->a_position);
        glEnableVertexAttribArray(painter->a_texCoord);
        glEnableVertexAttribArray(painter->a_color);
        glEnableVertexAttribArray(painter->a_borderColor);
        glEnableVertexAttribArray(painter->a_borderRoundedness);
        glEnableVertexAttribArray(painter->a_borderThickness);
        glEnableVertexAttribArray(painter->a_aspectRatio);
    }

    int stride = painter->_stride;
    if(!painter->_blockBuffer) {
        parsegraph_die("No block buffer to render; BlockPainter.initBuffer(numBlocks) must be called first.");
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error while binding buffer\n");
    }

    // Position: 2 * 4 (two floats)  0-7
    // TexCoord: 2 * 4 (two floats)  8-15
    // Color:    4 * 4 (four floats) 16-31
    // BorColor: 4 * 4 (four floats) 32-47
    // BorRound: 1 * 4 (one float)   48-51
    // BorThick: 1 * 4 (one float)   52-55
    // AspectRa: 1 * 4 (one float)   56-59
    if(usingSimple) {
        glVertexAttribPointer(painter->simple_a_position,          2, GL_FLOAT, 0, stride, 0);
        glVertexAttribPointer(painter->simple_a_color,             4, GL_FLOAT, 0, stride, (void*)16);
    }
    else {
        glVertexAttribPointer(painter->a_position,          2, GL_FLOAT, 0, stride, 0);
        glVertexAttribPointer(painter->a_texCoord,          2, GL_FLOAT, 0, stride, (void*)8);
        glVertexAttribPointer(painter->a_color,             4, GL_FLOAT, 0, stride, (void*)16);
        glVertexAttribPointer(painter->a_borderColor,       4, GL_FLOAT, 0, stride, (void*)32);
        glVertexAttribPointer(painter->a_borderRoundedness, 1, GL_FLOAT, 0, stride, (void*)48);
        glVertexAttribPointer(painter->a_borderThickness,   1, GL_FLOAT, 0, stride, (void*)52);
        glVertexAttribPointer(painter->a_aspectRatio,       1, GL_FLOAT, 0, stride, (void*)56);
    }

    glDrawArrays(GL_TRIANGLES, 0, painter->_blockBufferVertexIndex);
    if(GL_NO_ERROR != glGetError()) {
        parsegraph_die("GL error during draw arrays\n");
    }

    if(usingSimple) {
        glDisableVertexAttribArray(painter->simple_a_position);
        glDisableVertexAttribArray(painter->simple_a_color);
    }
    else {
        glDisableVertexAttribArray(painter->a_position);
        glDisableVertexAttribArray(painter->a_texCoord);
        glDisableVertexAttribArray(painter->a_color);
        glDisableVertexAttribArray(painter->a_borderColor);
        glDisableVertexAttribArray(painter->a_borderRoundedness);
        glDisableVertexAttribArray(painter->a_borderThickness);
        glDisableVertexAttribArray(painter->a_aspectRatio);
    }
}
