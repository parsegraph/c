function parsegraph_Camera()
{
    this._cameraX = 0;
    this._cameraY = 0;
    this._scale = 1;

    this._width = NaN;
    this._height = NaN;
    this._aspectRatio = NaN;

    this._changeVersion = 0;

    this._vflip = parsegraph_VFLIP;
};

parsegraph_Camera_Tests = new parsegraph_TestSuite("parsegraph_Camera");

function parsegraph_containsAll(viewportX, viewportY, viewWidth, viewHeight, cx, cy, width, height)
{
    var viewHalfWidth = viewWidth / 2;
    var viewHalfHeight = viewHeight / 2;
    var halfWidth = width / 2;
    var halfHeight = height / 2;

    if(cx + halfWidth > viewportX + viewHalfWidth) {
        return false;
    }
    if(cx - halfWidth < viewportX - viewHalfWidth) {
        return false;
    }
    if(cy + halfHeight > viewportY + viewHalfHeight) {
        return false;
    }
    if(cy - halfHeight < viewportY - viewHalfHeight) {
        return false;
    }
    return true;
}

parsegraph_Camera_Tests.addTest("containsAll", function() {
    if(!parsegraph_containsAll(
        0, 0, 800, 600,
        0, 0, 400, 200
    )) {
        return "Small box in viewport";
    }

    if(parsegraph_containsAll(
        0, 0, 800, 600,
        0, 0, 900, 200
    )) {
        return "Taller box in viewport";
    }

    if(parsegraph_containsAll(
        0, 0, 800, 600,
        0, 0, 400, 1000
    )) {
        return "Wider box in viewport";
    }

    if(parsegraph_containsAll(
        0, 0, 800, 600,
        0, 0, 1000, 1000
    )) {
        return "Larger box in viewport";
    }

    if(parsegraph_containsAll(
        0, 0, 800, 600,
        600, 0, 400, 200
    )) {
        return "Small box on edge of viewport";
    }
});

function parsegraph_containsAny(viewportX, viewportY, viewWidth, viewHeight, cx, cy, width, height)
{
    var viewHalfWidth = viewWidth / 2;
    var viewHalfHeight = viewHeight / 2;
    var halfWidth = width / 2;
    var halfHeight = height / 2;

    /*function dump() {
        console.log("viewportX=" + viewportX);
        console.log("viewportY=" + viewportY);
        console.log("viewWidth=" + viewWidth);
        console.log("viewHeight=" + viewHeight);
        console.log("cx=" + cx);
        console.log("cy=" + cy);
        console.log("width=" + width);
        console.log("height=" + height);
    };*/

    if(cx - halfWidth > viewportX + viewHalfWidth) {
        //console.log(1);
        //dump();
        return false;
    }
    if(cx + halfWidth < viewportX - viewHalfWidth) {
        //console.log(2);
        //dump();
        return false;
    }
    if(cy - halfHeight > viewportY + viewHalfHeight) {
        //console.log("Viewport min is greater than given's max");
        //dump();
        return false;
    }
    if(cy + halfHeight < viewportY - viewHalfHeight) {
        //console.log("Viewport does not contain any: given vmax is less than viewport's vmin");
        //dump();
        return false;
    }
    return true;
}

parsegraph_Camera_Tests.addTest("containsAny", function() {
    if(!parsegraph_containsAny(
        0, 0, 800, 600,
        0, 0, 400, 200
    )) {
        return "Small box in viewport";
    }

    if(!parsegraph_containsAny(
        0, 0, 800, 600,
        0, 0, 900, 200
    )) {
        return "Taller box in viewport";
    }

    if(!parsegraph_containsAny(
        0, 0, 800, 600,
        0, 0, 400, 1000
    )) {
        return "Wider box in viewport";
    }

    if(!parsegraph_containsAny(
        0, 0, 800, 600,
        0, 0, 1000, 1000
    )) {
        return "Larger box in viewport";
    }

    if(!parsegraph_containsAny(
        0, 0, 800, 600,
        600, 0, 400, 200
    )) {
        return "Small box on edge of viewport";
    }
});

parsegraph_Camera.prototype.setSize = function(width, height)
{
    if(this._width === width && this._height === height) {
        return false;
    }
    if(!isNaN(this._width) && !isNaN(this._height)) {
        this.adjustOrigin(
            (width - this._width)/(2*this._scale),
            (height - this._height)/(2*this._scale)
        );
    }
    this._width = width;
    this._height = height;
    this._aspectRatio = this._width / this._height;
    this.hasChanged();
    return true;
};

parsegraph_Camera.prototype.zoomToPoint = function(scaleFactor, x, y)
{
    // Get the current mouse position, in world space.
    var mouseInWorld = matrixTransform2D(
        makeInverse3x3(this.worldMatrix()),
        x, y
    );
    //console.log("mouseInWorld=" + mouseInWorld[0] + ", " + mouseInWorld[1]);

    // Adjust the scale.
    this.setScale(this.scale() * scaleFactor);

    // Get the new mouse position, in world space.
    var mouseAdjustment = matrixTransform2D(
        makeInverse3x3(this.worldMatrix()),
        x, y
    );
    //console.log("mouseAdjustment=" + mouseAdjustment[0] + ", " + mouseAdjustment[1]);

    // Adjust the origin by the movement of the fixed point.
    this.adjustOrigin(
        mouseAdjustment[0] - mouseInWorld[0],
        mouseAdjustment[1] - mouseInWorld[1]
    );
};

parsegraph_Camera.prototype.setOrigin = function(x, y)
{
    if(x == this._cameraX && y == this._cameraY) {
        return;
    }
    this._cameraX = x;
    this._cameraY = y;
    this.hasChanged();
}

parsegraph_Camera.prototype.changeVersion = function()
{
    return this._changeVersion;
}

parsegraph_Camera.prototype.hasChanged = function()
{
    ++this._changeVersion;
    this._worldMatrix = null;
}

parsegraph_Camera.prototype.toJSON = function()
{
    return {
        "cameraX":this._cameraX,
        "cameraY":this._cameraY,
        "scale":this._scale,
        "width":this._width,
        "height":this._height
    };
};

parsegraph_Camera.prototype.restore = function(json)
{
    this.setOrigin(json.cameraX, json.cameraY);
    this.setScale(json.scale);
};

parsegraph_Camera.prototype.copy = function(other)
{
    this.setOrigin(other.x(), other.y());
    this.setScale(other.scale());
};

parsegraph_Camera.prototype.scale = function()
{
    return this._scale;
};

parsegraph_Camera.prototype.x = function()
{
    return this._cameraX;
};

parsegraph_Camera.prototype.y = function()
{
    return this._cameraY;
};

parsegraph_Camera.prototype.setScale = function(scale)
{
    this._scale = scale;
};

parsegraph_Camera.prototype.toString = function()
{
    return "(" + this._cameraX + ", " + this._cameraY + ", " + this._scale + ")";
};

parsegraph_Camera.prototype.adjustOrigin = function(x, y)
{
    if(x == 0 && y == 0) {
        return;
    }
    if(Number.isNaN(x) || Number.isNaN(y)) {
        throw new Error("Adjusted origin must not be null. (Given " + x + ", " + y + ")");
    }
    this._cameraX += x;
    this._cameraY += y;
    this.hasChanged();
}

parsegraph_Camera.prototype.worldMatrix = function()
{
    return matrixMultiply3x3(
        makeTranslation3x3(this.x(), this.y()),
        makeScale3x3(this.scale(), this.scale())
    );
};

parsegraph_Camera.prototype.aspectRatio = function()
{
    return this._aspectRatio;
};

parsegraph_Camera.prototype.width = function()
{
    return this._width;
};

parsegraph_Camera.prototype.height = function()
{
    return this._height;
};

parsegraph_Camera.prototype.canProject = function()
{
    return !Number.isNaN(this._width) && !Number.isNaN(this._height);
};

parsegraph_Camera.prototype.projectionMatrix = function()
{
    if(!this.canProject()) {
        throw new Error(
            "Camera cannot create a projection matrix because the " +
            "target canvas has no size. Use canProject() to handle."
        );
    }

    return make2DProjection(this._width, this._height);
};

parsegraph_Camera.prototype.project = function()
{
    if(!this._worldMatrix || parsegraph_VFLIP !== this._vflip) {
        this._vflip = parsegraph_VFLIP;
        this._worldMatrix = matrixMultiply3x3(
            this.worldMatrix(),
            this.projectionMatrix()
        );
    }
    return this._worldMatrix;
};

parsegraph_Camera.prototype.containsAny = function(s)
{
    if(s.isNaN()) {
        return false;
    }
    var viewportX = -this.x() + this.width()/(this.scale()*2);
    if(s.x() - s.width()/2 > viewportX + (this.width()/this.scale())/2) {
        return false;
    }
    if(s.x() + s.width()/2 < viewportX - (this.width()/this.scale())/2) {
        return false;
    }
    var viewportY = -this.y() + this.height()/(this.scale()*2);
    if(s.y() - s.height()/2 > viewportY + (this.height()/this.scale())/2) {
        return false;
    }
    if(s.y() + s.height()/2 < viewportY - (this.height()/this.scale())/2) {
        return false;
    }
    return true;
};

parsegraph_Camera.prototype.containsAll = function(s)
{
    if(s.isNaN()) {
        return false;
    }
    var camera = this;
    return parsegraph_containsAll(
        -camera.x() + camera.width()/(camera.scale()*2),
        -camera.y() + camera.height()/(camera.scale()*2),
        camera.width() / camera.scale(),
        camera.height() / camera.scale(),
        s.x(),
        s.y(),
        s.width(),
        s.height()
    );
};
