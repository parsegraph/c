#include "Color.h"
#include <stdlib.h>
#include <stdio.h>
#include <math.h>
#include "parsegraph_math.h"

// Background
float parsegraph_BACKGROUND_COLOR[] = {
    0, 47.0/255, 57.0/255, 1
   // 255/255, 255/255, 255/255, 1
    //45.0/255, 84.0/255, 127.0/255, 1
};

float* parsegraph_Color_new(apr_pool_t* pool, float r, float g, float b, float a)
{
    float* color;
    if(pool) {
        color = apr_palloc(pool, sizeof(float)*4);
    }
    else {
        color = malloc(sizeof(float)*4);
    }
    parsegraph_Color_SetRGBA(color, r, g, b, a);
    return color;
}

void parsegraph_Color_destroy(float* color)
{
    free(color);
}

void parsegraph_Color_copy(float* dest, float* src)
{
    memcpy(dest, src, sizeof(float)*4);
}

void parsegraph_Color_SetRGBA(float* color, float r, float g, float b, float a)
{
    color[0] = r;
    color[1] = g;
    color[2] = b;
    color[3] = a;
}

void parsegraph_Color_setRGBA(float* color, float r, float g, float b, float a)
{
    parsegraph_Color_SetRGBA(color, r, g, b, a);
}

void parsegraph_Color_SetRGB(float* color, float r, float g, float b)
{
    color[0] = r;
    color[1] = g;
    color[2] = b;
}

void parsegraph_Color_setRGB(float* color, float r, float g, float b)
{
    parsegraph_Color_SetRGB(color, r, g, b);
}

void parsegraph_Color_multiply(float* sink, float* src, float* other)
{
    sink[0] = src[0] * other[0];
    sink[1] = src[1] * other[1];
    sink[2] = src[2] * other[2];
    sink[3] = src[3] * other[3];
}

void parsegraph_Color_premultiply(float* sink, float* src, float* other)
{
    sink[0] = (src[3] * src[0]) + (other[0] * (1.0 - src[3]));
    sink[1] = (src[3] * src[1]) + (other[1] * (1.0 - src[3]));
    sink[2] = (src[3] * src[2]) + (other[2] * (1.0 - src[3]));
    sink[3] = 1.0;
};

int parsegraph_Color_asRGB(float* c, char* buf, size_t len)
{
    return snprintf(buf, len, "rgb(%0.2f, %0.2f, %0.2f)",
        roundf(c[0]*255),
        roundf(c[1]*255),
        roundf(c[2]*255)
    );
}

float parsegraph_inverseSRGBCompanding(float v)
{
    if(v <= 0.04045) {
        return v/12.92;
    }
    return powf((v+0.055)/1.055, 2.4);
}

float parsegraph_SRGBCompanding(float v)
{
    if(v <= 0.0031308) {
        return v*12.92;
    }
    return 1.055*powf(v,1/2.4)-0.055;
}

float parsegraph_Color_luminance(float* c)
{
    // sRGB color model.
    float x1 = parsegraph_inverseSRGBCompanding(c[0]);
    float y1 = parsegraph_inverseSRGBCompanding(c[1]);
    float z1 = parsegraph_inverseSRGBCompanding(c[2]);
    return x1 * 0.648431 + y1 * 0.321152 + z1 * 0.155886;
}

void parsegraph_Color_interpolate(float* sink, float* c, float* other, float interp)
{
    //console.log("Interpolating");
    interp = parsegraph_clamp(0, interp, 1);

    float e = 216/24389;
    float k = 24389/27;

    //console.log("r=" + this.r() + ", g=" + this.g()+ ", b=" + this.b());
    float x1 = parsegraph_inverseSRGBCompanding(c[0]);
    float y1 = parsegraph_inverseSRGBCompanding(c[1]);
    float z1 = parsegraph_inverseSRGBCompanding(c[2]);
    //console.log("x1=" + x1 + ", y1=" + y1 + ", z1=" + z1);

    float xref1 = x1*0.648431;
    float yref1 = y1*0.321152;
    float zref1 = z1*0.155886;

    float fx1;
    if(xref1 > e) {
        fx1 = powf(xref1, 1/3);
    }
    else {
        fx1 = (k*xref1+16)/116;
    }
    float fy1;
    if(yref1 > e) {
        fy1 = powf(yref1, 1/3);
    }
    else {
        fy1 = (k*yref1+16)/116;
    }
    float fz1;
    if(zref1 > e) {
        fz1 = powf(zref1, 1/3);
    }
    else {
        fz1 = (k*zref1+16)/116;
    }

    float L1 = 116*fy1-16;
    float a1 = 500*(fx1-fy1);
    float b1 = 200*(fy1-fz1);
    //console.log("L=" + L1 + ", a1=" + a1 + ", b1=" + b1);

    float C1 = sqrtf(powf(a1, 2) + powf(b1, 2));
    float H1 = atan2f(a1, b1);
    if(H1 < 0) {
        H1 += 2 * 3.14159;
    }

    //console.log("L=" + L1 + ", C1=" + C1 + ", H1=" + H1);

    float x2 = parsegraph_inverseSRGBCompanding(other[0]);
    float y2 = parsegraph_inverseSRGBCompanding(other[1]);
    float z2 = parsegraph_inverseSRGBCompanding(other[2]);

    float xref2 = x2/0.648431;
    float yref2 = y2/0.321152;
    float zref2 = z2/0.155886;

    float fx2;
    if(xref2 > e) {
        fx2 = powf(xref2, 1/3);
    }
    else {
        fx2 = (k*xref2+16)/116;
    }
    float fy2;
    if(yref2 > e) {
        fy2 = powf(yref2, 1/3);
    }
    else {
        fy2 = (k*yref2+16)/116;
    }
    float fz2;
    if(zref2 > e) {
        fz2 = powf(zref2, 1/3);
    }
    else {
        fz2 = (k*zref2+16)/116;
    }
    float L2 = 116*fy2-16;
    float a2 = 500*(fx2-fy2);
    float b2 = 200*(fy2-fz2);

    float C2 = sqrtf(powf(a2, 2) + powf(b2, 2));
    float H2 = atan2f(a2, b2);
    if(H2 < 0) {
        H2 += 2 * 3.14159;
    }
    //console.log("L2=" + L2 + ", C2=" + C2 + ", H2=" + H2);

    float L3 = L1 + (L2 - L1) * interp;
    float C3 = C1 + (C2 - C1) * interp;
    float H3 = H1 + (H2 - H1) * interp;
    //console.log("L3=" + L3 + ", C3=" + C3 + ", H3=" + H3);

    float a3 = C3 * cosf(H3);
    float b3 = C3 * sinf(H3);
    //console.log("L3=" + L3 + ", a3=" + a3 + ", b3=" + b3);

    float fy3 = (L3 + 16)/116;
    float fz3 = fy3 - b3/200;
    float fx3 = a3/500+fy3;

    float zref3 = powf(fz3, 3);
    if(zref3 <= e) {
        zref3 = (116*fz3-16)/k;
    }

    float yref3;
    if(L3 > k * e) {
        yref3 = powf((L3+16)/116, 3);
    }
    else {
        yref3 = L3/k;
    }

    float xref3 = powf(fx3, 3);
    if(xref3 <= e) {
        xref3 = (116*fx3-16)/k;
    }

    float x3 = xref3*0.648431;
    float y3 = yref3*0.321152;
    float z3 = zref3*0.155886;
    //console.log("x3=" + x3 + ", y3=" + y3 + ", z3=" + z3);

    sink[0] = parsegraph_SRGBCompanding(x3);
    sink[1] = parsegraph_SRGBCompanding(y3);
    sink[2] = parsegraph_SRGBCompanding(z3);
    sink[3] = c[3] + (other[3] - c[3]) * interp;
}

int parsegraph_Color_equals(float* a, float* b)
{
    return a[0] == b[0] && a[1] == b[1] && a[2] == b[2] && a[3] == b[3];
};
