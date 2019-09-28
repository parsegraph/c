parsegraph_listClasses = {};

function parsegraph_Environment(app)
{
    if(!app) {
        throw new Error("An application must be provided when creating a world");
    }
    this._app = app;
    this._sessionId = null;
    this._itemListeners = {};
    this._items = {};
    if(WeakMap) {
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
        if(shownPermissionId == plotId && bg.parentNode) {
            bg.parentNode.removeChild(bg);
            shownPermissionId = null;
            return;
        }
        document.body.appendChild(bg);
        permissionForm.refresh(plotId);
        shownPermissionId = plotId;
    };

    this._processor = new parsegraph_EventProcessor(this);
}

parsegraph_Environment.prototype.spawnItem = function(id, type, value, items)
{
    var klass = parsegraph_listClasses[type];
    if(!klass) {
        throw new Error("Block type not recognized: " + type);
    }
    if(id in this._items) {
        throw new Error("Item was already spawned.", this._items[id]);
    }
    return this.register(klass.spawnItem.call(klass, this, value, items), id);
};

parsegraph_Environment.prototype.getId = function(item)
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

parsegraph_Environment.prototype.register = function(item, id)
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

parsegraph_Environment.prototype.unregister = function(id)
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

parsegraph_Environment.prototype.onItemEvent = function(id, event)
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

parsegraph_Environment.prototype.listen = function(id, listener, listenerThisArg)
{
    //console.log("Listening for " + id);
    if(!this._itemListeners[id]) {
        this._itemListeners[id] = [];
    }
    this._itemListeners[id].push([listener, listenerThisArg]);
};

parsegraph_Environment.prototype.pushListItem = function(id, type, value, cb, cbThisArg)
{
    this.request({
        command:"pushListItem",
        list_id:id,
        type:type,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
};

parsegraph_Environment.prototype.destroyListItem = function(id, cb, cbThisArg)
{
    this.request({
        command:"destroyListItem",
        item_id:id
    }, cb, cbThisArg);
};

parsegraph_Environment.prototype.editListItem = function(id, value, cb, cbThisArg)
{
    this.request({
        command:"editItem",
        item_id:id,
        value:JSON.stringify(value)
    }, cb, cbThisArg);
};

parsegraph_Environment.prototype.request = function()
{
    return this._processor.request.apply(this, arguments);
};

parsegraph_Environment.prototype.submit = function(action)
{
    action.setListener(this.process, this);
    this._actions.push(action);
    this.process();
};

parsegraph_Environment.prototype.process = function()
{
    while(this._firedActions < this._actions.length) {
        try {
            var action = this._actions[this._firedActions++];
            if(!action.advance()) {
                --this._firedActions;
                return;
            }
        }
        catch(ex) {
            console.log(ex);
        }
    }
};

parsegraph_Environment.prototype.setLiveSession = function(sessionId)
{
    this._sessionId = sessionId;
};

parsegraph_Environment.prototype.node = function()
{
    return this._root;
};

parsegraph_Environment.prototype.start = function(root)
{
    this._root = root;
    if(!this.app().guid()) {
        throw new Error("This world does not have have a world GUID.");
    }
    root.connectNode(parsegraph_DOWNWARD, new parsegraph_Node(parsegraph_BUD));
    this._processor.start();
};

parsegraph_Environment.prototype.prepopulate = function(cb, cbThisArg)
{
    if(!cb) {
        throw new Error("Refusing to fire without a non-null listener");
    }
    this.request({command:"prepopulate"}, cb, cbThisArg);
};

parsegraph_Environment.prototype.close = function()
{
};

parsegraph_Environment.prototype.font = function()
{
    return parsegraph_defaultFont();
};

parsegraph_Environment.prototype.load = function(worldList)
{
    var startTime = new Date();
    var car = new parsegraph_Caret(this._root);
    car.disconnect('d');
    //console.log(worldList);

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
            actionNode.setLabel("Prepopulate", this.font());
            carousel.addToCarousel(actionNode, function() {
                this.prepopulate(this, function(success, resp) {
                    //console.log(success, resp);
                }, this);
            }, this);
            this.graph().carousel().scheduleCarouselRepaint();
        }, this);
        car.move('u');
        car.pull('d');
    }

    for(var worldIndex = 0; worldIndex < worldList.length; ++worldIndex) {
        var child = worldList[worldIndex];
        var item = this.spawnItem(child.id, child.type, child.value, child.items);
        if(worldIndex > 0) {
            car.connect('f', item.node());
            car.move('f');
        }
        else {
            car.disconnect('d');
            car.align('d', 'c');
            car.connect('d', item.node());
            car.move('d');
        }
        parsegraph_FIT_LOOSE && car.fitLoose();
        parsegraph_CREASE && car.crease();
    }

    //console.log("Graph reconstructed in " + parsegraph_elapsed(startTime) + "ms");
    this.app().scheduleRepaint();
    this.app().scheduleRender();
    console.log("Time till environment loaded: " + parsegraph_elapsed(parsegraph_START_TIME));
};

parsegraph_Environment.prototype.sessionId = function()
{
    return this._sessionId;
};

parsegraph_Environment.prototype.app = function()
{
    return this._app;
};

parsegraph_Environment.prototype.guid = function()
{
    return this._app.guid();
};

parsegraph_Environment.prototype.graph = function()
{
    return this._app.graph();
};
