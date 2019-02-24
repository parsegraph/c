parsegraph_listClasses = {};

function parsegraph_pushListItem(guid, id, type, value)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onerror = function(e) {
        alert(e.error);
    };
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200) {
                // Success.
            }
            else {
                console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex);
        }
    };
    xhr.send(JSON.stringify({"command":"pushListItem", "list_id":id, "type":type, "value":JSON.stringify(value)}));
}

function parsegraph_editItem(guid, id, value)
{
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + guid, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onerror = function(e) {
        alert(e.error);
    };
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200) {
                // Success.
            }
            else {
                console.log(resp);
            }
        }
        catch(ex) {
            console.log(ex);
        }
    };
    xhr.send(JSON.stringify({"command":"editItem", "item_id":id, "value":JSON.stringify(value)}));
}

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

    var claimedActions = new parsegraph_ActionCarousel(app.graph());
    claimedActions.addAction("Lisp", function(plotId) {
        parsegraph_pushListItem(app._guid, plotId, "lisp", "");
    }, this);

    var plotActions = new parsegraph_ActionCarousel(app.graph());
    plotActions.addAction("Claim", function(index) {
        parsegraph_pushListItem(app._guid, id, "multislot::plot", [index, 1]);
    }, this);

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
        }
    }
}
};

function parsegraph_lisp_expression(app, car, id, value, items)
{
    var node = car.node();
    node.setType(parsegraph_BUD);

    for(var i in items) {
        car.push();
        car.spawnMove('f', 'u');
        var item = items[i];
        app.spawn(car, item);
        car.pop();
        car.spawnMove('d', 'u');
    }

    var actions = new parsegraph_ActionCarousel(app.graph());
    actions.addAction("Add expression", function() {
        parsegraph_pushListItem(app._guid, id, "lisp::expression", "");
    }, this);
    actions.install(car.node());

    app.listen(id, function(ev) {
        var node = this;
        switch(ev.event) {
        case "pushListItem":
            var item = ev.item;
            car.push();
            car.spawnMove('f', 'u');
            app.spawn(car, item);
            car.pop();
            car.spawnMove('d', 'u');
            actions.install(car.node());
            app.graph().scheduleRepaint();
            break;
        };
    }, node);
}

parsegraph_listClasses.lisp = {
"spawn":function(app, car, id, value, items) {
    var node = car.node();
    node.setType(parsegraph_BLOCK);
    car.label("Lisp");
    car.spawnMove('d', 'u');

    parsegraph_lisp_expression(app, car, id, value, items);
}
};

parsegraph_listClasses["lisp::expression"] = {
"spawn":function(app, car, id, value, items) {
    var actions = new parsegraph_ActionCarousel(app.graph());
    actions.addAction("Add symbol", function() {
        parsegraph_pushListItem(app._guid, id, "lisp::expression::symbol", "");
    }, this);
    actions.addAction("New line", function() {
        parsegraph_pushListItem(app._guid, id, "lisp::expression::newline", null);
    }, this);
    actions.addAction("Add quote", function() {
        parsegraph_pushListItem(app._guid, id, "lisp::expression::quote", "");
    }, this);
    actions.addAction("Add list", function() {
        parsegraph_pushListItem(app._guid, id, "lisp::list");
    }, this);

    var node = car.node();
    car.push();
    for(var i in items) {
        var item = items[i];
        if(item.type === "lisp::expression::newline") {
            actions.install(car.node());
            car.pop();
            car.spawnMove('d', 'u');
            car.push();
            app.graph().scheduleRepaint();
        }
        else {
            app.spawn(car, item);
        }
        car.spawnMove('f', 'u');
    }
    actions.install(car.node(), id);

    app.listen(id, function(ev) {
        var node = this;
        switch(ev.event) {
        case "pushListItem":
            var item = ev.item;
            if(item.type === "lisp::expression::newline") {
                car.pop();
                car.spawnMove('d', 'u');
                car.push();
                car.spawnMove('f', 'u');
                actions.install(car.node(), id);
                app.graph().scheduleRepaint();
                break;
            }
            app.spawn(car, item);
            car.spawnMove('f', 'u');
            actions.install(car.node());
            app.graph().scheduleRepaint();
            break;
        };
    }, node);
}
};

parsegraph_listClasses["lisp::expression::symbol"] = {
"spawn":function(app, car, id, value, items) {
    var actions = new parsegraph_ActionCarousel(app.graph());
    var form = document.createElement("div");
    form.style.positon = "absolute";
    form.style.left = 0;
    form.style.right = 0;
    form.style.top = 0;
    form.style.bottom = 0;

    form.innerHTML = "<div style='position: relative; padding: 1em; display: inline-block; background: #aaa'></div>";
    var container = form.childNodes[0];

    var valueField = document.createElement("input");
    valueField.type = "text";
    container.appendChild(valueField);
    container.appendChild(document.createElement("br"));

    var submitField = document.createElement("input");
    submitField.type = "submit";
    container.appendChild(submitField);

    parsegraph_addEventListener(submitField, "click", function() {
        parsegraph_editItem(app._guid, id, valueField.value);
    });
    actions.addAction("Edit", function() {
        if(form.parentNode) {
            form.parentNode.removeChild(form);
        }
        else {
            document.body.appendChild(form);
        }
    }, this);

    car.replace('b');
    car.label(JSON.parse(value));
    actions.install(car.node(), id);
}
};

parsegraph_listClasses["lisp::expression::quote"] = {
"spawn":function(app, car, id, value, items) {
    car.replace('b');
    car.label(JSON.parse(value));
}
};

parsegraph_listClasses["lisp::list"] = {
"spawn":function(app, car, id, value, items) {
    car.replace('s');
    car.spawnMove('i', 'u');
    car.shrink();
    parsegraph_lisp_expression(app, car, id, value, items);
}
};


function parsegraph_prepopulate(envGuid, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("POST", "/@" + envGuid, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onerror = function(e) {
        alert(e.error);
    };
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            listener.call(listenerThisArg, xhr.status === 200, resp);
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    };
    xhr.send(JSON.stringify({"command":"prepopulate"}));

    return xhr;
}

function parsegraph_SingleGraphApplication(guid)
{
    this._itemListeners = {};
    this._items = {};
    this._cameraName = "parsegraph_login_camera";
    this._guid = guid || "";
    if(window.location.protocol == "https:") {
        this._hostname = "https://" + location.host;
    }
    else {
        this._hostname = "http://" + location.host;
    }
}

/**
 * Creates a new parsegraph_Surface.
 */
parsegraph_SingleGraphApplication.prototype.createSurface = function() {
    return new parsegraph_Surface();
};

parsegraph_SingleGraphApplication.prototype.showModal = function(elem) {
};

parsegraph_SingleGraphApplication.prototype.createGraph = function(surface) {
    var graph = new parsegraph_Graph(this._surface);
    GRAPH = graph;
    return graph;
};

parsegraph_SingleGraphApplication.prototype.start = function(container) {
    // Always immediately initialize constants for use by application objects.
    parsegraph_initialize();

    // Create and globalize the graph.
    this._surface = this.createSurface();
    this._graph = this.createGraph();
    this._container = container;
    this._glyphAtlas = null;

    // Start initializing by loading Unicode for text.
    var uni = new parsegraph_Unicode();
    this._unicode = uni;
    var that = this;
    uni.onLoad = function() {
        that.onUnicodeLoaded.call(that);
    };
    uni.load();

    // Export the Unicode instance.
    parsegraph_UNICODE_INSTANCE = uni;
};

parsegraph_SingleGraphApplication.prototype.sessionNode = function() {
    return this._sessionNode;
};

parsegraph_SingleGraphApplication.prototype.createSessionNode = function(graph, userLogin, node) {
    var car = new parsegraph_Caret('b');
    car.setGlyphAtlas(graph.glyphAtlas());
    car.label("Hello, " + userLogin.username + ".");
    return car.node();
};

parsegraph_SingleGraphApplication.prototype.onLogout = function() {
    //console.log("onLogout");
    //this._sessionNode.disconnectNode();
    this._sessionNode = null;
    this._loginNode = null;

    if(this._environmentProtocol) {
        this._environmentProtocol.close();
        this._environmentProtocol = null;
    }
};

parsegraph_SingleGraphApplication.prototype.onLogin = function(userLogin, node) {
    var graph = this.graph();

    try {
        this._loginNode = node;
        /*var createdNode = this.createSessionNode(graph, userLogin, node);
        if(!createdNode) {
            if(!node.hasNode(parsegraph_DOWNWARD)) {
                throw new Error("Factory function does not return a node, nor did it connect one.");
            }
            else {
                // Check if the created node was already connected.
                createdNode = node.nodeAt(parsegraph_DOWNWARD);
            }
        }
        else {
            node.connectNode(parsegraph_DOWNWARD, createdNode);
        }
        this._sessionNode = createdNode;*/
    }
    catch(ex) {
        console.log("Crashed during login construction: ", ex);
    }

    if(!this._environmentProtocol && this._guid) {
        this._environmentProtocol = new EventSource(this.hostname() + '/@' + this._guid + "/live");
        var that = this;
        this._environmentProtocol.onmessage = function(e) {
            try {
                var obj = JSON.parse(e.data);
                //console.log("Found message!", obj);
                if(obj.event === "initialData") {
                    that.loadEnvironment(obj.root);
                }
                else if(obj.event === "camera_move") {
                    if(userLogin.username === obj.username) {
                        return;
                    }
                    var cb = that._graph.cameraBox();
                    cb.setCamera(obj.username, {
                        "cameraX":obj.x,
                        "cameraY":obj.y,
                        "height":obj.height,
                        "scale":obj.scale,
                        "width":obj.width,
                    });
                }
                else if(obj.event == "mouse_move") {
                    if(userLogin.username === obj.username) {
                        return;
                    }
                    var cb = that._graph.cameraBox();
                    cb.setCameraMouse(obj.username, obj.x, obj.y);
                }
                else if(obj.event == "pushListItem") {
                    console.log(obj);
                    that.onItemEvent(obj.list_id, obj);
                }
            }
            catch(ex) {
                console.log("Failed to read message. Error: ", ex, "Message:", e.data);
            }
        };
    }

    if(!this._cameraProtocol && this._guid) {
        this._cameraProtocol = new parsegraph_InputProtocol(this._guid, this.graph().input());
    }
};

parsegraph_SingleGraphApplication.prototype.spawn = function(car, id, type, value, items)
{
    if(arguments.length === 2 && typeof id === "object") {
        items = id.items;
        value = id.value;
        type = id.type;
        id = id.id;
    }
    var klass = parsegraph_listClasses[type];
    if(!klass) {
        console.log("Block type not recognized: " + type);
        return;
    }
    car = car.clone();
    klass.spawn.call(klass, this, car, id, value, items);
};

parsegraph_SingleGraphApplication.prototype.onItemEvent = function(id, event)
{
    var listeners = this._itemListeners[id];
    if(listeners) {
        for(var i in listeners) {
            var cb = listeners[i];
            cb[0].call(cb[1], event);
        }
    }
    else {
        //console.log("No listeners for item: " + id);
    }
};

parsegraph_SingleGraphApplication.prototype.listen = function(id, listener, listenerThisArg)
{
    //console.log("Listening for " + id);
    if(!this._itemListeners[id]) {
        this._itemListeners[id] = [];
    }
    this._itemListeners[id].push([listener, listenerThisArg]);
};

parsegraph_SingleGraphApplication.prototype.hostname = function()
{
    return this._hostname;
};

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

parsegraph_SingleGraphApplication.prototype.loadEnvironment = function(initialData)
{
    var createClickListener = function(node, index) {
        if(!node) {
            throw new Error("No node given");
        }
        return function() {
            //console.log("Creating carousel");
            var carousel = this.graph().carousel();
            carousel.clearCarousel();
            carousel.moveCarousel(
                node.absoluteX(),
                node.absoluteY()
            );
            carousel.showCarousel();

            // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
            var actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Create link", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_createLink(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Clear slot", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_clearSlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Place storage item", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_placeStorageItemInMultislot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Simplify", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_simplifySlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Replace Slot", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_replaceSlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Release", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_releaseSlot(index);
            }, this);
            this.graph().carousel().scheduleCarouselRepaint();
        };
    };

    var worldList = initialData.items;
    var car = new parsegraph_Caret(this._loginNode);
    car.setGlyphAtlas(this.glyphAtlas());
    console.log(worldList);

    if(worldList.length === 0) {
        car.disconnect('d');
        car.align('d', 'c');
        var node = car.spawnMove('d', 'bu');
        car.onClick(function() {
            //console.log("Creating carousel");
            var carousel = this.graph().carousel();
            carousel.clearCarousel();
            carousel.moveCarousel(
                node.absoluteX(),
                node.absoluteY()
            );
            carousel.showCarousel();

            // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
            var actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Prepopulate", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_prepopulate(this._guid, function(success, resp) {
                    console.log(success, resp);
                }, this);
            }, this);
            this.graph().carousel().scheduleCarouselRepaint();
        }, this);
        car.move('u');
        car.pull('d');
    }

    for(var worldIndex = 0; worldIndex < worldList.length; ++worldIndex) {
        if(worldIndex > 0) {
            car.spawnMove('f', 'b');
        }
        else {
            car.disconnect('d');
            car.align('d', 'c');
            car.spawnMove('d', 'b');
        }
        car.push();
        var child = worldList[worldIndex];
        this.spawn(car, child.id, child.type, child.value, child.items);
        car.pop();
    }

    console.log("Graph reconstructed");
    this.scheduleRepaint();
    this.scheduleRender();
};

parsegraph_SingleGraphApplication.prototype.graph = function() {
    return this._graph;
};
parsegraph_SingleGraphApplication.prototype.unicode = function() {
    return this._unicode;
};
parsegraph_SingleGraphApplication.prototype.surface = function() {
    return this._surface;
};
parsegraph_SingleGraphApplication.prototype.glyphAtlas = function() {
    return this._glyphAtlas;
};

parsegraph_SingleGraphApplication.prototype.renderTimer = function() {
    return this._renderTimer;
};

parsegraph_SingleGraphApplication.prototype.onRender = function() {
    var graph = this.graph();
    var surface = this.surface();

    graph.input().Update(new Date());
    var t = alpha_GetTime();
    start = t;
    if(graph.needsRepaint()) {
        //console.log("Repainting");
        surface.paint(50);
    }
    //console.log("Rendering");
    surface.render();
    if(graph.input().UpdateRepeatedly() || graph.needsRepaint()) {
        if(this._cameraProtocol && graph.input().UpdateRepeatedly()) {
            this._cameraProtocol.update();
        }
        this._renderTimer.schedule();
    }
    //console.log("Done");
};

parsegraph_SingleGraphApplication.prototype.cameraName = function() {
    return this._cameraName;
};

parsegraph_SingleGraphApplication.prototype.setCameraName = function(name) {
    this._cameraName = name;
};

parsegraph_SingleGraphApplication.prototype.container = function() {
    return this._container;
};

parsegraph_SingleGraphApplication.prototype.loginWidget = function() {
    return this._loginWidget;
};

parsegraph_SingleGraphApplication.prototype.scheduleRender = function() {
    if(this._renderTimer) {
        this._renderTimer.schedule();
    }
};

parsegraph_SingleGraphApplication.prototype.scheduleRepaint = function() {
    this._graph.scheduleRepaint();
};

parsegraph_SingleGraphApplication.prototype.onUnicodeLoaded = function() {
    //console.log("Unicode loaded")
    // Verify preconditions for this application state.
    var graph = this.graph();
    var surface = this.surface();
    var uni = this.unicode();
    if(!graph) {
        throw new Error("A graph must have already been constructed.");
    }
    if(!surface) {
        throw new Error("A surface must have already been constructed.");
    }
    if(!uni) {
        throw new Error("A Unicode object must have already been constructed.");
    }

    // Create and set the glyph atlas if necessary.
    if(!this._glyphAtlas) {
        this._glyphAtlas = parsegraph_buildGlyphAtlas();
        graph.setGlyphAtlas(this.glyphAtlas());
        graph.glyphAtlas().setUnicode(uni);
    }

    this.container().appendChild(surface.container());

    this._loginWidget = new parsegraph_LoginWidget(surface, graph);
    this._loginWidget.authenticate();
    this._loginWidget.setTitle(this._guid);
    this._loginWidget.root().setClickListener(function() {
        
    }, this);
    graph.world().plot(this._loginWidget.root());

    this._loginWidget.setLoginListener(function(res, userLogin, node) {
        //console.log("Logged in")
        this.onLogin(userLogin, node);
        this._loginWidget.setLogoutListener(function() {
            this.onLogout(userLogin, node);
        }, this);
    }, this);

    var cameraName = this.cameraName();
    if(typeof cameraName === "string" && localStorage.getItem(cameraName) != null) {
        try {
            var cameraData = JSON.parse(localStorage.getItem(cameraName));
            graph.camera().restore(cameraData);
        } catch(e) {
            console.log(
                "Failed to parse saved camera state.\n" + parsegraph_writeError(e)
            );
        }
    }

    // Schedule the repaint.
    this._renderTimer = new parsegraph_AnimationTimer();
    var start = alpha_GetTime();
    this._renderTimer.setListener(function() {
        this.onRender();
    }, this);
    this._graph.input().SetListener(function(affectedPaint, eventSource, inputAffectedCamera) {
        if(affectedPaint) {
            this._graph.scheduleRepaint();
        }
        this.scheduleRender();
        if(this._cameraProtocol) {
            this._cameraProtocol.update();
        }
        if(inputAffectedCamera) {
            if(typeof cameraName === "string") {
                localStorage.setItem(cameraName, JSON.stringify(this._graph.camera().toJSON()));
            }
        }
    }, this);
    this.scheduleRender();
    this._graph.setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);
    this._graph.carousel().setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);
};
