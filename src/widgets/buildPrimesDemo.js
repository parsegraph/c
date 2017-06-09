function parsegraph_PrimesWidget(graph)
{
    this.knownPrimes = [];
    this.position = 2;

    this.caret = new parsegraph_Caret(parsegraph_BLOCK);
    this.caret.setGlyphAtlas(graph.glyphAtlas());
    this.caret.label("1", graph.glyphAtlas());
}

parsegraph_PrimesWidget.prototype.step = function(steps)
{
    // Check if any known prime is a multiple of the current position.
    for(var j = 0; j < steps; ++j) {
        this.caret.spawnMove('f', 'b');
        this.caret.label(this.position);
        this.caret.push();
        this.caret.pull('u');
        var isPrime = true;
        for(var i = 0; i < this.knownPrimes.length; ++i) {
            var prime = this.knownPrimes[i];
            modulus = prime.calculate(this.position);
            if(modulus == 0) {
                // It's a multiple, so there's no chance for primality.
                this.caret.spawnMove('u', 'b');
                this.caret.label(prime.frequency);
                isPrime = false;
            }
            else {
                this.caret.spawnMove('u', 's');
            }
            if(i === 0) {
                this.caret.crease();
            }
        }
        if(isPrime) {
            // The position is prime, so output it and add it to the list.
            this.caret.spawnMove('u', 'b');
            this.caret.label(this.position);
            this.knownPrimes.push(new parsegraph_PrimesModulo(this.position));
        }
        this.caret.pop();

        // Advance.
        ++(this.position);
    }
};

parsegraph_PrimesWidget.prototype.root = function()
{
    return this.caret.root();
};

function parsegraph_PrimesModulo(frequency)
{
    this.frequency = frequency;
    this.target = 0;
};

parsegraph_PrimesModulo.prototype.calculate = function(number)
{
    while(number > this.target) {
        this.target += this.frequency;
    }
    return this.target - number;
};

parsegraph_PrimesModulo.prototype.value = function()
{
    return this.frequency;
};


function buildPrimesDemo(COUNT)
{
    var widget = new parsegraph_PrimesWidget();
    return widget.root();
}
