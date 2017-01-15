function showSpiral(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 25;
    }

    COUNT = Math.min(100, COUNT);

    // Enter
    var spawnDir = parsegraph_FORWARD;
    var spiralType = parsegraph_BUD;

    var caret = new parsegraph_Caret(graph, spiralType);
    caret.spawnMove(spawnDir, spiralType);

    caret.push();
    for(var i = COUNT; i >= 2; --i) {
        for(var j = 1; j < 2; ++j) {
            caret.spawnMove(spawnDir, spiralType);
        }
        spawnDir = parsegraph_turnLeft(spawnDir);
    }
    caret.pop();

    return caret;
}
