parsegraph_8BitWidget_COUNT = 0;
function parsegraph_8BitWidget(graph)
{
    this._id = parsegraph_8BitWidget_COUNT++;
    this._graph = graph;
    this._containerNode = null;
    this._listeners = [];
    this._audioNode = null;
    this._active = false;
    this._dither = .02;
    this._ditherSlider = null;
}

parsegraph_8BitWidget.prototype.audioNode = function()
{
    if(!this._audioNode) {
        var audio = this._graph.surface().audio();
        this._audioNode = audio.createScriptProcessor(4096, 1, 1);
        var that = this;
        this._audioNode.onaudioprocess = function(audioProcessingEvent) {
            // The input buffer is the song we loaded earlier
            var inputBuffer = audioProcessingEvent.inputBuffer;

            // The output buffer contains the samples that will be modified and played
            var outputBuffer = audioProcessingEvent.outputBuffer;

            // Loop through the output channels (in this case there is only one)
            for(var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
                var inputData = inputBuffer.getChannelData(channel);
                var outputData = outputBuffer.getChannelData(channel);

                // Loop through the 4096 samples
                for(var sample = 0; sample < inputBuffer.length; sample++) {
                    if(that._active) {
                        //console.log(((inputData[sample]*0xffffFFFF) & (-1 << 24))/0xffffFFFF);
                        outputData[sample] = ((inputData[sample]*0xffffFFFF) & (-1 << 30))/0xffffFFFF;
                        outputData[sample] = (1 - that._dither) * outputData[sample] + that._dither * Math.random();
                    }
                    else {
                        outputData[sample] = inputData[sample];
                    }
                }
            }
        };
    }
    return this._audioNode;
};

parsegraph_8BitWidget.prototype.node = function()
{
    if(this._containerNode) {
        return this._containerNode;
    }
    var car = new parsegraph_Caret(parsegraph_SLOT);
    car.setGlyphAtlas(this._graph.glyphAtlas());
    this._containerNode = car.root();
    car.label("8Bit");
    car.fitExact();

    this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    var onOff = this._containerNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    onOff.setLabel("Play", this._graph.glyphAtlas());
    this._onButton = onOff;

    onOff.setClickListener(function() {
        this._active = !this._active;
        if(this._active) {
            onOff.setLabel("Stop", this._graph.glyphAtlas());
        }
        else {
            onOff.setLabel("Play", this._graph.glyphAtlas());
        }
    }, this);


    this._ditherSlider = onOff.spawnNode(parsegraph_DOWNWARD, parsegraph_SLIDER);
    this._ditherSlider.setValue(this._dither);
    this._ditherSlider.setChangeListener(function() {
        this._dither = this._ditherSlider.value();
    }, this);

    return this._containerNode;
}
