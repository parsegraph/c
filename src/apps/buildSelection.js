function buildSelection(graph, COUNT) {
  const caret = new parsegraph_Caret(parsegraph_BLOCK);
  caret.push();

  let d = parsegraph_FORWARD;
  for (let i = 0; i < COUNT; ++i) {
    if (i % 3 == 0) {
      caret.spawn(d, parsegraph_BLOCK);
    } else if (i % 2 == 0) {
      caret.spawn(d, parsegraph_SLOT);
    } else {
      caret.spawn(d, parsegraph_BUD);
    }
    caret.label(i);
    if (i % 2 == 0) {
      caret.select();
    }
    caret.move(d);
    caret.shrink();
    d = parsegraph_turnLeft(d);
  }
  caret.pop();

  const addBlock = function() {
    graph.scheduleRepaint();

    caret.moveToRoot();
    let d = parsegraph_FORWARD;
    for (let i = 0; i < COUNT; ++i) {
      if (caret.selected()) {
        caret.deselect();
      } else {
        caret.select();
      }
      caret.move(d);
      d = parsegraph_turnLeft(d);
    }
  };

  var scheduleAddBlock = function() {
    addBlock();
    window.setTimeout(scheduleAddBlock, 1000);
  };
  scheduleAddBlock();

  return caret.root();
}
