// https://stackoverflow.com/questions/22525934/connecting-convolvernode-to-an-oscillatornode-with-the-web-audio-the-simple-wa
function impulseResponse(audioContext, duration, decay, reverse) {
    var sampleRate = audioContext.sampleRate;
    var length = sampleRate * duration;
    var impulse = audioContext.createBuffer(2, length, sampleRate);
    var impulseL = impulse.getChannelData(0);
    var impulseR = impulse.getChannelData(1);

    if (!decay)
        decay = 2.0;
    for (var i = 0; i < length; i++){
      var n = reverse ? length - i : i;
      impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
}

parsegraph_ConvolverWidget_COUNT = 0;
function parsegraph_ConvolverWidget(graph)
{
    this._id = parsegraph_ConvolverWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;

    this._duration = .25;
    this._decay = .25;

    this._maxDuration = 8;
    this._maxDecay = 8;
    this._reversed = false;

    var audio = graph.surface().audio();
    //this._convolver = audio.createConvolver();
    //this.refresh();
}

parsegraph_ConvolverWidget.prototype.refresh = function()
{
    var audio = this._graph.surface().audio();
    if(this._duration == 0 || this._decay == 0) {
        this._convolver.buffer = null;
    }
    else {
        this._convolver.buffer = impulseResponse(audio, this._duration, this._decay, this._reversed);
    }
};

parsegraph_ConvolverWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }
    var car = new parsegraph_Caret(parsegraph_BLOCK);
    this._containerNode = car.root();
    car.label("Convolver");

    car.spawnMove(parsegraph_INWARD, parsegraph_BUD, parsegraph_ALIGN_VERTICAL);
    car.pull(parsegraph_DOWNWARD);
    car.shrink();
    var aSlider = car.spawn(parsegraph_DOWNWARD, parsegraph_SLIDER);
    car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    car.pull(parsegraph_DOWNWARD);
    car.shrink();
    var bSlider = car.spawn(parsegraph_DOWNWARD, parsegraph_SLIDER);

    aSlider.setValue(this._decay / this._maxDecay);
    aSlider.setChangeListener(function() {
        this._decay = Math.pow(aSlider.value(), 2) * this._maxDecay;
        this.refresh();
    }, this);
    bSlider.setValue(this._duration / this._maxDuration);
    bSlider.setChangeListener(function() {
        this._duration = Math.pow(bSlider.value(), 2) * this._maxDuration;
        this.refresh();
    }, this);

    car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    car.pull(parsegraph_DOWNWARD);
    car.shrink();
    var reversedButton = car.spawn(parsegraph_DOWNWARD, parsegraph_SLOT);
    reversedButton.setLabel("Reverse", this._graph.font());
    reversedButton.setClickListener(function() {
        this._reversed = !this._reversed;
        this.refresh();
    }, this);

    return this._containerNode;
}
