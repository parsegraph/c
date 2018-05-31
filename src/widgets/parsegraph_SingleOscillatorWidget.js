parsegraph_SingleOscillatorWidget_COUNT = 0;
function parsegraph_SingleOscillatorWidget(graph, sink)
{
    this._id = parsegraph_SingleOscillatorWidget_COUNT++;
    this._graph = graph;
    this._audio = this._graph.surface().audio();
    this._containerNode = null;
    this._osc = null;
    this._gain = null;
    this._sink = sink;
    this._minFrequency = 16;
    this._frequencyRange = 5000;
}

parsegraph_SingleOscillatorWidget.prototype.node = function()
{
    if(!this._containerNode) {
        var car = new parsegraph_Caret(parsegraph_BLOCK);
        car.setGlyphAtlas(this._graph.glyphAtlas());
        var brownStyle = parsegraph_copyStyle(parsegraph_SLOT);
        brownStyle.backgroundColor = new parsegraph_Color(0.4, 0.1, 0, 1);
        brownStyle.borderColor = new parsegraph_Color(0.4, 0.1, 0, 1);
        brownStyle.fontColor = new parsegraph_Color(1, 0.5, 0.5, 1);
        car.node().setBlockStyle(brownStyle);
        this._containerNode = car.root();
        car.label("Single Oscillator");
        car.spawnMove('i', 'u', 'v');

        var offStyle = parsegraph_copyStyle(parsegraph_BUD);
        offStyle.backgroundColor = new parsegraph_Color(0.7, 0.7, 0.7, 1);
        offStyle.borderColor = new parsegraph_Color(0.5, 0.5, 0.5, 1);
        offStyle.minWidth *= 4;
        offStyle.minHeight *= 4;
        offStyle.borderRoundness *= 2.5;
        offStyle.borderThickness *= 2;
        this._offStyle = offStyle;

        var redStyle = parsegraph_copyStyle(parsegraph_BUD);
        redStyle.backgroundColor = new parsegraph_Color(1, 0, 0, 1);
        redStyle.borderColor = new parsegraph_Color(1, 0.5, 0.5, 1);
        redStyle.minWidth *= 4;
        redStyle.minHeight *= 4;
        redStyle.borderRoundness *= 2.5;
        redStyle.borderThickness *= 2;
        this._redStyle = redStyle;
        car.node().setBlockStyle(offStyle);
        car.node().setIgnoreMouse(true);
        this._bulb = car.node();
        car.spawnMove('d', 'u', 'c');
        car.shrink();
        car.push();
        car.pull('d');

        car.spawnMove('d', 's');
        brownStyle.borderColor = new parsegraph_Color(1, 1, 1, 1);
        car.node().setBlockStyle(brownStyle);
        car.shrink();
        car.spawnMove('i', 'b', 'v');
        car.label("Off");
        car.onClick(function() {
            this.stop();
            this._graph.scheduleRepaint();
            return true;
        }, this);
        var blackStyle = parsegraph_copyStyle(parsegraph_SLOT);
        blackStyle.backgroundColor = new parsegraph_Color(0, 0, 0, 1);
        blackStyle.fontColor = new parsegraph_Color(1, 0, 0, 1);
        car.node().setBlockStyle(blackStyle);
        car.spawnMove('f', 'b');
        car.label("On");
        car.onClick(function() {
            this.play();
            this._graph.scheduleRepaint();
            SGA.scheduleRender();
            return true;
        }, this);
        var whiteStyle = parsegraph_copyStyle(parsegraph_SLOT);
        whiteStyle.borderColor =  new parsegraph_Color(0.2, 0.2, 0.2, 1);
        whiteStyle.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
        car.node().setBlockStyle(whiteStyle);
        car.pop();
        car.spawnMove('f', 'u');
        car.spawnMove('d', 's');
        car.label("Frequency");
        var silverStyle = parsegraph_copyStyle(parsegraph_SLOT);
        silverStyle.backgroundColor = new parsegraph_Color(0.8, 0.6, 0.2, 1);
        silverStyle.borderColor = new parsegraph_Color(1, 1, 1, 1);
        car.node().setBlockStyle(silverStyle);
        car.spawnMove('i', 'sli', 'v');
        this._freqSlider = car.node();
        car.onChange(function() {
            this._osc.frequency.exponentialRampToValueAtTime(this._minFrequency + this._frequencyRange * this._freqSlider.value(), this._audio.currentTime + 0.1);
        }, this);
    }
    return this._containerNode;
};

parsegraph_SingleOscillatorWidget.prototype.play = function()
{
    if(!this._osc) {
        this._osc = this._audio.createOscillator();
        this._osc.start();
        this._gain = this._audio.createGain();
        this._osc.connect(this._gain);

        this._gain.connect(this._sink);
    }
    this._bulb.setBlockStyle(this._redStyle);

    //this._gain.gain.cancelScheduledValues();
    //this._gain.gain.setValueAtTime(0, this._audio.currentTime);
    //this._gain.gain.exponentialRampToValueAtTime(0.1, this._audio.currentTime + 100);

    //this._loudnessNode = this._audio.createConstantSource();
    //this._loudnessNode.connect(this._gain.gain);

    this._warble = this._audio.createOscillator();
    this._warble.frequency.setValueAtTime(6, this._audio.currentTime);
    this._warble.connect(this._gain.gain);
    this._warble.start();

};

parsegraph_SingleOscillatorWidget.prototype.stop = function()
{
    if(!this._gain) {
        return;
    }
    this._bulb.setBlockStyle(this._offStyle);
    this._gain.gain.cancelScheduledValues();
    this._gain.gain.exponentialRampToValueAtTime(0, this._audio.currentTime + 1);
};
