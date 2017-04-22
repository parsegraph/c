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

float* alpha_Color_create(apr_pool_t* pool, float r, float g, float b)
{
    float* color = alpha_Color_new(pool);
    alpha_Color_Set(color, r, g, b);
    return color;
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

float* alpha_Color_fromStr(apr_pool_t* pool, const char* str)
{
    float* color = apr_Color_new(pool);
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
    va_list ap;
    va_start(ap, pool);
    // Passed faces directly.
    skin->numFaces = 0;
    while(alpha_Face* face = va_arg(ap, alpha_Face*)) {
        skin->length++;
        alpha_Skin_addFace(skin, face);
    }
    va_end(ap);
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
    if(!skin->facesTail->face) {
        skin->facesTail->face = face;
    }
    else {
        alpha_Face_List* item = alpha_Face_List_new(skin->pool);
        item->face = face;
        //TEST_ASSERT_MESSAGE(skin->facesTail->next == 0);
        skin->facesTail->next = item;
        skin->facesTail = item;
    }
    skin->numFaces;
}

void alpha_Skin_addFaceAt(alpha_Skin* skin, int i, alpha_Face* face)
{
    if(i == 0 && !skin->facesHead->face) {
        skin->facesHead->face = face;
        return;
    }

    // Create the item.
    alpha_List_Item* given = skin->facesHead;
    while(given && i-- > 0) {
        given = given->next;
    }
    alpha_Face_List* item = alpha_Face_List_new(skin->pool);
    item->face = face;

    // Splice in the item.
    item->next = given->next;
    given->next = item;
}

alpha_Face* alpha_Skin_removeAt(alpha_Skin* skin, int i)
{
    alpha_Face* rv;
    if(i == 0) {
        // Remove the head.
        rv = skin->facesHead->face;
        alpha_Face_List* newHead = skin->facesHead->next;
        if(newHead) {
            alpha_destroyFaceList(skin->facesHead);
            skin->facesHead = newHead;
        }
        else {
            // TEST_ASSERT_MESSAGE(skin->facesHead == skin->facesTail, "Only one element, so do nothing.")
            skin->facesHead->face = 0;
        }
        return rv;
    }

    // Otherwise, find the given.
    alpha_Face_List* given = skin->facesHead;
    while(given && i-- > 0) {
        given = given->next;
    }
    return alpha_Face_List_destroy(alpha_spliceFaceListNext(given));
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

void alpha_Skin_addFace(alpha_Skin* skin, alpha_Face* face)
{
    if(!skin->facesTail->face) {
        // At root.
        skin->facesTail->face = face;
    }
    else {
        alpha_Face_List* newTail;
        if(skin->pool) {
            newTail = apr_palloc(pool, sizeof(*newTail));
        }
        else {
            newTail = malloc(sizeof(*newTail));
        }
        newTail->face = face;
        skin->facesTail->next = newTail;
        skin->facesTail = newTail;
    }
}

void alpha_Shape_addFace(alpha_Skin* skin, alpha_Face* face)
{
    if(!skin->facesTail->face) {
        // At root.
        skin->facesTail->face = face;
    }
    else {
        alpha_Face_List* newTail;
        if(skin->pool) {
            newTail = apr_palloc(pool, sizeof(*newTail));
        }
        else {
            newTail = malloc(sizeof(*newTail));
        }
        newTail->face = face;
        skin->facesTail->next = newTail;
        skin->facesTail = newTail;
    }
}

alpha_Skin* alpha_Skin_new()
{
    if(arguments.length > 0) {
        // Passed a single array of faces.
        this.length = arguments[0].length;
        for(var i = 0; i < arguments[0].length; ++i) {
            var face = arguments[0][i];
            this[i] = [];
            for(var j = 0; j < face.length; ++j) {
                this[i].push(new alpha_Color(face[j]));
                var c = face[j];
            }
        }
    }
    else {
        // An empty skin?
        this.length = 0;
    }
}

void alpha_Skin_forEach(alpha_Skin* skin, void(*callback)(void*, float*, int, alpha_Skin*), void* thisArg)
{
    for(int i = 0; i < skin->length; ++i) {
        callback(thisArg, this[i], i, this);
    }
};

int alpha_TRIANGLES = 0;
int alpha_QUADS = 1;


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
alpha_Face* alpha_Face_new(apr_pool_t* pool)
{
    alpha_Face* face;
    if(pool) {
        face = apr_palloc(pool, sizeof(*face));
    }
    else {
        face = malloc(sizeof(*face));
    }
    face->pool = pool;
    return face;
}

alpha_Face* alpha_Face_Clone(alpha_Face* face)
{
    alpha_Face* clone = alpha_Face_new(face->pool);
    alpha_Face_List* item
    alpha_Face_addFace(clone, );
    return clone;
}

void alpha_Face_destroy(alpha_Face* face)
{
    if(!face->pool) {
        free(face);
    }
}

alpha_Face* alpha_Face_new(apr_pool_t* pool)
{
    this.drawType = arguments[0];

    if(arguments.length > 2) {
        this.length = (arguments.length - 1);
        for(var i = 1; i < arguments.length; ++i) {
            this[i - 1] = arguments[i];
        }
    }
    else {
        this.length = arguments[1].length;
        for(var i = 0; i < arguments[1].length; ++i) {
            this[i] = arguments[1][i];
        }
    }
};

alpha_Face.prototype.Clone = function()
{
    var values = [];
    for(var i = 0; i < this.length; ++i) {
        values.push(this[i].Clone());
    }
    return new alpha_Face(this.drawType, values);
};

alpha_Face.prototype.toString = function()
{
    var rv = "";
    for(var i = 0; i < this.length; ++i) {
        if(i > 0) {
            rv += ", ";
        }
        rv += this[i].toString();
    }
    return rv;
};

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
function alpha_Shape()
{
    this.length = arguments.length;
    for(var i = 0; i < arguments.length; ++i) {
        this[i] = arguments[i].Clone();
    }
}

