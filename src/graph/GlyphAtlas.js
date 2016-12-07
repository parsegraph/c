/**
 * TODO Allow a max texture width of 1024, by paging the texture.
 * TODO Allow glyph texture data to be downloaded rather than generated.
 *
 * http://webglfundamentals.org/webgl/lessons/webgl-text-glyphs.html
 */
function parsegraph_GlyphAtlas(fontSizePixels, fontName, fillStyle)
{
    this._canvas = document.createElement("canvas");
    this._canvas.width = this.maxTextureWidth();
    this._canvas.height = this.maxTextureWidth();
    this._distanceCanvas = document.createElement("canvas");
    this._ctx = this._canvas.getContext("2d");
    this._fontSize = fontSizePixels;
    this._fontName = fontName;
    this._fillStyle = fillStyle;
    this.restoreProperties();

    this._glyphData = {};

    // Atlas working position.
    var padding = this.fontSize() / 4;
    var x = padding;
    var y = padding;

    this.addGlyph = function(glyph) {
        var letter = this._ctx.measureText(glyph);

        if(x + letter.width + padding > this.maxTextureWidth()) {
            // Move to the next row.
            x = padding;
            y += this.letterHeight() + padding;
        }

        this._glyphData[glyph] = {
            x: x,
            y: y,
            width: letter.width,
            height: this.letterHeight(),
            needsUpdate: true
        };

        // Advance to the next letter.
        x += letter.width + padding;
        this._needsUpdate = true;

        return this._glyphData[glyph];
    };

    this.getGlyph = function(glyph) {
        var glyphData = this._glyphData[glyph];
        if(glyphData !== undefined) {
            return glyphData;
        }
        return this.addGlyph(glyph);
    };

    this.update = function() {
        if(!this._needsUpdate) {
            return;
        }

        var outOfTime = false;

        var madeUpdates = false;

        var timeElapsed = 0;
        for(var glyph in this._glyphData) {
            var glyphData = this._glyphData[glyph];
            if(!glyphData.needsUpdate) {
                continue;
            }
            if(!glyphData.painted) {
                continue;
            }

            //if(outOfTime) {
            if(true) {
                this._needsUpdate = true;
                this._ctx.fillText(
                    glyph,
                    glyphData.x,
                    glyphData.y + this.fontBaseline()
                );
                continue;
            }
            this._needsUpdate = false;

            madeUpdates = true;

            var timeStarted = Date.now();

            // First, render the glyph.
            this._distanceCanvas.width = glyphData.width * this.upscaledFactor();
            this._distanceCanvas.height = glyphData.height * this.upscaledFactor();
            this._distanceCanvas.getContext('2d').font = this.upscaledFont();
            this._distanceCanvas.getContext('2d').fillStyle = "white";
            this._distanceCanvas.getContext('2d').fillText(
                glyph,
                0,
                this.upscaledFactor() * this.fontBaseline()
            );

            // Size the distance canvas to the glyph's size.
            parsegraph_generateDistanceField(
                this._distanceCanvas
            );

            // Write the distance field to the canvas.
            this._ctx.fillStyle = "white";
            this._ctx.clearRect(
                glyphData.x,
                glyphData.y,
                glyphData.width,
                glyphData.height
            );
            this._ctx.drawImage(
                this._distanceCanvas,
                glyphData.x,
                glyphData.y,
                glyphData.width,
                glyphData.height
            );
            glyphData.needsUpdate = false;

            timeElapsed += Date.now() - timeStarted;
            if(timeElapsed > 200) {
                this.scheduleUpdate();
                outOfTime = true;
            }
        }

        if(madeUpdates) {
            this.afterUpdate();
        }
    };
}

parsegraph_GlyphAtlas.prototype.afterUpdate = function()
{
    if(!this._afterUpdate) {
        return;
    }
    this._afterUpdate[0].call(this._afterUpdate[1]);
};

parsegraph_GlyphAtlas.prototype.setAfterUpdate = function(listener, listenerThisArg)
{
    if(!listener) {
        this._afterUpdate = null;
        return;
    }
    this._afterUpdate = [listener, listenerThisArg];
};

parsegraph_GlyphAtlas.prototype.scheduleUpdate = function() {
    if(this._pendingUpdate) {
        return;
    }
    var atlas = this;
    this._pendingUpdate = window.setTimeout(function() {
        atlas._pendingUpdate = null;
        atlas.update();
    }, 400);
};

/**
 *
 * Uses the Dead Reckoning Algorithm from:
 * http://perso.ensta-paristech.fr/~manzaner/Download/IAD/Grevera_04.pdf
 */
parsegraph_generateDistanceField = function(distanceCanvas)
{
    var d1 = 3;
    var d2 = 4;

    var distanceField = distanceCanvas.getContext("2d").getImageData(
        0, 0, distanceCanvas.width, distanceCanvas.height
    );
    var data = distanceField.data;
    var setDistance = function(x, y, distance) {
        data[(y * distanceCanvas.width + x) * 4] = distance;
    };

    var distance = function(x, y) {
        return data[(y * distanceCanvas.width + x) * 4];
    };

    var points = new Int16Array(2 * distanceCanvas.width * distanceCanvas.height);

    /**
     * Sets the point at the given coordinate
     */
    var setPointToValue = function(x, y, x2, y2) {
        points[2 * (y * distanceCanvas.width + x)] = x2;
        points[2 * (y * distanceCanvas.width + x) + 1] = y2;
    };


    var setPointToRef = function(x, y, x2, y2) {
        points[2 * (y * distanceCanvas.width + x)] = pointX(x2, y2);
        points[2 * (y * distanceCanvas.width + x) + 1] = pointY(x2, y2);
    };

    var pointX = function(x, y) {
        return points[2 * (y * distanceCanvas.width + x)];
    };

    var pointY = function(x, y) {
        return points[2 * (y * distanceCanvas.width + x) + 1];
    };

    /**
     * Returns whether the given coordinate is "inside".
     */
    var isInside = function(x, y) {
        if(x < 0 || x >= distanceCanvas.width) {
            return false;
        }
        if(y < 0 || y >= distanceCanvas.height) {
            return false;
        }
        return data[(y * distanceCanvas.width + x) * 4 + 2] > 127;
    };

    //console.log(distanceCanvas.height * distanceCanvas.width);

    // Initialize.
    for(var y = 0; y < distanceCanvas.height; ++y) {
        for(var x = 0; x < distanceCanvas.width; ++x) {
            setDistance(x, y, 127);
            setPointToValue(x, y, -1, -1);
        }
    }

    // Initalize immediate interior and exterior elements
    for(var y = 0; y < distanceCanvas.height; ++y) {
        for(var x = 0; x < distanceCanvas.width; ++x) {
            if(isInside(x - 1, y) != isInside(x, y)
                || isInside(x + 1, y) != isInside(x, y)
                || isInside(x, y - 1) != isInside(x, y)
                || isInside(x, y + 1) != isInside(x, y)
            ) {
                setDistance(x, y, 0);
                setPointToValue(x, y, x, y);
            }
        }
    }

    // Perform the first pass
    for(var y = 0; y < distanceCanvas.height; ++y) {
        for(var x = 0; x < distanceCanvas.width; ++x) {
            if(distance(x - 1, y - 1) + d2 < distance(x, y)) {
                setPointToRef(x, y, x-1, y-1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x, y - 1) + d1 < distance(x, y)) {
                setPointToRef(x, y, x, y-1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x + 1, y - 1) + d2 < distance(x, y)) {
                setPointToRef(x, y, x+1, y-1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x - 1, y - 1) + d1 < distance(x, y)) {
                setPointToRef(x, y, x-1, y);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
        }
    }

    // Perform the final pass
    for(var y = distanceCanvas.height - 1; y >= 0; --y) {
        for(var x = distanceCanvas.width - 1; x >= 0; --x) {
            if(distance(x + 1, y) + d1 < distance(x, y)) {
                setPointToRef(x, y, x+1, y);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x - 1, y + 1) + d2 < distance(x, y)) {
                setPointToRef(x, y, x-1, y+1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x, y + 1) + d1 < distance(x, y)) {
                setPointToRef(x, y, x, y+1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
            if(distance(x + 1, y + 1) + d2 < distance(x, y)) {
                setPointToRef(x, y, x+1, y+1);
                setDistance(x, y, Math.sqrt(
                    (x - pointX(x, y)) * (x - pointX(x, y)) +
                    (y - pointY(x, y)) * (y - pointY(x, y))
                ));
            }
        }
    }

    // Indicate inside and outside.
    for(var y = distanceCanvas.height - 1; y >= 0; --y) {
        for(var x = distanceCanvas.width - 1; x >= 0; --x) {
            setDistance(x, y, 127 - distance(x, y));
            if(isInside(x, y)) {
                setDistance(x, y, 255 - distance(x, y));
            }
            var dist = distance(x, y);
            data[(y * distanceCanvas.width + x) * 4] = dist;
            data[(y * distanceCanvas.width + x) * 4 + 1] = dist;
            data[(y * distanceCanvas.width + x) * 4 + 2] = dist;
            data[(y * distanceCanvas.width + x) * 4 + 3] = dist;
        }
    }

    // Draw the distance field onto the distance canvas.
    distanceCanvas.getContext('2d').putImageData(
        distanceField, 0, 0
    );
};

parsegraph_GlyphAtlas.prototype.needsUpdate = function()
{
    return this._needsUpdate;
};

parsegraph_GlyphAtlas.prototype.restoreProperties = function()
{
    this._ctx.font = this.font();
    this._ctx.fillStyle = this._fillStyle;
    this._needsUpdate = true;
};

parsegraph_GlyphAtlas.prototype.font = function()
{
    return this._fontSize + "px " + this._fontName;
};

parsegraph_GlyphAtlas.prototype.upscaledFont = function()
{
    return (this.upscaledFactor() * this._fontSize) + "px " + this._fontName;
};

parsegraph_GlyphAtlas.prototype.upscaledFactor = function()
{
    return 2;
};

parsegraph_GlyphAtlas.prototype.canvas = function()
{
    return this._canvas;
};

parsegraph_GlyphAtlas.prototype.maxTextureWidth = function()
{
    return 2048;
};

parsegraph_GlyphAtlas.prototype.letterHeight = function()
{
    return this.fontSize() * 1.3;
};

parsegraph_GlyphAtlas.prototype.fontBaseline = function()
{
    return this.fontSize();
};

parsegraph_GlyphAtlas.prototype.fontSize = function()
{
    return this._fontSize;
};

parsegraph_GlyphAtlas.prototype.fontName = function()
{
    return this._fontName;
};
