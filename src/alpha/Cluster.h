#ifndef alpha_Cluster_INCLUDED
#define alpha_Cluster_INCLUDED

#include <apr_pools.h>

struct alpha_GLWidget;
typedef struct alpha_GLWidget alpha_GLWidget;
struct alpha_Block;
typedef struct alpha_Block alpha_Block;
struct alpha_BlockType;
typedef struct alpha_BlockType alpha_BlockType;

struct alpha_BlockRec {
alpha_Block* block;
struct alpha_BlockRec* next;
};
struct alpha_Cluster {
    apr_pool_t* pool;
    struct alpha_GLWidget* widget;
    struct alpha_BlockRec* blocks;
    struct alpha_BlockRec* lastBlock;
    void* facePainter;
};
typedef struct alpha_Cluster alpha_Cluster;

alpha_Cluster* alpha_Cluster_new(apr_pool_t* pool, alpha_GLWidget* widget);
void alpha_Cluster_destroy(alpha_Cluster*);
int alpha_Cluster_CalculateVertices(alpha_Cluster* cluster, alpha_BlockTypes* bt);
void alpha_Cluster_ClearBlocks(alpha_Cluster* cluster);
void alpha_Cluster_Draw(alpha_Cluster* cluster, float* viewMatrix);
void alpha_Cluster_RemoveBlock(alpha_Cluster* cluster, alpha_Block* block);
void alpha_Cluster_CreateBlock(alpha_Cluster* cluster, alpha_BlockType* type, float* pos, int orientation);
void alpha_Cluster_AddBlock(alpha_Cluster* cluster, alpha_Block* block);
int alpha_Cluster_HasBlock(alpha_Cluster* cluster, alpha_Block* block);

#endif // alpha_Cluster_INCLUDED
