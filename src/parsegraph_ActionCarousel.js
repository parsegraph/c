function parsegraph_ActionCarousel(window)
{
    this._window = window;
    this._actions = [];
}

parsegraph_ActionCarousel.prototype.addAction = function(action, listener, listenerThisArg)
{
    if(typeof action === "string") {
        var label = action;
        action = new parsegraph_Node(parsegraph_BLOCK);
        action.setLabel(label, parsegraph_defaultFont());
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
    var viewport = this._window.focusedComponent().peer();
    if(!viewport) {
        return;
    }
    var carousel = viewport.carousel();
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
