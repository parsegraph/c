function parsegraph_SequenceStep(seq, i)
{

    this._seq = seq;
    this._i = i;
    this._active = true;
}

parsegraph_SequenceStep.prototype.setFrequency = function(freq)
{
    //if(this._lastOsc) {
        //this._lastOsc.frequency.setValueAtTime(freq, this._lastOsc.context.currentTime);
    //}
    this._pitchSlider.setValue((freq - 16)/7902);
    this._pitchSlider.layoutWasChanged();
    //console.log(this._i, this._pitchSlider.value());
};

parsegraph_SequenceStep.prototype.setActive = function(isActive)
{
    this._active = isActive;
    if(this._active) {
        this._onButton.setLabel("On");
    }
    else {
        this._onButton.setLabel("Off");
    }
};

parsegraph_SequenceStep.prototype.randomize = function()
{
    this.setFrequency(16 + Math.random() * 7902);
    this.setActive(Math.random() > .2);
};

parsegraph_SequenceStep.prototype.node = function()
{
    if(this._node) {
        return this._node;
    }

    step = new parsegraph_Node(parsegraph_BLOCK);
    this._node = step;
    var b = parsegraph_copyStyle(parsegraph_BLOCK);
    b.backgroundColor = new parsegraph_Color(1, 1, this._i % 2 == 0 ? 1 : .8, 1);
    step.setBlockStyle(b);

    var ga = this._seq._graph.glyphAtlas();

    step.setLabel((1 + this._i), ga);
    var s = step.spawnNode(parsegraph_INWARD, parsegraph_BUD);
    s.setIgnoreMouse(true);
    s.setScale(.5);
    step.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);

    var stepOn = s.spawnNode(parsegraph_UPWARD, parsegraph_BLOCK);
    stepOn.setLabel(Math.random() > .3 ? "On" : "Off", ga);
    stepOn.setClickListener(function() {
        this._active = !this._active;
        if(this._active) {
            stepOn.setLabel("Off", ga);
        }
        else {
            stepOn.setLabel("On", ga);
        }
    }, this);
    this._onButton = stepOn;

    var stepLabel = s.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    stepLabel.setLabel("Pitch", ga);
    stepLabel.setScale(.5);
    var stepSlider = s.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
    stepSlider.setScale(.5);
    this._pitchSlider = stepSlider;
    this._pitchSlider.setValue(Math.random());
    rootStep = step;

    return this._node;
};

parsegraph_SequencerWidget_COUNT = 0;
function parsegraph_SequencerWidget(graph)
{
    this._id = parsegraph_SequencerWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._steps = [];
    this._listeners = [];
    this._numSteps = 32;
    this._maxBpm = 2000;
    this._bpm = this._maxBpm / 2;
    var audio = this._graph.surface().audio();
    this._sink = audio.createGain();
    this._detuneScale = 300;
};

parsegraph_SequencerWidget.prototype.useSynthesizer = function(synth)
{
    if(this._synth) {
        this._synth();
        this._synth = null;
    }
    if(!synth) {
        return;
    }
    this._synth = synth.addListener(function(freq) {
        if(!this._recording) {
            return;
        }
        var now = this._graph.surface().audio().currentTime;
        if(this._playing) {
            var t = Math.floor((now - this._startTime) / this._beatLength) % this._numSteps;
            var step = this._steps[t];
        }
        else {
            step = this._steps[this._currentStep];
        }
        if(!step) {
            return;
        }
        step.setActive(true);
        step.setFrequency(freq);
        this._graph.scheduleRepaint();
    }, this);
};

parsegraph_SequencerWidget.prototype.output = function()
{
    return this._sink;
};

parsegraph_SequencerWidget.prototype.onPlay = function(listener, listenerThisArg)
{
    this._listeners.push([listener, listenerThisArg]);
};

parsegraph_SequencerWidget.prototype.play = function(bpm)
{
    var audio = this._graph.surface().audio();
    this._timer = audio.createConstantSource();
    var that = this;
    this._timer.onended = function() {
        that.play(that._maxBpm*that._bpmSlider.value());
    };
    this._timer.start();

    var tg = audio.createGain();
    this._timer.connect(tg);
    tg.gain.value = 0;
    tg.connect(this._sink);

    var now = audio.currentTime;

    if(this._voices) {
        for(var type in this._voices) {
            var voice = this._voices[type];
            voice.osc.stop();
        }
    }
    this._gain = audio.createGain();
    this._gain.connect(this._sink);

    var sineVoice = {
        osc:audio.createOscillator(),
        gain:audio.createGain(),
    };
    sineVoice.gain.gain.setValueAtTime(0, now);
    sineVoice.osc.start(now);
    sineVoice.osc.connect(sineVoice.gain);
    sineVoice.gain.connect(this._gain);
    sineVoice.osc.detune.setValueAtTime(this._detuneScale * (this._detuneSlider.value()-0.5), now);

    var triangleVoice = {
        osc:audio.createOscillator(),
        gain:audio.createGain(),
    };
    triangleVoice.osc.type = "triangle";
    triangleVoice.osc.connect(triangleVoice.gain);
    triangleVoice.osc.start(now);
    triangleVoice.gain.connect(this._gain);
    triangleVoice.gain.gain.setValueAtTime(0, now);
    triangleVoice.osc.detune.setValueAtTime(this._detuneScale * (this._detuneSlider.value()-0.5), now);

    var sawtoothVoice = {
        osc:audio.createOscillator(),
        gain:audio.createGain(),
    };
    sawtoothVoice.osc.type = "sawtooth";
    sawtoothVoice.osc.connect(sawtoothVoice.gain);
    sawtoothVoice.osc.start(now);
    sawtoothVoice.gain.connect(this._gain);
    sawtoothVoice.gain.gain.setValueAtTime(0, now);
    sawtoothVoice.osc.detune.setValueAtTime(this._detuneScale * (this._detuneSlider.value()-0.5), now);

    var squareVoice = {
        osc:audio.createOscillator(),
        gain:audio.createGain(),
    };
    squareVoice.osc.type = "square";
    squareVoice.osc.connect(squareVoice.gain);
    squareVoice.osc.start(now);
    squareVoice.gain.connect(this._gain);
    squareVoice.gain.gain.setValueAtTime(0, now);
    squareVoice.osc.detune.setValueAtTime(this._detuneScale * (this._detuneSlider.value()-0.5), now);

    this._voices = {};
    this._voices["sine"] = sineVoice;
    this._voices["triangle"] = triangleVoice;
    this._voices["sawtooth"] = sawtoothVoice;
    this._voices["square"] = squareVoice;

    this._startTime = now;
    this._beatLength = 60 / bpm;
    for(var i = 0; i < this._steps.length; ++i) {
        var s = this._steps[i];
        var voice = this._voices[s._type];
        if(!voice) {
            console.log("No voice for " + s._type);
            continue;
        }
        s.play(voice.osc, voice.gain, now + i * 60 / bpm, now + (i+1) * 60 / bpm);
        var last = now + (i+1) * 60 / bpm;
    }
    this._timer.stop(last);

    this._lastSelected = null;
    this._currentStep = null;
    this._renderTimer = new parsegraph_TimeoutTimer();
    this._renderTimer.setDelay(this._beatLength);
    this._renderTimer.setListener(function() {
        now = this._graph.surface().audio().currentTime;
        var t = Math.floor((now - this._startTime) / this._beatLength) % this._numSteps;
        this._currentStep = t;
        s = this._steps[t];
        if(s && t != this._lastSelected) {
            //console.log("Changing step to " + t);
            for(var i = 0; i < this._steps.length; ++i) {
                var s = this._steps[i];
                if(i != t) {
                    var b = parsegraph_copyStyle(parsegraph_BLOCK);
                    b.backgroundColor = new parsegraph_Color(1, 1, i % 2 == 0 ? 1 : .8, 1);
                    s._node.setBlockStyle(b);
                }
                else {
                    var b = parsegraph_copyStyle(parsegraph_BLOCK);
                    b.backgroundColor = new parsegraph_Color(.5, 0, 0, 1);
                    s._node.setBlockStyle(b);
                }
            }
            this._lastSelected = t;
            this._graph.scheduleRepaint();
        }
        this._renderTimer.schedule();
    }, this);
    //this._renderTimer.schedule();
};

parsegraph_SequencerWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }
    var car = new parsegraph_Caret(parsegraph_SLOT);
    car.setGlyphAtlas(this._graph.glyphAtlas());
    this._containerNode = car.root();
    car.label("Sequencer");
    //car.fitExact();

    this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    var onOff = this._containerNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    onOff.setLabel("Play", this._graph.glyphAtlas());
    this._onButton = onOff;

    this._recordButton = onOff.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
    this._recordButton.setLabel("Record", this._graph.glyphAtlas());

    this._recordButton.setClickListener(function() {
        this._recording = !this._recording;
        if(this._recording) {
            // Now recording
            var b = parsegraph_copyStyle(parsegraph_BLOCK);
            b.backgroundColor = new parsegraph_Color(1, 1, 0, 1);
            this._recordButton.setBlockStyle(b);
            this._recordButton.setLabel("Recording");
        }
        else {
            var b = parsegraph_copyStyle(parsegraph_BLOCK);
            this._recordButton.setBlockStyle(b);
            this._recordButton.setLabel("Record");
        }
        this._recordButton.layoutWasChanged();
        this._graph.scheduleRepaint();
    }, this);

    var bpmSlider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    bpmSlider.setValue(.5);
    bpmSlider.setChangeListener(function() {
        bpmSlider.value();
    }, this);
    this._bpmSlider = bpmSlider;

    this._playing = false;
    onOff.setClickListener(function() {
        this._playing = !this._playing;
        if(this._playing) {
            //onOff.setLabel("Stop", this._graph.glyphAtlas());
            var v = bpmSlider.value();
            var bpm = v * this._maxBpm;
            this.play(bpm);
        }
        else {
            onOff.setLabel("Play", this._graph.glyphAtlas());
        }
    }, this);

    this._resetButton = this._recordButton.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
    this._resetButton.setLabel("Reset", this._graph.glyphAtlas());
    this._resetButton.setClickListener(function() {
        var newFreq = 440;
        for(var i = 0; i < this._numSteps; ++i) {
            var step = this._steps[i];
            step.setFrequency(newFreq);
            step.setActive(false);
        }
    }, this);

    this._randomizeButton = this._resetButton.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
    this._randomizeButton.setLabel("Randomize", this._graph.glyphAtlas());
    this._randomizeButton.setClickListener(function() {
        for(var i = 0; i < this._numSteps; ++i) {
            var step = this._steps[i];
            step.randomize();
            step.setActive(false);
        }
    }, this);

    this._detuneSlider = this._randomizeButton.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    this._detuneSlider.setValue(.5);
    this._detuneSlider.setChangeListener(function() {
        for(var i = 0; i < this._voices.length; ++i) {
            var voice = this._voices[i];
            voice.osc.detune.setValueAtTime(this._detuneScale * (this._detuneSlider.value() - 0.5), voice.osc.context.currentTime);
        }
    }, this);

    var n = car.spawn(parsegraph_DOWNWARD, parsegraph_BUD, parsegraph_ALIGN_CENTER);
    car.pull(parsegraph_DOWNWARD);

    var simpleOsc = new parsegraph_SingleOscillatorWidget(this._graph, this._graph.surface().audio().createGain());
    n.connectNode(parsegraph_BACKWARD, simpleOsc.node());
    var rootStep = n;
    var voices = ["sine", "sawtooth", "square", "triangle"];
    for(var i = 0; i < this._numSteps; ++i) {
        var newStep = new parsegraph_SequenceStep(this, i);
        var v = voices[Math.floor(Math.random() * voices.length)];
        newStep._type = v;
        this._steps.push(newStep);
        rootStep.connectNode(parsegraph_FORWARD, newStep.node());
        rootStep = newStep.node();
        rootStep.setClickListener(function() {
            var that = this[0];
            var i = this[1];
            if(that._playing) {
                return true;
            }
            that._currentStep = i;
            return false;
        }, [this, i]);
    }
    var addStep = rootStep.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    addStep.setLabel("+", this._graph.glyphAtlas());

    var addStep = n.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    addStep.setLabel("+", this._graph.glyphAtlas());
    return this._containerNode;
}
