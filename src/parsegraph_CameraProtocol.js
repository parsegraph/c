function parsegraph_sendCameraUpdate(envGuid, sessionId, camera, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    //console.log("Sending camera");

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
    var obj = camera.toJSON();
    obj.guid = sessionId;
    obj.command = "camera_move";
    xhr.send(JSON.stringify(obj));
    return xhr;
}

function parsegraph_sendMouseUpdate(envGuid, sessionId, input, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    //console.log("Sending mouse update");

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
    var obj = {
        command:"mouse_move",
        x:input.lastMouseX(),
        y:input.lastMouseY(),
        guid:sessionId
    };
    xhr.send(JSON.stringify(obj));
    return xhr;
}

function parsegraph_InputProtocol(envGuid, sessionId, input)
{
    var timer = new parsegraph_TimeoutTimer();
    timer.setDelay(400);

    this._envGuid = envGuid;
    this._sessionId = sessionId;
    this._input = input;
    this._camera = input.camera();

    this._waiting = 0;

    this._lastSentMouseVersion = -1;
    this._lastSentVersion = -1;
    timer.setListener(function() {
        if(this._waiting > 0) {
            this.scheduleUpdate();
            return;
        }
        this.sendUpdate();
    }, this);
    this._timer = timer;
}

parsegraph_InputProtocol.prototype.sendMouseUpdate = function()
{
    if(this._lastSentMouseVersion != this._input.mouseVersion()) {
        ++this._waiting;
        this._lastSentMouseVersion = this._input.mouseVersion();
        parsegraph_sendMouseUpdate(this._envGuid, this._sessionId, this._input, function(res, resp) {
            if(res === true) {
                // Update received.
            }
            else if(res === false) {
                // Bad request.
            }
            else {
                // Server error.
                console.log("Mouse update error: " + res);
            }
            --this._waiting;
        }, this);
    }
};

parsegraph_InputProtocol.prototype.sendCameraUpdate = function()
{
    if(this._lastSentVersion != this._camera.changeVersion()) {
        ++this._waiting;
        this._lastSentVersion = this._camera.changeVersion();
        parsegraph_sendCameraUpdate(this._envGuid, this._sessionId, this._camera, function(res, resp) {
            if(res === true) {
                // Update received.
            }
            else if(res === false) {
                // Bad request.
            }
            else {
                // Server error.
                console.log("Camera update error: " + res);
            }
            --this._waiting;
        }, this);
    }
};

parsegraph_InputProtocol.prototype.sendUpdate = function()
{
    if(this._waiting > 0) {
        return;
    }
    this.sendCameraUpdate();
    this.sendMouseUpdate();
};

parsegraph_InputProtocol.prototype.update = function()
{
    this.sendUpdate();
};

parsegraph_InputProtocol.prototype.scheduleUpdate = function()
{
    this._timer.schedule();
};
