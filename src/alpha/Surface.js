function alpha_Surface()
{
    this._container = document.createElement("div");
    this._container.className = "alpha_GLWidget";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");
    if(this._gl == null) {
        this._gl = this._canvas.getContext("webgl");
        if(this._gl == null) {
            throw new Error("GL context is not supported");
        }
    }

    this._container.appendChild(this._canvas);
};
