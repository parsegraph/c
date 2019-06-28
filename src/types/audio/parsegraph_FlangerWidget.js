parsegraph_FlangerWidget_COUNT = 0;
function parsegraph_FlangerWidget(graph)
{
    this._id = parsegraph_FlangerWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._listeners = [];
    this._maxDelay = 5;
    this._delay = graph.surface().audio().createDelay(this._maxDelay);
    this._gain = graph.surface().audio().createGain();
    this._gain.gain.setValueAtTime(this._maxDelay/2,graph.surface().audio().currentTime);
    this._osc.connect(this._gain);
    this._osc = graph.surface().audio().createOscillator();
    this._osc.frequency.setValueAtTime(5,graph.surface().audio().currentTime);
    this._osc.start();
    this._gain.connect(this._delay.delayTime)
};

parsegraph_FlangerWidget.prototype.audioNode = function()
{
    return this._delay;
};

parsegraph_FlangerWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }
    var car = new parsegraph_Caret(parsegraph_SLOT);
    car.setGlyphAtlas(this._graph.glyphAtlas());
    this._containerNode = car.root();
    car.label("Flange");
    car.fitExact();

    this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    var onOff = this._containerNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    onOff.setLabel("Play", this._graph.glyphAtlas());
    this._onButton = onOff;

    var slider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    slider.setValue(.5);
    slider.setChangeListener(function() {
        if(onOff.label() === "Stop") {
            this._delay.delayTime.value = this._maxDelay * this._slider.value();
        }
    }, this);
    this._slider = slider;

    onOff.setClickListener(function() {
        if(onOff.label() === "Play") {
            onOff.setLabel("Stop", this._graph.glyphAtlas());
            this._delay.delayTime.value = this._slider.value() * this._maxDelay;
        }
        else {
            onOff.setLabel("Play", this._graph.glyphAtlas());
            this._delay.delayTime.value = 0;
        }
    }, this);

    return this._containerNode;
}
