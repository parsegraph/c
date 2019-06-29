#include "../unity.h"
#include "../testpool.h"
#include <alpha/Cluster.h>
#include <alpha/GLWidget.h>
#include <graph/Surface.h>

void test_alpha_Cluster_new()
{
    parsegraph_Surface* surf = parsegraph_Surface_new(pool, 0);
    alpha_GLWidget* widget = alpha_GLWidget_new(surf);
    alpha_Cluster* cluster = alpha_Cluster_new(pool, widget);
    // test version 1.0
    alpha_BlockType* cubeman = alpha_BlockTypes_GetByName(widget->BlockTypes, "blank", "cubeman");

    alpha_Cluster* testCluster = alpha_Cluster_new(pool, widget);
    float pos[] = {0, 5, 0};
    alpha_Cluster_CreateBlock(testCluster, cubeman, pos, 1);
    alpha_Cluster_CalculateVertices(testCluster, widget->BlockTypes);
    alpha_Cluster_destroy(cluster);
}

void test_alpha_Cluster()
{
    RUN_TEST(test_alpha_Cluster_new);
}
