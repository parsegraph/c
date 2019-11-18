function parsegraph_ClaimPlotAction(plot, username)
{
    this._plot = plot;
    this._username = username;
    this._originalClaimant = null;
}

parsegraph_ClaimPlotAction.prototype.setListener = function(cb, cbThisArg) {
    if(this._listener) {
        console.log("Refusing to overwrite existing listener");
        console.log("Original listener:");
        console.log(this._listener, this._listenerThisArg);
        console.log("New listener:");
        console.log(cb, cbThisArg);
        throw new Error("Refusing to overwrite existing listener");
    }
    this._listener = cb;
    this._listenerThisArg = cbThisArg;
};

parsegraph_ClaimPlotAction.prototype.room = function() {
    return this._plot.room();
};

parsegraph_ClaimPlotAction.prototype.multislot = function() {
    return this._plot.multislot();
};

parsegraph_ClaimPlotAction.prototype.advance = function() {
    var multislotId = this.room().getId(this.multislot());
    if(multislotId === null) {
        return false;
    }
    this._originalClaimant = this._plot.claimant();
    this._version = this._plot.version();
    this._plot.claim(this._username);
    this.room().pushListItem(multislotId, "multislot::plot", [this._plot.index(), 1], this.receive, this);
    return true;
};

parsegraph_ClaimPlotAction.prototype.reverse = function() {
    if(this._plot.version() !== this._version) {
        // Preempted.
        return false;
    }
    if(this._originalClaimant) {
        this._plot.claim(this._originalClaimant);
    }
    else {
        this._plot.unclaim();
    }
    return true;
};

parsegraph_ClaimPlotAction.prototype.receive = function(err, resp) {
    if(err) {
        this.reverse();
    }
    else {
        this._plot.nextVersion();
    }
    if(this._listener) {
        this._listener.call(this._listenerThisArg);
    }
};

function parsegraph_UnclaimPlotAction(plot)
{
    this._plot = plot;
    this._originalClaimant = null;
}

parsegraph_UnclaimPlotAction.prototype.setListener = function(cb, cbThisArg) {
    if(this._listener) {
        console.log("Refusing to overwrite existing listener");
        console.log("Original listener:");
        console.log(this._listener, this._listenerThisArg);
        console.log("New listener:");
        console.log(cb, cbThisArg);
        throw new Error("Refusing to overwrite existing listener");
    }
    this._listener = cb;
    this._listenerThisArg = cbThisArg;
};

parsegraph_UnclaimPlotAction.prototype.room = function() {
    return this._plot.room();
};

parsegraph_UnclaimPlotAction.prototype.multislot = function() {
    return this._plot.multislot();
};

parsegraph_UnclaimPlotAction.prototype.advance = function() {
    var multislotId = this.room().getId(this.multislot());
    if(multislotId === null) {
        return false;
    }
    this._originalClaimant = this._plot.claimant();
    this._version = this._plot.version();
    this._plot.unclaim();
    this.room().destroyListItem(multislotId, "multislot::plot", [this._plot.index(), 1], this.receive, this);
    return true;
};

parsegraph_ClaimPlotAction.prototype.reverse = function() {
    if(this._plot.version() !== this._version) {
        // Preempted.
        return false;
    }
    if(this._originalClaimant) {
        this._plot.claim(this._originalClaimant);
    }
    else {
        this._plot.unclaim();
    }
    return true;
};

parsegraph_ClaimPlotAction.prototype.receive = function(err, resp) {
    if(err) {
        this.reverse();
    }
    else {
        this._plot.nextVersion();
    }
    if(this._listener) {
        this._listener.call(this._listenerThisArg);
    }
};

function parsegraph_MultislotPlot(multislot, index)
{
    this._index = index;
    this._multislot = multislot;
    this._version = 0;

    var car = new parsegraph_Caret('s');
    this._root = car.node();
    var bs = parsegraph_copyStyle('s');
    bs.backgroundColor = multislot.color();
    this._unclaimedStyle = bs;
    this._root.setBlockStyle(bs);

    this._claimedStyle = parsegraph_copyStyle('s');
    this._claimedStyle.backgroundColor = new parsegraph_Color(1, 1, 1);

    car.spawn('d', 'u');
    car.pull('d');
    car.move('d');

    this._unclaimedActions = new parsegraph_ActionCarousel();
    this._unclaimedActions.addAction("Claim", function() {
        var room = this._multislot.room();
        var username = room.username();
        if(!username) {
            throw new Error("Room must have a valid username");
        }
        this.room().submit(new parsegraph_ClaimPlotAction(this, username));
    }, this);
    this._actionRemover = this._unclaimedActions.install(car.node());
    car.move('u');

    var addDefaultActions = function(carousel) {
        carousel.addAction("Edit", function(plotId) {
            this.room().togglePermissions(plotId);
        }, this);
        carousel.addAction("Unclaim", function(plotId) {
            var room = this._multislot.room();
            this.room().submit(new parsegraph_UnclaimPlotAction(this));
        }, this);
    };
    this._populatedActions = new parsegraph_ActionCarousel();
    addDefaultActions.call(this, this._populatedActions);

    this._claimedActions = new parsegraph_ActionCarousel();
    this._claimedActions.addAction("Lisp", function(plotId) {
        parsegraph_pushListItem(this.room(), plotId, "lisp", "");
    }, this);
    addDefaultActions.call(this, this._claimedActions);



/*    var node = car.node();
    if(nodeAllocations[index].length > 2) {
        nodeAllocations[index][2]();
    }
    nodeAllocations[index] = [node, title];
    if(!allocations[index]) {
        // Plot is unclaimed.
        nodeAllocations[index].push(plotActions.install(node, index));
    }
    // Plot is claimed.
    var s = parsegraph_copyStyle('u');
    s.backgroundColor = new parsegraph_Color(125, 125, 125);
    node.setType(parsegraph_BUD);
    node.setBlockStyle(s);
    var s = parsegraph_copyStyle('s');
    s.backgroundColor = new parsegraph_Color(125, 125, 125);
    title.setType(parsegraph_SLOT);
    title.setBlockStyle(s);
    title.setLabel(
        allocations[index].username ? allocations[index].username : "CLAIMED",
        app.glyphAtlas()
    );
    //console.log(allocations[index]);
    if(allocations[index].items.length > 0) {
        var child = allocations[index].items[0];
        app.spawn(car, child.id, child.type, child.value, child.items);
        nodeAllocations[index][2] = null;
    }
    else {
        nodeAllocations[index].push(claimedActions.install(node, allocations[index].id));
        app.listen(allocations[index].id, plotListener, node);
        //console.log("LISTENING to ", allocations[index].id);
    }
    ++index;
*/
}

parsegraph_MultislotPlot.prototype.claimant = function()
{
    var claimant = this._root.label();
    if(claimant === "") {
        return null;
    }
    return claimant;
};

parsegraph_MultislotPlot.prototype.claim = function(name)
{
    this._root.setLabel(name);
    this._root.setBlockStyle(this._claimedStyle);
    this.room().scheduleUpdate();
    this._actionRemover();
    this._actionRemover = this._claimedActions.install(this._root.nodeAt(parsegraph_DOWNWARD));
};

parsegraph_MultislotPlot.prototype.populate = function(item)
{
};

parsegraph_MultislotPlot.prototype.depopulate = function()
{
};

parsegraph_MultislotPlot.prototype.unclaim = function()
{
    this._actionRemover();
    this._root.disconnectNode(parsegraph_DOWNWARD);
    this._root.setLabel("");
    var node = this._root.spawnNode(parsegraph_DOWNWARD, parsegraph_BUD);
    this._actionRemover = this._unclaimedActions.install(node);
    this._root.setBlockStyle(this._unclaimedStyle);
    this.room().scheduleUpdate();
};

parsegraph_MultislotPlot.prototype.multislot = function() {
    return this._multislot;
};

parsegraph_MultislotPlot.prototype.room = function()
{
    return this._multislot.room();
};

parsegraph_MultislotPlot.prototype.version = function()
{
    return this._version;
}

parsegraph_MultislotPlot.prototype.nextVersion = function()
{
    return ++this._version;
};

parsegraph_MultislotPlot.prototype.index = function()
{
    return this._index;
};

parsegraph_MultislotPlot.prototype.node = function()
{
    return this._root;
};
