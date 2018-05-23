parsegraph_OscillatorWidget_COUNT = 0;
function parsegraph_OscillatorWidget(graph)
{
    this._id = parsegraph_OscillatorWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._oscType = "sine";
    this._oscFrequency = 440;
    this._oscDetune = 0;
    this._types = {};
}

parsegraph_OscillatorWidget.prototype.build = function(audio)
{
    var oscillator = audio.createOscillator();
    oscillator.frequency.value = this._oscFrequency;
    oscillator.type = this._oscType;
    oscillator.detune.value = this._oscDetune;
    return oscillator;
};

parsegraph_OscillatorWidget.prototype.setOscillatorType = function(oscType)
{
    this._oscType = oscType;
}

parsegraph_OscillatorWidget.prototype.setOscillatorFrequency = function(value)
{
    this._oscFrequency = value;
}

parsegraph_OscillatorWidget.prototype.setOscillatorDetune = function(value)
{
    this._oscDetune = value;
}

parsegraph_OscillatorWidget.prototype.refreshTypes = function()
{
    updateUnsel();
    for(var type in this._types) {
        this._types[type].setBlockStyle(this._oscType == type ? sel : unsel);
    }
};

parsegraph_OscillatorWidget.prototype.node = function()
{
    var FS = 500;
    var MAXFS = 3000;
    if(!this._containerNode) {
        var car = new parsegraph_Caret(parsegraph_BLOCK);
        car.setGlyphAtlas(this._graph.glyphAtlas());
        this._containerNode = car.root();
        car.label("Oscillator");
        //car.fitExact();

        car.spawnMove(parsegraph_INWARD, parsegraph_BUD, parsegraph_ALIGN_VERTICAL);
        car.pull(parsegraph_DOWNWARD);
        car.push();
        car.shrink();
        car.spawnMove(parsegraph_DOWNWARD, parsegraph_SLOT);
        car.label("Type");
        car.push();
        ["sine", "square", "sawtooth", "triangle"].forEach(function(oscType, i) {
            var t = oscType === this._oscType ? 'b' : 's';
            if(i == 0) {
                car.spawnMove('i', t, 'v');
                car.shrink();
            }
            else {
                car.spawnMove('f', t);
            }
            this._types[oscType] = car.node();
            car.onClick(function() {
                this.setOscillatorType(oscType);
                this.refreshTypes();
            }, this);
            car.label(oscType);
        }, this);
        this.refreshTypes();
        car.pop();
        car.pop();

        // Frequency
        car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
        car.push();
        car.pull(parsegraph_DOWNWARD);
        car.spawnMove(parsegraph_DOWNWARD, parsegraph_SLOT);
        car.label("Frequency");
        var fsSlider = car.spawn('i', 'sli', 'v');
        fsSlider.setValue(FS/MAXFS);
        fsSlider.setChangeListener(function() {
            FS = fsSlider.value() * MAXFS;
            if(this._oscFrequency > FS) {
                this.setOscillatorFrequency(FS);
            }
            freqSlider.setValue(FS > 0 ? this._oscFrequency / FS : 0);
        }, this);
        car.pull('d');
        var freqSlider = car.spawnMove(parsegraph_DOWNWARD, parsegraph_SLIDER);
        freqSlider.setValue(this._oscFrequency / FS);
        car.onChange(function() {
            this.setOscillatorFrequency(freqSlider.value() * FS);
            console.log("Frequency=" + this._oscFrequency);
        }, this);
        car.pop();

        // Detune
        car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
        car.spawnMove(parsegraph_DOWNWARD, parsegraph_SLOT);
        car.label("Detune");
        car.push();
        var detuneSlider = car.spawnMove(parsegraph_DOWNWARD, parsegraph_SLIDER);
        car.onChange(function() {
            this.setOscillatorDetune(detuneSlider.value() * 200);
            console.log("Detune: " + this._oscDetune.value);
        }, this);
        car.pop();
    }
    return this._containerNode;
}
