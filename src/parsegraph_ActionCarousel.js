function parsegraph_ActionCarousel(graph)
{
    this._graph = graph;
    this._actions = [];
}

parsegraph_ActionCarousel.prototype.graph = function()
{
    return this._graph;
};

parsegraph_ActionCarousel.prototype.addAction = function(action, listener, listenerThisArg)
{
    if(typeof action === "string") {
        var label = action;
        action = new parsegraph_Node(parsegraph_BLOCK);
        action.setLabel(label, this.graph().glyphAtlas());
    }
    if(!listenerThisArg) {
        listenerThisArg = this;
    }
    this._actions.push([action, listener, listenerThisArg]);
};

parsegraph_ActionCarousel.prototype.install = function(node, nodeData)
{
    node.setClickListener(function() {
        this.onClick(node, nodeData);
    }, this);
    return function() {
        node.setClickListener(null);
    };
};

parsegraph_ActionCarousel.prototype.onClick = function(node, nodeData)
{
    //console.log("Creating carousel");
    var carousel = this.graph().carousel();
    carousel.clearCarousel();
    carousel.moveCarousel(
        node.absoluteX(),
        node.absoluteY()
    );
    carousel.showCarousel();

    for(var i in this._actions) {
        var actionData = this._actions[i];
        carousel.addToCarousel(actionData[0], actionData[1], actionData[2], nodeData);
    }
    carousel.scheduleCarouselRepaint();
};
