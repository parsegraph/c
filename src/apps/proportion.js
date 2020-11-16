/**
 * Shows a bunch of branches that demonstrate how buds and blocks align. It's
 * also a good demonstration of what pull does. It's also a good stress test
 * for user input.
 *
 * Presently, COUNT cannot be more than 100. It defaults to 10.
 */
function parsegraph_ProportionWidget(maxSize) {
  this.caret = new parsegraph_Caret("b");
  this._maxSize = maxSize || 100;
  this._count = 0;
}

parsegraph_ProportionWidget.prototype.node = function () {
  return this.caret.root();
};

parsegraph_ProportionWidget.prototype.size = function () {
  return this._count;
};

parsegraph_ProportionWidget.prototype.step = function () {
  var caret = this.caret;

  var spawnRow = function (dir) {
    caret.push();
    caret.spawnMove(dir, "bud");
    for (var j = 0; j < this._maxSize - this._count - 1; ++j) {
      caret.spawnMove("d", "bud");
      if (j === 0) {
        caret.crease();
      }
    }
    caret.spawnMove("d", "slot");
    caret.label(this._maxSize - this._count);
    caret.pop();
  };
  spawnRow.call(this, "b");
  spawnRow.call(this, "f");

  caret.pull("d");
  caret.spawnMove("d", "block");

  var commands = ["0 Copy", "1 Cut", "2 Paste", "3 Delete", "Open", "New"];

  var commandStyle = parsegraph_copyStyle(parsegraph_BLOCK);
  commandStyle.backgroundColor = new parsegraph_Color(0.4, 1, 0.4, 1);
  commandStyle.borderColor = new parsegraph_Color(0, 0.5, 0, 1);

  var commandItemStyle = parsegraph_copyStyle(parsegraph_BLOCK);
  commandItemStyle.backgroundColor = new parsegraph_Color(1, 0, 0, 1);
  commandItemStyle.borderColor = new parsegraph_Color(0, 0.5, 0, 1);

  // Attach commands for this block.
  caret.onClick(function (viewport) {
    var carousel = viewport.carousel();
    //console.log("OnClick!");
    if (carousel.isCarouselShown() && selectedNode == this) {
      carousel.clearCarousel();
      carousel.hideCarousel();
      carousel.scheduleCarouselRepaint();
      selectedNode = null;
      return;
    }
    selectedNode = this;
    carousel.clearCarousel();

    var i = 0;
    commands.forEach(function (command) {
      var commandCaret = new parsegraph_Caret(parsegraph_BLOCK);

      commandCaret.node().setBlockStyle(commandStyle);
      commandCaret.label(command);
      if (++i == 3) {
        commandCaret.spawnMove("d", "s");
        commandCaret.node().setBlockStyle(commandItemStyle);
        commandCaret.label(command);
        commandCaret.move("u");
      }
      carousel.addToCarousel(
        commandCaret.root(),
        function () {
          //console.log("Clicked " + command + commandCaret.root().isSelected());
          carousel.clearCarousel();
          carousel.hideCarousel();
          carousel.scheduleCarouselRepaint();
          selectedNode = null;
        },
        this
      );
    }, this);

    carousel.showCarousel();
    carousel.setCarouselSize(
      Math.max(selectedNode.size().width(), selectedNode.size().height())
    );
    carousel.moveCarousel(selectedNode.absoluteX(), selectedNode.absoluteY());
    carousel.scheduleCarouselRepaint();
  });
  ++this._count;
  return this._count < this._maxSize;
};
