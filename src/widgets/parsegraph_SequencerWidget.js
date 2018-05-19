function parsegraph_SequenceStep(seq, i)
{
    this._seq = seq;
    this._i = i;
}

parsegraph_SequenceStep.prototype.play = function(osc, gain, start, end)
{
    osc.frequency.setValueAtTime(200 + 2000 * this._pitchSlider.value(), start);
    var len = end - start;
    if(this._onButton.label() == "Off") {
        //gain.gain.setValueAtTime(0, start);
        return;
    }
    var audio = this._seq._graph.surface().audio();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + .2);
    gain.gain.setValueAtTime(1, start + len * .8);
    gain.gain.linearRampToValueAtTime(0, end);
    //console.log(this._i, start, end);
    //gain.gain.linearRampToValueAtTime(1, start + this._attackSlider.value());
    //gain.gain.linearRampToValueAtTime(this._sustainLevelSlider.value(), start + len*this._attackSlider.value() + len*this._decaySlider.value());
    //gain.gain.setValueAtTime(this._sustainLevelSlider.value(), start + len*this._attackSlider.value() + len*this._decaySlider.value() + len*this._sustainLengthSlider.value());
    //gain.gain.linearRampToValueAtTime(0, start + len*this._attackSlider.value() + len*this._decaySlider.value() + len*this._sustainLengthSlider.value() + len*this._decaySlider.value());
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
        if(stepOn.label() == "On") {
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

    this._type = "sine";

    var ns = s.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    var tn = ns.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
    tn.setLabel("sine", ga);
    tn.setClickListener(function() {
        this._type = "sine";
    }, this);
    tn.setScale(.5);

    var tnn = tn.spawnNode(parsegraph_DOWNWARD, parsegraph_BLOCK);
    tnn.setLabel("triangle", ga);
    tnn.setClickListener(function() {
        this._type = "triangle";
    }, this);

    var nsl = ns.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    nsl.setLabel("Type", ga);
    nsl.setScale(.5);

    var prior = ns;

    // Attack
    var attackBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    var attackLabel = attackBud.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    attackLabel.setLabel("Attack", ga);
    attackLabel.setScale(.5);
    var stepSlider = attackBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
    stepSlider.setScale(.5);
    this._attackSlider = stepSlider;
    this._attackSlider.setValue(Math.random());
    rootStep = step;
    prior = attackBud;

    // Decay
    var decayBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    var decayLabel = decayBud.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    decayLabel.setLabel("Decay", ga);
    decayLabel.setScale(.5);
    var stepSlider = decayBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
    stepSlider.setScale(.5);
    this._decaySlider = stepSlider;
    this._decaySlider.setValue(Math.random());
    rootStep = step;
    prior = decayBud;

    // Sustain
    var sustainBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    var sustainLabel = sustainBud.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    sustainLabel.setLabel("Sustain", ga);
    sustainLabel.setScale(.5);
    var sustainSliders = sustainBud.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    sustainSliders.setScale(.5);
    var stepSlider = sustainSliders.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);

    var lenSlider = sustainSliders.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD)
    .spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
    this._sustainLengthSlider = lenSlider;
    this._sustainLengthSlider.setValue(Math.random());

    this._sustainLevelSlider = stepSlider;
    this._sustainLevelSlider.setValue(.6 + .4 * Math.random());
    rootStep = step;
    prior = sustainBud;

    // Release
    var releaseBud = prior.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    var releaseLabel = releaseBud.spawnNode(parsegraph_BACKWARD, parsegraph_BLOCK);
    releaseLabel.setLabel("Release", ga);
    releaseLabel.setScale(.5);
    var stepSlider = releaseBud.spawnNode(parsegraph_FORWARD, parsegraph_SLIDER);
    stepSlider.setScale(.5);
    this._releaseSlider = stepSlider;
    this._releaseSlider.setValue(Math.random());
    rootStep = step;
    prior = releaseBud;

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
    this._maxBpm = 600;
    this._bpm = this._maxBpm / 2;
    var audio = this._graph.surface().audio();
    this._sink = audio.createGain();
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
    this._osc = audio.createOscillator();
    this._gain = audio.createGain();
    this._gain.connect(this._sink);
    this._osc.connect(this._gain);
    this._osc.start();
    this._startTime = audio.currentTime;
    this._beatLength = 60 / bpm;
    for(var i = 0; i < this._steps.length; ++i) {
        var s = this._steps[i];
        s.play(this._osc, this._gain, audio.currentTime + i * 60 / bpm, audio.currentTime + (i+1) * 60 / bpm);
        var last = audio.currentTime + (i+1) * 60 / bpm;
    }
    this._osc.stop(last);
    var that = this;
    this._osc.onended = function() {
        that.play(that._maxBpm*that._bpmSlider.value());
    };

    this._lastSelected = null;
    this._renderTimer = new parsegraph_AnimationTimer();
    this._renderTimer.setListener(function() {
        var t = Math.floor((audio.currentTime - this._startTime) / this._beatLength) % this._numSteps;
        s = this._steps[t];
        if(s && t != this._lastSelected) {
            //console.log(t, this._startTime, this._beatLength, !!s, this._lastSelected);
            if(this._lastSelected != null) {
                s = this._steps[this._lastSelected];
                if(s) {
                    var b = parsegraph_copyStyle(parsegraph_BLOCK);
                    b.backgroundColor = new parsegraph_Color(1, 1, this._lastSelected % 2 == 0 ? 1 : .8, 1);
                    s._node.setBlockStyle(b);
                }
            }
            s = this._steps[t];
            var b = parsegraph_copyStyle(parsegraph_BLOCK);
            b.backgroundColor = new parsegraph_Color(.5, 0, 0, 1);
            s._node.setBlockStyle(b);
            this._lastSelected = t;
            this._graph.scheduleRepaint();
        }
        this._renderTimer.schedule();
    }, this);
    this._renderTimer.schedule();
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
    car.fitExact();

    this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    var onOff = this._containerNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    onOff.setLabel("Play", this._graph.glyphAtlas());
    this._onButton = onOff;

    var bpmSlider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    bpmSlider.setValue(.5);
    bpmSlider.setChangeListener(function() {
        bpmSlider.value();
    }, this);
    this._bpmSlider = bpmSlider;

    onOff.setClickListener(function() {
        if(onOff.label() === "Play") {
            //onOff.setLabel("Stop", this._graph.glyphAtlas());
            var v = bpmSlider.value();
            var bpm = v * this._maxBpm;
            this.play(bpm);
        }
        else {
            onOff.setLabel("Play", this._graph.glyphAtlas());
        }
    }, this);

    var n = car.spawn(parsegraph_DOWNWARD, parsegraph_BUD);
    car.pull(parsegraph_DOWNWARD);
    var l = n.spawnNode(parsegraph_BACKWARD, parsegraph_SLOT);
    var y = parsegraph_copyStyle(parsegraph_BLOCK);
    y.backgroundColor = new parsegraph_Color(1, 1, 0, 1);
    l.setBlockStyle(y);
    l.setLabel("Oscillator", this._graph.glyphAtlas());
    var rootStep = n;
    for(var i = 0; i < this._numSteps; ++i) {
        var newStep = new parsegraph_SequenceStep(this, i);
        this._steps.push(newStep);
        rootStep.connectNode(parsegraph_FORWARD, newStep.node());
        rootStep = newStep.node();
    }
    var addStep = rootStep.spawnNode(parsegraph_FORWARD, parsegraph_BUD);
    addStep.setLabel("+", this._graph.glyphAtlas());

    var addStep = n.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    addStep.setLabel("+", this._graph.glyphAtlas());
    return this._containerNode;
}
