/**
 * Graph painter.
 */
parsegraph_PaintGroup_COUNT = 0;
function parsegraph_PaintGroup(root)
{
    this._id = parsegraph_PaintGroup_COUNT++;

    this._root = arguments[0];
    this._dirty = true;
    this._painter = null;
    this._enabled = true;

    // Manipulated by node.
    this._childPaintGroups = [];

    this._previousPaintState = {
        i: 0,
        ordering: [this],
        commitLayoutFunc: null
    };

    if(arguments.length > 1) {
        this._worldX = arguments[1];
        this._worldY = arguments[2];
        this._userScale = arguments[3];
    }
    else {
        this._worldX = 0;
        this._worldY = 0;
        this._userScale = 1;
    }
};

parsegraph_PaintGroup.prototype.clear = function()
{
    this._childPaintGroups = [];
};

parsegraph_PaintGroup.prototype.setOrigin = function(x, y)
{
    this._worldX = x;
    this._worldY = y;

    if(Number.isNaN(this._worldX)) {
        throw new Error("WorldX must not be NaN.");
    }
    if(Number.isNaN(this._worldY)) {
        throw new Error("WorldY must not be NaN.");
    }
};

parsegraph_PaintGroup.prototype.setScale = function(scale)
{
    this._userScale = scale;
    if(Number.isNaN(this._userScale)) {
        throw new Error("Scale must not be NaN.");
    }
};

parsegraph_PaintGroup.prototype.root = function()
{
    return this._root;
};

parsegraph_PaintGroup.prototype.worldToTextCaret = function(label, fontSize, wrapWidth, paragraphX, paragraphY, outPos)
{
    var painter = this._painter.textPainter();
    painter.setFontSize(fontSize);
    painter.setWrapWidth(wrapWidth);
    return painter.findCaretPos(label, paragraphX, paragraphY, outPos);
};

parsegraph_PaintGroup.prototype.indexToCaret = function(label, fontSize, wrapWidth, paragraphX, paragraphY, outPos)
{
    var painter = this._painter.textPainter();
    painter.setFontSize(fontSize);
    painter.setWrapWidth(wrapWidth);
    return painter.findCaretPos(label, paragraphX, paragraphY, outPos);
};

parsegraph_PaintGroup.prototype.nodeUnderCoords = function(x, y)
{
    return this._root.nodeUnderCoords(
        x - this._worldX,
        y - this._worldY
    );
};

parsegraph_PaintGroup.prototype.setParent = function(paintGroup)
{
    this._parent = paintGroup;
};

parsegraph_PaintGroup.prototype.markDirty = function()
{
    this._dirty = true;
    this._previousPaintState.commitLayoutFunc = null;
    this._previousPaintState.i = 0;
    this._previousPaintState.ordering = [this];
};

parsegraph_PaintGroup.prototype.isDirty = function()
{
    return this._dirty;
};

parsegraph_PaintGroup.prototype.painter = function()
{
    return this._painter;
};

parsegraph_PaintGroup.prototype.isEnabled = function()
{
    return this._enabled;
};

parsegraph_PaintGroup.prototype.enable = function()
{
    this._enabled = true;
};

parsegraph_PaintGroup.prototype.disable = function()
{
    this._enabled = false;
};

/**
 * Paints all the nodes in this paint group. paint should be called
 * until it returns true.
 */
parsegraph_PaintGroup.prototype.paint = function(gl, backgroundColor, glyphAtlas, shaders, timeout)
{
    this.enable();

    if(!this.isDirty()) {
        return true;
    }
    if(!gl) {
        throw new Error("A WebGL context must be provided.");
    }

    var t = new Date().getTime();
    var pastTime = function() {
        return timeout !== undefined && (new Date().getTime() - t > timeout);
    };

    // Load saved state.
    var savedState = this._previousPaintState;
    var i = savedState.i;
    var ordering = savedState.ordering;

    var cont;
    if(savedState.commitLayoutFunc) {
        cont = savedState.commitLayoutFunc();
    }
    else if(i === 0) {
        cont = this._root.commitLayoutIteratively(timeout);
    }

    if(cont) {
        // Timed out during commitLayout
        savedState.commitLayoutFunc = cont;
        return false;
    }
    else {
        // Committed all layout
        savedState.commitLayoutFunc = null;
    }

    // Continue painting.
    while(i < ordering.length) {
        if(pastTime()) {
            savedState.i = i;
            this._dirty = true;
            return false;
        }
        var paintGroup = ordering[i];
        if(paintGroup.isEnabled() && paintGroup.isDirty()) {
            // Paint and render nodes marked for the current group.
            if(!paintGroup._painter) {
                paintGroup._painter = new parsegraph_NodePainter(gl, glyphAtlas, shaders);
                paintGroup._painter.setBackground(backgroundColor);
            }
            else {
                paintGroup._painter.clear();
            }
            parsegraph_foreachPaintGroupNodes(paintGroup.root(), function(node) {
                paintGroup._painter.drawNode(node, shaders);
            }, paintGroup);
        }
        paintGroup._dirty = false;

        ordering.push.apply(ordering, paintGroup._childPaintGroups);
        ++i;
    }

    savedState.i = 0;
    savedState.ordering = [];

    return true;
};

parsegraph_PaintGroup.prototype.renderIteratively = function(world)
{
    this.enable();

    this.traverseBreadth(function(paintGroup) {
        paintGroup.render(world);
    }, this);
};

parsegraph_PaintGroup.prototype.traverseBreadth = function(callback, callbackThisArg)
{
    var ordering = [this];

    // Build the node list.
    for(var i = 0; i < ordering.length; ++i) {
        var paintGroup = ordering[i];
        callback.call(callbackThisArg, paintGroup, i);
        ordering.push.apply(ordering, paintGroup._childPaintGroups);
    }
};

parsegraph_PaintGroup.prototype.render = function(world)
{
    if(!this.isEnabled()) {
        return;
    }
    if(!this._painter) {
        return;
    }

    //console.log("Rendering paint group: " + this._worldX + " " + this._worldY + " " + this._userScale);

    this._painter.render(
        matrixMultiply3x3(
            makeScale3x3(this._userScale),
            matrixMultiply3x3(makeTranslation3x3(this._worldX, this._worldY), world)
        ),
        this._userScale
    );
};

/**
 * Returns a painter's algorithm-friendly list of nodes that use the same paint
 * group as the given node. The given node is included.
 */
function parsegraph_foreachPaintGroupNodes(root, callback, callbackThisArg)
{
    // TODO Make this overwrite the current node, since it's no longer needed, and see
    // if this increases performance.
    var ordering = [root];
    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }

        // Add the node to the ordering if it exists.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);

            // Do not add nodes foreign to the given group.
            if(!child.localPaintGroup() || !child.localPaintGroup().isEnabled()) {
                ordering.push(child);
            }
        }
    };

    for(var i = 0; i < ordering.length; ++i) {
        var node = ordering[i];
        addNode(node, parsegraph_INWARD);
        addNode(node, parsegraph_DOWNWARD);
        addNode(node, parsegraph_UPWARD);
        addNode(node, parsegraph_BACKWARD);
        addNode(node, parsegraph_FORWARD);
        callback.call(callbackThisArg, node);
    }
};

/**
 * Traverses the paint groups in the given node in a painter's algorithm-friendly manner.
 *
 * This method does not consider whether the paint group is enabled or disabled.
 */
function parsegraph_findChildPaintGroups(root, callback, callbackThisArg)
{
    // TODO Make this overwrite the current node, since it's no longer needed, and see
    // if this increases performance.
    var ordering = [root];
    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }

        // Add the node to the ordering if it exists.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);
            if(child.localPaintGroup()) {
                callback.call(callbackThisArg, child.localPaintGroup());
            }
            else {
                ordering.push(child);
            }
        }
    };

    for(var i = 0; i < ordering.length; ++i) {
        var node = ordering[i];
        addNode(node, parsegraph_INWARD);
        addNode(node, parsegraph_DOWNWARD);
        addNode(node, parsegraph_UPWARD);
        addNode(node, parsegraph_BACKWARD);
        addNode(node, parsegraph_FORWARD);
    }
};
