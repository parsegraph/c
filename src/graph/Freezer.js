parsegraph_Freezer_VertexShader =
"uniform mat3 u_world;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec2 a_texCoord;" +
"" +
"varying highp vec2 texCoord;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "texCoord = a_texCoord;" +
"}";

parsegraph_Freezer_FragmentShader =
"uniform sampler2D u_texture;\n" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = texture2D(u_texture, texCoord.st);" +
    //"gl_FragColor = vec4(1.0, 1.0, 1.0, 0.5);" +
"}";

parsegraph_FREEZER_MARGIN = 8;

function parsegraph_FreezerWindow(freezer, window)
{
    this._freezer = freezer;
    this._window = window;
    this._gl = this._window.gl();
    this._shaders = this._window.shaders();
    this._highAspectRow = new parsegraph_FreezerRow(freezer, window, true);
    this._lowAspectRow = new parsegraph_FreezerRow(freezer, window, false);
}

parsegraph_FreezerWindow.prototype.allocate = function(width, height)
{
    var frag = new parsegraph_FrozenNodeFragment(width, height);
    var aspect = width / height;
    if(aspect < 1/4) {
        this._lowAspectRow.allocate(frag);
    }
    else {
        this._highAspectRow.allocate(frag);
    }
    return frag;
};

parsegraph_FreezerWindow.prototype.renderFragment = function(frag, world, needsSetup, needsLoad)
{
    var gl = this.gl();
    var err;
    if(needsSetup) {
        if(!this._program) {
            this._program = parsegraph_compileProgram(this._window,
                "parsegraph_Freezer",
                parsegraph_Freezer_VertexShader,
                parsegraph_Freezer_FragmentShader
            );
            this.u_world = gl.getUniformLocation(this._program, "u_world");
            this.u_texture = gl.getUniformLocation(this._program, "u_texture");
            this.a_position = gl.getAttribLocation(this._program, "a_position");
            this.a_texCoord = gl.getAttribLocation(this._program, "a_texCoord");
        }
        gl.useProgram(this._program);

        gl.activeTexture(gl.TEXTURE0);
        //console.log("Using texture " + frag.slot()._id);
        gl.enableVertexAttribArray(this.a_position);
        gl.enableVertexAttribArray(this.a_texCoord);
    }
    gl.bindTexture(gl.TEXTURE_2D, frag.slot().glTexture());
    gl.uniform1i(this.u_texture, 0);
    if(needsLoad || needsSetup) {
        var renderWorld = world;
        gl.uniformMatrix3fv(this.u_world, false, renderWorld);
    }

    var FLOAT_SIZE = 4;
    var stride = 4 * FLOAT_SIZE;
    gl.bindBuffer(gl.ARRAY_BUFFER, frag.vertexBuffer());
    gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(this.a_texCoord, 2, gl.FLOAT, false, stride, 2*FLOAT_SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    //gl.disableVertexAttribArray(this.a_position);
    //gl.disableVertexAttribArray(this.a_texCoord);
    /*if((err = gl.getError()) != gl.NO_ERROR && err != gl.CONTEXT_LOST_WEBGL) {
        throw new Error("GL error during cached rendering");
    }*/
};

parsegraph_FreezerWindow.prototype.textureSize = function()
{
    return this._window.textureSize();
};

parsegraph_FreezerWindow.prototype.activate = function(slot)
{
    var gl = this._gl;
    this._origFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    this._origRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);
    this._activated = true;

    if(!this._framebuffer) {
        this._framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

        this._renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        var tsize = this.textureSize();
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, tsize, tsize);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this._renderbuffer);
    }
    else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
    }
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, slot.glTexture(), 0);
};

parsegraph_FreezerWindow.prototype.deactivate = function()
{
    if(!this._activated) {
        return;
    }
    var gl = this._gl;
    this._activated = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._origFramebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, this._origRenderbuffer);
};

parsegraph_FreezerWindow.prototype.gl = function()
{
    return this._gl;
};

function parsegraph_Freezer(window)
{
    this._frozenNodes = [];
    this._textureScale = parsegraph_FREEZER_TEXTURE_SCALE;

    this._windowData = {};

    this._camera = new parsegraph_Camera();

    this._framebuffer = null;
    this._renderbuffer = null;
    this._activated = false;
}

parsegraph_Freezer.prototype.windowData = function(window)
{
    return this._windowData[window.id()];
};

parsegraph_Freezer.prototype.cache = function(node)
{
    var item = new parsegraph_FrozenNode(this, node);
    this._frozenNodes.push(item);
    return item;
};

parsegraph_Freezer.prototype.contextChanged = function(isLost)
{
    for(var wid in this._windowData) {
        var wdata = this._windowData[wid];
        wdata.contextChanged(isLost);
    }
    this._lowAspectRow.contextChanged(isLost);
    this._highAspectRow.contextChanged(isLost);
    if(isLost) {
        this._activated = false;
        this._framebuffer = null;
        this._renderbuffer = null;
        this._program = null;
    }
};

parsegraph_Freezer.prototype.allocate = function(window, width, height)
{
    var wdata = this._windowData[window.id()];
    if(!wdata) {
        wdata = new parsegraph_FreezerWindow(this, window);
        this._windowData[window.id()] = wdata;
    }
    return wdata.allocate(width, height);
};

parsegraph_Freezer.prototype.camera = function()
{
    return this._camera;
};

parsegraph_Freezer.prototype.textureScale = function()
{
    return this._textureScale;
};

function parsegraph_FreezerRow(freezer, window, colFirst)
{
    this._freezer = freezer;
    this._window = window;
    this._colFirst = colFirst;
    this._slots = [];

    this._x = 0;
    this._y = 0;
    this._currentMax = 0;
}

parsegraph_FreezerRow.prototype.gl = function()
{
    return this._window.gl();
};

parsegraph_FreezerRow.prototype.window = function()
{
    return this._window;
};

parsegraph_FreezerRow.prototype.textureSize = function()
{
    return this._window.textureSize();
};

parsegraph_FreezerRow.prototype.allocate = function(frag)
{
    var lastSlot = this._slots[this._slots.length - 1];
    if(!lastSlot) {
        lastSlot = new parsegraph_FreezerSlot(this);
        this._slots.push(lastSlot);
    }
    var neededWidth = frag.width();
    var neededHeight = frag.height();
    var tsize = this.textureSize();
    if(neededHeight > tsize || neededHeight > tsize) {
        throw new Error(
            "Fragment size of " + neededWidth + "x" + neededHeight + " is too large for any row to allocate (tsize=" + tsize + ")"
        );
    }
    // Search for a space.
    if(this._colFirst) {
        if(this._y + neededHeight > tsize) {
            this._x += this._currentMax + parsegraph_FREEZER_MARGIN;
            this._y = 0;
        }
        if(this._x + neededWidth > tsize) {
            lastSlot = new parsegraph_FreezerSlot(this);
            this._slots.push(lastSlot);
            this._x = 0;
            this._y = 0;
            this._currentMax = 0;
        }
        //console.log("COL", lastSlot, this._x);
        frag.assignSlot(lastSlot, this._x, this._y, neededWidth, neededHeight);
        this._y += neededHeight + parsegraph_FREEZER_MARGIN;
        this._currentMax = Math.max(this._currentMax, neededWidth + parsegraph_FREEZER_MARGIN);
    }
    else {
        // Row first
        if(this._x + neededWidth > tsize) {
            this._x = 0;
            this._y += this._currentMax + parsegraph_FREEZER_MARGIN;
        }
        if(this._y + neededHeight > tsize) {
            lastSlot = new parsegraph_FreezerSlot(this);
            this._slots.push(lastSlot);
            this._x = 0;
            this._y = 0;
            this._currentMax = 0;
        }
        //console.log("ROW", lastSlot, this._x);
        frag.assignSlot(lastSlot, this._x, this._y, neededWidth, neededHeight);
        this._x += neededWidth + parsegraph_FREEZER_MARGIN;
        this._currentMax = Math.max(this._currentMax, neededHeight + parsegraph_FREEZER_MARGIN);
    }
};

parsegraph_FreezerRow.prototype.contextChanged = function(isLost)
{
    for(var i in this._slots) {
        var slot = this._slots[i];
        slot.contextChanged(isLost);
    }
    this._slots.splice(0, this._slots.length);
    this._x = 0;
    this._y = 0;
    this._currentMax = 0;
};

parsegraph_FreezerRow.prototype.freezer = function()
{
    return this._freezer;
};

parsegraph_FreezerSlot_COUNT = 0;

function parsegraph_FreezerSlot(row)
{
    this._id = ++parsegraph_FreezerSlot_COUNT;
    this._row = row;
    this._glTexture = null;
    this._fragments = [];
    this.init();
}

parsegraph_FreezerSlot.prototype.glTexture = function()
{
    return this._glTexture;
};

parsegraph_FreezerSlot.prototype.gl = function()
{
    return this._row.gl();
};

parsegraph_FreezerSlot.prototype.window = function()
{
    return this._row.window();
};

parsegraph_FreezerSlot.prototype.init = function()
{
    var tsize = this._row.textureSize();
    var gl = this.gl();
    this._glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tsize, tsize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //console.log("Creating new freezer texture");
};

parsegraph_FreezerSlot.prototype.contextChanged = function(isLost)
{
    if(!isLost) {
        this.init();
    }
    else {
        for(var i in this._fragments) {
            this._fragments[i].dispose();
        }
        this._fragments.splice(0, this._fragments.length);
    }
};

parsegraph_FreezerSlot.prototype.addFragment = function(frag)
{
    this._fragments.push(frag);
};

parsegraph_FreezerSlot.prototype.freezer = function()
{
    return this._row.freezer();
};

function parsegraph_FrozenNode(freezer, node)
{
    this._node = node;
    this._freezer = freezer;
    this._windowFragments = {};
    this.invalidate();
}

parsegraph_FrozenNode.prototype.invalidate = function()
{
    //console.log("Invalidating cache for " + this._node);
    for(var wid in this._windowFragments) {
        var fragments = this._windowFragments[wid];
        for(var i in fragments) {
            var frag = fragments[i];
            frag.dispose();
        }
        fragments.splice(0, fragments.length);
    }
    this._validated = false;
    this._width = NaN;
    this._height = NaN;
    this._x = NaN;
    this._y = NaN;
};

parsegraph_FrozenNode.prototype.validate = function()
{
    if(this._validated) {
        return;
    }
    var bounds = parsegraph_calculatePaintGroupBounds(this.node());
    this._width = bounds.left + bounds.right;
    this._height = bounds.top + bounds.bottom;
    this._x = bounds.left;
    this._y = bounds.top;

    this._validated = true;
};

parsegraph_FrozenNode.prototype.paint = function(window)
{
    //console.log("Painting frozen node");
    this.validate();
    var fragments = this._windowFragments[window.id()];
    if(!fragments) {
        fragments = [];
        this._windowFragments[window.id()] = fragments;
    }

    if(fragments.length === 0) {
        var scale = this._freezer.textureScale();
        var fragWidth = this._width * scale;
        var fragHeight = this._height * scale;
        var fragX = this._x * scale;
        var fragY = this._y * scale;
        var textureSize = window.textureSize();
        var fragSize = textureSize * scale;
        var numRows = Math.ceil(fragHeight / textureSize);
        var numCols = Math.ceil(fragWidth / textureSize);
        for(var y = 0; y < numRows; ++y) {
            for(var x = 0; x < numCols; ++x) {
                var frag = this._freezer.allocate(
                    window,
                    Math.min(fragWidth - textureSize*x, textureSize),
                    Math.min(fragHeight - textureSize*y, textureSize)
                );
                frag.assignNode(this, x * fragSize/this._freezer.textureScale() - fragX, y * fragSize/this._freezer.textureScale() - fragY);
                fragments.push(frag);
            }
        }
    }
    for(var i in fragments) {
        fragments[i].paint();
    }
};

parsegraph_FrozenNode.prototype.render = function(window, world, renderData, needsSetup)
{
    //console.log("Frozen render");
    if(!this._validated) {
        return false;
    }
    var fragments = this._windowFragments[window.id()];
    if(!fragments) {
        return false;
    }
    var renderedClean = true;
    var needsLoad = true;
    for(var i in fragments) {
        if(!fragments[i].render(world, renderData, needsSetup, needsLoad)) {
            renderedClean = false;
        }
        else {
            needsLoad = false;
            needsSetup = false;
        }
    }
    return renderedClean;
};

parsegraph_FrozenNode.prototype.node = function()
{
    return this._node;
};

function parsegraph_FrozenNodeFragment(width, height)
{
    this._width = width;
    this._height = height;
    this._x = NaN;
    this._y = NaN;
    this._frozenNode = null;
    this._slot = null;
    this._textureX = NaN;
    this._textureY = NaN;
    this._vertexBuffer = null;
}

parsegraph_FrozenNodeFragment.prototype.assignNode = function(frozenNode, x, y)
{
    this._frozenNode = frozenNode;
    this._x = x;
    this._y = y;
};

parsegraph_FrozenNodeFragment.prototype.assignSlot = function(slot, textureX, textureY, textureWidth, textureHeight)
{
    this._slot = slot;
    this._slot.addFragment(this);
    this._textureX = textureX;
    this._textureY = textureY;
    this._textureWidth = textureWidth;
    this._textureHeight = textureHeight;
};

parsegraph_FrozenNodeFragment.prototype.vertexBuffer = function()
{
    return this._vertexBuffer;
};

parsegraph_FrozenNodeFragment.prototype.window = function()
{
    return this._slot.window();
};

parsegraph_FrozenNodeFragment.prototype.windowData = function()
{
    return this.freezer().windowData(this.window());
};

parsegraph_FrozenNodeFragment.prototype.gl = function()
{
    return this.window().gl();
};

parsegraph_FrozenNodeFragment.prototype.paint = function()
{
    if(this._vertexBuffer) {
        return;
    }
    if(!this._slot) {
        throw new Error("Fragment must be assigned a slot in order for it to be painted");
    }
    var freezer = this.freezer();
    var wdata = this.freezer().windowData(this.window());
    try {
        var gl = wdata.gl();
        gl.bindTexture(gl.TEXTURE_2D, this._slot.glTexture());
        gl.generateMipmap(gl.TEXTURE_2D);
        wdata.activate(this._slot);
        var cam = freezer.camera();
        var margin = parsegraph_FREEZER_MARGIN;
        var halfMarg = parsegraph_FREEZER_MARGIN/2;
        cam.setSize(this._width, this._height);
        var scale = freezer.textureScale();
        cam.setScale(scale);
        cam.setOrigin(-this._x/scale, -this._y/scale);
        //console.log("Viewport=", this._textureX, this._textureY, this._textureWidth, this._textureHeight);
        gl.viewport(this._textureX, this._textureY, this._textureWidth, this._textureHeight);
        var tsize = wdata.textureSize();
        var world = cam.project();
        //console.log("Rnedering offscreen");
        this._frozenNode.node().renderOffscreen(this.window(), world, scale);
        //console.log("Dnone");

        if(!this._vertexBuffer) {
            this._vertexBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this._vertexBuffer);

        var arr = new Float32Array(6*4);
        arr[0] = this._x;
        arr[1] = this._y + this._height;
        arr[2] = this._textureX / tsize;
        arr[3] = this._textureY / tsize;
        //arr[2] = 0;
        //arr[3] = 0;

        arr[4] = this._x + this._width;
        arr[5] = this._y + this._height;
        arr[6] = (this._textureX + this._textureWidth) / tsize;
        arr[7] = this._textureY / tsize;
        //arr[6] = 1;
        //arr[7] = 0;

        arr[8] = this._x + this._width;
        arr[9] = this._y;
        arr[10] = (this._textureX + this._textureWidth) / tsize;
        arr[11] = (this._textureY + this._textureHeight) / tsize;
        //arr[10] = 1;
        //arr[11] = 1;

        arr[12] = arr[0];
        arr[13] = arr[1];
        arr[14] = arr[2];
        arr[15] = arr[3];

        arr[16] = arr[8];
        arr[17] = arr[9];
        arr[18] = arr[10];
        arr[19] = arr[11];

        arr[20] = arr[0];
        arr[21] = arr[9];
        arr[22] = arr[2];
        arr[23] = arr[11];
        //console.log(arr);
        for(var i=0; i < 6; ++i) {
            arr[4*i] /= scale;
            arr[4*i+1] /= scale;
        }

        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    }
    finally {
        wdata.deactivate();
    }
};

parsegraph_FrozenNodeFragment.prototype.render = function(world, renderData, needsSetup, needsLoad)
{
    if(!this._vertexBuffer) {
        return false;
    }
    this.windowData().renderFragment(this, world, needsSetup, needsLoad);
    return true;
};

parsegraph_FrozenNodeFragment.prototype.dispose = function()
{
    if(this._vertexBuffer) {
        var gl = this.gl();
        if(!gl.isContextLost()) {
            console.log("Disposing of vertex buffer");
            gl.deleteBuffer(this._vertexBuffer);
        }
        this._vertexBuffer = null;
    }
    this._slot = null;
    this._textureX = NaN;
    this._textureY = NaN;
    this._textureWidth = NaN;
    this._textureHeight = NaN;
};

parsegraph_FrozenNodeFragment.prototype.width = function()
{
    return this._width;
};

parsegraph_FrozenNodeFragment.prototype.height = function()
{
    return this._height;
};

parsegraph_FrozenNodeFragment.prototype.slot = function()
{
    return this._slot;
};

parsegraph_FrozenNodeFragment.prototype.freezer = function()
{
    if(!this._slot) {
        throw new Error("This fragment has not been assigned a slot");
    }
    return this._slot.freezer();
};

function parsegraph_calculatePaintGroupBounds(nodeRoot)
{
    if(!nodeRoot.localPaintGroup()) {
        throw new Error("Node must be a paint group");
    }
    var node = nodeRoot;
    var parentSize = new parsegraph_Size();
    var groupBounds = {};
    var numNodes = 0;
    do {
        ++numNodes;
        node = node._layoutNext;
        node.size(parentSize);
        var parentBounds = {
            left:parentSize.width()/2,
            top:parentSize.height()/2,
            right:parentSize.width()/2,
            bottom:parentSize.height()/2
        };
        groupBounds[node._id] = parentBounds;
        var order = node.layoutOrder();
        for(var i = 0; i < order.length; ++i) {
            var dir = order[i];
            if(dir === parsegraph_OUTWARD || dir === parsegraph_INWARD) {
                continue;
            }
            if(!node.hasChildAt(dir)) {
                continue;
            }
            var child = node.nodeAt(dir);
            if(child.findPaintGroup() === nodeRoot) {
                // Node is part of the same paint group.
                var childBounds = groupBounds[child._id];
                if(!childBounds) {
                    throw new Error("Child paint group bounds must have been calculated before its parent");
                }
                if(Number.isNaN(childBounds.left)) {
                    throw new Error("Bounds must not be NaN");
                }
                var neighbor = node.neighborAt(dir);
                switch(dir) {
                case parsegraph_UPWARD:
                    parentBounds.top = Math.max(parentBounds.top, childBounds.top + neighbor.separation);
                    parentBounds.left = Math.max(parentBounds.left, childBounds.left - neighbor.alignmentOffset);
                    parentBounds.right = Math.max(parentBounds.right, childBounds.right + neighbor.alignmentOffset);
                    parentBounds.bottom = Math.max(parentBounds.bottom, childBounds.bottom - neighbor.separation);
                    break;
                case parsegraph_DOWNWARD:
                    parentBounds.top = Math.max(parentBounds.top, childBounds.top - neighbor.separation);
                    parentBounds.left = Math.max(parentBounds.left, childBounds.left - neighbor.alignmentOffset);
                    parentBounds.right = Math.max(parentBounds.right, childBounds.right + neighbor.alignmentOffset);
                    parentBounds.bottom = Math.max(parentBounds.bottom, childBounds.bottom + neighbor.separation);
                    break;
                case parsegraph_FORWARD:
                    parentBounds.top = Math.max(parentBounds.top, childBounds.top - neighbor.alignmentOffset);
                    parentBounds.left = Math.max(parentBounds.left, childBounds.left - neighbor.separation);
                    parentBounds.right = Math.max(parentBounds.right, childBounds.right + neighbor.separation);
                    parentBounds.bottom = Math.max(parentBounds.bottom, childBounds.bottom + neighbor.alignmentOffset);
                    break;
                case parsegraph_BACKWARD:
                    parentBounds.top = Math.max(parentBounds.top, childBounds.top - neighbor.alignmentOffset);
                    parentBounds.left = Math.max(parentBounds.left, childBounds.left + neighbor.separation);
                    parentBounds.right = Math.max(parentBounds.right, childBounds.right - neighbor.separation);
                    parentBounds.bottom = Math.max(parentBounds.bottom, childBounds.bottom + neighbor.alignmentOffset);
                    break;
                default:
                    throw new Error("Unexpected node direction: " + parsegraph_nameNodeDirection(dir));
                }
            }
            else {
                // Node is part of a different paint group.
                var neighbor = node.neighborAt(dir);
                switch(dir) {
                case parsegraph_UPWARD:
                    parentBounds.top = Math.max(parentBounds.top, parentSize.height()/2 + neighbor.lineLength);
                    break;
                case parsegraph_DOWNWARD:
                    parentBounds.bottom = Math.max(parentBounds.bottom, parentSize.height()/2 + neighbor.lineLength);
                    break;
                case parsegraph_FORWARD:
                    parentBounds.right = Math.max(parentBounds.right, parentSize.width()/2 + neighbor.lineLength);
                    break;
                case parsegraph_BACKWARD:
                    parentBounds.left = Math.max(parentBounds.left, parentSize.width()/2 + neighbor.lineLength);
                    break;
                default:
                    throw new Error("Unexpected node direction: " + parsegraph_nameNodeDirection(dir));
                }
            }
        }
    } while(node !== nodeRoot);
    //console.log(nodeRoot, "Bounds in " + numNodes + " nodes", groupBounds[node._id]);
    return groupBounds[node._id];
}
