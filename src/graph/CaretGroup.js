function parsegraph_CaretGroup(caret, worldX, worldY, userScale)
{
    this._caret = caret;
    this._worldX = worldX;
    this._worldY = worldY;
    this._userScale = userScale;

    this._paintGroups = new parsegraph_PaintGroup(caret.root());
    this._dirty = true;
};

parsegraph_CaretGroup.prototype.caret = function()
{
    return this._caret;
};

parsegraph_CaretGroup.prototype.nodeUnderCoords = function(x, y)
{
    return this._caret.nodeUnderCoords(
        x - this._worldX,
        y - this._worldY
    );
};

parsegraph_CaretGroup.prototype.markDirty = function()
{
    this._dirty = true;
};

parsegraph_CaretGroup.prototype.isDirty = function()
{
    return this._dirty;
};

parsegraph_CaretGroup.prototype.paint = function(gl, backgroundColor)
{
    this._paintGroups.paint(gl, backgroundColor, this._worldX, this._worldY, this._userScale);
};

parsegraph_CaretGroup.prototype.render = function(world, scale)
{
    this._paintGroups.render.apply(this._paintGroups, arguments);
};
