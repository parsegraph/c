import parsegraph_TestSuite from '../TestSuite';

export default class Color {
  _r: number;
  _g: number;
  _b: number;
  _a: number;
  constructor(r: number, g?: number, b?: number, a?: number) {
    if (arguments.length === 1) {
      g = r;
      b = r;
      a = 1;
    } else if (arguments.length === 3) {
      a = 1;
    } else if (arguments.length !== 4) {
      throw new Error('Color must be given initial component values.');
    }
    this._r = Math.min(1, Math.max(0, r));
    this._g = Math.min(1, Math.max(0, g));
    this._b = Math.min(1, Math.max(0, b));
    this._a = Math.min(1, Math.max(0, a));
  }

  r(): number {
    return this._r;
  }

  g(): number {
    return this._g;
  }

  b(): number {
    return this._b;
  }

  a(): number {
    return this._a;
  }

  setA(value: number): Color {
    this._a = Math.min(1, Math.max(0, value));
    return this;
  }

  setR(value: number): Color {
    this._r = Math.min(1, Math.max(0, value));
    return this;
  }

  setG(value: number): Color {
    this._g = Math.min(1, Math.max(0, value));
    return this;
  }

  setB(value: number): Color {
    this._b = Math.min(1, Math.max(0, value));
    return this;
  }

  multiply(other: Color): Color {
    return new Color(
        this.r() * other.r(),
        this.g() * other.g(),
        this.b() * other.b(),
        this.a() * other.a(),
    );
  }

  premultiply(other: Color): Color {
    return new Color(
        this.a() * this.r() + other.r() * (1.0 - this.a()),
        this.a() * this.g() + other.g() * (1.0 - this.a()),
        this.a() * this.b() + other.b() * (1.0 - this.a()),
        1.0,
    );
  }

  asRGB(): string {
    return (
      'rgb(' +
      Math.round(this._r * 255) +
      ', ' +
      Math.round(this._g * 255) +
      ', ' +
      Math.round(this._b * 255) +
      ')'
    );
  }

  luminance(): number {
    // sRGB color model.
    const x1 = Color.inverseSRGBCompanding(this.r());
    const y1 = Color.inverseSRGBCompanding(this.g());
    const z1 = Color.inverseSRGBCompanding(this.b());
    return x1 * 0.648431 + y1 * 0.321152 + z1 * 0.155886;
  }

  interpolate(other: Color, interp: number): Color {
    // console.log("Interpolating");
    interp = Math.min(1, Math.max(0, interp));

    const e: number = 216 / 24389;
    const k: number = 24389 / 27;

    // console.log("r=" + this.r() + ", g=" + this.g()+ ", b=" + this.b());
    const x1: number = Color.inverseSRGBCompanding(this.r());
    const y1: number = Color.inverseSRGBCompanding(this.g());
    const z1: number = Color.inverseSRGBCompanding(this.b());
    // console.log("x1=" + x1 + ", y1=" + y1 + ", z1=" + z1);

    const xref1 = x1 * 0.648431;
    const yref1 = y1 * 0.321152;
    const zref1 = z1 * 0.155886;

    let fx1: number;
    if (xref1 > e) {
      fx1 = Math.pow(xref1, 1 / 3);
    } else {
      fx1 = (k * xref1 + 16) / 116;
    }
    let fy1: number;
    if (yref1 > e) {
      fy1 = Math.pow(yref1, 1 / 3);
    } else {
      fy1 = (k * yref1 + 16) / 116;
    }
    let fz1: number;
    if (zref1 > e) {
      fz1 = Math.pow(zref1, 1 / 3);
    } else {
      fz1 = (k * zref1 + 16) / 116;
    }

    const L1: number = 116 * fy1 - 16;
    const a1: number = 500 * (fx1 - fy1);
    const b1: number = 200 * (fy1 - fz1);
    // console.log("L=" + L1 + ", a1=" + a1 + ", b1=" + b1);

    const C1: number = Math.sqrt(Math.pow(a1, 2) + Math.pow(b1, 2));
    let H1: number = Math.atan2(a1, b1);
    if (H1 < 0) {
      H1 += 2 * Math.PI;
    }

    // console.log("L=" + L1 + ", C1=" + C1 + ", H1=" + H1);

    const x2: number = Color.inverseSRGBCompanding(other.r());
    const y2: number = Color.inverseSRGBCompanding(other.g());
    const z2: number = Color.inverseSRGBCompanding(other.b());

    const xref2: number = x2 / 0.648431;
    const yref2: number = y2 / 0.321152;
    const zref2: number = z2 / 0.155886;

    let fx2: number;
    if (xref2 > e) {
      fx2 = Math.pow(xref2, 1 / 3);
    } else {
      fx2 = (k * xref2 + 16) / 116;
    }
    let fy2: number;
    if (yref2 > e) {
      fy2 = Math.pow(yref2, 1 / 3);
    } else {
      fy2 = (k * yref2 + 16) / 116;
    }
    let fz2: number;
    if (zref2 > e) {
      fz2 = Math.pow(zref2, 1 / 3);
    } else {
      fz2 = (k * zref2 + 16) / 116;
    }
    const L2: number = 116 * fy2 - 16;
    const a2: number = 500 * (fx2 - fy2);
    const b2: number = 200 * (fy2 - fz2);

    const C2: number = Math.sqrt(Math.pow(a2, 2) + Math.pow(b2, 2));
    let H2: number = Math.atan2(a2, b2);
    if (H2 < 0) {
      H2 += 2 * Math.PI;
    }
    // console.log("L2=" + L2 + ", C2=" + C2 + ", H2=" + H2);

    const L3: number = L1 + (L2 - L1) * interp;
    const C3: number = C1 + (C2 - C1) * interp;
    const H3: number = H1 + (H2 - H1) * interp;
    // console.log("L3=" + L3 + ", C3=" + C3 + ", H3=" + H3);

    const a3: number = C3 * Math.cos(H3);
    const b3: number = C3 * Math.sin(H3);
    // console.log("L3=" + L3 + ", a3=" + a3 + ", b3=" + b3);

    const fy3: number = (L3 + 16) / 116;
    const fz3: number = fy3 - b3 / 200;
    const fx3: number = a3 / 500 + fy3;

    let zref3: number = Math.pow(fz3, 3);
    if (zref3 <= e) {
      zref3 = (116 * fz3 - 16) / k;
    }

    let yref3: number;
    if (L3 > k * e) {
      yref3 = Math.pow((L3 + 16) / 116, 3);
    } else {
      yref3 = L3 / k;
    }

    let xref3: number = Math.pow(fx3, 3);
    if (xref3 <= e) {
      xref3 = (116 * fx3 - 16) / k;
    }

    const x3: number = xref3 * 0.648431;
    const y3: number = yref3 * 0.321152;
    const z3: number = zref3 * 0.155886;
    // console.log("x3=" + x3 + ", y3=" + y3 + ", z3=" + z3);

    return new Color(
        Color.SRGBCompanding(x3),
        Color.SRGBCompanding(y3),
        Color.SRGBCompanding(z3),
        this.a() + (other.a() - this.a()) * interp,
    );
  }

  static inverseSRGBCompanding = function(v: number): number {
    if (v <= 0.04045) {
      return v / 12.92;
    }
    return Math.pow((v + 0.055) / 1.055, 2.4);
  };

  static SRGBCompanding = function(v: number): number {
    if (v <= 0.0031308) {
      return v * 12.92;
    }
    return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  static fromRGB = function(rgb: string, defaultAlpha?: number) {
    // Default alpha to 255.
    if (arguments.length === 1) {
      defaultAlpha = 255;
    }

    // Extract the color from the string, as formatted in asRGB.
    const value: number[] = [];
    rgb
        .trim()
        .substring('rgb('.length, rgb.length - 1)
        .split(',')
        .forEach(function(c) {
          value.push(parseInt(c.trim()));
        });
    if (value.length < 3) {
      throw new Error('Failed to parse color');
    }
    if (value.length === 3) {
      value.push(defaultAlpha);
    }

    // Return a new color.
    return new Color(
        value[0] / 255,
        value[1] / 255,
        value[2] / 255,
        value[3] / 255,
    );
  };

  clone(): Color {
    return new Color(this.r(), this.g(), this.b(), this.a());
  }

  equals(other: Color): boolean {
    return (
      this.r() === other.r() &&
      this.g() === other.g() &&
      this.b() === other.b() &&
      this.a() === other.a()
    );
  }
}

const parsegraph_Color_Tests = new parsegraph_TestSuite('parsegraph_Color');

parsegraph_Color_Tests.addTest('parsegraph_Color.simplify', function() {});

/* parsegraph_Color_Tests.addTest("parsegraph_Color.interpolate trivial", function() {
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
