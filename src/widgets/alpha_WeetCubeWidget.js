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
    this._xMax = 25;
    this._yMax = 25;
    this._zMax = 25;

    this.camera.SetPosition(-1, -1, this._zMax * -3.5);
}

alpha_WeetCubeWidget.prototype.Tick = function(elapsed, frozen)
{
    if(elapsed === undefined || Number.isNaN(elapsed)) {
        throw new Error("elapsed must be provided.");
    }

    this.input.Update(elapsed);
    this._elapsed = elapsed;
    this._frozen = frozen;
}

alpha_WeetCubeWidget.prototype.setMax = function(max)
{
    this._xMax = max;
    this._yMax = max;
    this._zMax = max;
    if(this.cubePainter) {
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
}

alpha_WeetCubeWidget.prototype.setXMax = function(xMax)
{
    this._xMax = xMax;
    if(this.cubePainter) {
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
};

alpha_WeetCubeWidget.prototype.setYMax = function(yMax)
{
    this._yMax = yMax;
    if(this.cubePainter) {
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
};

alpha_WeetCubeWidget.prototype.setZMax = function(zMax)
{
    this._zMax = zMax;
    if(this.cubePainter) {
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
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

    if(!this.cubePainter) {
        this.cubePainter = new alpha_WeetPainter(this.surface.gl());
        this.cubePainter.Init(this._xMax * this._yMax * this._zMax);
    }
    else if(!frozen && elapsed > 0) {
        this.cubePainter.Clear();
    }

    var c = new alpha_Physical(this.camera);
    for(var i = 0; i < this._xMax; ++i) {
        for(var j = 0; j < this._yMax; ++j) {
            for(var k = 0; k < this._zMax; ++k) {
                if(k % 2 != 0 || j % 2 != 0 || i % 2 != 0) {
                    continue;
                }
                c.modelMode = alpha_PHYSICAL_ROTATE_TRANSLATE_SCALE;
                c.SetScale(1, 1, 1);
                c.orientation.Set(0, 0, 0, 1);
                c.position.Set(0, 0, 0);
                c.scale.Set(1, 1, 1);
                c.Rotate(rotq*k/10, 0, 1, 1);
                c.Rotate(rotq*i/15, 1, 0, 0);
                c.Rotate(rotq*j/10, 1, 0, 1);
                c.SetPosition(i, j, k);
                c.SetScale(1, 1, 1);
                this.cubePainter.Cube(c.GetModelMatrix());
            }
        }

        // Not really necessary, but just constraining the value of this so it
        // doesn't get massive when running in the background.
        if(rotq >= 360) {
            rotq = 0;
        }
        rotq = rotq + 0.01 * elapsed;
    }

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

    var projection;
    if(arguments.length > 0) {
        projection = this.camera.UpdateProjection(arguments[0], arguments[1]);
    }
    else {
        projection = this.camera.UpdateProjection();
    }
    var viewMatrix = this.camera.GetViewMatrix().Multiplied(projection);
    //console.log("CameraViewMatrix is" + this.camera.GetViewMatrix().toString());
    console.log("viewMatrix is " + viewMatrix.toString());
    this.cubePainter.Draw(viewMatrix);
    gl.clear(gl.DEPTH_BUFFER_BIT);
};

