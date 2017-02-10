/**
 * Graph painter.
 */
function parsegraph_PaintGroup(root)
{
    this._root = arguments[0];
    this._dirty = true;
    this._nodes = 0;
    this._painter = null;
    if(arguments.length > 1) {
        this._worldX = arguments[1];
        this._worldY = arguments[2];
        this._userScale = arguments[3];
    }
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

parsegraph_PaintGroup.prototype.measureText = function(text, style)
{
    if(!this._painter) {
        return null;
    }

    var painter = this._painter.textPainter();
    painter.setFontSize(style.fontSize);
    painter.setWrapWidth(style.fontSize * style.letterWidth * style.maxLabelChars);
    return painter.measureText(text);
};

parsegraph_PaintGroup.prototype.worldToTextCaret = function(label, fontSize, wrapWidth, paragraphX, paragraphY)
{
    var painter = this._painter.textPainter();
    painter.setFontSize(fontSize);
    painter.setWrapWidth(wrapWidth);
    return painter.findCaretPos(label, paragraphX, paragraphY);
};

parsegraph_PaintGroup.prototype.nodeUnderCoords = function(x, y)
{
    return this._root.nodeUnderCoords(
        x - this._worldX,
        y - this._worldY
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

parsegraph_PaintGroup.prototype.paint = function(gl, backgroundColor, glyphAtlas, shaders)
{
    if(!gl) {
        throw new Error("A WebGL context must be provided.");
    }
    if(!this._painter) {
        this._painter = new parsegraph_NodePainter(gl, glyphAtlas, shaders);
        this.markDirty();
    }
    if(this.isDirty()) {
        // Paint and render nodes marked for this group.
        this._painter.clear();
        this._painter.setBackground(backgroundColor);
        this._root.commitLayoutIteratively();
        parsegraph_foreachPaintGroupNodes(this._root, function(node) {
            this._painter.drawNode.call(this._painter, node);
        }, this);
        this._dirty = false;
    }
};

parsegraph_PaintGroup.prototype.render = function(world)
{
    return this._painter.render(
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
