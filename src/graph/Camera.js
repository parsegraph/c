parsegraph_CLICK_DELAY_MILLIS = 500;

function parsegraph_Camera(surface)
{
    if(!surface) {
        throw new Error("A surface must be provided");
    }
    this._surface = surface;

    this._cameraX = 0;
    this._cameraY = 0;
    this._scale = 1;

    this._width = 0;
    this._height = 0;
    this._aspectRatio = 1;
    this._changeVersion = 0;
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

    function dump() {
        console.log("viewportX=" + viewportX);
        console.log("viewportY=" + viewportY);
        console.log("viewWidth=" + viewWidth);
        console.log("viewHeight=" + viewHeight);
        console.log("cx=" + cx);
        console.log("cy=" + cy);
        console.log("width=" + width);
        console.log("height=" + height);
    };

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

parsegraph_Camera.prototype.surface = function()
{
    return this._surface;
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
    var displayWidth = this.surface().container().clientWidth;
    var displayHeight = this.surface().container().clientHeight;

    return displayWidth != 0 && displayHeight != 0;
};

parsegraph_Camera.prototype.project = function()
{
    if(!this.canProject()) {
        throw new Error(
            "Camera cannot create a projection matrix because the " +
            "target canvas has no size. Use canProject() to handle."
        );
    }

    // http://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // Lookup the size the browser is displaying the canvas.
    var displayWidth = this.surface().container().clientWidth;
    var displayHeight = this.surface().container().clientHeight;

    // Check if the canvas is not the same size.
    if(
        this.surface().canvas().width != displayWidth
        || this.surface().canvas().height != displayHeight
    ) {
        // Make the canvas the same size
        this.surface().canvas().width = displayWidth;
        this.surface().canvas().height = displayHeight;
    }
    // Set the viewport to match
    this.surface().gl().viewport(
        0, 0, this.surface().canvas().width, this.surface().canvas().height
        );

    if(this._aspectRatio != this.surface().canvas().width / this.surface().canvas().height) {
        this._aspectRatio = this.surface().canvas().width / this.surface().canvas().height;
        this.hasChanged();
    }
    if(this._width != this.surface().canvas().width) {
        this._width = this.surface().canvas().width;
        this.hasChanged();
    }
    if(this._height != this.surface().canvas().height) {
        this._height = this.surface().canvas().height;
        this.hasChanged();
    }

    return matrixMultiply3x3(
        this.worldMatrix(),
        make2DProjection(
            this.surface().gl().drawingBufferWidth,
            this.surface().gl().drawingBufferHeight
        )
    );
};

parsegraph_Camera.prototype.contains = function(s)
{
    var camera = this;
    return parsegraph_containsAny(
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
