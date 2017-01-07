/**
 * Values between 0 and 1, inclusive.
 *
 * If alpha is undefined, 1 is used.
 */
function parsegraph_Color(r, g, b, a)
{
    if(a === undefined) {
        a = 1;
    }
    this._r = r;
    this._g = g;
    this._b = b;
    this._a = a;
}

parsegraph_Color.prototype.r = function() {
    return this._r;
};

parsegraph_Color.prototype.g = function() {
    return this._g;
};

parsegraph_Color.prototype.b = function() {
    return this._b;
};

parsegraph_Color.prototype.a = function() {
    return this._a;
};

parsegraph_Color.prototype.multiply = function(other) {
    return new parsegraph_Color(
        this.r() * other.r(),
        this.g() * other.g(),
        this.b() * other.b(),
        this.a() * other.a()
    );
};

parsegraph_Color.prototype.premultiply = function(other) {
    return new parsegraph_Color(
        (this.a() * this.r()) + (other.r() * (1.0 - this.a())),
        (this.a() * this.g()) + (other.g() * (1.0 - this.a())),
        (this.a() * this.b()) + (other.b() * (1.0 - this.a())),
        1.0
    );
};

parsegraph_Color.prototype.asRGB = function() {
    return "rgb(" +
        Math.round(this._r * 255) + ", " +
        Math.round(this._g * 255) + ", " +
        Math.round(this._b * 255) + ")"
};

/**
 * Extracts a color from an RGB string, with a format similar to asRGB.
 *
 * The alpha byte value is used if present. Otherwise the optional alpha is used (defaults to 255).
 */
parsegraph_fromRGB = function(rgb, defaultAlpha)
{
    // Default alpha to 255.
    if(defaultAlpha  === undefined) {
        defaultAlpha = 255;
    }

    // Extract the color from the string, as formatted in asRGB.
    var value = [];
    rgb.trim().substring("rgb(".length, rgb.length - 1).split(',').forEach(function(c) {
        value.push(c.trim() - 0);
    });
    if(value.length < 3) {
        throw new Error("Failed to parse color");
    }
    if(value.length === 3) {
        value.push(defaultAlpha);
    }

    // Return a new color.
    return new parsegraph_Color(value[0]/255, value[1]/255, value[2]/255, value[3]/255);
};

parsegraph_Color.prototype.clone = function() {
    return parsegraph_createColor(this._r, this._g, this._b, this._a);
};

function parsegraph_createColor(r, g, b, a)
{
    return new parsegraph_Color(r, g, b, a);
}

parsegraph_Color_Tests = new parsegraph_TestSuite("parsegraph_Color");
parsegraph_AllTests.addTest(parsegraph_Color_Tests);

parsegraph_Color_Tests.addTest("parsegraph_Color.simplify", function() {
});
