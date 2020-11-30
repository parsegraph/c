/* eslint-disable require-jsdoc */

singleOscillatorWidgetCount = 0;

export default function SingleOscillatorWidget(graph) {
  this._id = singleOscillatorWidgetCount++;
  this._graph = graph;
  this._audio = null;
  this._containerNode = null;
  this._osc = null;
  this._gain = null;
  this._sink = null;
  this._minFrequency = 16;
  this._frequencyRange = 2000;
  this._maxTremoloFreq = 40;
  this._maxTremoloRange = 1.5;
  this._maxWarbleFreq = 100;
  this._maxWarbleRange = 2000;
  this._slowestFreq = 1 / 5;
  this._sliderCurve = 2;
}

SingleOscillatorWidget.prototype.node = function() {
  if (!this._containerNode) {
    const car = new Caret(BLOCK);
    car.node().setIgnoreMouse(true);
    this._containerNode = car.root();
    car.label('Single Oscillator');
    car.spawnMove('i', 'u', 'v');

    const offStyle = copyStyle(BUD);
    offStyle.backgroundColor = new Color(0.7, 0.7, 0.7, 1);
    offStyle.borderColor = new Color(0.5, 0.5, 0.5, 1);
    offStyle.minWidth *= 4;
    offStyle.minHeight *= 4;
    offStyle.borderRoundness *= 2.5;
    offStyle.borderThickness *= 2;
    this._offStyle = offStyle;

    const redStyle = copyStyle(BUD);
    redStyle.backgroundColor =new Color(1, 0, 0, 1);
    redStyle.borderColor = new Color(1, 0.5, 0.5, 1);
    redStyle.minWidth *= 4;
    redStyle.minHeight *= 4;
    redStyle.borderRoundness *= 2.5;
    redStyle.borderThickness *= 2;
    this._redStyle = redStyle;
    car.node().setBlockStyle(offStyle);
    car.node().setIgnoreMouse(true);
    this._bulb = car.node();
    car.spawnMove('d', 'u', 'c');
    car.pull('d');

    this._masterSwitch = new OnOffWidget(this._graph);
    car.connect('d', this._masterSwitch.node());
    this._masterSwitch.setOnOn(function() {
      this.play();
      return true;
    }, this);
    this._masterSwitch.setOnOff(function() {
      this.stop();
      return true;
    }, this);

    const whiteStyle = copyStyle(SLOT);
    whiteStyle.borderColor = new Color(0.2, 0.2, 0.2, 1);
    whiteStyle.backgroundColor = new Color(1, 1, 1, 1);
    car.spawnMove('f', 'u');
    car.pull('d');

    car.push();
    car.spawnMove('d', 's');
    car.label('Frequency');
    car.spawnMove('i', 'sli', 'v');
    this._freqSlider = car.node();
    this._freqSlider.setValue(0.05);
    car.onChange(function() {
      if (!this._osc) {
        return;
      }
      this._osc.frequency.exponentialRampToValueAtTime(
          this._minFrequency +
          this._frequencyRange *
            Math.pow(this._freqSlider.value(), this._sliderCurve),
          this._audio.currentTime + 0.1,
      );
    }, this);
    car.pop();
    car.spawnMove('f', 'u');
    car.pull('d');

    car.push();

    this._tremoloSwitch = new OnOffWidget(this._graph);
    car.connect('d', this._tremoloSwitch.node());
    this._tremoloSwitch.setOnOn(this.refresh, this);
    this._tremoloSwitch.setOnOff(this.refresh, this);
    car.move('d');
    car.spawnMove('d', 's');
    car.label('Tremolo');
    car.spawnMove('i', 'sli', 'v');
    this._tremoloSlider = car.node();
    this._tremoloSlider.setValue(0.3);
    car.onChange(function() {
      if (!this._osc || !this._tremoloSlider.value()) {
        return;
      }
      this._tremolo.frequency.setTargetAtTime(
          Math.max(
              this._slowestFreq,
              this._maxTremoloFreq *
            Math.pow(this._tremoloSlider.value(), this._sliderCurve),
          ),
          this._audio.currentTime,
          0.1,
      );
    }, this);
    car.move('o');
    this._tremoloScaleSlider = car.spawnMove('d', 'sli');
    this._tremoloScaleSlider.setValue(1);
    this._tremoloScaleSlider.setChangeListener(this.refresh, this);
    car.pop();
    car.spawnMove('f', 'u');
    car.pull('d');

    car.push();
    this._warbleSwitch = new OnOffWidget(this._graph);
    car.connect('d', this._warbleSwitch.node());
    this._warbleSwitch.setOnOn(this.refresh, this);
    this._warbleSwitch.setOnOff(this.refresh, this);
    car.move('d');
    car.spawnMove('d', 's');
    car.label('Warble');
    car.spawnMove('i', 'sli', 'v');
    this._warbleSlider = car.node();
    this._warbleSlider.setValue(0.3);
    car.onChange(function() {
      if (!this._osc) {
        return;
      }
      this._warble.frequency.setTargetAtTime(
          Math.max(
              this._slowestFreq,
              this._maxWarbleFreq *
            Math.pow(this._warbleSlider.value(), this._sliderCurve),
          ),
          this._audio.currentTime,
          0.1,
      );
    }, this);
    car.move('o');
    this._warbleScaleSlider = car.spawnMove('d', 'sli');
    this._warbleScaleSlider.setValue(1);
    this._warbleScaleSlider.setChangeListener(function() {
      if (!this._osc || !this._warbleSlider.value()) {
        return;
      }
      this._warbleSink.gain.setValueAtTime(
          this._maxWarbleRange *
          Math.pow(this._warbleScaleSlider.value(), this._sliderCurve),
          this._audio.currentTime,
      );
    }, this);
    car.pop();
  }
  return this._containerNode;
};

SingleOscillatorWidget.prototype.refresh = function() {
  if (!this._osc) {
    return;
  }
  this._osc.frequency.setValueAtTime(
      this._minFrequency +
      this._frequencyRange *
        Math.pow(this._freqSlider.value(), this._sliderCurve),
      this._audio.currentTime,
  );
  if (this._tremoloSwitch.value()) {
    this._tremolo.frequency.setValueAtTime(
        this._maxTremoloFreq *
        Math.pow(this._tremoloSlider.value(), this._sliderCurve),
        this._audio.currentTime,
        0.1,
    );
    this._tremoloSink.gain.setValueAtTime(
        this._maxTremoloRange *
        Math.pow(this._tremoloScaleSlider.value(), this._sliderCurve),
        this._audio.currentTime,
    );
    // console.log(this._maxTremoloRange * Math.pow(
    //   this._tremoloScaleSlider.value(), this._sliderCurve));
  } else {
    this._tremolo.frequency.setValueAtTime(0, this._audio.currentTime, 0.1);
    this._tremoloSink.gain.setValueAtTime(0, this._audio.currentTime);
  }
  if (this._warbleSwitch.value()) {
    this._warble.frequency.setValueAtTime(
        this._maxWarbleFreq *
        Math.pow(this._warbleSlider.value(), this._sliderCurve),
        this._audio.currentTime,
        0.1,
    );
    this._warbleSink.gain.setValueAtTime(
        this._maxWarbleRange *
        Math.pow(this._warbleScaleSlider.value(), this._sliderCurve),
        this._audio.currentTime,
    );
  } else {
    this._warble.frequency.setValueAtTime(0, this._audio.currentTime, 0.1);
    this._warbleSink.gain.setValueAtTime(0, this._audio.currentTime, 0.1);
  }
};

SingleOscillatorWidget.prototype.audioOut = function() {
  if (this._osc) {
    return this._osc;
  }
  this._osc = this._audio.createOscillator();
  this._osc.start();
  this._gain = this._audio.createGain();
  this._osc.connect(this._gain);

  this._gain.connect(this._sink);
  this._tremolo = this._audio.createOscillator();
  this._tremolo.start();

  this._tremoloSink = this._audio.createGain();

  this._warble = this._audio.createOscillator();
  this._warble.start();

  this._warbleSink = this._audio.createGain();
  this._warbleSink.gain.setValueAtTime(
      this._maxWarbleRange *
      Math.pow(this._warbleScaleSlider.value(), this._sliderCurve),
      this._audio.currentTime,
  );
  this.stop();

  return this._osc;
};

SingleOscillatorWidget.prototype.play = function() {
  if (!this._audio) {
    this._audio = this._graph.surface().startAudio();
  }
  if (!this._sink) {
    this._sink = this._graph.surface().audio().destination;
  }
  if (!this._osc) {
    // Create the node if needed.
    this.audioOut();
  }
  this._bulb.setBlockStyle(this._redStyle);
  this._graph.scheduleRepaint();

  // this._gain.gain.cancelScheduledValues(this._audio.currentTime);
  this._gain.gain.setTargetAtTime(1, this._audio.currentTime, 0.1);

  // this._loudnessNode = this._audio.createConstantSource();
  // this._loudnessNode.connect(this._gain.gain);

  this._tremolo.connect(this._tremoloSink);
  this._tremoloSink.connect(this._gain.gain);
  this._warble.connect(this._warbleSink);
  this._warbleSink.connect(this._osc.detune);

  this.refresh();
};

SingleOscillatorWidget.prototype.stop = function() {
  if (!this._gain) {
    return;
  }
  this._bulb.setBlockStyle(this._offStyle);
  this._graph.scheduleRepaint();

  // this._gain.gain.cancelScheduledValues(this._audio.currentTime);
  this._gain.gain.setTargetAtTime(0, this._audio.currentTime, 0.1);
  this._osc.frequency.setTargetAtTime(0, this._audio.currentTime, 0.1);
  this._tremolo.frequency.setTargetAtTime(0, this._audio.currentTime, 0.1);
  this._warble.frequency.setTargetAtTime(0, this._audio.currentTime, 0.1);
};
