alpha_Cluster_VertexShader =
"uniform mat4 u_world;\n" +
"\n" +
"attribute vec3 a_position;\n" +
"attribute vec3 a_color;\n" +
"\n" +
"varying highp vec3 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = u_world * vec4(a_position, 1.0);" +
    "contentColor = a_color;" +
"}";

alpha_Cluster_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec3 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = vec4(contentColor, 1.0);" +
"}";

//--------------------------------------------
//--------------------------------------------
//-------------- Cluster  --------------------
//--------------------------------------------
//--------------------------------------------

/**
 * Cluster is where the information from blocks, blocktype, color and face
 * actually gets put to use it figures out how to draw the blocks that have
 * been added to it so that they can be drawn inside of 1 Matrix Push/Pop it
 * would probably not be efficient to put a lot of moving objects inside of a
 * single cluster as the cluster would have to be continuously updating
 * everytime a block was edited
 */
function alpha_Cluster(widget)
{
    if(!widget) {
        throw new Error("Cluster must be given a non-null alpha_GLWidget");
    }
    this.widget = widget;
    this.gl = this.widget._gl;
    if(!this.gl) {
        //console.log(widget);
        throw new Error("Cluster must be given a GL interface via alpha_GLWidget._gl")
    }

    this.blocks = [];

    this.faceProgram = this.gl.createProgram();

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_Cluster_VertexShader,
            this.gl.VERTEX_SHADER
        )
    );

    this.gl.attachShader(
        this.faceProgram,
        compileShader(
            this.gl,
            alpha_Cluster_FragmentShader,
            this.gl.FRAGMENT_SHADER
        )
    );

    this.gl.linkProgram(this.faceProgram);
    if(!this.gl.getProgramParameter(
        this.faceProgram, this.gl.LINK_STATUS
    )) {
        throw new Error("Cluster face program failed to link.");
    }

    // Prepare attribute buffers.
    this.faceBuffer = parsegraph_createPagingBuffer(
        this.gl, this.faceProgram
    );
    this.a_position = this.faceBuffer.defineAttrib("a_position", 4);
    this.a_color = this.faceBuffer.defineAttrib("a_color", 4);

    // Cache program locations.
    this.u_world = this.gl.getUniformLocation(
        this.faceProgram, "u_world"
    );
};

alpha_Cluster_Tests = new parsegraph_TestSuite("alpha_Cluster");
parsegraph_AllTests.addTest(alpha_Cluster_Tests);

alpha_Cluster_Tests.addTest("alpha_Cluster", function(resultDom) {
    var widget = new alpha_GLWidget();

    // test version 1.0
    var cubeman = widget.BlockTypes.Get("blank", "cubeman");

    var testCluster = new alpha_Cluster(widget);
    testCluster.AddBlock(cubeman, 0,5,0,1);
    testCluster.CalculateVertices();
});

/**
 * is this particular block in this cluster
 */
alpha_Cluster.prototype.HasBlock = function(block)
{
    for(var i = 0; i < this.blocks.length; ++i) {
        if(this.blocks[i] == block) {
            return i;
        }
    }
    return null;
};

alpha_Cluster.prototype.AddBlock = function()
{
    if(arguments.length > 1) {
        // Create a new block.
        this.blocks.push(alpha_createBlock.apply(null, arguments));
        return;
    }
    var block = arguments[0];
    if(!this.HasBlock(block)) {
        this.blocks.push(block);
    }
    return block;
};

alpha_Cluster.prototype.RemoveBlock = function(block)
{
    var i = this.HasBlock(block);
    if(i != null) {
        return this.blocks.splice(i, 1)[0];
    }
};

/**
 * pass a table of blocks and it will add the ones that are new
 */
alpha_Cluster.prototype.AddBlocks = function()
{
    if(arguments.length > 1) {
        for(var i = 0; i < arguments.length; ++i) {
            this.AddBlock(arguments[i]);
        }
    }
    else {
        for(var i = 0; i < arguments[0].length; ++i) {
            this.AddBlock(arguments[0][i]);
        }
    }
};

alpha_Cluster.prototype.ClearBlocks = function()
{
    this.blocks.splice(0, this.blocks.length);
    this.faceBuffer.clear();
};

/**
 * construct all of the vertices from the blocks and store them
 */
alpha_Cluster.prototype.CalculateVertices = function()
{
    // delete what we had;
    this.faceBuffer.clear();

    this.blocks.forEach(function(block) {
        var quat = block.GetQuaternion( true );
        if(!quat) {
            //console.log(block);
            throw new Error("Block must not return a null quaternion");
        }

        // get the faces from the blocktype
        var bType = this.widget.BlockTypes.Get(block.id);
        if(!bType) {
            return;
        }
        var shape = bType[0];
        var skin = bType[1];

        for(var i = 0; i < shape.length; ++i) { // vertices is face!
            var face = shape[i];
            if(!face) {
                throw new Error("Shape must not contain any null faces");
            }
            var colors = skin[i];
            if(!colors) {
                throw new Error("Shape must not contain any null colors");
            }

            // every face has its own drawType;
            if(face.drawType == alpha_TRIANGLES) {
                // Process every vertex of the face.
                for(var j = 0; j < face.length; ++j) {
                    var vertex = face[j];
                    if(!vertex) {
                        throw new Error("Face must not contain any null vertices");
                    }
                    // get the color for this vertex;
                    var color = colors[j];
                    if(!color) {
                        throw new Error("Colors must not contain any null color values");
                    }

                    // rotate it; if it's not the default
                    if(block.orientation > 0) {
                        vertex = quat.RotatedVector(vertex);
                    }
                    // now translate it
                    vertex = vertex.Added(new alpha_Vector(block[0], block[1], block[2]));

                    // vector and cluster use the same indexes
                    this.faceBuffer.appendData(
                        this.a_position,
                        vertex[0],
                        vertex[1],
                        vertex[2]
                    );
                    this.faceBuffer.appendData(
                        this.a_color,
                        color[0],
                        color[1],
                        color[2]
                    );
                }
            } else if(face.drawType == alpha_QUADS) {
                // Process every vertex of the face.
                for(var j = 0; j < face.length; j += 4) {
                    var v1 = face[j];
                    if(!v1) {
                        throw new Error("Face must not contain any null vertices (v1)");
                    }
                    var v2 = face[j + 1];
                    if(!v2) {
                        throw new Error("Face must not contain any null vertices (v2)");
                    }
                    var v3 = face[j + 2];
                    if(!v3) {
                        throw new Error("Face must not contain any null vertices (v3)");
                    }
                    var v4 = face[j + 3];
                    if(!v4) {
                        throw new Error("Face must not contain any null vertices (v4)");
                    }

                    // get the color for this vertex;
                    var c1 = colors[j];
                    if(!c1 ) {
                        throw new Error("Colors must not contain any null color values (c1)");
                    }
                    var c2 = colors[j + 1];
                    if(!c2 ) {
                        throw new Error("Colors must not contain any null color values (c2)");
                    }
                    var c3 = colors[j + 2];
                    if(!c3 ) {
                        throw new Error("Colors must not contain any null color values (c3)");
                    }
                    var c4 = colors[j + 3];
                    if(!c4 ) {
                        throw new Error("Colors must not contain any null color values (c4)");
                    }

                    // rotate it; if it's not the default
                    if(block.orientation > 0) {
                        v1 = quat.RotatedVector(v1);
                        v2 = quat.RotatedVector(v2);
                        v3 = quat.RotatedVector(v3);
                        v4 = quat.RotatedVector(v4);
                    }
                    // now translate it
                    if(typeof block[0] !== "number" || typeof block[1] !== "number" || typeof block[2] !== "number") {
                        //console.log(block);
                        throw new Error("Block must contain numeric components.");
                    }
                    v1 = v1.Added(new alpha_Vector(block[0], block[1], block[2]));
                    v2 = v2.Added(new alpha_Vector(block[0], block[1], block[2]));
                    v3 = v3.Added(new alpha_Vector(block[0], block[1], block[2]));
                    v4 = v4.Added(new alpha_Vector(block[0], block[1], block[2]));

                    // Translate quads to triangles
                    var appendVertex = function(v) {
                        this.faceBuffer.appendData(
                            this.a_position,
                            v[0],
                            v[1],
                            v[2]
                        );
                    };
                    appendVertex.call(this, v1);
                    appendVertex.call(this, v2);
                    appendVertex.call(this, v3);
                    appendVertex.call(this, v1);
                    appendVertex.call(this, v3);
                    appendVertex.call(this, v4);

                    var appendColor = function(c) {
                        this.faceBuffer.appendData(
                            this.a_color,
                            c[0],
                            c[1],
                            c[2]
                        );
                    };
                    appendColor.call(this, c1);
                    appendColor.call(this, c2);
                    appendColor.call(this, c3);
                    appendColor.call(this, c1);
                    appendColor.call(this, c3);
                    appendColor.call(this, c4);
                }
            } else {
                throw new Error("Face must have a valid drawType property to read of either alpha_QUADS or alpha_TRIANGLES. (Given " + face.drawType + ")");
            }
        }
    }, this);
};

alpha_Cluster.prototype.Draw = function(viewMatrix)
{
    if(!viewMatrix) {
        throw new Error("A viewmatrix must be provided");
    }
    // Render faces.
    this.gl.useProgram(
        this.faceProgram
    );
    this.gl.uniformMatrix4fv(
        this.u_world,
        false,
        viewMatrix.toArray()
    );
    this.faceBuffer.renderPages();
};
