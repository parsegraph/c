function parsegraph_DepthTraversal(root)
{
    this._nodes = [root];
    this._states = [null];
    this._iterationState = [0];
    this._depth = 1;
}

parsegraph_DepthTraversal.prototype.canVisit = function()
{
    return this._depth > 0;
};

/**
 * Visits each node of the given document tree, depth-first.
 *
 * visitor(node, levelState) where node is the visited node, and levelState is the
 * user-defined data common to the children under iteration.
 */
parsegraph_DepthTraversal.prototype.visit = function(visitor, visitorThisArg)
{
    var node = this._nodes[this._nodes.length - 1];
    if(!node) {
        throw new Error("No node available for traversal.");
    }

    // Visit the currently positioned node.
    if(this._iterationState[this._iterationState.length - 1] != 2) {
        var s = visitor.call(visitorThisArg, node, this._states[this._states.length - 1]);
        this._states[this._states.length - 1] = s;
    }

    // Move to the next available node.
    if(this._iterationState[this._iterationState.length - 1] == 0 && node.firstChild) {
        this._iterationState[this._iterationState.length - 1] = 1;
        // The current node has children, so advance to those.
        this._nodes.push(node.firstChild);
        this._states.push(null);
        this._iterationState.push(false);
        this._depth++;
    }
    else if(node.nextSibling) {
        // The current node has a sibling, so advance to that.
        this._nodes[this._nodes.length - 1] = node.nextSibling;
        this._iterationState[this._iterationState.length - 1] = 0;
    }
    else {
        // The current node has nothing to advance to, so retreat.
        visitor.call(visitorThisArg, null, this._states[this._states.length - 1]);
        this._nodes.pop();
        this._states.pop();
        this._iterationState.pop();
        this._iterationState[this._iterationState.length - 1] = 2;
        this._depth--;
    }
};

parsegraph_DepthTraversal_Tests = new parsegraph_TestSuite("parsegraph_DepthTraversal");
parsegraph_AllTests.addTest(parsegraph_DepthTraversal_Tests);

parsegraph_DepthTraversal_Tests.addTest("parsegraph_DepthTraversal", function() {
    var dom = document.createElement("html");
    dom.appendChild(document.createElement("head"));
    dom.appendChild(document.createElement("body"));
    dom.lastChild.appendChild(document.createElement("div"));
    dom.lastChild.lastChild.appendChild(document.createElement("p"));
    dom.lastChild.appendChild(document.createElement("form"));
    dom.lastChild.appendChild(document.createElement("div"));

    var traversal = new parsegraph_DepthTraversal(dom);
    var i = 0;
    while(traversal.canVisit()) {
        if(i > 100) {
            throw new Error("UNSTOPPABLE");
        }
        ++i;
        traversal.visit(function(node, levelState) {
            console.log(node, levelState);
            return "LEVEL";
        });
    }
});
