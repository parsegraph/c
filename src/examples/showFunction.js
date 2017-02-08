function showFunction(COUNT)
{
    if(COUNT === undefined) {
        COUNT = 50;
    }

    // Enter.
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.spawnMove('f', 'bud');

    // HOIRZONTAL_STEPS is the number of times the function is evaluated
    var HORIZONTAL_STEPS = COUNT;

    // VERTICAL_SIZE is the number of blocks used to display ranges.
    var VERTICAL_SIZE = COUNT;

    // RANGE_START is the minimum range value displayed.
    var RANGE_START = -2;

    // RANGE_END is the maximum range value displayed.
    var RANGE_END = 2;

    // DOMAIN_START is the minimum domain value used.
    var DOMAIN_START = -2 * 3.14159;

    // DOMAIN_END is the maximum domain value used.
    var DOMAIN_END = 2 * 3.14159;

    var pos = DOMAIN_START;
    var increment = (DOMAIN_END - DOMAIN_START) / HORIZONTAL_STEPS;
    for(var i = 0; i < HORIZONTAL_STEPS; ++i) {
        var result = Math.sin(pos);

        var colSize = 0;
        if(result < RANGE_START) {
            colSize = -VERTICAL_SIZE;
        }
        else if(result > RANGE_END) {
            colSize = VERTICAL_SIZE;
        }
        else {
            var interpolated =
                (result - RANGE_START) / (RANGE_END - RANGE_START);
            colSize = Math.floor(interpolated * VERTICAL_SIZE);
        }

        caret.push();
        for(var j=0; j < Math.abs(colSize); ++j) {
            if(colSize > 0) {
                caret.spawnMove('u', 'bud');
            }
            else {
                caret.spawnMove('d', 'bud');
            }
            if(j == Math.abs(colSize) - 1) {
                caret.replace('block');
                caret.label(i);
            }
        }
        if(Math.abs(colSize) == 0) {
            caret.replace('block');
            caret.label(i);
        }
        caret.pop();

        pos = pos + increment;
        caret.spawnMove('f', 'bud');
    }

    return caret.root();
}
