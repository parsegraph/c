#include "graph/Node.h"
#include "graph/Graph.h"
#include <string.h>
#include <stdio.h>
#include "graph/Caret.h"
#include "parsegraph_math.h"

parsegraph_Node* showProportionTest(parsegraph_Graph* graph, int COUNT)
{
    if(COUNT <= 0) {
        COUNT = 30;
    }
    COUNT = parsegraph_min(COUNT, 100);
    COUNT = 200;

    apr_pool_t* pool = graph->_surface->pool;

    //const char* commands[] = {"0 Copy", "1 Cut", "2 Paste", "3 Delete", "Open", "New"};

    parsegraph_Caret* caret = parsegraph_Caret_new(graph->_surface, parsegraph_Node_new(pool, parsegraph_BLOCK, 0, 0));
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_Graph_glyphAtlas(graph);
    parsegraph_Caret_setGlyphAtlas(caret, glyphAtlas);
    //parsegraph_Node* selectedNode;

    /*
    var commandStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    commandStyle.backgroundColor = new parsegraph_Color(.4, 1, .4, 1);
    commandStyle.borderColor = new parsegraph_Color(0, .5, 0, 1);

    var commandItemStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    commandItemStyle.backgroundColor = new parsegraph_Color(1, 0, 0, 1);
    commandItemStyle.borderColor = new parsegraph_Color(0, .5, 0, 1);

    // Attaches commands at the current position.
    var attachCommands = function() {
        caret.onClick(function() {
            var carousel = graph.carousel();
            //console.log("OnClick!");
            if(carousel().isCarouselShown() && selectedNode == this) {
                carousel.clearCarousel();
                carousel.hideCarousel();
                carousel.scheduleCarouselRepaint();
                selectedNode = null;
                return;
            }
            selectedNode = this;
            carousel.clearCarousel();

            var i = 0;
            commands.forEach(function(command) {
                var commandCaret = new parsegraph_Caret(parsegraph_BLOCK);

                commandCaret.node().setBlockStyle(commandStyle);
                commandCaret.label(command);
                if(++i == 3) {
                    commandCaret.spawnMove('d', 's');
                    commandCaret.node().setBlockStyle(commandItemStyle);
                    commandCaret.label(command);
                    commandCaret.move('u');
                }
                carousel.addToCarousel(commandCaret.root(), function() {
                    //console.log("Clicked " + command + commandCaret.root().isSelected());
                    carousel.clearCarousel();
                    carousel.hideCarousel();
                    carousel.scheduleCarouselRepaint();
                    selectedNode = null;
                }, this);
            }, this);

            carousel.showCarousel();
            carousel.setCarouselSize(Math.max(
                selectedNode.size().width(),
                selectedNode.size().height()
            ));
            carousel.moveCarousel(selectedNode.absoluteX(), selectedNode.absoluteY());
            carousel.scheduleCarouselRepaint();
        });
    };

    // Attach the commands to the root.
    attachCommands();
    */

    for(int i = 0; i < COUNT; ++i) {
        const char* dir = "b";
        parsegraph_Caret_push(caret);
        parsegraph_Caret_spawnMove(caret, dir, "bud", 0);
        for(int j = 0; j < COUNT - i - 1; ++j) {
            parsegraph_Caret_spawnMove(caret, "d", "bud", 0);
            if(j == 0) {
                parsegraph_Caret_crease(caret, 0);
            }
        }
        parsegraph_Caret_spawnMove(caret, "d", "slot", 0);
        char buf[255];
        snprintf(buf, sizeof(buf), "%d", COUNT - i);
        parsegraph_Caret_label(caret, buf, 0, 0);
        parsegraph_Caret_pop(caret);

        dir = "f";
        parsegraph_Caret_push(caret);
        parsegraph_Caret_spawnMove(caret, dir, "bud", 0);
        for(int j = 0; j < COUNT - i - 1; ++j) {
            parsegraph_Caret_spawnMove(caret, "d", "bud", 0);
            if(j == 0) {
                parsegraph_Caret_crease(caret, 0);
            }
        }
        parsegraph_Caret_spawnMove(caret, "d", "slot", 0);
        snprintf(buf, sizeof(buf), "%d", COUNT - i);
        parsegraph_Caret_label(caret, buf, 0, 0);
        parsegraph_Caret_pop(caret);

        parsegraph_Caret_pull(caret, "d");
        parsegraph_Caret_spawnMove(caret, "d", "block", 0);

        // Attach commands for this block.
        //attachCommands();
    }

    parsegraph_Caret_moveToRoot(caret);
    parsegraph_Caret_spawnMove(caret, "u", "bud", 0);
    parsegraph_Caret_spawn(caret, "b", "bud", 0);
    parsegraph_Caret_spawn(caret, "f", "bud", 0);

    return parsegraph_Caret_root(caret);
}
