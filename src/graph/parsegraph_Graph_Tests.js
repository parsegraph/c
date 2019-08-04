parsegraph_Node_Tests = new parsegraph_TestSuite("parsegraph_Node");

parsegraph_Node_Tests.addTest("parsegraph_Node.setClickListener", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.setClickListener(function() {
    });
});

parsegraph_Node_Tests.addTest("parsegraph_Node.setKeyListener", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.setKeyListener(function() {
    });
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph", function() {
    var caret = new parsegraph_Caret(parsegraph_SLOT);
    if(caret.node().type() !== parsegraph_SLOT) {
        return "Graph must use the provided type for its root.";
    }
    caret = new parsegraph_Caret(parsegraph_BUD);
    if(caret.node().type() !== parsegraph_BUD) {
        return "Graph must use the provided type for its root.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph.spawn", function() {
    var caret = new parsegraph_Caret('b');
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
    //console.log("TRIV");
    var caret = new parsegraph_Caret('b');
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
        console.log(caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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

parsegraph_Graph_Tests.addTest("parsegraph_Graph - PaintGroup sanity", function() {
    // Spawn the graph.
    var caret = new parsegraph_Caret(parsegraph_BUD);

    var node = caret.node();
    if(node._paintGroupNext !== node) {
        throw new Error("Node's paint group next is not itself");
    }
    var creased = caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    if(creased._paintGroupNext !== creased._paintGroupNext) {
        throw new Error("Child's paint group next is not null");
    }
    caret.crease();
    if(creased._paintGroupNext !== node) {
        throw new Error("Child's paint group next is not node ");
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with forward creased bud", function() {
    // Spawn the graph.
    var caret = new parsegraph_Caret(parsegraph_BUD);
    var creased = caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    caret.crease();
    caret.shrink();
    var grandchild = caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    //caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    caret.moveToRoot();
    if(creased._layoutNext !== grandchild) {
        throw new Error("Creased layout next must be " + grandchild + " but was " + creased._layoutNext);
    }
    if(grandchild._layoutNext !== creased) {
        throw new Error("Grandchilds layout next must be " + creased + " but was " + grandchild._layoutNext);
    }
    if(creased._paintGroupNext !== caret.root()) {
        throw new Error(creased + "'s next paint group must be the root but was " + creased._paintGroupNext);
    }
    if(caret.root()._paintGroupNext !== creased) {
        throw new Error(caret.root()+ "'s next paint group must be " + creased + " but was " + caret.root()._paintGroupNext);
    }
    caret.node().commitLayoutIteratively();
    //console.log("Group X of root: " + caret.node().groupX());
    //console.log("Group X of forward: " + caret.node().nodeAt(parsegraph_FORWARD).groupX());
    //console.log("Abs X of forward: " + caret.node().nodeAt(parsegraph_FORWARD).absoluteX());
    //console.log("Abs X of forward forward: " + caret.node().nodeAt(parsegraph_FORWARD).nodeAt(parsegraph_FORWARD).absoluteX());
    //console.log("Group X of forward forward: " + caret.node().nodeAt(parsegraph_FORWARD).nodeAt(parsegraph_FORWARD).groupX());
    //console.log(caret.node().nodeAt(parsegraph_DOWNWARD).nodeAt(parsegraph_FORWARD).nodeAt(parsegraph_FORWARD).nodeAt(parsegraph_FORWARD).groupX());
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with backward bud", function() {
    // Spawn the graph.
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BUD);
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

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with vertical blocks, two deep", function(dom) {
    // Build the graph.
    var caret = new parsegraph_Caret(parsegraph_BUD);

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

    var computedBlockSize = parsegraph_style('b').verticalPadding * 2
        + parsegraph_style('b').borderThickness * 2
        + parsegraph_style('b').minHeight
        + caret.node().nodeAt(parsegraph_UPWARD).verticalSeparation(parsegraph_UPWARD);

    var diff = expect(
        computedBlockSize * (depth - 1)
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
        computedBlockSize * (depth - 1)
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);

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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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
        //graph._nodePainter.enableExtentRendering();
        //resultDom.appendChild(
            //graph._container
        //);
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
    var caret = new parsegraph_Caret(parsegraph_BUD);
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

    if(!parsegraph_checkExtentsEqual(caret, parsegraph_DOWNWARD, downwardExtent, resultDom)) {
        // TODO Insert graph.
        return "Downward extent differs.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis Sans Forward T layout", function() {
    // Build the graph.
    var caret = new parsegraph_Caret(parsegraph_BLOCK);
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

parsegraph_Graph_Tests.addTest("Centrally aligned back-and-forth", function() {
    var car = new parsegraph_Caret('b');
    car.spawnMove('d', 'bu');
    car.align('f', 'c');
    car.spawnMove('f', 'bu');
    car.spawnMove('d', 'bu');

    car.root().commitLayoutIteratively();
    var sep = car.root().separationAt(parsegraph_DOWNWARD);

    //console.log("Bud size: " + (parsegraph_style('bu').horizontalPadding * 2 +
        //parsegraph_style('bu').borderThickness * 2 +
        //parsegraph_style('bu').minWidth));
    //console.log("Vertical separation: " + car.root().verticalSeparation(parsegraph_DOWNWARD));
    //console.log("Block size: " + (parsegraph_style('b').horizontalPadding * 2 +
        //parsegraph_style('b').borderThickness * 2 +
        //parsegraph_style('b').minWidth));
    //console.log(sep);
    /*return sep - (
        (parsegraph_style('b').horizontalPadding +
        parsegraph_style('b').borderThickness +
        parsegraph_style('b').minWidth / 2) +
        car.root().verticalSeparation(parsegraph_DOWNWARD) +
        (parsegraph_style('bu').horizontalPadding +
        parsegraph_style('bu').borderThickness +
        parsegraph_style('bu').minWidth / 2)
    );*/
});

parsegraph_Graph_Tests.addTest("Label test", function() {
    var car = new parsegraph_Caret('b');
    car.setGlyphAtlas(parsegraph_buildGlyphAtlas());
    car.label('No time');
    car.root().commitLayoutIteratively();
});

function parsegraph_simpleGraph(container, node, glyphAtlas)
{
    if(node.root && !glyphAtlas) {
        glyphAtlas = node.glyphAtlas();
        node = node.root();
    }
    var graph = new parsegraph_Graph();
    graph.surface().resize(500, 500);
    graph.setGlyphAtlas(glyphAtlas);
    container.appendChild(graph.surface().container());
    graph.plot(node);
    graph.scheduleRepaint();
    var timer = new parsegraph_AnimationTimer();
    timer.setListener(function() {
        node.showInCamera(graph.camera(), true);
        graph.surface().paint();
        graph.surface().render();
    });
    graph.input().SetListener(function() {
        timer.schedule();
    });
    timer.schedule();
}

parsegraph_Graph_Tests.addTest("Intra-group move test", function(out) {
    var car = new parsegraph_Caret('b');
    car.setGlyphAtlas(parsegraph_buildGlyphAtlas());

    var bnode = car.spawn('d', 'b');
    car.pull('d');

    var anode = car.spawnMove('f', 'u');
    var mnode = car.spawn('d', 'b');
    car.root().commitLayoutIteratively();
    var ax = anode.groupX();

    var gx = mnode.groupX();

    var ns = parsegraph_copyStyle('b');
    var increase = 100;
    ns.minWidth += increase;
    bnode.setBlockStyle(ns);
    car.root().commitLayoutIteratively();
    if(ax === anode.groupX()) {
        parsegraph_simpleGraph(out, car);
        throw new Error("Bud must move when another node grows in size.");
    }
    if(gx + increase/2 !== mnode.groupX()) {
        parsegraph_simpleGraph(out, car);
        throw new Error("Node must be moved when another node grows in size. (expected " + (gx + increase/2) + " versus actual " + mnode.groupX() + ")");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node.setLabel", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    var atlas = parsegraph_buildGlyphAtlas();
    n.setLabel("No time", atlas);
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading spawned", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
});

function makeChild() {
    var car = new parsegraph_Caret(parsegraph_BLOCK);
    car.spawnMove('f', 'b');
    car.spawnMove('i', 'b');
    car.spawnMove('f', 's');
    return car.root();
};

function makeChild2() {
    var car = new parsegraph_Caret(parsegraph_SLOT);
    car.spawnMove('i', 'b');
    car.spawnMove('f', 's');
    car.spawnMove('i', 'b');
    car.spawnMove('f', 'b');
    return car.root();
};

parsegraph_Node_Tests.addTest("parsegraph_Node lisp test", function(out) {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.push();
    car.spawnMove('f', 's');
    car.spawnMove('f', 's');
    car.pop();
    car.spawnMove('d', 'u');
    car.push();
    car.spawnMove('f', 's');
    car.push();
    car.spawnMove('f', 's');
    car.spawnMove('i', 'b');
    car.spawnMove('d', 'u');
    car.spawnMove('f', 'b');
    car.spawnMove('i', 's');
    car.spawnMove('f', 's');
    car.pop();
    car.pull('f');
    car.spawnMove('d', 'u');
    car.connect('f', makeChild2());
    car.spawnMove('d', 'u');
    car.connect('f', makeChild2());
    car.pop();
    car.spawnMove('d', 'u');
    car.root().commitLayoutIteratively();
    //parsegraph_getLayoutNodes(car.root());
    var g = new parsegraph_Graph();
    g.setGlyphAtlas(parsegraph_buildGlyphAtlas());
    out.appendChild(g.surface().container());
    g.plot(car.root());
    g.scheduleRepaint();
    g.input().SetListener(function() {
        g.surface().paint();
        g.surface().render();
    });
});

parsegraph_Node_Tests.addTest("parsegraph_Node lisp test simplified", function(out) {
    var root = new parsegraph_Node(parsegraph_BUD);
    root._id = "root";

    var a = new parsegraph_Node(parsegraph_BLOCK);
    a._id = "a";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";

    var chi = new parsegraph_Node(parsegraph_BUD);
    chi._id = "chi";

    chi.connectNode(parsegraph_FORWARD, c);

    a.connectNode(parsegraph_DOWNWARD, chi);
    a.connectNode(parsegraph_FORWARD, b);
    //console.log("LISP TEST");
    //console.log(parsegraph_getLayoutNodes(a));
    root.connectNode(parsegraph_FORWARD, a);

    root.commitLayoutIteratively();
});

parsegraph_Node_Tests.addTest("parsegraph_Node layout preference test", function(out) {
    var root = new parsegraph_Node(parsegraph_BUD);
    root._id = "root";

    var a = new parsegraph_Node(parsegraph_BLOCK);
    a._id = "a";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";

    var chi = new parsegraph_Node(parsegraph_BUD);
    chi._id = "chi";

    chi.connectNode(parsegraph_FORWARD, c);

    //console.log("cur a", parsegraph_nameLayoutPreference(a._layoutPreference));
    a.connectNode(parsegraph_DOWNWARD, chi);
    a.connectNode(parsegraph_FORWARD, b);
    root.connectNode(parsegraph_FORWARD, a);
    a.setLayoutPreference(parsegraph_PREFER_PERPENDICULAR_AXIS);

    //console.log("new a", parsegraph_nameLayoutPreference(a._layoutPreference));
    var r = parsegraph_getLayoutNodes(root)[0];
    if(r !== c) {
        throw new Error("Expected c, got " + r._id);
    }

    root.commitLayoutIteratively();

    root.disconnectNode(parsegraph_FORWARD);
    if(a._layoutPreference !== parsegraph_PREFER_VERTICAL_AXIS) {
        throw new Error("a layoutPreference was not VERT but " + parsegraph_nameLayoutPreference(a._layoutPreference));
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    if(b._layoutNext != b) {
        throw new Error("Previous sanity");
    }
    if(b._layoutPrev != b) {
        throw new Error("Next sanity");
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != n) {
        return false;
    }
    if(n._layoutNext != b) {
        return false;
    }
    if(b._layoutNext != n) {
        return false;
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    if(b._layoutNext != b) {
        throw new Error("Previous sanity");
    }
    if(b._layoutPrev != b) {
        throw new Error("Next sanity");
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != n) {
        throw new Error("Next connected sanity");
    }
    if(n._layoutNext != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutNext != n) {
        throw new Error("Next connected sanity");
    }
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);

    var nodes = parsegraph_getLayoutNodes(n);
    if(nodes[0] != c) {
        throw new Error("First node is not C");
    }
    if(nodes[1] != b) {
        throw new Error("Second node is not B");
    }
    if(nodes[2] != n) {
        throw new Error("Third node is not n");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings and disconnected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";

    var inner = b.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    inner._id = "inner";
    if(b._layoutPrev != inner) {
        return "B layoutBefore isn't inner";
    }
    if(inner._layoutPrev != b) {
        return "Inner layoutBefore isn't B";
    }

    n.connectNode(parsegraph_FORWARD, b);
    if(n._layoutPrev != b) {
        throw new Error("Next connected sanity");
    }
    if(b._layoutPrev != inner) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(inner._layoutPrev != n) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(n._layoutNext != inner) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(inner._layoutNext != b) {
        throw new Error("N layoutBefore wasn't B");
    }
    if(b._layoutNext != n) {
        throw new Error("N layoutBefore wasn't B");
    }
    //console.log("LNS");
    //console.log(parsegraph_getLayoutNodes(n));
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);
    //console.log("PLNS");
    //console.log(parsegraph_getLayoutNodes(n));

    var nodes = parsegraph_getLayoutNodes(n);
    if(nodes[0] != c) {
        throw new Error("First node is not C");
    }
    if(nodes[1] != inner) {
        throw new Error("Second node is not inner");
    }
    if(nodes[2] != b) {
        throw new Error("Third node is not b");
    }
    if(nodes[3] != n) {
        throw new Error("Third node is not n");
    }
    if(b !== n.disconnectNode(parsegraph_FORWARD)) {
        throw new Error("Not even working properly");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with multiple siblings and disconnected 2", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    if(n._layoutNext != n) {
        throw new Error("Previous sanity");
    }
    if(n._layoutPrev != n) {
        throw new Error("Next sanity");
    }

    var b = new parsegraph_Node(parsegraph_BLOCK);
    b._id = "b";
    parsegraph_testLayoutNodes([b]);

    var inner = b.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    inner._id = "inner";
    parsegraph_testLayoutNodes([inner, b]);

    n.connectNode(parsegraph_FORWARD, b);
    parsegraph_testLayoutNodes([inner, b, n]);
    var c = new parsegraph_Node(parsegraph_BLOCK);
    c._id = "c";
    n.connectNode(parsegraph_BACKWARD, c);
    parsegraph_testLayoutNodes([c, inner, b, n]);
    if(c !== n.disconnectNode(parsegraph_BACKWARD)) {
        throw new Error("Not even working properly");
    }
    parsegraph_testLayoutNodes([c], "disconnected");
    parsegraph_testLayoutNodes([inner, b, n], "finished");
});

function parsegraph_testLayoutNodes(expected, name)
{
    var node = expected[expected.length - 1];
    var nodes = parsegraph_getLayoutNodes(node);
    for(var i = 0; i < expected.length; ++i) {
        if(nodes[i] != expected[i]) {
            //console.log("TESTLAYOUTNODES");
            //console.log(nodes);
            throw new Error((name ? name : "") + " index " + i + ": Node " + (expected[i] ? expected[i]._id : "null") + " expected, not " + (nodes[i] ? nodes[i]._id : "null"));
        }
    }
}

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading deeply connected", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    n._id = "n";
    parsegraph_testLayoutNodes([n], "deeply conn 1");
    var b = n.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    b._id = "b";
    parsegraph_testLayoutNodes([b, n], "deeply conn 2");
    var c = b.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
    c._id = "c";
    parsegraph_testLayoutNodes([c, b, n], "deeply conn 3");
    var d = b.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    d._id = "d";
    parsegraph_testLayoutNodes([c, d, b, n], "deeply conn 4");

    if(n._layoutNext !== c) {
        throw new Error("Previous sanity 1: got " + n._layoutNext._id + " expected " + c._id);
    }
    if(d._layoutNext !== b) {
        throw new Error("Previous sanity 2");
    }
    if(c._layoutNext !== d) {
        throw new Error("Previous sanity 3");
    }
    if(b._layoutNext !== n) {
        throw new Error("Previous sanity 4");
    }
});

parsegraph_Node_Tests.AddTest("Right-to-left test", function() {
    var node = new parsegraph_Node(parsegraph_BUD);
    node.setRightToLeft(true);
});

parsegraph_Node_Tests.AddTest("Disconnect trivial test", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    car.disconnect();
    originalRoot.commitLayoutIteratively();
    newRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Disconnect simple test", function() {
    //console.log("DISCONNECT SIMPLE TEST");
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    var midRoot = car.spawnMove('f', 'b');
    car.spawnMove('f', 'b');
    // *=[]=[] <--newRoot == car
    // ^oldRoot
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    if(originalRoot._layoutNext != newRoot) {
        console.log("originalRoot", originalRoot);
        console.log("midRoot", midRoot);
        console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
        console.log("newRoot", newRoot);
        throw new Error("Original's previous should be newroot");
    }
    //console.log("Doing disconnect");
    car.disconnect();
    newRoot.commitLayoutIteratively();
    if(originalRoot._layoutNext != midRoot) {
        console.log("originalRoot", originalRoot);
        console.log("midRoot", midRoot);
        console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
        console.log("newRoot", newRoot);
        throw new Error("layoutAfter is invalid");
    }
    originalRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Disconnect simple test, reversed", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    var midRoot = car.spawnMove('f', 'b');
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    car.disconnect();
    originalRoot.commitLayoutIteratively();
    newRoot.commitLayoutIteratively();
    if(originalRoot._layoutNext != midRoot) {
        throw new Error("layoutAfter is invalid");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with crease", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    var b = new parsegraph_Node(parsegraph_BLOCK);
    n.connectNode(parsegraph_FORWARD, b);
    b.setPaintGroup(true);
    if(b._layoutNext !== b) {
        throw new Error("Crease must remove that node from its parents layout chain (child)");
    }
    if(n._layoutNext !== n) {
        throw new Error("Crease must remove that node from its parents layout chain (parent)");
    }
});

parsegraph_Node_Tests.addTest("parsegraph_Node Morris world threading connected with creased child", function() {
    var n = new parsegraph_Node(parsegraph_BLOCK);
    var b = new parsegraph_Node(parsegraph_BLOCK);
    b.setPaintGroup(true);
    n.connectNode(parsegraph_FORWARD, b);
    if(b._layoutNext !== b) {
        throw new Error("Crease must remove that node from its parents layout chain (child)");
    }
    if(n._layoutNext !== n) {
        throw new Error("Crease must remove that node from its parents layout chain (parent)");
    }
});

function parsegraph_getLayoutNodes(node)
{
    var list = [];
    var orig = node;
    var start = new Date();
    do {
        node = node._layoutNext;
        //console.log(node._id);
        for(var i = 0; i < list.length; ++i) {
            if(list[i] == node) {
                console.log(list);
                throw new Error("Layout list has loop");
            }
        }
        list.push(node);
        if(parsegraph_elapsed(start) > 5000) {
            throw new Error("Infinite loop");
        }
    } while(orig != node);
    return list;
}

parsegraph_Node_Tests.AddTest("Disconnect complex test", function() {
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    car.spawnMove('f', 'b');
    car.push();
    //console.log("NODE WITH CHILD", car.node());
    car.spawnMove('d', 'u');
    //console.log("MOST DOWNWARD NODE OF CHILD", car.node());
    car.pop();
    car.spawnMove('f', 'b');
    car.node().commitLayoutIteratively();
    var newRoot = car.node();
    var newLastNode = newRoot.nodeAt(parsegraph_BACKWARD);
    //console.log("Doing complex disc", originalRoot);
    //console.log(parsegraph_getLayoutNodes(originalRoot));
    car.disconnect();
    //console.log("COMPLEX DISCONNECT DONE");
    //console.log(parsegraph_getLayoutNodes(originalRoot));
    //newRoot.commitLayoutIteratively();
    originalRoot.commitLayoutIteratively();
});

parsegraph_Node_Tests.AddTest("Proportion pull test", function() {
    var atlas = parsegraph_buildGlyphAtlas();
    var car = new parsegraph_Caret(parsegraph_BUD);
    car.setGlyphAtlas(atlas);
    car.node().commitLayoutIteratively();
    var originalRoot = car.node();
    originalRoot._id = "ROOT";
    //car.spawn('b', 'u');
    //car.spawn('f', 'u');

/*    car.spawnMove('d', 'b');
    car.push();
    car.spawnMove('b', 'u');
    car.spawnMove('d', 'u');
    car.spawnMove('d', 's');
    car.label('2');
    car.pop();

    car.push();
    car.spawnMove('f', 'u');
    car.spawnMove('d', 'u');
    car.spawnMove('d', 's');
    car.label('2');
    car.pop();

    car.pull('d');
    */

    car.spawnMove('d', 'b');
    car.node()._id = "CENTER BLOCK";
    car.push();
    car.spawnMove('b', 'u');
    car.node()._id = "DOWN BUD";
    //car.spawnMove('d', 's');
    //car.label('1');
    car.pop();

    //car.push();
    //car.spawnMove('f', 'u');
    //car.spawnMove('d', 's');
    //car.label('1');
    //car.pop();

    //console.log("Proportion test start");
    car.pull('d');

    //car.spawnMove('d', 's');

    try {
        originalRoot.commitLayoutIteratively();
        //console.log("Proportion test SUCCESS");
    }
    finally {
        //console.log("Proportion test finished");
    }
});
