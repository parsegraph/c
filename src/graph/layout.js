function parsegraph_FullscreenLayout()
{
}

parsegraph_FullscreenLayout.prototype.layout = function(window, sizeOut)
{
    sizeOut.setX(0);
    sizeOut.setY(0);
    sizeOut.setWidth(window.width());
    sizeOut.setHeight(window.height());
};

function parsegraph_FixedLayout(window)
{
    this._x = NaN;
    this._y = NaN;
    this._width = NaN;
    this._height = NaN;
}

parsegraph_FixedLayout.prototype.layout = function(window, sizeOut)
{
    if(Number.isNaN(this._x)) {
        throw new Error("X must not be NaN");
    }
    if(Number.isNaN(this._y)) {
        throw new Error("Y must not be NaN");
    }
    if(Number.isNaN(this._width)) {
        throw new Error("Width must not be NaN");
    }
    if(Number.isNaN(this._height)) {
        throw new Error("Height must not be NaN");
    }
    sizeOut.setX(this._x);
    sizeOut.setY(this._y);
    sizeOut.setWidth(this._width);
    sizeOut.setHeight(this._height);
};

parsegraph_FixedLayout.prototype.setX = function(x)
{
    this._x = x;
};

parsegraph_FixedLayout.prototype.setY = function(y)
{
    this._y = y;
};

parsegraph_FixedLayout.prototype.setWidth = function(width)
{
    this._width = width;
};

parsegraph_FixedLayout.prototype.setHeight = function(height)
{
    this._height = height;
};

parsegraph_FixedLayout.prototype.x = function()
{
    return this._x;
};

parsegraph_FixedLayout.prototype.y = function()
{
    return this._y;
};

parsegraph_FixedLayout.prototype.width = function()
{
    return this._width;
};

parsegraph_FixedLayout.prototype.height = function()
{
    return this._height;
};

function parsegraph_PercentLayout(x, y, width, height)
{
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
}

parsegraph_PercentLayout.prototype.layout = function(window, sizeOut)
{
    if(Number.isNaN(this._x)) {
        throw new Error("X must not be NaN");
    }
    if(Number.isNaN(this._y)) {
        throw new Error("Y must not be NaN");
    }
    if(Number.isNaN(this._width)) {
        throw new Error("Width must not be NaN");
    }
    if(Number.isNaN(this._height)) {
        throw new Error("Height must not be NaN");
    }
    sizeOut.setX(this._x * window.width());
    sizeOut.setY(this._y * window.height());
    sizeOut.setWidth(this._width * window.width());
    sizeOut.setHeight(this._height * window.height());
};

parsegraph_PercentLayout.prototype.setX = function(x)
{
    if(x > 1 || x < 0) {
        throw new Error("X must be between 0 and 1, inclusive.");
    }
    this._x = x;
};

parsegraph_PercentLayout.prototype.setY = function(y)
{
    if(y > 1 || y < 0) {
        throw new Error("Y must be between 0 and 1, inclusive.");
    }
    this._y = y;
};

parsegraph_PercentLayout.prototype.setWidth = function(width)
{
    if(width > 1 || width < 0) {
        throw new Error("width must be between 0 and 1, inclusive.");
    }
    this._width = width;
};

parsegraph_PercentLayout.prototype.setHeight = function(height)
{
    if(height > 1 || height < 0) {
        throw new Error("height must be between 0 and 1, inclusive.");
    }
    this._height = height;
};

parsegraph_PercentLayout.prototype.x = function()
{
    return this._x;
};

parsegraph_PercentLayout.prototype.y = function()
{
    return this._y;
};

parsegraph_PercentLayout.prototype.width = function()
{
    return this._width;
};

parsegraph_PercentLayout.prototype.height = function()
{
    return this._height;
};

function parsegraph_AnchorLayout(anchor, width, height, horzMargin, vertMargin)
{
    this._anchor = null;
    this._horzMargin = 0;
    this._vertMargin = 0;
    this._width = NaN;
    this._height = NaN;
    switch(arguments.length) {
    case 0:
        break;
    case 1:
        this._anchor = anchor;
        break;
    case 2:
        this._anchor = anchor;
        this._width = width;
        this._height = width;
        break;
    case 3:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        break;
    case 4:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        switch(anchor) {
        case parsegraph_TOPLEFT:
        case parsegraph_TOPRIGHT:
        case parsegraph_BOTTOMLEFT:
        case parsegraph_BOTTOMRIGHT:
        case parsegraph_CENTER:
            this._horzMargin = horzMargin;
            this._vertMargin = horzMargin;
            break;
        case parsegraph_TOP:
        case parsegraph_BOTTOM:
        case parsegraph_LEFT:
        case parsegraph_RIGHT:
            this._vertMargin = horzMargin;
            break;
        default:
            throw new Error("Unrecognized anchor given: " + anchor);
        }
        break;
    default:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        this._horzMargin = horzMargin;
        this._vertMargin = vertMargin;
        break;
    }
};

parsegraph_AnchorLayout.prototype.layout = function(window, sizeOut)
{
    if(Number.isNaN(this._horzMargin)) {
        throw new Error("Horizontal margin must not be NaN");
    }
    if(Number.isNaN(this._vertMargin)) {
        throw new Error("Vertical margin must not be NaN");
    }
    if(Number.isNaN(this._width)) {
        throw new Error("Width must not be NaN");
    }
    if(Number.isNaN(this._height)) {
        throw new Error("Height must not be NaN");
    }
    if(this._anchor === null) {
        throw new Error("Anchor must not be null");
    }
    switch(anchor) {
    case parsegraph_BOTTOMLEFT:
        sizeOut.setX(this._horzMargin);
        sizeOut.setY(window.height() - this.height() - this._vertMargin);
        break;
    case parsegraph_TOPLEFT:
        sizeOut.setX(this._horzMargin);
        sizeOut.setY(this._vertMargin);
        break;
    case parsegraph_TOP:
        sizeOut.setX(window.width()/2 + this._horzMargin - this.width()/2);
        sizeOut.setY(this._vertMargin);
        break;
    case parsegraph_TOPRIGHT:
        sizeOut.setX(window.width() - this.width() - this._horzMargin);
        sizeOut.setY(this._vertMargin);
        break;
    case parsegraph_RIGHT:
        sizeOut.setX(window.width() - this.width() - this._horzMargin);
        sizeOut.setY(window.height()/2 + this._vertMargin);
        break;
    case parsegraph_BOTTOMRIGHT:
        sizeOut.setX(window.width() - this.width() - this._horzMargin);
        sizeOut.setY(window.height() - this.height() - this._vertMargin);
        break;
    case parsegraph_BOTTOM:
        sizeOut.setX(window.width()/2 - this.width()/2 + this._horzMargin);
        sizeOut.setY(window.height() - this.height() - this._vertMargin);
        break;
    case parsegraph_LEFT:
        sizeOut.setX(this._horzMargin);
        sizeOut.setY(window.height()/2 - this.height()/2 + this._vertMargin);
        break;
    case parsegraph_CENTER:
        sizeOut.setX(window.width()/2 - this.width()/2 + this._horzMargin);
        sizeOut.setY(window.height()/2 - this.height()/2 + this._vertMargin);
        break;
    default:
        throw new Error("Anchor must be one of the Parsegraph anchor types. (i.e. parsegraph_TOPLEFT, parsegraph_CENTER)");
    }
};

parsegraph_AnchorLayout.prototype.setAnchor = function(anchor)
{
    switch(anchor) {
    case parsegraph_TOPLEFT:
    case parsegraph_TOP:
    case parsegraph_TOPRIGHT:
    case parsegraph_RIGHT:
    case parsegraph_BOTTOMRIGHT:
    case parsegraph_BOTTOM:
    case parsegraph_BOTTOMLEFT:
    case parsegraph_LEFT:
    case parsegraph_CENTER:
        break;
    default:
        throw new Error("Anchor must be one of the Parsegraph anchor types. (i.e. parsegraph_TOPLEFT, parsegraph_CENTER)");
    }
    this._anchor = anchor;
};

parsegraph_AnchorLayout.prototype.setWidth = function(width)
{
    if(typeof(width) !== "number") {
        throw new Error("width must be a number.");
    }
    this._width = width;
};

parsegraph_AnchorLayout.prototype.setHeight = function(height)
{
    if(typeof(height) !== "number") {
        throw new Error("height must be a number.");
    }
    this._height = height;
};

parsegraph_AnchorLayout.prototype.setHorzMargin = function(val)
{
    if(Number.isNaN(val)) {
        throw new Error("Horizontal margin must not be NaN");
    }
    this._horzMargin = val;
};

parsegraph_AnchorLayout.prototype.horzMargin = function()
{
    return this._horzMargin;
};

parsegraph_AnchorLayout.prototype.setVertMargin = function(val)
{
    if(Number.isNaN(val)) {
        throw new Error("Vertical margin must not be NaN");
    }
    this._vertMargin = val;
};

function parsegraph_PercentAnchorLayout(anchor, width, height, horzMargin, vertMargin)
{
    this._anchor = null;
    this._horzMargin = 0;
    this._vertMargin = 0;
    this._width = 1;
    this._height = 1;
    switch(arguments.length) {
    case 0:
        break;
    case 1:
        this._anchor = anchor;
        switch(anchor) {
        case parsegraph_CENTER:
        case parsegraph_TOPLEFT:
        case parsegraph_BOTTOMLEFT:
        case parsegraph_BOTTOMRIGHT:
        case parsegraph_TOPRIGHT:
            this._width = 0.5;
            this._height = 0.5;
            break;
        case parsegraph_TOP:
        case parsegraph_BOTTOM:
            this._width = 1;
            this._height = 0.5;
            break;
        case parsegraph_LEFT:
        case parsegraph_RIGHT:
            this._width = 0.5;
            this._height = 1;
            break;
        }
        break;
    case 2:
        this._anchor = anchor;
        this._width = width;
        this._height = width;
        break;
    case 3:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        break;
    case 4:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        switch(anchor) {
        case parsegraph_TOPLEFT:
        case parsegraph_TOPRIGHT:
        case parsegraph_BOTTOMLEFT:
        case parsegraph_BOTTOMRIGHT:
        case parsegraph_CENTER:
            this._horzMargin = horzMargin;
            this._vertMargin = horzMargin;
            break;
        case parsegraph_TOP:
        case parsegraph_BOTTOM:
        case parsegraph_LEFT:
        case parsegraph_RIGHT:
            this._vertMargin = horzMargin;
            break;
        default:
            throw new Error("Unrecognized anchor given: " + anchor);
        }
        break;
    default:
        this._anchor = anchor;
        this._width = width;
        this._height = height;
        this._horzMargin = horzMargin;
        this._vertMargin = vertMargin;
        break;
    }
};

parsegraph_PercentAnchorLayout.prototype.setWidth = function(width)
{
    if(typeof(width) !== "number" || width < 0 || width > 1) {
        throw new Error("width must be a number between 0 and 1, inclusive.");
    }
    this._width = width;
};

parsegraph_PercentAnchorLayout.prototype.width = function()
{
    return this._width;
};

parsegraph_PercentAnchorLayout.prototype.setHeight = function(height)
{
    if(typeof(height) !== "number") {
        throw new Error("height must be a number between 0 and 1, inclusive.");
    }
    this._height = height;
};

parsegraph_PercentAnchorLayout.prototype.height = function()
{
    return this._height;
};

parsegraph_PercentAnchorLayout.prototype.layout = function(window, sizeOut)
{
    if(Number.isNaN(this._horzMargin)) {
        throw new Error("Horizontal margin must not be NaN");
    }
    if(Number.isNaN(this._vertMargin)) {
        throw new Error("Vertical margin must not be NaN");
    }
    if(Number.isNaN(this._width)) {
        throw new Error("Width must not be NaN");
    }
    if(Number.isNaN(this._height)) {
        throw new Error("Height must not be NaN");
    }
    if(this._anchor === null) {
        throw new Error("Anchor must not be null");
    }
    switch(this._anchor) {
    case parsegraph_BOTTOMLEFT:
        sizeOut.setX(window.width()*this._horzMargin);
        sizeOut.setY(window.height()*this._vertMargin);
        break;
    case parsegraph_TOPLEFT:
        sizeOut.setX(window.width()*this._horzMargin);
        sizeOut.setY(window.height() - window.height()*this.height() - window.height()*this._vertMargin);
        break;
    case parsegraph_TOP:
        sizeOut.setX(window.width()/2 + window.width()*this._horzMargin - window.width()*this.width()/2);
        sizeOut.setY(window.height()*(1 - this._vertMargin) - this.height()*window.height());
        break;
    case parsegraph_TOPRIGHT:
        sizeOut.setX(window.width() - window.width()*this.width() - window.width()*this._horzMargin);
        sizeOut.setY(window.height() - window.height()*this.height() - window.height()*this._vertMargin);
        break;
    case parsegraph_RIGHT:
        sizeOut.setX(window.width() - window.width()*this.width() - window.width()*this._horzMargin);
        sizeOut.setY(window.height()*this._vertMargin);
        break;
    case parsegraph_BOTTOMRIGHT:
        sizeOut.setX(window.width() - window.width()*this.width() - window.width()*this._horzMargin);
        sizeOut.setY(window.height()*this._vertMargin);
        break;
    case parsegraph_BOTTOM:
        sizeOut.setX(window.width()/2 - window.width()*this.width()/2 + window.width()*this._horzMargin);
        sizeOut.setY(window.height()*this._vertMargin);
        break;
    case parsegraph_LEFT:
        sizeOut.setX(window.width()*this._horzMargin);
        sizeOut.setY(window.height()/2 - window.height()*this.height()/2 + window.height()*this._vertMargin);
        break;
    case parsegraph_CENTER:
        sizeOut.setX(window.width()/2 - window.width()*this.width()/2 + window.width()*this._horzMargin);
        sizeOut.setY(window.height()/2 - window.height()*this.height()/2 + window.height()*this._vertMargin);
        break;
    default:
        throw new Error("Anchor must be one of the Parsegraph anchor types. (i.e. parsegraph_TOPLEFT, parsegraph_CENTER)");
    }
    sizeOut.setWidth(window.width()*this.width());
    sizeOut.setHeight(window.height()*this.height());
};

parsegraph_PercentAnchorLayout.prototype.setAnchor = function(anchor)
{
    switch(anchor) {
    case parsegraph_TOPLEFT:
    case parsegraph_TOP:
    case parsegraph_TOPRIGHT:
    case parsegraph_RIGHT:
    case parsegraph_BOTTOMRIGHT:
    case parsegraph_BOTTOM:
    case parsegraph_BOTTOMLEFT:
    case parsegraph_LEFT:
    case parsegraph_CENTER:
        break;
    default:
        throw new Error("Anchor must be one of the Parsegraph anchor types. (i.e. parsegraph_TOPLEFT, parsegraph_CENTER)");
    }
    this._anchor = anchor;
};

parsegraph_PercentAnchorLayout.prototype.setHorzMargin = function(val)
{
    if(Number.isNaN(val) || val < 0 || val > 1) {
        throw new Error("Horizontal margin must be a number between 0 and 1, inclusive.");
    }
    this._horzMargin = val;
};

parsegraph_PercentAnchorLayout.prototype.horzMargin = function()
{
    return this._horzMargin;
};

parsegraph_PercentAnchorLayout.prototype.setVertMargin = function(val)
{
    if(Number.isNaN(val) || val < 0 || val > 1) {
        throw new Error("Vertical margin must be a number between 0 and 1, inclusive.");
    }
    this._vertMargin = val;
};
