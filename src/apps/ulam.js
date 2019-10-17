function parsegraph_Ulam(COUNT)
{
    this.caret = new parsegraph_Caret('u');
    this.caret.setMathMode(true);

    this.maxNumber = COUNT;
    if(this.maxNumber === undefined) {
        this.maxNumber = 100;
    }

    this.spawnDir = parsegraph_DOWNWARD;
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

parsegraph_Ulam.prototype.spawnNumber = function(dir, num)
{
    this.caret.spawnMove(dir, this.getType(num));
    this.caret.label(num);
    this.caret.node()._id = "Ulam " + num;
    this.caret.overlapAxis('a');
};

parsegraph_Ulam.prototype.step = function(timeout)
{
    var maxNumber = this.rowSize*this.rowSize;
    if(!this.computePrimes(maxNumber, timeout)) {
        return true;
    }

    //console.log("Position=" + this.position + " RowSize=" + this.rowSize);
    this.caret.moveToRoot();
    var prior = this.caret.disconnect('d');

    this.spawnNumber('d', maxNumber);
    this.caret.fitExact();
    this.caret.crease();
    for(var i = 1; i < this.rowSize; ++i) {
        this.spawnNumber('f', maxNumber - i);
        if(i > this.rowSize - 2) {
            this.caret.fitLoose();
        }
        else {
            this.caret.fitExact();
        }
    }
    this.caret.crease();
    this.caret.fitExact();
    num = maxNumber - this.rowSize + 1;
    for(var i = 1; i < this.rowSize; ++i) {
        this.spawnNumber('d', --num);
        if(i === 1 || i > this.rowSize - 2) {
            this.caret.fitLoose();
        }
        else {
            this.caret.fitExact();
        }
    }
    this.caret.crease();
    this.caret.fitExact();
    for(var i = 1; i < this.rowSize; ++i) {
        this.spawnNumber('b', --num);
        if(i === 1 || i > this.rowSize - 2) {
            this.caret.fitLoose();
        }
        else {
            this.caret.fitExact();
        }
    }
    this.caret.crease();
    this.caret.fitExact();
    for(var i = 2; i < this.rowSize; ++i) {
        this.spawnNumber('u', --num);
        if(i === 2 || i > this.rowSize - 2) {
            this.caret.fitLoose();
        }
        else {
            this.caret.fitExact();
        }
    }
    this.caret.crease();
    this.caret.fitExact();
    this.caret.connect('f', prior);
    this.rowSize += 2;
    return this.inProgress();
};

parsegraph_Ulam.prototype.node = function()
{
    return this.caret.root();
}

parsegraph_Ulam.prototype.inProgress = function()
{
    return this.candidate < this.maxNumber;
};

parsegraph_Ulam.prototype.getType = function(pos) {
    return pos in this.primeMap ? parsegraph_BLOCK : parsegraph_SLOT;
};

parsegraph_Ulam.prototype.computePrimes = function(max, timeout)
{
    function makeModulo(frequency) {
        var target = 0;
        var object = {};

        object.calculate = function(number) {
            while(number > target) {
                target += frequency;
            }
            return target - number;
        };

        object.value = function() {
            return frequency;
        };

        return object;
    };

    var startTime = new Date();

    while(this.candidate <= max) {
        if(this.candidate % 100 === 0) {
            if(timeout && parsegraph_elapsed(startTime) > timeout) {
                return false;
            }
        }
        var isPrime = true;
        for(var i = 0; i < this.knownPrimes.length; ++i) {
            var prime = this.knownPrimes[i];
            modulus = prime.calculate(this.candidate);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                isPrime = false;
            }
        }

        if(isPrime) {
            // The candidate is prime, so output it and add it to the list.
            this.knownPrimes.push(makeModulo(this.candidate));
            this.primeMap[this.candidate] = true;
        }

        ++this.candidate;
    }
    return true;
};
