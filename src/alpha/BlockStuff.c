// Version 1.5

/*
			[Vector]    [Color]
			  |         |
			 [Face]     [Skin]
			  |         |
			 [Shape] ---BlockType
			            |
			            ID -- just a number in a table with the BlockType as its value
			            |
		[alpha_Block(id, x, y, z, orientation)]
			            |
		    [alpha_Cluster(blockTypes)]

some of the above classes are really basic
really nothing but tables
they exist to make it easier to piece things together
hopefully
*/

#include "BlockStuff.h"
#include <math.h>
#include <apr_strings.h>
#include <stdlib.h>
#include <stdio.h>
#include "Maths.h"

//--------------------------------------------
//--------------------------------------------
//---------------  Colors  -------------------
//--------------------------------------------
//--------------------------------------------
// a simple class to make it easier to create colors;
// usage:
// local brown = Color( {.5,.25,1} ) or Color( .5,.25,1)
// local tan = Color( 203, 133, 63);
// local darkbrown = Color( "#3b2921")

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

void alpha_Color_fromStr(float* color, const char* str)
{
    alpha_Color_Parse(color, str);
}

float* alpha_ColorFromStr(apr_pool_t* pool, const char* str)
{
    float* color;
    if(pool) {
        color = apr_palloc(pool, sizeof(float)*3);
    }
    else {
        color = malloc(sizeof(float)*3);
    }
    alpha_Color_Parse(color, str);
    return color;
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

//--------------------------------------------
//--------------------------------------------
//---------------  Skin  ---------------------
//--------------------------------------------
//--------------------------------------------
// the skin object is simply an ordered list of colors
// one for each vertex of each face of a shape.
// a skin can only be applied to a shape with
// the same number of vertices
// you create a skin by passing it a nested table of colors
// skins aren't designed to be edited once created
// Skin( {
// 	{ green, green, green, green }, -- face 1 has 4 vertices
// 	{ brown, brown, brown, brown }, -- face 2
// 	{ brown, brown, brown, brown }, -- face 3
// 		--and so on until you have the full skin
// })

alpha_Skin* alpha_Skin_new(apr_pool_t* pool)
{
    alpha_Skin* skin;
    if(pool) {
        skin = apr_palloc(pool, sizeof(*skin));
    }
    else {
        skin = malloc(sizeof(*skin));
    }
    skin->pool = pool;
    skin->facesHead = 0;
    skin->facesTail = 0;
    skin->length = 0;
    return skin;
}

void alpha_Skin_destroy(alpha_Skin* skin)
{
    if(!skin->pool) {
    }
}

alpha_Skin* alpha_createSkin(apr_pool_t* pool, ...)
{
    alpha_Skin* skin = alpha_Skin_new(pool);
    va_list ap;
    va_start(ap, pool);
    // Passed faces directly.
    alpha_Face* face;
    while((face = va_arg(ap, alpha_Face*))) {
        alpha_Skin_addFace(skin, face);
    }
    va_end(ap);
    return skin;
}

alpha_Face_List* alpha_Face_List_new(apr_pool_t* pool)
{
    alpha_Face_List* item;
    if(pool) {
        item = apr_palloc(pool, sizeof(*item));
    }
    else {
        item = malloc(sizeof(*item));
    }
    return item;
}

alpha_Face* alpha_Face_List_destroy(alpha_Face_List* item, apr_pool_t* pool)
{
    alpha_Face* face = item->face;
    if(!pool) {
        free(item);
    }
    return face;
}

/**
 * Adds the given face to this skin.
 *
 * The face is not copied.
 */
void alpha_Skin_addFace(alpha_Skin* skin, alpha_Face* face)
{
    alpha_Face_List* item = alpha_Face_List_new(skin->pool);
    item->face = face;
    if(skin->facesTail) {
        skin->facesTail->next = item;
        skin->facesTail = item;
    }
    else {
        skin->facesTail = item;
        skin->facesHead = item;
    }
    ++skin->length;
}

void alpha_Skin_addFaceAt(alpha_Skin* skin, int i, alpha_Face* face)
{
    if(i == 0 && !skin->facesHead->face) {
        skin->facesHead->face = face;
        ++skin->length;
        return;
    }

    // Create the item.
    alpha_Face_List* given = skin->facesHead;
    while(given && i-- > 0) {
        given = given->next;
    }
    alpha_Face_List* item = alpha_Face_List_new(skin->pool);
    item->face = face;

    // Splice in the item.
    item->next = given->next;
    given->next = item;
    ++skin->length;
}

alpha_Face* alpha_Skin_removeAt(alpha_Skin* skin, int i)
{
    alpha_Face* rv;
    if(i == 0) {
        // Remove the head.
        rv = skin->facesHead->face;
        alpha_Face_List* newHead = skin->facesHead->next;
        if(newHead) {
            alpha_Face_List_destroy(skin->facesHead, skin->pool);
            skin->facesHead = newHead;
        }
        else {
            // TEST_ASSERT_MESSAGE(skin->facesHead == skin->facesTail, "Only one element, so do nothing.")
            skin->facesHead->face = 0;
        }
        --skin->length;
        return rv;
    }

    // Otherwise, find the given.
    alpha_Face_List* given = skin->facesHead;
    while(given && i-- > 0) {
        given = given->next;
    }
    --skin->length;
    return alpha_Face_List_destroy(alpha_spliceFaceListNext(given), skin->pool);
}

/**
 * Remove: given..removed..following -> given, removed->following
 */
alpha_Face_List* alpha_removeFaceListNext(alpha_Face_List* given)
{
    alpha_Face_List* removed = given->next;
    given->next = 0;
    return removed;
}

/*
 * Splice: given..removed..following -> removed, given..following
 */
alpha_Face_List* alpha_spliceFaceListNext(alpha_Face_List* given)
{
    alpha_Face_List* removed = given->next;
    given->next = removed->next;
    removed->next = 0;
    return removed;
}

void alpha_Skin_forEach(alpha_Skin* skin, void(*callback)(void*, alpha_Face*, int, alpha_Skin*), void* thisArg)
{
    alpha_Face_List* f = skin->facesHead;
    int i = 0;
    while(f) {
        callback(thisArg, f->face, i++, skin);
        f=f->next;
    }
};

//--------------------------------------------
//--------------------------------------------
//---------------  Face  ---------------------
//--------------------------------------------
//--------------------------------------------
// face is a simple grouping of vertices
// designed to be rendered by 1 call of GL_QUADS
// or its ilk
// local cubeTop = new alpha_Face(alpha_QUADS, vector, vector, vector, vector);
//
// Face does not copy the vectors.
    // because its a temporary construction
// Once it is passed to a shape the shape will copy it
// DO NOT REUSE ( until after the face is applied to a shape )
alpha_Face* alpha_Face_new(apr_pool_t* pool, int drawType)
{
    alpha_Face* face;
    if(pool) {
        face = apr_palloc(pool, sizeof(*face));
        face->vectorsHead = apr_palloc(pool, sizeof(alpha_Vector_List));
    }
    else {
        face = malloc(sizeof(*face));
        face->vectorsHead = malloc(sizeof(alpha_Vector_List));
    }
    face->pool = pool;
    face->drawType = drawType;
    memset(face->vectorsHead->value, 0, sizeof(float)*4);
    face->vectorsHead->next = 0;
    face->vectorsHead->prev = 0;
    face->vectorsTail = face->vectorsHead;
    face->length = 0;
    return face;
}

alpha_Face* alpha_createFace(apr_pool_t* pool, int drawType, ...)
{
    alpha_Face* face = alpha_Face_new(pool, drawType);
    va_list ap;
    va_start(ap, drawType);
    while(1) {
        float* vec = va_arg(ap, float*);
        if(!vec) {
            break;
        }
        alpha_Face_addEach(face, vec[0], vec[1], vec[2], vec[3]);
    }
    va_end(ap);
    return face;
}

alpha_Face* alpha_Face_Clone(alpha_Face* face)
{
    alpha_Face* clone = alpha_Face_new(face->pool, face->drawType);
    alpha_Vector_List* vec = face->vectorsHead;
    while(vec) {
        alpha_Face_addEach(clone, vec->value[0], vec->value[1], vec->value[2], vec->value[3]);
        vec = vec->next;
    }
    return clone;
}

void alpha_Face_addEach(alpha_Face* face, float x, float y, float z, float w)
{
    if(face->length==0) {
        alpha_Quaternion_Set(&face->vectorsHead->value[0], x, y, z, w);
        face->vectorsHead->next = 0;
        face->vectorsTail = face->vectorsHead;
    }
    else {
        alpha_Vector_List* item;
        if(face->pool) {
            item = apr_palloc(face->pool, sizeof(*item));
        }
        else {
            item = malloc(sizeof(*item));
        }
        alpha_Quaternion_Set(&item->value[0], x, y, z, w);
        item->next = 0;
        face->vectorsTail->next = item;
        item->prev = face->vectorsTail;
        face->vectorsTail = item;
    }
    ++face->length;
}

void alpha_Face_destroy(alpha_Face* face)
{
    if(!face->pool) {
        free(face->vectorsHead);
        free(face);
    }
}

//--------------------------------------------
//--------------------------------------------
//--------------  Shape  ---------------------
//--------------------------------------------
//--------------------------------------------
// shape is a list of faces
// tha when all drawn will make some sort of ...
// SHAPE -- SURPISE!
// initialize it with a list of faces;
// var CUBE = new alpha_Shape(
    // cubeTop,
    // cubeBottom,
    // cubeLeft,
    // cubeRight,
    // cubeFront,
    // cubeBack
// )
alpha_Shape* alpha_Shape_new(apr_pool_t* pool)
{
    alpha_Shape* shape;
    if(pool) {
        shape = apr_palloc(pool, sizeof(*shape));
        shape->facesHead = apr_palloc(pool, sizeof(struct alpha_Face_List));
    }
    else {
        shape = malloc(sizeof(*shape));
        shape->facesHead = malloc(sizeof(struct alpha_Face_List));
    }
    shape->pool = pool;
    shape->length = 0;
    shape->facesTail = 0;
    return shape;
}

void alpha_Shape_addFace(alpha_Shape* shape, alpha_Face* face)
{
    if(shape->length == 0) {
        shape->facesHead->face = face;
        shape->facesHead->next = 0;
        shape->facesTail = shape->facesHead;
    }
    else {
        alpha_Face_List* item;
        if(shape->pool) {
            item = apr_palloc(shape->pool, sizeof(*item));
        }
        else {
            item = malloc(sizeof(*item));
        }
        item->face = face;
        item->next = 0;
        shape->facesTail->next = item;
        shape->facesTail = item;
    }
    shape->length++;
}

alpha_Shape* alpha_createShape(apr_pool_t* pool, ...)
{
    alpha_Shape* shape = alpha_Shape_new(pool);
    va_list ap;
    va_start(ap, pool);
    alpha_Face* face;
    while(1) {
        face = va_arg(ap, alpha_Face*);
        if(!face) {
            break;
        }
        alpha_Shape_addFace(shape, face);
    }
    va_end(ap);
    return shape;
}

//--------------------------------------------
//--------------------------------------------
//----------- BlockTypes  --------------------
//--------------------------------------------
//--------------------------------------------
// Blocktype is where you combine a Shape(pos vec) with A Skin(color vec)
// var stone = new alpha_BlockType("stone", "cube", Stone, graySkin)
// BlockType automatically loads created BlockTypes into the BlockIDs table
// it is some sort of hybrid object / masterlist

alpha_BlockTypes* alpha_BlockTypes_new(apr_pool_t* pool)
{
    alpha_BlockTypes* bt;
    if(pool) {
        bt = apr_palloc(pool, sizeof(*bt));
        bt->typeHead = apr_palloc(pool, sizeof(struct alpha_BlockType));
    }
    else {
        bt = malloc(sizeof(*bt));
        bt->typeHead = malloc(sizeof(struct alpha_BlockType));
    }
    bt->typeHead->next = 0;
    bt->length = 0;
    bt->pool = pool;
    return bt;
}

void alpha_BlockTypes_destroy(alpha_BlockTypes* bt)
{
    if(!bt->pool) {
        if(bt->length > 0) {
            alpha_BlockType* type = bt->typeHead->next;
            while(type) {
                alpha_BlockType* n = type->next;
                free(type);
                type = n;
            }
        }
        free(bt->typeHead);
        free(bt);
    }
}

alpha_BlockType* alpha_BlockTypes_Load(alpha_BlockTypes* bt, const char* descSkin, const char* descShape, alpha_Skin* skin, alpha_Shape* shape)
{
    return alpha_BlockTypes_Create(bt, descSkin, descShape, skin, shape);
}

/**
 * creates a blocktype and returns the id.
 */
alpha_BlockType* alpha_BlockTypes_Create(alpha_BlockTypes* bt, const char* descSkin,  const char* descShape, alpha_Skin* skin, alpha_Shape* shape)
{
    if(bt->length == 0) {
        bt->typeHead->id = bt->length;
        bt->typeHead->descSkin = descSkin;
        bt->typeHead->descShape = descShape;
        bt->typeHead->skin = skin;
        bt->typeHead->shape = shape;
        bt->typeTail = bt->typeHead;
    }
    else {
        alpha_BlockType* newI;
        if(bt->pool) {
            newI = apr_palloc(bt->pool, sizeof(*newI));
        }
        else {
            newI = malloc(sizeof(*newI));
        }
        newI->id = bt->length;
        newI->descSkin = descSkin;
        newI->descShape = descShape;
        newI->skin = skin;
        newI->shape = shape;
        newI->next = 0;
        bt->typeTail->next = newI;
        bt->typeTail = newI;
    }
    bt->length++;
    return bt->typeTail;
};

alpha_BlockType* alpha_BlockTypes_GetByID(alpha_BlockTypes* bt, int id)
{
    if(bt->length == 0) {
        return 0;
    }
    alpha_BlockType* candidate = bt->typeHead;
    while(candidate) {
        if(candidate->id == id) {
            return candidate;
        }
        candidate = candidate->next;
    }
    return 0;
}

alpha_BlockType* alpha_BlockTypes_GetByName(alpha_BlockTypes* bt, const char* descSkin, const char* descShape)
{
    if(bt->length == 0) {
        return 0;
    }
    alpha_BlockType* candidate = bt->typeHead;
    while(candidate) {
        if(candidate->descSkin && candidate->descShape &&
            !strcmp(candidate->descSkin, descSkin) && !strcmp(candidate->descShape, descShape)
        ) {
            return candidate;
        }
        candidate = candidate->next;
    }
    return 0;
};

//--------------------------------------------
//--------------------------------------------
//--------------  Blocks ---------------------
//--------------------------------------------
//--------------------------------------------

alpha_Block* alpha_Block_new(apr_pool_t* pool, alpha_BlockType* type)
{
    alpha_Block* block;
    if(pool) {
        block = apr_palloc(pool, sizeof(*block));
    }
    else {
        block = malloc(sizeof(*block));
    }
    block->pool = pool;
    block->type = type;
    return block;
}

void alpha_Block_destroy(alpha_Block* block)
{
    if(!block->pool) {
        free(block);
    }
}

alpha_Block* alpha_createBlock(apr_pool_t* pool, alpha_BlockType* type, float* pos, int orientation)
{
    alpha_Block* block = alpha_Block_new(pool, type);
    alpha_Vector_Copy(block->pos, pos);
    block->orientation = orientation;
    if(block->orientation >= 24 || block->orientation < 0) {
        fprintf(stderr, "Orientation cannot be out of bounds: %d", block->orientation);
        alpha_Block_destroy(block);
        return 0;
    }
    return block;
}

int alpha_Block_Equals(alpha_Block* a, alpha_Block* b)
{
    if(!a && !b) {
        return 1;
    }
    if(!a || !b) {
        return 0;
    }
    return alpha_Vector_Equals(a->pos, b->pos);
};

#define s45 0.7071067811865475
static float alpha_BlockOrientations[] = {
    // BOTTOM
    // X( 0 )  Y( 0 )  Z( 0 )
    0, 0, 0, 1, // 0
    // X( 0 )  Y( 90 )  Z( 0 )
    0, s45, 0, s45, // 1
    // X( 0 )  Y( 180 )  Z( 0 )
    0, 1, 0, 0, // 2
    // X( 0 )  Y( 270 )  Z( 0 )
    0, s45, 0, -s45, // 3

    // FRONT
    // X( 90 )  Y( 0 )  Z( 0 )
    -s45 ,    0 ,    0 , -s45, // 4
    // X( 90 )  Y( 90 )  Z( 0 )
    -0.5 , -0.5 , -0.5 , -0.5, // 5
    // X( 90 )  Y( 180 )  Z( 0 )
    0 , -s45 , -s45 ,    0, // 6
    // X( 90 )  Y( 270 )  Z( 0 )
    0.5 , -0.5 , -0.5 ,  0.5, // 7

    // LEFT
    // X( 0 )  Y( 0 )  Z( 270 )
    0 ,  0   , -s45 ,  s45, // 8
    // X( 0 )  Y( 90 )  Z( 270 )
    0.5 ,  0.5 , -0.5 ,  0.5, // 9
    // X( 0 )  Y( 180 )  Z( 270 )
    s45 ,  s45 ,    0 ,    0, // 10
    // X( 0 )  Y( 270 )  Z( 270 )
    0.5 ,  0.5 ,  0.5 , -0.5, // 11

    // BACK
    // X( 270 )  Y( 0 )  Z( 0 )
    -s45 ,    0 ,    0 ,  s45, // 12
    // X( 270 )  Y( 90 )  Z( 0 )
    -0.5 ,  0.5 , -0.5 ,  0.5, // 13
    // X( 270 )  Y( 180 )  Z( 0 )
    0 ,  s45 , -s45 ,    0, // 14
    // X( 270 )  Y( 270 )  Z( 0 )
    0.5 ,  0.5 , -0.5 , -0.5, // 15

    // RIGHT
    // X( 0 )  Y( 0 )  Z( 90 )
    0 ,    0 , -s45 , -s45, // 16
    // X( 0 )  Y( 90 )  Z( 90 )
    0.5 , -0.5 , -0.5 , -0.5, // 17
    // X( 0 )  Y( 180 )  Z( 90 )
    s45 , -s45 ,    0 ,    0, // 18
    // X( 0 )  Y( 270 )  Z( 90 )
    0.5 , -0.5 ,  0.5 ,  0.5, // 19

    // TOP
    // X( 180 )  Y( 0 )  Z( 0 )
    1 ,    0 ,    0 ,    0, // 20
    // X( 180 )  Y( 90 )  Z( 0 )
    s45 ,    0 ,  s45 ,    0, // 21
    // X( 180 )  Y( 180 )  Z( 0 )
    0 ,    0 ,    1 ,    0, // 22
    // X( 180 )  Y( 270 )  Z( 0 )
    -s45 ,    0 ,  s45 ,    0 // 23
};

float* alpha_Block_GetAngleAxis(alpha_Block* block)
{
    return alpha_Quaternion_ToAxisAndAngle(
        &alpha_BlockOrientations[4*block->orientation],
        block->pool
    );
};

// naively calling this function results in a quaternion that you can
// manipulate but not  destroy the Block.Orienations
// passing something to actual lets you avoid the overhead of making a new
// quaternion; and returns the same quaternion for the same rotation
// for better comparing
// in C these values would be const static
float* alpha_Block_GetQuaternion(alpha_Block* block, int actual)
{
    if(actual) {
        return &alpha_BlockOrientations[4*block->orientation];
    }
    return alpha_Quaternion_Clone(block->pool, &alpha_BlockOrientations[4*block->orientation]);
};
