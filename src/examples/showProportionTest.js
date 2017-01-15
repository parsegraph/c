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

    var commands = ["Copy", "Cut", "Paste", "Delete", "Open", "New", "Test", "Build"];

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    var selectedNode;
    var attachCommands = function() {
        caret.onClick(function() {
            if(graph.isCarouselShown() && selectedNode == this) {
                graph.clearCarousel();
                graph.hideCarousel();
                graph.scheduleRepaint();
                return;
            }
            selectedNode = this;
            graph.clearCarousel();

            var i = 0;
            commands.forEach(function(command) {
                var commandCaret = new parsegraph_Caret(graph, parsegraph_BLOCK);
                commandCaret.label(command);
                if(++i == 3) {
                    commandCaret.spawnMove('d', 's');
                    commandCaret.label(command);
                    commandCaret.move('u');
                }
                graph.addToCarousel(commandCaret, command, function() {
                    console.log("Clicked " + command);
                }, this);
            }, this);

            graph.showCarousel();
            graph.plotCarousel(this.absoluteX(), this.absoluteY());
            graph.scheduleRepaint();
        });
    };
    attachCommands();

    caret.fitExact();

    for(var i = 0; i < COUNT; ++i) {
        var spawnRow = function(dir) {
            caret.push();
            caret.spawnMove(dir, 'bud');
            for(var j = 0; j < COUNT - i - 1; ++j) {
                caret.spawnMove('d', 'bud');
            }
            caret.spawnMove('d', 'slot');
            caret.label(COUNT - i);
            caret.pop();
        };
        spawnRow('b');
        spawnRow('f');

        caret.pull('d');
        caret.spawnMove('d', 'block');
        attachCommands();
    }

    caret.moveToRoot();
    caret.spawnMove('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');

    return caret;
}
