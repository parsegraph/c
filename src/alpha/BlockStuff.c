#include "BlockStuff.h"
#include <math.h>
#include <apr_strings.h>

const char* alpha_Color_asRGB(apr_pool_t* pool, float* color)
{
    char* text;
    if(pool) {
        text = apr_palloc(pool, sizeof(*text) * 36);
    }
    else {
        text = malloc(sizeof(*text) * 36);
    }

    apr_snprintf(text, 36, "rgb(%d, %d, %d)",
        (int)lrintf(color[0] * 255),
        (int)lrintf(color[1] * 255),
        (int)lrintf(color[2] * 255)
    );

    return text;
}

unsigned int cToI(const char c)
{
    switch(c) {
        case '0': return 0;
        case '1': return 1;
        case '2': return 2;
        case '3': return 3;
        case '4': return 4;
        case '5': return 5;
        case '6': return 6;
        case '7': return 7;
        case '8': return 8;
        case '9': return 9;
        case 'A':
        case 'a': return 10;
        case 'B':
        case 'b': return 11;
        case 'C':
        case 'c': return 12;
        case 'D':
        case 'd': return 13;
        case 'E':
        case 'e': return 14;
        case 'F':
        case 'f': return 15;
    }
    return 0;
}

/**
 * #abcdef
 */
void alpha_Color_Parse(float* color, const char* str)
{
    // passed a hex color (hopefully)
    unsigned int start = 0;
    if(str[start] == '#') {
        // Skip the leading #.
        ++start;
    }
    unsigned char r = cToI(str[start])*16;
    ++start;
    r += cToI(str[start]);
    ++start;

    unsigned char g = cToI(str[start])*16;
    ++start;
    g += cToI(str[start]);
    ++start;

    unsigned char b = cToI(str[start])*16;
    ++start;
    b += cToI(str[start]);
    ++start;

    alpha_Color_SetInt(color, r, g, b);
}

void alpha_Color_SetAll(float* color, float val)
{
    alpha_Color_Set(color, val, val, val);
}

void alpha_Color_Copy(float* dest, float *src)
{
    if(!dest || !src) {
        return;
    }
    dest[0] = src[0];
    dest[1] = src[1];
    dest[2] = src[2];
}

void alpha_Color_SetInt(float* color, unsigned char r, unsigned char g, unsigned char b)
{
    color[0] = (float)r / 255;
    color[1] = (float)g / 255;
    color[2] = (float)b / 255;
}

void alpha_Color_Set(float* color, float r, float g, float b)
{
    color[0] = r;
    color[1] = g;
    color[2] = b;
}

int alpha_Color_Equals(float* color, float* other)
{
    if(!color && !other) {
        return 1;
    }
    if(!color || !other) {
        return 0;
    }
    return color[0] == other[0] && color[1] == other[1] && color[2] == other[2];
}

int alpha_Color_EqualsValue(float* color, float value)
{
    if(!color) {
        return 0;
    }
    return color[0] == value && color[1] == value && color[2] == value;
}

int alpha_Color_EqualsValues(float* color, float r, float g, float b)
{
    if(!color) {
        return 0;
    }
    return color[0] == r && color[1] == g && color[2] == b;
}

void alpha_Color_SetAllInt(float* color, unsigned char v)
{
    alpha_Color_SetInt(color, v, v, v);
}

int alpha_Color_EqualsAllInt(float* color, unsigned char v)
{
    if(!color) {
        return 0;
    }
    float fv = (float)v / 255;
    return color[0] == fv && color[1] == fv && color[2] == fv;
}

int alpha_Color_EqualsInt(float* color, unsigned char r, unsigned char g, unsigned char b)
{
    if(!color) {
        return 0;
    }
    float tol = 0.001;
    float rdiff = color[0] == (float)r/255;
    float gdiff = color[1] == (float)g/255;
    float bdiff = color[2] == (float)b/255;
    return fabsf(rdiff) > tol || fabsf(gdiff) > tol || fabsf(bdiff) > tol;
}
