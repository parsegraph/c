/**
 * Represents information about a graph in a direction. A
 * node has one of these data structures for each direction
 * it can spawn nodes, referred to as the "owning node."
 *
 * This structure's information is used to position the child.
 */
function parsegraph_DirectionData()
{
    this._node = null;
    this._extent = new parsegraph_Extent();
    this._extentOffset = 0;

    this._alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    this._alignmentOffset = 0;

    this._separation = 0;
    this._lineLength = 0;

    this._xPos = 0;
    this._yPos = 0;
};

parsegraph_DirectionData.prototype.clear = function() {
    if(this.hasNode()) {
        delete this._node;
    }

    this._alignmentMode = parsegraph_NULL_NODE_ALIGNMENT;
    this._alignmentOffset = 0;

    this._extent.clear();
    this._extentOffset = 0;
    this._separation = 0;
    this._lineLength = 0;
    this._xPos = 0;
    this._yPos = 0;
};

parsegraph_DirectionData.prototype.x = function()
{
    return this._xPos;
};

parsegraph_DirectionData.prototype.y = function()
{
    return this._yPos;
};

parsegraph_DirectionData.prototype.setPos = function(x, y)
{
    this._xPos = x;
    this._yPos = y;
};

parsegraph_DirectionData.prototype.hasNode = function() {
    return !!this._node;
};

parsegraph_DirectionData.prototype.layoutWasChanged = function(changeDirection) {
    if(!this.hasNode()) {
        throw parsegraph_createException(
            parsegraph_NO_NODE_FOUND
        );
    }
    return this._node.layoutWasChanged(changeDirection);
};

parsegraph_DirectionData.prototype.erase = function() {
    if(!this.hasNode()) {
        return;
    }
    delete this._node;
}

/**
 * Returns the owning node's extent for this data's direction.
 */
parsegraph_DirectionData.prototype.extent = function() {
    return this._extent;
};

/**
 * Returns the offset of the owning node's center within
 * the extent.
 *
 * The value uses the same scale as the extent.
 */
parsegraph_DirectionData.prototype.extentOffset = function() {
    return this._extentOffset;
};

/**
 * Sets the offset of the owning node's center within the
 * this data's extent.
 *
 * The value should use the same scale as the extent.
 */
parsegraph_DirectionData.prototype.setExtentOffset = function(offset) {
    this._extentOffset = offset;
};

parsegraph_DirectionData.prototype.setAlignmentMode = function(alignmentMode) {
    this._alignmentMode = alignmentMode;
};

parsegraph_DirectionData.prototype.alignmentMode = function() {
    return this._alignmentMode;
};

/**
 * Returns the separation between the center of the owning
 * node and this data's child node.
 *
 * This value is in owning-node space.
 */
parsegraph_DirectionData.prototype.separation = function() {
    return this._separation;
};

/**
 * Sets the separation between the center of the owning
 * node and this data's child node to the given value.
 *
 * This value is in owning-node space.
 */
parsegraph_DirectionData.prototype.setSeparation = function(separation) {
    this._separation = separation;
};

parsegraph_DirectionData.prototype.lineLength = function()
{
    return this._lineLength;
};

parsegraph_DirectionData.prototype.setLineLength = function(lineLength)
{
    this._lineLength = lineLength;
};

/**
 * Sets the alignment offset between the center of the owning
 * node and this data's child node to the given value.
 *
 * The alignment offset is perpendicular to the separation.
 * It is negative in the positive direction, and vice-versa.
 *
 * This value is in owning-node space.
 */
parsegraph_DirectionData.prototype.alignmentOffset = function() {
    return this._alignmentOffset;
};

parsegraph_DirectionData.prototype.setAlignmentOffset = function(alignmentOffset) {
    this._alignmentOffset = alignmentOffset;
};

/**
 * Returns the child node held by the owning node in the
 * direction represented by this data.
 */
parsegraph_DirectionData.prototype.node = function() {
    return this._node;
};

parsegraph_DirectionData.prototype.setNode = function(node) {
    this._node = node;
};

function parsegraph_createDirectionData()
{
    return new parsegraph_DirectionData();
}
