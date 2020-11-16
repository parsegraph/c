function parsegraph_AudioKeyboard(camera) {
  this._camera = camera;

  if (arguments.length > 1) {
    this._worldX = arguments[1];
    this._worldY = arguments[2];
    this._userScale = arguments[3];
  } else {
    this._worldX = 0;
    this._worldY = 0;
    this._userScale = 1;
  }
  this._paintingDirty = true;
}

parsegraph_AudioKeyboard.prototype.prepared = function() {
  return !!this._gl;
};

parsegraph_AudioKeyboard.prototype.prepare = function(
    gl,
    glyphAtlas,
    shaders,
) {
  this._gl = gl;
  this._glyphAtlas = glyphAtlas;
  this._shaders = shaders;
};

parsegraph_AudioKeyboard.prototype.paint = function() {
  if (!this._paintingDirty) {
    return;
  }
  const white = new parsegraph_Color(1, 1, 1, 1);
  const highlight = 0.2;
  const whiteBorder = new parsegraph_Color(
      1 - highlight,
      1 - highlight,
      1 - highlight,
      1,
  );
  const black = new parsegraph_Color(0, 0, 0, 1);
  const blackBorder = new parsegraph_Color(
      2 * highlight,
      2 * highlight,
      2 * highlight,
      1,
  );
  if (!this._whiteKeyPainter) {
    this._whiteKeyPainter = new parsegraph_BlockPainter(
        this._gl,
        this._shaders,
    );
    this._whiteKeyPainter.setBorderColor(whiteBorder);
    this._whiteKeyPainter.setBackgroundColor(white);
  } else {
    this._whiteKeyPainter.clear();
  }
  if (!this._blackKeyPainter) {
    this._blackKeyPainter = new parsegraph_BlockPainter(
        this._gl,
        this._shaders,
    );
    this._blackKeyPainter.setBorderColor(blackBorder);
    this._blackKeyPainter.setBackgroundColor(black);
  } else {
    this._blackKeyPainter.clear();
  }

  const maxKeys = 1000;
  this._whiteKeyPainter.initBuffer(maxKeys);
  this._blackKeyPainter.initBuffer(maxKeys);

  const borderRoundedess = 2;
  const borderThickness = 2;

  const whiteKeyWidth = 36;
  const whiteKeyHeight = 210;
  for (var i = 0; i < maxKeys; ++i) {
    this._whiteKeyPainter.drawBlock(
        this._worldX + whiteKeyWidth * i + whiteKeyWidth / 2,
        this._worldY + whiteKeyHeight / 2,
        whiteKeyWidth,
        whiteKeyHeight,
        borderRoundedess,
        borderThickness,
        this._userScale,
    );
  }

  const blackKeyWidth = 22.5;
  const blackKeyHeight = 138;
  for (var i = 0; i < maxKeys; ++i) {
    if (i == maxKeys - 1) {
      continue;
    }
    const wx = this._worldX + whiteKeyWidth * (i + 0.5);
    let kx = 0;
    switch (i % 7) {
      case 0:
        kx = wx + blackKeyWidth * (25 / 36);
        break;
      case 1:
        kx = wx + blackKeyWidth * (34 / 36);
        break;
      case 2:
        continue;
      case 3:
        kx = wx + blackKeyWidth * (20.5 / 36);
        break;
      case 4:
        kx = wx + blackKeyWidth * (28.5 / 36);
        break;
      case 5:
        kx = wx + blackKeyWidth * (36 / 36);
        break;
      case 6:
        continue;
    }
    this._blackKeyPainter.drawBlock(
        kx,
        this._worldY + blackKeyHeight / 2,
        blackKeyWidth,
        blackKeyHeight,
        borderRoundedess,
        borderThickness,
        this._userScale,
    );
  }
  this._paintingDirty = false;
};

parsegraph_AudioKeyboard.prototype.setOrigin = function(x, y) {
  this._worldX = x;
  this._worldY = y;

  if (Number.isNaN(this._worldX)) {
    throw new Error('WorldX must not be NaN.');
  }
  if (Number.isNaN(this._worldY)) {
    throw new Error('WorldY must not be NaN.');
  }
};

parsegraph_AudioKeyboard.prototype.setScale = function(scale) {
  this._userScale = scale;
  if (Number.isNaN(this._userScale)) {
    throw new Error('Scale must not be NaN.');
  }
};

parsegraph_AudioKeyboard.prototype.render = function(world, scale) {
  this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
  // this._gl.disable(this._gl.DEPTH_TEST);
  // this._gl.disable(this._gl.BLEND);
  this._whiteKeyPainter.render(world, scale);
  this._blackKeyPainter.render(world, scale);
};
