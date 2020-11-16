parsegraph_WhiteNoiseWidget_COUNT = 0;
function parsegraph_WhiteNoiseWidget(graph) {
  this._id = parsegraph_WhiteNoiseWidget_COUNT++;
  this._graph = graph;
  this._containerNode = null;
  this._listeners = [];
  this._audioNode = null;
}

parsegraph_WhiteNoiseWidget.prototype.audioNode = function () {
  if (!this._audioNode) {
    var audio = this._graph.surface().audio();
    this._audioNode = audio.createScriptProcessor(4096, 1, 1);
    this._audioNode.onaudioprocess = function (audioProcessingEvent) {
      // The input buffer is the song we loaded earlier
      var inputBuffer = audioProcessingEvent.inputBuffer;

      // The output buffer contains the samples that will be modified and played
      var outputBuffer = audioProcessingEvent.outputBuffer;

      // Loop through the output channels (in this case there is only one)
      for (
        var channel = 0;
        channel < outputBuffer.numberOfChannels;
        channel++
      ) {
        var inputData = inputBuffer.getChannelData(channel);
        var outputData = outputBuffer.getChannelData(channel);

        // Loop through the 4096 samples
        for (var sample = 0; sample < inputBuffer.length; sample++) {
          if (this._active) {
            outputData[sample] = Math.random();
          } else {
            outputData[sample] = inputData[sample];
          }
        }
      }
    };
  }
  return this._audioNode;
};

parsegraph_WhiteNoiseWidget.prototype.font = function () {
  return parsegraph_defaultFont();
};

parsegraph_WhiteNoiseWidget.prototype.node = function () {
  if (this._containerNode) {
    return this._containerNode;
  }
  var car = new parsegraph_Caret(parsegraph_SLOT);
  this._containerNode = car.root();
  car.label("WhiteNoise");
  car.fitExact();

  this._containerNode.setNodeAlignmentMode(
    parsegraph_INWARD,
    parsegraph_ALIGN_VERTICAL
  );
  var onOff = this._containerNode.spawnNode(
    parsegraph_INWARD,
    parsegraph_BLOCK
  );
  onOff.setLabel("Play", this.font());
  this._onButton = onOff;

  onOff.setClickListener(function () {
    this._active = !this._active;
    if (this._active) {
      onOff.setLabel("Stop", this.font());
    } else {
      onOff.setLabel("Play", this.font());
    }
  }, this);

  return this._containerNode;
};
