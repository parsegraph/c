function parsegraph_Float32List()
{
    this.data = new Float32Array(8);
    this._length = 0;
}

parsegraph_Float32List.prototype.push = function()
{
    for(var i = 0; i < arguments.length; ++i) {
        if(this._length == this.data.length) {
            var created = new Float32Array(2 * this.data.length);
            for(var i = 0; i < this.data.length; ++i) {
                created[i] = this.data[i];
            }
            this.data = created;
        }
        var v = arguments[i];
        if(Number.isNaN(v)) {
            throw new Error("Pushed value is NaN");
        }
        this.data[this._length++] = v;
    }
}

parsegraph_Float32List.prototype.clear = function()
{
    this._length = 0;
}

parsegraph_Float32List.prototype.length = function()
{
    return this._length;
}

parsegraph_Float32List.prototype.slice = function()
{
    return this.data.subarray(0, this._length);
}
