var audioTransition = 1.2;
function alpha_WeetCubeWidget(window)
{
    this.window = window;
    if(!this.window) {
        throw new Error("A Window must be provided when creating a Widget");
    }

    this.camera = new alpha_Camera();
    this.camera.SetFovX(60);
    this.camera.SetFarDistance(1000);
    this.camera.SetNearDistance(.1);

    this.input = new alpha_Input(this.window, this.camera);
    this.input.SetMouseSensitivity(.4);

    this.input.SetOnKeyDown(this.onKeyDown, this);

    this.cubePainter = null;
    this.rotq = 0;
    this._elapsed = 0;
    this._frozen = false;
    var amt = 7;
    this._xMax = amt;
    this._yMax = amt;
    this._zMax = amt;

    this._audioOut=null;

    var baseFreq = 293.665;//391.995;//311.127;//440;
    this._freqs=[baseFreq*1.33, baseFreq, baseFreq*.67, baseFreq*.67*.67, baseFreq*.67*.67*.67];

    var randomFrequencyNodeCreator = function(nodeType, minFreq, freqRange) {
        return function(audio) {
            var osc=audio.createOscillator();
            //osc.type=nodeType;
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
            osc.frequency.value=minFreq+Math.random()*freqRange;
            osc.start();
            var g = audio.createGain();
            g.gain.setValueAtTime(0, audio.currentTime);
            g.gain.linearRampToValueAtTime(0.8, audio.currentTime + audioTransition);
            osc.connect(g);
            return g;
        };
    };

    var fixedFrequencyNodeCreator = function(nodeType, freqs) {
        return function(audio) {
            var osc=audio.createOscillator();
            osc.type=nodeType;
            osc.frequency.value=freqs[this._nodesPainted%freqs.length];
            osc.start();
            var g = audio.createGain();
            g.gain.setValueAtTime(0, audio.currentTime);
            g.gain.linearRampToValueAtTime(0.8, audio.currentTime + audioTransition);
            osc.connect(g);
            return g;
        }
    };

    this._audioModes = [
        randomFrequencyNodeCreator("sawtooth", 24, 64),
        fixedFrequencyNodeCreator("sine", this._freqs),
        randomFrequencyNodeCreator("square", 16, 128),
        randomFrequencyNodeCreator("triangle", 64, 1024),
        fixedFrequencyNodeCreator("sawtooth", this._freqs),
        fixedFrequencyNodeCreator("triangle", this._freqs),
        randomFrequencyNodeCreator("sine", 320, 640),
        randomFrequencyNodeCreator("sawtooth", 64, 96),
    ];

    this._currentAudioMode = 2;
    /*this._audioModes = [function(audio) {
        var osc=audio.createOscillator();
        osc.type='sawtooth';
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
        osc.start();
        //console.log(c.position);

        var randZ = Math.random() * 30;
        var randY = Math.random() * 5;
        //console.log(i, j, k, randY, randZ);
        var g = audio.createGain();
        //g.gain.setValueAtTime(0.1, audio.currentTime);
        g.gain.setValueAtTime(0, audio.currentTime);
        g.gain.linearRampToValueAtTime(audio.currentTime + 0.8, .1);
        //g.gain.exponentialRampToValueAtTime(.01, audio.currentTime + randY);
        //g.gain.linearRampToValueAtTime(0, audio.currentTime + randY + randZ);
        osc.connect(g);
        return g;
    }
    //this.createSquareAudioNode,
    //this.createSineAudioNode,
    //this.createTriangleAudioNode,
    //this.createSawtoothAudioNode
];
    this._audioModes = [this.createSineAudioNode, this.createSawtoothAudioNode];
    */

    this.camera.GetParent().SetPosition(-1, -1, this._zMax * -5.0);
    this.camera.GetParent().SetOrientation(alpha_QuaternionFromAxisAndAngle(
        0, 1, 0, Math.PI
    ));

    this._component = new parsegraph_Component();
    this._component.setPainter(this.paint, this);
    this._component.setRenderer(this.render, this);
    this.setLayout(new parsegraph_FullscreenLayout());
}

alpha_WeetCubeWidget.prototype.component = function()
{
    return this._component;
};

alpha_WeetCubeWidget.prototype.setLayout = function(layout)
{
    this._component.setLayout(layout);
};

alpha_WeetCubeWidget.prototype.createAudioNode = function(audio)
{
    var creator = this._audioModes[this._currentAudioMode];
    var n = creator.call(this, audio);
    //console.log("Creating audio node: ", this._currentAudioMode, n);
    return n;
};

alpha_WeetCubeWidget.prototype.onKeyDown = function(key)
{
    //console.log(key);
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
    this._modeSwitched = true;
};

alpha_WeetCubeWidget.prototype.Tick = function(elapsed, frozen)
{
    if(elapsed === undefined || Number.isNaN(elapsed)) {
        throw new Error("elapsed must be provided.");
    }

    this.input.Update(elapsed);
    this._elapsed = elapsed;
    this._frozen = frozen;
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
    var rotq = this.rotq;
    var audio=this.window.audio();
    if(!this.cubePainter) {
        this.cubePainter = new alpha_WeetPainter(this.window);
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
    else {
        this.cubePainter.Clear();
    }

    if(audio && !this._audioOut) {
        //console.log("Creating audio out");
        this._audioOut=audio.createGain();
        var compressor = audio.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 10;
        compressor.ratio.value = 24;
        compressor.reduction.value = -20;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        compressor.connect(audio.destination);
        this._audioCompressorOut=compressor;
        this._audioOut.connect(compressor);
        this._modeAudioNodes = [];
        this._audioNodes = [];
        this._audioNodePositions = [];
    }
    else if(this._modeSwitched) {
        var oldModeNodes = [].concat(this._modeAudioNodes);
        setTimeout(function() {
            oldModeNodes.forEach(function(node) {
                node.disconnect();
            });
        }, 1000 * (audioTransition + 0.1));
    }
    var createAudioNodes = audio && (this._audioNodes.length == 0);

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
                var makeAudio = Math.random() < .05;
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
                    this._modeAudioNodes.push(node);
                    this._audioNodes.push(panner);
                    this._audioNodePositions.push(this._nodesPainted);
                }
                else if(audio && this._nodesPainted === this._audioNodePositions[az]) {
                    panner = this._audioNodes[az];
                    if(this._modeSwitched) {
                        this._modeAudioNodes[az].gain.linearRampToValueAtTime(0, audio.currentTime + audioTransition);
                        var node = this.createAudioNode(audio);
                        this._modeAudioNodes[az] = node;
                        node.connect(panner);
                    }
                    az++;
                } else {
                    panner = null;
                }

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
        if(!this._frozen) {
            rotq = rotq + 0.1 * elapsed;
        }
    }
    //console.log("dataX=" + this.cubePainter._dataX);

    this._modeSwitched = false;
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

alpha_WeetCubeWidget.prototype.render = function(width, height)
{
    var gl = this.window.gl();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    audio = this.window.audio();

    var cm=this.camera.GetParent().GetModelMatrix();
    var xPos=cm[12];
    var yPos=cm[13];
    var zPos=cm[14];
    if(audio) {
        var listener = audio.listener;
        if(listener.positionX) {
            listener.positionX.value = xPos;
            listener.positionY.value = yPos;
            listener.positionZ.value = zPos;
        } else {
            listener.setPosition(xPos,yPos,zPos);
        }
        if(listener.forwardX) {
            var forV = cm.Transform(0, 0, -1);
            var upV = cm.Transform(0, 1, 0);
            listener.forwardX.setValueAtTime(forV[0], audio.currentTime);
            listener.forwardY.setValueAtTime(forV[1], audio.currentTime);
            listener.forwardZ.setValueAtTime(forV[2], audio.currentTime);
            listener.upX.setValueAtTime(upV[0], audio.currentTime);
            listener.upY.setValueAtTime(upV[1], audio.currentTime);
            listener.upZ.setValueAtTime(upV[2], audio.currentTime);
            console.log("Setting orientation:" + forV[0] + ", " + forV[1] + ", " + forV[2]);
        }
    }
    //console.log(xPos + ", " + yPos + ", " + zPos);

    gl.clear(gl.DEPTH_BUFFER_BIT);
    var projection = this.camera.UpdateProjection(width, height);
    //console.log("projection is" + projection.toString());
    var viewMatrix = this.camera.GetViewMatrix().Multiplied(projection);
    //console.log("CameraViewMatrix is" + this.camera.GetViewMatrix().toString());
    //console.log("viewMatrix is " + viewMatrix.toString());
    this.cubePainter.Draw(viewMatrix);
};
