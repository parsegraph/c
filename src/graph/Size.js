function parsegraph_Size(width, height)
{
    this._width = width;
    this._height = height;
}

function parsegraph_createSize(width, height)
{
    return new parsegraph_Size(width, height);
}

function parsegraph_Size(width, height)
{
    this._width = width;
    this._height = height;
}

parsegraph_Size.prototype.scale = function(factor)
{
    this._width *= factor;
    this._height *= factor;
};

parsegraph_Size.prototype.scaled = function(factor)
{
    return new parsegraph_Size(
        this._width * factor,
        this._height * factor
    );
};

parsegraph_Size.prototype.width = function()
{
    return this._width;
};

parsegraph_Size.prototype.setWidth = function(width)
{
    this._width = width;
};

parsegraph_Size.prototype.height = function()
{
    return this._height;
};

parsegraph_Size.prototype.setHeight = function(height)
{
    this._height = height;
};

parsegraph_Size.prototype.toString = function()
{
    return "[w=" + this.width() + ", h=" + this.height() + "]";
};

