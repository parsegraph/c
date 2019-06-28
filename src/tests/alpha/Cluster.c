#include "../unity.h"
#include "../testpool.h"
#include <alpha/Cluster.h>

void test_alpha_Cluster_new()
{
    alpha_Cluster* cluster = alpha_Cluster_new(pool);
    // test version 1.0
    var widget = alpha_GLWidget_new();
    var cubeman = widget.BlockTypes.Get("blank", "cubeman");

    var testCluster = alpha_Cluster_new(pool, widget);
    testCluster.AddBlock(cubeman, 0,5,0,1);
    testCluster.CalculateVertices();
    alpha_Cluster_destroy(cluster);
}

void test_alpha_Cluster()
{
    RUN_TEST(test_alpha_Cluster_new);
}
