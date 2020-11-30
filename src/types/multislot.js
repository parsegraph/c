/* eslint-disable require-jsdoc */

export default function Multislot(room, rowSize, columnSize, color, subtype) {
  this._room = room;
  this._plots = [];
  this._id = null;

  const car = new Caret('b');
  this._root = car.node();
  this._size = rowSize * columnSize;
  this._columnSize = columnSize;
  this._rowSize = rowSize;
  this._color = color;

  this.build(car, subtype);

  const multislotActions = new ActionCarousel();
  multislotActions.addAction(
      'Edit',
      function() {
        this.room().togglePermissions(this.id());
      },
      this,
  );
  multislotActions.install(this.node());

  this._root.label(subtype);
}

Multislot.prototype.setId = function(id) {
  if (this._id) {
    this.room().removeItemListener(this._id, this.onItemEvent, this);
  }
  this._id = id;
  if (this._id) {
    this.room().addItemListener(this._id, this.onItemEvent, this);
  }
};

Multislot.prototype.onItemEvent = function(obj) {
  if (!this.id()) {
    return;
  }
  if (obj.event === 'pushListItem' && obj.list_id === this.id()) {
    const item = obj.item;
    if (item.type === 'multislot::plot') {
      const itemData = JSON.parse(item.value);
      const plot = this.getPlot(itemData[0]);
      if (!plot) {
        throw new Error('Plot not found');
      }
      plot.setId(obj.item_id);
    }
  }
};

Multislot.prototype.id = function() {
  return this._id;
};

Multislot.prototype.color = function() {
  return this._color;
};

Multislot.prototype.node = function() {
  return this._root;
};

Multislot.prototype.room = function() {
  return this._room;
};

Multislot.prototype.scheduleUpdate = function() {
  return this.room().scheduleRepaint();
};

Multislot.prototype.getPlot = function(index) {
  return this._plots[index];
};

Multislot.prototype.build = function(car, subtype) {
  // console.log("Subtype=" + subtype);
  const plotListener = function(ev) {
    const node = this;
    switch (ev.event) {
      case 'pushListItem':
        const child = ev.item;
        const car = new Caret(node);
        this.room().spawn(car, child);
        this.scheduleUpdate();
        break;
    }
  };

  const spawnPlot = function() {
    const index = this._plots.length;
    const plot = new MultislotPlot(this, index);
    this._plots.push(plot);
    return plot;
  };

  const cs = copyStyle('u');
  cs.backgroundColor = new Color(0.8);
  cs.borderColor = new Color(0.6);

  const us = copyStyle('u');
  us.backgroundColor = this._color;
  const bs = copyStyle('b');
  bs.backgroundColor = this._color;

  this._root.setLabel(subtype);
  if (subtype === 0) {
    const index = 0;
    for (let y = 0; y < this._columnSize; ++y) {
      if (y === 0) {
        car.pull('d');
        car.align('d', ALIGN_CENTER);
        car.spawnMove('d', 'u');
        car.shrink();
      } else {
        car.spawnMove('d', 'u');
      }
      car.pull('f');
      car.replace('u');
      car.node().setBlockStyle(cs);
      if (y === 0) {
        car.shrink();
      }
      car.push();
      for (let x = 0; x < this._rowSize; ++x) {
        const plot = spawnPlot.call(this);
        car.connect('f', plot.node());
        car.move('f');
        // console.log(x + ", " + y);
      }
      car.pop();
      FIT_LOOSE && car.fitLoose();
      CREASE && car.crease();
    }
  } else if (subtype === 1) {
    const index = 0;
    car.align('d', 'c');
    car.pull('d');
    car.spawnMove('d', 'u');

    for (let y = 0; y < this._columnSize; ++y) {
      if (y === 0) {
        // car.align('d', ALIGN_CENTER);
        car.shrink();
      } else {
        car.spawnMove('f', 'u');
      }
      car.replace('u');
      car.node().setBlockStyle(cs);
      if (y === 0) {
        car.shrink();
      }
      car.push();
      for (let x = 0; x < this._rowSize; ++x) {
        car.spawnMove('d', 'u');
        car.replace('u');
        car.node().setBlockStyle(cs);
        car.pull('f');
        const plot = spawnPlot.call(this);
        car.connect('f', plot.node());
      }
      car.pop();
      car.pull('d');
      FIT_LOOSE && car.fitLoose();
      CREASE && car.crease();
    }
  } else if (subtype === 2) {
    car.align('d', 'c');
    car.pull('d');
    // car.spawnMove('d', 'u');
    const index = 0;

    for (let y = 0; y < this._columnSize; ++y) {
      if (y === 0) {
        car.align('d', ALIGN_CENTER);
        car.spawnMove('d', 'u');
        car.shrink();
      } else {
        car.spawnMove('f', 'u');
      }
      car.node().setBlockStyle(cs);
      if (y === 0) {
        car.shrink();
      }
      car.push();
      for (let x = 0; x < this._rowSize; ++x) {
        car.spawnMove('d', 's');
        car.node().setBlockStyle(cs);
        const plot = spawnPlot.call(this);
        car.connect('f', plot.node());
        car.pull('f');
      }
      car.pop();
      car.pull('d');
      FIT_LOOSE && car.fitLoose();
      CREASE && car.crease();
    }
  } else if (subtype === 3) {
    car.align('d', 'c');
    car.pull('d');
    // car.spawnMove('d', 'u');

    const index = 0;
    for (let y = 0; y < this._columnSize; ++y) {
      if (y === 0) {
        car.align('d', ALIGN_CENTER);
        car.spawnMove('d', 'u');
        car.shrink();
      } else {
        car.spawnMove('f', 'u');
      }
      car.node().setBlockStyle(cs);
      if (y === 0) {
        car.shrink();
      }
      car.push();
      for (let x = 0; x < this._rowSize; ++x) {
        car.spawnMove('d', 's');
        car.node().setBlockStyle(cs);
        car.pull('b');
        const plot = spawnPlot.call(this);
        car.connect('b', plot.node());
      }
      car.pop();
      car.pull('d');
      FIT_LOOSE && car.fitLoose();
      CREASE && car.crease();
    }
  } else if (subtype === 4) {
    const index = 0;
    for (let y = 0; y < this._columnSize; ++y) {
      if (y === 0) {
        car.pull('d');
        car.align('d', ALIGN_CENTER);
        car.spawnMove('d', 'u');
        car.shrink();
      } else {
        car.spawnMove('d', 'u');
      }
      car.pull('b');
      car.replace('u');
      car.node().setBlockStyle(cs);
      if (y === 0) {
        car.shrink();
      }
      car.push();
      for (let x = 0; x < this._rowSize; ++x) {
        car.spawnMove('b', 's');
        car.node().setBlockStyle(cs);
        const plot = spawnPlot.call(this);
        car.connect('d', plot.node());
        car.pull('d');
        console.log(x + ', ' + y);
      }
      car.pop();
      FIT_LOOSE && car.fitLoose();
      CREASE && car.crease();
    }
  } else {
    throw new Error('Subtype not recognized');
  }
};

listClasses.multislot = {
  spawnItem: function(room, value, children, id) {
    const params = JSON.parse(value);
    const subtype = params[0];
    const rowSize = params[1];
    const columnSize = params[2];
    const color = new Color(
        params[3] / 255,
        params[4] / 255,
        params[5] / 255,
    );
    const multislot = new Multislot(
        room,
        rowSize,
        columnSize,
        color,
        subtype,
    );
    multislot.setId(id);
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      console.log(child);
      if (child.type === 'multislot::plot') {
        const plotData = JSON.parse(child.value);
        const plot = multislot.getPlot(plotData[0]);
        plot.setId(child.id);
        if (child.username) {
          plot.claim(child.username);
        }
        console.log(child);
      } else {
        throw new Error('Unexpected type: ' + child.type);
      }
    }
    return multislot;
  },
};
