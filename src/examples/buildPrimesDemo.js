function buildPrimesDemo(graph, COUNT)
{
    if(COUNT == undefined) {
        COUNT = 50;
    }
    COUNT = Math.min(COUNT, 100);

    parsegraph_HORIZONTAL_SEPARATION_PADDING = 1;
    parsegraph_VERTICAL_SEPARATION_PADDING = 1;
    parsegraph_MIN_BLOCK_HEIGHT = parsegraph_MIN_BLOCK_WIDTH;

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
    var candidate = 2;

    var startTime = parsegraph_getTimeInMillis();

    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    var addBlock = function() {
        caret.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        caret.label(candidate);
        caret.push();
        var isPrime = true;
        for(var i = 0; i < knownPrimes.length; ++i) {
            var prime = knownPrimes[i];
            modulus = prime.calculate(candidate);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
                isPrime = false;
            }
            else {
                caret.spawnMove(parsegraph_UPWARD, parsegraph_SLOT);
            }
        }

        if(isPrime) {
            caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
            caret.label(candidate);
            // The candidate is prime, so output it and add it to the list.
            knownPrimes.push(makeModulo(candidate));
        }

        caret.pop();
        ++candidate;
    };

    /*caret.push();
    for(var i = 0; i < knownPrimes.length; ++i) {
        caret.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
    }
    caret.pop();*/

    //console.log(parsegraph_getTimeInMillis() - startTime);

    var scheduleAddBlock = function() {
        if(knownPrimes.length > COUNT) {
            // Completed.
            return;
        }
        for(var i = 0; i < 10; ++i) {
            addBlock();
            if(knownPrimes.length > COUNT) {
                // Completed.
                break;
            }
        }
        graph.scheduleRepaint();
        window.setTimeout(scheduleAddBlock, 500);
    };
    scheduleAddBlock();

    return caret;
}
