/* eslint-disable require-jsdoc */

flangerWidgetCount = 0;
export default function FlangerWidget(graph) {
  this._id = flangerWidgetCount++;
  this._graph = graph;
  this._containerNode = null;
  this._listeners = [];
  this._maxDelay = 5;
  this._delay = graph.surface().audio().createDelay(this._maxDelay);
  this._gain = graph.surface().audio().createGain();
  this._gain.gain.setValueAtTime(
      this._maxDelay / 2,
      graph.surface().audio().currentTime,
  );
  this._osc.connect(this._gain);
  this._osc = graph.surface().audio().createOscillator();
  this._osc.frequency.setValueAtTime(5, graph.surface().audio().currentTime);
  this._osc.start();
  this._gain.connect(this._delay.delayTime);
}

FlangerWidget.prototype.audioNode = function() {
  return this._delay;
};

FlangerWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }
  const car = new Caret(SLOT);
  this._containerNode = car.root();
  car.label('Flange');
  car.fitExact();

  this._containerNode.setNodeAlignmentMode(
      INWARD,
      ALIGN_VERTICAL,
  );
  const onOff = this._containerNode.spawnNode(
      INWARD,
      BLOCK,
  );
  onOff.setLabel('Play', this._graph.font());
  this._onButton = onOff;

  const slider = onOff.spawnNode(DOWNWARD, SLIDER);
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
