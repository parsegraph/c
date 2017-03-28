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
    this.camera.SetPosition(-1, -1, -550);

    this.input = new alpha_Input(surface, this.camera);
    this.input.SetMouseSensitivity(.4);

    this.cubePainter = null;
    this.rotq = 0;
    this._elapsed = 0;
    this._frozen = false;
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

alpha_WeetCubeWidget.prototype.paint = function()
{
    var elapsed = this._elapsed;
    var frozen = this._frozen;
    var rotq = this.rotq;
    var max = 30;

    if(!this.cubePainter) {
        this.cubePainter = new alpha_WeetPainter(this.surface.gl());
        this.cubePainter.Init(max * max * max);
    }
    else if(!frozen && elapsed > 0) {
        this.cubePainter.Clear();
    }

    var c = new alpha_Physical(this.camera);
    for(var i = 0; i < max; ++i) {
        for(var j = 0; j < max; ++j) {
            for(var k = 0; k < max; ++k) {
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
};

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
    this.cubePainter.Draw(viewMatrix);
    gl.clear(gl.DEPTH_BUFFER_BIT);
};
