function parsegraph_sendCameraUpdate(envGuid, camera, listener, listenerThisArg)
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
    obj.type = "camera_move";
    xhr.send(JSON.stringify(obj));
    return xhr;
}

function parsegraph_CameraProtocol(envGuid, camera)
{
    var timer = new parsegraph_TimeoutTimer();
    timer.setDelay(50);

    this._envGuid = envGuid;
    this._camera = camera;

    this._waiting = false;

    this._lastSentVersion = -1;
    timer.setListener(function() {
        if(this._waiting) {
            this.scheduleUpdate();
            return;
        }
        this.sendUpdate();
    }, this);
    this._timer = timer;
}

parsegraph_CameraProtocol.prototype.sendUpdate = function()
{
    if(this._waiting) {
        return;
    }
    if(this._lastSentVersion != this._camera.changeVersion()) {
        this._waiting = true;
        this._lastSentVersion = this._camera.changeVersion();
        parsegraph_sendCameraUpdate(this._envGuid, this._camera, function(res, resp) {
            if(res === true) {
                // Update received.
                this._waiting = false;
            }
            else if(res === false) {
                // Bad request.
                this._waiting = false;
            }
            else {
                // Server error.
                console.log("Camera update error: " + res);
            }
        }, this);
    }
};

parsegraph_CameraProtocol.prototype.update = function()
{
    this.scheduleUpdate();
};

parsegraph_CameraProtocol.prototype.scheduleUpdate = function()
{
    this._timer.schedule();
};
