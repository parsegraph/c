function parsegraph_Ulam(app, COUNT)
{
    this.caret = new parsegraph_Caret('u');
    this.caret.setGlyphAtlas(app.glyphAtlas());

    this.loops = COUNT;
    if(this.loops === undefined) {
        this.loops = 35;
    }

    this.total = null;
    this.count = 0;
    this.spawnDir = parsegraph_DOWNWARD;
    this.rowSize = 1;
    this.position = 1;

    this.knownPrimes = [];
    this.primeMap = {};
    this.primeMap[1] = true;
    this.candidate = 2;
}

parsegraph_Ulam.prototype.node = function()
{
    return this.caret.root();
}

parsegraph_Ulam.prototype.inProgress = function()
{
    return this.total === null || (this.position < this.total);
};

parsegraph_Ulam.prototype.step = function()
{
    if(this.total === null) {
        var total = 0;
        for(var i = this.loops; i >= 2; --i) {
            for(var j=1; j <= i - 1; ++j) {
                ++total;
            }
            for(var j=1; j <= i - 1; ++j) {
                ++total;
            }
        }
        this.total = total;
        return;
    }

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

    while(this.candidate <= this.total) {
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
        if(this.candidate % parsegraph_NATURAL_GROUP_SIZE === 0) {
            return;
        }
    }

    var caret = this.caret;
    spiralType = parsegraph_BLOCK;
    var getType = function(pos) {
        return pos in this.primeMap ? parsegraph_BLOCK : parsegraph_SLOT;
    };
    for(var k = 0; k < 2; ++k) {
        for(var j = 0; j < this.loops - this.rowSize; ++j) {
            if(j === 0) {
                caret.crease();
            }
            var pos = 1 + this.total - this.position++;
            caret.spawnMove(this.spawnDir, getType.call(this, pos));
            if(j > 0) {
                caret.fitExact();
            }
            else {
                caret.fitLoose();
            }
            caret.label(pos);
        }
        this.spawnDir = parsegraph_turnRight(this.spawnDir);
        for(var j = 0; j < this.loops - this.rowSize; ++j) {
            if(j === 0) {
                caret.crease();
            }
            var pos = 1 + this.total - this.position++;
            caret.spawnMove(this.spawnDir, getType.call(this, pos));
            caret.fitN
            if(j > 0) {
                caret.fitExact();
            }
            else {
                caret.fitLoose();
            }
            caret.label(pos);
        }
        this.spawnDir = parsegraph_turnRight(this.spawnDir);
        ++this.rowSize;
    }
    return this.inProgress();
};
