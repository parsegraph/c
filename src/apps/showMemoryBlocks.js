function parsegraph_MemoryPiers(app, COUNT)
{
    this.maxSize = COUNT;
    if(!this.maxSize) {
        throw new Error("Max size must be provided.");
    }
    this.size = 0;
    this.caret = new parsegraph_Caret(parsegraph_BUD);
    this.caret.setGlyphAtlas(app.glyphAtlas());
}

parsegraph_MemoryPiers.prototype.step = function()
{
    if(this.size >= this.maxSize) {
        return false;
    }
    var caret = this.caret;
    caret.spawnMove('f', 'bud');
    caret.label(1 + this.size);

    // Build NUM_COLUMNS columns, comprised of some additional horizontal
    // nodes depending on position.
    var NUM_COLUMNS = this.maxSize;
    caret.push();

    // Build the column
    var COLUMN_LENGTH = NUM_COLUMNS;
    for(var j = 0; j < COLUMN_LENGTH; ++j) {
        var r = Math.floor(Math.random() * 4);
        r = 0;
        if(r % 4 == 0) {
            if(this.size % 2 == 0) {
                if(j === 0) {
                    caret.pull('d');
                }
                caret.spawnMove('d', 'slot');
            }
            else {
                if(j === 0) {
                    caret.pull('u');
                }
                caret.spawnMove('u', 'slot');
            }
        }
        else {
            if(this.size % 2 == 0) {
                if(j === 0) {
                    caret.pull('d');
                }
                caret.spawnMove('d', 'slot');
            }
            else {
                if(j === 0) {
                    caret.pull('u');
                }
                caret.spawnMove('u', 'slot');
            }
        }
        if(j === 0) {
            caret.crease();
        }

        r = Math.floor(Math.random() * 2);
        if(r % 2 == 0) {
            caret.pull('b');
            caret.spawnMove('b', 'block');
            caret.spawn('d', 'slider');
            caret.move('f');
        }
        r = Math.floor(Math.random() * 2);
        if(r % 2 == 0) {
            caret.pull('f');
            caret.spawnMove('f', 'block');
            caret.spawn('d', 'slider');
            caret.move('b');
        }
    }

    if(!caret.has('f')) {
        caret.pull('f');
        caret.spawnMove('f', 'bud');
        caret.spawn('f', 'bud');
        caret.move('b');
    }
    if(!caret.has('b')) {
        caret.pull('b');
        caret.spawnMove('b', 'bud');
        caret.spawn('b', 'bud');
        caret.move('f');
    }

    caret.pop();

    // Spawn a bud, if we need to.
    ++this.size;
    return true;
};

parsegraph_MemoryPiers.prototype.node = function()
{
    return this.caret.root();
};

function showMemoryBlocks(graph, COUNT)
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
        caret.crease();

        // Build the column
        var COLUMN_LENGTH = NUM_COLUMNS;
        for(var j = 0; j < COLUMN_LENGTH; ++j) {
            var r = Math.floor(Math.random() * 4);
            if(r % 4 == 0) {
                if(i % 2 == 0) {
                    if(j === 0) {
                        caret.pull('d');
                    }
                    caret.spawnMove('d', 'slot');
                }
                else {
                    if(j === 0) {
                        caret.pull('u');
                    }
                    caret.spawnMove('u', 'slot');
                }
            }
            else {
                if(i % 2 == 0) {
                    if(j === 0) {
                        caret.pull('d');
                    }
                    caret.spawnMove('d', 'slot');
                }
                else {
                    if(j === 0) {
                        caret.pull('u');
                    }
                    caret.spawnMove('u', 'slot');
                }
            }

            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.pull('b');
                caret.spawnMove('b', 'block');
                caret.spawn('d', 'slider');
                caret.move('f');
            }
            r = Math.floor(Math.random() * 2);
            if(r % 2 == 0) {
                caret.pull('f');
                caret.spawnMove('f', 'block');
                caret.spawn('d', 'slider');
                caret.move('b');
            }
        }

        if(!caret.has('f')) {
            caret.pull('f');
            caret.spawnMove('f', 'bud');
            caret.spawn('f', 'bud');
            caret.move('b');
        }
        if(!caret.has('b')) {
            caret.pull('b');
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

    return caret.root();
}
