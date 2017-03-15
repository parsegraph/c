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
        COUNT = 30;
    }
    COUNT = Math.min(COUNT, 100);
    COUNT = 200;

    var commands = ["0 Copy", "1 Cut", "2 Paste", "3 Delete", "Open", "New"];

    var caret = new parsegraph_Caret(parsegraph_BLOCK);
    var selectedNode;

    var commandStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    commandStyle.backgroundColor = new parsegraph_Color(.4, 1, .4, 1);
    commandStyle.borderColor = new parsegraph_Color(0, .5, 0, 1);

    var commandItemStyle = parsegraph_copyStyle(parsegraph_BLOCK);
    commandItemStyle.backgroundColor = new parsegraph_Color(1, 0, 0, 1);
    commandItemStyle.borderColor = new parsegraph_Color(0, .5, 0, 1);

    /**
     * Attaches commands at the current position.
     */
    var attachCommands = function() {
        caret.onClick(function() {
            //console.log("OnClick!");
            if(graph.isCarouselShown() && selectedNode == this) {
                graph.clearCarousel();
                graph.hideCarousel();
                graph.scheduleCarouselRepaint();
                selectedNode = null;
                return;
            }
            selectedNode = this;
            graph.clearCarousel();

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
                graph.addToCarousel(commandCaret.root(), function() {
                    //console.log("Clicked " + command + commandCaret.root().isSelected());
                    graph.clearCarousel();
                    graph.hideCarousel();
                    graph.scheduleCarouselRepaint();
                    selectedNode = null;
                }, this);
            }, this);

            graph.showCarousel();
            graph.setCarouselSize(Math.max(
                selectedNode.size().width(),
                selectedNode.size().height()
            ));
            graph.moveCarousel(selectedNode.absoluteX(), selectedNode.absoluteY());
            graph.scheduleCarouselRepaint();
        });
    };

    // Attach the commands to the root.
    attachCommands();

    for(var i = 0; i < COUNT; ++i) {
        var spawnRow = function(dir) {
            caret.push();
            caret.spawnMove(dir, 'bud');
            for(var j = 0; j < COUNT - i - 1; ++j) {
                caret.spawnMove('d', 'bud');
                if(j === 0) {
                    caret.crease();
                }
            }
            caret.spawnMove('d', 'slot');
            caret.label(COUNT - i);
            caret.pop();
        };
        spawnRow('b');
        spawnRow('f');

        caret.pull('d');
        caret.spawnMove('d', 'block');

        // Attach commands for this block.
        attachCommands();
    }

    caret.moveToRoot();
    caret.spawnMove('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');

    return caret.root();
}
