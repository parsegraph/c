function parsegraph_getUserProfile(username, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("GET", "/user");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    if(username) {
        xhr.send("username=" + username);
    }
    else {
        xhr.send();
    }

    xhr.addEventListener("load", function() {
        try {
            var response = JSON.parse(xhr.responseText);
            var profileText = response.profile.replace(/[+]/g, "%20");
            console.log("pt1", profileText);
            profileText = decodeURIComponent(profileText);
            console.log("pt2", response, profileText);
            listener.call(listenerThisArg, response.status === 0, profileText);
        }
        catch(ex) {
            console.log(ex);
            listener.call(listenerThisArg, ex);
        }
    });

    return xhr;
}

function parsegraph_setUserProfile(username, profile, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("PUT", "/user");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    var profileText = encodeURIComponent(profile);
    profileText = profileText.replace(/%20/, '+');
    xhr.send("profile=" + profileText);

    xhr.addEventListener("load", function() {
        try {
            var response = JSON.parse(xhr.responseText);
            listener.call(listenerThisArg, response.status === 0, response);
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    });

    return xhr;
}

function parsegraph_ProfileWidget(graph)
{
    this._graph = graph;

    this._listener = null;
    this._listenerThisArg = null;

    this._saveTimer = new parsegraph_TimeoutTimer();
    this._saveTimer.setDelay(0);
    this._saveTimer.setListener(this.onSave, this);

    this._containerNode = null;
}

parsegraph_ProfileWidget.prototype.node = function()
{
    if(!this._containerNode) {
        this._containerNode = new parsegraph_Node(parsegraph_SLOT);
    }
    return this._containerNode;
}

parsegraph_ProfileWidget.prototype.load = function(username)
{
    return parsegraph_getUserProfile(username, this.onLoad, this);
}

parsegraph_ProfileWidget.prototype.save = function()
{
    this._saveTimer.schedule();
}

parsegraph_ProfileWidget.prototype.onSave = function()
{
    if(this._saving) {
        return;
    }
    var profile = this._innerNode._label.text();
    this._saving = parsegraph_setUserProfile(null, profile, this.onSaved, this);
}

parsegraph_ProfileWidget.prototype.onSaved = function(res, response)
{
    this._saving = null;
}

parsegraph_ProfileWidget.prototype.setLoadListener = function(listener, listenerThisArg)
{
    if(!listenerThisArg) {
        listenerThisArg = this;
    }
    this._listener = listener;
    this._listenerThisArg = listenerThisArg;
}

parsegraph_ProfileWidget.prototype.onLoad = function(success, response)
{
    if(!success) {
        return;
    }

    var parentNode = this.node();

    console.log(response);
    var inner = parentNode.spawnNode(parsegraph_INWARD, parsegraph_BLOCK);
    inner.setLabel(response, this._graph.glyphAtlas());
    inner.setKeyListener(function() {
        this.save();
        return false;
    }, this);

    this._innerNode = inner;

    if(this._listener) {
        return this._listener.call(this._listenerThisArg, success, response, inner);
    }
}
