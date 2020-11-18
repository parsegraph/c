const parsegraph_TestSuite = require('./TestSuite');

function parsegraph_ArrayList() {
  this.data = [];
  this._length = 0;
}

parsegraph_ArrayList.prototype.clear = function() {
  this._length = 0;
};

parsegraph_ArrayList.prototype.length = function() {
  return this._length;
};

parsegraph_ArrayList.prototype.slice = function() {
  return this.data.slice(0, this._length);
};

parsegraph_ArrayList.prototype.concat = function(other) {
  for (let i = 0; i < other.length(); ++i) {
    this.push(other.at(i));
  }
};

parsegraph_ArrayList.prototype.push = function() {
  for (let i = 0; i < arguments.length; ++i) {
    if (this._length == this.data.length) {
      this.data.push(arguments[i]);
    } else {
      this.data[this._length] = arguments[i];
    }
    this._length++;
  }
};

parsegraph_ArrayList.prototype.at = function(i) {
  if (i >= this._length || i < 0) {
    throw new Error('Index out of bounds: ' + i);
  }
  return this.data[i];
};

const parsegraph_ArrayList_Tests = new parsegraph_TestSuite(
    'parsegraph_ArrayList',
);

parsegraph_ArrayList_Tests.addTest('new parsegraph_ArrayList', function() {
  const l = new parsegraph_ArrayList();
});

module.exports = parsegraph_ArrayList;
