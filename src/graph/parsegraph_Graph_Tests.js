/* eslint-disable require-jsdoc  */

nodeTests = new TestSuite('Node');

nodeTests.addTest('Node.setClickListener', function() {
  const n = new Node(BLOCK);
  n.setClickListener(function() {});
});

nodeTests.addTest('Node.setKeyListener', function() {
  const n = new Node(BLOCK);
  n.setKeyListener(function() {});
});

viewport_Tests.addTest('Viewport', function() {
  let caret = new Caret(SLOT);
  if (caret.node().type() !== SLOT) {
    return 'Graph must use the provided type for its root.';
  }
  caret = new Caret(BUD);
  if (caret.node().type() !== BUD) {
    return 'Graph must use the provided type for its root.';
  }
});

viewport_Tests.addTest('Viewport.spawn', function() {
  const caret = new Caret('b');
  if (
    caret.has(FORWARD) ||
    caret.has(BACKWARD) ||
    caret.has(UPWARD) ||
    caret.has(DOWNWARD)
  ) {
    return 'Graph roots must begin as leaves.';
  }

  caret.spawn(FORWARD, SLOT);
  if (!caret.has(FORWARD)) {
    return 'Graph must add nodes in the specified direction.';
  }
  if (
    caret.has(DOWNWARD) ||
    caret.has(BACKWARD) ||
    caret.has(UPWARD)
  ) {
    return 'Graph must not add nodes in incorrect directions.';
  }

  caret.erase(FORWARD);
  if (
    caret.has(FORWARD) ||
    caret.has(BACKWARD) ||
    caret.has(UPWARD) ||
    caret.has(DOWNWARD)
  ) {
    return 'Erase must remove the specified node.';
  }
});

viewport_Tests.addTest(
    'Viewport - Trivial layout',
    function() {
    // Spawn the graph.
    // console.log("TRIV");
      const caret = new Caret('b');
      caret.node().commitLayoutIteratively();

      // Run the comparison tests.
      if (
        caret.node().extentOffsetAt(FORWARD) !=
      caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding
      ) {
        console.log(caret.node().extentOffsetAt(FORWARD));
        console.log(caret.node().blockStyle().minHeight / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().verticalPadding);
        console.log(
            caret.node().blockStyle().minHeight / 2 +
          caret.node().blockStyle().borderThickness +
          caret.node().blockStyle().verticalPadding,
        );
        return 'Forward extent offset for block must match.';
      }

      if (
        caret.node().extentOffsetAt(BACKWARD) !=
      caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding
      ) {
        console.log(caret.node().extentOffsetAt(BACKWARD));
        console.log(caret.node().blockStyle().minHeight / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().verticalPadding);
        return 'Backward extent offset for block must match.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
      caret.node().blockStyle().minWidth / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().horizontalPadding
      ) {
        console.log(caret.node().extentOffsetAt(UPWARD));
        console.log(caret.node().blockStyle().minWidth / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().horizontalPadding);
        return 'Upward extent offset for block must match.';
      }

      if (
        caret.node().extentOffsetAt(DOWNWARD) !=
      caret.node().blockStyle().minWidth / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().horizontalPadding
      ) {
        console.log(caret.node().extentOffsetAt(DOWNWARD));
        console.log(caret.node().blockStyle().minWidth / 2);
        console.log(caret.node().blockStyle().borderThickness);
        console.log(caret.node().blockStyle().horizontalPadding);
        return 'Downward extent offset for block must match.';
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with forward bud',
    function() {
    // Spawn the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(FORWARD, BUD);
      caret.node().commitLayoutIteratively();

      // Run the comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          caret.node().blockStyle().minHeight / 2 +
          caret.node().blockStyle().borderThickness +
          caret.node().blockStyle().verticalPadding,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minHeight / 2 +
          style('b').borderThickness +
          style('b').verticalPadding,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
          style('b').borderThickness +
          style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
          style('b').borderThickness +
          style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - PaintGroup sanity',
    function() {
    // Spawn the graph.
      const caret = new Caret(BUD);

      const node = caret.node();
      if (node._paintGroupNext !== node) {
        throw new Error('Node\'s paint group next is not itself');
      }
      const creased = caret.spawnMove(FORWARD, BUD);
      if (creased._paintGroupNext !== creased._paintGroupNext) {
        throw new Error('Child\'s paint group next is not null');
      }
      caret.crease();
      if (creased._paintGroupNext !== node) {
        throw new Error('Child\'s paint group next is not node ');
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with forward creased bud',
    function() {
    // Spawn the graph.
      const caret = new Caret(BUD);
      const creased = caret.spawnMove(FORWARD, BUD);
      caret.crease();
      caret.shrink();
      const grandchild = caret.spawnMove(FORWARD, BUD);
      // caret.spawnMove(FORWARD, BUD);
      caret.moveToRoot();
      if (creased._layoutNext !== grandchild) {
        throw new Error(
            'Creased layout next must be ' +
          grandchild +
          ' but was ' +
          creased._layoutNext,
        );
      }
      if (grandchild._layoutNext !== creased) {
        throw new Error(
            'Grandchilds layout next must be ' +
          creased +
          ' but was ' +
          grandchild._layoutNext,
        );
      }
      if (creased._paintGroupNext !== caret.root()) {
        throw new Error(
            creased +
          '\'s next paint group must be the root but was ' +
          creased._paintGroupNext,
        );
      }
      if (caret.root()._paintGroupNext !== creased) {
        throw new Error(
            caret.root() +
          '\'s next paint group must be ' +
          creased +
          ' but was ' +
          caret.root()._paintGroupNext,
        );
      }
      caret.node().commitLayoutIteratively();
    // console.log("Group X of root: " + caret.node().groupX());
    // console.log("Group X of forward: " +
    //   caret.node().nodeAt(FORWARD).groupX());
    // console.log("Abs X of forward: " +
    //   caret.node().nodeAt(FORWARD).absoluteX());
    // console.log("Abs X of forward forward: " +
    //   caret.node().nodeAt(
    //   FORWARD).nodeAt(FORWARD).absoluteX());
    // console.log("Group X of forward forward: " +
    //   caret.node().nodeAt(
    //   FORWARD).nodeAt(FORWARD).groupX());
    // console.log(caret.node().nodeAt(
    //   DOWNWARD).nodeAt(
    //   FORWARD).nodeAt(
    //   FORWARD).nodeAt(FORWARD).groupX());
    },
);

viewport_Tests.addTest(
    'Viewport - Block with forward creased bud, uncreased',
    function() {
    // Spawn the graph.
      const caret = new Caret(BUD);
      const root = caret.root();
      const creased = caret.spawnMove(FORWARD, BUD);
      caret.crease();
      caret.shrink();
      const grandchild = caret.spawnMove(FORWARD, BUD);
      creased.setPaintGroup(false);
      if (creased._paintGroupPrev !== creased) {
        throw new Error('Creased\'s previous paint group must be reset');
      }
      if (creased._paintGroupNext !== creased) {
        throw new Error('Creased\'s next paint group must be reset');
      }
      if (root._paintGroupNext !== root) {
        throw new Error('Root\'s next paint group must be reset');
      }
      if (root._paintGroupPrev !== root) {
        throw new Error('Root\'s previous paint group must be reset');
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with forward creased bud, removed',
    function() {
    // Spawn the graph.
      const caret = new Caret(BUD);
      const root = caret.root();
      const creased = caret.spawnMove(FORWARD, BUD);
      caret.shrink();
      const grandchild = caret.spawnMove(FORWARD, BUD);
      creased.disconnectNode();
      if (creased._paintGroupPrev !== creased) {
        throw new Error('Creased\'s previous paint group must be reset');
      }
      if (creased._paintGroupNext !== creased) {
        throw new Error('Creased\'s next paint group must be reset');
      }
      if (root._paintGroupNext !== root) {
        throw new Error('Root\'s next paint group must be reset');
      }
      if (root._paintGroupPrev !== root) {
        throw new Error('Root\'s previous paint group must be reset');
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with backward bud',
    function() {
    // Spawn the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(BACKWARD, BUD);
      caret.node().commitLayoutIteratively();
      caret.moveToRoot();

      // Run the comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          caret.node().blockStyle().minHeight / 2 +
        caret.node().blockStyle().borderThickness +
        caret.node().blockStyle().verticalPadding,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bud').minWidth +
        style('bud').borderThickness * 2 +
        style('bud').horizontalPadding * 2 +
        caret.node().horizontalSeparation(BACKWARD) +
        style('block').minWidth / 2 +
        style('block').borderThickness +
        style('block').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bud').minWidth +
        style('bud').borderThickness * 2 +
        style('bud').horizontalPadding * 2 +
        caret.node().horizontalSeparation(BACKWARD) +
        style('block').minWidth / 2 +
        style('block').borderThickness +
        style('block').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest('nodeAt returns parent', function() {
  // Build the graph.
  const caret = new Caret(BLOCK);
  caret.spawn(DOWNWARD, BUD);
  caret.move('d');
  if (caret.node().nodeAt(UPWARD) === null) {
    throw new Error('nodeAt must return parent if possible');
  }
  caret.move('u');
  caret.node().commitLayoutIteratively();
  caret.moveToRoot();
});

viewport_Tests.addTest(
    'Multiple crease still creates valid paint group chain',
    function() {
    // console.log("Multiple crease");
      const caret = new Caret(BUD);
      caret.node()._id = 'Multiple crease root';
      const first = caret.spawnMove(DOWNWARD, BLOCK);
      first._id = 'first';
      const second = caret.spawnMove(DOWNWARD, BLOCK);
      second._id = 'second';
      const third = caret.spawnMove(DOWNWARD, BLOCK);
      third._id = 'third';
      const fourth = caret.spawnMove(DOWNWARD, BLOCK);
      fourth._id = 'fourth';
      const fifth = caret.spawnMove(DOWNWARD, BLOCK);
      fifth._id = 'fifth';
      caret.root().commitLayoutIteratively();
      first.setPaintGroup(true);
      third.setPaintGroup(true);
      const pgs = dumpPaintGroups(caret.root());
      if (pgs[0] !== third) {
        console.log(pgs);
        throw new Error(
            'First paint group must be ' + third + ' but was ' + pgs[0],
        );
      }
      if (pgs[1] !== first) {
        console.log(pgs);
        throw new Error(
            'Second paint group must be ' + first + ' but was ' + pgs[1],
        );
      }
      if (pgs[2] !== caret.root()) {
        console.log(pgs);
        throw new Error(
            'Third paint group must be ' + caret.root() + ' but was ' + pgs[2],
        );
      }
    // console.log("Multiple crease DONE");
    },
);

viewport_Tests.addTest('Fancy crease', function() {
  // Build the graph.
  const caret = new Caret(BLOCK);
  caret.node()._id = 'root';
  const first = caret.spawnMove(DOWNWARD, BUD);
  first._id = 'first';
  const second = caret.spawnMove(DOWNWARD, BUD);
  caret.push();
  second._id = 'second';
  const third = caret.spawnMove(DOWNWARD, BUD);
  third._id = 'third';
  const fourth = caret.spawnMove(DOWNWARD, BUD);
  fourth._id = 'fourth';
  caret.pop();
  let n = caret.node();
  while (n) {
    n.setPaintGroup(true);
    n = n.nodeAt(DOWNWARD);
  }
  caret.root().commitLayoutIteratively();
  second.setPaintGroup(false);
  caret.moveToRoot();
  caret.root().commitLayoutIteratively();
  if (caret.root().needsCommit()) {
    throw new Error('Failed to fully commit layout');
  }
  // console.log(dumpPaintGroups(caret.root()));
});

viewport_Tests.addTest(
    'Viewport - Block with downward bud',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(DOWNWARD, BUD);
      caret.node().commitLayoutIteratively();
      caret.moveToRoot();

      // Run the comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('block').verticalPadding +
        style('block').borderThickness +
        style('block').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('block').verticalPadding +
        style('block').borderThickness +
        style('block').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('block').minWidth / 2 +
        style('block').borderThickness +
        style('block').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('block').minWidth / 2 +
        style('block').borderThickness +
        style('block').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Bud with downward block',
    function() {
    // Build the graph.
      const caret = new Caret(BUD);
      caret.spawn(DOWNWARD, BLOCK);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run the comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Bud with vertical blocks, two deep',
    function(dom) {
    // Build the graph.
      const caret = new Caret(BUD);

      const depth = 2;
      caret.push();
      for (let i = 0; i < depth; ++i) {
        caret.spawnMove(UPWARD, BLOCK);
      }
      caret.pop();
      caret.push();
      for (let i = 0; i < depth; ++i) {
        caret.spawnMove(DOWNWARD, BLOCK);
      }
      caret.pop();
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      const computedBlockSize =
        style('b').verticalPadding * 2 +
        style('b').borderThickness * 2 +
        style('b').minHeight +
        caret
            .node()
            .nodeAt(UPWARD)
            .verticalSeparation(UPWARD);

      let diff = expect(
          computedBlockSize * (depth - 1) +
        style('b').verticalPadding * 2 +
        style('b').borderThickness * 2 +
        style('b').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          computedBlockSize * (depth - 1) +
        style('b').verticalPadding * 2 +
        style('b').borderThickness * 2 +
        style('b').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with upward bud',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(UPWARD, BUD);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with upward and downward buds',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);

      caret.spawn(UPWARD, BUD);
      caret.spawn(DOWNWARD, BUD);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding +
        caret.node().verticalSeparation(UPWARD) +
        style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding +
        caret.node().verticalSeparation(UPWARD) +
        style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with forward and backward buds',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(FORWARD, BUD);
      caret.spawn(BACKWARD, BUD);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minWidth +
        style('bu').borderThickness * 2 +
        style('bu').horizontalPadding * 2 +
        caret.node().horizontalSeparation(BACKWARD) +
        style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minWidth +
        style('bu').borderThickness * 2 +
        style('bu').horizontalPadding * 2 +
        caret.node().horizontalSeparation(BACKWARD) +
        style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Double Axis Sans Backward T layout',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(FORWARD, BUD);
      caret.spawn(UPWARD, BUD);
      caret.spawn(DOWNWARD, BUD);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      if (
        caret.node().extentOffsetAt(BACKWARD) !=
        caret.node().extentOffsetAt(FORWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
        caret.node().extentOffsetAt(DOWNWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
          style('b').borderThickness +
          style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Positive Direction Layout',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(UPWARD, BUD);
      caret.spawn(FORWARD, BUD);
      caret.node().commitLayoutIteratively();

      // Run the tests.
      if (
        caret.node().extentOffsetAt(BACKWARD) !=
        caret.node().extentOffsetAt(FORWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
        caret.node().extentOffsetAt(DOWNWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').minHeight +
        style('bu').borderThickness * 2 +
        style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(UPWARD) +
        style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minHeight +
        style('bu').borderThickness * 2 +
        style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(UPWARD) +
        style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Negative Direction Layout',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(BACKWARD, BUD);
      caret.spawn(DOWNWARD, BUD);
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      if (
        caret.node().extentOffsetAt(BACKWARD) !=
        caret.node().extentOffsetAt(FORWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
        caret.node().extentOffsetAt(DOWNWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minWidth +
        2 * style('bu').horizontalPadding +
        2 * style('bu').borderThickness +
        caret.node().horizontalSeparation(DOWNWARD) +
        style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').horizontalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minWidth +
        caret.node().horizontalSeparation(DOWNWARD) +
        style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Double Axis layout',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(BACKWARD, BUD);
      caret.spawn(FORWARD, BUD);
      caret.spawn(UPWARD, BUD);
      caret.spawn(DOWNWARD, BUD);
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      if (
        caret.node().extentOffsetAt(BACKWARD) !=
        caret.node().extentOffsetAt(FORWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
        caret.node().extentOffsetAt(DOWNWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').minHeight +
        style('bu').borderThickness * 2 +
        style('bu').verticalPadding * 2 +
        caret.node().verticalSeparation(UPWARD) +
        style('b').minHeight / 2 +
        style('b').borderThickness +
        style('b').verticalPadding,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(FORWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minWidth +
        2 * style('bu').horizontalPadding +
        2 * style('bu').borderThickness +
        caret.node().horizontalSeparation(BACKWARD) +
        style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').horizontalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minWidth +
        caret.node().horizontalSeparation(FORWARD) +
        style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Block with shrunk bud',
    function(resultDom) {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.fitExact();
      caret.spawnMove(FORWARD, BUD);
      caret.shrink();
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const expectedSeparation =
      style('b').minWidth / 2 +
      style('b').horizontalPadding +
      style('b').borderThickness +
      SHRINK_SCALE * caret.node().horizontalSeparation(FORWARD) +
      SHRINK_SCALE * (style('bu').horizontalPadding +
      style('bu').borderThickness +
      style('bu').minWidth / 2);
      if (caret.node().separationAt(FORWARD) != expectedSeparation) {
        return (
          'Expected forward separation = ' +
          expectedSeparation +
          ', actual = ' +
          caret.node().separationAt(FORWARD)
        );
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      const downwardExtent = new Extent();
      downwardExtent.appendLS(
          style('b').minWidth +
        style('b').borderThickness * 2 +
        style('b').horizontalPadding * 2 +
        SHRINK_SCALE * caret.node().horizontalSeparation(FORWARD),
          style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
      );
      downwardExtent.appendLS(
          SHRINK_SCALE * (2 * style('bu').horizontalPadding +
        2 * style('bu').borderThickness +
        style('bu').minWidth),
          SHRINK_SCALE * (style('bu').horizontalPadding +
        style('bu').borderThickness +
        style('bu').minWidth / 2),
      );

      if (!caret.node().extentsAt(DOWNWARD).equals(downwardExtent)) {
      // graph._nodePainter.enableExtentRendering();
      // resultDom.appendChild(
      // graph._container
      // );
        resultDom.appendChild(downwardExtent.toDom('Expected downward extent'));
        resultDom.appendChild(
            caret
                .node()
                .extentsAt(DOWNWARD)
                .toDom('Actual downward extent'),
        );
        resultDom.appendChild(
            document.createTextNode(
                'Extent offset = ' +
                  caret.node().extentOffsetAt(DOWNWARD),
            ),
        );
        return 'Downward extent differs.';
      }

      const blockHeight =
      style('b').minHeight +
      style('b').borderThickness * 2 +
      style('b').verticalPadding * 2;

      const budHeight =
      style('bu').minHeight +
      style('bu').borderThickness * 2 +
      style('bu').verticalPadding * 2;

      const forwardExtent = new Extent();
      forwardExtent.appendLS(
          blockHeight / 2 - (SHRINK_SCALE * budHeight) / 2,
          style('b').minWidth / 2 +
        style('b').horizontalPadding +
        style('b').borderThickness,
      );
      forwardExtent.appendLS(
          SHRINK_SCALE * budHeight,
          style('b').minWidth / 2 +
        style('b').horizontalPadding +
        style('b').borderThickness +
        SHRINK_SCALE * caret.node().horizontalSeparation(FORWARD) +
        SHRINK_SCALE * budHeight,
      );
      forwardExtent.appendLS(
          blockHeight / 2 - (SHRINK_SCALE * budHeight) / 2,
          style('b').minWidth / 2 +
        style('b').horizontalPadding +
        style('b').borderThickness,
      );

      if (!caret.node().extentsAt(FORWARD).equals(forwardExtent)) {
        graph._nodePainter.enableExtentRendering();
        resultDom.appendChild(graph._container);
        resultDom.appendChild(forwardExtent.toDom('Expected forward extent'));
        resultDom.appendChild(
            caret
                .node()
                .extentsAt(FORWARD)
                .toDom('Actual forward extent'),
        );
        resultDom.appendChild(
            document.createTextNode(
                'Extent offset = ' +
                  caret.node().extentOffsetAt(FORWARD),
            ),
        );
        return 'Forward extent differs.';
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Bud with 2-deep shrunk downward block',
    function(resultDom) {
    // Build the graph.
      const caret = new Caret(BUD);
      caret.fitExact();
      caret.spawnMove(DOWNWARD, BUD);
      caret.shrink();
      caret.spawn(DOWNWARD, BLOCK);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      const downwardExtent = new Extent();
      downwardExtent.appendLS(
          SHRINK_SCALE * (style('b').minWidth +
        style('b').borderThickness * 2 +
        style('b').horizontalPadding * 2),
          style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2 +
        SHRINK_SCALE * caret.node().verticalSeparation(DOWNWARD) +
        SHRINK_SCALE * 2 * (style('bu').verticalPadding +
        style('bu').borderThickness +
        style('bu').minHeight / 2) +
        SHRINK_SCALE *
        caret
            .node()
            .nodeAt(DOWNWARD)
            .verticalSeparation(DOWNWARD) +
            SHRINK_SCALE * (style('b').minHeight +
            style('b').verticalPadding * 2 +
            style('b').borderThickness * 2),
      );

      if (
        !checkExtentsEqual(
            caret,
            DOWNWARD,
            downwardExtent,
            resultDom,
        )
      ) {
      // TODO Insert graph.
        return 'Downward extent differs.';
      }
    },
);

viewport_Tests.addTest(
    'Viewport - Double Axis Sans Forward T layout',
    function() {
    // Build the graph.
      const caret = new Caret(BLOCK);
      caret.spawn(BACKWARD, BUD);
      caret.spawn(UPWARD, BUD);
      caret.spawn(DOWNWARD, BUD);
      caret.moveToRoot();
      caret.node().commitLayoutIteratively();

      // Run comparison tests.
      if (
        caret.node().extentOffsetAt(BACKWARD) !=
        caret.node().extentOffsetAt(FORWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      if (
        caret.node().extentOffsetAt(UPWARD) !=
        caret.node().extentOffsetAt(DOWNWARD)
      ) {
        return 'Graphs symmetric about the root should' +
               ' have symmetric extent offsets.';
      }

      const expect = function(expected, actual) {
        const diff = expected - actual;
        if (diff) {
          console.log('expected=' + expected + ', actual=' + actual);
        }
        return diff;
      };

      let diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(FORWARD),
      );
      if (diff) {
        console.log(
            'Forward extent (offset to center=' +
          caret.node().extentOffsetAt(FORWARD) +
          ')',
        );
        const forwardExtent = caret.node().extentsAt(FORWARD);
        forwardExtent.forEach(function(length, size, i) {
          console.log(i + '. l=' + length + ', s=' + size);
        });

        console.log(
            'UPWARDExtent (offset to center=' +
            caret.node().extentOffsetAt(UPWARD) +
          ')',
        );
        const UPWARDExtent = caret.node().extentsAt(UPWARD);
        UPWARDExtent.forEach(function(length, size, i) {
          console.log(i + '. l=' + length + ', s=' + size);
        });

        return 'Forward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').verticalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minHeight +
        caret.node().verticalSeparation(UPWARD) +
        style('b').verticalPadding +
        style('b').borderThickness +
        style('b').minHeight / 2,
          caret.node().extentOffsetAt(BACKWARD),
      );
      if (diff) {
        return 'Backward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').minWidth +
        2 * style('bu').horizontalPadding +
        2 * style('bu').borderThickness +
        caret.node().horizontalSeparation(BACKWARD) +
        style('b').minWidth / 2 +
        style('b').borderThickness +
        style('b').horizontalPadding,
          caret.node().extentOffsetAt(UPWARD),
      );
      if (diff) {
        return 'Upward extent offset is off by ' + diff;
      }

      diff = expect(
          style('bu').horizontalPadding * 2 +
        style('bu').borderThickness * 2 +
        style('bu').minWidth +
        caret.node().horizontalSeparation(BACKWARD) +
        style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2,
          caret.node().extentOffsetAt(DOWNWARD),
      );
      if (diff) {
        return 'Downward extent offset is off by ' + diff;
      }
    },
);

viewport_Tests.addTest('Creased forward buds', function() {
  // console.log("Creased forward buds");
  const car = new Caret('b');
  const root = car.root();
  root._id = 'root';
  const bnode = car.spawnMove('f', 'u');
  bnode._id = 'bnode';
  car.crease();
  // console.log("root next: " + root._paintGroupNext._id);
  // console.log("bnode next: " + bnode._paintGroupNext._id);
  const cnode = car.spawnMove('f', 'u');
  cnode._id = 'cnode';
  car.crease();
  if (root._layoutNext !== root) {
    console.log('root next: ' + root._paintGroupNext._id);
    console.log('bnode next: ' + bnode._paintGroupNext._id);
    console.log('cnode next: ' + cnode._paintGroupNext._id);
    throw new Error(
        'root\'s next layout node must be itself but was ' + root._layoutNext,
    );
  }
  if (root._paintGroupNext !== cnode) {
    console.log(root);
    console.log(bnode);
    console.log(cnode);
    throw new Error(
        'root\'s next paint group must be cnode but was ' +
          root._paintGroupNext,
    );
  }
  car.root().commitLayoutIteratively();
});

viewport_Tests.addTest(
    'Centrally aligned back-and-forth',
    function() {
      const car = new Caret('b');
      car.spawnMove('d', 'bu');
      car.align('f', 'c');
      car.spawnMove('f', 'bu');
      car.spawnMove('d', 'bu');

      car.root().commitLayoutIteratively();
      const sep = car.root().separationAt(DOWNWARD);

      // console.log("Bud size: " +
      //   (style('bu').horizontalPadding * 2 +
      //   style('bu').borderThickness * 2 +
      //   style('bu').minWidth));
      // console.log("Vertical separation: " +
      //   car.root().verticalSeparation(DOWNWARD));
      // console.log("Block size: " +
      //   (style('b').horizontalPadding * 2 +
      //   style('b').borderThickness * 2 +
      //   style('b').minWidth));
      // console.log(sep);
    /* return sep - (
        (style('b').horizontalPadding +
        style('b').borderThickness +
        style('b').minWidth / 2) +
        car.root().verticalSeparation(DOWNWARD) +
        (style('bu').horizontalPadding +
        style('bu').borderThickness +
        style('bu').minWidth / 2)
    );*/
    },
);

viewport_Tests.addTest('Label test', function() {
  const car = new Caret('b');
  car.label('No time');
  car.root().commitLayoutIteratively();
});

export default function simpleGraph(container, node) {
  if (node.root) {
    node = node.root();
  }
  const graph = new Viewport();
  graph.window().resize(500, 500);
  container.appendChild(graph.window().container());
  graph.plot(node);
  graph.scheduleRepaint();
  const timer = new AnimationTimer();
  timer.setListener(function() {
    node.showInCamera(graph.camera(), true);
    graph.window().paint();
    graph.window().render();
  });
  graph.input().setListener(function() {
    timer.schedule();
  });
  timer.schedule();
}

viewport_Tests.addTest('Intra-group move test', function(out) {
  const car = new Caret('b');

  const bnode = car.spawn('d', 'b');
  car.pull('d');

  const anode = car.spawnMove('f', 'u');
  const mnode = car.spawn('d', 'b');
  car.root().commitLayoutIteratively();
  const ax = anode.groupX();

  const gx = mnode.groupX();

  const ns = copyStyle('b');
  const increase = 100;
  ns.minWidth += increase;
  bnode.setBlockStyle(ns);
  car.root().commitLayoutIteratively();
  if (ax === anode.groupX()) {
    simpleGraph(out, car);
    throw new Error('Bud must move when another node grows in size.');
  }
  if (gx + increase / 2 !== mnode.groupX()) {
    simpleGraph(out, car);
    throw new Error(
        'Node must be moved when another node grows in size. (expected ' +
        (gx + increase / 2) +
        ' versus actual ' +
        mnode.groupX() +
        ')',
    );
  }
});

viewport_Tests.addTest('Absolute position test', function(out) {
  const car = new Caret(BLOCK);
  const bnode = car.spawnMove('f', 'b');
  car.spawnMove('f', 'b');
  car.root().commitLayoutIteratively();
  car.crease();
  // console.log("bnode", bnode.absoluteX(), bnode.absoluteY());
  // console.log("bnode", bnode.groupX(), bnode.groupY(), bnode.groupScale());
  const bstyle = copyStyle('b');
  bstyle.minWidth += 100;
  bnode.setBlockStyle(bstyle);
  car.root().commitLayoutIteratively();
  // console.log("bnode", bnode.groupX(), bnode.groupY(), bnode.groupScale());
  // console.log("bnode", bnode.absoluteX(), bnode.absoluteY());
});

nodeTests.addTest('Node.setLabel', function() {
  const n = new Node(BLOCK);
  const font = defaultFont();
  n.setLabel('No time', font);
});

nodeTests.addTest(
    'Node Morris world threading spawned',
    function() {
      const n = new Node(BLOCK);
      n.spawnNode(FORWARD, BLOCK);
    },
);

export default function makeChild() {
  const car = new Caret(BLOCK);
  car.spawnMove('f', 'b');
  car.spawnMove('i', 'b');
  car.spawnMove('f', 's');
  return car.root();
}

export default function makeChild2() {
  const car = new Caret(SLOT);
  car.spawnMove('i', 'b');
  car.spawnMove('f', 's');
  car.spawnMove('i', 'b');
  car.spawnMove('f', 'b');
  return car.root();
}

nodeTests.addTest('Node lisp test', function(out) {
  const car = new Caret(BUD);
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
  // getLayoutNodes(car.root());
  const window = new Window();
  const world = new World();
  const g = new Viewport(window, world);
  world.plot(car.root());
  g.input().setListener(function() {
    g.window().paint();
    g.window().render();
  });
});

nodeTests.addTest('Node lisp test simplified', function(
    out,
) {
  const root = new Node(BUD);
  root._id = 'root';

  const a = new Node(BLOCK);
  a._id = 'a';
  const b = new Node(BLOCK);
  b._id = 'b';
  const c = new Node(BLOCK);
  c._id = 'c';

  const chi = new Node(BUD);
  chi._id = 'chi';

  chi.connectNode(FORWARD, c);

  a.connectNode(DOWNWARD, chi);
  a.connectNode(FORWARD, b);
  // console.log("LISP TEST");
  // console.log(getLayoutNodes(a));
  root.connectNode(FORWARD, a);

  root.commitLayoutIteratively();
});

nodeTests.addTest(
    'Node layout preference test',
    function(out) {
      const root = new Node(BUD);
      root._id = 'root';

      const a = new Node(BLOCK);
      a._id = 'a';
      const b = new Node(BLOCK);
      b._id = 'b';
      const c = new Node(BLOCK);
      c._id = 'c';

      const chi = new Node(BUD);
      chi._id = 'chi';

      chi.connectNode(FORWARD, c);

      // console.log("cur a",
      //   nameLayoutPreference(a._layoutPreference));
      a.connectNode(DOWNWARD, chi);
      a.connectNode(FORWARD, b);
      root.connectNode(FORWARD, a);
      a.setLayoutPreference(PREFER_PERPENDICULAR_AXIS);

      // console.log("new a",
      //   nameLayoutPreference(a._layoutPreference));
      const r = getLayoutNodes(root)[0];
      if (r !== c) {
        throw new Error('Expected c, got ' + r._id);
      }

      root.commitLayoutIteratively();

      root.disconnectNode(FORWARD);
      if (a._layoutPreference !== PREFER_VERTICAL_AXIS) {
        throw new Error(
            'a layoutPreference was not VERT but ' +
          nameLayoutPreference(a._layoutPreference),
        );
      }
    },
);

nodeTests.addTest(
    'Node Morris world threading connected',
    function() {
      const n = new Node(BLOCK);
      if (n._layoutNext != n) {
        throw new Error('Previous sanity');
      }
      if (n._layoutPrev != n) {
        throw new Error('Next sanity');
      }

      const b = new Node(BLOCK);
      if (b._layoutNext != b) {
        throw new Error('Previous sanity');
      }
      if (b._layoutPrev != b) {
        throw new Error('Next sanity');
      }

      n.connectNode(FORWARD, b);
      if (n._layoutPrev != b) {
        throw new Error('Next connected sanity');
      }
      if (b._layoutPrev != n) {
        return false;
      }
      if (n._layoutNext != b) {
        return false;
      }
      if (b._layoutNext != n) {
        return false;
      }
    },
);

nodeTests.addTest(
    'Node Morris world threading connected with multiple siblings',
    function() {
      const n = new Node(BLOCK);
      n._id = 'n';
      if (n._layoutNext != n) {
        throw new Error('Previous sanity');
      }
      if (n._layoutPrev != n) {
        throw new Error('Next sanity');
      }

      const b = new Node(BLOCK);
      b._id = 'b';
      if (b._layoutNext != b) {
        throw new Error('Previous sanity');
      }
      if (b._layoutPrev != b) {
        throw new Error('Next sanity');
      }

      n.connectNode(FORWARD, b);
      if (n._layoutPrev != b) {
        throw new Error('Next connected sanity');
      }
      if (b._layoutPrev != n) {
        throw new Error('Next connected sanity');
      }
      if (n._layoutNext != b) {
        throw new Error('Next connected sanity');
      }
      if (b._layoutNext != n) {
        throw new Error('Next connected sanity');
      }
      const c = new Node(BLOCK);
      c._id = 'c';
      n.connectNode(BACKWARD, c);

      const nodes = getLayoutNodes(n);
      if (nodes[0] != c) {
        throw new Error('First node is not C');
      }
      if (nodes[1] != b) {
        throw new Error('Second node is not B');
      }
      if (nodes[2] != n) {
        throw new Error('Third node is not n');
      }
    },
);

nodeTests.addTest(
    'Node Morris world threading connected with' +
    ' multiple siblings and disconnected',
    function() {
      const n = new Node(BLOCK);
      n._id = 'n';
      const b = new Node(BLOCK);
      b._id = 'b';

      const inner = b.spawnNode(INWARD, BLOCK);
      inner._id = 'inner';
      if (b._layoutPrev != inner) {
        return 'B layoutBefore isn\'t inner';
      }
      if (inner._layoutPrev != b) {
        return 'Inner layoutBefore isn\'t B';
      }

      n.connectNode(FORWARD, b);
      if (n._layoutPrev != b) {
        throw new Error('Next connected sanity');
      }
      if (b._layoutPrev != inner) {
        throw new Error('N layoutBefore wasn\'t B');
      }
      if (inner._layoutPrev != n) {
        throw new Error('N layoutBefore wasn\'t B');
      }
      if (n._layoutNext != inner) {
        throw new Error('N layoutBefore wasn\'t B');
      }
      if (inner._layoutNext != b) {
        throw new Error('N layoutBefore wasn\'t B');
      }
      if (b._layoutNext != n) {
        throw new Error('N layoutBefore wasn\'t B');
      }
      // console.log("LNS");
      // console.log(getLayoutNodes(n));
      const c = new Node(BLOCK);
      c._id = 'c';
      n.connectNode(BACKWARD, c);
      // console.log("PLNS");
      // console.log(getLayoutNodes(n));

      const nodes = getLayoutNodes(n);
      if (nodes[0] != c) {
        throw new Error('First node is not C');
      }
      if (nodes[1] != inner) {
        throw new Error('Second node is not inner');
      }
      if (nodes[2] != b) {
        throw new Error('Third node is not b');
      }
      if (nodes[3] != n) {
        throw new Error('Third node is not n');
      }
      if (b !== n.disconnectNode(FORWARD)) {
        throw new Error('Not even working properly');
      }
    },
);

nodeTests.addTest(
    'Node Morris world threading connected with' +
    ' multiple siblings and disconnected 2',
    function() {
      const n = new Node(BLOCK);
      n._id = 'n';
      if (n._layoutNext != n) {
        throw new Error('Previous sanity');
      }
      if (n._layoutPrev != n) {
        throw new Error('Next sanity');
      }

      const b = new Node(BLOCK);
      b._id = 'b';
      testLayoutNodes([b]);

      const inner = b.spawnNode(INWARD, BLOCK);
      inner._id = 'inner';
      testLayoutNodes([inner, b]);

      n.connectNode(FORWARD, b);
      testLayoutNodes([inner, b, n]);
      const c = new Node(BLOCK);
      c._id = 'c';
      n.connectNode(BACKWARD, c);
      testLayoutNodes([c, inner, b, n]);
      if (c !== n.disconnectNode(BACKWARD)) {
        throw new Error('Not even working properly');
      }
      testLayoutNodes([c], 'disconnected');
      testLayoutNodes([inner, b, n], 'finished');
    },
);


export default function testLayoutNodes(expected, name) {
  const node = expected[expected.length - 1];
  const nodes = getLayoutNodes(node);
  for (let i = 0; i < expected.length; ++i) {
    if (nodes[i] != expected[i]) {
      // console.log("TESTLAYOUTNODES");
      // console.log(nodes);
      throw new Error(
          (name ? name : '') +
          ' index ' +
          i +
          ': Node ' +
          (expected[i] ? expected[i]._id : 'null') +
          ' expected, not ' +
          (nodes[i] ? nodes[i]._id : 'null'),
      );
    }
  }
}

nodeTests.addTest(
    'Node Morris world threading deeply connected',
    function() {
      const n = new Node(BLOCK);
      n._id = 'n';
      testLayoutNodes([n], 'deeply conn 1');
      const b = n.spawnNode(FORWARD, BUD);
      b._id = 'b';
      testLayoutNodes([b, n], 'deeply conn 2');
      const c = b.spawnNode(DOWNWARD, BLOCK);
      c._id = 'c';
      testLayoutNodes([c, b, n], 'deeply conn 3');
      const d = b.spawnNode(FORWARD, BUD);
      d._id = 'd';
      testLayoutNodes([c, d, b, n], 'deeply conn 4');

      if (n._layoutNext !== c) {
        throw new Error(
            'Previous sanity 1: got ' +
              n._layoutNext._id + ' expected ' + c._id,
        );
      }
      if (d._layoutNext !== b) {
        throw new Error('Previous sanity 2');
      }
      if (c._layoutNext !== d) {
        throw new Error('Previous sanity 3');
      }
      if (b._layoutNext !== n) {
        throw new Error('Previous sanity 4');
      }
    },
);

nodeTests.addTest('Right-to-left test', function() {
  const node = new Node(BUD);
  node.setRightToLeft(true);
});

nodeTests.addTest('Disconnect trivial test', function() {
  const car = new Caret(BUD);
  car.node().commitLayoutIteratively();
  const originalRoot = car.node();
  car.spawnMove('f', 'b');
  car.node().commitLayoutIteratively();
  const newRoot = car.node();
  car.disconnect();
  originalRoot.commitLayoutIteratively();
  newRoot.commitLayoutIteratively();
});

nodeTests.addTest('Disconnect simple test', function() {
  // console.log("DISCONNECT SIMPLE TEST");
  const car = new Caret(BUD);
  car.node().commitLayoutIteratively();
  const originalRoot = car.node();
  const midRoot = car.spawnMove('f', 'b');
  car.spawnMove('f', 'b');
  // *=[]=[] <--newRoot == car
  // ^oldRoot
  car.node().commitLayoutIteratively();
  const newRoot = car.node();
  if (originalRoot._layoutNext != newRoot) {
    console.log('originalRoot', originalRoot);
    console.log('midRoot', midRoot);
    console.log('layoutAfter of originalRoot', originalRoot._layoutNext);
    console.log('newRoot', newRoot);
    throw new Error('Original\'s previous should be newroot');
  }
  // console.log("Doing disconnect");
  car.disconnect();
  newRoot.commitLayoutIteratively();
  if (originalRoot._layoutNext != midRoot) {
    console.log('originalRoot', originalRoot);
    console.log('midRoot', midRoot);
    console.log('layoutAfter of originalRoot', originalRoot._layoutNext);
    console.log('newRoot', newRoot);
    throw new Error('layoutAfter is invalid');
  }
  originalRoot.commitLayoutIteratively();
});

nodeTests.addTest('Disconnect simple test, reversed', function() {
  const car = new Caret(BUD);
  car.node().commitLayoutIteratively();
  const originalRoot = car.node();
  const midRoot = car.spawnMove('f', 'b');
  car.spawnMove('f', 'b');
  car.node().commitLayoutIteratively();
  const newRoot = car.node();
  car.disconnect();
  originalRoot.commitLayoutIteratively();
  newRoot.commitLayoutIteratively();
  if (originalRoot._layoutNext != midRoot) {
    throw new Error('layoutAfter is invalid');
  }
});

nodeTests.addTest(
    'Node Morris world threading connected with crease',
    function() {
      const n = new Node(BLOCK);
      const b = new Node(BLOCK);
      n.connectNode(FORWARD, b);
      b.setPaintGroup(true);
      if (b._layoutNext !== b) {
        throw new Error(
            'Crease must remove that node' +
            ' from its parents layout chain (child)',
        );
      }
      if (n._layoutNext !== n) {
        throw new Error(
            'Crease must remove that node' +
            ' from its parents layout chain (parent)',
        );
      }
    },
);

nodeTests.addTest(
    'Node Morris world threading connected with creased child',
    function() {
      const n = new Node(BLOCK);
      const b = new Node(BLOCK);
      b.setPaintGroup(true);
      n.connectNode(FORWARD, b);
      if (b._layoutNext !== b) {
        throw new Error(
            'Crease must remove that node' +
            ' from its parents layout chain (child)',
        );
      }
      if (n._layoutNext !== n) {
        throw new Error(
            'Crease must remove that node' +
            ' from its parents layout chain (parent)',
        );
      }
    },
);

export default function getLayoutNodes(node) {
  const list = [];
  const orig = node;
  const start = new Date();
  do {
    node = node._layoutNext;
    // console.log(node._id);
    for (let i = 0; i < list.length; ++i) {
      if (list[i] == node) {
        console.log(list);
        throw new Error('Layout list has loop');
      }
    }
    list.push(node);
    if (elapsed(start) > 5000) {
      throw new Error('Infinite loop');
    }
  } while (orig != node);
  return list;
}

nodeTests.addTest('Disconnect complex test', function() {
  const car = new Caret(BUD);
  car.node().commitLayoutIteratively();
  const originalRoot = car.node();
  car.spawnMove('f', 'b');
  car.push();
  // console.log("NODE WITH CHILD", car.node());
  car.spawnMove('d', 'u');
  // console.log("MOST DOWNWARD NODE OF CHILD", car.node());
  car.pop();
  car.spawnMove('f', 'b');
  car.node().commitLayoutIteratively();
  const newRoot = car.node();
  const newLastNode = newRoot.nodeAt(BACKWARD);
  // console.log("Doing complex disc", originalRoot);
  // console.log(getLayoutNodes(originalRoot));
  car.disconnect();
  // console.log("COMPLEX DISCONNECT DONE");
  // console.log(getLayoutNodes(originalRoot));
  // newRoot.commitLayoutIteratively();
  originalRoot.commitLayoutIteratively();
});

nodeTests.addTest('Proportion pull test', function() {
  const font = defaultFont();
  const car = new Caret(BUD);
  car.setFont(font);
  car.node().commitLayoutIteratively();
  const originalRoot = car.node();
  originalRoot._id = 'ROOT';
  // car.spawn('b', 'u');
  // car.spawn('f', 'u');

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
  car.node()._id = 'CENTER BLOCK';
  car.push();
  car.spawnMove('b', 'u');
  car.node()._id = 'DOWN BUD';
  // car.spawnMove('d', 's');
  // car.label('1');
  car.pop();

  // car.push();
  // car.spawnMove('f', 'u');
  // car.spawnMove('d', 's');
  // car.label('1');
  // car.pop();

  // console.log("Proportion test start");
  car.pull('d');

  // car.spawnMove('d', 's');

  try {
    originalRoot.commitLayoutIteratively();
    // console.log("Proportion test SUCCESS");
  } finally {
    // console.log("Proportion test finished");
  }
});
