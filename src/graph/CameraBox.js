function parsegraph_CameraBox(graph)
{
    // Camera boxes.
    this._showCameraBoxes = true;
    this._cameraBoxDirty = true;
    this._cameraBoxes = {};
    this._cameraBoxPainter = null;

    this._graph = graph;
    this._gl = null;
    this._glyphAtlas = null;
    this._shaders = null;

    this._numBoxes = 0;
}

parsegraph_CameraBox.prototype.needsRepaint = function()
{
    return this._cameraBoxDirty;
};

parsegraph_CameraBox.prototype.gl = function()
{
    return this._gl;
}

parsegraph_CameraBox.prototype.glyphAtlas = function()
{
    return this._glyphAtlas;
}

parsegraph_CameraBox.prototype.prepare = function(gl, glyphAtlas, shaders)
{
    this._gl = gl;
    this._glyphAtlas = glyphAtlas;
    this._shaders = shaders;
}

parsegraph_CameraBox.prototype.setCameraMouse = function(name, x, y)
{
    if(!(name in this._cameraBoxes)) {
        ++this._numBoxes;
        this._cameraBoxes[name] = {};
    }
    this._cameraBoxes[name].mouseX = x;
    this._cameraBoxes[name].mouseY = y;
    this._cameraBoxes[name].when = new Date();
    this._cameraBoxDirty = true;
    this._graph.scheduleRepaint();
};

parsegraph_CameraBox.prototype.setCamera = function(name, camera)
{
    var oldMouseX, oldMouseY;
    if(!(name in this._cameraBoxes)) {
        ++this._numBoxes;
    }
    else {
        oldMouseX = this._cameraBoxes[name].mouseX;
        oldMouseY = this._cameraBoxes[name].mouseY;
    }
    this._cameraBoxes[name] = camera;
    this._cameraBoxes[name].mouseX = oldMouseX;
    this._cameraBoxes[name].mouseY = oldMouseY;
    this._cameraBoxes[name].when = new Date();
    this._cameraBoxDirty = true;
    this._graph.scheduleRepaint();
};

parsegraph_CameraBox.prototype.removeCamera = function(name)
{
    if(!(name in this._cameraBoxes)) {
        return;
    }
    delete this._cameraBoxes[name];
    --this._numBoxes;
    this._cameraBoxDirty = true;
    this.scheduleRepaint();
};

parsegraph_CameraBox.prototype.scheduleRepaint = function()
{
    this._graph.scheduleRepaint();
};

parsegraph_CameraBox.prototype.paint = function()
{
    //console.log("Repainting camera boxes");
    var needsRepaint = false;
    if(this._showCameraBoxes && this._cameraBoxDirty) {
        if(!this._cameraBoxPainter) {
            this._cameraBoxPainter = new parsegraph_CameraBoxPainter(
                this.gl(), this.glyphAtlas(), this._shaders
            );
        }
        else {
            this._cameraBoxPainter.clear();
        }
        this._cameraBoxPainter._blockPainter.initBuffer(this._numBoxes);
        var rect = new parsegraph_Rect();
        for(var name in this._cameraBoxes) {
            var cameraBox = this._cameraBoxes[name];
            var hw = cameraBox.width/cameraBox.scale;
            var hh = cameraBox.height/cameraBox.scale;
            rect.setX(-cameraBox.cameraX + hw/2);
            rect.setY(-cameraBox.cameraY + hh/2);
            rect.setWidth(cameraBox.width/cameraBox.scale);
            rect.setHeight(cameraBox.height/cameraBox.scale);
            needsRepaint = this._cameraBoxPainter.drawBox(name, rect, cameraBox.scale, cameraBox.mouseX, cameraBox.mouseY, cameraBox.when) || needsRepaint;
        }
        this._cameraBoxDirty = needsRepaint;
    }
    return needsRepaint;
}

parsegraph_CameraBox.prototype.render = function(world, scale)
{
    if(this._showCameraBoxes) {
        var gl = this.gl();
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
        this._cameraBoxPainter.render(world, scale);
    }
};

parsegraph_CameraBox.prototype.shaders = function()
{
    return this._shaders;
};
