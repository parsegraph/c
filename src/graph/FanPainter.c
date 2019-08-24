#include "FanPainter.h"
#include "../die.h"
#include "alpha/Maths.h"

// TODO Separate coloring and slicing from drawing the circle... Basically, make this actually just draw the fans we want.
const char* parsegraph_FanPainter_VertexShader =
"uniform mat3 u_world;\n"
"\n"
"attribute vec2 a_position;\n"
"attribute vec4 a_color;\n"
"attribute vec2 a_texCoord;\n"
"attribute float a_selectionAngle;\n"
"attribute float a_selectionSize;\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float selectionAngle;\n"
"varying " HIGHP " float selectionSize;\n"
"\n"
"void main() {\n"
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n"
    "contentColor = a_color;\n"
    "texCoord = a_texCoord;\n"
    "selectionAngle = a_selectionAngle;\n"
    "selectionSize = a_selectionSize;\n"
"}";

const char* parsegraph_FanPainter_FragmentShader =
"#ifdef GL_ES\n"
"precision mediump float;\n"
"#endif\n"
"\n"
"varying " HIGHP " vec4 contentColor;\n"
"varying " HIGHP " vec2 texCoord;\n"
"varying " HIGHP " float selectionAngle;\n"
"varying " HIGHP " float selectionSize;\n"
"\n"
"void main() {\n"
    HIGHP " vec2 st = texCoord;\n"
    "st = st * 2.0 - 1.0;\n"
    HIGHP " float d = 1.0 - min(1.0, length(abs(st)));\n"
    //"d = 1.0 - pow(d, 0.2);\n"
    HIGHP " float fragAngle = atan(st.y, st.x);\n"
    HIGHP " float angleDiff = abs(selectionAngle - fragAngle);\n"
    "if(angleDiff > 3.14159*1.5) { angleDiff = 2.0*3.14159 - angleDiff; }\n"
    HIGHP " float angleAlpha = 0.5*d*max(0.0, 1.0 - contentColor.a * (angleDiff / selectionSize));\n"
    HIGHP " float centerSpotlight = 0.5;\n"
    HIGHP " float interiorDeadspot = 0.35;\n"
    HIGHP " float centerDist = distance(texCoord.xy, vec2(0.5, 0.5));\n"
    HIGHP " float centerAlpha = 0.5*max(0.0, 1.0 - centerDist/centerSpotlight) - 0.5*max(0.0, 1.0 - centerDist/interiorDeadspot);\n"
    "gl_FragColor = vec4(contentColor.rgb, centerAlpha + angleAlpha);\n"
    //"if(selectionAngle - fragAngle > (3.14159 / 2.0) || fragAngle - selectionAngle > (3.14159 / 2.0)) {\n"
        //"gl_FragColor = vec4(contentColor.rgb, contentColor.a * d);\n"
    //"}\n"
    //"else {\n"
        //"gl_FragColor = vec4(contentColor.rgb, contentColor.a * d * (1.0 - abs(abs(fragAngle) - abs(selectionAngle)) / 3.14159));\n"
    //"}\n"
"}";

/**
 * Shows a circle that allows some parts to show as selected.
 */
parsegraph_FanPainter* parsegraph_FanPainter_new(apr_pool_t* pool, apr_hash_t* shaders)
{
    parsegraph_FanPainter* painter = apr_palloc(pool, sizeof(*painter));
    painter->pool = pool;

    painter->_ascendingRadius = 250;
    painter->_descendingRadius = 250;
    painter->_selectionAngle = 0;
    painter->_selectionSize = 0;

    // Compile the shader program.
    painter->fanProgram = parsegraph_compileProgram(shaders, "parsegraph_FanPainter",
        parsegraph_FanPainter_VertexShader,
        parsegraph_FanPainter_FragmentShader
    );

    // Prepare attribute buffers.
    painter->_fanBuffer = parsegraph_pagingbuffer_new(pool, painter->fanProgram);
    painter->a_position = parsegraph_pagingbuffer_defineAttrib(painter->_fanBuffer, "a_position", 2, GL_STATIC_DRAW);
    painter->a_color = parsegraph_pagingbuffer_defineAttrib(painter->_fanBuffer, "a_color", 4, GL_STATIC_DRAW);
    painter->a_texCoord = parsegraph_pagingbuffer_defineAttrib(painter->_fanBuffer, "a_texCoord", 2, GL_STATIC_DRAW);
    painter->a_selectionAngle = parsegraph_pagingbuffer_defineAttrib(painter->_fanBuffer, "a_selectionAngle", 1, GL_STATIC_DRAW);
    painter->a_selectionSize = parsegraph_pagingbuffer_defineAttrib(painter->_fanBuffer, "a_selectionSize", 1, GL_STATIC_DRAW);

    // Cache program locations.
    painter->u_world = glGetUniformLocation(painter->fanProgram, "u_world");

    parsegraph_PagingBuffer_addDefaultPage(painter->_fanBuffer);
    return painter;
}

void parsegraph_FanPainter_destroy(parsegraph_FanPainter* painter)
{
    parsegraph_pagingbuffer_destroy(painter->_fanBuffer);
}

void parsegraph_FanPainter_selectDeg(parsegraph_FanPainter* painter,
    float userX, float userY,
    float startAngle, float spanAngle,
    float* startColor, float* endColor)
{
    parsegraph_FanPainter_selectRad(painter,
        userX, userY,
        alpha_toRadians(startAngle), alpha_toRadians(spanAngle),
        startColor, endColor
    );
}

/**
 * Highlights arcs under the given selection.
 */
void parsegraph_FanPainter_selectRad(parsegraph_FanPainter* painter,
    float userX, float userY,
    float startAngle, float spanAngle,
    float* startColor, float* endColor)
//parsegraph_FanPainter.prototype.drawFan = function(
//    cx, cy, radius, color)
{
    //console.log(userx + ", " + userY + ". startAngle=" + startAngle + ", spanAngle=" + spanAngle);
    parsegraph_pagingbuffer_addDefaultPage(painter->_fanBuffer);

    float radius = painter->_ascendingRadius + painter->_descendingRadius;

    // Append position data.
    parsegraph_pagingbuffer_appendArray(painter->_fanBuffer,
        painter->a_position, 12,
        parsegraph_generateRectangleVertices(painter->pool,
            userX, userY, radius * 2, radius * 2
        )
    );

    // Append texture coordinate data.
    parsegraph_pagingbuffer_appendArray(painter->_fanBuffer,
        painter->a_texCoord, 12,
        parsegraph_generateRectangleTexcoords(painter->pool)
    );

    // Append color data.
    float* color = startColor;
    for(int k = 0; k < 3 * 2; ++k) {
        parsegraph_PagingBuffer_appendRGBA(painter->_fanBuffer, painter->a_color, color[0], color[1], color[2], color[3]);
        parsegraph_PagingBuffer_appendData(painter->_fanBuffer, painter->a_selectionAngle, 1, painter->_selectionAngle);
        parsegraph_PagingBuffer_appendData(painter->_fanBuffer, painter->a_selectionSize, 1, painter->_selectionSize);
    }
}

void parsegraph_FanPainter_setAscendingRadius(parsegraph_FanPainter* painter, float ascendingRadius)
{
    painter->_ascendingRadius = ascendingRadius;
}

void parsegraph_FanPainter_setDescendingRadius(parsegraph_FanPainter* painter, float descendingRadius)
{
    painter->_descendingRadius = descendingRadius;
}

void parsegraph_FanPainter_setSelectionAngle(parsegraph_FanPainter* painter, float selectionAngle)
{
    //console.log("Selection angle: " + selectionAngle);
    painter->_selectionAngle = selectionAngle;
}

void parsegraph_FanPainter_setSelectionSize(parsegraph_FanPainter* painter, float selectionSize)
{
    //console.log("Selection size: " + selectionSize);
    painter->_selectionSize = selectionSize > 3.14159/2.0 ? 3.14159/2.0 : selectionSize;
}

void parsegraph_FanPainter_clear(parsegraph_FanPainter* painter)
{
    parsegraph_pagingbuffer_clear(painter->_fanBuffer);
    parsegraph_PagingBuffer_addDefaultPage(painter->_fanBuffer);
}

void parsegraph_FanPainter_render(parsegraph_FanPainter* painter, float* viewMatrix)
{
    if(!viewMatrix) {
        parsegraph_die("A viewMatrix must be provided");
    }
    // Render faces.
    glUseProgram(painter->fanProgram);
    glUniformMatrix3fv(
        painter->u_world,
        1,
        0,
        viewMatrix
    );
    parsegraph_pagingbuffer_renderPages(painter->_fanBuffer);
}
