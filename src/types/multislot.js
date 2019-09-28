function parsegraph_Multislot(env, rowSize, columnSize, color, subtype)
{
    this._env = env;
    this._plots = [];
    var car = new parsegraph_Caret('b', env.font());
    this._root = car.node();
    this._size = rowSize * columnSize;
    this._columnSize = columnSize;
    this._rowSize = rowSize;
    this._color = color;

    this.build(car, subtype);

    var multislotActions = new parsegraph_ActionCarousel(this.graph());
    multislotActions.addAction("Edit", function() {
        this.env().togglePermissions(this._id);
    }, this);
    multislotActions.install(this.node());

    this._root.label(subtype);
};

parsegraph_Multislot.prototype.color = function()
{
    return this._color;
};

parsegraph_Multislot.prototype.node = function()
{
    return this._root;
};

parsegraph_Multislot.prototype.env = function()
{
    return this._env;
};

parsegraph_Multislot.prototype.graph = function()
{
    return this._env.graph();
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
            app.spawn(car, child);
            app.graph().scheduleRepaint();
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
                if(x > 0) {
                    car.spawnMove('d', 'u');
                    car.node().setBlockStyle(cs);
                }
                car.spawnMove('d', 's');
                car.node().setBlockStyle(bs);
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
                if(x > 0) {
                    car.spawnMove('d', 'u');
                    car.node().setBlockStyle(cs);
                }
                car.spawnMove('d', 's');
                car.node().setBlockStyle(bs);
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
                car.node().setBlockStyle(bs);
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
"spawnItem":function(env, value, children) {
    var params = JSON.parse(value);
    var subtype = params[0];
    var rowSize = params[1];
    var columnSize = params[2];
    var color = new parsegraph_Color(params[3]/255, params[4]/255, params[5]/255);
    var multislot = new parsegraph_Multislot(env, rowSize, columnSize, color, subtype);
    /*
    env.listen(id, function(ev) {
        switch(ev.event) {
        case "pushListItem":
            if(ev.list_id !== id) {
                return;
            }
            var item = ev.item;
            var plot = JSON.parse(item.value);
            var plotStart = plot[0];
            var plotLength = plot[1];
            for(var i = 0; i < plotLength; ++i) {
                var nodeAlloc = nodeAllocations[plotStart + i];
                if(nodeAlloc.length > 2) {
                    nodeAlloc[2]();
                    nodeAlloc.splice(2, 1);
                }
                var node = nodeAllocations[plotStart + i][0];
                var title = nodeAllocations[plotStart + i][1];
                node.setType(parsegraph_BUD);
                var s = parsegraph_copyStyle('u');
                s.backgroundColor = new parsegraph_Color(125, 125, 125);
                node.setBlockStyle(s);
                if(nodeAllocations[plotStart + i][2]) {
                    nodeAllocations[plotStart + i][2]();
                }
                nodeAllocations[plotStart + i][2] = claimedActions.install(node, ev.item.id);
                var s = parsegraph_copyStyle('s');
                s.backgroundColor = new parsegraph_Color(125, 125, 125);
                title.setType(parsegraph_SLOT);
                title.setBlockStyle(s);
                title.setLabel(item.username ? item.username : "CLAIMED", env.font());
                allocations[plotStart + i] = ev.item;
                console.log(allocations[plotStart + i]);
                env.listen(ev.item_id, plotListener, node);
            }
            env.graph().scheduleRepaint();
            break;
        }
    }, this);
    */
    /*for(var j in items) {
        var plot = JSON.parse(items[j].value);
        for(var k = 0; k < plot[1]; ++k) {
            allocations[plot[0] + k] = items[j];
        }
    }*/


    return multislot;
}
};
