/* eslint-disable require-jsdoc */

export default function buildSelection(graph, COUNT) {
  const caret = new Caret(BLOCK);
  caret.push();

  let d = FORWARD;
  for (let i = 0; i < COUNT; ++i) {
    if (i % 3 == 0) {
      caret.spawn(d, BLOCK);
    } else if (i % 2 == 0) {
      caret.spawn(d, SLOT);
    } else {
      caret.spawn(d, BUD);
    }
    caret.label(i);
    if (i % 2 == 0) {
      caret.select();
    }
    caret.move(d);
    caret.shrink();
    d = turnLeft(d);
  }
  caret.pop();

  const addBlock = function() {
    graph.scheduleRepaint();

    caret.moveToRoot();
    let d = FORWARD;
    for (let i = 0; i < COUNT; ++i) {
      if (caret.selected()) {
        caret.deselect();
      } else {
        caret.select();
      }
      caret.move(d);
      d = turnLeft(d);
    }
  };

  const scheduleAddBlock = function() {
    addBlock();
    window.setTimeout(scheduleAddBlock, 1000);
  };
  scheduleAddBlock();

  return caret.root();
}
