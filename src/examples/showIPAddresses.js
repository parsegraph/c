function showIPAddresses(graph)
{
    var COUNT = 2;
    COUNT = Math.max(2, COUNT);
    var MAX_DEPTH = 10;

    var caret = new parsegraph_Caret(parsegraph_BLOCK);
    caret.setGlyphAtlas(graph.glyphAtlas());

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
                caret.crease();
                caret.pull('d');
                caret.push();
                caret.label(" ");
            }
            else {
                caret.spawnMove('f', 'bud');
                caret.label(" ");
            }
            if(showLevel(depth + 1, i)) {
                caret.replace('u', 'block');
                //caret.label('u', "Index=" + index + ", i=" + i + ", depth=" + depth + ", calc=" + calc);
                caret.label(index);
            }
            else {
                caret.label(" ");
            }
            caret.shrink();
            caret.move('u');
        }
        caret.pop();

        // Indicate that we are not a leaf.
        return true;
    };
    showLevel();

    return caret.root();
}
