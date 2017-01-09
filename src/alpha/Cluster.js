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
function alpha_Cluster(blockTypes)
{
    if(!blockTypes) {
        throw new Error("Cluster must be given a non-null blockTypes");
    }
    this.blockTypes = blockTypes;

    this.drawTypes = [
        [ [], [], [], [] ],
        [ [], [], [], [] ]
    ];  // X, Y, X, COLOR
    this.blocks = [];
};

alpha_Cluster_Tests = new parsegraph_TestSuite("alpha_Cluster");
parsegraph_AllTests.addTest(alpha_Cluster_Tests);

alpha_Cluster_Tests.addTest("alpha_Cluster", function(resultDom) {
    var BlockTypes = new alpha_BlockTypes();
    alpha_standardBlockTypes(BlockTypes);
    alpha_CubeMan(BlockTypes);

    // test version 1.0
    var cubeman = BlockTypes.Get("blank", "cubeman");

    var testCluster = new alpha_Cluster(BlockTypes);
    testCluster.AddBlock(new alpha_Block(cubeman, 0,5,0,1));
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

alpha_Cluster.prototype.AddBlock = function(block)
{
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
    this.CalculateVertices();
};

/**
 * construct all of the vertices from the blocks and store them
 * assuming only using GL_QUADS for now
 */
alpha_Cluster.prototype.CalculateVertices = function()
{
    // delete what we had;
    this.drawTypes = [
        [ [], [], [], [] ],
        [ [], [], [], [] ]
    ];  // X, Y, X, COLOR

    // assign locals;
    var x, y, z, c;

    var currentDraw;
    var currentColor = [null, null];

    this.blocks.forEach(function(block) {
        // get the faces from the blocktype
        var bType = this.blockTypes.Get(block.id);
        var quat = block.GetQuaternion( true );
        if(!quat) {
            console.log(block);
            throw new Error("Block must not return a null quaternion");
        }
        if(!bType) {
            return;
        }
        var shape = bType[0];
        var skin = bType[1];
        for(var i = 0; i < shape.length; ++i) { // vertices is face!
            // every face has its own drawType;
            var face = shape[i];
            if(!face) {
                throw new Error("Shape must not contain any null faces");
            }
            var draw = face.drawType;
            // assign the vertices and colors to the correct drawType
            if(draw != currentDraw) {
                currentDraw = draw;

                var d = this.drawTypes[draw];

                x = d[0];
                y = d[1];
                z = d[2];
                c = d[3];
            }

            var colors = skin[i];
            for(var j = 0; j < face.length; ++j) {
                var vertex = face[j];
                if(!vertex) {
                    throw new Error("Face must not contain any null vertices");
                }
                // get the color for this vertex;
                var color = colors[j];
                // rotate it; if it's not the default;
                if(block.orientation > 1) {
                    vertex = quat.RotatedVector(vertex);
                }
                // now translate it
                vertex = vertex.Added(new alpha_Vector(block[0], block[1], block[2]));
                // vector and cluster use the same indexes;
                x.push(vertex[0]);
                y.push(vertex[1]);
                z.push(vertex[2]);

                // if the next set of vertices are not using the current color;
                if(!currentColor[draw] || !currentColor[draw].Equals(color)) {
                    c.push(color);
                    currentColor[draw] = color;
                }
            }
        }
    }, this);
};

alpha_Cluster.prototype.Draw = function()
{
    var vertex;
    var color;

    // Draw each type.
    var drawThisType = function(draw) {
        var drawTypes = this.drawTypes[draw];
        var x, y, z, c;
        x = drawTypes[0];
        y = drawTypes[1];
        z = drawTypes[2];
        c = drawTypes[3];

        glBegin(draw, function() {
            for(var i = 0; i < x.length; ++i) {
                color = c[i]; // if the vertex has a new color
                if(color) {
                    glColor(color[0], color[1], color[2]);
                }
                glVertex(x[i], y[i], z[i]);
            }
        });
    };

    drawThisType(alpha_QUADS);
    drawThisType(alpha_TRIANGLES);
};

