function showUlam(graph, COUNT)
{
    if(COUNT === undefined) {
        COUNT = 35;
    }
    //COUNT = Math.min(100, COUNT);

    var ROWS = COUNT;

    var total = 0;
    for(var i = ROWS; i >= 2; --i) {
        for(var j=1; j <= i - 1; ++j) {
            ++total;
        }
        for(var j=1; j <= i - 1; ++j) {
            ++total;
        }
    }

    var MAX_CANDIDATE = total;

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

    var knownPrimes = [];
    var primeMap = {};
    primeMap[1] = true;

    var candidate = 2;

    while(true) {
        var isPrime = true;
        for(var i = 0; i < knownPrimes.length; ++i) {
            var prime = knownPrimes[i];
            modulus = prime.calculate(candidate);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                isPrime = false;
            }
        }

        if(isPrime) {
            // The candidate is prime, so output it and add it to the list.
            knownPrimes.push(makeModulo(candidate));
            primeMap[candidate] = true;
        }

        ++candidate;

        if(candidate > MAX_CANDIDATE) {
            break;
        }
    }

    // Enter
    var spawnDir = parsegraph_FORWARD;
    var spiralType = parsegraph_BLOCK;

    var caret = new parsegraph_Caret(spiralType);
    caret.setGlyphAtlas(graph.glyphAtlas());
    caret.fitExact();
    caret.push();

    /*for i=1, 10 do
        spawnDir = parsegraph.turnLeft(spawnDir);
        for j=1, i do
            caret.pull(spawnDir);
            caret.spawnMove(spawnDir, spiralType);
        end;
        spawnDir = parsegraph.turnLeft(spawnDir);
        for j=1, i do
            caret.pull(spawnDir);
            caret.spawnMove(spawnDir, spiralType);
        end;
    end;*/

    var count = 0;
    var nextType = function() {
        if(total - count in primeMap) {
            ++count;
            return parsegraph_BLOCK;
        };
        ++count;
        return parsegraph_SLOT;
    };

    for(var i = ROWS; i >= 2; --i) {
        spawnDir = parsegraph_turnRight(spawnDir);
        //caret.pull(spawnDir);
        for(var j = 1; j <= i - 1; ++j) {
            //caret.pull(spawnDir);
            caret.spawnMove(spawnDir, nextType());
            if(j === 1) {
                caret.crease();
            }
            caret.label(total - count + 1);
        }
        spawnDir = parsegraph_turnRight(spawnDir);
        //caret.pull(spawnDir);
        for(var j=1; j <= i-1; ++j) {
            //caret.pull(spawnDir);
            caret.spawnMove(spawnDir, nextType());
            if(j === 1) {
                caret.crease();
            }
            caret.label(total - count + 1);
        }
    }

    caret.pop();

    return caret.root();
}
