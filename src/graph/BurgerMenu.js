import TexturePainter from './TexturePainter';
import {matrixMultiply3x3I, makeTranslation3x3} from '../gl';
import Viewport from './Viewport';

const MENU_ICON_TEXTURE_SIZE = 32;
const MENU_ICON_SIZE = 32;
const MENU_ICON_PADDING = MENU_ICON_SIZE / 2;

const MENU_ICON_MAIN = 0;
const MENU_ICON_UNDO = 1;
const MENU_ICON_REDO = 2;
const MENU_ICON_VSPLIT = 3;
const MENU_ICON_HSPLIT = 4;
const MENU_ICON_RESET_CAMERA = 5;
const MENU_ICON_CLOSE = 6;
const MENU_ICON_DEBUG = 7;
/* eslint-disable require-jsdoc */

export default function BurgerMenu(viewport) {
  this._viewport = viewport;

  this._iconImage = new Image();
  const that = this;
  this._iconImage.onload = function() {
    that._iconReady = true;
    that.scheduleRepaint();
  };
  this._iconReady = false;
  this._iconImage.src = '/rainback-menu-icons.png';
  this._iconTexture = null;
  this._iconPainter = null;

  this._menuOpened = false;
  this._menuHovered = null;
  this._iconLocations = {};
  this._needsRepaint = true;

  this._textInput = document.createElement('input');
  this._textInput.style.display = 'none';
  this._textInput.placeholder = 'Search';
  if (!this.window().isOffscreen()) {
    this._viewport.window().container().appendChild(this._textInput);
  }
}

BurgerMenu.prototype.scheduleRepaint = function() {
  // console.log("BurgerMenu is scheduling repaint");
  this._needsRepaint = true;
  this._viewport.scheduleRepaint();
};

BurgerMenu.prototype.scheduleRender = function() {
  // console.log("BurgerMenu is scheduling render");
  this._needsRepaint = true;
  this._viewport.scheduleRender();
};

BurgerMenu.prototype.getIcon = function(x, y) {
  if (y < 0 || y > MENU_ICON_SIZE) {
    return null;
  }
  if (!this._menuOpened) {
    const center = this._viewport.width() / 2;
    if (
      x < center - MENU_ICON_SIZE / 2 ||
      x > center + MENU_ICON_SIZE / 2
    ) {
      return null;
    }
    return MENU_ICON_MAIN;
  }

  // Menu is opened.
  x -= this._viewport.width() / 2;
  for (const iconIndex in this._iconLocations) {
    const iconLocation = this._iconLocations[iconIndex];
    if (
      x < iconLocation - MENU_ICON_SIZE / 2 ||
      x > iconLocation + MENU_ICON_SIZE / 2
    ) {
      continue;
    }
    return iconIndex;
  }
  return null;
};

BurgerMenu.prototype.onMousemove = function(x, y) {
  const iconIndex = this.getIcon(x, y);
  // console.log(iconIndex);
  if (iconIndex === null && this._menuHovered === null) {
    return false;
  }
  if (this._menuHovered == iconIndex) {
    return false;
  }
  console.log('Repainting');
  this.scheduleRepaint();
  this._menuHovered = iconIndex;
  return true;
};

BurgerMenu.prototype.onMousedown = function(x, y) {
  if (y < 0 || y > MENU_ICON_SIZE) {
    return false;
  }
  if (!this._menuOpened) {
    const center = this._viewport.width() / 2;
    if (
      x < center - MENU_ICON_SIZE / 2 ||
      x > center + MENU_ICON_SIZE / 2
    ) {
      return false;
    }
    this._menuOpened = true;
    this.scheduleRepaint();
    return true;
  }

  // Menu is opened.
  x -= this._viewport.width() / 2;
  for (const iconIndex in this._iconLocations) {
    if (Object.prototype.hasOwnProperty.call(this._iconLocations, iconIndex)) {
      const iconLocation = this._iconLocations[iconIndex];
      if (
        x < iconLocation - MENU_ICON_SIZE / 2 ||
        x > iconLocation + MENU_ICON_SIZE / 2
      ) {
        continue;
      }
    }
    if (iconIndex == MENU_ICON_MAIN) {
      // Hide menu.
      this._menuOpened = false;
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == MENU_ICON_UNDO) {
      console.log('Undo!');
      return true;
    }
    if (iconIndex == MENU_ICON_REDO) {
      console.log('Redo!');
      return true;
    }
    if (iconIndex == MENU_ICON_RESET_CAMERA) {
      this._viewport.input().resetCamera(true);
      this._viewport.scheduleRender();
      return true;
    }
    if (iconIndex == MENU_ICON_HSPLIT) {
      const newViewport = new Viewport(
          this.window(),
          this._viewport.world(),
      );
      newViewport.camera().copy(this._viewport.camera());
      newViewport
          .camera()
          .setSize(
              this._viewport.camera().width(),
              this._viewport.camera().height(),
          );
      this.window().addHorizontal(
          newViewport.component(),
          this._viewport.component(),
      );
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == MENU_ICON_VSPLIT) {
      const newViewport = new Viewport(
          this.window(),
          this._viewport.world(),
      );
      newViewport.camera().copy(this._viewport.camera());
      newViewport
          .camera()
          .setSize(
              this._viewport.camera().width(),
              this._viewport.camera().height(),
          );
      this.window().addVertical(
          newViewport.component(),
          this._viewport.component(),
      );
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == MENU_ICON_CLOSE) {
      console.log('Closing widget');
      this.window().removeComponent(this._viewport.component());
      this._viewport.dispose();
      this.scheduleRepaint();
      return true;
    }
    throw new Error('Unhandled menu icon type: ' + iconIndex);
  }
  return false;
};

BurgerMenu.prototype.dispose = function() {
  this._textInput.parentNode.removeChild(this._textInput);
  this._textInput = null;
};

BurgerMenu.prototype.contextChanged = function(isLost) {
  if (this._blockPainter) {
    this._blockPainter.contextChanged(isLost);
  }
};

BurgerMenu.prototype.closeMenu = function() {
  if (!this._menuOpened) {
    return;
  }
  this._menuOpened = false;
  this.scheduleRepaint();
};

BurgerMenu.prototype.drawIcon = function(iconIndex, x, y) {
  if (arguments.length === 2) {
    y = MENU_ICON_SIZE;
  }
  this._iconLocations[iconIndex] = x;
  x -= MENU_ICON_SIZE / 2;
  if (this._menuHovered == iconIndex) {
    this._iconPainter.setAlpha(0.9);
  } else {
    this._iconPainter.setAlpha(0.5);
  }
  this._iconPainter.drawTexture(
      iconIndex * MENU_ICON_TEXTURE_SIZE,
      0, // iconX, iconY
      MENU_ICON_TEXTURE_SIZE,
      MENU_ICON_TEXTURE_SIZE, // iconWidth, iconHeight
      x,
      y,
      MENU_ICON_SIZE,
      -MENU_ICON_SIZE, // width, height
      1,
  );
};

BurgerMenu.prototype.paint = function() {
  if (!this._iconReady) {
    return;
  }
  const gl = this.gl();
  if (!this._iconTexture) {
    this._iconTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._iconTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this._iconImage,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  if (!this._iconPainter) {
    this._iconPainter = new TexturePainter(
        this.window(),
        this._iconTexture,
        MENU_ICON_TEXTURE_SIZE * 8,
        MENU_ICON_TEXTURE_SIZE,
    );
  }
  this._iconPainter.clear();
  this._iconPainter.setAlpha(0.5);
  for (const iconIndex in this._iconLocations) {
    if (Object.prototype.hasOwnProperty.call(this._iconLocations, iconIndex)) {
      this._iconLocations[iconIndex] = null;
    }
  }
  this.drawIcon(MENU_ICON_MAIN, 0);
  if (this._menuOpened) {
    const viewportWidth = this._viewport.width();
    this._iconPainter.setAlpha(0.9);
    const pad = MENU_ICON_PADDING;
    this.drawIcon(MENU_ICON_REDO, -MENU_ICON_SIZE - pad);
    this.drawIcon(
        MENU_ICON_UNDO,
        -2 * MENU_ICON_SIZE - pad,
    );
    this.drawIcon(
        MENU_ICON_VSPLIT,
        pad + 2 * MENU_ICON_SIZE,
    );
    this.drawIcon(MENU_ICON_HSPLIT, pad + MENU_ICON_SIZE);
    this.drawIcon(
        MENU_ICON_RESET_CAMERA,
        pad + 3 * MENU_ICON_SIZE,
    );
    if (this.window().numComponents() > 1) {
      this.drawIcon(
          MENU_ICON_CLOSE,
          viewportWidth - viewportWidth / 2 - MENU_ICON_SIZE / 2,
      );
    }
    this._textInput.style.display = 'block';
    this._textInput.style.position = 'absolute';
    this._textInput.style.width = MENU_ICON_SIZE * 6 + 'px';
    this._textInput.style.transform = 'translateX(-50%)';
  } else {
    this._textInput.style.display = 'none';
  }
  this._needsRepaint = false;
};

BurgerMenu.prototype.render = function() {
  if (!this._iconPainter) {
    return;
  }
  if (this._menuOpened) {
    this._textInput.style.left =
      this._viewport.x() + this._viewport.width() / 2 + 'px';
    this._textInput.style.bottom =
      this._viewport.y() +
      this._viewport.height() -
      MENU_ICON_SIZE -
      1.5 * MENU_ICON_PADDING +
      'px';
  }
  const world = this._viewport.camera().projectionMatrix();
  matrixMultiply3x3I(
      world,
      makeTranslation3x3(this._viewport.width() / 2, 0),
      world,
  );
  const gl = this.gl();
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  this._iconPainter.render(world);
};

BurgerMenu.prototype.needsRepaint = function() {
  return (this._iconReady && !this._iconTexture) || this._needsRepaint;
};

BurgerMenu.prototype.gl = function() {
  return this._viewport.window().gl();
};

BurgerMenu.prototype.window = function() {
  return this._viewport.window();
};
