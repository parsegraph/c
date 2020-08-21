import parsegraph_TestSuite from '../TestSuite';

export default function parsegraph_Rect(x, y, width, height)
{
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
}

const parsegraph_Rect_Tests = new parsegraph_TestSuite("parsegraph_Rect");

export function parsegraph_createRect(x, y, width, height)
{
    return new parsegraph_Rect(x, y, width, height);
}

parsegraph_Rect.prototype.isNaN = function()
{
    return Number.isNaN(this._x)
        || Number.isNaN(this._y)
        || Number.isNaN(this._width)
        || Number.isNaN(this._height);
};

parsegraph_Rect.prototype.toNaN = function()
{
    this._x = NaN;
    this._y = NaN;
    this._width = NaN;
    this._height = NaN;
};
parsegraph_Rect.prototype.clear = parsegraph_Rect.prototype.toNaN;
parsegraph_Rect.prototype.reset = parsegraph_Rect.prototype.toNaN;

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

parsegraph_Rect.prototype.clone = function(target)
{
    if(target) {
        this.copy(target);
        return target;
    }
    return new parsegraph_Rect(this.x(), this.y(), this.width(), this.height());
};

parsegraph_Rect.prototype.copy = function(dest)
{
    if(!dest) {
        return this.clone();
    }
    dest.setX(this.x());
    dest.setY(this.y());
    dest.setWidth(this.width());
    dest.setHeight(this.height());
    return dest;
};

parsegraph_Rect.prototype.translate = function(x, y)
{
    this.setX(this.x() + x);
    this.setY(this.y() + y);
};

parsegraph_Rect.prototype.scale = function(sx, sy)
{
    if(arguments.length < 2) {
        sy = sx;
    }
    this.setX(this.x() * sx);
    this.setY(this.y() * sy);
    this.setWidth(this.width() * sx);
    this.setHeight(this.height() * sy);
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

parsegraph_Rect.prototype.toString = function()
{
    return "[Rect x=" + this.x() + ", y=" + this.y() + ", w=" + this.width() + ", h=" + this.height() + "]";
};

parsegraph_Rect.prototype.vMin = function()
{
    return this.y() - this.height()/2;
};

parsegraph_Rect.prototype.vMax = function()
{
    return this.y() + this.height()/2;
};

parsegraph_Rect_Tests.addTest("vMin", function() {
    var r = new parsegraph_Rect(0, 0, 200, 200);
    if(r.vMin() !== -100) {
        return "vMin, expected -100, got " + r.vMin();
    }
});

parsegraph_Rect_Tests.addTest("vMax", function() {
    var r = new parsegraph_Rect(0, 0, 200, 200);
    if(r.vMax() !== 100) {
        return "vMax, expected 100, got " + r.vMax();
    }
});

parsegraph_Rect.prototype.hMin = function()
{
    return this.x() - this.width()/2;
};

parsegraph_Rect.prototype.hMax = function()
{
    return this.x() + this.width()/2;
};

parsegraph_Rect_Tests.addTest("hMin", function() {
    var r = new parsegraph_Rect(0, 0, 300, 200);
    if(r.hMin() !== -150) {
        return "vMin, expected -150, got " + r.vMin();
    }
});

parsegraph_Rect_Tests.addTest("hMax", function() {
    var r = new parsegraph_Rect(0, 0, 300, 200);
    if(r.hMax() !== 150) {
        return "hMax, expected 150, got " + r.vMax();
    }
});

parsegraph_Rect.prototype.include = function(bx, by, bwidth, bheight)
{
    if(this.isNaN()) {
        this._x = bx;
        this._y = bx;
        this._width = bwidth;
        this._height = bheight;
        return;
    }
    var ax = this._x;
    var ay = this._y;
    var awidth = this._width;
    var aheight = this._height;

    var leftEdge = Math.min(ax-awidth/2, bx-bwidth/2);
    var rightEdge = Math.max(ax+awidth/2, bx+bwidth/2);
    var topEdge = Math.min(ay-aheight/2, by-bheight/2);
    var bottomEdge = Math.max(ay+aheight/2, by+bheight/2);

    var w = rightEdge - leftEdge;
    var h = bottomEdge - topEdge;
    var x = leftEdge + w/2;
    var y = topEdge + h/2;

    this._x = x;
    this._y = y;
    this._width = w;
    this._height = h;
};

parsegraph_Rect_Tests.addTest("include", function() {
    var r = new parsegraph_Rect(0, 0, 200, 200);
    r.include(0, 400, 200, 200);

    if(r.vMax() !== new parsegraph_Rect(0, 400, 200, 200).vMax()) {
        return "vMax failed to adjust";
    }
    //console.log(r);
});
