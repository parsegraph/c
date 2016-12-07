var commands = {};

parsegraph_AllTests = new parsegraph_TestSuite();

// TODO Extract these tests into their respective files.
// TODO Create a file for AllTests.
// TODO Allow tests to be excluded for production uses.
// TODO Consider including files using template toolkit, and not 
// TODO Windows server support
// TODO nginx support
parsegraph_Color_Tests = new parsegraph_TestSuite("parsegraph_Color");
parsegraph_AllTests.addTest(parsegraph_Color_Tests);

parsegraph_Color_Tests.addTest("parsegraph_Color.simplify", function() {
});

parsegraph_Extent_Tests = new parsegraph_TestSuite("parsegraph_Extent");
parsegraph_AllTests.addTest(parsegraph_Extent_Tests);

parsegraph_Extent_Tests.addTest("parsegraph_Extent.simplify", function() {
    var extent = new parsegraph_Extent();
    extent.appendLS(10, 20);
    extent.appendLS(5, 20);
    extent.simplify();
    if(extent.numBounds() !== 1) {
        return "Simplify must merge bounds with equal sizes.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.numBounds", function() {
    var extent = new parsegraph_Extent();
    if(extent.numBounds() !== 0) {
        return "Extent must begin with an empty numBounds.";
    }
    extent.appendLS(1, 15);
    if(extent.numBounds() !== 1) {
        return "Append must only add one bound.";
    }
    extent.appendLS(1, 20);
    extent.appendLS(1, 25);
    if(extent.numBounds() !== 3) {
        return "Append must only add one bound per call.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.separation", function() {
    var forwardExtent = new parsegraph_Extent();
    var backwardExtent = new parsegraph_Extent();

    var testSeparation = function(expected) {
        return forwardExtent.separation(backwardExtent) ==
            backwardExtent.separation(forwardExtent) &&
            forwardExtent.separation(backwardExtent) == expected;
    };

    forwardExtent.appendLS(50, 10);
    backwardExtent.appendLS(50, 10);
    if(!testSeparation(20)) {
        console.log(testSeparation(20));
        console.log(forwardExtent.separation(backwardExtent));
        console.log(backwardExtent.separation(forwardExtent));
        return "For single bounds, separation should be equivalent to the size of the " +
            "forward and backward extents.";
    }

    backwardExtent.appendLS(50, 20);
    forwardExtent.appendLS(50, 20);
    if(!testSeparation(40)) {
        return false;
    }

    backwardExtent.appendLS(50, 20);
    forwardExtent.appendLS(50, 40);
    if(!testSeparation(60)) {
        return false;
    }

    backwardExtent.appendLS(50, 10);
    forwardExtent.appendLS(50, 10);
    if(!testSeparation(60)) {
        return false;
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.Simple combinedExtent", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(50, 25);
    forwardNode.appendLS(12, 6);
    var separation = rootNode.separation(forwardNode);

    var combined = rootNode.combinedExtent(forwardNode, 0, separation);

    var expected = new parsegraph_Extent();
    expected.appendLS(12, separation + 6);
    expected.appendLS(38, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.equals", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(10, 10);
    rootNode.appendLS(10, NaN);
    rootNode.appendLS(10, 15);

    forwardNode.appendLS(10, 10);
    forwardNode.appendLS(10, NaN);
    forwardNode.appendLS(10, 15);

    if(!rootNode.equals(forwardNode)) {
        return "Equals does not handle NaN well.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.combinedExtent with NaN", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();


    rootNode.appendLS(50, 25);

    forwardNode.appendLS(10, NaN);
    forwardNode.setBoundSizeAt(0, NaN);
    if(!isNaN(forwardNode.boundSizeAt(0))) {
        return forwardNode.boundSizeAt(0);
    }
    forwardNode.appendLS(30, 5);


    var separation = rootNode.separation(forwardNode);
    if(separation != 30) {
        return "Separation doesn't even match. Actual=" + separation;
    }

    var combined = rootNode.combinedExtent(forwardNode,
        0,
        separation
    );

    var expected = new parsegraph_Extent();
    expected.appendLS(10, 25);
    expected.appendLS(30, 35);
    expected.appendLS(10, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_Extent_Tests.addTest("parsegraph_Extent.combinedExtent", function(resultDom) {
    var rootNode = new parsegraph_Extent();
    var forwardNode = new parsegraph_Extent();

    rootNode.appendLS(50, 25);
    forwardNode.appendLS(12, 6);
    var separation = rootNode.separation(forwardNode);

    var combined = rootNode.combinedExtent(forwardNode,
        25 - 6,
        separation
    );

    var expected = new parsegraph_Extent();
    expected.appendLS(19, 25);
    expected.appendLS(12, separation + 6);
    expected.appendLS(19, 25);

    if(!expected.equals(combined)) {
        resultDom.appendChild(
            expected.toDom("Expected forward extent")
        );
        resultDom.appendChild(
            combined.toDom("Actual forward extent")
        );
        return "Combining extents does not work.";
    }
});

parsegraph_checkExtentsEqual = function(graph, direction, expected, resultDom)
{
    if(graph.node().extentsAt(direction).equals(expected)) {
        return true;
    }
    if(resultDom) {
        resultDom.appendChild(
            graph._container
        );
        resultDom.appendChild(
            expected.toDom(
                "Expected " + parsegraph_nameNodeDirection(direction) + " extent"
            )
        );
        resultDom.appendChild(
            graph.node().extentsAt(direction).toDom(
                "Actual " + parsegraph_nameNodeDirection(direction) + " extent"
            )
        );
        resultDom.appendChild(document.createTextNode(
            "Extent offset = " + graph.node().extentOffsetAt(direction)
        ));
    }
    return false;
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
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, 'b');
    caret.node().commitLayoutIteratively();

    if(
        caret.node().extentOffsetAt(parsegraph_FORWARD) !=
        caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().verticalPadding
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_FORWARD));
        console.log(caret.node().blockStyle().minHeight / 2);
        console.log(caret.node().blockStyle().verticalPadding);
        return "Forward extent offset for block must use MIN_BLOCK_HEIGHT and BLOCK_VERTICAL_PADDING.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_BACKWARD) !=
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_BACKWARD));
        console.log(parsegraph_MIN_BLOCK_HEIGHT / 2);
        return "Backward extent offset for block must use MIN_BLOCK_HEIGHT and BLOCK_VERTICAL_PADDING.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_UPWARD) !=
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_UPWARD));
        console.log(parsegraph_MIN_BLOCK_WIDTH / 2);
        return "Upward extent offset for block must use MIN_BLOCK_WIDTH and BLOCK_HORIZONTAL_PADDING.";
    }

    if(
        caret.node().extentOffsetAt(parsegraph_DOWNWARD) !=
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING
    ) {
        console.log(caret.node().extentOffsetAt(parsegraph_DOWNWARD));
        console.log(parsegraph_MIN_BLOCK_WIDTH / 2);
        return "Downward extent offset for block must use MIN_BLOCK_WIDTH and BLOCK_HORIZONTAL_PADDING.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with forward bud", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with backward bud", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_RADIUS * 2 +
        2 * parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_HORIZONTAL_PADDING +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with downward bud", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with downward block", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);

    caret.spawn(parsegraph_DOWNWARD, parsegraph_BLOCK);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().verticalSeparation()
        + parsegraph_BUD_VERTICAL_PADDING
        + parsegraph_BUD_RADIUS,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().verticalSeparation()
        + parsegraph_BUD_VERTICAL_PADDING
        + parsegraph_BUD_RADIUS,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Bud with vertical blocks, two deep", function() {
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

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().nodeAt(parsegraph_DOWNWARD).verticalSeparation()
        + parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().verticalSeparation()
        + parsegraph_BUD_VERTICAL_PADDING
        + parsegraph_BUD_RADIUS,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().nodeAt(parsegraph_DOWNWARD).verticalSeparation()
        + parsegraph_BLOCK_VERTICAL_PADDING * 2
        + parsegraph_MIN_BLOCK_HEIGHT
        + caret.node().verticalSeparation()
        + parsegraph_BUD_VERTICAL_PADDING
        + parsegraph_BUD_RADIUS,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with upward bud", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with upward and downward buds", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING +
        caret.node().verticalSeparation() +
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    console.log("Forward extent");
    var forwardExtent = caret.node().extentsAt(parsegraph_FORWARD);
    forwardExtent.forEach(function(length, size, i) {
        console.log(i + ". l=" + length + ", s=" + size);
    });

    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING +
        caret.node().verticalSeparation() +
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    console.log("UPWARDExtent");
    var UPWARDExtent = caret.node().extentsAt(parsegraph_UPWARD);
    UPWARDExtent.forEach(function(length, size, i) {
        console.log(i + ". l=" + length + ", s=" + size);
    });

    diff = expect(
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with forward and backward buds", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);

    var expect = function(expected, actual) {
        var diff = expected - actual;
        if(diff) {
            console.log("expected=" + expected + ", actual=" + actual);
        }
        return diff;
    };

    var diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_RADIUS * 2 +
        2 * parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    console.log("UPWARDExtent");
    var UPWARDExtent = caret.node().extentsAt(parsegraph_UPWARD);
    UPWARDExtent.forEach(function(length, size, i) {
        console.log(i + ". l=" + length + ", s=" + size);
    });

    diff = expect(
        parsegraph_BUD_HORIZONTAL_PADDING +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis Sans Backward T layout", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

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
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Positive Direction Layout", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);

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
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }


    diff = expect(
        parsegraph_MIN_BLOCK_HEIGHT / 2 +
        parsegraph_BLOCK_VERTICAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Negative Direction Layout", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

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
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_RADIUS * 2 +
        2 * parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_HORIZONTAL_PADDING +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis layout", function() {
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_FORWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

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
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_FORWARD)
    );
    if(diff) {
        return "Forward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_RADIUS * 2 +
        2 * parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_HORIZONTAL_PADDING +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Block with shrunk bud", function(resultDom) {
    console.log("parsegraph_Graph - Shrink");
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    caret.shrink();

    var expectedSeparation = parsegraph_MIN_BLOCK_WIDTH / 2
        + parsegraph_BLOCK_HORIZONTAL_PADDING
        + parsegraph_SHRINK_SCALE * graph.node().horizontalSeparation(parsegraph_FORWARD)
        + parsegraph_SHRINK_SCALE * (
            parsegraph_BUD_HORIZONTAL_PADDING
            + parsegraph_BUD_RADIUS
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
        parsegraph_MIN_BLOCK_WIDTH + parsegraph_BLOCK_HORIZONTAL_PADDING * 2,
        parsegraph_BLOCK_VERTICAL_PADDING + parsegraph_MIN_BLOCK_HEIGHT / 2
    );
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE
            * graph.node().horizontalSeparation(parsegraph_FORWARD),
        parsegraph_SHRINK_SCALE * parsegraph_LINE_THICKNESS / 2
    );
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * (
            2 * parsegraph_BUD_HORIZONTAL_PADDING
            + 2 * parsegraph_BUD_RADIUS
        ),
        parsegraph_SHRINK_SCALE * (
            parsegraph_BUD_HORIZONTAL_PADDING
            + parsegraph_BUD_RADIUS
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


    var blockHeight = parsegraph_MIN_BLOCK_HEIGHT
        + parsegraph_BLOCK_VERTICAL_PADDING * 2;

    var budHeight = 2 * parsegraph_BUD_RADIUS
        + parsegraph_BUD_VERTICAL_PADDING * 2;

    var forwardExtent = new parsegraph_Extent();
    forwardExtent.appendLS(
        blockHeight / 2 - parsegraph_SHRINK_SCALE * budHeight / 2,
        parsegraph_MIN_BLOCK_WIDTH / 2 + parsegraph_BLOCK_HORIZONTAL_PADDING
    );
    forwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * budHeight,
        parsegraph_MIN_BLOCK_WIDTH / 2
            + parsegraph_BLOCK_HORIZONTAL_PADDING
            + parsegraph_SHRINK_SCALE * caret.node().horizontalSeparation(parsegraph_FORWARD)
            + parsegraph_SHRINK_SCALE * budHeight
    );
    forwardExtent.appendLS(
        blockHeight / 2 - parsegraph_SHRINK_SCALE * budHeight / 2,
        parsegraph_MIN_BLOCK_WIDTH / 2 + parsegraph_BLOCK_HORIZONTAL_PADDING
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
    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BUD);

    caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
    caret.shrink();
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BLOCK);
    caret.move(parsegraph_UPWARD);

    var downwardExtent = new parsegraph_Extent();
    downwardExtent.appendLS(
        parsegraph_SHRINK_SCALE * (parsegraph_MIN_BLOCK_WIDTH + parsegraph_BLOCK_HORIZONTAL_PADDING * 2),
        parsegraph_BUD_VERTICAL_PADDING + parsegraph_BUD_RADIUS
        + parsegraph_SHRINK_SCALE * caret.node().verticalSeparation(parsegraph_DOWNWARD)
        + parsegraph_SHRINK_SCALE * 2 * (parsegraph_BUD_VERTICAL_PADDING + parsegraph_BUD_RADIUS)
        + parsegraph_SHRINK_SCALE * caret.node().nodeAt(parsegraph_DOWNWARD).verticalSeparation(parsegraph_DOWNWARD)
        + parsegraph_SHRINK_SCALE * (parsegraph_MIN_BLOCK_HEIGHT + parsegraph_BLOCK_VERTICAL_PADDING * 2)
    );

    if(!parsegraph_checkExtentsEqual(caret, parsegraph_DOWNWARD, downwardExtent, resultDom)) {
        return "Downward extent differs.";
    }
});

parsegraph_Graph_Tests.addTest("parsegraph_Graph - Double Axis Sans Forward T layout", function() {
    console.log("***** Double Axis Sans Forward T layout");

    var graph = new parsegraph_Graph();
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.spawn(parsegraph_BACKWARD, parsegraph_BUD);
    caret.spawn(parsegraph_UPWARD, parsegraph_BUD);
    caret.spawn(parsegraph_DOWNWARD, parsegraph_BUD);

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
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
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
        parsegraph_BUD_VERTICAL_PADDING * 2 +
        parsegraph_BUD_RADIUS * 2 +
        caret.node().verticalSeparation() +
        parsegraph_BLOCK_VERTICAL_PADDING +
        parsegraph_MIN_BLOCK_HEIGHT / 2,
        caret.node().extentOffsetAt(parsegraph_BACKWARD)
    );
    if(diff) {
        return "Backward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_RADIUS * 2 +
        2 * parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_MIN_BLOCK_WIDTH / 2 +
        parsegraph_BLOCK_HORIZONTAL_PADDING,
        caret.node().extentOffsetAt(parsegraph_UPWARD)
    );
    if(diff) {
        return "Upward extent offset is off by " + diff;
    }

    diff = expect(
        parsegraph_BUD_HORIZONTAL_PADDING +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_RADIUS +
        parsegraph_BUD_HORIZONTAL_PADDING +
        caret.node().horizontalSeparation() +
        parsegraph_BLOCK_HORIZONTAL_PADDING +
        parsegraph_MIN_BLOCK_WIDTH / 2,
        caret.node().extentOffsetAt(parsegraph_DOWNWARD)
    );
    if(diff) {
        return "Downward extent offset is off by " + diff;
    }
});

parsegraph_Browser_Tests = new parsegraph_TestSuite("Browser");
parsegraph_AllTests.addTest(parsegraph_Browser_Tests);

parsegraph_Browser_Tests.addTest("arguments referenced from other closures", function() {

    var foo = function() {
        var args = arguments;
        return function() {
            return args[0];
        };
    }

    var c = foo(1)(2);
    if(c !== 1) {
        return "Closures cannot reference external arguments.";
    }
});

function init()
{
    parsegraph_initialize();

    var main = document.body;

    var result = parsegraph_AllTests.run();
    result.connect(main);
}
