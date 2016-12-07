function parsegraph_PieOverlay(gl)
{
    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._gl = gl;

    this._nodePainter = new parsegraph_NodePainter(this._gl);

    this._carets = [];
};

parsegraph_PieOverlay.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;
};

/**
 * Retrieves the current background color.
 */
parsegraph_PieOverlay.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_PieOverlay.prototype.plot = function(caret)
{
    this._carets.push(caret);
};

parsegraph_PieOverlay.prototype.removePlot = function(caret)
{
    for(var i = 0; i < this._carets.length; ++i) {
        if(this._carets[i] == caret) {
            this._carets.splice(i, 1);
        }
    }
};

parsegraph_PieOverlay.prototype.arrangeCarets = function()
{
    var EQUAL_DISTRIBUTION = true;

    var MINIMUM_RADIUS = 100;

    if(EQUAL_DISTRIBUTION) {
        // Calculate the angle per caret.
        this._carets.length

        // Shrink the caret until it fits at the minimum radius within the
        // angle.

        // All positions found.
    }
    else {
        // Unequal distribution; size matters.

        // Find the size of each caret.

        // Have each one have its angle calculated using the minimum radius.

        // Sum up all the angles; if greater than a full rotation, shrink all
        // scales.

        // All positions found.
    }
};

parsegraph_PieOverlay.prototype.paint = function()
{
    this._nodePainter.clear();

    this._carets.forEach(function(caret) {
        caret.root().commitLayoutIteratively();
    }, this);

    this.arrangeCarets();

    this._carets.forEach(function(caret) {
        caret.root().drawIteratively(this._nodePainter);
    }, this);
};

parsegraph_PieOverlay.prototype.render = function(world, scale)
{
    this._nodePainter.setBackground(this._backgroundColor);
    this._nodePainter.render(world, scale);
};

/**
 * Receives a mouseDown event at the given coordinates, in world space.
 */
parsegraph_PieOverlay.prototype.mouseDown = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._carets.length - 1; i >= 0; --i) {
        var caret = this._carets[i];
        var selectedNode = caret.nodeUnderCoords(x, y);
        if(selectedNode) {
            // Node located; no further search.
            break;
        }
    }
    if(!selectedNode) {
        // No node found.
        return false;
    }

    // A node was found; show its options.
    //console.log("Found selected node");
    selectedNode.setSelected(!selectedNode.isSelected());

    this.scheduleRepaint();

    return true;
};

parsegraph_PieOverlay.prototype.gl = function()
{
    return this._gl;
};
