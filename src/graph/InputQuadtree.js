function parsegraph_QuadNodeObject(node, rect)
{
    this._node = node;
    this._rect = rect;
}

function parsegraph_QuadNode()
{
    this._objects = [];
};

parsegraph_QuadNode.prototype.add = function(node, rect)
{
    this._objects.push(new parsegraph_QuadNodeObject(node, rect));
};

parsegraph_QuadNode.prototype.remove = function(node, rect)
{
    for(var i = 0; i < this._objects.length; ++i) {
        var obj = this._objects[i];
        if(obj._node === node) {
            this._objects.splice(i, 1);
            return;
        }
    }
};

function parsegraph_InputQuadtree()
{
    this._root = new parsegraph_QuadNode();
}

parsegraph_InputQuadtree.prototype.getQuadNodeList = function(rect) {
    return this._root.findLeaf(rect);
};

parsegraph_InputQuadtree.prototype.addNode = function(node, rect) {
    var nodeList = this.getQuadNodeList(x, y);
    nodeList.add(node, rect);
};

parsegraph_InputQuadtree.prototype.removeNode = function(node, rect) {

};

parsegraph_InputQuadtree.prototype.nodeUnderCoords = function(x, y) {
    var nodeList = this.getNodeList(x, y);
};

parsegraph_InputQuadtree_Tests = new parsegraph_TestSuite("parsegraph_InputQuadtree");

parsegraph_InputQuadtree_Tests.AddTest("Make quadtree", function() {
});
