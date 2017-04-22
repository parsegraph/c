function parsegraph_authenticate(sessionValue, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("POST", "/user?command=parsegraph_authenticate");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.addEventListener("load", function() {
        try {
            var loginResponse = JSON.parse(xhr.responseText);
            if(loginResponse.session_selector) {
                // Succeeded.
                listener.call(listenerThisArg, true, loginResponse);
            }
            else {
                listener.call(listenerThisArg, false, loginResponse);
            }
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    });

    return xhr;
}

function parsegraph_beginUserLogin(username, password, listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var loginRequest = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = loginRequest;
    }
    loginRequest.open("POST", "/user?command=parsegraph_beginUserLogin");
    loginRequest.setRequestHeader("Accept", "application/json");
    loginRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    loginRequest.send("username=" + username + "&password=" + password);

    loginRequest.addEventListener("load", function() {
        try {
            var loginResponse = JSON.parse(loginRequest.responseText);
            listener.call(listenerThisArg, loginRequest.status === 200, loginResponse);
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    });

    return loginRequest;
}

function parsegraph_createNewUser(username, password, listener, listenerThisArg)
{
    var loginRequest = new XMLHttpRequest();
    loginRequest.open("POST", "/user?command=parsegraph_createNewUser");
    loginRequest.setRequestHeader("Accept", "application/json");
    loginRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    loginRequest.send("username=" + username + "&password=" + password);

    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }
    if(!listenerThisArg) {
        listenerThisArg = loginRequest;
    }

    loginRequest.addEventListener("load", function() {
        try {
            var loginResponse = JSON.parse(loginRequest.responseText);
            if(loginResponse.session_selector) {
                // Succeeded.
                listener.call(listenerThisArg, true, loginResponse);
            }
            else {
                listener.call(listenerThisArg, false, loginResponse);
            }
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    });

    return loginRequest;
}

function parsegraph_passwordNode(listener, listenerThisArg)
{
    var bbs = parsegraph_copyStyle(parsegraph_BLOCK);
    bbs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    bbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
    bbs.minWidth = parsegraph_BUD_RADIUS * 80;
    var node = new parsegraph_Node(parsegraph_BLOCK);
    node.setBlockStyle(bbs);

    var nbs = parsegraph_copyStyle(parsegraph_BUD);

    if(!listenerThisArg) {
        listenerThisArg = this;
    }

    var pos = 0;
    var pw = "";

    var inner = new parsegraph_Node(parsegraph_BLOCK);
    inner.setBlockStyle(nbs);
    var last = inner;

    node.setKeyListener(function(key) {
        if(listener && listener.call(listenerThisArg, key)) {
            return true;
        }
        switch(key) {
        case "Escape":
        case "Shift":
        case "Control":
        case "Tab":
        case "ArrowUp":
        case "ArrowDown":
            break;
        case "ArrowLeft":
            pos = Math.max(pos - 1, 0);
            break;
        case "ArrowRight":
            pos = Math.min(pos + 1, pw.length - 1);
            break;
        case "Backspace":
            pw = pw.slice(0, pos - 1) + pw.slice(pos);
            pos = Math.max(pos - 1, 0);
           if(last === inner) {
                node.disconnectNode(parsegraph_INWARD);
            }
            else {
                var newLast = last.nodeAt(parsegraph_BACKWARD);
                newLast.disconnectNode(parsegraph_FORWARD);
                last = newLast;
            }
            break;
        case "Delete":
            pw = pw.slice(0, pos) + pw.slice(pos + 1);
            if(last === inner) {
                node.disconnectNode(parsegraph_INWARD);
            }
            else {
                var newLast = last.nodeAt(parsegraph_BACKWARD);
                newLast.disconnectNode(parsegraph_FORWARD);
                last = newLast;
            }
            break;
        default:
            pw = pw.slice(0, pos) + key + pw.slice(pos);
            pos += key.length;
            if(last === inner && inner.isRoot()) {
                node.connectNode(parsegraph_INWARD, inner);
            }
            else {
                last = last.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
                last.setBlockStyle(nbs);
            }
            break;
        }

        node.setValue(pw);
    }, this);

    return node;
}

function parsegraph_LoginWidget(surface, graph)
{
    this._graph = graph;

    this._listener = null;
    this._listenerThisArg = null;

    this._loginForm = null;
    this._usernameField = null;
    this._passwordField = null;
}

// Log in.
parsegraph_LoginWidget.prototype.authenticate = function(sessionString)
{
    parsegraph_authenticate(this.onAuthenticate, this);
}

// Log in.
parsegraph_LoginWidget.prototype.login = function()
{
    var username = this._usernameField._label.getText();
    var password = this._passwordField.value();
    parsegraph_beginUserLogin(username, password, this.onLogin, this);
}

// Create new user.
parsegraph_LoginWidget.prototype.createNewUser = function()
{
    var loginRequest = new XMLHttpRequest();
    var username = this._usernameField._label.getText();
    var password = this._passwordField.value();
    parsegraph_createNewUser(username, password, this.onLogin, this);
}

parsegraph_LoginWidget.prototype.setLoginListener = function(listener, listenerThisArg)
{
    if(!listenerThisArg) {
        listenerThisArg = this;
    }
    this._listener = listener;
    this._listenerThisArg = listenerThisArg;
};

parsegraph_LoginWidget.prototype.onLogin = function(res, userLogin)
{
    var resNode;
    if(res === true) {
        this._containerNode.disconnectNode(parsegraph_INWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_INWARD, resNode);
        this._graph.scheduleRepaint();

        if(this._listener) {
            return this._listener.call(this._listenerThisArg, res, userLogin, this._containerNode);
        }
    }
    else if(res === false) {
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
    else {
        // Exception.
        console.log(res);
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel("An exception occurred during processing and was logged.", this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
};

parsegraph_LoginWidget.prototype.onAuthenticate = function(res, userLogin)
{
    var resNode;
    if(res === true) {
        this._containerNode.disconnectNode(parsegraph_INWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_INWARD, resNode);
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        this._graph.scheduleRepaint();

        if(this._listener) {
            return this._listener.call(this._listenerThisArg, res, userLogin, resNode);
        }
    }
    else if(res === false) {
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
    else {
        // Exception.
        console.log(res);
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel("An exception occurred during processing and was logged.", this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
};

parsegraph_LoginWidget.prototype.glyphAtlas = function()
{
    return this._graph.glyphAtlas();
};

parsegraph_LoginWidget.prototype.root = function()
{
    if(!this._root) {
        var nbs = parsegraph_copyStyle(parsegraph_BLOCK);
        nbs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
        nbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
        nbs.minWidth = parsegraph_BUD_RADIUS * 80;

        var bbs = parsegraph_copyStyle(parsegraph_BLOCK);
        bbs.backgroundColor = new parsegraph_Color(1, 1, .5, 1);
        bbs.borderColor = new parsegraph_Color(.5, .5, 0, 1);

        var car = new parsegraph_Caret(parsegraph_SLOT);
        car.label('Parsegraph.com');
        this._loginForm = car.spawnMove(parsegraph_INWARD, parsegraph_BUD, parsegraph_ALIGN_VERTICAL);
        car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
        car.label('Username');
        car.move(parsegraph_FORWARD);
        car.pull('b');
        this._usernameField  = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        var tf = car.node();
        tf.setClickListener = function() {
            var l = tf.label();
            alert(l);
        };
        car.node().setBlockStyle(nbs);
        car.label("");
        car.node()._label.setEditable(true);
        car.move(parsegraph_BACKWARD);

        car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
        car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
        car.label('Password');
        car.move(parsegraph_FORWARD);
        var graph = this._graph;
        this._passwordField = car.connect(parsegraph_FORWARD, parsegraph_passwordNode(
            function(key) {
                if(key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
                    return false;
                }
                graph.scheduleRepaint();
                if(key === "Enter") {
                    this.login();
                    return true;
                }
            }, this
        ));
        parsegraph_chainTab(this._usernameField, this._passwordField);

        car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
        car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        car.node().setBlockStyle(bbs);
        car.label('Log in');
        car.node().setClickListener(this.login, this);

        car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
        car.node().setBlockStyle(bbs);
        car.label('Create user');
        car.node().setClickListener(this.createNewUser, this);

        this._containerNode = car.root();
        this._root = car.root();
    }
    return this._root;
};
