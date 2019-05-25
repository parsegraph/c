parsegraph_listClasses.multislot = {
"spawn":function(app, car, id, value, items) {
    try {
        var childDims = JSON.parse(value);
        var subtype = childDims[0];
        var rowSize = childDims[1];
        var columnSize = childDims[2];
        var r = childDims[3];
        var g = childDims[4];
        var b = childDims[5];
    }
    catch(ex) {
        console.log(ex);
        return;
    }

    var bg = document.createElement("div");
    bg.className = "bg";

    var container = document.createElement("div");
    container.className = "popup";
    bg.appendChild(container);

    parsegraph_addEventListener(container, "submit", function(e) {
        e.preventDefault();
        return false;
    }, this);

    parsegraph_addEventListener(bg, "click", function() {
        if(bg.parentNode) {
            bg.parentNode.removeChild(bg);
        }
    });
    parsegraph_addEventListener(container, "click", function(e) {
        e.stopImmediatePropagation();
    });

    var permissionForm = new parsegraph_PermissionsForm(app.guid(), id);
    container.appendChild(permissionForm.container());

    var claimedActions = new parsegraph_ActionCarousel(app.graph());
    claimedActions.addAction("Lisp", function(plotId) {
        parsegraph_pushListItem(app._guid, plotId, "lisp", "");
    }, this);
    claimedActions.addAction("Edit", function(plotId) {
        if(bg.parentNode) {
            bg.parentNode.removeChild(bg);
        }
        else {
            document.body.appendChild(bg);
            permissionForm.refresh(plotId);
        }
    }, this);
    claimedActions.addAction("Unclaim", function(plotId) {
        parsegraph_destroyListItem(app._guid, plotId);
    }, this);

    var plotActions = new parsegraph_ActionCarousel(app.graph());
    plotActions.addAction("Claim", function(index) {
        parsegraph_pushListItem(app._guid, id, "multislot::plot", [index, 1]);
    }, this);

    var multislotActions = new parsegraph_ActionCarousel(app.graph());
    multislotActions.addAction("Edit", function(id) {
        if(bg.parentNode) {
            bg.parentNode.removeChild(bg);
        }
        else {
            document.body.appendChild(bg);
            permissionForm.refresh(id);
        }
    }, this);
    multislotActions.install(car.node(), id);

    var allocations = [];
    var nodeAllocations = [];
    for(var i = 0; i < rowSize * columnSize; ++i) {
        allocations[i] = false;
        nodeAllocations[i] = false;
    }
    for(var j in items) {
        var plot = JSON.parse(items[j].value);
        for(var k = 0; k < plot[1]; ++k) {
            allocations[plot[0] + k] = items[j];
        }
    }

    var plotListener = function(ev) {
        var node = this;
        switch(ev.event) {
        case "pushListItem":
            var child = ev.item;
            var car = new parsegraph_Caret(node);
            car.setGlyphAtlas(app.glyphAtlas());
            app.spawn(car, child);
            app.graph().scheduleRepaint();
            break;
        };
    };

    app.listen(id, function(ev) {
        switch(ev.event) {
        case "pushListItem":
            if(ev.list_id == id) {
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
                    title.setLabel(item.username ? item.username : "CLAIMED", app.glyphAtlas());
                    allocations[plotStart + i] = ev.item;
                    console.log(allocations[plotStart + i]);
                    app.listen(ev.item_id, plotListener, node);
                }
                app.graph().scheduleRepaint();
            }
            break;
        }
    }, this);

    var spawnPlot = function(title) {
        var node = car.node();
        if(nodeAllocations[index].length > 2) {
            nodeAllocations[index][2]();
        }
        nodeAllocations[index] = [node, title];
        if(allocations[index]) {
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
        }
        else {
            // Plot is unclaimed.
            nodeAllocations[index].push(plotActions.install(node, index));
        }
        ++index;
    };

    if(subtype === 0) {
        var index = 0;
        for(var y = 0; y < columnSize; ++y) {
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
            var us = parsegraph_copyStyle('u');
            us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
            car.replace('u');
            car.node().setBlockStyle(us);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < rowSize; ++x) {
                car.spawnMove('f', 's');
                var title = car.node();
                car.spawnMove('d', 'u');
                spawnPlot(title);
                car.move('u');
                car.pull('d');
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

        for(var y = 0; y < columnSize; ++y) {
            if(y === 0) {
                //car.align('d', parsegraph_ALIGN_CENTER);
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            var us = parsegraph_copyStyle('u');
            us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
            car.replace('u');
            car.node().setBlockStyle(us);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < rowSize; ++x) {
                car.spawnMove('d', 'u');
                var s = parsegraph_copyStyle('u');
                s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                car.replace('u');
                car.node().setBlockStyle(s);
                car.pull('f');
                var bsty = parsegraph_copyStyle('b');
                bsty.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                car.spawnMove('f', 'b');
                car.node().setBlockStyle(bsty);
                var title = car.node();
                car.spawnMove('d', 'u');
                spawnPlot(title);
                car.move('u');
                car.pull('d');
                car.move('b');
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

        for(var y = 0; y < columnSize; ++y) {
            if(y === 0) {
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            var us = parsegraph_copyStyle('u');
            us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
            car.node().setBlockStyle(us);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < rowSize; ++x) {
                if(x > 0) {
                    car.spawnMove('d', 'u');
                    car.node().setBlockStyle(us);
                }
                car.spawnMove('d', 's');
                var s = parsegraph_copyStyle('s');
                s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                car.node().setBlockStyle(s);
                var title = car.node();
                car.spawnMove('f', 'u');
                spawnPlot(title);
                car.move('b');
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
        for(var y = 0; y < columnSize; ++y) {
            if(y === 0) {
                car.align('d', parsegraph_ALIGN_CENTER);
                car.spawnMove('d', 'u');
                car.shrink();
            }
            else {
                car.spawnMove('f', 'u');
            }
            var us = parsegraph_copyStyle('u');
            us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
            car.node().setBlockStyle(us);
            if(y === 0) {
                car.shrink();
            }
            car.push();
            for(var x = 0; x < rowSize; ++x) {
                if(x > 0) {
                    car.spawnMove('d', 'u');
                    car.node().setBlockStyle(us);
                }
                car.spawnMove('d', 's');
                var s = parsegraph_copyStyle('s');
                s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                car.node().setBlockStyle(s);
                car.pull('b');
                var title = car.node();
                car.spawnMove('b', 'u');
                spawnPlot(title);
                car.move('f');
            }
            car.pop();
            car.pull('d');
            parsegraph_FIT_LOOSE && car.fitLoose();
            parsegraph_CREASE && car.crease();
        }
    }
}
};
