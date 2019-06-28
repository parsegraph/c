function parsegraph_EnvelopeGeneratorWidget(graph)
{
    this._graph = graph;
}

parsegraph_EnvelopeGeneratorWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }

    this._containerNode = new parsegraph_Node(parsegraph_BLOCK);
    var ga = this._graph.glyphAtlas();

    var prior = this._containerNode;

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

    return this._containerNode;
};

parsegraph_EnvelopeGeneratorWidget.prototype.playNote = function(osc, gain, start, end)
{
    var len = end - start;
    osc.frequency.setValueAtTime(16 + 7902 * this._pitchSlider.value(), start);
    //this._lastOsc = osc;
    if(this._onButton.label() == "Off") {
        //console.log("Step is off!");
        gain.gain.setValueAtTime(0, start);
        return;
    }
    var audio = this._seq._graph.surface().audio();
    //gain.gain.setValueAtTime(0, start);
    //gain.gain.linearRampToValueAtTime(1, start + .2);
    //gain.gain.setValueAtTime(1, start + len * .8);
    //gain.gain.linearRampToValueAtTime(0, end);
    //console.log(this._i, start, end);

    var envelopeSize = this._attackSlider.value() + this._decaySlider.value() + this._sustainLengthSlider.value() + this._releaseSlider.value();

    var ae = this._attackSlider.value()/envelopeSize;
    var de = this._decaySlider.value()/envelopeSize;
    var se = this._sustainLengthSlider.value()/envelopeSize;
    var re = this._releaseSlider.value()/envelopeSize;

    gain.gain.linearRampToValueAtTime(1, start + len*ae);
    gain.gain.exponentialRampToValueAtTime(this._sustainLevelSlider.value(), start + len*(ae + de));
    gain.gain.setValueAtTime(this._sustainLevelSlider.value(), start + len*(ae + de + se));
    gain.gain.linearRampToValueAtTime(0, start + len*(ae + de + se + re));
};
