function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const nSamples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  let i = 0;
  let x;
  for (; i < nSamples; ++i) {
    x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export default function WaveShaperWidget(graph) {
  this._graph = graph;
  this._active = false;
  this._maxAmount = 100;
  this._oversampling = 'none';
}

WaveShaperWidget.prototype.font = function() {
  return parsegraph_defaultFont();
};

WaveShaperWidget.prototype.audioNode = function() {
  if (!this._waveShapeNode) {
    const audio = this._graph.surface().audio();
    this._waveShapeNode = audio.createWaveShaper();
  }
  this._waveShapeNode.oversample = this._oversampling;
  if (this._slider) {
    this._waveShapeNode.curve = makeDistortionCurve(
        this._slider.value() * this._maxAmount,
    );
  } else {
    this._waveShapeNode.curve = null;
  }
  return this._waveShapeNode;
};

WaveShaperWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }
  let car = new Caret(parsegraph_SLOT);
  this._containerNode = car.root();
  car.label('WaveShaper');

  this._containerNode.setNodeAlignmentMode(
      parsegraph_INWARD,
      parsegraph_ALIGN_VERTICAL,
  );
  this._onButton = this._containerNode.spawnNode(
      parsegraph_INWARD,
      parsegraph_BLOCK,
  );
  this._onButton.setLabel('Play', this.font());
  this._onButton.setClickListener(function() {
    this._active = !this._active;
    if (this._active) {
      this._onButton.setLabel('Stop');
      if (this._slider) {
        this._waveShapeNode.curve = makeDistortionCurve(
            this._slider.value() * this._maxAmount,
        );
      }
      console.log('distortion on');
    } else {
      this._onButton.setLabel('Start');
      console.log('distortion off');
      this._waveShapeNode.curve = null;
    }
  }, this);

  const oversample = this._onButton.spawnNode(
      parsegraph_FORWARD,
      parsegraph_BLOCK,
  );
  oversample.setScale(0.5);
  car = new Caret(oversample);
  car.label('none');
  car.onClick(function() {
    this._oversampling = 'none';
    if (this._active) {
      this._waveShapeNode.oversample = this._oversampling;
    }
  }, this);
  car.spawnMove('d', 'b');
  car.label('2x');
  car.onClick(function() {
    this._oversampling = '2x';
    if (this._active) {
      this._waveShapeNode.oversample = this._oversampling;
    }
  }, this);
  car.spawnMove('d', 'b');
  car.label('4x');
  car.onClick(function() {
    this._oversampling = '4x';
    if (this._active) {
      this._waveShapeNode.oversample = this._oversampling;
    }
  }, this);

  const slider = this._onButton.spawnNode(
      parsegraph_DOWNWARD,
      parsegraph_SLIDER,
  );
  slider.setValue(0.5);
  slider.setChangeListener(function() {
    if (this._active) {
      this._waveShapeNode.curve = makeDistortionCurve(
          this._slider.value() * this._maxAmount,
      );
    }
  }, this);
  this._slider = slider;

  return this._containerNode;
};
