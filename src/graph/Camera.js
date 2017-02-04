parsegraph_CLICK_DELAY_MILLIS = 500;

/**
 * Controls input from the user on a surface.
 */
function parsegraph_Camera(surface)
{
    this._surface = surface;

    this._cameraX = 0;
    this._cameraY = 0;
    this._scale = 1;

    this._aspectRatio = 1;
};

/**
 * Zooms to the given point.
 */
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
    this._cameraX = x;
    this._cameraY = y;
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
// XXX Backwards compat
parsegraph_Camera.prototype.graph = parsegraph_Camera.prototype.surface;

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
    if(Number.isNaN(x) || Number.isNaN(y)) {
        throw new Error("Adjusted origin must not be null. (Given " + x + ", " + y + ")");
    }
    this._cameraX += x;
    this._cameraY += y;
}

/**
 * Returns the current world matrix that represents the position of the viewer.
 */
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

/**
 * this._width = this.surface().canvas().width;
 */
parsegraph_Camera.prototype.width = function()
{
    return this._width;
};

/**
 * this._height = this.surface().canvas().height;
 */
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

        // Set the viewport to match
        this.surface().gl().viewport(
            0, 0, this.surface().canvas().width, this.surface().canvas().height
        );
    }

    this._aspectRatio = this.surface().canvas().width / this.surface().canvas().height;
    this._width = this.surface().canvas().width;
    this._height = this.surface().canvas().height;

    return matrixMultiply3x3(
        this.worldMatrix(),
        make2DProjection(
            this.surface().gl().drawingBufferWidth,
            this.surface().gl().drawingBufferHeight
        )
    );
};
