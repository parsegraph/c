/* eslint-disable require-jsdoc */

export default function createSliderDemo() {
  const caret = new Caret(BLOCK);
  caret.fitExact();
  caret.label('Slider');
  caret.spawnMove('d', 'slider');
  caret.label(3);
  caret.move('u');
  caret.spawnMove('f', 'block');
  caret.label('Scene');
  caret.spawn('d', 'scene');
  return caret.root();
}
