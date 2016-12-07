function parsegraph_createPrimes(graph, MAX_CANDIDATE, MAX_PRIMES)
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

    var knownPrimes = [];
    var candidate = 2;

    var startTime = parsegraph_getTimeInMillis();

    graph.push();
    graph.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);

    while(true) {
        graph.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        graph.label(candidate);
        graph.push();
        var isPrime = true;
        for(var i = 0; i < knownPrimes.length; ++i) {
            var prime = knownPrimes[i];
            modulus = prime.calculate(candidate);
            if(modulus == 0) {
                //-- It's a multiple, so there's no chance for primality.
                graph.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
                isPrime = false;
            }
            else {
                graph.spawnMove(parsegraph_UPWARD, parsegraph_SLOT);
            }
        }

        if(isPrime) {
            graph.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
            graph.label(candidate);
            // The candidate is prime, so output it and add it to the list.
            knownPrimes.push(makeModulo(candidate));
        }

        graph.pop();
        candidate = candidate + 1;

        if(candidate > MAX_CANDIDATE) {
            break;
        }
    }

    graph.pop();

    graph.push();
    for(var i = 0; i < knownPrimes.length; ++i) {
        graph.spawnMove(parsegraph_UPWARD, parsegraph_BLOCK);
    }
    graph.pop();

    //console.log(parsegraph_getTimeInMillis() - startTime);
}
