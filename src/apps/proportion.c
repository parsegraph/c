#include <stdio.h>
#include "graph/log.h"
#include "graph/Window.h"
#include "unicode.h"
#include "die.h"
#include "graph/initialize.h"
#include "apps/showProportionTest.h"
#include "app.h"
#include "timing.h"

struct ProportionWidget {
apr_pool_t* pool;
} widget;

void parsegraph_init(parsegraph_Application* app, parsegraph_Node* root)
{
    apr_pool_create(&widget.pool, 0);
    parsegraph_Graph* graph = parsegraph_Application_graph(app);
    int COUNT = 1;
    parsegraph_Node* plot = showProportionTest(graph, COUNT);
    parsegraph_Node_connectNode(root, parsegraph_DOWNWARD, plot);
}

void parsegraph_stop(parsegraph_Application* app)
{
    apr_pool_destroy(widget.pool);
}

int main(int argc, const char * const *argv)
{
    parsegraph_stopLog();
    if(!parsegraph_connectLog("localhost", "28122")) {
        parsegraph_stopLog();
    }

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_die("Failed initializing APR. APR status of %d.\n", rv);
    }

    apr_pool_t* pool;
    if(APR_SUCCESS != apr_pool_create(&pool, 0)) {
        parsegraph_die("Failed to create initial pool.\n");
    }
    parsegraph_initialize(pool);

    parsegraph_Window* window = parsegraph_Window_new(pool);

    apr_pool_destroy(pool);
    apr_terminate();
    parsegraph_stopLog();
    return 0;
}
