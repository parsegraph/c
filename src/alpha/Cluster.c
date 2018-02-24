#include "Cluster.h"
#include "BlockStuff.h"
#include "FacePainter.h"
#include <stdio.h>
#include <stdarg.h>

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

    // Declare GL Painters; create them only when needed to delay GL context's creation.
    cluster->facePainter = 0;

    return cluster;
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
    if(!alpha_Cluster_HasBlock(cluster, block)) {
        if(!cluster->lastBlock) {
            cluster->blocks = apr_pcalloc(cluster->pool, sizeof(struct alpha_BlockRec));
            cluster->lastBlock = cluster->blocks;
        }
        else {
            cluster->lastBlock->next = apr_pcalloc(cluster->pool, sizeof(struct alpha_BlockRec));
            cluster->lastBlock = cluster->lastBlock->next;
        }
    }
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

    for(struct alpha_BlockRec* block = cluster->blocks; block != 0; block = block->next) {
        float* quat = alpha_Block_GetQuaternion(block->block, 1);
        if(!quat) {
            //console.log(block);
            //throw new Error("Block must not return a null quaternion");
        }

        // get the faces from the blocktype
        alpha_BlockType* bType = alpha_BlockTypes_GetByID(bt, block->id);
        if(!bType) {
            return -1;
        }
        alpha_Shape* shape = bType->shape;
        alpha_Skin* skin = bType->skin;

        alpha_Face_List* shapeItem = shape->facesHead;
        alpha_Face_List* skinItem = skin->facesHead;
        for(;;) {
            if(shapeItem != 0 || skinItem != 0) {
                break;
            }
            alpha_Face* face = faceItem->face;
            if(!face) {
                //throw new Error("Shape must not contain any null faces");
                return -1;
            }
            alpha_Face* colors = skinItem->face;
            if(!colors) {
                //throw new Error("Shape must not contain any null colors");
                return -1;
            }

            // every face has its own drawType;
            if(face.drawType == alpha_TRIANGLES) {
                // Process every vertex of the face.
                for(int j = 0; j < face.length; ++j) {
                    var vertex = face[j];
                    if(!vertex) {
                        throw new Error("Face must not contain any null vertices");
                    }
                    // get the color for this vertex;
                    var color = colors[j];
                    if(!color) {
                        throw new Error("Colors must not contain any null color values");
                    }

                    // rotate it; if it's not the default
                    if(block.orientation > 0) {
                        vertex = quat.RotatedVector(vertex);
                    }
                    // now translate it
                    vertex = vertex.Added(new alpha_Vector(block[0], block[1], block[2]));

                    // vector and cluster use the same indexes
                    this.facePainter.Triangle(
                        vertex[0],
                        vertex[1],
                        vertex[2],
                        color[0],
                        color[1],
                        color[2]
                    );
                }
            } else if(face.drawType == alpha_QUADS) {
                // Process every vertex of the face.
                for(int j = 0; j < face.length; j += 4) {
                    var v1 = face[j];
                    if(!v1) {
                        //throw new Error("Face must not contain any null vertices (v1)");
                        return -1;
                    }
                    var v2 = face[j + 1];
                    if(!v2) {
                        //throw new Error("Face must not contain any null vertices (v2)");
                        return -1;
                    }
                    var v3 = face[j + 2];
                    if(!v3) {
                        //throw new Error("Face must not contain any null vertices (v3)");
                        return -1;
                    }
                    var v4 = face[j + 3];
                    if(!v4) {
                        //throw new Error("Face must not contain any null vertices (v4)");
                        return -1;
                    }

                    // get the color for this vertex;
                    var c1 = colors[j];
                    if(!c1 ) {
                        //throw new Error("Colors must not contain any null color values (c1)");
                        return -1;
                    }
                    var c2 = colors[j + 1];
                    if(!c2 ) {
                        //throw new Error("Colors must not contain any null color values (c2)");
                        return -1;
                    }
                    var c3 = colors[j + 2];
                    if(!c3 ) {
                        //throw new Error("Colors must not contain any null color values (c3)");
                        return -1;
                    }
                    var c4 = colors[j + 3];
                    if(!c4 ) {
                        //throw new Error("Colors must not contain any null color values (c4)");
                        return -1;
                    }

                    // rotate it; if it's not the default
                    if(block.orientation > 0) {
                        v1 = quat.RotatedVector(v1);
                        v2 = quat.RotatedVector(v2);
                        v3 = quat.RotatedVector(v3);
                        v4 = quat.RotatedVector(v4);
                    }
                    // now translate it
                    if(typeof block[0] !== "number" || typeof block[1] !== "number" || typeof block[2] !== "number") {
                        //console.log(block);
                        //throw new Error("Block must contain numeric components.");
                        return -1;
                    }
                    //float* alpha_Vector_Added(apr_pool_t* pool, float* v, float* toAdd);
                    v1 = alpha_Vector_AddedEach(cluster->pool, v1, block[0], block[1], block[2]);
                    v2 = alpha_Vector_AddedEach(cluster->pool, v2, block[0], block[1], block[2]);
                    v3 = alpha_Vector_AddedEach(cluster->pool, v3, block[0], block[1], block[2]);
                    v4 = alpha_Vector_AddedEach(cluster->pool, v4, block[0], block[1], block[2]);

                    // Translate quads to triangles
                    alpha_FacePainter_Quad(cluster->facePainter, v1, v2, v3, v4, c1, c2, c3, c4);
                }
            } else {
                //throw new Error("Face must have a valid drawType property to read of either alpha_QUADS or alpha_TRIANGLES. (Given " + face.drawType + ")");
                return -1;
            }
        }
    }
}

void alpha_Cluster_Draw(alpha_Cluster* cluster, float* viewMatrix)
{
    if(!cluster->facePainter) {
        alpha_Cluster_CalculateVertices(cluster);
    }
    this.facePainter.Draw(viewMatrix);
}
