export function parsegraph_Method(func, funcThisArg)
{
    this._func = func;
    this._funcThisArg = funcThisArg;
}

parsegraph_Method.prototype.call = function()
{
    return this._func.apply(this._funcThisArg, arguments);
};

parsegraph_Method.prototype.apply = function(args)
{
    return this._func.apply(this._funcThisArg, args);
};
