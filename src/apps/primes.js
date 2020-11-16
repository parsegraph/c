import parsegraph_Caret from '../graph/Caret';
import parsegraph_ActionCarousel from '../parsegraph_ActionCarousel';
import {
  parsegraph_cloneStyle,
  parsegraph_SLOT_MATH_STYLE,
} from '../graph/NodeStyle';
import {Type, Direction} from '../graph/Node';
import parsegraph_Color from '../graph/Color';

export default function parsegraph_PrimesWidget(world) {
  this._world = world;

  this.knownPrimes = [];
  this.position = 2;

  this.caret = new parsegraph_Caret(Type.BLOCK);
  this.caret.setMathMode(true);
  this.caret.setWorld(this._world);
  this.caret.label('1');

  const carousel = new parsegraph_ActionCarousel();
  carousel.addAction(
      'Pause',
      function() {
        this._paused = !this._paused;
      },
      this,
  );
  carousel.install(this.caret.node());
}

parsegraph_PrimesWidget.prototype.world = function() {
  return this._world;
};

parsegraph_PrimesWidget.prototype.isPaused = function() {
  return this._paused;
};

parsegraph_PrimesWidget.prototype.step = function() {
  // console.log("Stepping primes widget");
  // Check if any known prime is a multiple of the current position.
  this.caret.spawnMove('f', 'b');
  this.caret.label(this.position);
  this.caret.node()._id = this.position;
  this.caret.push();
  this.caret.pull('u');
  this.caret.crease();
  const freeze = false;
  freeze && this.caret.freeze();
  let isPrime = true;

  function addHighlights(dir) {
    const carousel = new parsegraph_ActionCarousel();
    const world = this.world();
    carousel.addAction(
        'Highlight',
        function() {
          const bs = parsegraph_cloneStyle(parsegraph_SLOT_MATH_STYLE);
          bs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
          for (let n = this; n; n = n.nodeAt(dir)) {
            if (n.type() === Type.SLOT) {
              n.setBlockStyle(bs);
            }
          }
          console.log('Highlighted node ' + this.label());
          world.scheduleRepaint();
        },
        this.caret.node(),
    );
    carousel.addAction(
        'Unhighlight',
        function() {
          const bs = parsegraph_cloneStyle(parsegraph_SLOT_MATH_STYLE);
          for (let n = this; n; n = n.nodeAt(dir)) {
            if (n.type() === Type.SLOT) {
              n.setBlockStyle(bs);
            }
          }
          console.log('Unhighlighted node ' + this.label());
          world.scheduleRepaint();
        },
        this.caret.node(),
    );
    carousel.install(this.caret.node());
  }

  for (let i = 0; i < this.knownPrimes.length; ++i) {
    const prime = this.knownPrimes[i];
    const modulus = prime.calculate(this.position);
    if (modulus == 0) {
      // It's a multiple, so there's no chance for primality.
      this.caret.spawnMove('u', 'b');
      this.caret.label(prime.frequency);
      isPrime = false;
    } else {
      this.caret.spawnMove('u', 's');
    }
    this.caret.node()._id = this.position + ':' + prime.frequency;
    if (i === 0) {
      this.caret.crease();
      freeze && this.caret.freeze();
    }
  }
  if (isPrime) {
    // The position is prime, so output it and add it to the list.
    this.caret.spawnMove('u', 'b');
    this.caret.label(this.position);
    this.caret.node()._id = this.position + ':' + this.position;
    addHighlights.call(this, Direction.DOWNWARD);
    this.knownPrimes.push(new parsegraph_PrimesModulo(this.position));
  }
  this.caret.pop();
  addHighlights.call(this, Direction.UPWARD);

  // Advance.
  ++this.position;
};

parsegraph_PrimesWidget.prototype.node = function() {
  return this.caret.root();
};

function parsegraph_PrimesModulo(frequency) {
  this.frequency = frequency;
  this.target = 0;
}

parsegraph_PrimesModulo.prototype.calculate = function(number) {
  while (number > this.target) {
    this.target += this.frequency;
  }
  return this.target - number;
};

parsegraph_PrimesModulo.prototype.value = function() {
  return this.frequency;
};
