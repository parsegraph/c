#include <stdio.h>
#include "graph/log.h"
#include "graph/Surface.h"
#include "unicode.h"
#include "die.h"
#include "graph/Input.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include "apps/showProportionTest.h"
#include "app.h"
#include "timing.h"

struct ProportionWidget {
apr_pool_t* pool;
} widget;

void parsegraph_init(void* data, parsegraph_Application* app, parsegraph_Node* root)
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
