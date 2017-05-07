#include "BlockIDs.h"
#include "BlockStuff.h"
#include "Maths.h"
#include "../graph/log.h"

// Version 1.3

float alpha_cubeStructure[] = {
    -0.5, 0.5, 0.5, // 0
    0.5, 0.5, 0.5, // 1
    0.5, 0.5, -0.5, // 2
    -0.5, 0.5, -0.5, // 3
    0.5, -0.5, 0.5, // 4
    -0.5, -0.5, 0.5, // 5
    -0.5, -0.5, -0.5, // 6
    0.5, -0.5, -0.5 // 7
};

// vertices!
float* alpha_BuildCubeStructure(apr_pool_t* pool)
{
    float* cubeStructure;
    if(pool) {
        cubeStructure = apr_palloc(pool, sizeof(*cubeStructure));
    }
    else {
        cubeStructure = malloc(sizeof(*cubeStructure));
    }
    memcpy(cubeStructure, alpha_cubeStructure, sizeof(alpha_cubeStructure));
    return cubeStructure;
};

// a slab lowers the top of the cube to the bottom;
float* alpha_BuildSlabStructure(apr_pool_t* pool)
{
    float* slabStructure = alpha_BuildCubeStructure(pool);
    for(int i = 0; i <= 3; ++i) {
        alpha_Vector_AddEach(&slabStructure[i*sizeof(float)*3], 0, -0.5, 0);
    }
    return slabStructure;
}

void alpha_standardBlockTypes(apr_pool_t* pool, alpha_BlockTypes* BlockTypes) {
    if(!BlockTypes) {
        parsegraph_log("BlockTypes must not be null");
        return;
    }

    // skins
    float* dbrown = alpha_ColorFromStr(pool, "#3b2921");
    float* lbrown = alpha_ColorFromStr(pool, "#604b42");
    float* ggreen = alpha_ColorFromStr(pool, "#0b9615");
    float* gray = alpha_ColorFromStr(pool, "#5e5a5e");
    float* lgray = alpha_ColorFromStr(pool, "#726f72");

    //top to bottom
    // counter-clockwise
    // front to back
    alpha_Skin* dirt = alpha_createSkin(pool,
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, lbrown, lbrown, 0), // top
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // front
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // left
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // back
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // right
        alpha_createFace(pool, alpha_QUADS, dbrown, dbrown, dbrown, dbrown, 0), // bottom
        0
    );

    alpha_Skin* grass = alpha_createSkin(pool,
        alpha_createFace(pool, alpha_QUADS, ggreen, ggreen, ggreen, ggreen, 0), // top
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // front
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // left
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // back
        alpha_createFace(pool, alpha_QUADS, lbrown, lbrown, dbrown, dbrown, 0), // right
        alpha_createFace(pool, alpha_QUADS, dbrown, dbrown, dbrown, dbrown, 0), //bottom
        0
    );

    alpha_Skin* stone = alpha_createSkin(pool,
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // top
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // front
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // left
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // back
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // right
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // bottom
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // misc
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // misc
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // misc
        alpha_createFace(pool, alpha_QUADS, lgray, gray, lgray, gray, 0), // misc
        0
    );

    // draw everthing in a face:
    // top to bottom
    // counter-clockwise ( facing the face )
    // front to back

    // with that priority;

    //        v4___________ v3
    //        |\ FRONT   |\   TOP
    //        | \v1______|_\  v2
    // LEFT   |__|_______|  |
    //        \v7|     v8\  | RIGHT
    //         \ | BOTTOM \ |
    //          \|_________\| v5
    //          v6  BACK

    //the relative directions are pretty messy

    // right now our cubes are centered on their position
    // later we may offset them so a cubes vertices are always an int;
    // of course that means for each rotation we will have to translate by .5
    // rotate, then translate back

    // cube faces;
    float* v = alpha_BuildCubeStructure(pool);
    alpha_Face* Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    alpha_Face* Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    alpha_Face* Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    alpha_Face* Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    alpha_Face* Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    alpha_Face* Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    // turn the faces into shapes

    // top to bottom
    // counter-clockwise
    // front to back
    alpha_Shape* CUBE = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );

    alpha_BlockTypes_Create(BlockTypes, "stone", "cube", stone, CUBE);
    alpha_BlockTypes_Create(BlockTypes,"dirt", "cube", dirt, CUBE);
    alpha_BlockTypes_Create(BlockTypes,"grass", "cube", grass, CUBE);

    // a slope lowers vertices 1 and 2 to 6 and 5;
    float* slopeStructure = alpha_BuildCubeStructure(pool);
    v = slopeStructure;
    for(int i = 0; i <= 1; ++i) {
        alpha_Vector_AddEach(&v[3 * i], 0, -1, 0);
    }

    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS,     &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS,     &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS,     &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*1], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS,     &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SLOPE = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slope", stone, SLOPE);

    // there are 4 simple sloped corners for a fullsized cube;
    // split the top face into two triangles
    // with the triangle split top vs slant
    // ( better names to come in time)
    // a beveled corner  (1 top, 3 bottom -- actually 2 )
    // an inverted beveled corner ( 3 top, 1 bottom )

    // with the top split along the path downwards
    // a pyramid corner (1 top, 3 bottom)
    // an inverted pyramid corner ( 3 top, 1 bottom )

    // the beveled corner slope
    // lower 1, 2, and 3 to the bottom;
    float* bcslopeStructure = alpha_BuildCubeStructure(pool);
    v = bcslopeStructure;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -1, 0);
    }

    // now top, right
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3], &v[0], &v[2], 0);
    Front  = alpha_createFace(pool, alpha_QUADS,     &v[3], &v[2], &v[7], &v[6], 0);
    Left   = alpha_createFace(pool, alpha_TRIANGLES, &v[3], &v[6], &v[5], 0);
    Bottom = alpha_createFace(pool, alpha_TRIANGLES, &v[6], &v[7], &v[5], 0);

    alpha_Shape* CORNER_SLOPE = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "corner_slope", stone, CORNER_SLOPE);

    float* ibcslopeStructure = alpha_BuildCubeStructure(pool);
    v = ibcslopeStructure;
    // 3 top, 1 bottom;
    alpha_Vector_AddEach(&v[3*1], 0, -1, 0);

    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[2], &v[3], &v[0], 0);
    alpha_Face* Slope  = alpha_createFace(pool, alpha_TRIANGLES, &v[2], &v[0], &v[1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS,     &v[3], &v[2], &v[7], &v[6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS,     &v[0], &v[3], &v[6], &v[5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[0], &v[5], &v[4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[2], &v[4], &v[7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS,     &v[6], &v[7], &v[4], &v[5], 0);

    alpha_Shape* INVERTED_CORNER_SLOPE = alpha_createShape(pool,
        Top,
        Slope,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "inverted_corner_slope", stone, INVERTED_CORNER_SLOPE);

    // pyramid corner ( 1 top, 3 bottom )
    float* pcorner = alpha_BuildCubeStructure(pool);
    v = pcorner;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -1, 0);
    }

    // now top, right
    alpha_Face* TopLeft  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    alpha_Face* TopRight = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front    = alpha_createFace(pool, alpha_QUADS,     &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left     = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*6], &v[3*5], 0);
    Bottom   = alpha_createFace(pool, alpha_QUADS,     &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);
    alpha_Shape* PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "pyramid_corner", stone, PYRAMID_CORNER);

    // inverted pyramid corner ( 3 top, 1 bottom )
    float* ipcorner = alpha_BuildCubeStructure(pool);
    v = ipcorner;
    alpha_Vector_AddEach(&v[3*1], 0, -1, 0);

    // now top, right
    TopLeft    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    TopRight   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* INVERTED_PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "inverted_pyramid_corner", stone, INVERTED_PYRAMID_CORNER);

    v = alpha_BuildSlabStructure(pool);
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);
    alpha_Shape* SLAB = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom
    );

    alpha_BlockTypes_Load(BlockTypes, "stone", "slab", stone, SLAB);

    // a slope lowers vertices 1 and 2 to 6 and 5;
    slopeStructure = alpha_BuildCubeStructure(pool);
    v = slopeStructure;
    for(int i = 0; i <= 1; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*1], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SLAB_SLOPE = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slab_slope", stone, SLAB_SLOPE);


    bcslopeStructure = alpha_BuildCubeStructure(pool);
    v = bcslopeStructure;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // now top, right
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*2], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*6], &v[3*5], 0);
    Bottom = alpha_createFace(pool, alpha_TRIANGLES, &v[3*6], &v[3*7], &v[3*5], 0);

    alpha_Shape* SLAB_CORNER = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slab_corner", stone, SLAB_CORNER );

    ibcslopeStructure = alpha_BuildCubeStructure(pool);
    v = ibcslopeStructure;
    // 3 top, 1 bottom;
    alpha_Vector_AddEach(&v[3*1], 0, -0.5, 0);
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*0], 0);
    Slope  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SLAB_INVERTED_CORNER = alpha_createShape(pool,
        Top,
        Slope,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slab_inverted_corner", stone, SLAB_INVERTED_CORNER);

    // pyramid corner ( 1 top, 3 bottom )
    pcorner = alpha_BuildCubeStructure(pool);
    v = pcorner;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // now top, right
    TopLeft    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    TopRight   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*6], &v[3*5], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);
    alpha_Shape* SLAB_PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slab_pyramid_corner", stone, SLAB_PYRAMID_CORNER );

    // inverted pyramid corner ( 3 top, 1 bottom )
    ipcorner = alpha_BuildSlabStructure(pool);
    v = ipcorner;
    alpha_Vector_AddEach(&v[3*2], 0, -0.5, 0);
    // now top, right
    TopLeft    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    TopRight   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);


    alpha_Shape* SLAB_INVERTED_PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "slab_inverted_pyramid_corner", stone, SLAB_INVERTED_PYRAMID_CORNER );




    // a slope lowers vertices 1 and 2 to 6 and 5;
    v = alpha_BuildCubeStructure(pool);
    for(int i = 0; i <= 1; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SHALLOW_SLOPE = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "shallow_slope", stone, SHALLOW_SLOPE);

    // there are 4 simple sloped corners for a fullsized cube;
    // split the top face into two triangles
    // with the triangle split top vs slant
    // ( better names to come in time)
    // a beveled corner  (1 top, 3 bottom -- actually 2 )
    // an inverted beveled corner ( 3 top, 1 bottom )

    // with the top split along the path downwards
    // a pyramid corner (1 top, 3 bottom)
    // an inverted pyramid corner ( 3 top, 1 bottom )

    // the beveled corner slope
    // lower 1, 2, and 3 to the bottom;
    bcslopeStructure = alpha_BuildCubeStructure(pool);
    v = bcslopeStructure;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // now top, right
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*0], 0);
    Slope  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*2], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SHALLOW_CORNER = alpha_createShape(pool,
        Top,
        Slope,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "shallow_corner", stone, SHALLOW_CORNER );

    v = alpha_BuildCubeStructure(pool);
    // 3 top, 1 bottom;
    alpha_Vector_AddEach(&v[3*2], 0, -0.5, 0);
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*0], 0);
    Slope  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* SHALLOW_INVERTED_CORNER = alpha_createShape(pool,
        Top,
        Slope,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "shallow_inverted_corner", stone, SHALLOW_INVERTED_CORNER);

    // pyramid corner ( 1 top, 3 bottom )
    pcorner = alpha_BuildCubeStructure(pool);
    v = pcorner;
    for(int i = 0; i <= 2; ++i) {
        alpha_Vector_AddEach(&v[3*i], 0, -0.5, 0);
    }
    // now top, right
    TopLeft    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    TopRight   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);
    alpha_Shape* SHALLOW_PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "shallow_pyramid_corner", stone, SHALLOW_PYRAMID_CORNER );

    // inverted pyramid corner ( 3 top, 1 bottom )
    ipcorner = alpha_BuildCubeStructure(pool);
    v = ipcorner;
    alpha_Vector_AddEach(&v[3*1], 0, -0.5, 0);
    // now top, right
    TopLeft    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*3], &v[3*0], &v[3*1], 0);
    TopRight   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);


    alpha_Shape* SHALLOW_INVERTED_PYRAMID_CORNER = alpha_createShape(pool,
        TopLeft,
        TopRight,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "shallow_inverted_pyramid_corner", stone, SHALLOW_INVERTED_PYRAMID_CORNER );


    // an angled slab is a half slab cut in a right triangle
    v = alpha_BuildSlabStructure(pool);
    alpha_Vector_AddEach(&v[3*1], 0, 0, -1);
    alpha_Vector_AddEach(&v[3*4], 0, 0, -1);
    Top    = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*3], &v[3*0], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Bottom = alpha_createFace(pool, alpha_TRIANGLES, &v[3*6], &v[3*7], &v[3*5], 0);
    alpha_Shape* ANGLED_SLAB = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Bottom,
        0
    );

    alpha_BlockTypes_Load(BlockTypes, "stone", "angled_slab", stone, ANGLED_SLAB);

    // half-slab
    v = alpha_BuildSlabStructure(pool);
    alpha_Vector_AddEach(&v[0], 0, 0, -0.5);
    alpha_Vector_AddEach(&v[3*1], 0, 0, -0.5);
    alpha_Vector_AddEach(&v[3*4], 0, 0, -0.5);
    alpha_Vector_AddEach(&v[3*5], 0, 0, -0.5);

    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);
    alpha_Shape* HALF_SLAB = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );

    alpha_BlockTypes_Load(BlockTypes, "stone", "half_slab", stone, HALF_SLAB);


    // stairs
    float stairStructure[] = {
        -0.5 , 0.5, 0, // 0 -- top
        0.5 , 0.5, 0, // 1 -- top
        0.5 , 0.5, -0.5, // 2 -- top
        -0.5 , 0.5, -0.5, // 3 -- top
        0.5 , -0.5, 0.5, // 4 -- bottom
        -0.5 , -0.5, 0.5, // 5 -- bottom
        -0.5 , -0.5, -0.5, // 6 -- bottom
        0.5 , -0.5, -0.5, // 7 -- bottom
        -0.5 , 0, 0, // 8 -- mid
        0.5 , 0, 0, // 9 -- mid
        -0.5 , 0, 0.5, // 10 -- mid
        0.5 , 0, 0.5 // 11 -- mid
    };
    v = stairStructure;
    alpha_Face* Flight1Top = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    alpha_Face* Flight1Front = alpha_createFace(pool, alpha_QUADS, &v[3*1], &v[3*0], &v[3*8], &v[3*9], 0);
    alpha_Face* Flight2Top = alpha_createFace(pool, alpha_QUADS, &v[3*9], &v[3*8], &v[3*10], &v[3*11], 0);
    alpha_Face* Flight2Front = alpha_createFace(pool, alpha_QUADS, &v[3*11], &v[3*10], &v[3*5], &v[3*4], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    alpha_Face* LeftTop   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*8], 0);
    alpha_Face* LeftBot   = alpha_createFace(pool, alpha_QUADS, &v[3*8], &v[3*6], &v[3*5], &v[3*10], 0);

    alpha_Face* RightTop  = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*1], &v[3*9], &v[3*7], 0);
    alpha_Face* RightBot  = alpha_createFace(pool, alpha_QUADS, &v[3*9], &v[3*11], &v[3*4], &v[3*7], 0);

    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* STAIRS = alpha_createShape(pool,
        Flight1Top,
        Flight1Front,
        Flight2Top,
        Flight2Front,
        Front,
        LeftTop,
        LeftBot,
        RightTop,
        RightBot,
        Bottom,
        0
    );

    alpha_BlockTypes_Load(BlockTypes, "stone", "stairs", stone, STAIRS);


    // medium corner; lowers 1 and 3 to mid range
    // and 2 to bottom
    v = alpha_BuildCubeStructure(pool);
    alpha_Vector_AddEach(&v[0], 0, -0.5, 0);
    alpha_Vector_AddEach(&v[3*2], 0, -0.5, 0);
    alpha_Vector_AddEach(&v[1*2], 0, -1, 0);
    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* MED_CORNER = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "med_corner", stone, MED_CORNER);

    // medium corner; lowers 1 to midrange
    // and 2 to bottom
    v = alpha_BuildCubeStructure(pool);
    alpha_Vector_AddEach(&v[0], 0, -0.5, 0);
    alpha_Vector_AddEach(&v[3], 0, -1, 0);
    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* MED_CORNER2 = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "med_corner2", stone, MED_CORNER2);


    // medium corner; lowers 1 and 3 to mid range
    // and 2 to bottom
    v = alpha_BuildCubeStructure(pool);
    alpha_Vector_AddEach(&v[3*2], 0, -0.5, 0);
    alpha_Vector_AddEach(&v[3*1], 0, -1, 0);
    // this causes left and right to become triangles
    Top    = alpha_createFace(pool, alpha_QUADS, &v[3*2], &v[3*3], &v[3*0], &v[3*1], 0);
    Front  = alpha_createFace(pool, alpha_QUADS, &v[3*3], &v[3*2], &v[3*7], &v[3*6], 0);
    Left   = alpha_createFace(pool, alpha_QUADS, &v[3*0], &v[3*3], &v[3*6], &v[3*5], 0);
    Back   = alpha_createFace(pool, alpha_TRIANGLES, &v[3*0], &v[3*5], &v[3*4], 0);
    Right  = alpha_createFace(pool, alpha_TRIANGLES, &v[3*2], &v[3*4], &v[3*7], 0);
    Bottom = alpha_createFace(pool, alpha_QUADS, &v[3*6], &v[3*7], &v[3*4], &v[3*5], 0);

    alpha_Shape* MED_CORNER3 = alpha_createShape(pool,
        Top,
        Front,
        Left,
        Back,
        Right,
        Bottom,
        0
    );
    alpha_BlockTypes_Load(BlockTypes, "stone", "med_corner2", stone, MED_CORNER3);
}
