function makeDistortionCurve(amount) {
  var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};

function parsegraph_WaveShaperWidget(graph)
{
    this._graph = graph;
    this._active = false;
    this._maxAmount = 100;
    this._oversampling = 'none';
}

parsegraph_WaveShaperWidget.prototype.font = function()
{
    return parsegraph_defaultFont();
};

parsegraph_WaveShaperWidget.prototype.audioNode = function()
{
    if(!this._waveShapeNode) {
        var audio = this._graph.surface().audio();
        this._waveShapeNode = audio.createWaveShaper();
    }
    this._waveShapeNode.oversample = this._oversampling;
    if(this._slider) {
        this._waveShapeNode.curve = makeDistortionCurve(this._slider.value()*this._maxAmount);
    }
    else {
        this._waveShapeNode.curve = null;
    }
    return this._waveShapeNode;
};

parsegraph_WaveShaperWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }
    var car = new parsegraph_Caret(parsegraph_SLOT);
    this._containerNode = car.root();
    car.label("WaveShaper");

    this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    this._onButton = this._containerNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    this._onButton.setLabel("Play", this.font());
    this._onButton.setClickListener(function() {
        this._active = !this._active;
        if(this._active) {
            this._onButton.setLabel("Stop");
            if(this._slider) {
                this._waveShapeNode.curve = makeDistortionCurve(this._slider.value()*this._maxAmount);
            }
            console.log("distortion on");
        }
        else {
            this._onButton.setLabel("Start");
            console.log("distortion off");
            this._waveShapeNode.curve = null;
        }
    }, this);

    var oversample = this._onButton.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
    oversample.setScale(.5);
    car = new parsegraph_Caret(oversample);
    car.label('none');
    car.onClick(function() {
        this._oversampling = 'none';
        if(this._active) {
            this._waveShapeNode.oversample = this._oversampling;
        }
    }, this);
    car.spawnMove('d', 'b');
    car.label('2x');
    car.onClick(function() {
        this._oversampling = '2x';
        if(this._active) {
            this._waveShapeNode.oversample = this._oversampling;
        }
    }, this);
    car.spawnMove('d', 'b');
    car.label('4x');
    car.onClick(function() {
        this._oversampling = '4x';
        if(this._active) {
            this._waveShapeNode.oversample = this._oversampling;
        }
    }, this);

    var slider = this._onButton.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    slider.setValue(.5);
    slider.setChangeListener(function() {
        if(this._active) {
            this._waveShapeNode.curve = makeDistortionCurve(this._slider.value() * this._maxAmount);
        }
    }, this);
    this._slider = slider;

    return this._containerNode;
};
