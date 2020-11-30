/* eslint-disable require-jsdoc */

onOffWidgetCount = 0;
export default function OnOffWidget(graph, sink) {
  this._id = onOffWidgetCount++;
  this._graph = graph;
  this._containerNode = null;
  this._onListener = null;
  this._onListenerThisArg = null;
  this._offListener = null;
  this._offListenerThisArg = null;
  this._isOn = false;
}

OnOffWidget.prototype.turnOff = function() {
  if (!this._isOn) {
    return;
  }
  this._isOn = false;
  if (this._offListener) {
    this._offListener.apply(this._offListenerThisArg);
  }
};

OnOffWidget.prototype.setOnOff = function(
    offListener,
    offListenerThisArg,
) {
  this._offListener = offListener;
  this._offListenerThisArg = offListenerThisArg;
};

OnOffWidget.prototype.turnOn = function() {
  if (this._isOn) {
    return;
  }
  this._isOn = true;
  if (this._onListener) {
    this._onListener.call(this._onListenerThisArg);
  }
};

OnOffWidget.prototype.value = function() {
  return this._isOn;
};

OnOffWidget.prototype.setOnOn = function(
    onListener,
    onListenerThisArg,
) {
  this._onListener = onListener;
  this._onListenerThisArg = onListenerThisArg;
};

OnOffWidget.prototype.node = function() {
  if (!this._containerNode) {
    // Switch case.
    const car = new Caret(SLOT);
    this._containerNode = car.root();
    car.node().setIgnoreMouse(true);
    car.shrink();

    // Off button.
    car.spawnMove('i', 'b', 'v');
    car.label('Off');
    car.onClick(function() {
      this.turnOff();
      return true;
    }, this);
    const blackStyle = copyStyle(SLOT);
    blackStyle.backgroundColor = new Color(0, 0, 0, 1);
    blackStyle.fontColor = new Color(1, 0, 0, 1);
    car.node().setBlockStyle(blackStyle);

    // On button.
    car.spawnMove('f', 'b');
    car.label('On');
    car.onClick(function() {
      this.turnOn();
      return true;
    }, this);
    const whiteStyle = copyStyle(SLOT);
    whiteStyle.borderColor = new Color(0.2, 0.2, 0.2, 1);
    whiteStyle.backgroundColor = new Color(1, 1, 1, 1);
    car.node().setBlockStyle(whiteStyle);
  }
  return this._containerNode;
};
