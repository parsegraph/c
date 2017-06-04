#ifndef alpha_Cluster_INCLUDED
#define alpha_Cluster_INCLUDED

#include <apr_pools.h>

struct alpha_GLWidget;
struct alpha_Cluster {
    apr_pool_t* pool;
    struct alpha_GLWidget* widget;

    void* facePainter;
};
typedef struct alpha_Cluster alpha_Cluster;

alpha_Cluster* alpha_Cluster_new(alpha_GLWidget* widget);
void alpha_Cluster_destroy(alpha_Cluster*);
void alpha_Cluster_CalculateVertices(alpha_Cluster* cluster);
void alpha_Cluster_ClearBlocks(alpha_Cluster* cluster);
void alpha_Cluster_Draw(alpha_Cluster* cluster, float* viewMatrix);
void alpha_Cluster_RemoveBlock(alpha_Cluster* cluster, alpha_Block* block);
void alpha_Cluster_CreateBlock(alpha_Cluster* cluster, alpha_BlockType* type, float* pos, int orientation);
void alpha_Cluster_AddBlock(alpha_Cluster* cluster, alpha_Block* block);
int alpha_Cluster_HasBlock(alpha_Cluster* cluster, alpha_Block* block);

#endif // alpha_Cluster_INCLUDED
