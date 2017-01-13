/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * Use graph.container() to add it to the DOM.
 */
function parsegraph_Graph(surface)
{
    if(!surface) {
        throw new Error("Surface must be given to parsegraph_Graph");
    }
    this._surface = surface;
    this._canvas = surface.canvas();
    this._container = surface.container();
    this._gl = surface.gl();

    this._paintingDirty = true;

    this._nodePainter = new parsegraph_NodePainter(this._gl);

    this._camera = new parsegraph_Camera(this);

    this._carets = [];

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._input = new parsegraph_Input(this, this._camera);
};

parsegraph_Graph.prototype.paint = function()
{
    if(!this._paintingDirty) {
        return;
    }

    this._nodePainter.clear();
    this._nodePainter.setBackground(this.surface().backgroundColor());

    this._carets.forEach(function(caret) {
        this._nodePainter.drawCaret(caret[0], caret[1], caret[2]);
    }, this);

    // Paint the origin.
    this._nodePainter.drawOrigin();

    this._paintingDirty = false;
};

parsegraph_Graph.prototype.scheduleRepaint = function()
{
    this._paintingDirty = true;
    this._surface.scheduleRepaint();
};

parsegraph_Graph.prototype.scheduleRender = function()
{
    this._surface.scheduleRender();
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();
    this._nodePainter.setBackground(this._backgroundColor);
    this._nodePainter.render(world, this.camera().scale());;
};

parsegraph_Graph.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Graph.prototype.surface = function()
{
    return this._surface;
};

parsegraph_Graph.prototype.gl = function()
{
    return this._surface._gl;
};

parsegraph_Graph.prototype.container = function()
{
    return this._surface._container;
};

parsegraph_Graph.prototype.canvas = function()
{
    return this._surface._canvas;
};

parsegraph_Graph.prototype.plot = function(caret, worldX, worldY)
{
    if(worldX === undefined) {
        worldX = 0;
    }
    if(worldY === undefined) {
        worldY = 0;
    }

    this._carets.push([caret, worldX, worldY]);

    // Simplify use by scheduling a repaint.
    this.scheduleRepaint();
};

parsegraph_Graph.prototype.removePlot = function(caret)
{
    for(var i = 0; i < this._carets.length; ++i) {
        if(this._carets[i][0] == caret) {
            this._carets.splice(i, 1);
        }
    }

    // Simplify use by scheduling a repaint.
    this.scheduleRepaint();
};

/**
 * Receives a mouseDown event at the given coordinates, in world space.
 */
parsegraph_Graph.prototype.mouseDown = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._carets.length - 1; i >= 0; --i) {
        var caretData = this._carets[i];
        var caret = caretData[0];
        var worldX = caretData[1];
        var worldY = caretData[2];
        var selectedNode = caret.nodeUnderCoords(x - worldX, y - worldY);
        if(selectedNode) {
            // Node located; no further search.
            break;
        }
    }
    if(!selectedNode) {
        // No node found.
        return false;
    }

    // A node was found; show its options.
    selectedNode.click();

    return true;
};

parsegraph_Graph_Tests = new parsegraph_TestSuite("parsegraph_Graph");
parsegraph_AllTests.addTest(parsegraph_Graph_Tests);

parsegraph_Graph_Tests.addTest("parsegraph_Graph", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_SLOT);
    if(caret.node().type() !== parsegraph_SLOT) {
        return "Graph must use the provided type for its root.";
    }
    caret = new parsegraph_Caret(graph, parsegraph_BUD);
    if(caret.node().type() !== parsegraph_BUD) {
        return "Graph must use the provided type for its root.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph.spawn", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, 'b');
    if(
       caret.has(parsegraph_FORWARD) ||
       caret.has(parsegraph_BACKWARD) ||
       caret.has(parsegraph_UPWARD) ||
       caret.has(parsegraph_DOWNWARD)
    ) {
        return "Graph roots must begin as leaves.";
    }

    caret.spawn(parsegraph_FORWARD, parsegraph_SLOT);
    if(!caret.has(parsegraph_FORWARD)) {
        return "Graph must add nodes in the specified direction.";
    }
    if(
        caret.has(parsegraph_DOWNWARD) ||
        caret.has(parsegraph_BACKWARD) ||
        caret.has(parsegraph_UPWARD)
    ) {
        return "Graph must not add nodes in incorrect directions.";
    }

    caret.erase(parsegraph_FORWARD);
    if(
       caret.has(parsegraph_FORWARD) ||
       caret.has(parsegraph_BACKWARD) ||
       caret.has(parsegraph_UPWARD) ||
       caret.has(parsegraph_DOWNWARD)
    ) {
        return "Erase must remove the specified node.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Trivial layout", function() {
    // Spawn the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, 'b');
    caret.node().commitLayoutIteratively();

    // Run the comparison tests.
    if(
        caret.node().extentOffsetAt(parsegraph_FORWARD) !=
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_FORWARD));
        console.log(caret.node().blockStyle().minHeight / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().verticalPadding);
        return "Forward extent offset for block must match.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_BACKWARD));
        console.log(caret.node().blockStyle().minHeight / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().verticalPadding);
        return "Backward extent offset for block must match.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().blockStyle().minWidth / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().horizontalPadding
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_UPWARD));
        console.log(caret.node().blockStyle().minWidth / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().horizontalPadding);
        return "Upward extent offset for block must match.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_DOWNWARD) !=
        caret.node().blockStyle().minWidth / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().horizontalPadding
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_DOWNWARD));
        console.log(caret.node().blockStyle().minWidth / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().horizontalPadding);
        return "Downward extent offset for block must match.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with forward bud", function() {
    // Spawn the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();

    // Run the comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth/ 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth/ 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with backward bud", function() {
    // Spawn the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();
    caret.moveToRoot();

    // Run the comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bud').minWidth +
        parsegraph_style('bud').borderThickness * 2 +
        parsegraph_style('bud').horizontalPadding * 2 +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('block').minWidth / 2 +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bud').minWidth +
        parsegraph_style('bud').borderThickness * 2 +
        parsegraph_style('bud').horizontalPadding * 2 +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('block').minWidth / 2 +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with downward bud", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();
    caret.moveToRoot();

    // Run the comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('block').verticalPadding +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_style('block').verticalPadding +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('block').minWidth / 2 +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('block').minWidth / 2 +
        parsegraph_style('block').borderThickness +
        parsegraph_style('block').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with downward block", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run the comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').verticalPadding
        + parsegraph_style('bu').borderThickness
        + parsegraph_style('bu').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').verticalPadding
        + parsegraph_style('bu').borderThickness
        + parsegraph_style('bu').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style("b").minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style("b").minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with vertical blocks, two deep", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);

    var depth = 2;
    caret.push();
    for(var i = 0; i < depth; ++i) {
        caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
    }
    caret.pop();
    caret.push();
    for(var i = 0; i < depth; ++i) {
        caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
    }
    caret.pop();
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('b').verticalPadding * 2
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').minHeight
        + caret.node().nodeAt(parsegraph_UPWARD).verticalSeparation(parsegraph_UPWARD)
        + parsegraph_style('b').verticalPadding * 2
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').minHeight
        + caret.node().verticalSeparation(parsegraph_UPWARD)
        + parsegraph_style('bu').verticalPadding
        + parsegraph_style('bu').borderThickness
        + parsegraph_style('bu').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').verticalPadding * 2
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').minHeight
        + caret.node().nodeAt(parsegraph_UPWARD).verticalSeparation(parsegraph_UPWARD)
        + parsegraph_style('b').verticalPadding * 2
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').minHeight
        + caret.node().verticalSeparation(parsegraph_UPWARD)
        + parsegraph_style('bu').verticalPadding
        + parsegraph_style('bu').borderThickness
        + parsegraph_style('bu').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with upward bud", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with upward and downward buds", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with forward and backward buds", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').minWidth +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').horizontalPadding * 2 +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').minWidth +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').horizontalPadding * 2 +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis Sans Backward T layout", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Positive Direction Layout", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();

    // Run the tests.
    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').minHeight +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_style('bu').minHeight +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Negative Direction Layout", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').minWidth +
        2 * parsegraph_style('bu').horizontalPadding +
        2 * parsegraph_style('bu').borderThickness +
        caret.node().horizontalSeparation(parsegraph_DOWNWARD) +
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').horizontalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minWidth +
        caret.node().horizontalSeparation(parsegraph_DOWNWARD) +
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis layout", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').minHeight +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').minHeight / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').verticalPadding,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_FORWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').minWidth +
        2 * parsegraph_style('bu').horizontalPadding +
        2 * parsegraph_style('bu').borderThickness +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').horizontalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minWidth +
        caret.node().horizontalSeparation(parsegraph_FORWARD) +
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with shrunk bud", function(resultDom) {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.fitExact();
    caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    caret.shrink();
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var expectedSeparation = parsegraph_style('b').minWidth / 2
        + parsegraph_style('b').horizontalPadding
        + parsegraph_style('b').borderThickness
        + parsegraph_SHRINK_SCALE * caret.node().horizontalSeparation(parsegraph_FORWARD)
        + parsegraph_SHRINK_SCALE * (
            parsegraph_style('bu').horizontalPadding
            + parsegraph_style('bu').borderThickness
            + parsegraph_style('bu').minWidth / 2
        );
    if(
        caret.node().separationAt(parsegraph_FORWARD)
        != expectedSeparation
    ) {
        return "Expected forward separation = " + expectedSeparation + ", actual = " + caret.node().separationAt(parsegraph_FORWARD);
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var downwardExtent = new parsegraph_Extent();
    downwardExtent.appendLS(
        parsegraph_style('b').minWidth
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').horizontalPadding * 2,
        parsegraph_style('b').verticalPadding
        + parsegraph_style('b').borderThickness
        + parsegraph_style('b').minHeight / 2
    );
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE
            * caret.node().horizontalSeparation(parsegraph_FORWARD),
        parsegraph_SHRINK_SCALE * parsegraph_LINE_THICKNESS / 2
    );
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * (
            2 * parsegraph_style('bu').horizontalPadding
            + 2 * parsegraph_style('bu').borderThickness
            + parsegraph_style('bu').minWidth
        ),
        parsegraph_SHRINK_SCALE * (
            parsegraph_style('bu').horizontalPadding
            + parsegraph_style('bu').borderThickness
            + parsegraph_style('bu').minWidth / 2
        )
    );

    if(!caret.node().extentsAt(parsegraph_DOWNWARD).equals(downwardExtent)) {
        graph._nodePainter.enableExtentRendering();
        resultDom.appendChild(
            graph._container
        );
        resultDom.appendChild(
            downwardExtent.toDom("Expected downward extent")
        );
        resultDom.appendChild(
            caret.node().extentsAt(parsegraph_DOWNWARD).toDom("Actual downward extent")
        );
        resultDom.appendChild(document.createTextNode(
            "Extent offset = " + caret.node().extentOffsetAt(parsegraph_DOWNWARD)
        ));
        return "Downward extent differs.";
    }

    var blockHeight = parsegraph_style('b').minHeight
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').verticalPadding * 2

    var budHeight = parsegraph_style('bu').minHeight
        + parsegraph_style('bu').borderThickness * 2
        + parsegraph_style('bu').verticalPadding * 2

    var forwardExtent = new parsegraph_Extent();
    forwardExtent.appendLS(
        blockHeight / 2 - parsegraph_SHRINK_SCALE * budHeight / 2,
        parsegraph_style('b').minWidth / 2
            + parsegraph_style('b').horizontalPadding
            + parsegraph_style('b').borderThickness
    );
    forwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * budHeight,
        parsegraph_style('b').minWidth / 2
            + parsegraph_style('b').horizontalPadding
            + parsegraph_style('b').borderThickness
            + parsegraph_SHRINK_SCALE * caret.node().horizontalSeparation(parsegraph_FORWARD)
            + parsegraph_SHRINK_SCALE * budHeight
    );
    forwardExtent.appendLS(
        blockHeight / 2 - parsegraph_SHRINK_SCALE * budHeight / 2,
        parsegraph_style('b').minWidth / 2
            + parsegraph_style('b').horizontalPadding
            + parsegraph_style('b').borderThickness
    );

    if(!caret.node().extentsAt(parsegraph_FORWARD).equals(forwardExtent)) {
        graph._nodePainter.enableExtentRendering();
        resultDom.appendChild(
            graph._container
        );
        resultDom.appendChild(
            forwardExtent.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            caret.node().extentsAt(parsegraph_FORWARD).toDom("Actual forward extent")
        );
        resultDom.appendChild(document.createTextNode(
            "Extent offset = " + caret.node().extentOffsetAt(parsegraph_FORWARD)
        ));
        return "Forward extent differs.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with 2-deep shrunk downward block", function(resultDom) {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);
    caret.fitExact();
    caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.shrink();
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    var downwardExtent = new parsegraph_Extent();
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * (
            parsegraph_style('b').minWidth
            + parsegraph_style('b').borderThickness * 2
            + parsegraph_style('b').horizontalPadding * 2
        ),
        parsegraph_style('bu').verticalPadding + parsegraph_style('bu').borderThickness + parsegraph_style('bu').minHeight / 2
        + parsegraph_SHRINK_SCALE * caret.node().verticalSeparation(parsegraph_DOWNWARD)
        + parsegraph_SHRINK_SCALE * 2 * (parsegraph_style('bu').verticalPadding + parsegraph_style('bu').borderThickness + parsegraph_style('bu').minHeight / 2)
        + parsegraph_SHRINK_SCALE * caret.node().nodeAt(parsegraph_DOWNWARD).verticalSeparation(parsegraph_DOWNWARD)
        + parsegraph_SHRINK_SCALE * (parsegraph_style('b').minHeight + parsegraph_style('b').verticalPadding * 2 + parsegraph_style('b').borderThickness * 2)
    );

    if(!parsegraph_checkExtentsEqual(graph, caret, parsegraph_DOWNWARD, downwardExtent, resultDom)) {
        return "Downward extent differs.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis Sans Forward T layout", function() {
    // Build the graph.
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.moveToRoot();
    caret.node().commitLayoutIteratively();

    // Run comparison tests.
    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    ) {
        return "Graphs symmetric about the root should have symmetric extent offsets.";
    }

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        console.log(
            "Forward extent (offset to center=" +
            caret.node().extentOffsetAt(parsegraph_FORWARD) +
            ")"
        );
        var forwardExtent = caret.node().extentsAt(parsegraph_FORWARD);
        forwardExtent.forEach(function(length, size, i) {
            console.log(i + ". l=" + length + ", s=" + size);
        });

        console.log("UPWARDExtent (offset to center=" +
            caret.node().extentOffsetAt(parsegraph_UPWARD) +
            ")"
        );
        var UPWARDExtent = caret.node().extentsAt(parsegraph_UPWARD);
        UPWARDExtent.forEach(function(length, size, i) {
            console.log(i + ". l=" + length + ", s=" + size);
        });

        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').verticalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minHeight +
        caret.node().verticalSeparation(parsegraph_UPWARD) +
        parsegraph_style('b').verticalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minHeight / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').minWidth +
        2 * parsegraph_style('bu').horizontalPadding +
        2 * parsegraph_style('bu').borderThickness +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('b').minWidth / 2 +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').horizontalPadding,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_style('bu').horizontalPadding * 2 +
        parsegraph_style('bu').borderThickness * 2 +
        parsegraph_style('bu').minWidth +
        caret.node().horizontalSeparation(parsegraph_BACKWARD) +
        parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

