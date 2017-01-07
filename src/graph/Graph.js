/**
 * Renders an interactive parsegraph in an HTML canvas.
 *
 * Use graph.container() to add it to the DOM.
 */
function parsegraph_Graph()
{
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._container = document.createElement("div");
    this._container.className = "parsegraph_Graph";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");
    if(this._gl == null) {
        this._gl = this._canvas.getContext("webgl");
        if(this._gl == null) {
            throw new Error("GL context is not supported");
        }
    }

    this._container.appendChild(this._canvas);

    this._nodePainter = new parsegraph_NodePainter(this._gl);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._camera = new parsegraph_Camera(this);

    this._carets = [];

    // Simplify use by scheduling a repaint on construction.
    this.scheduleRepaint();
};

parsegraph_Graph.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Graph.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;

    // Make it simple to change the background color; do not require a
    // separate call to scheduleRepaint.
    this.scheduleRepaint();
};

/**
 * Retrieves the current background color.
 */
parsegraph_Graph.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_Graph.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
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
 * Schedules a repaint. Painting causes the scene
 * graph to be rebuilt.
 */
parsegraph_Graph.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

/**
 * Schedules a render. Rendering draws the scene graph.
 *
 * Rendering will cause repainting if needed.
 */
parsegraph_Graph.prototype.scheduleRender = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    if(this._pendingRender != null) {
        return;
    }
    var graph = this;
    this._pendingRender = requestAnimationFrame(function() {
        graph._pendingRender = null;
        if(graph._needsRepaint) {
            graph.paint();
            graph._needsRepaint = false;
        }

        graph.render();
    });
};

parsegraph_Graph.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};

parsegraph_Graph.prototype.paint = function()
{
    this._nodePainter.clear();
    this._nodePainter.setBackground(this.backgroundColor());

    this._carets.forEach(function(caret) {
        this._nodePainter.drawCaret(caret[0], caret[1], caret[2]);
    }, this);

    // Paint the origin.
    this._nodePainter.drawOrigin();
};

parsegraph_Graph.prototype.render = function()
{
    var world = this.camera().project();

    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    this._gl.clearColor(
        0, 0, 0, 0
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    this._nodePainter.setBackground(this._backgroundColor);
    this._nodePainter.render(world, this.camera().scale());;

    if(typeof(this.afterRender) == "function") {
        this.afterRender();
    }
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
    //console.log("Found selected node");
    selectedNode.setSelected(!selectedNode.isSelected());

    this.scheduleRepaint();

    return true;
};

parsegraph_Graph.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_Graph.prototype.gl = function()
{
    return this._gl;
};

/**
 * Returns the container that holds the canvas for this graph.
 */
parsegraph_Graph.prototype.container = function()
{
    return this._container;
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

