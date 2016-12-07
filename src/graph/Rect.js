function parsegraph_Rect(x, y, width, height)
{
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
}

function parsegraph_createRect(x, y, width, height)
{
    return new parsegraph_Rect(x, y, width, height);
}

parsegraph_Rect.prototype.x = function()
{
    return this._x;
};

parsegraph_Rect.prototype.setX = function(x)
{
    this._x = x;
};

parsegraph_Rect.prototype.y = function()
{
    return this._y;
};

parsegraph_Rect.prototype.setY = function(y)
{
    this._y = y;
};

parsegraph_Rect.prototype.height = function()
{
    return this._height;
};

parsegraph_Rect.prototype.setHeight = function(height)
{
    this._height = height;
};

parsegraph_Rect.prototype.width = function()
{
    return this._width;
};

parsegraph_Rect.prototype.setWidth = function(width)
{
    this._width = width;
};

parsegraph_Rect.prototype.setHeight = function(height)
{
    this._height = height;
};
