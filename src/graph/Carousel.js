import FanPainter from './FanPainter';
import {matrixMultiply3x3, makeScale3x3, makeTranslation3x3} from '../gl';
import {CAROUSEL_SHOW_DURATION} from './settings';
/* eslint-disable require-jsdoc */

export default function Carousel(viewport) {
  this._viewport = viewport;

  this._updateRepeatedly = false;
  this._showScale = 1;

  this.onScheduleRepaint = null;
  this.onScheduleRepaintThisArg = null;

  // Carousel-rendered carets.
  this._carouselPaintingDirty = true;
  this._carouselPlots = [];
  this._carouselCallbacks = [];

  // Location of the carousel, in world coordinates.
  this._carouselCoords = [0, 0];
  this._carouselSize = 50;

  this._showCarousel = false;
  this._selectedCarouselPlot = null;
  this._selectedCarouselPlotIndex = null;

  // GL painters are not created until needed.
  this._fanPainter = null;

  this._selectedPlot = null;
}

Carousel.prototype.window = function() {
  return this._viewport.window();
};

Carousel.prototype.camera = function() {
  return this._viewport.camera();
};

Carousel.prototype.needsRepaint = function() {
  return this._carouselPaintingDirty || this._updateRepeatedly;
};

Carousel.prototype.moveCarousel = function(worldX, worldY) {
  this._carouselCoords[0] = worldX;
  this._carouselCoords[1] = worldY;
};

Carousel.prototype.setCarouselSize = function(size) {
  this._carouselSize = size;
};

Carousel.prototype.showCarousel = function() {
  this._showCarousel = true;
  this._updateRepeatedly = true;
  this._showTime = new Date();
};

Carousel.prototype.isCarouselShown = function() {
  return this._showCarousel;
};

Carousel.prototype.hideCarousel = function() {
  // console.log(new Error("Hiding carousel"));
  this._selectedCarouselPlot = null;
  this._selectedCarouselPlotIndex = null;
  this._showCarousel = false;
  this._hideTime = new Date();
  this._viewport.scheduleRepaint();
};

Carousel.prototype.addToCarousel = function(
    node,
    callback,
    thisArg,
    nodeData,
) {
  this._carouselCallbacks.push([callback, thisArg, nodeData]);
  if (!node) {
    throw new Error('Node must not be null');
  }
  if (!node.localPaintGroup && node.root) {
    // Passed a Caret.
    node = node.root();
  }
  if (!node.localPaintGroup()) {
    node.setPaintGroup(true);
  }
  this._carouselPlots.push([node, NaN, NaN, NaN]);
  // console.log("Added to carousel");
};

Carousel.prototype.clearCarousel = function() {
  // console.log("carousel cleared");
  this._carouselPlots.splice(0, this._carouselPlots.length);
  this._carouselCallbacks.splice(0, this._carouselCallbacks.length);
  this._selectedCarouselPlot = null;
  this._selectedCarouselPlotIndex = null;
};

Carousel.prototype.removeFromCarousel = function(node) {
  if (!node) {
    throw new Error('Node must not be null');
  }
  if (!node.localPaintGroup && node.root) {
    // Passed a Caret.
    node = node.root();
  }
  for (const i in this._carouselPlots) {
    if (this._carouselPlots[i][0] === node) {
      // console.log("removed from carousel");
      const removed = this._carouselPlots.splice(i, 1);
      this._carouselCallbacks.splice(i, 1);
      if (this._selectedCarouselPlot === removed) {
        this._selectedCarouselPlot = null;
        this._selectedCarouselPlotIndex = null;
      }
      return removed;
    }
  }
  return null;
};

Carousel.prototype.updateRepeatedly = function() {
  return this._updateRepeatedly;
};

Carousel.prototype.clickCarousel = function(x, y, asDown) {
  if (!this.isCarouselShown()) {
    return false;
  }

  if (this._showTime) {
    const ms = new Date().getTime() - this._showTime.getTime();
    if (ms < CAROUSEL_SHOW_DURATION) {
      // Ignore events that occur so early.
      return true;
    }
  }

  const dist = Math.sqrt(
      Math.pow(Math.abs(x - this._carouselCoords[0]), 2) +
      Math.pow(Math.abs(y - this._carouselCoords[1]), 2),
  );
  if (dist < (this._carouselSize * 0.75) / this.camera().scale()) {
    if (asDown) {
      // console.log("Down events within the inner' +
      //   ' region are treated as 'cancel.'");
      this.hideCarousel();
      this.scheduleCarouselRepaint();
      return true;
    }

    // console.log("Up events within the inner region are ignored.");
    return false;
  } else if (dist > (this._carouselSize * 4) / this.camera().scale()) {
    this.hideCarousel();
    this.scheduleCarouselRepaint();
    // console.log("Click occurred so far outside that' +
    //   ' it is considered its own event.");
    return false;
  }

  const angleSpan = (2 * Math.PI) / this._carouselPlots.length;
  let mouseAngle = Math.atan2(
      y - this._carouselCoords[1],
      x - this._carouselCoords[0],
  );
  // console.log(
  //   alpha_ToDegrees(mouseAngle) +
  //   " degrees = caret " +
  //   i +
  //   " angleSpan = " +
  //   angleSpan);
  if (this._carouselPlots.length == 1 && Math.abs(mouseAngle) > Math.PI / 2) {
    this.hideCarousel();
    this.scheduleCarouselRepaint();
    // console.log("Click occurred so far outside that' +
    //   ' it is considered its own event.");
    return false;
  }
  mouseAngle += Math.PI;
  const i = Math.floor(mouseAngle / angleSpan);

  // Click was within a carousel caret; invoke the listener.
  this.hideCarousel();
  try {
    const callback = this._carouselCallbacks[i][0];
    const thisArg = this._carouselCallbacks[i][1];
    const nodeData = this._carouselCallbacks[i][2];
    callback.call(thisArg, nodeData);
  } catch (ex) {
    console.log('Error occurred while running command:', ex);
  }

  this.scheduleCarouselRepaint();
  return true;
};

Carousel.prototype.mouseOverCarousel = function(x, y) {
  if (!this.isCarouselShown()) {
    return 0;
  }

  const angleSpan = (2 * Math.PI) / this._carouselPlots.length;
  const mouseAngle =
    Math.PI +
    Math.atan2(y - this._carouselCoords[1], x - this._carouselCoords[0]);
  const dist = Math.sqrt(
      Math.pow(Math.abs(x - this._carouselCoords[0]), 2) +
      Math.pow(Math.abs(y - this._carouselCoords[1]), 2),
  );

  if (
    dist < (this._carouselSize * 4) / this.camera().scale() &&
    dist > (BUD_RADIUS * 4) / this.camera().scale()
  ) {
    if (
      this._carouselPlots.length > 1 ||
      Math.abs(mouseAngle - Math.PI) < Math.PI / 2
    ) {
      const i = Math.floor(mouseAngle / angleSpan);
      // console.log(
      //   alpha_ToDegrees(mouseAngle-Math.PI) +
      //   " degrees = caret " +
      //   i +
      //   " angleSpan = " +
      //   angleSpan);
      const selectionAngle = angleSpan / 2 + i * angleSpan - Math.PI;
      if (i != this._selectedCarouselPlotIndex) {
        this._selectedCarouselPlotIndex = i;
        this._selectedCarouselPlot = this._carouselPlots[i];
      }
      if (this._fanPainter) {
        this._fanPainter.setSelectionAngle(selectionAngle);
        this._fanPainter.setSelectionSize(angleSpan);
      }
      this.scheduleCarouselRepaint();
      return 2;
    }
  }
  if (this._fanPainter) {
    this._fanPainter.setSelectionAngle(null);
    this._fanPainter.setSelectionSize(null);
    this._selectedCarouselPlot = null;
    this._selectedCarouselPlotIndex = null;
    this.scheduleCarouselRepaint();
    return 0;
  }
};

Carousel.prototype.showScale = function() {
  return this._showScale;
};

Carousel.prototype.arrangeCarousel = function() {
  if (this._carouselPlots.length === 0) {
    return;
  }

  const angleSpan = (2 * Math.PI) / this._carouselPlots.length;

  const MAX_CAROUSEL_SIZE = 150;

  const now = new Date();
  // Milliseconds
  const showDuration = CAROUSEL_SHOW_DURATION;
  if (this._showTime) {
    let ms = now.getTime() - this._showTime.getTime();
    if (ms < showDuration) {
      ms /= showDuration / 2;
      if (ms < 1) {
        this._showScale = 0.5 * ms * ms;
      } else {
        ms--;
        this._showScale = -0.5 * (ms * (ms - 2) - 1);
      }
    } else {
      this._showScale = 1;
      this._showTime = null;
      this._updateRepeatedly = false;
    }
  }
  // console.log("Show scale is " + this._showScale);

  let minScale = 1;
  this._carouselPlots.forEach(function(carouselData, i) {
    const root = carouselData[0];
    root.commitLayoutIteratively();

    // Set the origin.
    const caretRad =
      Math.PI +
      angleSpan / 2 +
      (i / this._carouselPlots.length) * (2 * Math.PI);
    carouselData[1] =
      2 * this._carouselSize * this._showScale * Math.cos(caretRad);
    carouselData[2] =
      2 * this._carouselSize * this._showScale * Math.sin(caretRad);

    // Set the scale.
    const commandSize = root.extentSize();
    const xMax = MAX_CAROUSEL_SIZE;
    const yMax = MAX_CAROUSEL_SIZE;
    let xShrinkFactor = 1;
    let yShrinkFactor = 1;
    if (commandSize.width() > xMax) {
      xShrinkFactor = commandSize.width() / xMax;
    }
    if (commandSize.height() > yMax) {
      yShrinkFactor = commandSize.height() / yMax;
    }
    // console.log(
    //   commandSize.width(),
    //   commandSize.height(),
    //   1/Math.max(xShrinkFactor,
    //   yShrinkFactor));
    minScale = Math.min(
        minScale,
        this._showScale / Math.max(xShrinkFactor, yShrinkFactor),
    );
  }, this);

  this._carouselPlots.forEach(function(carouselData, i) {
    if (i === this._selectedCarouselPlotIndex) {
      carouselData[3] = 1.25 * minScale;
    } else {
      carouselData[3] = minScale;
    }
  }, this);
};

Carousel.prototype.setOnScheduleRepaint = function(func, thisArg) {
  thisArg = thisArg || this;
  this.onScheduleRepaint = func;
  this.onScheduleRepaintThisArg = thisArg;
};

Carousel.prototype.scheduleCarouselRepaint = function() {
  // console.log("Scheduling carousel repaint.");
  this._carouselPaintingDirty = true;
  if (this.onScheduleRepaint) {
    this.onScheduleRepaint.call(this.onScheduleRepaintThisArg);
  }
};

Carousel.prototype.contextChanged = function(isLost) {
  this._carouselPaintingDirty = true;
  if (this._fanPainter) {
    this._fanPainter.contextChanged(isLost);
  }
  for (const i in this._carouselPlots) {
    if (Object.prototype.hasOwnProperty.call(this._carouselPlots, i)) {
      const carouselData = this._carouselPlots[i];
      const root = carouselData[0];
      root.contextChanged(isLost);
    }
  }
};

Carousel.prototype.paint = function() {
  if (
    !this._updateRepeatedly &&
    (!this._carouselPaintingDirty || !this._showCarousel)
  ) {
    return false;
  }

  // Paint the carousel.
  // console.log("Painting the carousel");
  this.arrangeCarousel();
  for (const i in this._carouselPlots) {
    if (Object.prototype.hasOwnProperty.call(this._carouselPlots, i)) {
      const paintCompleted = this._carouselPlots[i][0].paint(this.window());
    }
  }

  // Paint the background highlighting fan.
  if (!this._fanPainter) {
    this._fanPainter = new FanPainter(this.window());
  } else {
    this._fanPainter.clear();
  }
  const fanPadding = 1.2;
  this._fanPainter.setAscendingRadius(
      this.showScale() * fanPadding * this._carouselSize,
  );
  this._fanPainter.setDescendingRadius(
      this.showScale() * fanPadding * 2 * this._carouselSize,
  );
  this._fanPainter.selectRad(
      0,
      0,
      0,
      Math.PI * 2,
      createColor(1, 1, 1, 1),
      createColor(0.5, 0.5, 0.5, 0.4),
  );

  this._carouselPaintingDirty = false;
  return this._updateRepeatedly;
};

Carousel.prototype.render = function(world) {
  if (!this._showCarousel) {
    return;
  }
  if (this._updateRepeatedly || this._carouselPaintingDirty) {
    this.paint();
  }

  world = matrixMultiply3x3(
      makeScale3x3(1 / this.camera().scale()),
      makeTranslation3x3(this._carouselCoords[0], this._carouselCoords[1]),
      world,
  );

  this._fanPainter.render(world);

  // Render the carousel if requested.
  for (const i in this._carouselPlots) {
    if (Object.prototype.hasOwnProperty.call(this._carouselPlots, i)) {
      const carouselData = this._carouselPlots[i];
      const root = carouselData[0];
      root.renderOffscreen(
          this.window(),
          // scale * trans * world
          matrixMultiply3x3(
              makeScale3x3(carouselData[3]),
              matrixMultiply3x3(
                  makeTranslation3x3(carouselData[1], carouselData[2]),
                  world,
              ),
          ),
          1.0,
      );
    }
  }
};
