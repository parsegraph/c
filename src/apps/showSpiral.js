/* eslint-disable require-jsdoc */

export default function showSpiral(COUNT) {
  if (COUNT === undefined) {
    COUNT = 25;
  }

  COUNT = Math.min(100, COUNT);

  // Enter
  let spawnDir = FORWARD;
  const spiralType = BUD;

  const caret = new Caret(spiralType);
  caret.spawnMove(spawnDir, spiralType);

  caret.push();
  for (let i = COUNT; i >= 2; --i) {
    for (let j = 1; j < 2; ++j) {
      caret.spawnMove(spawnDir, spiralType);
    }
    spawnDir = turnLeft(spawnDir);
  }
  caret.pop();

  return caret.root();
}
