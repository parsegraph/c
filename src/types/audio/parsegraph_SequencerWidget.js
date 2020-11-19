// eslint-disable-next-line require-jsdoc
export default function SequenceStep(seq, i) {
  this._seq = seq;
  this._i = i;
  this._active = true;
}

SequenceStep.prototype.setFrequency = function(freq) {
  // if(this._lastOsc) {
  // this._lastOsc.frequency.setValueAtTime(
  //   freq, this._lastOsc.context.currentTime);
  // }
  this._pitchSlider.setValue((freq - 16) / 7902);
  this._pitchSlider.layoutWasChanged();
  // console.log(this._i, this._pitchSlider.value());
};

SequenceStep.prototype.setActive = function(isActive) {
  this._active = isActive;
  if (this._active) {
    this._onButton.setLabel('On');
  } else {
    this._onButton.setLabel('Off');
  }
};

SequenceStep.prototype.play = function(osc, gain, start, end) {
  const len = end - start;
  osc.frequency.setValueAtTime(16 + 7902 * this._pitchSlider.value(), start);
  // this._lastOsc = osc;
  if (this._onButton.label() == 'Off') {
    // console.log("Step is off!");
    gain.gain.setValueAtTime(0, start);
    return;
  }
  const audio = this._seq._graph.surface().audio();
  // gain.gain.setValueAtTime(0, start);
  // gain.gain.linearRampToValueAtTime(1, start + .2);
  // gain.gain.setValueAtTime(1, start + len * .8);
  // gain.gain.linearRampToValueAtTime(0, end);
  // console.log(this._i, start, end);

  const envelopeSize =
    this._attackSlider.value() +
    this._decaySlider.value() +
    this._sustainLengthSlider.value() +
    this._releaseSlider.value();

  const ae = this._attackSlider.value() / envelopeSize;
  const de = this._decaySlider.value() / envelopeSize;
  const se = this._sustainLengthSlider.value() / envelopeSize;
  const re = this._releaseSlider.value() / envelopeSize;

  gain.gain.linearRampToValueAtTime(1, start + len * ae);
  gain.gain.exponentialRampToValueAtTime(
      this._sustainLevelSlider.value(),
      start + len * (ae + de),
  );
  gain.gain.setValueAtTime(
      this._sustainLevelSlider.value(),
      start + len * (ae + de + se),
  );
  gain.gain.linearRampToValueAtTime(0, start + len * (ae + de + se + re));
};

SequenceStep.prototype.randomize = function() {
  this.setFrequency(16 + Math.random() * 7902);
  this.setActive(Math.random() > 0.2);
};

SequenceStep.prototype.node = function() {
  if (this._node) {
    return this._node;
  }

  step = new Node(parsegraph_BLOCK);
  this._node = step;
  const b = parsegraph_copyStyle(parsegraph_BLOCK);
  b.backgroundColor = new Color(1, 1, this._i % 2 == 0 ? 1 : 0.8, 1);
  step.setBlockStyle(b);
  step.setLabel(1 + this._i, parsegraph_defaultFont());
  const s = step.spawnNode(parsegraph_INWARD, parsegraph_BUD);
  s.setIgnoreMouse(true);
  s.setScale(0.5);
  step.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);

  const stepOn = s.spawnNode(parsegraph_UPWARD, parsegraph_BLOCK);
  stepOn.setLabel(Math.random() > 0.3 ? 'On' : 'Off', ga);
  stepOn.setClickListener(function() {
    this._active = !this._active;
    if (this._active) {
      stepOn.setLabel('Off', ga);
    } else {
      stepOn.setLabel('On', ga);
    }
  }, this);
  this._onButton = stepOn;

  const stepLabel = s.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
  stepLabel.setLabel('Pitch', ga);
  stepLabel.setScale(0.5);
  let stepSlider = s.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
  stepSlider.setScale(0.5);
  this._pitchSlider = stepSlider;
  this._pitchSlider.setValue(Math.random());
  rootStep = step;

  const ns = s.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  let tn = ns.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
  tn.setLabel('sine', ga);
  tn.setClickListener(function() {
    this._type = 'sine';
  }, this);
  tn.setScale(0.25);
  let tnn = tn.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
  tnn.setLabel('triangle', ga);
  tnn.setClickListener(function() {
    this._type = 'triangle';
  }, this);
  tn = tnn;
  tnn = tn.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
  tnn.setLabel('sawtooth', ga);
  tnn.setClickListener(function() {
    this._type = 'sawtooth';
  }, this);
  tn = tnn;
  tnn = tn.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
  tnn.setLabel('square', ga);
  tnn.setClickListener(function() {
    this._type = 'square';
  }, this);
  tn = tnn;

  const nsl = ns.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
  nsl.setLabel('Type', ga);
  nsl.setScale(0.5);

  let prior = ns;

  // Attack
  const attackBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  const attackLabel = attackBud.spawnNode(
      parsegraph_BACKWARD,
      parsegraph_BLOCK,
  );
  attackLabel.setLabel('Attack', ga);
  attackLabel.setScale(0.5);
  let stepSlider = attackBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
  stepSlider.setScale(0.5);
  this._attackSlider = stepSlider;
  this._attackSlider.setValue(Math.random());
  rootStep = step;
  prior = attackBud;

  // Decay
  const decayBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  const decayLabel = decayBud.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
  decayLabel.setLabel('Decay', ga);
  decayLabel.setScale(0.5);
  let stepSlider = decayBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
  stepSlider.setScale(0.5);
  this._decaySlider = stepSlider;
  this._decaySlider.setValue(Math.random());
  rootStep = step;
  prior = decayBud;

  // Sustain
  const sustainBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  const sustainLabel = sustainBud.spawnNode(
      parsegraph_BACKWARD,
      parsegraph_BLOCK,
  );
  sustainLabel.setLabel('Sustain', ga);
  sustainLabel.setScale(0.5);
  const sustainSliders = sustainBud.spawnNode(
      parsegraph_FORWARD,
      parsegraph_BUD,
  );
  sustainSliders.setScale(0.5);
  let stepSlider = sustainSliders.spawnNode(
      parsegraph_FORWARD,
      parsegraph_SLIDER,
  );

  const lenSlider = sustainSliders
      .spawnNode(parsegraph_DOWNWARD, parsegraph_BUD)
      .spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
  this._sustainLengthSlider = lenSlider;
  this._sustainLengthSlider.setValue(Math.random());

  this._sustainLevelSlider = stepSlider;
  this._sustainLevelSlider.setValue(0.6 + 0.4 * Math.random());
  rootStep = step;
  prior = sustainBud;

  // Release
  const releaseBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  const releaseLabel = releaseBud.spawnNode(
      parsegraph_BACKWARD,
      parsegraph_BLOCK,
  );
  releaseLabel.setLabel('Release', ga);
  releaseLabel.setScale(0.5);
  let stepSlider = releaseBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
  stepSlider.setScale(0.5);
  this._releaseSlider = stepSlider;
  this._releaseSlider.setValue(Math.random());
  rootStep = step;
  prior = releaseBud;

  return this._node;
};

sequencerWidgetCount = 0;
// eslint-disable-next-line require-jsdoc
export default function SequencerWidget(graph) {
  this._id = sequencerWidgetCount++;
  this._graph = graph;
  this._containerNode = null;
  this._steps = [];
  this._listeners = [];
  this._numSteps = 32;
  this._maxBpm = 2000;
  this._bpm = this._maxBpm / 2;
  // var audio = this._graph.surface().audio();
  // this._sink = audio.createGain();
  this._detuneScale = 300;
}

SequencerWidget.prototype.useSynthesizer = function(synth) {
  if (this._synth) {
    this._synth();
    this._synth = null;
  }
  if (!synth) {
    return;
  }
  this._synth = synth.addListener(function(freq) {
    if (!this._recording) {
      return;
    }
    const now = this._graph.surface().audio().currentTime;
    if (this._playing) {
      const t =
        Math.floor((now - this._startTime) / this._beatLength) % this._numSteps;
      const step = this._steps[t];
    } else {
      step = this._steps[this._currentStep];
    }
    if (!step) {
      return;
    }
    step.setActive(true);
    step.setFrequency(freq);
    this._graph.scheduleRepaint();
  }, this);
};

SequencerWidget.prototype.output = function() {
  return this._sink;
};

SequencerWidget.prototype.onPlay = function(
    listener,
    listenerThisArg,
) {
  this._listeners.push([listener, listenerThisArg]);
};

SequencerWidget.prototype.play = function(bpm) {
  const audio = this._graph.surface().audio();
  this._timer = audio.createConstantSource();
  const that = this;
  this._timer.onended = function() {
    that.play(that._maxBpm * that._bpmSlider.value());
  };
  this._timer.start();

  const tg = audio.createGain();
  this._timer.connect(tg);
  tg.gain.value = 0;
  tg.connect(this._sink);

  let now = audio.currentTime;

  if (this._voices) {
    for (const type in this._voices) {
      if (Object.prototype.hasOwnProperty.call(this._voices, type)) {
        const voice = this._voices[type];
        voice.osc.stop();
      }
    }
  }
  this._gain = audio.createGain();
  this._gain.connect(this._sink);

  const sineVoice = {
    osc: audio.createOscillator(),
    gain: audio.createGain(),
  };
  sineVoice.gain.gain.setValueAtTime(0, now);
  sineVoice.osc.start(now);
  sineVoice.osc.connect(sineVoice.gain);
  sineVoice.gain.connect(this._gain);
  sineVoice.osc.detune.setValueAtTime(
      this._detuneScale * (this._detuneSlider.value() - 0.5),
      now,
  );

  const triangleVoice = {
    osc: audio.createOscillator(),
    gain: audio.createGain(),
  };
  triangleVoice.osc.type = 'triangle';
  triangleVoice.osc.connect(triangleVoice.gain);
  triangleVoice.osc.start(now);
  triangleVoice.gain.connect(this._gain);
  triangleVoice.gain.gain.setValueAtTime(0, now);
  triangleVoice.osc.detune.setValueAtTime(
      this._detuneScale * (this._detuneSlider.value() - 0.5),
      now,
  );

  const sawtoothVoice = {
    osc: audio.createOscillator(),
    gain: audio.createGain(),
  };
  sawtoothVoice.osc.type = 'sawtooth';
  sawtoothVoice.osc.connect(sawtoothVoice.gain);
  sawtoothVoice.osc.start(now);
  sawtoothVoice.gain.connect(this._gain);
  sawtoothVoice.gain.gain.setValueAtTime(0, now);
  sawtoothVoice.osc.detune.setValueAtTime(
      this._detuneScale * (this._detuneSlider.value() - 0.5),
      now,
  );

  const squareVoice = {
    osc: audio.createOscillator(),
    gain: audio.createGain(),
  };
  squareVoice.osc.type = 'square';
  squareVoice.osc.connect(squareVoice.gain);
  squareVoice.osc.start(now);
  squareVoice.gain.connect(this._gain);
  squareVoice.gain.gain.setValueAtTime(0, now);
  squareVoice.osc.detune.setValueAtTime(
      this._detuneScale * (this._detuneSlider.value() - 0.5),
      now,
  );

  this._voices = {};
  this._voices['sine'] = sineVoice;
  this._voices['triangle'] = triangleVoice;
  this._voices['sawtooth'] = sawtoothVoice;
  this._voices['square'] = squareVoice;

  this._startTime = now;
  this._beatLength = 60 / bpm;
  for (let i = 0; i < this._steps.length; ++i) {
    const s = this._steps[i];
    const voice = this._voices[s._type];
    if (!voice) {
      console.log('No voice for ' + s._type);
      continue;
    }
    s.play(
        voice.osc,
        voice.gain,
        now + (i * 60) / bpm,
        now + ((i + 1) * 60) / bpm,
    );
    const last = now + ((i + 1) * 60) / bpm;
  }
  this._timer.stop(last);

  this._lastSelected = null;
  this._currentStep = null;
  this._renderTimer = new TimeoutTimer();
  this._renderTimer.setDelay(this._beatLength);
  this._renderTimer.setListener(function() {
    now = this._graph.surface().audio().currentTime;
    const t =
      Math.floor((now - this._startTime) / this._beatLength) % this._numSteps;
    this._currentStep = t;
    s = this._steps[t];
    if (s && t != this._lastSelected) {
      // console.log("Changing step to " + t);
      for (let i = 0; i < this._steps.length; ++i) {
        const s = this._steps[i];
        if (i != t) {
          const b = parsegraph_copyStyle(parsegraph_BLOCK);
          b.backgroundColor = new Color(
              1,
              1,
            i % 2 == 0 ? 1 : 0.8,
            1,
          );
          s._node.setBlockStyle(b);
        } else {
          const b = parsegraph_copyStyle(parsegraph_BLOCK);
          b.backgroundColor = new Color(0.5, 0, 0, 1);
          s._node.setBlockStyle(b);
        }
      }
      this._lastSelected = t;
      this._graph.scheduleRepaint();
    }
    this._renderTimer.schedule();
  }, this);
  // this._renderTimer.schedule();
};

SequencerWidget.prototype.font = function() {
  return parsegraph_defaultFont();
};

SequencerWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }
  const car = new Caret(parsegraph_SLOT);
  this._containerNode = car.root();
  car.label('Sequencer', this.font());
  // car.fitExact();

  this._containerNode.setNodeAlignmentMode(
      parsegraph_INWARD,
      parsegraph_ALIGN_VERTICAL,
  );
  const onOff = this._containerNode.spawnNode(
      parsegraph_INWARD,
      parsegraph_BLOCK,
  );
  onOff.setLabel('Play', this.font());
  this._onButton = onOff;

  this._recordButton = onOff.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
  this._recordButton.setLabel('Record', this.font());

  this._recordButton.setClickListener(function() {
    this._recording = !this._recording;
    if (this._recording) {
      // Now recording
      const b = parsegraph_copyStyle(parsegraph_BLOCK);
      b.backgroundColor = new Color(1, 1, 0, 1);
      this._recordButton.setBlockStyle(b);
      this._recordButton.setLabel('Recording');
    } else {
      const b = parsegraph_copyStyle(parsegraph_BLOCK);
      this._recordButton.setBlockStyle(b);
      this._recordButton.setLabel('Record');
    }
    this._recordButton.layoutWasChanged();
    this._graph.scheduleRepaint();
  }, this);

  const bpmSlider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
  bpmSlider.setValue(0.5);
  bpmSlider.setChangeListener(function() {
    bpmSlider.value();
  }, this);
  this._bpmSlider = bpmSlider;

  this._playing = false;
  onOff.setClickListener(function() {
    this._playing = !this._playing;
    if (this._playing) {
      // onOff.setLabel("Stop", this.font());
      const v = bpmSlider.value();
      const bpm = v * this._maxBpm;
      this.play(bpm);
    } else {
      onOff.setLabel('Play', this.font());
    }
  }, this);

  this._resetButton = this._recordButton.spawnNode(
      parsegraph_FORWARD,
      parsegraph_BLOCK,
  );
  this._resetButton.setLabel('Reset', this.font());
  this._resetButton.setClickListener(function() {
    const newFreq = 440;
    for (let i = 0; i < this._numSteps; ++i) {
      const step = this._steps[i];
      step.setFrequency(newFreq);
      step.setActive(false);
    }
  }, this);

  this._randomizeButton = this._resetButton.spawnNode(
      parsegraph_FORWARD,
      parsegraph_BLOCK,
  );
  this._randomizeButton.setLabel('Randomize', this.font());
  this._randomizeButton.setClickListener(function() {
    for (let i = 0; i < this._numSteps; ++i) {
      const step = this._steps[i];
      step.randomize();
      step.setActive(false);
    }
  }, this);

  this._detuneSlider = this._randomizeButton.spawnNode(
      parsegraph_DOWNWARD,
      parsegraph_SLIDER,
  );
  this._detuneSlider.setValue(0.5);
  this._detuneSlider.setChangeListener(function() {
    for (let i = 0; i < this._voices.length; ++i) {
      const voice = this._voices[i];
      voice.osc.detune.setValueAtTime(
          this._detuneScale * (this._detuneSlider.value() - 0.5),
          voice.osc.context.currentTime,
      );
    }
  }, this);

  const n = car.spawn(
      parsegraph_DOWNWARD,
      parsegraph_BUD,
      parsegraph_ALIGN_CENTER,
  );
  car.pull(parsegraph_DOWNWARD);
  const l = n.spawnNode(parsegraph_BACKWARD, parsegraph_SLOT);
  const y = parsegraph_copyStyle(parsegraph_BLOCK);
  y.backgroundColor = new Color(1, 1, 0, 1);
  l.setBlockStyle(y);
  l.setLabel('Oscillator', this.font());
  let rootStep = n;
  const voices = ['sine', 'sawtooth', 'square', 'triangle'];
  for (let i = 0; i < this._numSteps; ++i) {
    const newStep = new SequenceStep(this, i);
    const v = voices[Math.floor(Math.random() * voices.length)];
    newStep._type = v;
    this._steps.push(newStep);
    rootStep.connectNode(parsegraph_FORWARD, newStep.node());
    rootStep = newStep.node();
    rootStep.setClickListener(
        function() {
          const that = this[0];
          const i = this[1];
          if (that._playing) {
            return true;
          }
          that._currentStep = i;
          return false;
        },
        [this, i],
    );
  }
  let addStep = rootStep.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
  addStep.setLabel('+', this.font());

  let addStep = n.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
  addStep.setLabel('+', this.font());
  return this._containerNode;
};
