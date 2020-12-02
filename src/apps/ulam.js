/* eslint-disable require-jsdoc */

export default function Ulam(COUNT) {
  this.caret = new Caret('u');
  this.caret.setMathMode(true);

  this.maxNumber = COUNT;
  if (this.maxNumber === undefined) {
    this.maxNumber = 100;
  }

  this.spawnDir = DOWNWARD;
  this.position = 1;

  this.knownPrimes = [];
  this.primeMap = {};
  this.candidate = 2;

  this.computePrimes(4);
  this.caret.fitExact();
  this.spawnNumber('d', 4);
  this.spawnNumber('f', 3);
  this.spawnNumber('d', 2);
  this.spawnNumber('b', 1);
  this.rowSize = 4;
}

Ulam.prototype.spawnNumber = function(dir, num) {
  this.caret.spawnMove(dir, this.getType(num));
  this.caret.label(num);
  this.caret.node()._id = 'Ulam ' + num;
  this.caret.overlapAxis('a');
};

Ulam.prototype.step = function(timeout) {
  const maxNumber = this.rowSize * this.rowSize;
  if (!this.computePrimes(maxNumber, timeout)) {
    return true;
  }

  // console.log("Position=" + this.position + " RowSize=" + this.rowSize);
  this.caret.moveToRoot();
  const prior = this.caret.disconnect('d');

  this.spawnNumber('d', maxNumber);
  this.caret.fitExact();
  this.caret.crease();
  for (let i = 1; i < this.rowSize; ++i) {
    this.spawnNumber('f', maxNumber - i);
    if (i > this.rowSize - 2) {
      this.caret.fitLoose();
    } else {
      this.caret.fitExact();
    }
  }
  this.caret.crease();
  this.caret.fitExact();
  num = maxNumber - this.rowSize + 1;
  for (let i = 1; i < this.rowSize; ++i) {
    this.spawnNumber('d', --num);
    if (i === 1 || i > this.rowSize - 2) {
      this.caret.fitLoose();
    } else {
      this.caret.fitExact();
    }
  }
  this.caret.crease();
  this.caret.fitExact();
  for (let i = 1; i < this.rowSize; ++i) {
    this.spawnNumber('b', --num);
    if (i === 1 || i > this.rowSize - 2) {
      this.caret.fitLoose();
    } else {
      this.caret.fitExact();
    }
  }
  this.caret.crease();
  this.caret.fitExact();
  for (let i = 2; i < this.rowSize; ++i) {
    this.spawnNumber('u', --num);
    if (i === 2 || i > this.rowSize - 2) {
      this.caret.fitLoose();
    } else {
      this.caret.fitExact();
    }
  }
  this.caret.crease();
  this.caret.fitExact();
  this.caret.connect('f', prior);
  this.rowSize += 2;
  return this.inProgress();
};

Ulam.prototype.node = function() {
  return this.caret.root();
};

Ulam.prototype.inProgress = function() {
  return this.candidate < this.maxNumber;
};

Ulam.prototype.getType = function(pos) {
  return pos in this.primeMap ? BLOCK : SLOT;
};

Ulam.prototype.computePrimes = function(max, timeout) {
  function makeModulo(frequency) {
    let target = 0;
    const object = {};

    object.calculate = function(number) {
      while (number > target) {
        target += frequency;
      }
      return target - number;
    };

    object.value = function() {
      return frequency;
    };

    return object;
  }

  const startTime = new Date();

  while (this.candidate <= max) {
    if (this.candidate % 100 === 0) {
      if (timeout && elapsed(startTime) > timeout) {
        return false;
      }
    }
    let isPrime = true;
    for (let i = 0; i < this.knownPrimes.length; ++i) {
      const prime = this.knownPrimes[i];
      modulus = prime.calculate(this.candidate);
      if (modulus == 0) {
        // It's a multiple, so there's no chance for primality.
        isPrime = false;
      }
    }

    if (isPrime) {
      // The candidate is prime, so output it and add it to the list.
      this.knownPrimes.push(makeModulo(this.candidate));
      this.primeMap[this.candidate] = true;
    }

    ++this.candidate;
  }
  return true;
};
