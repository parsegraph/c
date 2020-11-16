function parsegraph_LinearWidget() {
  this.position = 2;
  this.caret = new parsegraph_Caret(parsegraph_BLOCK);
  this.caret.label('1');
}

parsegraph_LinearWidget.prototype.step = function(steps) {
  // Check if any known prime is a multiple of the current position.
  for (let j = 0; j < steps; ++j) {
    this.caret.spawnMove('f', 'b');
    this.caret.label(this.position);
    this.caret.push();
    for (let i = 0; i < this.position - 1; ++i) {
      this.caret.spawnMove('u', 'b');
    }
    this.caret.label(this.position);
    this.caret.pop();

    // Advance.
    ++this.position;
  }
};

parsegraph_LinearWidget.prototype.root = function() {
  return this.caret.root();
};
