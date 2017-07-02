parsegraph_SynthWidget_COUNT = 0;
function parsegraph_SynthWidget(graph)
{
    this._id = parsegraph_SynthWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._oscType = "sine";
    this._oscDetune = 0;
    this._types = {};
}

parsegraph_SynthWidget.prototype.build = function(audio)
{
    var oscillator = audio.createOscillator();
    oscillator.frequency.value = this._oscFrequency;
    oscillator.type = this._oscType;
    oscillator.detune.value = this._oscDetune;
    return oscillator;
};

parsegraph_SynthWidget.prototype.setOscillatorType = function(oscType)
{
    this._oscType = oscType;
}

parsegraph_SynthWidget.prototype.setOscillatorDetune = function(value)
{
    this._oscDetune = value;
}

parsegraph_SynthWidget.prototype.play = function(freq)
{
    if(!this._keyListener) {
        return;
    }
    this._keyListener.call(this._keyListenerThisArg, freq);
};

parsegraph_SynthWidget.prototype.onPlay = function(keyListener, keyListenerThisArg)
{
    this._keyListener = keyListener;
    this._keyListenerThisArg = keyListenerThisArg;
}

parsegraph_SynthWidget.prototype.refreshTypes = function()
{
    updateUnsel();
    for(var type in this._types) {
        this._types[type].setBlockStyle(this._oscType == type ? sel : unsel);
    }
};

parsegraph_SynthWidget.prototype.node = function()
{
    var FS = 500;
    var MAXFS = 3000;
    if(!this._containerNode) {
        var car = new parsegraph_Caret(parsegraph_BLOCK);
        car.setGlyphAtlas(this._graph.glyphAtlas());
        this._containerNode = car.root();
        car.label("Synthesizer");
        car.fitExact();

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
                return true;
            }, this);
            car.label(oscType);
        }, this);
        this.refreshTypes();
        car.pop();
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

        car.moveToRoot();

        var keyBlock = parsegraph_copyStyle('s');
        //keyBlock.minHeight = keyBlock.minHeight * 10;
        keyBlock.horizontalSeparation = 0;
        keyBlock.verticalSeparation = 0;
        keyBlock.fontSize = parsegraph_FONT_SIZE/3;
        [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87,
        32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74,
        65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47,
        130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94,
        261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88,
        523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77,
        1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53,
        2093.00, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520.00, 3729.31, 3951.07,
        4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040.00, 7458.62, 7902.13
        ].forEach(function(freq, i) {
            var key;
            if(i % 12 == 0) {
                if(i != 0) {
                    car.pop();
                }
                key = car.spawnMove('d', 's');
                if(i == 0) {
                    key.parentNode().setNodeAlignmentMode(parsegraph_DOWNWARD, parsegraph_ALIGN_CENTER);
                }
                car.push();
            }
            else {
                key = car.spawnMove('f', 's');
            }
            car.label(freq);
            key.setBlockStyle(keyBlock);
            key.setClickListener(function() {
                this.play(freq);
            }, this);
        }, this);
        car.pop();
    }
    return this._containerNode;
}

