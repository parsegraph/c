function parsegraph_Size()
{
    if(arguments.length > 0) {
        this[0] = arguments[0];
        this[1] = arguments[1];
    }
    else {
        this[0] = 0;
        this[1] = 0;
    }
    this.length = 2;
}

function parsegraph_createSize()
{
    var s = new parsegraph_Size();
    if(arguments.length > 1) {
        s[0] = arguments[0];
        s[1] = arguments[1];
    }
    else if(arguments.length > 0) {
        s[0] = arguments[0];
        s[1] = arguments[0];
    }
    return s;
}

parsegraph_Size.prototype.clear = function()
{
    this[0] = 0;
    this[1] = 0;
};
parsegraph_Size.prototype.reset = parsegraph_Size.prototype.clear;

parsegraph_Size.prototype.scale = function(factor)
{
    this[0] *= factor;
    this[1] *= factor;
};

parsegraph_Size.prototype.scaled = function(factor)
{
    return new parsegraph_Size(
        this[0] * factor,
        this[1] * factor
    );
};

parsegraph_Size.prototype.width = function()
{
    return this[0];
};

parsegraph_Size.prototype.setWidth = function(width)
{
    this[0] = width;
};

parsegraph_Size.prototype.height = function()
{
    return this[1];
};

parsegraph_Size.prototype.setHeight = function(height)
{
    this[1] = height;
};

parsegraph_Size.prototype.toString = function()
{
    return "[w=" + this.width() + ", h=" + this.height() + "]";
};

