import parsegraph_TestSuite from '../TestSuite';

export default class Rect
{
    _x:number;
    _y:number;
    _width:number;
    _height:number;

    constructor(x?:number, y?:number, width?:number, height?:number) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    }

    isNaN():boolean {
        return isNaN(this._x)
            || isNaN(this._y)
            || isNaN(this._width)
            || isNaN(this._height);
    }

    toNaN():void {
        this._x = NaN;
        this._y = NaN;
        this._width = NaN;
        this._height = NaN;
    }

    clear():void {
        this.toNaN();
    }

    reset():void {
        this.toNaN();
    }

    x():number {
        return this._x;
    }

    setX(x:number):void {
        this._x = x;
    }

    y():number {
        return this._y;
    }

    setY(y:number):void {
        this._y = y;
    }

    clone(target?:Rect) {
        if(target) {
            this.copy(target);
            return target;
        }
        return new Rect(this.x(), this.y(), this.width(), this.height());
    }

    copy(dest?:Rect):Rect {
        if(!dest) {
            return this.clone();
        }
        dest.setX(this.x());
        dest.setY(this.y());
        dest.setWidth(this.width());
        dest.setHeight(this.height());
        return dest;
    }

    translate(x:number, y:number):void {
        this.setX(this.x() + x);
        this.setY(this.y() + y);
    }

    scale(sx:number, sy?:number):void {
        if(arguments.length < 2) {
            sy = sx;
        }
        this.setX(this.x() * sx);
        this.setY(this.y() * sy);
        this.setWidth(this.width() * sx);
        this.setHeight(this.height() * sy);
    }

    height():number {
        return this._height;
    }

    setHeight(height:number):void {
        this._height = height;
    }

    width():number {
        return this._width;
    }

    setWidth(width:number):void {
        this._width = width;
    }

    toString():string {
        return "[Rect x=" + this.x() + ", y=" + this.y() + ", w=" + this.width() + ", h=" + this.height() + "]";
    }

    vMin():number {
        return this.y() - this.height()/2;
    }

    vMax():number {
        return this.y() + this.height()/2;
    }

    hMin():number {
        return this.x() - this.width()/2;
    }

    hMax():number {
        return this.x() + this.width()/2;
    }

    include(bx:number, by:number, bwidth:number, bheight:number):void {
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
    }
}

const parsegraph_Rect_Tests = new parsegraph_TestSuite("parsegraph_Rect");

parsegraph_Rect_Tests.addTest("vMin", function() {
    var r = new Rect(0, 0, 200, 200);
    if(r.vMin() !== -100) {
        return "vMin, expected -100, got " + r.vMin();
    }
});

parsegraph_Rect_Tests.addTest("vMax", function() {
    var r = new Rect(0, 0, 200, 200);
    if(r.vMax() !== 100) {
        return "vMax, expected 100, got " + r.vMax();
    }
});

parsegraph_Rect_Tests.addTest("hMin", function() {
    var r = new Rect(0, 0, 300, 200);
    if(r.hMin() !== -150) {
        return "vMin, expected -150, got " + r.vMin();
    }
});

parsegraph_Rect_Tests.addTest("hMax", function() {
    var r = new Rect(0, 0, 300, 200);
    if(r.hMax() !== 150) {
        return "hMax, expected 150, got " + r.vMax();
    }
});

parsegraph_Rect_Tests.addTest("include", function() {
    var r = new Rect(0, 0, 200, 200);
    r.include(0, 400, 200, 200);

    if(r.vMax() !== new Rect(0, 400, 200, 200).vMax()) {
        return "vMax failed to adjust";
    }
    //console.log(r);
});
