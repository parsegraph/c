#include "BlockPainter.h"
#include "log.h"
#include <stdlib.h>
#include <stdio.h>
#include "Surface.h"
#include "Rect.h"
#include "Color.h"

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
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec4 borderColor;\n"
"varying highp vec4 contentColor;\n"
"varying highp float aspectRatio;\n"
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

// Derived from https://thebookofshaders.com/07/
const char* parsegraph_BlockPainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));\n"

    // Default antialias implementation.
    "highp float borderTolerance = 0.0;\n"
    "highp float inBorder = 1.0 - smoothstep(\n"
        "borderRoundedness - borderTolerance,\n"
        "borderRoundedness + borderTolerance,\n"
        "d\n"
    ");\n"
    "highp float edgeWidth = 0.0;\n"
    "highp float inContent = 1.0 - smoothstep(\n"
        "(borderRoundedness - borderThickness) - edgeWidth,\n"
        "(borderRoundedness - borderThickness) + edgeWidth,\n"
        "d\n"
    ");\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);\n"
"}";

// Same as above, but using a better antialiasing technique.
const char* parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives =
"#extension GL_OES_standard_derivatives : enable\n"
"\n"
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"highp float aastep(float threshold, float value)\n"
"{\n"
    "highp float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));\n"
    "return smoothstep(threshold - afwidth, threshold + afwidth, value);\n"
    //"return step(threshold, value);\n"
"}\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));\n"

    // Using 'OpenGL insights' antialias implementation
    "highp float inBorder = 1.0 - aastep(borderRoundedness, d);\n"
    "highp float inContent = 1.0 - aastep(borderRoundedness - borderThickness, d);\n"

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
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
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
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
// Plot a line on Y using a value between 0.0-1.0
"float plot(vec2 st, float pct) {\n"
  "return smoothstep(pct-0.02, pct, st.y) - smoothstep(pct, pct+0.02, st.y);\n"
"}\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
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
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"void main() {\n"
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;\n"
    "highp float insideYContent = 1.0 - step(1.0 - t, st.y);\n"
    "highp float insideXBorder = step(1.0 - t, st.x);\n"

    // y = y1 + m(x - x1)
    "highp float insideBorderAngle = 1.0 - step((st.x - 1.0)/-t, st.y);\n"
    "highp float insideContentAngle = 1.0 - step((st.x - 1.0)/-t - aspectRatio, st.y);\n"

    "highp float inBorder = step(1.0, insideBorderAngle);\n"
    "highp float inContent = step(1.0, insideContentAngle * insideYContent);\n"

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
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"void main() {\n"
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n"
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;\n"
    "highp float insideYContent = step(1.0 - t, st.y);\n"
    "highp float insideXBorder = step(1.0 - t, st.x/(1.0 - t/2.0));\n"

    "highp float inBorder = step(1.0, 1.0 - insideXBorder + 1.0 - step(1.0, length(vec2((st.x - (1.0 - t))/t, st.y/(1.0 + 2.0*t)))));\n"
    "highp float inContent = step(1.0, 1.0 - step(1.0 - t, st.x)*(1.0 - insideYContent) + 1.0 - step(1.0 - t, length(vec2((st.x/(1.0 - t) - (1.0 - t))/t, st.y/(1.0 + 3.0*t)))));\n"

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
"varying highp vec4 contentColor;\n"
"varying highp vec4 borderColor;\n"
"varying highp float borderRoundedness;\n"
"varying highp vec2 texCoord;\n"
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n"
"varying highp float aspectRatio;\n"
"\n"
"void main() {\n"
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    "st.x = abs(st.x);\n"
    "st.y = abs(st.y);\n"

    "highp float t = borderThickness;\n"
    "highp float inBorder = step(st.y, smoothstep(0.0, t, 1.0 - st.x));\n"
    "highp float inContent = step(1.0, step(st.y, (1.0-t)*smoothstep(0.0, t, 1.0 - (st.x + t*aspectRatio))));\n"

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);\n"
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);\n"
"}";

static const char* shaderName = "parsegraph_BlockPainter";

parsegraph_BlockPainter* parsegraph_BlockPainter_new(parsegraph_Surface* surface, apr_hash_t* shaders)
{
    if(!shaders || !surface) {
        fprintf(stderr, "A shaders object must be given.\n");
        abort();
    }

    parsegraph_BlockPainter* painter = apr_palloc(surface->pool, sizeof(*painter));

    // Compile the shader program.
    GLuint* blockProgramId = (GLuint*)apr_hash_get(shaders, shaderName, APR_HASH_KEY_STRING);
    if(blockProgramId) {
        painter->_blockProgram = *blockProgramId;
    }
    else {
        GLuint program = glCreateProgram();
        glAttachShader(
            program,
            compileShader(
                parsegraph_BlockPainter_VertexShader,
                GL_VERTEX_SHADER
            )
        );

        const char* fragProgram = parsegraph_BlockPainter_FragmentShader;
        //fprintf(stderr, "%s\n", glGetString(GL_EXTENSIONS));
        if(strstr((const char*)glGetString(GL_EXTENSIONS), "GL_OES_standard_derivatives")) {
            fragProgram = parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives;
        }
        // For development.
  //      fragProgram = parsegraph_BlockPainter_CurlyFragmentShader;
//       fragProgram = parsegraph_BlockPainter_ParenthesisFragmentShader;
//        fragProgram = parsegraph_BlockPainter_SquareFragmentShader;
//fragProgram = parsegraph_BlockPainter_AngleFragmentShader;

        glAttachShader(
            program,
            compileShader(
                fragProgram,
                GL_FRAGMENT_SHADER
            )
        );

        glLinkProgram(program);
        GLint linkStatus;
        glGetProgramiv(program, GL_LINK_STATUS, &linkStatus);
        if(linkStatus != GL_TRUE) {
            fprintf(stderr, "'%s' shader program failed to link.\n", shaderName);
            abort();
        }

        GLuint* progId = apr_palloc(surface->pool, sizeof(GLuint));
        *progId = program;
        apr_hash_set(shaders, shaderName, APR_HASH_KEY_STRING, progId);
        painter->_blockProgram = program;
    }

    // Prepare buffer using initBuffer(numBlocks). BlockPainter supports a fixed number of blocks.
    painter->_blockBuffer = 0;
    painter->_numBlocks = 0;
    painter->_numFaces = 0;
    painter->_numVertices = 0;

    // Cache program locations.
    painter->u_world = glGetUniformLocation(
        painter->_blockProgram, "u_world"
    );

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
    painter->_itemBuffer = apr_palloc(surface->pool, painter->_stride);

    return painter;
};

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
};

void parsegraph_BlockPainter_initBuffer(parsegraph_BlockPainter* painter, unsigned int numBlocks)
{
    if(painter->_numBlocks == numBlocks) {
        // Same number of blocks, so just reset the counters and overwrite.
        painter->_numVertices = 0;
        painter->_numFaces = 0;
        return;
    }
    if(painter->_blockBuffer) {
        parsegraph_BlockPainter_clear(painter);
    }
    glGenBuffers(1, &painter->_blockBuffer);
    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);
    glBufferData(GL_ARRAY_BUFFER, painter->_stride*6*numBlocks, 0, GL_STATIC_DRAW);
    painter->_numBlocks = numBlocks;
    //parsegraph_log("BlockPainter has buffer of %d blocks", numBlocks);
};

void parsegraph_BlockPainter_clear(parsegraph_BlockPainter* painter)
{
    if(!painter->_blockBuffer) {
        return;
    }
    glDeleteBuffers(1, &painter->_blockBuffer);
    painter->_blockBuffer = 0;
    parsegraph_Rect_set(painter->_bounds, 0, 0, 0, 0);
    painter->_numBlocks = 0;
    painter->_numFaces = 0;
    painter->_numVertices = 0;
};

void parsegraph_BlockPainter_drawBlock(parsegraph_BlockPainter* painter,
    float cx, float cy, float width, float height, float borderRoundedness, float borderThickness, float borderScale)
{
    if(painter->_numFaces / 2 >= painter->_numBlocks) {
        fprintf(stderr, "BlockPainter is full and cannot draw any more blocks.\n");
        abort();
    }
    if(!painter->_blockBuffer) {
        fprintf(stderr, "BlockPainter.initBuffer(numBlocks) must be called first.\n");
        abort();
    }
    //parsegraph_log("Drawing block (%f, %f, w=%f, h=%f, border(%f, %f))\n", cx, cy, width, height, borderRoundedness, borderThickness);
    parsegraph_Rect_include(painter->_bounds, cx, cy, width, height);

    float* buf = painter->_itemBuffer;

    // Append color data.
    memcpy(buf + 4, parsegraph_BlockPainter_backgroundColor(painter), sizeof(float)*4);

    // Append border color data.
    memcpy(buf + 8, parsegraph_BlockPainter_borderColor(painter), sizeof(float)*4);

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

    float stride = painter->_stride;

    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);

    // Append position and texture coordinate data.
    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    buf[0] = cx + width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 1;
    buf[3] = 0;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    buf[0] = cx - width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 0;
    buf[3] = 1;
    glBufferSubData(GL_ARRAY_BUFFER, painter->_numVertices++*stride, stride, buf);

    //printf("%d verts\n", painter->_numVertices);
    painter->_numFaces += 2;
};

void parsegraph_BlockPainter_render(parsegraph_BlockPainter* painter, float* world)
{
    if(!painter->_numFaces) {
        return;
    }
    //printf("Rendering %d vertices\n", painter->_numVertices);

    // Render blocks.
    glUseProgram(painter->_blockProgram);
    glUniformMatrix3fv(painter->u_world, 1, 0, world);

    glEnableVertexAttribArray(painter->a_position);
    glEnableVertexAttribArray(painter->a_texCoord);
    glEnableVertexAttribArray(painter->a_color);
    glEnableVertexAttribArray(painter->a_borderColor);
    glEnableVertexAttribArray(painter->a_borderRoundedness);
    glEnableVertexAttribArray(painter->a_borderThickness);
    glEnableVertexAttribArray(painter->a_aspectRatio);

    float stride = painter->_stride;
    if(!painter->_blockBuffer) {
        fprintf(stderr, "No block buffer to render; BlockPainter.initBuffer(numBlocks) must be called first.\n");
        abort();
    }
    glBindBuffer(GL_ARRAY_BUFFER, painter->_blockBuffer);

    // Position: 2 * 4 (two floats)  0-7
    // TexCoord: 2 * 4 (two floats)  8-15
    // Color:    4 * 4 (four floats) 16-31
    // BorColor: 4 * 4 (four floats) 32-47
    // BorRound: 1 * 4 (one float)   48-51
    // BorThick: 1 * 4 (one float)   52-55
    // AspectRa: 1 * 4 (one float)   56-59
    glVertexAttribPointer(painter->a_position,          2, GL_FLOAT, 0, stride, (GLvoid*)0);
    glVertexAttribPointer(painter->a_texCoord,          2, GL_FLOAT, 0, stride, (GLvoid*)8);
    glVertexAttribPointer(painter->a_color,             4, GL_FLOAT, 0, stride, (GLvoid*)16);
    glVertexAttribPointer(painter->a_borderColor,       4, GL_FLOAT, 0, stride, (GLvoid*)32);
    glVertexAttribPointer(painter->a_borderRoundedness, 1, GL_FLOAT, 0, stride, (GLvoid*)48);
    glVertexAttribPointer(painter->a_borderThickness,   1, GL_FLOAT, 0, stride, (GLvoid*)52);
    glVertexAttribPointer(painter->a_aspectRatio,       1, GL_FLOAT, 0, stride, (GLvoid*)56);

    glDrawArrays(GL_TRIANGLES, 0, painter->_numVertices);

    glDisableVertexAttribArray(painter->a_position);
    glDisableVertexAttribArray(painter->a_texCoord);
    glDisableVertexAttribArray(painter->a_color);
    glDisableVertexAttribArray(painter->a_borderColor);
    glDisableVertexAttribArray(painter->a_borderRoundedness);
    glDisableVertexAttribArray(painter->a_borderThickness);
    glDisableVertexAttribArray(painter->a_aspectRatio);
}
