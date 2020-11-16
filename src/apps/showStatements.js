function showStatements() {
  const wordDir = parsegraph_FORWARD;
  const lineDir = parsegraph_DOWNWARD;

  const caret = new parsegraph_Caret(parsegraph_BLOCK);
  caret.fitExact();

  caret.spawn(parsegraph_reverseNodeDirection(lineDir), parsegraph_BUD);
  caret.pull(wordDir);
  caret.push();

  const operator = function(name) {
    caret.spawnMove(wordDir, parsegraph_BUD);
    caret.label(name);
  };

  const statement = function(name) {
    caret.spawnMove(wordDir, parsegraph_BLOCK);
    caret.label(name);
  };

  const nextLine = function() {
    caret.pop();
    caret.spawnMove(lineDir, parsegraph_BUD);
    caret.pull(wordDir);
    caret.push();
  };

  statement('letter');
  operator('=');
  statement('"A"');
  operator('|');
  statement('"B"');

  caret.push();
  caret.align(parsegraph_DOWNWARD, parsegraph_ALIGN_CENTER);

  caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
  caret.label('"A"');
  caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
  caret.label('<=|=>');
  caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
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
