/* eslint-disable require-jsdoc, max-len */

function showStatements() {
  const wordDir = FORWARD;
  const lineDir = DOWNWARD;

  const caret = new Caret(BLOCK);
  caret.fitExact();

  caret.spawn(reverseNodeDirection(lineDir), BUD);
  caret.pull(wordDir);
  caret.push();

  const operator = function(name) {
    caret.spawnMove(wordDir, BUD);
    caret.label(name);
  };

  const statement = function(name) {
    caret.spawnMove(wordDir, BLOCK);
    caret.label(name);
  };

  const nextLine = function() {
    caret.pop();
    caret.spawnMove(lineDir, BUD);
    caret.pull(wordDir);
    caret.push();
  };

  statement('letter');
  operator('=');
  statement('"A"');
  operator('|');
  statement('"B"');

  caret.push();
  caret.align(DOWNWARD, ALIGN_CENTER);

  caret.spawnMove(DOWNWARD, BLOCK);
  caret.label('"A"');
  caret.spawnMove(FORWARD, BUD);
  caret.label('<=|=>');
  caret.spawnMove(FORWARD, BLOCK);
  caret.label('"B"');
  caret.pop();
  nextLine();

  statement(
      '012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789',
  );
  statement(
      'mainappendChild is the longest statement ever written in Rainback by humans.',
  );
  nextLine();

  statement('main');
  operator('.');
  statement('append');
  statement('graph');
  operator('.');
  statement('_container');
  nextLine();

  return caret.root();
}
