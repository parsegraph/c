#ifndef parsegraph_math_INCLUDED
#define parsegraph_math_INCLUDED

void getNumberParts(float x, int* sign, int* exponent, float* mantissa);
float parsegraph_absf(float v);
float parsegraph_clamp(float min, float v, float max);
float parsegraph_max(float a, float b);
float parsegraph_min(float a, float b);

#endif // parsegraph_math_INCLUDED
