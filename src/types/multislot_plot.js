/* eslint-disable require-jsdoc */

export default function MultislotPlot(multislot, index) {
  this._index = index;
  this._multislot = multislot;
  this._version = 0;
  this._id = null;

  const car = new Caret('s');
  this._root = car.node();
  const bs = copyStyle('s');
  bs.backgroundColor = multislot.color();
  this._unclaimedStyle = bs;
  this._root.setBlockStyle(bs);

  this._claimedStyle = copyStyle('s');
  this._claimedStyle.backgroundColor = new Color(1, 1, 1);

  car.spawn('d', 'u');
  car.pull('d');
  car.move('d');

  this._unclaimedActions = new ActionCarousel();
  this._unclaimedActions.addAction(
      'Claim',
      function() {
        const room = this._multislot.room();
        const username = room.username();
        if (!username) {
          throw new Error('Room must have a valid username');
        }
        this.room().submit(new ClaimPlotAction(this, username));
      },
      this,
  );
  this._actionRemover = this._unclaimedActions.install(car.node());
  car.move('u');

  const addDefaultActions = function(carousel) {
    carousel.addAction(
        'Edit',
        function() {
          this.room().togglePermissions(this.id());
        },
        this,
    );
    carousel.addAction(
        'Unclaim',
        function() {
          const room = this._multislot.room();
          this.room().submit(new UnclaimPlotAction(this));
          return room;
        },
        this,
    );
  };
  this._populatedActions = new ActionCarousel();
  addDefaultActions.call(this, this._populatedActions);

  this._claimedActions = new ActionCarousel();
  this._claimedActions.addAction(
      'Lisp',
      function(plotId) {
        pushListItem(this.room(), plotId, 'lisp', '');
      },
      this,
  );
  addDefaultActions.call(this, this._claimedActions);
}

MultislotPlot.prototype.setId = function(id) {
  console.log('ID set for plot');
  this._id = id;
};

MultislotPlot.prototype.id = function() {
  return this._id;
};

MultislotPlot.prototype.claimant = function() {
  const claimant = this._root.label();
  if (claimant === '') {
    return null;
  }
  return claimant;
};

MultislotPlot.prototype.claim = function(name) {
  this._root.setLabel(name);
  this._root.setBlockStyle(this._claimedStyle);
  this.room().scheduleUpdate();
  this._actionRemover();
  this._actionRemover = this._claimedActions.install(
      this._root.nodeAt(DOWNWARD),
  );
};

MultislotPlot.prototype.populate = function(item) {};

MultislotPlot.prototype.depopulate = function() {
  const content = this._content;
  this._root.disconnectNode(DOWNWARD);
  const node = this._root.spawnNode(DOWNWARD, BUD);
  return node;
  this._content = null;
  return content;
};

MultislotPlot.prototype.unclaim = function() {
  this._actionRemover();
  this._root.disconnectNode(DOWNWARD);
  this._root.setLabel('');
  const node = this._root.spawnNode(DOWNWARD, BUD);
  this._actionRemover = this._unclaimedActions.install(node);
  this._root.setBlockStyle(this._unclaimedStyle);
  this.room().scheduleUpdate();
};

MultislotPlot.prototype.multislot = function() {
  return this._multislot;
};

MultislotPlot.prototype.room = function() {
  return this._multislot.room();
};

MultislotPlot.prototype.version = function() {
  return this._version;
};

MultislotPlot.prototype.nextVersion = function() {
  return ++this._version;
};

MultislotPlot.prototype.index = function() {
  return this._index;
};

MultislotPlot.prototype.node = function() {
  return this._root;
};

export default function ClaimPlotAction(plot, username) {
  this._plot = plot;
  this._username = username;
  this._originalClaimant = null;
}

ClaimPlotAction.prototype.setListener = function(cb, cbThisArg) {
  if (this._listener) {
    console.log('Refusing to overwrite existing listener');
    console.log('Original listener:');
    console.log(this._listener, this._listenerThisArg);
    console.log('New listener:');
    console.log(cb, cbThisArg);
    throw new Error('Refusing to overwrite existing listener');
  }
  this._listener = cb;
  this._listenerThisArg = cbThisArg;
};

ClaimPlotAction.prototype.room = function() {
  return this._plot.room();
};

ClaimPlotAction.prototype.multislot = function() {
  return this._plot.multislot();
};

ClaimPlotAction.prototype.advance = function() {
  const multislotId = this.room().getId(this.multislot());
  if (multislotId === null) {
    return false;
  }
  this._originalClaimant = this._plot.claimant();
  this._version = this._plot.version();
  this._plot.claim(this._username);
  this.room().pushListItem(
      multislotId,
      'multislot::plot',
      [this._plot.index(), 1],
      this.receive,
      this,
  );
  return true;
};

ClaimPlotAction.prototype.reverse = function() {
  if (this._plot.version() !== this._version) {
    // Preempted.
    return false;
  }
  if (this._originalClaimant) {
    this._plot.claim(this._originalClaimant);
  } else {
    this._plot.unclaim();
  }
  return true;
};

ClaimPlotAction.prototype.receive = function(err, resp) {
  if (err) {
    this.reverse();
  } else {
    this._plot.nextVersion();
  }
  if (this._listener) {
    this._listener.call(this._listenerThisArg);
  }
};

export default function UnclaimPlotAction(plot) {
  this._plot = plot;
  this._originalClaimant = null;
}

UnclaimPlotAction.prototype.setListener = function(cb, cbThisArg) {
  if (this._listener) {
    throw new Error('Refusing to overwrite existing listener');
  }
  this._listener = cb;
  this._listenerThisArg = cbThisArg;
};

UnclaimPlotAction.prototype.room = function() {
  return this._plot.room();
};

UnclaimPlotAction.prototype.multislot = function() {
  return this._plot.multislot();
};

UnclaimPlotAction.prototype.advance = function() {
  const multislotId = this.room().getId(this.multislot());
  if (multislotId === null) {
    return false;
  }
  this._originalClaimant = this._plot.claimant();
  this._version = this._plot.version();
  this._plot.unclaim();
  this.room().destroyListItem(this._plot.id(), this.receive, this);
  return true;
};

UnclaimPlotAction.prototype.reverse = function() {
  if (this._plot.version() !== this._version) {
    // Preempted.
    return false;
  }
  if (this._originalClaimant) {
    this._plot.claim(this._originalClaimant);
  } else {
    this._plot.unclaim();
  }
  return true;
};

UnclaimPlotAction.prototype.receive = function(err, resp) {
  if (err) {
    this.reverse();
  } else {
    this._plot.nextVersion();
  }
  if (this._listener) {
    this._listener.call(this._listenerThisArg);
  }
};
