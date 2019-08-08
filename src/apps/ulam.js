function parsegraph_Ulam(app, COUNT)
{
    this.caret = new parsegraph_Caret('u');
    this.caret.setGlyphAtlas(app.glyphAtlas());

    this.maxRows = COUNT;
    if(this.maxRows === undefined) {
        this.maxRows = 100;
    }

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
    //console.log(this.rowSize, this.maxRows);
    return this.rowSize < this.maxRows;
};

parsegraph_Ulam.prototype.getType = function(pos) {
    return pos in this.primeMap ? parsegraph_BLOCK : parsegraph_SLOT;
};

parsegraph_Ulam.prototype.step = function()
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

    spiralType = parsegraph_BLOCK;

    if(this.rowSize === 1) {
        this.caret.moveToRoot();
        this.caret.fitExact();
        this.caret.spawnMove('d', this.getType(this.position));
        this.caret.label(this.position);
        ++this.rowSize;
        return true;
    }

    var reverseParentage = function(n) {
        var b = n.nodeAt(parsegraph_BACKWARD);
        while(b) {
            b.disconnectNode();
            b.connectNode(parsegraph_FORWARD, n);
            n = b;
            b = b.nodeAt(parsegraph_BACKWARD);
        }
        b = n.nodeAt(parsegraph_DOWNWARD);
        while(b) {
            n.disconnectNode(parsegraph_DOWNWARD);
            b.connectNode(parsegraph_UPWARD, n);
            n = b;
            b = b.nodeAt(parsegraph_DOWNWARD);
        }
        b = n.nodeAt(parsegraph_FORWARD);
        while(b) {
            n.disconnectNode(parsegraph_FORWARD);
            b.connectNode(parsegraph_BACKWARD, n);
            n = b;
            b = b.nodeAt(parsegraph_FORWARD);
        }
        return n;
    };

    //console.log("Position=" + this.position);
    do {
        while(this.candidate <= this.rowSize*this.rowSize) {
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
                return true;
            }
        }

        this.caret.moveToRoot();
        this.caret.fitExact();
        if(this.rowSize % 2 === 0) {
            //console.log("Even row " + this.rowSize);
            var node = this.caret.disconnect('d');
            var caret = new parsegraph_Caret();
            caret.fitExact();
            caret.setGlyphAtlas(this.caret.glyphAtlas());
            var cornerPosition = this.rowSize*this.rowSize - (this.rowSize-1);
            caret.replace(this.getType(cornerPosition));
            //console.log("cornerPosition=" + cornerPosition);
            caret.label(cornerPosition);
            this.corner = caret.node();
            caret.push();
            for(var i = cornerPosition + 1; i <= this.rowSize*this.rowSize; ++i) {
                caret.spawnMove('b', this.getType(i));
                caret.label(i);
                this.position = i;
            }
            this.last = caret.node();
            caret.pop();
            caret.push();
            caret.pull('d');
            for(var i = 0; i < this.rowSize-1; ++i) {
                var pos = cornerPosition - 1 - i;
                caret.spawnMove('d', this.getType(pos));
                caret.label(pos);
            }
            caret.connect('b', reverseParentage(node));
            caret.pop();
            this.caret.connect('d', this.corner);
            this.caret.fitLoose();
            this.caret.crease();
            //console.log(this.caret.node());
            ++this.rowSize;
        }
        else {
            //console.log("Odd row " + this.rowSize);
            var caret = new parsegraph_Caret(this.last, this.caret.glyphAtlas());
            var pos = this.rowSize*this.rowSize+1;
            ++this.position;
            caret.spawnMove('b', this.getType(this.position));
            caret.label(this.position);
            ++this.rowSize;
            for(var i = pos+1; i <= this.rowSize*this.rowSize - this.rowSize; ++i) {
                ++this.position;
                caret.spawnMove('d', this.getType(this.position));
                caret.label(this.position);
            }
            pos = i;
            for(var i = 0; i < this.rowSize-2; ++i) {
                ++this.position;
                caret.spawnMove('f', this.getType(this.position));
                caret.label(this.position);
            }
            caret.crease();
            this.last = caret.node();
        }
    } while(this.rowSize % 2 === 0);

    return this.inProgress();
};
