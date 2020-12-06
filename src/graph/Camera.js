import TestSuite from 'parsegraph-testsuite';

import {VFLIP} from './settings';
import {
  matrixMultiply3x3,
  makeTranslation3x3,
  makeScale3x3,
  make2DProjection,
  matrixTransform2D,
  makeInverse3x3,
} from '../gl';
/* eslint-disable require-jsdoc */

export default function Camera() {
  this._cameraX = 0;
  this._cameraY = 0;
  this._scale = 1;

  this._width = NaN;
  this._height = NaN;
  this._aspectRatio = NaN;

  this._changeVersion = 0;

  this._vflip = VFLIP;
}

const cameraTests = new TestSuite('Camera');

export function containsAll(
    viewportX,
    viewportY,
    viewWidth,
    viewHeight,
    cx,
    cy,
    width,
    height,
) {
  const viewHalfWidth = viewWidth / 2;
  const viewHalfHeight = viewHeight / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  if (cx + halfWidth > viewportX + viewHalfWidth) {
    return false;
  }
  if (cx - halfWidth < viewportX - viewHalfWidth) {
    return false;
  }
  if (cy + halfHeight > viewportY + viewHalfHeight) {
    return false;
  }
  if (cy - halfHeight < viewportY - viewHalfHeight) {
    return false;
  }
  return true;
}

cameraTests.addTest('containsAll', function() {
  if (!containsAll(0, 0, 800, 600, 0, 0, 400, 200)) {
    return 'Small box in viewport';
  }

  if (containsAll(0, 0, 800, 600, 0, 0, 900, 200)) {
    return 'Taller box in viewport';
  }

  if (containsAll(0, 0, 800, 600, 0, 0, 400, 1000)) {
    return 'Wider box in viewport';
  }

  if (containsAll(0, 0, 800, 600, 0, 0, 1000, 1000)) {
    return 'Larger box in viewport';
  }

  if (containsAll(0, 0, 800, 600, 600, 0, 400, 200)) {
    return 'Small box on edge of viewport';
  }
});

export function containsAny(
    viewportX,
    viewportY,
    viewWidth,
    viewHeight,
    cx,
    cy,
    width,
    height,
) {
  const viewHalfWidth = viewWidth / 2;
  const viewHalfHeight = viewHeight / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  /* function dump() {
        console.log("viewportX=" + viewportX);
        console.log("viewportY=" + viewportY);
        console.log("viewWidth=" + viewWidth);
        console.log("viewHeight=" + viewHeight);
        console.log("cx=" + cx);
        console.log("cy=" + cy);
        console.log("width=" + width);
        console.log("height=" + height);
    };*/

  if (cx - halfWidth > viewportX + viewHalfWidth) {
    // console.log(1);
    // dump();
    return false;
  }
  if (cx + halfWidth < viewportX - viewHalfWidth) {
    // console.log(2);
    // dump();
    return false;
  }
  if (cy - halfHeight > viewportY + viewHalfHeight) {
    // console.log("Viewport min is greater than given's max");
    // dump();
    return false;
  }
  if (cy + halfHeight < viewportY - viewHalfHeight) {
    // console.log("Viewport does not contain any: given vmax' +
    //   ' is less than viewport's vmin");
    // dump();
    return false;
  }
  return true;
}

cameraTests.addTest('containsAny', function() {
  if (!containsAny(0, 0, 800, 600, 0, 0, 400, 200)) {
    return 'Small box in viewport';
  }

  if (!containsAny(0, 0, 800, 600, 0, 0, 900, 200)) {
    return 'Taller box in viewport';
  }

  if (!containsAny(0, 0, 800, 600, 0, 0, 400, 1000)) {
    return 'Wider box in viewport';
  }

  if (!containsAny(0, 0, 800, 600, 0, 0, 1000, 1000)) {
    return 'Larger box in viewport';
  }

  if (!containsAny(0, 0, 800, 600, 600, 0, 400, 200)) {
    return 'Small box on edge of viewport';
  }
});

Camera.prototype.setSize = function(width, height) {
  if (this._width === width && this._height === height) {
    return false;
  }
  if (!isNaN(this._width) && !isNaN(this._height)) {
    this.adjustOrigin(
        (width - this._width) / (2 * this._scale),
        (height - this._height) / (2 * this._scale),
    );
  }
  this._width = width;
  this._height = height;
  this._aspectRatio = this._width / this._height;
  this.hasChanged();
  return true;
};

Camera.prototype.zoomToPoint = function(scaleFactor, x, y) {
  // Get the current mouse position, in world space.
  const mouseInWorld = matrixTransform2D(
      makeInverse3x3(this.worldMatrix()),
      x,
      y,
  );
  // console.log("mouseInWorld=" + mouseInWorld[0] + ", " + mouseInWorld[1]);

  // Adjust the scale.
  this.setScale(this.scale() * scaleFactor);

  // Get the new mouse position, in world space.
  const mouseAdjustment = matrixTransform2D(
      makeInverse3x3(this.worldMatrix()),
      x,
      y,
  );
  // console.log(
  //   "mouseAdjustment=" +
  //   mouseAdjustment[0] +
  //   ", " +
  //   mouseAdjustment[1]);

  // Adjust the origin by the movement of the fixed point.
  this.adjustOrigin(
      mouseAdjustment[0] - mouseInWorld[0],
      mouseAdjustment[1] - mouseInWorld[1],
  );
};

Camera.prototype.setOrigin = function(x, y) {
  if (x == this._cameraX && y == this._cameraY) {
    return;
  }
  this._cameraX = x;
  this._cameraY = y;
  this.hasChanged();
};

Camera.prototype.changeVersion = function() {
  return this._changeVersion;
};

Camera.prototype.hasChanged = function() {
  ++this._changeVersion;
  this._worldMatrix = null;
};

Camera.prototype.toJSON = function() {
  return {
    cameraX: this._cameraX,
    cameraY: this._cameraY,
    scale: this._scale,
    width: this._width,
    height: this._height,
  };
};

Camera.prototype.restore = function(json) {
  this.setOrigin(json.cameraX, json.cameraY);
  this.setScale(json.scale);
};

Camera.prototype.copy = function(other) {
  this.setOrigin(other.x(), other.y());
  this.setScale(other.scale());
};

Camera.prototype.scale = function() {
  return this._scale;
};

Camera.prototype.x = function() {
  return this._cameraX;
};

Camera.prototype.y = function() {
  return this._cameraY;
};

Camera.prototype.setScale = function(scale) {
  this._scale = scale;
};

Camera.prototype.toString = function() {
  return '(' + this._cameraX + ', ' + this._cameraY + ', ' + this._scale + ')';
};

Camera.prototype.adjustOrigin = function(x, y) {
  if (x == 0 && y == 0) {
    return;
  }
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(
        'Adjusted origin must not be null. (Given ' + x + ', ' + y + ')',
    );
  }
  this._cameraX += x;
  this._cameraY += y;
  this.hasChanged();
};

Camera.prototype.worldMatrix = function() {
  return matrixMultiply3x3(
      makeTranslation3x3(this.x(), this.y()),
      makeScale3x3(this.scale(), this.scale()),
  );
};

Camera.prototype.aspectRatio = function() {
  return this._aspectRatio;
};

Camera.prototype.width = function() {
  return this._width;
};

Camera.prototype.height = function() {
  return this._height;
};

Camera.prototype.canProject = function() {
  return !Number.isNaN(this._width) && !Number.isNaN(this._height);
};

Camera.prototype.projectionMatrix = function() {
  if (!this.canProject()) {
    throw new Error(
        'Camera cannot create a projection matrix because the ' +
        'target canvas has no size. Use canProject() to handle.',
    );
  }

  return make2DProjection(this._width, this._height);
};

Camera.prototype.project = function() {
  if (!this._worldMatrix || VFLIP !== this._vflip) {
    this._vflip = VFLIP;
    this._worldMatrix = matrixMultiply3x3(
        this.worldMatrix(),
        this.projectionMatrix(),
    );
  }
  return this._worldMatrix;
};

Camera.prototype.containsAny = function(s) {
  if (s.isNaN()) {
    return false;
  }
  const viewportX = -this.x() + this.width() / (this.scale() * 2);
  if (s.x() - s.width() / 2 > viewportX + this.width() / this.scale() / 2) {
    return false;
  }
  if (s.x() + s.width() / 2 < viewportX - this.width() / this.scale() / 2) {
    return false;
  }
  const viewportY = -this.y() + this.height() / (this.scale() * 2);
  if (s.y() - s.height() / 2 > viewportY + this.height() / this.scale() / 2) {
    return false;
  }
  if (s.y() + s.height() / 2 < viewportY - this.height() / this.scale() / 2) {
    return false;
  }
  return true;
};

Camera.prototype.containsAll = function(s) {
  if (s.isNaN()) {
    return false;
  }
  const camera = this;
  return containsAll(
      -camera.x() + camera.width() / (camera.scale() * 2),
      -camera.y() + camera.height() / (camera.scale() * 2),
      camera.width() / camera.scale(),
      camera.height() / camera.scale(),
      s.x(),
      s.y(),
      s.width(),
      s.height(),
  );
};
