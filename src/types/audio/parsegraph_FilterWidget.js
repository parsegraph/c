// eslint-disable-next-line require-jsdoc
export default function FilterWidget(graph) {
  this._graph = graph;

  this._frequency = 440;
  this._q = 0;
  this._gain = 0;
  this._detune = 0;
  this._type = 'peaking';
  this._containerNode = null;
  this._types = {};
}

FilterWidget.prototype.update = function() {
  if (!this._listener) {
    return;
  }
  this._listener.apply(this._listenerThisArg);
};

FilterWidget.prototype.setUpdateListener = function(
    listener,
    listenerThisArg,
) {
  this._listener = listener;
  this._listenerThisArg = listenerThisArg;
};

FilterWidget.prototype.setDetune = function(value) {
  this._detune = value;
  this.update();
};

FilterWidget.prototype.setFrequency = function(value) {
  this._frequency = value;
  this.update();
};

FilterWidget.prototype.setGain = function(value) {
  this._gain = value;
  this.update();
};

FilterWidget.prototype.setQ = function(value) {
  this._q = value;
  this.update();
};

FilterWidget.prototype.build = function(audio) {
  const n = audio.createBiquadFilter();
  this.save(n);
  return n;
};

FilterWidget.prototype.save = function(n) {
  if (!Number.isNaN(this._detune)) {
    n.detune.value = this._detune;
  }
  if (!Number.isNaN(this._q)) {
    n.Q.value = this._q;
  }
  if (!Number.isNaN(this._gain)) {
    n.gain.value = this._gain;
  }
  n.type = this._type;
};

FilterWidget.prototype.load = function(n) {
  this._detune = n.detune.value;
  this._q = n.Q.value;
  this._gain = n.gain.value;
  this._frequency = n.frequency.value;
  this._type = n.type;
  this.refreshTypes();
};

FilterWidget.prototype.refreshTypes = function() {
  updateUnsel();
  for (const type in this._types) {
    if (Object.prototype.hasOwnProperty.call(this._types, type)) {
      const node = this._types[type];
      if (this._type == type) {
        node.setBlockStyle(sel);
      } else {
        node.setBlockStyle(unsel);
      }
    }
  }
};

FilterWidget.prototype.typeNode = function() {
  if (!this._typeNode) {
    const car = new Caret('s');
    this._typeNode = car.root();
    car.label('Type');

    [
      'passthrough',
      'lowpass',
      'highpass',
      'bandpass',
      'lowshelf',
      'highshelf',
      'peaking',
      'notch',
      'allpass',
    ].forEach(function(type, i) {
      if (i == 0) {
        car.spawnMove('i', 's', 'v');
      } else {
        car.spawnMove('f', 's');
      }
      car.label(type);
      car.node().setClickListener(function() {
        this._type = type;
        this.refreshTypes();
        this.update();
        return false;
      }, this);

      this._types[type] = car.node();
    }, this);
    this.refreshTypes();
    this._typeNode = car.root();
  }
  return this._typeNode;
};

FilterWidget.prototype.frequencyNode = function() {
  if (!this._frequencyNode) {
    const car = new Caret('s');
    car.label('Frequency');
    this._frequencyNode = car.root();
    const MAXFS = 20000;
    let FS = 2000;
    const magnitudeSlider = car.spawn('i', 'sli', 'v');
    const valueSlider = car.spawn('d', 'sli');
    magnitudeSlider.setChangeListener(function() {
      FS = magnitudeSlider.value() * MAXFS;
      if (valueSlider.value() > FS) {
        this.setFrequency(FS);
      }
      valueSlider.setValue(this._frequency / FS);
    }, this);
    magnitudeSlider.setValue(FS / MAXFS);
    valueSlider.setValue(this._frequency / FS);
    valueSlider.setChangeListener(function() {
      this.setFrequency(valueSlider.value() * magnitudeSlider.value() * FS);
    }, this);
  }
  return this._frequencyNode;
};

FilterWidget.prototype.qNode = function() {
  if (!this._qNode) {
    const car = new Caret('s');
    car.label('Q');
    this._qNode = car.root();
    const MAXFS = 20000;
    let FS = 2000;
    const magnitudeSlider = car.spawn('i', 'sli', 'v');
    const valueSlider = car.spawn('d', 'sli');
    magnitudeSlider.setChangeListener(function() {
      FS = magnitudeSlider.value() * MAXFS;
      if (valueSlider.value() > FS) {
        this.setQ(FS);
      }
      valueSlider.setValue(this._q / FS);
    }, this);
    magnitudeSlider.setValue(FS / MAXFS);
    valueSlider.setValue(this._q / FS);
    valueSlider.setChangeListener(function() {
      this.setQ(valueSlider.value() * magnitudeSlider.value() * FS);
    }, this);
  }
  return this._qNode;
};

FilterWidget.prototype.gainNode = function() {
  if (!this._gainNode) {
    const car = new Caret('s');
    car.label('Gain');
    this._gainNode = car.root();
    const valueSlider = car.spawn('d', 'sli');
    valueSlider.setValue((this._gain + 40) / 80);
    valueSlider.setChangeListener(function() {
      this.setGain(-40 + 80 * valueSlider.value());
    }, this);
  }
  return this._gainNode;
};

FilterWidget.prototype.detuneNode = function() {
  if (!this._detuneNode) {
    const car = new Caret('s');
    car.label('Detune');
    this._detuneNode = car.root();
    const MAXFS = 20000;
    let FS = 2000;
    const magnitudeSlider = car.spawn('i', 'sli', 'v');
    const valueSlider = car.spawn('d', 'sli');
    magnitudeSlider.setChangeListener(function() {
      FS = magnitudeSlider.value() * MAXFS;
      if (valueSlider.value() > FS) {
        this.setDetune(FS);
      }
      valueSlider.setValue(this._detune / FS);
    }, this);
    magnitudeSlider.setValue(FS / MAXFS);
    valueSlider.setValue(this._detune / FS);
    valueSlider.setChangeListener(function() {
      this.setDetune(valueSlider.value() * magnitudeSlider.value() * FS);
    }, this);
  }
  return this._detuneNode;
};

FilterWidget.prototype.node = function() {
  if (!this._containerNode) {
    const car = new Caret('b');
    this._containerNode = car.root();
    car.label('BiquadFilterNode');

    car.connect('i', this.typeNode());
    car.align('i', 'v');
    car.move('i');
    car
        .spawnMove('d', 'u', 'c')
        .connectNode(parsegraph_DOWNWARD, this.frequencyNode());
    car.pull('d');
    car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.qNode());
    car.pull(parsegraph_DOWNWARD);
    car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.gainNode());
    car.pull(parsegraph_DOWNWARD);
    car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.detuneNode());
  }
  return this._containerNode;
};
