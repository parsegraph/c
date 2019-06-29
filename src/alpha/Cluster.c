#include "Cluster.h"
#include "BlockStuff.h"
#include "FacePainter.h"
#include "Maths.h"
#include <stdio.h>
#include <stdarg.h>
#include <stdlib.h>

//--------------------------------------------
//--------------------------------------------
//-------------- Cluster  --------------------
//--------------------------------------------
//--------------------------------------------

/**
 * Cluster is where the information from blocks, blocktype, color and face
 * actually gets put to use it figures out how to draw the blocks that have
 * been added to it so that they can be drawn inside of 1 Matrix Push/Pop it
 * would probably not be efficient to put a lot of moving objects inside of a
 * single cluster as the cluster would have to be continuously updating
 * everytime a block was edited
 */
alpha_Cluster* alpha_Cluster_new(apr_pool_t* pool, alpha_GLWidget* widget)
{
    if(!widget) {
        fprintf(stderr, "Cluster must be given a non-null alpha_GLWidget.\n");
        return 0;
    }
    alpha_Cluster* cluster;
    if(pool) {
        cluster = apr_pcalloc(pool, sizeof(*cluster));
    }
    else {
        cluster = malloc(sizeof(*cluster));
    }
    cluster->pool = pool;
    cluster->widget = widget;

    cluster->blocks = 0;
    cluster->lastBlock = 0;

    // Declare GL Painters; create them only when needed to delay GL context's creation.
    cluster->facePainter = 0;

    return cluster;
}

void alpha_Cluster_destroy(alpha_Cluster* cluster)
{
    if(!cluster->pool) {
        free(cluster);
    }
}

/**
 * is this particular block in this cluster
 */
int alpha_Cluster_HasBlock(alpha_Cluster* cluster, alpha_Block* block)
{
    if(!cluster->blocks) {
        return -1;
    }
    struct alpha_BlockRec* br = cluster->blocks;
    int i = 0;
    while(br) {
        alpha_Block* b = br->block;
        if(alpha_Block_Equals(b, block)) {
            return i;
        }

        // Not found.
        ++i;
        br = br->next;
    }
    return -1;
};

void alpha_Cluster_AddBlock(alpha_Cluster* cluster, alpha_Block* block)
{
    if(alpha_Cluster_HasBlock(cluster, block) >= 0) {
        return;
    }
    if(!cluster->lastBlock) {
        cluster->blocks = apr_pcalloc(cluster->pool, sizeof(struct alpha_BlockRec));
        cluster->lastBlock = cluster->blocks;
    }
    else {
        cluster->lastBlock->next = apr_pcalloc(cluster->pool, sizeof(struct alpha_BlockRec));
        cluster->lastBlock = cluster->lastBlock->next;
    }
    cluster->lastBlock->block = block;
    cluster->lastBlock->next = 0;
};

void alpha_Cluster_CreateBlock(alpha_Cluster* cluster, alpha_BlockType* type, float* pos, int orientation)
{
    // Create a new block.
    alpha_Cluster_AddBlock(cluster, alpha_createBlock(cluster->pool, type, pos, orientation));
}

void alpha_Cluster_RemoveBlock(alpha_Cluster* cluster, alpha_Block* block)
{
    if(!cluster->blocks) {
        return;
    }
    struct alpha_BlockRec* prev = 0;
    struct alpha_BlockRec* br = cluster->blocks;
    while(br) {
        alpha_Block* b = br->block;
        if(alpha_Block_Equals(b, block)) {
            if(br->next) {
                if(prev) {
                    prev->next = br->next;
                }
                else {
                    cluster->blocks = br->next;
                }
            }
            else if(prev) {
                prev->next = 0;
                cluster->lastBlock = prev;
            }
            else {
                cluster->blocks = 0;
                cluster->lastBlock = 0;
            }
        }

        // Not found so far.
        prev = br;
        br = br->next;
    }
}

void alpha_Cluster_AddBlocks(alpha_Cluster* cluster, alpha_Block** block, int nblocks)
{
    for(int i = 0; i < nblocks; ++i) {
        alpha_Cluster_AddBlock(cluster, block[i]);
    }
}

/**
 * pass a table of blocks and it will add the ones that are new
 */
void alpha_Cluster_AddBlockValues(alpha_Cluster* cluster, ...)
{
    va_list ap;
    va_start(ap, cluster);
    alpha_Block* block;
    while((block = va_arg(ap, alpha_Block*)) != NULL) {
        alpha_Cluster_AddBlock(cluster, block);
    }
    va_end(ap);
};

void alpha_Cluster_ClearBlocks(alpha_Cluster* cluster)
{
    cluster->blocks = 0;
    cluster->lastBlock = 0;
};

static void drawTriangles(alpha_FacePainter* facePainter, alpha_Block* block, alpha_Face* face, alpha_Face* colors, float* quat)
{
    // Process every vertex of the face.
    alpha_Vector_List* vertex = face->vectorsHead;
    alpha_Vector_List* color = colors->vectorsHead;
    float translatedVecs[3*4];
    for(int j = 0; vertex && color; ++j) {
        memcpy(translatedVecs + (j%3)*sizeof(float)*4, &vertex->value, sizeof(float)*4);
        // rotate it; if it's not the default
        if(block->orientation > 0) {
            memcpy(translatedVecs + (j%3)*sizeof(float)*4, alpha_Quaternion_RotatedVector(quat, block->pool, translatedVecs + (j%3)*sizeof(float)*4), sizeof(float)*4);
        }
        // now translate it
        memcpy(translatedVecs + (j%3)*sizeof(float)*4, alpha_Vector_Added(block->pool, translatedVecs + (j%3)*sizeof(float)*4, block->pos), sizeof(float)*4);

        if((j+1) % 3 != 0 || j == 0) {
            goto next_vertex_tri;
        }
        float* v1 = translatedVecs;
        float* v2 = translatedVecs + 4;
        float* v3 = translatedVecs + 8;

        float* c1 = color->prev->prev->value;
        float* c2 = color->prev->value;
        float* c3 = color->value;

        // vector and cluster use the same indexes
        alpha_FacePainter_TriangleValues(
            facePainter,
            v1, v2, v3,
            c1, c2, c3
        );
next_vertex_tri:
        vertex = vertex->next;
        color = color->next;
    }
}

static void drawQuads(alpha_FacePainter* facePainter, alpha_Block* block, alpha_Face* face, alpha_Face* colors, float* quat)
{
    // Process every vertex of the face.
    alpha_Vector_List* vertex = face->vectorsHead;
    alpha_Vector_List* color = colors->vectorsHead;
    float translatedVecs[4*4];
    for(int j = 0; vertex && color; ++j) {
        memcpy(translatedVecs + (j%4)*4, vertex->value, sizeof(float)*4);
        // rotate it; if it's not the default
        if(block->orientation > 0) {
            memcpy(translatedVecs + (j%4)*4, alpha_Quaternion_RotatedVector(quat, block->pool, translatedVecs + (j%4)*4), sizeof(float)*4);
        }
        // now translate it
        memcpy(translatedVecs + (j%4)*4, alpha_Vector_Added(block->pool, translatedVecs + (j%4)*4, block->pos), sizeof(float)*4);

        if((j+1) % 4 != 0 || j == 0) {
            goto next_vertex_quad;
        }
        float* v1 = translatedVecs;
        float* v2 = translatedVecs + 4;
        float* v3 = translatedVecs + 8;
        float* v4 = translatedVecs + 12;

        float* c4 = color->value;
        float* c3 = color->prev->value;
        float* c2 = color->prev->prev->value;
        float* c1 = color->prev->prev->prev->value;

        // vector and cluster use the same indexes
        //fprintf(stderr, "Drawing quad for index: %d (%f, %f, %f, %f) {%f, %f, %f, %f}\n", j, v1[0], v1[1], v1[2], v2[0], c1, c2, c3, c4);
        alpha_FacePainter_Quad(facePainter, v1, v2, v3, v4, c1, c2, c3, c4);
next_vertex_quad:
        vertex = vertex->next;
        color = color->next;
    }
}

/**
 * construct all of the vertices from the blocks and store them
 */
int alpha_Cluster_CalculateVertices(alpha_Cluster* cluster, alpha_BlockTypes* bt)
{
    if(!cluster->facePainter) {
        cluster->facePainter = alpha_FacePainter_new(cluster->pool);
    }
    else {
        // delete what we had;
        alpha_FacePainter_Clear(cluster->facePainter);
    }

    for(struct alpha_BlockRec* blockRec = cluster->blocks; blockRec != 0; blockRec = blockRec->next) {
        float* quat = alpha_Block_GetQuaternion(blockRec->block, 1);
        if(!quat) {
            fprintf(stderr, "Block must not return a null quaternion\n");
        }

        // get the faces from the blocktype
        alpha_BlockType* bType = alpha_BlockTypes_GetByID(bt, blockRec->block->type->id);
        if(!bType) {
            fprintf(stderr, "Block type is not found\n");
            return -1;
        }
        alpha_Shape* shape = bType->shape;
        alpha_Skin* skin = bType->skin;

        alpha_Face_List* shapeItem = shape->facesHead;
        alpha_Face_List* skinItem = skin->facesHead;
        for(; shapeItem && skinItem;) {
            alpha_Face* face = shapeItem->face;
            if(!face) {
                fprintf(stderr, "Shape must not contain any null faces\n");
                return -1;
            }
            alpha_Face* colors = skinItem->face;
            if(!colors) {
                fprintf(stderr, "Shape must not contain any null colors\n");
                return -1;
            }

            // every face has its own drawType;
            if(face->drawType == alpha_TRIANGLES) {
                drawTriangles(cluster->facePainter, blockRec->block, face, colors, quat);
            }
            else if(face->drawType == alpha_QUADS) {
                drawQuads(cluster->facePainter, blockRec->block, face, colors, quat);
            }
            else {
                //throw new Error("Face must have a valid drawType property to read of either alpha_QUADS or alpha_TRIANGLES. (Given " + face.drawType + ")");
                return -1;
            }

            shapeItem = shapeItem->next;
            skinItem = skinItem->next;
        }
    }

    return 0;
}

void alpha_Cluster_Draw(alpha_Cluster* cluster, alpha_BlockTypes* bt, float* viewMatrix)
{
    if(!cluster->facePainter) {
        alpha_Cluster_CalculateVertices(cluster, bt);
    }
    alpha_FacePainter_Draw(cluster->facePainter, viewMatrix);
}
