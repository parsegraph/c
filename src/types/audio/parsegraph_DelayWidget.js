parsegraph_DelayWidget_COUNT = 0;
function parsegraph_DelayWidget(graph) {
  this._id = parsegraph_DelayWidget_COUNT++;
  this._graph = graph;
  this._containerNode = null;
  this._listeners = [];
  this._maxDelay = 5;
  // this._delay = graph.surface().audio().createDelay(this._maxDelay);
}

parsegraph_DelayWidget.prototype.audioNode = function() {
  return this._delay;
};

parsegraph_DelayWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }
  const car = new parsegraph_Caret(parsegraph_SLOT);
  this._containerNode = car.root();
  car.label('Delay');
  car.fitExact();

  this._containerNode.setNodeAlignmentMode(
      parsegraph_INWARD,
      parsegraph_ALIGN_VERTICAL,
  );
  const onOff = this._containerNode.spawnNode(
      parsegraph_INWARD,
      parsegraph_BLOCK,
  );
  onOff.setLabel('Play', this._graph.font());
  this._onButton = onOff;

  const slider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
  slider.setValue(0.5);
  slider.setChangeListener(function() {
    if (onOff.label() === 'Stop') {
      this._delay.delayTime.value = this._maxDelay * this._slider.value();
    }
  }, this);
  this._slider = slider;

  onOff.setClickListener(function() {
    if (onOff.label() === 'Play') {
      onOff.setLabel('Stop', this._graph.font());
      this._delay.delayTime.value = this._slider.value() * this._maxDelay;
    } else {
      onOff.setLabel('Play', this._graph.font());
      this._delay.delayTime.value = 0;
    }
  }, this);

  return this._containerNode;
};
