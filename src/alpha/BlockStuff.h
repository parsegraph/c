#ifndef alpha_BlockStuff_INCLUDED
#define alpha_BlockStuff_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>

struct alpha_Face;
struct alpha_Face_List {
    struct alpha_Face* face;
    struct alpha_Face_List* prev;
    struct alpha_Face_List* next;
};
typedef struct alpha_Face_List alpha_Face_List;

struct alpha_Color_List {
    struct alpha_Color* color;
    struct alpha_Color_List* prev;
    struct alpha_Color_List* next;
};
typedef struct alpha_Color_List alpha_Color_List;

alpha_Face_List* alpha_spliceFaceListNext(alpha_Face_List* given);
struct alpha_Face* alpha_Face_List_destroy(alpha_Face_List* item, apr_pool_t* pool);

struct alpha_Skin {
    apr_pool_t* pool;
    size_t length;
    alpha_Face_List* facesHead;
    alpha_Face_List* facesTail;
};
typedef struct alpha_Skin alpha_Skin;

#define alpha_TRIANGLES 0
#define alpha_QUADS 1

struct alpha_Vector_List {
    float value[4];
    struct alpha_Vector_List* prev;
    struct alpha_Vector_List* next;
};
typedef struct alpha_Vector_List alpha_Vector_List;

struct alpha_Face {
    int drawType;
    apr_pool_t* pool;
    size_t length;
    alpha_Vector_List* vectorsHead;
    alpha_Vector_List* vectorsTail;
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
    int id;
    const char* descSkin;
    const char* descShape;
    alpha_Skin* skin;
    alpha_Shape* shape;
    struct alpha_BlockType* next;
};
typedef struct alpha_BlockType alpha_BlockType;

struct alpha_BlockTypes {
    apr_pool_t* pool;
    size_t length;
    apr_hash_t* descriptions;
    alpha_BlockType* typeHead;
    alpha_BlockType* typeTail;
};
typedef struct alpha_BlockTypes alpha_BlockTypes;

struct alpha_Block {
    apr_pool_t* pool;
    alpha_BlockType* type;
    float pos[3];
    int orientation;
};
typedef struct alpha_Block alpha_Block;

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
void alpha_Color_fromStr(float* color, const char* str);
float* alpha_ColorFromStr(apr_pool_t* pool, const char* str);
float* alpha_Color_create(apr_pool_t* pool, float r, float g, float b);

alpha_Skin* alpha_Skin_new();
alpha_Face* alpha_Face_new(apr_pool_t* pool, int drawType);
alpha_Face* alpha_Face_Clone(alpha_Face* face);
void alpha_Face_destroy(alpha_Face* face);
void alpha_Face_addEach(alpha_Face* face, float x, float y, float z, float w);

alpha_Face* alpha_createFace(apr_pool_t* pool, int drawType, ...);
alpha_Shape* alpha_createShape(apr_pool_t* pool, ...);
void alpha_Shape_addFace(alpha_Shape* shape, alpha_Face* face);
alpha_Skin* alpha_createSkin(apr_pool_t* pool, ...);
void alpha_Skin_addFace(alpha_Skin* skin, alpha_Face* face);
void alpha_Skin_destroy(alpha_Skin* skin);

alpha_BlockTypes* alpha_BlockTypes_new(apr_pool_t* pool);
alpha_BlockType* alpha_BlockTypes_Load(alpha_BlockTypes* bt, const char* descSkin, const char* descShape, alpha_Skin* skin, alpha_Shape* shape);
alpha_BlockType* alpha_BlockTypes_Create(alpha_BlockTypes* bt, const char* descSkin,  const char* descShape, alpha_Skin* skin, alpha_Shape* shape);
alpha_BlockType* alpha_BlockTypes_GetByID(alpha_BlockTypes* bt, int id);
alpha_BlockType* alpha_BlockTypes_GetByName(alpha_BlockTypes* bt, const char* descSkin, const char* descShape);

alpha_Block* alpha_Block_new(apr_pool_t* pool, alpha_BlockType* type);
alpha_Block* alpha_createBlock(apr_pool_t* pool, alpha_BlockType* type, float* pos, int orientation);
int alpha_Block_Equals(alpha_Block* a, alpha_Block* b);
float* alpha_Block_GetAngleAxis(alpha_Block* block);
float* alpha_Block_GetQuaternion(alpha_Block* block, int actual);
void alpha_Block_destroy(alpha_Block* block);

#endif // alpha_BlockStuff_INCLUDED
