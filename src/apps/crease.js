function parsegraph_CreaseWidget(belt, world) {
  const caret = new parsegraph_Caret(parsegraph_BUD);
  this._belt = belt;
  this._world = world;

  this._root = caret.root();
  const rs = parsegraph_copyStyle(parsegraph_BUD);
  rs.minWidth *= 20;
  rs.minHeight *= 20;
  rs.borderRoundness *= 18;
  rs.borderThickness *= 20;
  this._root.setBlockStyle(rs);

  const addActions = function(id) {
    const node = caret.node();
    node.setLabel(id, parsegraph_defaultFont());
    let uninstall = null;
    let reinstall;
    reinstall = function() {
      if (uninstall) {
        uninstall();
      }
      const carousel = new parsegraph_ActionCarousel();
      if (node.value().startTime) {
        carousel.addAction('Stop', function() {
          node.value().startTime = false;
          const s = parsegraph_copyStyle(parsegraph_BLOCK);
          node.setBlockStyle(s);
          reinstall();
        });
      } else {
        carousel.addAction('Grow', function() {
          node.value().startTime = new Date();
          reinstall();
        });
      }
      carousel.addAction('Crease', function() {
        node.setPaintGroup(true);
        reinstall();
      });
      carousel.addAction('Uncrease', function() {
        node.setPaintGroup(false);
        reinstall();
      });
      const changeCrease = function(creased) {
        let dir;
        switch (id) {
          case 'Center':
            dir = parsegraph_DOWNWARD;
            break;
          case 'Forward':
            dir = parsegraph_FORWARD;
            break;
          case 'Backward':
            dir = parsegraph_BACKWARD;
            break;
        }
        for (let n = node; n; n = n.nodeAt(dir)) {
          n.setPaintGroup(creased);
        }
      };
      carousel.addAction('Crease all', function() {
        changeCrease(true);
      });
      carousel.addAction('Uncrease all', function() {
        changeCrease(false);
      });
      const uninstallCarousel = carousel.install(node);
      belt.scheduleUpdate();
      world.scheduleRepaint();
      return function() {
        uninstallCarousel();
      };
    };
    node.setValue({
      reinstall: reinstall,
      startTime: false,
    });
    uninstall = reinstall();
  };

  this.creasables = [];
  const size = 50;
  caret.pull('d');

  caret.push();
  for (var i = 0; i < size; ++i) {
    caret.spawnMove('d', 'b');
    addActions('Center');
    caret.node()._id = 'Center ' + i;
    this.creasables.push(caret.node());
  }
  caret.pop();
  caret.push();
  for (var i = 0; i < size; ++i) {
    caret.spawnMove('b', 'b');
    addActions('Backward');
    caret.node()._id = 'Backward ' + i;
    this.creasables.push(caret.node());
  }
  caret.pop();
  caret.push();
  for (var i = 0; i < size; ++i) {
    caret.spawnMove('f', 'b');
    addActions('Forward');
    caret.node()._id = 'Forward ' + i;
    this.creasables.push(caret.node());
  }
  caret.pop();

  const rootActions = new parsegraph_ActionCarousel();
  rootActions.addAction(
      'Crease random',
      function() {
        for (const i in this.creasables) {
          const n = this.creasables[i];
          n.setPaintGroup(Math.random() > 0.5);
        }
      },
      this,
  );
  rootActions.addAction(
      'Grow all',
      function() {
        for (const i in this.creasables) {
          const n = this.creasables[i];
          n.value().startTime = Math.random() > 0.5 ? new Date() : false;
          n.value().reinstall();
        }
      },
      this,
  );
  rootActions.install(caret.node());
}

parsegraph_CreaseWidget.prototype.tick = function() {
  let animating = false;
  for (let i = 0; i < this.creasables.length; ++i) {
    const node = this.creasables[i];
    if (!node.value().startTime) {
      continue;
    }
    animating = true;
    const startTime = node.value().startTime;
    const s = parsegraph_copyStyle(parsegraph_BLOCK);
    if (node.parentDirection() === parsegraph_UPWARD) {
      s.verticalPadding =
        10 *
        parsegraph_BUD_RADIUS *
        (1 + Math.sin(parsegraph_elapsed(startTime) / 1000));
    } else {
      s.horizontalPadding =
        10 *
        parsegraph_BUD_RADIUS *
        (1 + Math.sin(parsegraph_elapsed(startTime) / 1000));
    }
    node.setBlockStyle(s);
  }
  return animating;
};

parsegraph_CreaseWidget.prototype.node = function() {
  return this._root;
};
