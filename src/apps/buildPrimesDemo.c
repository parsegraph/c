#include "buildPrimesDemo.h"
#include "../graph/Graph.h"
#include "../graph/initialize.h"
#include "../graph/Caret.h"
#include <stdio.h>

parsegraph_PrimesWidget* parsegraph_PrimesWidget_new(parsegraph_Graph* graph)
{
    apr_pool_t* pool = graph->_surface->pool;
    parsegraph_PrimesWidget* widget = apr_palloc(pool, sizeof(*widget));
    widget->pool = pool;
    widget->graph = graph;
    widget->knownPrimes = parsegraph_ArrayList_new(pool);
    widget->position = 2;

    widget->caret = parsegraph_Caret_new(graph->_surface, parsegraph_Node_new(pool, parsegraph_BLOCK, 0, 0));
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_Graph_glyphAtlas(graph);
    parsegraph_Caret_setGlyphAtlas(widget->caret, glyphAtlas);
    parsegraph_Caret_label(widget->caret, "1", glyphAtlas, 0);
    return widget;
}

void parsegraph_PrimesWidget_destroy(parsegraph_PrimesWidget* widget)
{
    parsegraph_Caret_destroy(widget->caret);
    parsegraph_ArrayList_destroy(widget->knownPrimes);
}

void parsegraph_PrimesWidget_step(parsegraph_PrimesWidget* widget, int steps)
{
    //console.log("Stepping primes widget");
    // Check if any known prime is a multiple of the current position.
    char buf[80];
    for(int j = 0; j < steps; ++j) {
        parsegraph_Caret_spawnMove(widget->caret, "f", "b", 0);
        snprintf(buf, sizeof(buf), "%d", widget->position);
        parsegraph_Caret_label(widget->caret, buf, 0, 0);
        parsegraph_Caret_push(widget->caret);
        parsegraph_Caret_pull(widget->caret, "u");
        int isPrime = 1;
        for(int i = 0; i < parsegraph_ArrayList_length(widget->knownPrimes); ++i) {
            parsegraph_PrimesModulo* prime = parsegraph_ArrayList_at(widget->knownPrimes, i);
            int modulus = parsegraph_PrimesModulo_calculate(prime, widget->position);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                parsegraph_Caret_spawnMove(widget->caret, "u", "b", 0);
                snprintf(buf, sizeof(buf), "%d", prime->frequency);
                parsegraph_Caret_label(widget->caret, buf, 0, 0);
                isPrime = 0;
            }
            else {
                parsegraph_Caret_spawnMove(widget->caret, "u", "s", 0);
            }
            if(i % parsegraph_NATURAL_GROUP_SIZE == 0) {
                parsegraph_Caret_crease(widget->caret, 0);
            }
        }
        if(isPrime) {
            // The position is prime, so output it and add it to the list.
            parsegraph_Caret_spawnMove(widget->caret, "u", "b", 0);
            snprintf(buf, sizeof(buf), "%d", widget->position);
            parsegraph_Caret_label(widget->caret, buf, 0, 0);
            parsegraph_ArrayList_push(widget->knownPrimes,
                parsegraph_PrimesModulo_new(widget->pool, widget->position)
            );
        }
        parsegraph_Caret_pop(widget->caret);

        // Advance.
        ++(widget->position);
    }
};

parsegraph_Node* parsegraph_PrimesWidget_root(parsegraph_PrimesWidget* widget)
{
    return parsegraph_Caret_root(widget->caret);
};

parsegraph_PrimesModulo* parsegraph_PrimesModulo_new(apr_pool_t* pool, int frequency)
{
    parsegraph_PrimesModulo* modulo = apr_palloc(pool, sizeof(*modulo));
    modulo->frequency = frequency;
    modulo->target = 0;
    return modulo;
};

int parsegraph_PrimesModulo_calculate(parsegraph_PrimesModulo* modulo, int number)
{
    while(number > modulo->target) {
        modulo->target += modulo->frequency;
    }
    return modulo->target - number;
};

int parsegraph_PrimesModulo_value(parsegraph_PrimesModulo* modulo)
{
    return modulo->frequency;
};

parsegraph_Node* buildPrimesDemo(parsegraph_Graph* graph, int COUNT)
{
    parsegraph_PrimesWidget* widget = parsegraph_PrimesWidget_new(graph);
    return parsegraph_PrimesWidget_root(widget);
}
