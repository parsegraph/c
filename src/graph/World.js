function parsegraph_World(graph)
{
    // World-rendered graphs.
    this._worldPaintingDirty = true;
    this._worldPlots = [];

    // The node currently under the cursor.
    this._nodeUnderCursor = null;

    this._previousWorldPaintState = null;

    this._camera = new parsegraph_Camera(graph);

    this._graph = graph;
}

parsegraph_World.prototype.camera = function()
{
    return this._camera;
};

parsegraph_World.prototype.plot = function()
{
    return parsegraph_plot.apply(this._worldPlots, arguments);
};

/**
 * Plots the given paint group, or creates one if constructor
 * arguments are given.
 *
 * The paint group is returned. Passing a paint group directly is the
 * preferred method. The position of the graph is the one used when
 * rendering. The caller manages the position.
 *
 * parsegraph_plot.apply(plotList, arguments);
 *
 * plot(node)
 * plot(root, worldX, worldY, userScale)
 */
function parsegraph_plot(node, worldX, worldY, userScale) {
    if(!node.localPaintGroup()) {
        node.setPaintGroup(new parsegraph_PaintGroup(node));
    }
    if(arguments.length > 1) {
        node.localPaintGroup().setOrigin(worldX, worldY);
        node.localPaintGroup().setScale(userScale);
    }
    this.push(node);
};

/**
 *
 */
parsegraph_World.prototype.removePlot = function(plot)
{
    for(var i in this._worldPlots) {
        if(this._worldPlots[i] === plot) {
            if(this._previousWorldPaintState) {
                this._previousWorldPaintState = null;
            }
            return this._worldPlots.splice(i, 1);
        }
    }
    return null;
};

/**
 * Receives a mouseover event at the given coordinates, in client space.
 *
 * Returns true if this event processing requires a graph repaint.
 */
parsegraph_World.prototype.mouseOver = function(x, y)
{
    //console.log("mouseover: " + x + ", " + y);
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.camera().worldMatrix()),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    var selectedNode = this.nodeUnderCoords(x, y);
    if(this._nodeUnderCursor === selectedNode) {
        // The node under cursor is already the node under cursor, so don't
        // do anything.
        //console.log("Node was the same");
        return false;
    }

    if(this._nodeUnderCursor && this._nodeUnderCursor !== selectedNode) {
        //console.log("Node is changing, so repainting.");
        this._nodeUnderCursor.setSelected(false);
        this.scheduleRepaint();
    }

    this._nodeUnderCursor = selectedNode;
    if(!selectedNode) {
        // No node was actually found.
        //console.log("No node actually found.");
        return false;
    }

    if(selectedNode.type() == parsegraph_SLIDER) {
        //console.log("Selecting slider and repainting");
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }
    else if(selectedNode.hasClickListener() && !selectedNode.isSelected()) {
        //console.log("Selecting node and repainting");
        selectedNode.setSelected(true);
        this.scheduleRepaint();
    }

    return true;
};

parsegraph_World.prototype.scheduleRepaint = function()
{
    //console.log(new Error("Scheduling repaint"));
    this._worldPaintingDirty = true;
    this._previousWorldPaintState = null;
};

parsegraph_World.prototype.nodeUnderCursor = function()
{
    return this._nodeUnderCursor;
};

/**
 * Tests whether the given position, in world space, is within a node.
 */
parsegraph_World.prototype.nodeUnderCoords = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._worldPlots.length - 1; i >= 0; --i) {
        var selectedNode = this._worldPlots[i].nodeUnderCoords(x, y);
        if(selectedNode) {
            // Node located; no further search.
            return selectedNode;
        }
    }
    return null;
};

parsegraph_World.prototype.needsRepaint = function()
{
    return this._worldPaintingDirty;
};

parsegraph_World.prototype.paint = function(timeout)
{
    //console.log("Painting Graph, timeout=" + timeout);
    var t = new Date().getTime();
    var pastTime = function() {
        return timeout !== undefined && (new Date().getTime() - t > timeout);
    };
    var timeRemaining = function() {
        if(timeout === undefined) {
            return timeout;
        }
        return Math.max(0, timeout - (new Date().getTime() - t));
    };

    if(this._worldPaintingDirty) {
        // Restore the last state.
        var i = 0;
        var savedState;
        if(this._previousWorldPaintState !== null) {
            savedState = this._previousWorldPaintState;
            this._previousWorldPaintState = null;
            i = savedState;
        }

        while(i < this._worldPlots.length) {
            if(pastTime()) {
                this.previousWorldPaintState = i;
                return false;
            }
            var plot = this._worldPlots[i];
            var paintGroup = plot.localPaintGroup();
            if(!paintGroup) {
                throw new Error("Plot no longer has a paint group?!");
            }
            parsegraph_PAINTING_GLYPH_ATLAS = this._graph.glyphAtlas();
            var paintCompleted = paintGroup.paint(
                this._graph.gl(),
                this._graph.surface().backgroundColor(),
                this._graph.glyphAtlas(),
                this._graph._shaders,
                timeRemaining()
            );
            parsegraph_PAINTING_GLYPH_ATLAS = null;

            if(!paintCompleted) {
                this._previousWorldPaintState = i;
                return false;
            }

            ++i;
        }
        this._worldPaintingDirty = false;
    }
};

parsegraph_World.prototype.render = function(world)
{
    for(var i in this._worldPlots) {
        var plot = this._worldPlots[i];
        var paintGroup = plot.localPaintGroup();
        if(!paintGroup) {
            throw new Error("Plot no longer has a paint group?!");
        }
        paintGroup.renderIteratively(world);
    }
};