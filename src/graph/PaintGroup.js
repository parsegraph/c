function parsegraph_PaintGroup(root)
{
    this._root = root;
    this._dirty = true;
    this._nodes = 0;
    this._painter = null;
};

parsegraph_PaintGroup.prototype.measureText = function(text, style)
{
    if(!this._painter) {
        return null;
    }

    return this._painter.textPainter().measureText(
        text,
        style.fontSize,
        style.fontSize * style.letterWidth * style.maxLabelChars
    );
};

parsegraph_PaintGroup.prototype.markDirty = function()
{
    this._dirty = true;
};

parsegraph_PaintGroup.prototype.isDirty = function()
{
    return this._dirty;
};

parsegraph_PaintGroup.prototype.hasNodes = function()
{
    return this._nodes > 0;
};

parsegraph_PaintGroup.prototype.addNode = function()
{
    this._nodes++;
};

parsegraph_PaintGroup.prototype.removeNode = function()
{
    if(this._nodes === 0) {
        throw new Error("Paint group has no nodes to remove");
    }
    this._nodes--;
};

parsegraph_PaintGroup.prototype.painter = function()
{
    return this._painter;
};

parsegraph_PaintGroup.prototype.paint = function(gl, backgroundColor, worldX, worldY, userScale)
{
    if(!gl) {
        throw new Error("A WebGL context must be provided.");
    }
    if(!this._painter) {
        this._painter = new parsegraph_NodePainter(gl);
        this.markDirty();
    }
    if(this.isDirty()) {
        // Paint and render nodes marked for this group.
        this._painter.clear();
        this._painter.setBackground(backgroundColor);
        parsegraph_foreachPaintGroupNodes(this._root, function(node) {
            this._painter.drawNode.call(this._painter, node, worldX, worldY, userScale);
        }, this);
        this._dirty = false;
    }
};

parsegraph_PaintGroup.prototype.render = function()
{
    return this._painter.render.apply(this._painter, arguments);
};

/**
 * Returns a painter's algorithm-friendly list of nodes that use the same paint
 * group as the given node. The given node is included.
 */
function parsegraph_foreachPaintGroupNodes(root, callback, callbackThisArg)
{
    var paintGroup = root.paintGroup();

    // TODO Make this overwrite the current node, since it's no longer needed, and see
    // if this increases performance.
    var ordering = [root];
    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }

        // Do not add nodes foreign to the given group.
        if(node.paintGroup() !== paintGroup) {
            return;
        }

        // Add the node to the ordering if it exists.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);
            ordering.push(child);
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
