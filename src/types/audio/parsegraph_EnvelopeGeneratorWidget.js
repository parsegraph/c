/* eslint-disable require-jsdoc */

export default function EnvelopeGeneratorWidget(graph) {
  this._graph = graph;
}

EnvelopeGeneratorWidget.prototype.node = function() {
  if (this._containerNode) {
    return this._containerNode;
  }

  this._containerNode = new Node(BLOCK);
  const ga = this._graph.glyphAtlas();

  let prior = this._containerNode;

  // Attack
  const attackBud = prior.spawnNode(DOWNWARD, BUD);
  const attackLabel = attackBud.spawnNode(
      BACKWARD,
      BLOCK,
  );
  attackLabel.setLabel('Attack', ga);
  attackLabel.setScale(0.5);
  let stepSlider = attackBud.spawnNode(FORWARD, SLIDER);
  stepSlider.setScale(0.5);
  this._attackSlider = stepSlider;
  this._attackSlider.setValue(Math.random());
  rootStep = step;
  prior = attackBud;

  // Decay
  const decayBud = prior.spawnNode(DOWNWARD, BUD);
  const decayLabel = decayBud.spawnNode(BACKWARD, BLOCK);
  decayLabel.setLabel('Decay', ga);
  decayLabel.setScale(0.5);
  let stepSlider = decayBud.spawnNode(FORWARD, SLIDER);
  stepSlider.setScale(0.5);
  this._decaySlider = stepSlider;
  this._decaySlider.setValue(Math.random());
  rootStep = step;
  prior = decayBud;

  // Sustain
  const sustainBud = prior.spawnNode(DOWNWARD, BUD);
  const sustainLabel = sustainBud.spawnNode(
      BACKWARD,
      BLOCK,
  );
  sustainLabel.setLabel('Sustain', ga);
  sustainLabel.setScale(0.5);
  const sustainSliders = sustainBud.spawnNode(
      FORWARD,
      BUD,
  );
  sustainSliders.setScale(0.5);
  let stepSlider = sustainSliders.spawnNode(
      FORWARD,
      SLIDER,
  );

  const lenSlider = sustainSliders
      .spawnNode(DOWNWARD, BUD)
      .spawnNode(FORWARD, SLIDER);
  this._sustainLengthSlider = lenSlider;
  this._sustainLengthSlider.setValue(Math.random());

  this._sustainLevelSlider = stepSlider;
  this._sustainLevelSlider.setValue(0.6 + 0.4 * Math.random());
  rootStep = step;
  prior = sustainBud;

  // Release
  const releaseBud = prior.spawnNode(DOWNWARD, BUD);
  const releaseLabel = releaseBud.spawnNode(
      BACKWARD,
      BLOCK,
  );
  releaseLabel.setLabel('Release', ga);
  releaseLabel.setScale(0.5);
  let stepSlider = releaseBud.spawnNode(FORWARD, SLIDER);
  stepSlider.setScale(0.5);
  this._releaseSlider = stepSlider;
  this._releaseSlider.setValue(Math.random());
  rootStep = step;
  prior = releaseBud;

  return this._containerNode;
};

EnvelopeGeneratorWidget.prototype.playNote = function(
    osc,
    gain,
    start,
    end,
) {
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
