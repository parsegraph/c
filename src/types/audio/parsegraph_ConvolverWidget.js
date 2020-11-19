// https://stackoverflow.com/questions/22525934/connecting-convolvernode-to-an-oscillatornode-with-the-web-audio-the-simple-wa
// eslint-disable-next-line require-jsdoc
export default function impulseResponse(
    audioContext,
    duration,
    decay,
    reverse) {
  const sampleRate = audioContext.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioContext.createBuffer(2, length, sampleRate);
  const impulseL = impulse.getChannelData(0);
  const impulseR = impulse.getChannelData(1);

  if (!decay) decay = 2.0;
  for (let i = 0; i < length; i++) {
    const n = reverse ? length - i : i;
    impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
  }
  return impulse;
}

convolverWidgetCount = 0;
// eslint-disable-next-line require-jsdoc
function ConvolverWidget(graph) {
  this._id = convolverWidgetCount++;
  this._graph = graph;
  this._containerNode = null;

  this._duration = 0.25;
  this._decay = 0.25;

  this._maxDuration = 8;
  this._maxDecay = 8;
  this._reversed = false;

  const audio = graph.surface().audio();
  // this._convolver = audio.createConvolver();
  // this.refresh();
}

ConvolverWidget.prototype.refresh = function() {
  const audio = this._graph.surface().audio();
  if (this._duration == 0 || this._decay == 0) {
    this._convolver.buffer = null;
  } else {
    this._convolver.buffer = impulseResponse(
        audio,
        this._duration,
        this._decay,
        this._reversed,
    );
  }
};

ConvolverWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }
  const car = new Caret(parsegraph_BLOCK);
  this._containerNode = car.root();
  car.label('Convolver');

  car.spawnMove(parsegraph_INWARD, parsegraph_BUD, parsegraph_ALIGN_VERTICAL);
  car.pull(parsegraph_DOWNWARD);
  car.shrink();
  const aSlider = car.spawn(parsegraph_DOWNWARD, parsegraph_SLIDER);
  car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
  car.pull(parsegraph_DOWNWARD);
  car.shrink();
  const bSlider = car.spawn(parsegraph_DOWNWARD, parsegraph_SLIDER);

  aSlider.setValue(this._decay / this._maxDecay);
  aSlider.setChangeListener(function() {
    this._decay = Math.pow(aSlider.value(), 2) * this._maxDecay;
    this.refresh();
  }, this);
  bSlider.setValue(this._duration / this._maxDuration);
  bSlider.setChangeListener(function() {
    this._duration = Math.pow(bSlider.value(), 2) * this._maxDuration;
    this.refresh();
  }, this);

  car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
  car.pull(parsegraph_DOWNWARD);
  car.shrink();
  const reversedButton = car.spawn(parsegraph_DOWNWARD, parsegraph_SLOT);
  reversedButton.setLabel('Reverse', this._graph.font());
  reversedButton.setClickListener(function() {
    this._reversed = !this._reversed;
    this.refresh();
  }, this);

  return this._containerNode;
};
