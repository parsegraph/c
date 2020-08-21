import parsegraph_TestSuite from '../TestSuite';

export default function parsegraph_Color(r, g, b, a)
{
    if(arguments.length === 1) {
        g = r;
        b = r;
        a = 1;
    }
    else if(arguments.length === 3) {
        a = 1;
    }
    else if(arguments.length !== 4) {
        throw new Error("Color must be given initial component values.");
    }
    this._r = Math.min(1, Math.max(0, r));
    this._g = Math.min(1, Math.max(0, g));
    this._b = Math.min(1, Math.max(0, b));
    this._a = Math.min(1, Math.max(0, a));
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

parsegraph_Color.prototype.setA = function(value) {
    this._a = Math.min(1, Math.max(0, value));
    return this;
};

parsegraph_Color.prototype.setR = function(value) {
    this._r = Math.min(1, Math.max(0, value));
    return this;
};

parsegraph_Color.prototype.setG = function(value) {
    this._g = Math.min(1, Math.max(0, value));
    return this;
};

parsegraph_Color.prototype.setB = function(value) {
    this._b = Math.min(1, Math.max(0, value));
    return this;
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

export function parsegraph_inverseSRGBCompanding(v)
{
    if(v <= 0.04045) {
        return v/12.92;
    }
    return Math.pow((v+0.055)/1.055, 2.4);
}

export function parsegraph_SRGBCompanding(v)
{
    if(v <= 0.0031308) {
        return v*12.92;
    }
    return 1.055*Math.pow(v,1/2.4)-0.055;
}

parsegraph_Color.prototype.luminance = function() {
    // sRGB color model.
    var x1 = parsegraph_inverseSRGBCompanding(this.r());
    var y1 = parsegraph_inverseSRGBCompanding(this.g());
    var z1 = parsegraph_inverseSRGBCompanding(this.b());
    return x1 * 0.648431 + y1 * 0.321152 + z1 * 0.155886;
};

parsegraph_Color.prototype.interpolate = function(other, interp) {
    //console.log("Interpolating");
    interp = Math.min(1, Math.max(0, interp));

    var e = 216/24389;
    var k = 24389/27;

    //console.log("r=" + this.r() + ", g=" + this.g()+ ", b=" + this.b());
    var x1 = parsegraph_inverseSRGBCompanding(this.r());
    var y1 = parsegraph_inverseSRGBCompanding(this.g());
    var z1 = parsegraph_inverseSRGBCompanding(this.b());
    //console.log("x1=" + x1 + ", y1=" + y1 + ", z1=" + z1);

    var xref1 = x1*0.648431;
    var yref1 = y1*0.321152;
    var zref1 = z1*0.155886;

    var fx1;
    if(xref1 > e) {
        fx1 = Math.pow(xref1, 1/3);
    }
    else {
        fx1 = (k*xref1+16)/116;
    }
    var fy1;
    if(yref1 > e) {
        fy1 = Math.pow(yref1, 1/3);
    }
    else {
        fy1 = (k*yref1+16)/116;
    }
    var fz1;
    if(zref1 > e) {
        fz1 = Math.pow(zref1, 1/3);
    }
    else {
        fz1 = (k*zref1+16)/116;
    }

    var L1 = 116*fy1-16;
    var a1 = 500*(fx1-fy1);
    var b1 = 200*(fy1-fz1);
    //console.log("L=" + L1 + ", a1=" + a1 + ", b1=" + b1);

    var C1 = Math.sqrt(Math.pow(a1, 2) + Math.pow(b1, 2));
    var H1 = Math.atan2(a1, b1);
    if(H1 < 0) {
        H1 += 2 * Math.PI;
    }

    //console.log("L=" + L1 + ", C1=" + C1 + ", H1=" + H1);

    var x2 = parsegraph_inverseSRGBCompanding(other.r());
    var y2 = parsegraph_inverseSRGBCompanding(other.g());
    var z2 = parsegraph_inverseSRGBCompanding(other.b());

    var xref2 = x2/0.648431;
    var yref2 = y2/0.321152;
    var zref2 = z2/0.155886;

    var fx2;
    if(xref2 > e) {
        fx2 = Math.pow(xref2, 1/3);
    }
    else {
        fx2 = (k*xref2+16)/116;
    }
    var fy2;
    if(yref2 > e) {
        fy2 = Math.pow(yref2, 1/3);
    }
    else {
        fy2 = (k*yref2+16)/116;
    }
    var fz2;
    if(zref2 > e) {
        fz2 = Math.pow(zref2, 1/3);
    }
    else {
        fz2 = (k*zref2+16)/116;
    }
    var L2 = 116*fy2-16;
    var a2 = 500*(fx2-fy2);
    var b2 = 200*(fy2-fz2);

    var C2 = Math.sqrt(Math.pow(a2, 2) + Math.pow(b2, 2));
    var H2 = Math.atan2(a2, b2);
    if(H2 < 0) {
        H2 += 2 * Math.PI;
    }
    //console.log("L2=" + L2 + ", C2=" + C2 + ", H2=" + H2);

    var L3 = L1 + (L2 - L1) * interp;
    var C3 = C1 + (C2 - C1) * interp;
    var H3 = H1 + (H2 - H1) * interp;
    //console.log("L3=" + L3 + ", C3=" + C3 + ", H3=" + H3);

    var a3 = C3 * Math.cos(H3);
    var b3 = C3 * Math.sin(H3);
    //console.log("L3=" + L3 + ", a3=" + a3 + ", b3=" + b3);

    var fy3 = (L3 + 16)/116;
    var fz3 = fy3 - b3/200;
    var fx3 = a3/500+fy3;

    var zref3 = Math.pow(fz3, 3);
    if(zref3 <= e) {
        zref3 = (116*fz3-16)/k;
    }

    var yref3;
    if(L3 > k * e) {
        yref3 = Math.pow((L3+16)/116, 3);
    }
    else {
        yref3 = L3/k;
    }

    var xref3 = Math.pow(fx3, 3);
    if(xref3 <= e) {
        xref3 = (116*fx3-16)/k;
    }

    var x3 = xref3*0.648431;
    var y3 = yref3*0.321152;
    var z3 = zref3*0.155886;
    //console.log("x3=" + x3 + ", y3=" + y3 + ", z3=" + z3);

    return new parsegraph_Color(
        parsegraph_SRGBCompanding(x3),
        parsegraph_SRGBCompanding(y3),
        parsegraph_SRGBCompanding(z3),
        this.a() + (other.a() - this.a()) * interp
    );
};

export function parsegraph_fromRGB(rgb, defaultAlpha)
{
    // Default alpha to 255.
    if(arguments.length === 1) {
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
    return parsegraph_createColor(this.r(), this.g(), this.b(), this.a());
};

parsegraph_Color.prototype.equals = function(other) {
    return this.r() === other.r() && this.g() === other.g() && this.b() === other.b() && this.a() === other.a();
};

export function parsegraph_createColor(r, g, b, a)
{
    return new parsegraph_Color(r, g, b, a);
}

const parsegraph_Color_Tests = new parsegraph_TestSuite("parsegraph_Color");

parsegraph_Color_Tests.addTest("parsegraph_Color.simplify", function() {
});

/*parsegraph_Color_Tests.addTest("parsegraph_Color.interpolate trivial", function() {
    var r = new parsegraph_Color(0, 0, 1);
    var b = new parsegraph_Color(1, 1, 0);
    var c = r.interpolate(b, 0);
    if(!c.equals(r)) {
        return "Trivial interpolate (interp=0) does not work: " + c.asRGB();
    }
});

parsegraph_Color_Tests.addTest("parsegraph_Color.interpolate trivial", function() {
    var r = new parsegraph_Color(0, 0, 1);
    var b = new parsegraph_Color(1, 1, 0);
    var c = r.interpolate(b, 1);
    if(!c.equals(b)) {
        return "Trivial interpolate (interp=1) does not work: " + c.asRGB();
    }
});

parsegraph_Color_Tests.addTest("parsegraph_Color.interpolate", function() {
    var r = new parsegraph_Color(0, 0, 1);
    var b = new parsegraph_Color(1, 1, 0);
    var c = r.interpolate(b, 0);
    if(!c.equals(new parsegraph_Color(0, 1, 0))) {
        return "Colors do not interpolate properly: " + c.asRGB();
    }
});
*/
