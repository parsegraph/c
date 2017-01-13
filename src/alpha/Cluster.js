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

    this.blocks = [];

    this.facePainter = new alpha_FacePainter(widget.gl());
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
    this.facePainter.Clear();
};

/**
 * construct all of the vertices from the blocks and store them
 */
alpha_Cluster.prototype.CalculateVertices = function()
{
    // delete what we had;
    this.facePainter.Clear();

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
                    this.facePainter.Triangle(
                        vertex[0],
                        vertex[1],
                        vertex[2],
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
                    this.facePainter.Quad(v1, v2, v3, v4, c1, c2, c3, c4);
                }
            } else {
                throw new Error("Face must have a valid drawType property to read of either alpha_QUADS or alpha_TRIANGLES. (Given " + face.drawType + ")");
            }
        }
    }, this);
};

alpha_Cluster.prototype.Draw = function(viewMatrix)
{
    this.facePainter.Draw(viewMatrix);
};
