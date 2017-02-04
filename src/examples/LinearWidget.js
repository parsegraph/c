function parsegraph_LinearWidget(graph)
{
    this.position = 0;
    this.caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
}

parsegraph_LinearWidget.prototype.step = function(steps)
{
    // Check if any known prime is a multiple of the current position.
    for(var j = 0; j < steps; ++j) {
        this.caret.spawnMove('f', 'b');
        //this.caret.label(this.position);
        this.caret.push();
        for(var i = 0; i < this.position; ++i) {
            this.caret.spawnMove('u', 'b');
        }
        this.caret.label(1 + this.position);
        this.caret.pop();

        // Advance.
        ++(this.position);
    }
};

parsegraph_LinearWidget.prototype.root = function()
{
    return this.caret.root();
};
