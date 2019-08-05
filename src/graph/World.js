function parsegraph_World(graph)
{
    // World-rendered graphs.
    this._worldPaintingDirty = true;
    this._worldRoots = [];

    // The node currently under the cursor.
    this._nodeUnderCursor = null;

    this._previousWorldPaintState = null;

    this._camera = null;

    this._graph = graph;
}

parsegraph_World_Tests = new parsegraph_TestSuite("parsegraph_World");

parsegraph_World.prototype.camera = function()
{
    if(!this._camera) {
        this._camera = new parsegraph_Camera(this._graph.surface());
    }
    return this._camera;
};

parsegraph_World.prototype.setCamera = function(camera)
{
    this._camera = camera;
};


/**
 * Plots the given paint group, or creates one if constructor
 * arguments are given.
 *
 * The paint group is returned. Passing a paint group directly is the
 * preferred method. The position of the graph is the one used when
 * rendering. The caller manages the position.
 *
 * plot(node)
 */
parsegraph_World.prototype.plot = function(node)
{
    if(!node) {
        throw new Error("Node must not be null");
    }
    if(!node.localPaintGroup && node.root) {
        // Passed a Caret.
        node = node.root();
    }
    if(!node.localPaintGroup()) {
        node.setPaintGroup(true);
    }
    this._worldRoots.push(node);
};

parsegraph_World_Tests.addTest("parsegraph_World.plot", function() {
    var w = new parsegraph_World();

    var f = 0;
    try {
        f = 1;
        w.plot(null);
        f = 2;
    }
    catch(ex) {
        f = 3;
    }
    if(f != 3) {
        return "parsegraph_plot must fail with null node";
    }
});

parsegraph_World_Tests.addTest("world.plot with caret", function() {
    var w = new parsegraph_World();
    var car = new parsegraph_Caret('b');
    var f = 0;
    try {
        f = 1;
        w.plot(car);
        f = 2;
    }
    catch(ex) {
        f = ex;
    }
    if(f != 2) {
        return "parsegraph_plot must handle being passed a Caret: " + f;
    }
});

/**
 *
 */
parsegraph_World.prototype.removePlot = function(plot)
{
    for(var i in this._worldRoots) {
        if(this._worldRoots[i] === plot) {
            if(this._previousWorldPaintState) {
                this._previousWorldPaintState = null;
            }
            return this._worldRoots.splice(i, 1);
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
    if(!this._camera) {
        // Never rendered.
        return 0;
    }
    if(!this.readyForInput()) {
        return 1;
    }
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
        return 1;
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
        return 0;
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
    else {
        return 0;
    }

    return 2;
};

parsegraph_World.prototype.boundingRect = function(outRect)
{
    if(!outRect) {
        outRect = new parsegraph_Rect();
    }
    this._worldRoots.forEach(function(plot) {
        plot.commitLayoutIteratively();

        // Get plot extent data.
        var nx = plot.absoluteX();
        var ny = plot.absoluteY();

        var boundingValues = [0, 0, 0];
        plot.extentsAt(parsegraph_FORWARD).boundingValues(boundingValues);
        var h = boundingValues[0];
        plot.extentsAt(parsegraph_DOWNWARD).boundingValues(boundingValues);
        var w = boundingValues[0];

        var be = nx - plot.extentOffsetAt(parsegraph_FORWARD);
        var ue = ny - plot.extentOffsetAt(parsegraph_DOWNWARD);
        var fe = be + w;
        var de = ue + h;

        // Get rect values.
        var w = fe + be;
        var h = de + ue;

        // Calculate center by averaging axis extremes.
        var cx = be + w/2;
        var cy = ue + h/2;

        // Get current bounding rect.
        var inx = outRect._x;
        var iny = outRect._y;
        var inw = outRect._width;
        var inh = outRect._height;

        var outw;
        var outh;
        var outx;
        var outy;

        if(!inw || !inh || !inx || !iny) {
            outw = w;
            outh = h;
            outx = cx;
            outy = cy;
        }
        else {
            // Combine rect extents.
            var hmin = Math.min(inx - inw/2, cx - w/2);
            var hmax = Math.max(inx + inw/2, cx + w/2);
            var vmin = Math.min(iny - inh/2, cy - h/2);
            var vmax = Math.max(iny + inh/2, cy + h/2);

            // Calculate width and center.
            outw = hmax - hmin;
            outh = vmax - vmin;
            outx = hmin + outw/2;
            outy = vmin + outh/2;
        }

        // Store results.
        outRect._x = outx;
        outRect._y = outy;
        outRect._width = outw;
        outRect._height = outh;
    });

    return outRect;
};

parsegraph_World_Tests.addTest("boundingRect", function() {
    var w = new parsegraph_World();
    var car = new parsegraph_Caret('b');
    w.plot(car);
    var r = w.boundingRect();
    //console.log(r);
    if(Number.isNaN(r.width())) {
        return "Width must not be NaN";
    }
});

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

parsegraph_World.prototype.readyForInput = function()
{
    // Test if there is a node under the given coordinates.
    for(var i = this._worldRoots.length - 1; i >= 0; --i) {
        if(this._worldRoots[i].needsCommit()) {
            return false;
        }
    }
    return true;
};

/**
 * Tests whether the given position, in world space, is within a node.
 */
parsegraph_World.prototype.nodeUnderCoords = function(x, y)
{
    // Test if there is a node under the given coordinates.
    for(var i = this._worldRoots.length - 1; i >= 0; --i) {
        var selectedNode = this._worldRoots[i].nodeUnderCoords(x, y);
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
        //console.log("World needs repaint");
        // Restore the last state.
        var i = 0;
        var savedState;
        if(this._previousWorldPaintState !== null) {
            savedState = this._previousWorldPaintState;
            this._previousWorldPaintState = null;
            i = savedState;
        }
        else {
            parsegraph_PAINT_START = new Date();
            parsegraph_NODES_PAINTED = 0;
        }

        while(i < this._worldRoots.length) {
            this._graph.glyphAtlas().update(this._graph.gl());
            if(pastTime()) {
                this._previousWorldPaintState = i;
                return false;
            }
            var plot = this._worldRoots[i];
            if(!plot.localPaintGroup()) {
                throw new Error("World root must have a paint group");
            }
            parsegraph_PAINTING_GLYPH_ATLAS = this._graph.glyphAtlas();
            var paintCompleted = plot.paint(
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
    else {
        //console.log("World does not need repaint");
    }

    if(!this._worldPaintingDirty && parsegraph_NODES_PAINTED > 0) {
        var paintDuration = parsegraph_elapsed(parsegraph_PAINT_START);
        //console.log("Painted " + parsegraph_NODES_PAINTED + " nodes over " + (paintDuration/1000) + "s. (" + (parsegraph_NODES_PAINTED/(paintDuration/1000)) + " nodes/sec)");
        parsegraph_NODES_PAINTED = 0;
        parsegraph_PAINT_START = null;
    }

    return true;
};

parsegraph_World.prototype.render = function(world)
{
    var cleanlyRendered = true;
    for(var i in this._worldRoots) {
        cleanlyRendered = this._worldRoots[i].renderIteratively(world, this.camera()) && cleanlyRendered;
    }
    return cleanlyRendered;
};
