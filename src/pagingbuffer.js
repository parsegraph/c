/**
 * Manages the low-level paging of vertex attributes. For
 * demonstrations of use, see any painter class.
 */
function parsegraph_PagingBuffer(gl, program)
{
    // Contains vertex attribute information used for drawing. Provide using
    // defineAttrib.
    this._attribs = [];

    // Contains buffer data for each page.
    this._pages = [];

    this._gl = gl;
    this._program = program;
}

function parsegraph_createPagingBuffer(gl, program)
{
    return new parsegraph_PagingBuffer(gl, program);
}

parsegraph_PagingBuffer.prototype.addPage = function()
{
    // Create a new page.
    var page = {
        buffers:[],
        glBuffers:[],
        "needsUpdate":true
    };

    // Add a buffer entry for each vertex attribute.
    this._attribs.forEach(function() {
        page.buffers.push([]);
        page.glBuffers.push(null);
    });

    // Add the page.
    this._pages.push(page);

    // Return the working page.
    return page;
};

/**
 * Finds (and perhaps creates) the working page.
 */
parsegraph_PagingBuffer.prototype.getWorkingPage = function()
{
    if(this._pages.length == 0) {
        return this.addPage();
    }
    return this._pages[this._pages.length - 1];
};

// Manually advance to the next page.
parsegraph_PagingBuffer.prototype.nextPage = function()
{
    this.addPage();
};

/**
 * Defines an attribute for data entry.
 *
 * name - the attribute name in this paging buffer's GL program
 * numComponents - the number of components in the named attribute type (1, 2, 3, or 4)
 * drawMode - the WebGL draw mode. Defaults to gl.STATIC_DRAW
 */
parsegraph_PagingBuffer.prototype.defineAttrib = function(name, numComponents, drawMode)
{
    if(drawMode == undefined) {
        drawMode = this._gl.STATIC_DRAW;
    }
    // Add a new buffer entry for this new attribute.
    this._pages.forEach(function(page) {
        page.buffers.push([]);
        page.glBuffers.push(null);
    });

    var attrib = {
        "name": name,
        "numComponents": numComponents,
        "drawMode": drawMode
    };

    attrib.location = this._gl.getAttribLocation(
        this._program,
        attrib.name
    );

    this._attribs.push(attrib);

    return this._attribs.length - 1;
};

/**
 * appendData(attribIndex, value1, value2, ...);
 * appendData(attribIndex, valueArray);
 *
 * Adds each of the specified values to the working buffer. If the value is an
 * array, each of its internal values are added.
 */
parsegraph_PagingBuffer.prototype.appendData = function(attribIndex/*, ... */)
{
    // Ensure attribIndex points to a valid attribute.
    if(attribIndex < 0 || attribIndex > this._attribs.length - 1) {
        throw new Error("attribIndex is out of range. Given: " + attribIndex);
    }
    if(typeof(attribIndex) !== "number") {
        throw new Error("attribIndex must be a number.");
    }

    /**
     * Adds the specified value to the current vertex attribute buffer.
     */
    var pagingBuffer = this;
    var appendValue = function(value) {
        if(Array.isArray(value)) {
            value.forEach(appendValue);
            return;
        }
        if(Number.isNaN(value)) {
            throw new Error("Value is not a number: " + value);
        }
        pagingBuffer.getWorkingPage().buffers[attribIndex].push(value);
        pagingBuffer.getWorkingPage().needsUpdate = true;
    };

    // Add each argument individually.
    for(var i = 1; i < arguments.length; ++i) {
        appendValue(arguments[i]);
    }
};

/**
 * Deletes all buffers and empties values.
 */
parsegraph_PagingBuffer.prototype.clear = function()
{
    // Clear the buffers for all pages.
    this._pages.forEach(function(page) {
        this._attribs.forEach(function(attrib, attribIndex) {
            if(page.glBuffers[attribIndex] != null) {
                this._gl.deleteBuffer(page.glBuffers[attribIndex]);
                page.glBuffers[attribIndex] = null;
            }
            page.buffers[attribIndex] = [];
        }, this);
        page.needsUpdate = true;
    }, this);
};

/**
 * Render each page. This function sets up vertex attribute buffers and calls drawArrays
 * for each page.
 *
 * gl.drawArrays(gl.TRIANGLES, 0, numVertices)
 *
 * where numVertices is calculated from the appended data size / component count. The least-filled
 * buffer is used for the size, if the sizes differ.
 */
parsegraph_PagingBuffer.prototype.renderPages = function()
{
    // Enable used vertex attributes.
    this._attribs.forEach(function(attrib) {
        if(attrib.location == -1) {
            return;
        }
        this._gl.enableVertexAttribArray(attrib.location);
    }, this);

    // Draw each page.
    this._pages.forEach(function(page) {
        var numIndices;

        // Prepare each vertex attribute.
        this._attribs.forEach(function(attrib, attribIndex) {
            if(attrib.location == -1) {
                return;
            }
            // Bind the buffer, creating it if necessary.
            if(page.glBuffers[attribIndex] == null) {
                page.glBuffers[attribIndex] = this._gl.createBuffer();
            }
            this._gl.bindBuffer(this._gl.ARRAY_BUFFER, page.glBuffers[attribIndex]);

            // Load buffer data if the page needs an update.
            var bufferData = page.buffers[attribIndex];
            if(page.needsUpdate) {
                this._gl.bufferData(
                    this._gl.ARRAY_BUFFER,
                    new Float32Array(bufferData),
                    attrib.drawMode
                );
            }

            // Set up the vertex attribute pointer.
            this._gl.vertexAttribPointer(
                attrib.location,
                attrib.numComponents,
                this._gl.FLOAT,
                false,
                0,
                0
            );

            var thisNumIndices = bufferData.length / attrib.numComponents;
            if(numIndices == undefined) {
                numIndices = thisNumIndices;
            }
            else {
                numIndices = Math.min(numIndices, thisNumIndices);
            }
        }, this);

        // Draw the page's triangles.
        if(numIndices > 0) {
            //console.log("Drawing " + numIndices + " indices");
            this._gl.drawArrays(this._gl.TRIANGLES, 0, numIndices);
        }

        page.needsUpdate = false;
    }, this);

    // Disable used variables.
    this._attribs.forEach(function(attrib) {
        if(attrib.location == -1) {
            return;
        }
        this._gl.disableVertexAttribArray(attrib.location);
    }, this);
};
