import {parsegraph_defaultFont} from './settings';
import {timediffMs} from '../timing';
import Color from './Color';
import parsegraph_Label from './Label';
import parsegraph_GlyphPainter from './GlyphPainter';
import BlockPainter from './BlockPainter';

export default function parsegraph_CameraBoxPainter(window) {
  this._blockPainter = new BlockPainter(window);
  this._glyphPainter = new parsegraph_GlyphPainter(
      window,
      parsegraph_defaultFont(),
  );

  this._borderColor = new Color(1, 1, 1, 0.1);
  this._backgroundColor = new Color(1, 1, 1, 0.1);
  this._textColor = new Color(1, 1, 1, 1);
  this._fontSize = 24;
}

parsegraph_CameraBoxPainter.prototype.contextChanged = function(isLost) {
  if (!isLost) {
    return;
  }
  this._blockPainter.contextChanged(isLost);
  this._glyphPainter.contextChanged(isLost);
};

parsegraph_CameraBoxPainter.prototype.clear = function() {
  this._glyphPainter.clear();
  this._blockPainter.clear();
};

parsegraph_CameraBoxPainter.prototype.drawBox = function(
    name,
    rect,
    scale,
    mouseX,
    mouseY,
    when,
) {
  const painter = this._blockPainter;

  const now = new Date();
  const diff = timediffMs(when, now);
  const zc = new Color(0, 0, 0, 0);
  let interp = 1;
  const fadeDelay = 500;
  const fadeLength = 1000;
  if (diff > fadeDelay) {
    interp = 1 - (diff - fadeDelay) / fadeLength;
  }
  this._borderColor.setA(0.1 * interp);
  this._backgroundColor.setA(0.1 * interp);
  painter.setBorderColor(this._borderColor);
  painter.setBackgroundColor(this._backgroundColor);
  this._glyphPainter.color().setA(interp);
  this._glyphPainter.backgroundColor().setA(interp);

  painter.drawBlock(
      rect.x(),
      rect.y(),
      rect.width(),
      rect.height(),
      0.01,
      0.1,
      scale,
  );
  const font = this._glyphPainter.font();
  const label = new parsegraph_Label(font);
  label.setText(name);
  const lw = (label.width() * (this._fontSize / font.fontSize())) / scale;
  const lh = (label.height() * (this._fontSize / font.fontSize())) / scale;

  if (mouseX === undefined) {
    mouseX = rect.width() / 2 - lw;
  }
  if (mouseY === undefined) {
    mouseY = 0;
  }
  if (mouseX < 0) {
    mouseX = 0;
  }
  mouseX = Math.min(mouseX, rect.width());
  mouseY = Math.min(mouseY, rect.height());
  if (mouseY < 0) {
    mouseY = 0;
  }

  label.paint(
      this._glyphPainter,
      rect.x() - lw / 2 - rect.width() / 2 + mouseX / scale,
      rect.y() - lh / 2 - rect.height() / 2 + mouseY / scale,
      this._fontSize / font.fontSize() / scale,
  );

  return interp > 0;
};

parsegraph_CameraBoxPainter.prototype.render = function(world, scale) {
  this._blockPainter.render(world, scale);
  this._glyphPainter.render(world, scale);
};
