import parsegraph_CameraBoxPainter from './CameraBoxPainter';
import parsegraph_Rect from './Rect';

export default function parsegraph_CameraBox() {
  // Camera boxes.
  this._showCameraBoxes = true;
  this._cameraBoxDirty = true;
  this._cameraBoxes = {};
  this._painters = {};

  this._glyphAtlas = null;

  this._numBoxes = 0;
}

parsegraph_CameraBox.prototype.contextChanged = function(isLost, window) {
  this._cameraBoxDirty = true;
  if (!isLost) {
    return;
  }
  for (const wid in this._painters) {
    if (window.id() === wid) {
      this._painters[wid].contextChanged(isLost);
    }
  }
};

parsegraph_CameraBox.prototype.needsRepaint = function() {
  return this._cameraBoxDirty;
};

parsegraph_CameraBox.prototype.glyphAtlas = function() {
  return this._glyphAtlas;
};

parsegraph_CameraBox.prototype.setCameraMouse = function(name, x, y) {
  if (!(name in this._cameraBoxes)) {
    ++this._numBoxes;
    this._cameraBoxes[name] = {};
  }
  this._cameraBoxes[name].mouseX = x;
  this._cameraBoxes[name].mouseY = y;
  this._cameraBoxes[name].when = new Date();
  this._cameraBoxDirty = true;
  this._viewport.scheduleRepaint();
};

parsegraph_CameraBox.prototype.setCamera = function(name, camera) {
  let oldMouseX;
  let oldMouseY;
  if (!(name in this._cameraBoxes)) {
    ++this._numBoxes;
  } else {
    oldMouseX = this._cameraBoxes[name].mouseX;
    oldMouseY = this._cameraBoxes[name].mouseY;
  }
  this._cameraBoxes[name] = camera;
  this._cameraBoxes[name].mouseX = oldMouseX;
  this._cameraBoxes[name].mouseY = oldMouseY;
  this._cameraBoxes[name].when = new Date();
  this._cameraBoxDirty = true;
  this._viewport.scheduleRepaint();
};

parsegraph_CameraBox.prototype.removeCamera = function(name) {
  if (!(name in this._cameraBoxes)) {
    return;
  }
  delete this._cameraBoxes[name];
  --this._numBoxes;
  this._cameraBoxDirty = true;
  this.scheduleRepaint();
};

parsegraph_CameraBox.prototype.scheduleRepaint = function() {
  this._graph.scheduleRepaint();
};

parsegraph_CameraBox.prototype.paint = function(window) {
  // console.log("Repainting camera boxes");
  let needsRepaint = false;
  if (this._showCameraBoxes && this._cameraBoxDirty) {
    let painter = this._painters[window.id()];
    if (!painter) {
      painter = new parsegraph_CameraBoxPainter(window);
      this._painters[window.id()] = painter;
    } else {
      painter.clear();
    }
    painter._blockPainter.initBuffer(this._numBoxes);
    const rect = new parsegraph_Rect();
    for (const name in this._cameraBoxes) {
      const cameraBox = this._cameraBoxes[name];
      const hw = cameraBox.width / cameraBox.scale;
      const hh = cameraBox.height / cameraBox.scale;
      rect.setX(-cameraBox.cameraX + hw / 2);
      rect.setY(-cameraBox.cameraY + hh / 2);
      rect.setWidth(cameraBox.width / cameraBox.scale);
      rect.setHeight(cameraBox.height / cameraBox.scale);
      needsRepaint =
        painter.drawBox(
            name,
            rect,
            cameraBox.scale,
            cameraBox.mouseX,
            cameraBox.mouseY,
            cameraBox.when,
        ) || needsRepaint;
    }
    this._cameraBoxDirty = needsRepaint;
  }
  return needsRepaint;
};

parsegraph_CameraBox.prototype.render = function(window, camera) {
  if (!this._showCameraBoxes) {
    return true;
  }
  const gl = window.gl();
  if (!gl) {
    return false;
  }
  const painter = this._painters[window.id()];
  if (!painter) {
    return false;
  }
  gl.blendFunc(gl.SRC_ALPHA, gl.DST_ALPHA);
  painter.render(camera.project(), camera.scale());
};
