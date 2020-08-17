parsegraph_listClasses = {};

function parsegraph_Room(belt, world, roomId)
{
    this._belt = belt;
    this._world = world;
    this._root = new parsegraph_Node(parsegraph_BLOCK);
    this._root.setLabel("Untitled");
    this._itemList = [];

    this._loaded = false;

    this._offline = null;

    this._emptyRoomActions = new parsegraph_ActionCarousel();
    this._emptyRoomActions.addAction("Prepopulate", function() {
        this.prepopulate(this, function(success, resp) {
            //console.log(success, resp);
        }, this);
    }, this);

    if(roomId) {
        this._roomId = roomId;
        this._eventSource = new EventSource('/@' + this._roomId + "/live");
        var that = this;
        this._eventSource.onmessage = function(e) {
            try {
                var obj = JSON.parse(e.data);
                //console.log("Found message!", obj);
                that.processMessage(obj);
            }
            catch(ex) {
                console.log("Failed to read message. Error: ", ex, "Message:", e.data);
            }
        };
        this._root.setLabel(roomId);
    }
    else {
        this._offline = new parsegraph_OfflineRoom(this);
    }

    this._itemListeners = {};
    this._items = {};
    if(window.WeakMap) {
        this._ids = new WeakMap();
    }
    else {
        this._ids = null;
    }
    this._actions = [];
    this._firedActions = 0;

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

    var permissionForm = new parsegraph_PermissionsForm(this);
    container.appendChild(permissionForm.container());

    var shownPermissionId = null;
    this.togglePermissions = function(plotId) {
        if(!plotId) {
            throw new Error("Plot ID must be provided when showing permissions");
        }
        this.scheduleRepaint();
        if(shownPermissionId == plotId && bg.parentNode) {
            bg.parentNode.removeChild(bg);
            shownPermissionId = null;
            return;
        }
        document.body.appendChild(bg);
        permissionForm.refresh(plotId);
        shownPermissionId = plotId;
    };

    this._username = null;
};

parsegraph_Room.prototype.offline = function()
{
    return this._offline;
};

parsegraph_Room.prototype.node = function()
{
    return this._root;
};

parsegraph_Room.prototype.scheduleRepaint = function()
{
    this._world.scheduleRepaint();
    this._belt.scheduleUpdate();
};
parsegraph_Room.prototype.scheduleUpdate = parsegraph_Room.prototype.scheduleRepaint;

parsegraph_Room.prototype.loaded = function()
{
    return this._loaded;
};

parsegraph_Room.prototype.load = function(items)
{
    this._loaded = true;
    this._root.disconnectNode(parsegraph_DOWNWARD);
    var car = new parsegraph_Caret(this._root);
    this._itemList = [];

    if(items.length === 0) {
        car.disconnect('d');
        car.align('d', 'c');
        var node = car.spawnMove('d', 'bu');
        this._emptyRoomActions.install(node);
        car.move('u');
        car.pull('d');
    }
    else {
        car.spawnMove('d', 'u', 'c');
        for(var i = 0; i < items.length; ++i) {
            if(i > 0) {
                car.spawnMove('f', 'u');
            }
            car.push();
            car.pull('d');
            var item = items[i];
            var widget = this.spawnItem(item.id, item.type, item.value, item.items);
            this._itemList.push(widget);
            car.connect('d', widget.node());
            car.pop();
        }
    }
    this.scheduleRepaint();
};

parsegraph_Room.prototype.getItem = function(index)
{
    return this._itemList[index];
};

parsegraph_Room.prototype.onItemEvent = function(id, event)
{
    console.log("Got event: ", id, event);
};

parsegraph_Room.prototype.username = function()
{
    return this._username;
};

parsegraph_Room.prototype.setUsername = function(username)
{
    this._username = username;
};

parsegraph_Room.prototype.processMessage = function(obj)
{
    console.log("EventStream message in process", obj);
    if(obj.event === "sessionStarted") {
        if(!obj.guid) {
            throw new Error("sessionStarted event must provided a session GUID");
        }
        this._sessionId = obj.guid;
        /*if(!this._cameraProtocol) {
            this._cameraProtocol = new parsegraph_InputProtocol(this.roomId(), this.sessionId(), this.graph().input());
        }*/
        console.log("Time till session start: " + parsegraph_elapsed(parsegraph_START_TIME));
    }
    else if(obj.event === "initialData") {
        this.load(obj.root.items);
    }
    else if(obj.event === "join") {
        this.setUsername(obj.username);
    }
    /*else if(obj.event === "camera_move") {
        if(userLogin.username === obj.username) {
            return;
        }
        var cb = this._graph.cameraBox();
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
        var cb = this._graph.cameraBox();
        cb.setCameraMouse(obj.username, obj.x, obj.y);
    }*/
    else if(obj.event == "parsegraph_editItem") {
        this.onItemEvent(obj.item_id, obj);
    }
    else if(obj.event == "pushListItem") {
        this.onItemEvent(obj.list_id, obj);
    }
    else if(obj.event == "destroyListItem") {
        this.onItemEvent(obj.item_id, obj);
    }
    else if(obj.event == "prepopulate") {
        window.location.replace(window.location);
    }
    else {
        console.log("Unknown event: ", obj);
    }
};

parsegraph_Room.prototype.roomId = function()
{
    return this._roomId;
};

parsegraph_Room.prototype.sessionId = function()
{
    return this._sessionId;
};

parsegraph_Room.prototype.spawnItem = function(id, type, value, items)
{
    var klass = parsegraph_listClasses[type];
    if(!klass) {
        throw new Error("Block type not recognized: " + type);
    }
    if(id in this._items) {
        throw new Error("Item was already spawned.", this._items[id]);
    }
    return this.register(klass.spawnItem.call(klass, this, value, items, id), id);
};

parsegraph_Room.prototype.getId = function(item)
{
    if(this._ids) {
        var val = this._ids.get(item);
        if(val) {
            return val;
        }
        return null;
    }
    for(var id in this._items) {
        if(this._items[id] === item) {
            return id;
        }
    }
    return null;
};

parsegraph_Room.prototype.register = function(item, id)
{
    if(id in this._items) {
        if(this._items[id] !== item) {
            throw new Error("Refusing to overwrite item " + id + " with " + item);
        }
        return item;
    }
    this._items[id] = item;
    if(this._ids) {
        this._ids.set(item, id);
    }
    return item;
};

parsegraph_Room.prototype.unregister = function(id)
{
    if(!(id in this._items)) {
        return null;
    }
    var item = this._items[id];
    delete this._items[id];
    delete this._itemListeners[id];
    if(this._ids) {
        this._ids.delete(item);
    }
    return item;
};

parsegraph_Room.prototype.onItemEvent = function(id, event)
{
    var listeners = this._itemListeners[id];
    if(listeners) {
        //console.log("Listeners for item: " + id);
        for(var i in listeners) {
            var cb = listeners[i];
            cb[0].call(cb[1], event);
        }
        if(event.event === "destroyListItem") {
            this.unregister(id);
        }
    }
    else {
        //console.log("No listeners for item: " + id);
    }
};

parsegraph_Room.prototype.addItemListener = function(id, listener, listenerThisArg)
{
    //console.log("Listening for " + id);
    if(!this._itemListeners[id]) {
        this._itemListeners[id] = [];
    }
    this._itemListeners[id].push([listener, listenerThisArg]);
};

parsegraph_Room.prototype.removeItemListener = function(id, listener, listenerThisArg)
{
    //console.log("Listening for " + id);
    if(!this._itemListeners[id]) {
        return false;
    }
    for(var i = 0; i < this._itemListeners[id].length; ++i) {
        var listenerData = this._itemListeners[id][i];
        if(listenerData[0] === listener && listenerData[1] === listenerThisArg) {
            this._itemListeners.splice(i, 1);
            return true;
        }
    }
    return false;
};

parsegraph_Room.prototype.pushListItem = function(id, type, value, cb, cbThisArg)
{
    this.request({
        command:"pushListItem",
        list_id:id,
        type:type,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
};

parsegraph_Room.prototype.destroyListItem = function(id, cb, cbThisArg)
{
    this.request({
        command:"destroyListItem",
        item_id:id
    }, cb, cbThisArg);
};

parsegraph_Room.prototype.editListItem = function(id, value, cb, cbThisArg)
{
    this.request({
        command:"editItem",
        item_id:id,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
};

parsegraph_Room.prototype.submit = function(action)
{
    action.setListener(this.process, this);
    this._actions.push(action);
    this.process();
};

parsegraph_Room.prototype.process = function()
{
    while(this._firedActions < this._actions.length) {
        try {
            var action = this._actions[this._firedActions++];
            if(!action.advance()) {
                --this._firedActions;
                this.scheduleUpdate();
                return;
            }
        }
        catch(ex) {
            console.log(ex);
        }
    }
    this.scheduleUpdate();
};

parsegraph_Room.prototype.prepopulate = function(cb, cbThisArg)
{
    if(!cb) {
        throw new Error("Refusing to fire without a non-null listener");
    }
    this.request({command:"prepopulate"}, cb, cbThisArg);
    this.scheduleRepaint();
};

parsegraph_Room.prototype.close = function()
{
};

parsegraph_Room.prototype.request = function(reqBody, cb, cbThisArg)
{
    if(!this.sessionId()) {
        throw new Error("Room must have a session ID");
    }
    reqBody.guid = this.sessionId();
    if(this._offline) {
        this._offline.receiveRequest(reqBody, cb, cbThisArg);
        return;
    }
    if(!this.roomId()) {
        throw new Error("Room must have a room ID");
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + this.roomId(), true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    var completed = false;
    xhr.onerror = function(e) {
        if(cb && !completed) {
            completed = true;
            cb.call(cbThisArg, e);
        }
        else if(!completed) {
            completed = true;
            console.log(e.error);
        }
        else {
            console.log("Request was already completed");
            console.log(e.error);
        }
    };
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var resp = JSON.parse(xhr.responseText);
            if(xhr.status === 200) {
                // Success.
                if(cb && !completed) {
                    completed = true;
                    cb.call(cbThisArg, null, resp);
                }
                else if(completed) {
                    console.log("Request was already completed");
                    console.log(resp);
                }
            }
            else {
                if(cb && !completed) {
                    completed = true;
                    cb.call(cbThisArg, resp);
                }
                else if(!completed) {
                    completed = true;
                    console.log(resp);
                }
                else {
                    console.log("Request was already completed");
                    console.log(resp);
                }
            }
        }
        catch(ex) {
            if(cb && !completed) {
                cb.call(cbThisArg, ex);
            }
            else if(!completed) {
                completed = true;
                console.log(ex);
            }
            else {
                console.log("Request was already completed");
                console.log(ex);
            }
        }
    };
    xhr.send(JSON.stringify(reqBody));
};

function parsegraph_OfflineRoom(room)
{
    if(!room) {
        throw new Error("Room must be provided");
    }
    this._room = room;
};

parsegraph_OfflineRoom.prototype.receiveRequest = function(obj)
{
    if(!obj) {
        throw new Error("Request must be provided");
    }
    switch(obj.command) {
    case "prepopulate":
        break;
    default:
        throw new Error("Unsupported request command: " + obj.command);
    }
    console.log(arguments);
};

parsegraph_OfflineRoom.prototype.start = function()
{
    this._room.processMessage({
        event:"sessionStarted",
        guid:"offline"
    });
    this._room.processMessage({
        event:"join",
        username:"test"
    });
    this._room.processMessage({
        event:"initialData",
        root:{
            items:[]
        }
    });
};

function parsegraph_testRoom(out, belt, world)
{
    var window = new parsegraph_Window();
    belt.addWindow(window);
    window.setExplicitSize(500, 500);
    var viewport = new parsegraph_Viewport(window, world);
    window.addComponent(viewport.component());
    out.appendChild(window.container());
};

parsegraph_Room_Tests = new parsegraph_TestSuite("parsegraph_Room");

parsegraph_Room_Tests.addTest("parsegraph_Room empty", function() {
    var belt = new parsegraph_TimingBelt();
    var world = new parsegraph_World();
    var room = new parsegraph_Room(belt, world);
    room.load([]);
});

parsegraph_Room_Tests.addTest("parsegraph_Room", function(out) {
    var belt = new parsegraph_TimingBelt();
    var world = new parsegraph_World();
    var room = new parsegraph_Room(belt, world);
    world.plot(room.node());
    room.load([
        {id:1, type:"multislot", value:"[1,10,10,10,10]", items:[
            {id:3, type:"multislot::plot", value:"[0,1]", items:[]}
        ]},
        {id:2, type:"multislot", value:"[1,1,1,1,1]", items:[]},
    ]);
    var multislot = room.getItem(0);
    if(!multislot) {
        throw new Error("Multislot must be spawned");
    }

    parsegraph_testRoom(out, belt, world);
});
