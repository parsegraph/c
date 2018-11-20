#include "math.h"

float parsegraph_max(float a, float b)
{
    return a > b ? a : b;
}

float parsegraph_min(float a, float b)
{
    return a < b ? a : b;
}

float parsegraph_absf(float v)
{
    if(v < 0) {
        return -v;
    }
    return v;
}

float parsegraph_clamp(float min, float v, float max)
{
    if(v < min) {
        v = min;
    }
    if(v > max) {
        v = max;
    }
    return v;
}

// http://stackoverflow.com/questions/9383593/extracting-the-exponent-and-mantissa-of-a-javascript-number
void getNumberParts(float x, int* sign, int* exponent, float* mantissa)
{
    char* bytes = (char*)&x;
    *sign = bytes[7] >> 7;
    *exponent = ((bytes[7] & 0x7f) << 4 | bytes[6] >> 4) - 0x3ff;
    bytes[7] = 0x3f;
    bytes[6] |= 0xf0;
    *mantissa = x;
}
