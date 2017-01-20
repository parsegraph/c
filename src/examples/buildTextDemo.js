function buildTextDemo(graph, COUNT, text)
{
    if(COUNT === undefined) {
        COUNT = 10;
    }
    if(text === undefined) {
        text = "";
    }

    var caret = new parsegraph_Caret(graph, parsegraph_BUD);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.node().setLabel("Rainback");

    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD, parsegraph_ALIGN_CENTER);
    caret.move(parsegraph_DOWNWARD);
    caret.shrink();
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.pull(parsegraph_DOWNWARD);

    var i = 0;
    var addBlock = function() {
        if(i % 2 === 0) {
            caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
        }
        else {
            caret.spawnMove(parsegraph_DOWNWARD, parsegraph_SLOT);
        }
        caret.node().setLabel(text + " " + i);
        caret.move(parsegraph_UPWARD);

        caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);

        graph.scheduleRepaint();
        ++i
    };

    for(var j = 0; j < COUNT; ++j) {
        addBlock();
    }

    var scheduleAddBlock = function() {
        addBlock();
        window.setTimeout(scheduleAddBlock, 1000);
    };
    //scheduleAddBlock();

    return caret;
};
