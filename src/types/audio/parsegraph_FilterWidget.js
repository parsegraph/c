function parsegraph_FilterWidget(graph)
{
    this._graph = graph;

    this._frequency = 440;
    this._q = 0;
    this._gain = 0;
    this._detune = 0;
    this._type = "peaking";
    this._containerNode = null;
    this._types = {};
}

parsegraph_FilterWidget.prototype.update = function()
{
    if(!this._listener) {
        return;
    }
    this._listener.apply(this._listenerThisArg);
};

parsegraph_FilterWidget.prototype.setUpdateListener = function(listener, listenerThisArg)
{
    this._listener = listener;
    this._listenerThisArg = listenerThisArg;
};

parsegraph_FilterWidget.prototype.setDetune = function(value)
{
    this._detune = value;
    this.update();
}

parsegraph_FilterWidget.prototype.setFrequency = function(value)
{
    this._frequency = value;
    this.update();
}

parsegraph_FilterWidget.prototype.setGain = function(value)
{
    this._gain = value;
    this.update();
}

parsegraph_FilterWidget.prototype.setQ = function(value)
{
    this._q = value;
    this.update();
}

parsegraph_FilterWidget.prototype.build = function(audio)
{
    var n = audio.createBiquadFilter();
    this.save(n);
    return n;
};

parsegraph_FilterWidget.prototype.save = function(n)
{
    if(!Number.isNaN(this._detune)) {
        n.detune.value = this._detune;
    }
    if(!Number.isNaN(this._q)) {
        n.Q.value = this._q;
    }
    if(!Number.isNaN(this._gain)) {
        n.gain.value = this._gain;
    }
    n.type = this._type;
};

parsegraph_FilterWidget.prototype.load = function(n)
{
    this._detune = n.detune.value;
    this._q = n.Q.value;
    this._gain = n.gain.value;
    this._frequency = n.frequency.value;
    this._type = n.type;
    this.refreshTypes();
}

parsegraph_FilterWidget.prototype.refreshTypes = function()
{
    updateUnsel();
    for(var type in this._types) {
        var node = this._types[type];
        if(this._type == type) {
            node.setBlockStyle(sel);
        } else {
            node.setBlockStyle(unsel);
        }
    }
};

parsegraph_FilterWidget.prototype.typeNode = function()
{
    if(!this._typeNode) {
        var car = new parsegraph_Caret('s');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        this._typeNode = car.root();
        car.label("Type");

        ["passthrough", "lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"].forEach(function(type, i) {
            if(i == 0) {
                car.spawnMove('i', 's', 'v');
            }
            else {
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

parsegraph_FilterWidget.prototype.frequencyNode = function()
{
    if(!this._frequencyNode) {
        var car = new parsegraph_Caret('s');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        car.label('Frequency');
        this._frequencyNode = car.root();
        var MAXFS = 20000;
        var FS = 2000;
        var magnitudeSlider = car.spawn('i', 'sli', 'v');
        var valueSlider = car.spawn('d', 'sli');
        magnitudeSlider.setChangeListener(function() {
            FS = magnitudeSlider.value() * MAXFS;
            if(valueSlider.value() > FS) {
                this.setFrequency(FS);
            }
            valueSlider.setValue(this._frequency / FS);
        }, this);
        magnitudeSlider.setValue(FS / MAXFS);
        valueSlider.setValue(this._frequency / FS);
        valueSlider.setChangeListener(function() {
            this.setFrequency(valueSlider.value() * magnitudeSlider.value()*FS);
        }, this);
    }
    return this._frequencyNode;
}

parsegraph_FilterWidget.prototype.qNode = function()
{
    if(!this._qNode) {
        var car = new parsegraph_Caret('s');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        car.label('Q');
        this._qNode = car.root();
        var MAXFS = 20000;
        var FS = 2000;
        var magnitudeSlider = car.spawn('i', 'sli', 'v');
        var valueSlider = car.spawn('d', 'sli');
        magnitudeSlider.setChangeListener(function() {
            FS = magnitudeSlider.value() * MAXFS;
            if(valueSlider.value() > FS) {
                this.setQ(FS);
            }
            valueSlider.setValue(this._q / FS);
        }, this);
        magnitudeSlider.setValue(FS / MAXFS);
        valueSlider.setValue(this._q / FS);
        valueSlider.setChangeListener(function() {
            this.setQ(valueSlider.value() * magnitudeSlider.value()*FS);
        }, this);
    }
    return this._qNode;
}

parsegraph_FilterWidget.prototype.gainNode = function()
{
    if(!this._gainNode) {
        var car = new parsegraph_Caret('s');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        car.label('Gain');
        this._gainNode = car.root();
        var valueSlider = car.spawn('d', 'sli');
        valueSlider.setValue((this._gain + 40) / 80);
        valueSlider.setChangeListener(function() {
            this.setGain(-40 + 80 * valueSlider.value());
        }, this);
    }
    return this._gainNode;
}

parsegraph_FilterWidget.prototype.detuneNode = function()
{
    if(!this._detuneNode) {
        var car = new parsegraph_Caret('s');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        car.label('Detune');
        this._detuneNode = car.root();
        var MAXFS = 20000;
        var FS = 2000;
        var magnitudeSlider = car.spawn('i', 'sli', 'v');
        var valueSlider = car.spawn('d', 'sli');
        magnitudeSlider.setChangeListener(function() {
            FS = magnitudeSlider.value() * MAXFS;
            if(valueSlider.value() > FS) {
                this.setDetune(FS);
            }
            valueSlider.setValue(this._detune / FS);
        }, this);
        magnitudeSlider.setValue(FS / MAXFS);
        valueSlider.setValue(this._detune / FS);
        valueSlider.setChangeListener(function() {
            this.setDetune(valueSlider.value() * magnitudeSlider.value()*FS);
        }, this);
    }
    return this._detuneNode;
}

parsegraph_FilterWidget.prototype.node = function()
{
    if(!this._containerNode) {
        var car = new parsegraph_Caret('b');
        car.setGlyphAtlas(this._graph.glyphAtlas());
        this._containerNode = car.root();
        car.label('BiquadFilterNode');

        car.connect('i', this.typeNode());
        car.align('i', 'v');
        car.move('i');
        car.spawnMove('d', 'u', 'c').connectNode(parsegraph_DOWNWARD, this.frequencyNode());
        car.pull('d');
        car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.qNode());
        car.pull(parsegraph_DOWNWARD);
        car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.gainNode());
        car.pull(parsegraph_DOWNWARD);
        car.spawnMove('f', 'u').connectNode(parsegraph_DOWNWARD, this.detuneNode());
    }
    return this._containerNode;
};

