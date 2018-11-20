#ifndef parsegraph_buildPrimesDemo_INCLUDED
#define parsegraph_buildPrimesDemo_INCLUDED

#include "graph/Node.h"

struct parsegraph_Caret;
typedef struct parsegraph_Caret parsegraph_Caret;
struct parsegraph_Graph;
typedef struct parsegraph_Graph parsegraph_Graph;

struct parsegraph_PrimesWidget {
apr_pool_t* pool;
void* knownPrimes;
int position;
parsegraph_Caret* caret;
parsegraph_Graph* graph;
};
typedef struct parsegraph_PrimesWidget parsegraph_PrimesWidget;

parsegraph_PrimesWidget* parsegraph_PrimesWidget_new(parsegraph_Graph* graph);
void parsegraph_PrimesWidget_step(parsegraph_PrimesWidget* widget, int steps);
parsegraph_Node* parsegraph_PrimesWidget_root(parsegraph_PrimesWidget* widget);

struct parsegraph_PrimesModulo {
int frequency;
int target;
};
typedef struct parsegraph_PrimesModulo parsegraph_PrimesModulo;

parsegraph_PrimesModulo* parsegraph_PrimesModulo_new(apr_pool_t* pool, int frequency);
int parsegraph_PrimesModulo_calculate(parsegraph_PrimesModulo* modulo, int number);
int parsegraph_PrimesModulo_value(parsegraph_PrimesModulo* modulo);

parsegraph_Node* buildPrimesDemo(parsegraph_Graph* graph, int COUNT);

#endif // parsegraph_buildPrimesDemo_INCLUDED
