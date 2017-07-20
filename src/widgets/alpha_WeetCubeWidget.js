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

    this.input.SetOnKeyDown(this.onKeyDown, this);

    this.cubePainter = null;
    this.rotq = 0;
    this._elapsed = 0;
    this._frozen = false;
    var amt = 5;
    this._xMax = amt;
    this._yMax = amt;
    this._zMax = amt;

    this._audioOut=null;

    this._freqs=[440*1.33, 440, 440*.67, 440*.67*.67, 440*.67*.67*.67];

    this._currentAudioMode = 0;
    this._audioModes = [function(audio) {
        var osc=audio.createOscillator();
        osc.type='sawtooth';
        var tRand = Math.random();
        if(tRand < .1) {
            osc.type = "triangle";
        }
        else if(tRand < .6) {
            osc.type='sawtooth';
        }
        else if(tRand < .8) {
            osc.type='sine';
        }
        else {
            osc.type='square';
        }
        //osc.type = "square";
        //osc.type = "sine";
        if(osc.type === "sine" || osc.type === "triangle") {
            //osc.frequency.value=freqs[z%freqs.length];
            osc.frequency.value=Math.max(320, 320+Math.random()*980);//freqs[z%freqs.length];
        }
        else if (osc.type === "square") {
            osc.frequency.value=this._freqs[this._nodesPainted%this._freqs.length];
            //osc.frequency.value=Math.max(4, Math.random()*200);//freqs[z%freqs.length];
        }
        else if(osc.type === "sawtooth") {
            osc.frequency.value=Math.max(320, 320+Math.random()*200);//freqs[z%freqs.length];
        }else {
            osc.frequency.value=Math.min(1000, Math.random()*4000);//freqs[z%freqs.length];
            //osc.frequency.value=freqs[z%freqs.length];
        }
        //osc.type = "square";
        //osc.frequency.value=Math.max(8, Math.random()*100);
        osc.start(0);
        //console.log(c.position);

        var randZ = Math.random() * 30;
        var randY = Math.random() * 5;
        //console.log(i, j, k, randY, randZ);
        var g = audio.createGain();
        //g.gain.value = 0.1;
        g.gain.value = 0;
        if(osc.type === "sawtooth") {
            g.gain.linearRampToValueAtTime(0.8, .1);
        }
        else {
            g.gain.linearRampToValueAtTime(0.8, .1);
        }
        //g.gain.exponentialRampToValueAtTime(.01, randY);
        //g.gain.linearRampToValueAtTime(0, randY + randZ);
        osc.connect(g);
        return g;
    }
    //this.createSquareAudioNode,
    //this.createSineAudioNode,
    //this.createTriangleAudioNode,
    //this.createSawtoothAudioNode
];
    this._audioModes = [this.createSineAudioNode, this.createSawtoothAudioNode];

    this.camera.GetParent().SetPosition(-1, -1, this._zMax * -5.0);
    this.camera.GetParent().SetOrientation(alpha_QuaternionFromAxisAndAngle(
        0, 1, 0, Math.PI
    ));
}

alpha_WeetCubeWidget.prototype.createSquareAudioNode = function(audio)
{
    osc=audio.createOscillator();
    osc.type='triangle';
    osc.frequency.value=this._freqs[this._nodesPainted%this._freqs.length];
    osc.start(0);
    var g = audio.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.8, .1);
    osc.connect(g);
    return g;
};

alpha_WeetCubeWidget.prototype.createTriangleAudioNode = function(audio)
{
    osc=audio.createOscillator();
    osc.type='triangle';
    osc.frequency.value=Math.max(320, 320+Math.random()*980);
    osc.start(0);
    var g = audio.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.8, .1);
    osc.connect(g);
    return g;
};

alpha_WeetCubeWidget.prototype.createSineAudioNode = function(audio)
{
    osc=audio.createOscillator();
    osc.type='sine';
    osc.frequency.value=this._freqs[this._nodesPainted%this._freqs.length];
    //osc.frequency.value=Math.max(16, 440+Math.random()*980);
    osc.start();
    var g = audio.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.8, .1);
    osc.connect(g);
    return g;
};

alpha_WeetCubeWidget.prototype.createSawtoothAudioNode = function(audio)
{
    var osc=audio.createOscillator();
    osc.type='sawtooth';
    osc.frequency.value=Math.max(320, 320+Math.random()*200);
    osc.start();
    var g = audio.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.8, .1);
    osc.connect(g);
    return g;
};

alpha_WeetCubeWidget.prototype.createAudioNode = function(audio)
{
    var creator = this._audioModes[this._currentAudioMode];
    var n = creator.call(this, audio);
    console.log("Creating audio node: ", this._currentAudioMode, n);
    return n;
};

alpha_WeetCubeWidget.prototype.onKeyDown = function(key)
{
    console.log(key);
    switch(key) {
    case "Enter":
    case "Return":
        this.switchAudioMode();
        return true;
    default:
        // Key unhandled.
        return false;
    }
};

alpha_WeetCubeWidget.prototype.switchAudioMode = function()
{
    this._currentAudioMode = (this._currentAudioMode + 1) % this._audioModes.length;
    if(this._audioOut) {
        this._audioOut.disconnect();
        this._audioCompressorOut.disconnect();
        this._audioCompressorOut = null;
        this._audioOut = null;

        var audio = this.surface.audio();
        this.createAudioNode(audio).connect(audio.destination);
    }
    this._updateAudio = true;
};

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

    var createAudioNodes = false;
    if(!this._audioOut) {
        console.log("Creating audio out");
        this._audioOut=audio.createGain();
        var compressor = audio.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.reduction.value = -20;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        compressor.connect(audio.destination);
        this._audioCompressorOut=compressor;
        this._audioOut.connect(compressor);
        this._audioNodes = [];
        this._audioNodePositions = [];
        createAudioNodes = true;
    }

    var c = new alpha_Physical(this.camera);
    var az=0;

    this._nodesPainted = 0;
    var panner;

    var cubeSize = 1;
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
                c.SetPosition(3*i, 3*j, 3*k);
                c.SetScale(cubeSize, cubeSize, cubeSize);
                this.cubePainter.Cube(c.GetModelMatrix());
                var makeAudio = Math.random() < .1;
                if(createAudioNodes && makeAudio) {
                    var node = this.createAudioNode(audio);
                    panner=audio.createPanner();
                    panner.panningModel = 'HRTF';
                    panner.distanceModel = 'exponential';
                    panner.rolloffFactor = 2;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    panner.connect(this._audioOut);
                    node.connect(panner);
                    this._audioNodes.push(panner);
                    this._audioNodePositions.push(this._nodesPainted);
                }
                else if(this._nodesPainted === this._audioNodePositions[az]) {
                    panner = this._audioNodes[az];
                    az++;
                } else {
                    panner = null;
                }
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

                if(panner) {
                    var wv=c.GetModelMatrix();
                    var cx, cy, cz;
                    cx = c.position[0] + cubeSize/2;
                    cy = c.position[1] + cubeSize/2;
                    cz = c.position[2] + cubeSize/2;
                    cx = wv[12];
                    cy = wv[13];
                    cz = wv[14];
                    //console.log(cx, cy, cz);
                    if(panner.positionX) {
                        panner.positionX.value=cx;
                        panner.positionY.value=cy;
                        panner.positionZ.value=cz;
                    }
                    else {
                        panner.setPosition(cx, cy, cz);
                    }
                }
                ++this._nodesPainted;
            }
        }

        // Not really necessary, but just constraining the value of this so it
        // doesn't get massive when running in the background.
        if(rotq >= 360) {
            rotq = 0;
        }
        rotq = rotq + 0.2 * elapsed;
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
