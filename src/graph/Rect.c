#include "Rect.h"
#include "log.h"
#include <stdlib.h>
#include <math.h>

float* parsegraph_Rect_new(apr_pool_t* pool)
{
    float* rv;
    if(pool) {
        rv = apr_pcalloc(pool, sizeof(float)*4);
    }
    else {
        rv = calloc(4, sizeof(float));
    }
    return rv;
}

float* parsegraph_createRect(apr_pool_t* pool, float x, float y, float width, float height)
{
    float* rect = parsegraph_Rect_new(pool);
    parsegraph_Rect_set(rect, x, y, width, height);
    return rect;
}

void parsegraph_Rect_isNaN(float* rect)
{
    return isnan(rect->_x) || isnan(rect->_y) || isnan(rect->_width) || isnan(rect->_height);
}

void parsegraph_Rect_toNaN(float* rect)
{
    rect->_x = NAN;
    rect->_y = NAN;
    rect->_width = NAN;
    rect->_height = NAN;
}

void parsegraph_Rect_clear(float* rect)
{
    parsegraph_Rect_toNaN(rect);
}

void parsegraph_Rect_reset(float* rect)
{
    parsegraph_Rect_toNaN(rect);
}

float parsegraph_Rect_x(float* rect)
{
    return rect[0];
}

void parsegraph_Rect_setX(float* rect, float x)
{
    rect[0] = x;
}

float parsegraph_Rect_y(float* rect)
{
    return rect[1];
}

void parsegraph_Rect_setY(float* rect, float y)
{
    rect[1] = y;
}

float* parsegraph_Rect_clone(float* rect, float* target)
{
    if(!target) {
        target = parsegraph_Rect_new(0);
    }
    parsegraph_Rect_copy(rect, target);
    return target;
}

void parsegraph_Rect_copy(float* src, float* dest)
{
    if(!dest) {
        return parsegraph_Rect_clone(src, 0);
    }
    parsegraph_Rect_copyFrom(dest, src);
}

void parsegraph_Rect_copyFrom(float* dest, float* src)
{
    parsegraph_Rect_set(dest, src[0], src[1], src[2], src[3]);
}

void parsegraph_Rect_translate(float* rect, float x, float y)
{
    parsegraph_Rect_setX(rect, parsegraph_Rect_x(rect) + x);
    parsegraph_Rect_setY(rect, parsegraph_Rect_y(rect) + y);
}

void parsegraph_Rect_scale(float* rect, float sx, float sy)
{
    parsegraph_Rect_setX(rect, parsegraph_Rect_x(rect) * sx);
    parsegraph_Rect_setY(rect, parsegraph_Rect_y(rect) * sy);
    parsegraph_Rect_setWidth(rect, parsegraph_Rect_width(rect) * sx);
    parsegraph_Rect_setHeight(rect, parsegraph_Rect_height(rect) * sy);
}

float parsegraph_Rect_height(float* rect)
{
    return rect[3];
}

void parsegraph_Rect_setHeight(float* rect, float height)
{
    rect[3] = height;
}

float parsegraph_Rect_width(float* rect)
{
    return rect[2];
}

void parsegraph_Rect_setWidth(float* rect, float width)
{
    rect[2] = width;
}

void parsegraph_Rect_setIdentity(float* rect)
{
    memset(rect, 0, sizeof(float)*4);
}

void parsegraph_Rect_set(float* rect, float x, float y, float width, float height)
{
    rect[0] = x;
    rect[1] = y;
    rect[2] = width;
    rect[3] = height;
}

void parsegraph_Rect_destroy(float* rect, apr_pool_t* pool)
{
    if(!pool) {
        free(rect);
    }
}

float parsegraph_Rect_vMin(float* rect)
{
    return parsegraph_Rect_y(rect) - parsegraph_Rect_height(rect)/2;
}

float parsegraph_Rect_vMax(float* rect)
{
    return parsegraph_Rect_y(rect) + parsegraph_Rect_height(rect)/2;
}

float parsegraph_Rect_hMin(float* rect)
{
    return parsegraph_Rect_x(rect) - parsegraph_Rect_width(rect)/2;
}

float parsegraph_Rect_hMax(float* rect)
{
    return parsegraph_Rect_x(rect) + parsegraph_Rect_width(rect)/2;
}

void parsegraph_Rect_include(float* rect, float bx, float by, float bwidth, float bheight)
{
    float ax = parsegraph_Rect_x(rect);
    float ay = parsegraph_Rect_y(rect);
    float awidth = parsegraph_Rect_width(rect);
    float aheight = parsegraph_Rect_height(rect);

    float leftEdge = fminf(ax-awidth/2, bx-bwidth/2);
    float rightEdge = fmaxf(ax+awidth/2, bx+bwidth/2);
    float topEdge = fminf(ay-aheight/2, by-bheight/2);
    float bottomEdge = fmaxf(ay+aheight/2, by+bheight/2);

    float w = rightEdge - leftEdge;
    float h = bottomEdge - topEdge;
    float x = leftEdge + w/2;
    float y = topEdge + h/2;
    parsegraph_Rect_set(rect, x, y, w, h);
}
