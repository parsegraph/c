/**
 * Shows a bunch of branches that demonstrate how buds and blocks align. It's
 * also a good demonstration of what pull does. It's also a good stress test
 * for user input.
 *
 * Presently, COUNT cannot be more than 100. It defaults to 10.
 */
function showProportionTest(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 10;
    }
    COUNT = Math.min(COUNT, 100);

    var caret = new parsegraph_Caret(graph, parsegraph_SLOT);

    caret.fitExact();

    for(var i = 0; i < COUNT; ++i) {
        var spawnRow = function(dir) {
            caret.push();
            caret.spawnMove(dir, 'bud');
            for(var j = 0; j < COUNT - i - 1; ++j) {
                caret.spawnMove('d', 'bud');
            }
            caret.spawnMove('d', 'block');
            caret.label(COUNT - i);
            caret.pop();
        };
        spawnRow('b');
        spawnRow('f');

        caret.pull('d');
        caret.spawnMove('d', 'slot');
    }

    caret.moveToRoot();
    caret.spawnMove('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');

    return caret;
}
