#include <apr_pools.h>

float* alpha_Color_new(apr_pool_t* pool);
const char* alpha_Color_asRGB(apr_pool_t* pool, float* color);
void alpha_Color_Set(float* color, float, float, float);
void alpha_Color_SetInt(float* color, unsigned char r, unsigned char g, unsigned char b);
void alpha_Color_Copy(float* color, float *other);
void alpha_Color_SetAll(float* color, float val);
void alpha_Color_SetAllInt(float* color, unsigned char v);
void alpha_Color_Parse(float* color, const char* str);
int alpha_Color_Equals(float* color, float* other);
int alpha_Color_EqualsValue(float* color, float value);
int alpha_Color_EqualsAllInt(float* color, unsigned char v);
int alpha_Color_EqualsInt(float* color, unsigned char r, unsigned char g, unsigned char b);
int alpha_Color_EqualsValues(float* color, float r, float g, float b);
