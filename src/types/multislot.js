function parsegraph_Multislot(room, rowSize, columnSize, color, subtype)
{
    this._room = room;
    this._plots = [];
    this._id = null;

    var car = new parsegraph_Caret('b');
    this._root = car.node();
    this._size = rowSize * columnSize;
    this._columnSize = columnSize;
    this._rowSize = rowSize;
    this._color = color;

    this.build(car, subtype);

    var multislotActions = new parsegraph_ActionCarousel();
    multislotActions.addAction("Edit", function() {
        this.room().togglePermissions(this.id());
    }, this);
    multislotActions.install(this.node());

    this._root.label(subtype);
};

parsegraph_Multislot.prototype.setId = function(id)
{
    if(this._id) {
        this.room().removeItemListener(this._id, this.onItemEvent, this);
    }
    this._id = id;
    if(this._id) {
        this.room().addItemListener(this._id, this.onItemEvent, this);
    }
};

parsegraph_Multislot.prototype.onItemEvent = function(obj)
{
    if(!this.id()) {
        return;
    }
    if(obj.event === "pushListItem" && obj.list_id === this.id()) {
        var item = obj.item;
        if(item.type === "multislot::plot") {
            var itemData = JSON.parse(item.value);
            var plot = this.getPlot(itemData[0]);
            if(!plot) {
                throw new Error("Plot not found");
            }
            plot.setId(obj.item_id);
        }
    }
};

parsegraph_Multislot.prototype.id = function()
{
    return this._id;
};

parsegraph_Multislot.prototype.color = function()
{
    return this._color;
};

parsegraph_Multislot.prototype.node = function()
{
    return this._root;
};

parsegraph_Multislot.prototype.room = function()
{
    return this._room;
};

parsegraph_Multislot.prototype.scheduleUpdate = function()
{
    return this.room().scheduleRepaint();
};

parsegraph_Multislot.prototype.getPlot = function(index)
{
    return this._plots[index];
};

parsegraph_Multislot.prototype.build = function(car, subtype)
{
    //console.log("Subtype=" + subtype);
    var plotListener = function(ev) {
        var node = this;
        switch(ev.event) {
        case "pushListItem":
            var child = ev.item;
            var car = new parsegraph_Caret(node);
            this.room().spawn(car, child);
            this.scheduleUpdate();
            break;
        };
    };

    var spawnPlot = function() {
        var index = this._plots.length;
        var plot = new parsegraph_MultislotPlot(this, index);
        this._plots.push(plot);
        return plot;
    };

    var cs = parsegraph_copyStyle('u');
    cs.backgroundColor = new parsegraph_Color(.8);
    cs.borderColor = new parsegraph_Color(.6);

    var us = parsegraph_copyStyle('u');
    us.backgroundColor = this._color;
    var bs = parsegraph_copyStyle('b');
    bs.backgroundColor = this._color;

    this._root.setLabel(subtype);
    if(subtype === 0) {
        var index = 0;
        for(var y = 0; y < this._columnSize; ++y) {
            if(y === 0) {
                car.pull('d');
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('d', 'u');
            }
            car.pull('f');
            car.replace('u');
            car.node().setBlockStyle(cs);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < this._rowSize; ++x) {
                var plot = spawnPlot.call(this);
                car.connect('f', plot.node());
                car.move('f');
                //console.log(x + ", " + y);
            }
            car.pop();
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
    else if(subtype === 1) {
        var index = 0;
        car.align('d', 'c');
        car.pull('d');
        car.spawnMove('d', 'u');

        for(var y = 0; y < this._columnSize; ++y) {
            if(y === 0) {
                //car.align('d', parsegraph_ALIGN_CENTER);
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            car.replace('u');
            car.node().setBlockStyle(cs);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < this._rowSize; ++x) {
                car.spawnMove('d', 'u');
                car.replace('u');
                car.node().setBlockStyle(cs);
                car.pull('f');
                var plot = spawnPlot.call(this);
                car.connect('f', plot.node());
            }
            car.pop();
            car.pull('d');
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
    else if(subtype === 2) {
        car.align('d', 'c');
        car.pull('d');
        //car.spawnMove('d', 'u');
        var index = 0;

        for(var y = 0; y < this._columnSize; ++y) {
            if(y === 0) {
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            car.node().setBlockStyle(cs);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < this._rowSize; ++x) {
                car.spawnMove('d', 's');
                car.node().setBlockStyle(cs);
                var plot = spawnPlot.call(this);
                car.connect('f', plot.node());
                car.pull('f');
            }
            car.pop();
            car.pull('d');
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
    else if(subtype === 3) {
        car.align('d', 'c');
        car.pull('d');
        //car.spawnMove('d', 'u');

        var index = 0;
        for(var y = 0; y < this._columnSize; ++y) {
            if(y === 0) {
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            car.node().setBlockStyle(cs);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < this._rowSize; ++x) {
                car.spawnMove('d', 's');
                car.node().setBlockStyle(cs);
                car.pull('b');
                var plot = spawnPlot.call(this);
                car.connect('b', plot.node());
            }
            car.pop();
            car.pull('d');
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
    else if(subtype === 4) {
        var index = 0;
        for(var y = 0; y < this._columnSize; ++y) {
            if(y === 0) {
                car.pull('d');
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('d', 'u');
            }
            car.pull('b');
            car.replace('u');
            car.node().setBlockStyle(cs);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < this._rowSize; ++x) {
                car.spawnMove('b', 's');
                car.node().setBlockStyle(cs);
                var plot = spawnPlot.call(this);
                car.connect('d', plot.node());
                car.pull('d');
                console.log(x + ", " + y);
            }
            car.pop();
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
    else {
        throw new Error("Subtype not recognized");
    }
};

parsegraph_listClasses.multislot = {
"spawnItem":function(room, value, children, id) {
    var params = JSON.parse(value);
    var subtype = params[0];
    var rowSize = params[1];
    var columnSize = params[2];
    var color = new parsegraph_Color(params[3]/255, params[4]/255, params[5]/255);
    var multislot = new parsegraph_Multislot(room, rowSize, columnSize, color, subtype);
    multislot.setId(id);
    for(var i = 0; i < children.length; ++i) {
        var child = children[i];
        console.log(child);
        if(child.type === "multislot::plot") {
            var plotData = JSON.parse(child.value);
            var plot = multislot.getPlot(plotData[0]);
            plot.setId(child.id);
            if(child.username) {
                plot.claim(child.username);
            }
            console.log(child);
        }
        else {
            throw new Error("Unexpected type: " + child.type);
        }
    }
    return multislot;
}
};
