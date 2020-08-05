var INF = 1e20;

function TinySDF(fontSize, radius, cutoff, fontFamily, fontWeight) {
    this.fontSize = fontSize || 24;
    this.fontSizeHeight = Math.ceil(fontSize * parsegraph_LETTER_HEIGHT);
    this.cutoff = cutoff || 0.25;
    this.fontFamily = fontFamily || 'sans-serif';
    this.fontWeight = fontWeight || 'normal';
    this.radius = radius || 8;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.fontSize;
    this.canvas.height = this.fontSizeHeight;
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.ctx.font = this.fontWeight + ' ' + this.fontSize + 'px ' + this.fontFamily;
    this.ctx.fillStyle = 'black';
    this.ctx.textBaseline = 'top';

    // temporary arrays for the distance transform
    this.gridOuter = new Float64Array(this.fontSize * this.fontSizeHeight);
    this.gridInner = new Float64Array(this.fontSize * this.fontSizeHeight);
    this.f = new Float64Array(this.fontSizeHeight);
    this.z = new Float64Array(this.fontSizeHeight + 1);
    this.v = new Uint16Array(this.fontSizeHeight);

    // hack around https://bugzilla.mozilla.org/show_bug.cgi?id=737852
    this.middle = Math.round((this.fontSizeHeight / 2) * (navigator.userAgent.indexOf('Gecko/') >= 0 ? 1.2 : 1));
}

TinySDF.prototype.draw = function (char) {
    this.ctx.clearRect(0, 0, this.fontSize, this.fontSizeHeight);
    this.ctx.fillText(char, 0, this.middle);

    var imgData = this.ctx.getImageData(0, 0, this.fontSize, this.fontSizeHeight);
    var alphaChannel = new Uint8ClampedArray(4 * this.fontSize * this.fontSizeHeight);

    for (var i = 0; i < this.fontSize * this.fontSizeHeight; i++) {
        var a = imgData.data[i * 4 + 3] / 255; // alpha value
        this.gridOuter[i] = a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2);
        this.gridInner[i] = a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
    }

    edt(this.gridOuter, this.fontSize, this.fontSizeHeight, this.f, this.v, this.z);
    edt(this.gridInner, this.fontSize, this.fontSizeHeight, this.f, this.v, this.z);

    for (i = 0; i < this.fontSize * this.fontSizeHeight; i++) {
        var d = Math.sqrt(this.gridOuter[i]) - Math.sqrt(this.gridInner[i]);
        alphaChannel[i*4 + 3] = Math.round(255 - 255 * (d / this.radius + this.cutoff));
        //alphaChannel[i*4 + 2] = alphaChannel[i*4 + 3];
        //alphaChannel[i*4 + 1] = alphaChannel[i*4 + 3];
        //alphaChannel[i*4 + 0] = alphaChannel[i*4 + 3];
        //alphaChannel[i*4 + 3] = 255;
        //console.log(alphaChannel[i*4 + 3]);
    }

    return alphaChannel;
};

// 2D Euclidean squared distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/papers/dt-final.pdf
function edt(data, width, height, f, v, z) {
    for (var x = 0; x < width; x++) edt1d(data, x, width, height, f, v, z);
    for (var y = 0; y < height; y++) edt1d(data, y * width, 1, width, f, v, z);
}

// 1D squared distance transform
function edt1d(grid, offset, stride, length, f, v, z) {
    var q, k, s, r;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;

    for (q = 0; q < length; q++) {
        f[q] = grid[offset + q * stride];
    }

    for (q = 1, k = 0, s = 0; q < length; q++) {
        do {
            r = v[k];
            s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2;
        } while (s <= z[k] && --k > -1);

        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }

    for (q = 0, k = 0; q < length; q++) {
        while (z[k + 1] < q) {
            k++;
        }
        r = v[k];
        grid[offset + q * stride] = f[r] + (q - r) * (q - r);
    }
}
