function alpha_WeetCubeWidget()
{
    var surface;
    if(arguments.length === 0) {
        surface = new parsegraph_Surface();
    }
    else {
        surface = arguments[0];
    }
    this.surface = surface;

    this.camera = new alpha_Camera(surface);
    this.camera.SetFovX(60);
    this.camera.SetFarDistance(1000);
    this.camera.SetNearDistance(.1);

    this.input = new alpha_Input(surface, this.camera);
    this.input.SetMouseSensitivity(.4);

    this.cubePainter = null;
    this.rotq = 0;
    this._elapsed = 0;
    this._frozen = false;
    var amt = 5;
    this._xMax = amt;
    this._yMax = amt;
    this._zMax = amt;

    this._audioOut=null;

    this.camera.SetPosition(-1, -1, this._zMax * -5.5);
}

alpha_WeetCubeWidget.prototype.Tick = function(elapsed, frozen, updateAudio)
{
    if(elapsed === undefined || Number.isNaN(elapsed)) {
        throw new Error("elapsed must be provided.");
    }

    this.input.Update(elapsed);
    this._elapsed = elapsed;
    this._frozen = frozen;
    this._updateAudio = updateAudio;
}

alpha_WeetCubeWidget.prototype.refresh = function()
{
    if(this.cubePainter) {
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
}

alpha_WeetCubeWidget.prototype.setMax = function(max)
{
    this._xMax = max;
    this._yMax = max;
    this._zMax = max;
    this.refresh();
}

alpha_WeetCubeWidget.prototype.setXMax = function(xMax)
{
    this._xMax = xMax;
    this.refresh();
};

alpha_WeetCubeWidget.prototype.setYMax = function(yMax)
{
    this._yMax = yMax;
    this.refresh();
};

alpha_WeetCubeWidget.prototype.setZMax = function(zMax)
{
    this._zMax = zMax;
    this.refresh();
};

alpha_WeetCubeWidget.prototype.setRotq = function(rotq)
{
    this.rotq = rotq;
};

alpha_WeetCubeWidget.prototype.paint = function()
{
    var elapsed = this._elapsed;
    var frozen = this._frozen;
    var rotq = this.rotq;
    var audio=this.surface.audio();
    if(!this.cubePainter) {
        this.cubePainter = new alpha_WeetPainter(this.surface.gl());
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
    else if(!frozen && elapsed > 0) {
        this.cubePainter.Clear();
    }

/*    if(listener.forwardX) {
      var vec=this.camera.GetParent().orientation.RotatedVector(new alpha_Vector(0, 0, -1));
      listener.forwardX.value = vec[0];
      listener.forwardY.value = vec[1];
      listener.forwardZ.value = vec[2];
      vec=this.camera.GetParent().orientation.RotatedVector(new alpha_Vector(0, 1, 0));
      listener.upX.value = vec[0];
      listener.upY.value = vec[1];
      listener.upZ.value = vec[2];
    } else {
      vec=this.camera.GetParent().orientation.RotatedVector(new alpha_Vector(0, -1,1));
      listener.setOrientation(vec[0], vec[1], vec[2]);
    }*/

    var createNode = false;
    if(!this._audioOut) {
        this._audioOut=audio.createGain();
        var compressor = audio.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.reduction.value = -20;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        compressor.connect(audio.destination);
        this._audioOut.connect(compressor);
        this._audioNodes = [];
        createNode = true;
    }

    var c = new alpha_Physical(this.camera);
    var z=0;
    var osc;
    var panner;
    ///var freqs=[440, 440*.67];
    for(var i = 0; i < this._xMax; ++i) {
        for(var j = 0; j < this._yMax; ++j) {
            for(var k = 0; k < this._zMax; ++k) {
                c.modelMode = alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE;
                c.SetScale(1, 1, 1);
                c.orientation.Set(0, 0, 0, 1);
                c.position.Set(0, 0, 0);
                c.scale.Set(1, 1, 1);
                c.Rotate(rotq*2*k/10, 0, 1, 1);
                c.Rotate(rotq*2*i/15, 1, 0, 0);
                c.Rotate(rotq*2*j/10, 1, 0, 1);
                c.SetPosition(20*i, 20*j, 20*k);
                c.SetScale(1, 1, 1);
                this.cubePainter.Cube(c.GetModelMatrix());
                if(false && createNode) {
                    osc=audio.createOscillator();
                    osc.type='square';
                    osc.frequency.value=Math.min(1000, Math.random()*4000);//freqs[z%freqs.length];
                    osc.start(0);
                    panner=audio.createPanner();
                    panner.panningModel = 'HRTF';
                    panner.distanceModel = 'exponential';
                    panner.refDistance = 10;
                    panner.rolloffFactor = 1;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    var g = audio.createGain();
                    g.gain.value = .1;
                    osc.connect(g);
                    g.connect(panner);
                    panner.connect(this._audioOut);
                    this._audioNodes.push(panner);
                }
                panner = this._audioNodes[z];
                /*var ori=c.orientation.RotatedVector(new alpha_Vector(0, 0, 0));
                if(panner.orientationX) {
                  panner.orientationX.value = ori[0];
                  panner.orientationY.value = ori[1];
                  panner.orientationZ.value = ori[2];
                }
                else {
                  panner.setOrientation(ori[0], ori[1], ori[2]);
                }

if(panner.orientationX) {
  panner.orientationX.value = 1;
  panner.orientationY.value = 0;
  panner.orientationZ.value = 0;
} else {
  panner.setOrientation(1,0,0);
}
*/

                var wv=c.GetModelMatrix();
                var cx, cy, cz;
                cx = c.position[0];
                cy = c.position[1];
                cz = c.position[2];
                cx = wv[12];
                cy = wv[13];
                cz = wv[14];
                //console.log(cx, cy, cz);
                if(panner.positionX) {
                    panner.positionX=cx;
                    panner.positionY=cy;
                    panner.positionZ=cz;
                }
                else {
                    panner.setPosition(cx, cy, cz);
                }
                ++z;
            }
        }

        // Not really necessary, but just constraining the value of this so it
        // doesn't get massive when running in the background.
        if(rotq >= 360) {
            rotq = 0;
        }
        rotq = rotq + 0.1 * elapsed;
    }
    //console.log("dataX=" + this.cubePainter._dataX);

    this._updateAudio = false;
    this.rotq = rotq;
    if(this._listener) {
        this._listener.call(this._listenerThisArg);
    }
};

alpha_WeetCubeWidget.prototype.setUpdateListener = function(listener, listenerThisArg)
{
    this._listener = listener;
    this._listenerThisArg = listenerThisArg || this;
}

alpha_WeetCubeWidget.prototype.render = function()
{
    var gl = this.surface.gl();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    audio = this.surface.audio();
    var listener=audio.listener;
    if(listener.forwardX) {
  listener.forwardX.value = 0;
  listener.forwardY.value = 0;
  listener.forwardZ.value = -1;
  listener.upX.value = 0;
  listener.upY.value = 1;
  listener.upZ.value = 0;
} else {
  listener.setOrientation(0,0,-1,0,1,0);
}

    var cm=this.camera.GetParent().GetModelMatrix();
    var xPos=cm[12];
    var yPos=cm[13];
    var zPos=cm[14];
    if(listener.positionX) {
      listener.positionX.value = xPos;
      listener.positionY.value = yPos;
      listener.positionZ.value = zPos;
    } else {
      listener.setPosition(xPos,yPos,zPos);
    }
    //console.log(xPos + ", " + yPos + ", " + zPos);

    var projection;
    if(arguments.length > 0) {
        projection = this.camera.UpdateProjection(arguments[0], arguments[1]);
    }
    else {
        projection = this.camera.UpdateProjection();
    }
    //console.log("projection is" + projection.toString());
    var viewMatrix = this.camera.GetViewMatrix().Multiplied(projection);
    //console.log("CameraViewMatrix is" + this.camera.GetViewMatrix().toString());
    //console.log("viewMatrix is " + viewMatrix.toString());
    this.cubePainter.Draw(viewMatrix);
    gl.clear(gl.DEPTH_BUFFER_BIT);
};

