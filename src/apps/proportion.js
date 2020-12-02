/* eslint-disable require-jsdoc */
/*
 * Shows a bunch of branches that demonstrate how buds and blocks align. It's
 * also a good demonstration of what pull does. It's also a good stress test
 * for user input.
 *
 * Presently, COUNT cannot be more than 100. It defaults to 10.
 */
export default function ProportionWidget(maxSize) {
  this.caret = new Caret('b');
  this._maxSize = maxSize || 100;
  this._count = 0;
}

ProportionWidget.prototype.node = function() {
  return this.caret.root();
};

ProportionWidget.prototype.size = function() {
  return this._count;
};

ProportionWidget.prototype.step = function() {
  const caret = this.caret;

  const spawnRow = function(dir) {
    caret.push();
    caret.spawnMove(dir, 'bud');
    for (let j = 0; j < this._maxSize - this._count - 1; ++j) {
      caret.spawnMove('d', 'bud');
      if (j === 0) {
        caret.crease();
      }
    }
    caret.spawnMove('d', 'slot');
    caret.label(this._maxSize - this._count);
    caret.pop();
  };
  spawnRow.call(this, 'b');
  spawnRow.call(this, 'f');

  caret.pull('d');
  caret.spawnMove('d', 'block');

  const commands = ['0 Copy', '1 Cut', '2 Paste', '3 Delete', 'Open', 'New'];

  const commandStyle = copyStyle(BLOCK);
  commandStyle.backgroundColor = new Color(0.4, 1, 0.4, 1);
  commandStyle.borderColor = new Color(0, 0.5, 0, 1);

  const commandItemStyle = copyStyle(BLOCK);
  commandItemStyle.backgroundColor = new Color(1, 0, 0, 1);
  commandItemStyle.borderColor = new Color(0, 0.5, 0, 1);

  // Attach commands for this block.
  caret.onClick(function(viewport) {
    const carousel = viewport.carousel();
    // console.log("OnClick!");
    if (carousel.isCarouselShown() && selectedNode == this) {
      carousel.clearCarousel();
      carousel.hideCarousel();
      carousel.scheduleCarouselRepaint();
      selectedNode = null;
      return;
    }
    selectedNode = this;
    carousel.clearCarousel();

    let i = 0;
    commands.forEach(function(command) {
      const commandCaret = new Caret(BLOCK);

      commandCaret.node().setBlockStyle(commandStyle);
      commandCaret.label(command);
      if (++i == 3) {
        commandCaret.spawnMove('d', 's');
        commandCaret.node().setBlockStyle(commandItemStyle);
        commandCaret.label(command);
        commandCaret.move('u');
      }
      carousel.addToCarousel(
          commandCaret.root(),
          function() {
          // console.log(
          //   "Clicked " + command + commandCaret.root().isSelected());
            carousel.clearCarousel();
            carousel.hideCarousel();
            carousel.scheduleCarouselRepaint();
            selectedNode = null;
          },
          this,
      );
    }, this);

    carousel.showCarousel();
    carousel.setCarouselSize(
        Math.max(selectedNode.size().width(), selectedNode.size().height()),
    );
    carousel.moveCarousel(selectedNode.absoluteX(), selectedNode.absoluteY());
    carousel.scheduleCarouselRepaint();
  });
  ++this._count;
  return this._count < this._maxSize;
};
