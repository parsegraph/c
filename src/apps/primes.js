function parsegraph_PrimesWidget(app)
{
    this.knownPrimes = [];
    this.position = 2;

    this._app = app;

    this.caret = new parsegraph_Caret(parsegraph_BLOCK);
    this.caret.setFont(app.font());
    this.caret.setWorld(app.world());
    this.caret.setMathMode(true);
    this.caret.label("1");

    var carousel = new parsegraph_ActionCarousel(this.window());
    carousel.addAction("Pause", function() {
        this._paused = !this._paused;
    }, this);
    carousel.install(this.caret.node());
}

parsegraph_PrimesWidget.prototype.window = function()
{
    return this._app.window();
};

parsegraph_PrimesWidget.prototype.world = function()
{
    return this._app.world();
};

parsegraph_PrimesWidget.prototype.isPaused = function()
{
    return this._paused;
};

parsegraph_PrimesWidget.prototype.step = function()
{
    //console.log("Stepping primes widget");
    // Check if any known prime is a multiple of the current position.
    this.caret.spawnMove('f', 'b');
    this.caret.label(this.position);
    this.caret.node()._id = this.position;
    this.caret.push();
    this.caret.pull('u');
    this.caret.crease();
    //this.caret.freeze();
    var isPrime = true;

    function addHighlights(dir) {
        var carousel = new parsegraph_ActionCarousel(this.window());
        var world = this.world();
        carousel.addAction("Highlight", function() {
            var bs = parsegraph_cloneStyle(parsegraph_SLOT_MATH_STYLE);
            bs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
            for(var n = this; n; n = n.nodeAt(dir)) {
                if(n.type() === parsegraph_SLOT) {
                    n.setBlockStyle(bs);
                }
            }
            console.log("Highlighted node " + this.label());
            world.scheduleRepaint();
        }, this.caret.node());
        carousel.addAction("Unhighlight", function() {
            var bs = parsegraph_cloneStyle(parsegraph_SLOT_MATH_STYLE);
            for(var n = this; n; n = n.nodeAt(dir)) {
                if(n.type() === parsegraph_SLOT) {
                    n.setBlockStyle(bs);
                }
            }
            console.log("Unhighlighted node " + this.label());
            world.scheduleRepaint();
        }, this.caret.node());
        carousel.install(this.caret.node());
    };

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
        this.caret.node()._id = this.position + ":" + prime.frequency;
        if(i === 0) {
            this.caret.crease();
            //this.caret.freeze();
        }
    }
    if(isPrime) {
        // The position is prime, so output it and add it to the list.
        this.caret.spawnMove('u', 'b');
        this.caret.label(this.position);
        this.caret.node()._id = this.position + ":" + this.position;
        addHighlights.call(this, parsegraph_DOWNWARD);
        this.knownPrimes.push(new parsegraph_PrimesModulo(this.position));
    }
    this.caret.pop();
    addHighlights.call(this, parsegraph_UPWARD);

    // Advance.
    ++(this.position);
};

parsegraph_PrimesWidget.prototype.node = function()
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
