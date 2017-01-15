function showIPAddresses(graph)
{
    var COUNT = 2;
    COUNT = Math.max(2, COUNT);
    var MAX_DEPTH = 9;

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    function showLevel(depth, index) {
        if(depth === undefined) {
            depth = 0;
        }
        if(index === undefined) {
            index = 0;
        }
        var calc = Math.pow(COUNT, depth - 1) + index;
        if(depth === MAX_DEPTH) {
            // Just spawn a block.
            caret.spawnMove('d', 'block');
            //caret.label("Index=" + index + ", depth=" + depth + ", calc=" + calc);
            caret.label(index);

            // Indicate that we are a leaf.
            return false;
        }

        for(var i = 0; i < COUNT; ++i) {
            if(i === 0) {
                caret.spawnMove('d', 'bud', parsegraph_ALIGN_CENTER);
                caret.pull('d');
                caret.push();
            }
            else {
                caret.spawnMove('f', 'bud');
            }
            if(showLevel(depth + 1, i)) {
                caret.replace('u', 'block');
                //caret.label('u', "Index=" + index + ", i=" + i + ", depth=" + depth + ", calc=" + calc);
                caret.label(index);
            }
            caret.shrink();
            caret.move('u');
        }
        caret.pop();

        // Indicate that we are not a leaf.
        return true;
    };
    showLevel();

    return caret;
}
