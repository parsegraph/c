function parsegraph_EventProcessor(env)
{
    this._env = env;
    this._eventSource = null;
};

parsegraph_EventProcessor.prototype.env = function()
{
    return this._env;
};

parsegraph_EventProcessor.prototype.app = function()
{
    return this.env().app();
};

parsegraph_EventProcessor.prototype.sessionId = function()
{
    return this.env().sessionId();
};

parsegraph_EventProcessor.prototype.start = function()
{
    if(!this.app().guid()) {
        throw new Error("This world does not have a world GUID");
    }
    var that = this;
    console.log("Time till event connecting: " + parsegraph_elapsed(parsegraph_START_TIME));
    this._eventSource = new EventSource(this.app().hostname() + '/@' + this.app().guid() + "/live");
    var cachedWorld = sessionStorage.getItem("WORLD@" + that.app().guid());
    this._eventSource.onmessage = function(e) {
        try {
            var obj = JSON.parse(e.data);
            //console.log("Found message!", obj);
            if(obj.event === "sessionStarted") {
                that.env().setLiveSession(obj.guid);
                /*if(!that._cameraProtocol) {
                    that._cameraProtocol = new parsegraph_InputProtocol(that.guid(), that.sessionId(), that.graph().input());
                }*/
                console.log("Time till session start: " + parsegraph_elapsed(parsegraph_START_TIME));
            }
            else if(obj.event === "initialData") {
                if(!cachedWorld) {
                    that.env().load(obj.root.items);
                    try {
                        sessionStorage.setItem("WORLD@" + that.app().guid(), e.data);
                    }
                    catch(ex) {
                        console.log("Failed to cache world");
                        console.log(ex);
                        alert(ex);
                    }
                }
            }
            /*else if(obj.event === "camera_move") {
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
            }*/
            else if(obj.event == "parsegraph_editItem") {
                that.env().onItemEvent(obj.item_id, obj);
            }
            else if(obj.event == "pushListItem") {
                that.env().onItemEvent(obj.list_id, obj);
            }
            else if(obj.event == "destroyListItem") {
                that.env().onItemEvent(obj.item_id, obj);
            }
            else if(obj.event == "prepopulate") {
                window.location.replace(window.location);
            }
            else {
                //console.log("Unknown event: " + obj.event);
            }
        }
        catch(ex) {
            console.log("Failed to read message. Error: ", ex, "Message:", e.data);
        }
    };
    if(cachedWorld) {
        console.log("FOUND CACHED WORLD");
        cachedWorld = JSON.parse(cachedWorld);
        that.env().load(cachedWorld.root.items);
    }
};

parsegraph_EventProcessor.prototype.request = function(reqBody, cb, cbThisArg)
{
    if(!this.guid()) {
        throw new Error("Graph does not have a world GUID");
    }
    if(!this.sessionId()) {
        throw new Error("Graph app does not have a session GUID");
    }
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/@" + this.guid(), true);
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
    reqBody.guid = this.sessionId();
    xhr.send(JSON.stringify(reqBody));
};
