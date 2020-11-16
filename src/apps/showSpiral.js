function showSpiral(COUNT) {
  if (COUNT === undefined) {
    COUNT = 25;
  }

  COUNT = Math.min(100, COUNT);

  // Enter
  let spawnDir = parsegraph_FORWARD;
  const spiralType = parsegraph_BUD;

  const caret = new parsegraph_Caret(spiralType);
  caret.spawnMove(spawnDir, spiralType);

  caret.push();
  for (let i = COUNT; i >= 2; --i) {
    for (let j = 1; j < 2; ++j) {
      caret.spawnMove(spawnDir, spiralType);
    }
    spawnDir = parsegraph_turnLeft(spawnDir);
  }
  caret.pop();

  return caret.root();
}
