function showMemoryBlocks(COUNT)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);

    // Enter.
    caret.fitLoose();
    caret.spawnMove('f', 'bud');

    // Build NUM_COLUMNS columns, comprised of some additional horizontal
    // nodes depending on position.
    var NUM_COLUMNS = COUNT;
    for(var i = 0; i < NUM_COLUMNS; ++i) {
        caret.push();

        // Build the column
        var COLUMN_LENGTH = NUM_COLUMNS;
        for(var j = 0; j < COLUMN_LENGTH; ++j) {
            var r = Math.floor(Math.random() * 4);
            if(r % 4 == 0) {
                if(i % 2 == 0) {
                    caret.spawnMove('d', 'slot');
                }
                else {
                    caret.spawnMove('u', 'slot');
                }
            }
            else {
                if(i % 2 == 0) {
                    caret.spawnMove('d', 'slot');
                }
                else {
                    caret.spawnMove('u', 'slot');
                }
            }

            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.spawnMove('b', 'block');
                caret.spawn('d', 'slider');
                caret.move('f');
            }
            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.spawnMove('f', 'block');
                caret.spawn('d', 'slider');
                caret.move('b');
            }
        }

        if(!caret.has('f')) {
            caret.spawnMove('f', 'bud');
            caret.spawn('f', 'bud');
            caret.move('b');
        }
        if(!caret.has('b')) {
            caret.spawnMove('b', 'bud');
            caret.spawn('b', 'bud');
            caret.move('f');
        }

        caret.pop();

        // Spawn a bud, if we need to.
        if(i < NUM_COLUMNS) {
            caret.spawnMove('f', 'bud');
        }
    }

    return caret;
}
