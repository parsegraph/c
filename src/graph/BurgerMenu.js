import parsegraph_TexturePainter from "./TexturePainter";
import { matrixMultiply3x3I, makeTranslation3x3 } from "../gl";
import parsegraph_Viewport from "./Viewport";

const parsegraph_MENU_ICON_TEXTURE_SIZE = 32;
const parsegraph_MENU_ICON_SIZE = 32;
const parsegraph_MENU_ICON_PADDING = parsegraph_MENU_ICON_SIZE / 2;

const parsegraph_MENU_ICON_MAIN = 0;
const parsegraph_MENU_ICON_UNDO = 1;
const parsegraph_MENU_ICON_REDO = 2;
const parsegraph_MENU_ICON_VSPLIT = 3;
const parsegraph_MENU_ICON_HSPLIT = 4;
const parsegraph_MENU_ICON_RESET_CAMERA = 5;
const parsegraph_MENU_ICON_CLOSE = 6;
const parsegraph_MENU_ICON_DEBUG = 7;

export default function parsegraph_BurgerMenu(viewport) {
  this._viewport = viewport;

  this._iconImage = new Image();
  var that = this;
  this._iconImage.onload = function () {
    that._iconReady = true;
    that.scheduleRepaint();
  };
  this._iconReady = false;
  this._iconImage.src = "/rainback-menu-icons.png";
  this._iconTexture = null;
  this._iconPainter = null;

  this._menuOpened = false;
  this._menuHovered = null;
  this._iconLocations = {};
  this._needsRepaint = true;

  this._textInput = document.createElement("input");
  this._textInput.style.display = "none";
  this._textInput.placeholder = "Search";
  if (!this.window().isOffscreen()) {
    this._viewport.window().container().appendChild(this._textInput);
  }
}

parsegraph_BurgerMenu.prototype.scheduleRepaint = function () {
  //console.log("BurgerMenu is scheduling repaint");
  this._needsRepaint = true;
  this._viewport.scheduleRepaint();
};

parsegraph_BurgerMenu.prototype.scheduleRender = function () {
  //console.log("BurgerMenu is scheduling render");
  this._needsRepaint = true;
  this._viewport.scheduleRender();
};

parsegraph_BurgerMenu.prototype.getIcon = function (x, y) {
  if (y < 0 || y > parsegraph_MENU_ICON_SIZE) {
    return null;
  }
  if (!this._menuOpened) {
    var center = this._viewport.width() / 2;
    if (
      x < center - parsegraph_MENU_ICON_SIZE / 2 ||
      x > center + parsegraph_MENU_ICON_SIZE / 2
    ) {
      return null;
    }
    return parsegraph_MENU_ICON_MAIN;
  }

  // Menu is opened.
  x -= this._viewport.width() / 2;
  for (var iconIndex in this._iconLocations) {
    var iconLocation = this._iconLocations[iconIndex];
    if (
      x < iconLocation - parsegraph_MENU_ICON_SIZE / 2 ||
      x > iconLocation + parsegraph_MENU_ICON_SIZE / 2
    ) {
      continue;
    }
    return iconIndex;
  }
  return null;
};

parsegraph_BurgerMenu.prototype.onMousemove = function (x, y) {
  var iconIndex = this.getIcon(x, y);
  //console.log(iconIndex);
  if (iconIndex === null && this._menuHovered === null) {
    return false;
  }
  if (this._menuHovered == iconIndex) {
    return false;
  }
  console.log("Repainting");
  this.scheduleRepaint();
  this._menuHovered = iconIndex;
  return true;
};

parsegraph_BurgerMenu.prototype.onMousedown = function (x, y) {
  if (y < 0 || y > parsegraph_MENU_ICON_SIZE) {
    return false;
  }
  if (!this._menuOpened) {
    var center = this._viewport.width() / 2;
    if (
      x < center - parsegraph_MENU_ICON_SIZE / 2 ||
      x > center + parsegraph_MENU_ICON_SIZE / 2
    ) {
      return false;
    }
    this._menuOpened = true;
    this.scheduleRepaint();
    return true;
  }

  // Menu is opened.
  x -= this._viewport.width() / 2;
  for (var iconIndex in this._iconLocations) {
    var iconLocation = this._iconLocations[iconIndex];
    if (
      x < iconLocation - parsegraph_MENU_ICON_SIZE / 2 ||
      x > iconLocation + parsegraph_MENU_ICON_SIZE / 2
    ) {
      continue;
    }
    if (iconIndex == parsegraph_MENU_ICON_MAIN) {
      // Hide menu.
      this._menuOpened = false;
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_UNDO) {
      console.log("Undo!");
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_REDO) {
      console.log("Redo!");
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_RESET_CAMERA) {
      this._viewport.input().resetCamera(true);
      this._viewport.scheduleRender();
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_HSPLIT) {
      var newViewport = new parsegraph_Viewport(
        this.window(),
        this._viewport.world()
      );
      newViewport.camera().copy(this._viewport.camera());
      newViewport
        .camera()
        .setSize(
          this._viewport.camera().width(),
          this._viewport.camera().height()
        );
      this.window().addHorizontal(
        newViewport.component(),
        this._viewport.component()
      );
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_VSPLIT) {
      var newViewport = new parsegraph_Viewport(
        this.window(),
        this._viewport.world()
      );
      newViewport.camera().copy(this._viewport.camera());
      newViewport
        .camera()
        .setSize(
          this._viewport.camera().width(),
          this._viewport.camera().height()
        );
      this.window().addVertical(
        newViewport.component(),
        this._viewport.component()
      );
      this.scheduleRepaint();
      return true;
    }
    if (iconIndex == parsegraph_MENU_ICON_CLOSE) {
      console.log("Closing widget");
      this.window().removeComponent(this._viewport.component());
      this._viewport.dispose();
      this.scheduleRepaint();
      return true;
    }
    throw new Error("Unhandled menu icon type: " + iconIndex);
  }
  return false;
};

parsegraph_BurgerMenu.prototype.dispose = function () {
  this._textInput.parentNode.removeChild(this._textInput);
  this._textInput = null;
};

parsegraph_BurgerMenu.prototype.contextChanged = function (isLost) {
  if (this._blockPainter) {
    this._blockPainter.contextChanged(isLost);
  }
};

parsegraph_BurgerMenu.prototype.closeMenu = function () {
  if (!this._menuOpened) {
    return;
  }
  this._menuOpened = false;
  this.scheduleRepaint();
};

parsegraph_BurgerMenu.prototype.drawIcon = function (iconIndex, x, y) {
  if (arguments.length === 2) {
    y = parsegraph_MENU_ICON_SIZE;
  }
  this._iconLocations[iconIndex] = x;
  x -= parsegraph_MENU_ICON_SIZE / 2;
  if (this._menuHovered == iconIndex) {
    this._iconPainter.setAlpha(0.9);
  } else {
    this._iconPainter.setAlpha(0.5);
  }
  this._iconPainter.drawTexture(
    iconIndex * parsegraph_MENU_ICON_TEXTURE_SIZE,
    0, // iconX, iconY
    parsegraph_MENU_ICON_TEXTURE_SIZE,
    parsegraph_MENU_ICON_TEXTURE_SIZE, // iconWidth, iconHeight
    x,
    y,
    parsegraph_MENU_ICON_SIZE,
    -parsegraph_MENU_ICON_SIZE, // width, height
    1
  );
};

parsegraph_BurgerMenu.prototype.paint = function () {
  if (!this._iconReady) {
    return;
  }
  var gl = this.gl();
  if (!this._iconTexture) {
    this._iconTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._iconTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this._iconImage
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
  if (!this._iconPainter) {
    this._iconPainter = new parsegraph_TexturePainter(
      this.window(),
      this._iconTexture,
      parsegraph_MENU_ICON_TEXTURE_SIZE * 8,
      parsegraph_MENU_ICON_TEXTURE_SIZE
    );
  }
  this._iconPainter.clear();
  this._iconPainter.setAlpha(0.5);
  for (var iconIndex in this._iconLocations) {
    this._iconLocations[iconIndex] = null;
  }
  this.drawIcon(parsegraph_MENU_ICON_MAIN, 0);
  if (this._menuOpened) {
    var viewportWidth = this._viewport.width();
    this._iconPainter.setAlpha(0.9);
    var pad = parsegraph_MENU_ICON_PADDING;
    this.drawIcon(parsegraph_MENU_ICON_REDO, -parsegraph_MENU_ICON_SIZE - pad);
    this.drawIcon(
      parsegraph_MENU_ICON_UNDO,
      -2 * parsegraph_MENU_ICON_SIZE - pad
    );
    this.drawIcon(
      parsegraph_MENU_ICON_VSPLIT,
      pad + 2 * parsegraph_MENU_ICON_SIZE
    );
    this.drawIcon(parsegraph_MENU_ICON_HSPLIT, pad + parsegraph_MENU_ICON_SIZE);
    this.drawIcon(
      parsegraph_MENU_ICON_RESET_CAMERA,
      pad + 3 * parsegraph_MENU_ICON_SIZE
    );
    if (this.window().numComponents() > 1) {
      this.drawIcon(
        parsegraph_MENU_ICON_CLOSE,
        viewportWidth - viewportWidth / 2 - parsegraph_MENU_ICON_SIZE / 2
      );
    }
    this._textInput.style.display = "block";
    this._textInput.style.position = "absolute";
    this._textInput.style.width = parsegraph_MENU_ICON_SIZE * 6 + "px";
    this._textInput.style.transform = "translateX(-50%)";
  } else {
    this._textInput.style.display = "none";
  }
  this._needsRepaint = false;
};

parsegraph_BurgerMenu.prototype.render = function () {
  if (!this._iconPainter) {
    return;
  }
  if (this._menuOpened) {
    this._textInput.style.left =
      this._viewport.x() + this._viewport.width() / 2 + "px";
    this._textInput.style.bottom =
      this._viewport.y() +
      this._viewport.height() -
      parsegraph_MENU_ICON_SIZE -
      1.5 * parsegraph_MENU_ICON_PADDING +
      "px";
  }
  var world = this._viewport.camera().projectionMatrix();
  matrixMultiply3x3I(
    world,
    makeTranslation3x3(this._viewport.width() / 2, 0),
    world
  );
  var gl = this.gl();
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  this._iconPainter.render(world);
};

parsegraph_BurgerMenu.prototype.needsRepaint = function () {
  return (this._iconReady && !this._iconTexture) || this._needsRepaint;
};

parsegraph_BurgerMenu.prototype.gl = function () {
  return this._viewport.window().gl();
};

parsegraph_BurgerMenu.prototype.window = function () {
  return this._viewport.window();
};
