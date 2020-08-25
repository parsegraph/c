let parsegraph_Size_COUNT:number = 0;
export default class Size
{
    id:number;
    length:number;
    "0":number;
    "1":number;

    constructor(w?:number, h?:number) {
        this.id = parsegraph_Size_COUNT++;
        if(arguments.length > 0) {
            this[0] = w;
            this[1] = h;
        }
        else {
            this[0] = 0;
            this[1] = 0;
        }
        this.length = 2;
    }

    clear():void {
        this[0] = 0;
        this[1] = 0;
    }

    reset():void {
        this.clear();
    }

    scale(factor:number):void {
        this[0] *= factor;
        this[1] *= factor;
    }

    scaled(factor:number):Size {
        return new Size(
            this[0] * factor,
            this[1] * factor
        );
    }

    width():number {
        return this[0];
    }

    setWidth(width:number):void {
        this[0] = width;
    }

    height():number {
        return this[1];
    }

    setHeight(height:number):void {
        this[1] = height;
    }

    toString():string {
        return "[w=" + this.width() + ", h=" + this.height() + "]";
    }
}
