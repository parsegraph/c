#include <apr_pools.h>

struct alpha_Face_List {
    alpha_Face* face;
    alpha_Face_List* next;
};
typedef struct alpha_Face_List alpha_Face_List;

struct alpha_Skin {
    apr_pool_t* pool;
    size_t length;
    alpha_Face_List* facesHead;
    alpha_Face_List* facesTail;
};
typedef struct alpha_Skin alpha_Skin;

struct alpha_Face {
    apr_pool_t* pool;
    size_t length;
    alpha_Face_List* facesHead;
    alpha_Face_List* facesTail;
};
typedef struct alpha_Face alpha_Face;

struct alpha_Shape {
    apr_pool_t* pool;
    size_t length;
    alpha_Face_List* facesHead;
    alpha_Face_List* facesTail;
};
typedef struct alpha_Shape alpha_Shape;

struct alpha_BlockType {
    apr_pool_t* pool;
    size_t length;
    alpha_Face_List* facesHead;
    alpha_Face_List* facesTail;
};
typedef struct alpha_Shape alpha_Shape;

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
void alpha_Color_fromStr(apr_pool_t* pool, const char* str);
float* alpha_Color_create(apr_pool_t* pool, float r, float g, float b);

alpha_Skin* alpha_Skin_new();

extern int alpha_TRIANGLES = 0;
extern int alpha_QUADS = 1;

