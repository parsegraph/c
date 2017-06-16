function parsegraph_authenticate(listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("POST", "/user?command=parsegraph_authenticate", true);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }
        try {
            var loginResponse = JSON.parse(xhr.responseText);
            listener.call(listenerThisArg, xhr.status === 200, loginResponse);
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    };
    xhr.send();

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

function parsegraph_endUserLogin(listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("POST", "/user?command=parsegraph_endUserLogin");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send();

    xhr.addEventListener("load", function() {
        try {
            if(xhr.status === 200) {
                var loginResponse = JSON.parse(xhr.responseText);
                listener.call(listenerThisArg, true, loginResponse);
            }
            else {
                listener.call(listenerThisArg, false, xhr.responseText);
            }
        }
        catch(ex) {
            listener.call(listenerThisArg, ex);
        }
    });

    return xhr;
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

    this._loginListener = null;
    this._loginListenerThisArg = null;
    this._logoutListener = null;
    this._logoutListenerThisArg = null;

    this._loginForm = null;
    this._usernameField = null;
    this._passwordField = null;

    this._bbs = parsegraph_copyStyle(parsegraph_BLOCK);
    this._bbs.backgroundColor = new parsegraph_Color(1, 1, .5, 1);
    this._bbs.borderColor = new parsegraph_Color(.5, .5, 0, 1);

    this._nbs = parsegraph_copyStyle(parsegraph_BLOCK);
    this._nbs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    this._nbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
    this._nbs.minWidth = parsegraph_BUD_RADIUS * 80;

    this._cbs = parsegraph_copyStyle(parsegraph_BUD);
    this._cbs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    this._cbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
    this._cbs.selectedBackgroundColor = this._cbs.backgroundColor;
    this._cbs.selectedBorderColor = this._cbs.borderColor;

    this._scbs = parsegraph_copyStyle(parsegraph_BUD);
    this._scbs.backgroundColor = new parsegraph_Color(.3, 1, .3, 1);
    this._scbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
    this._scbs.selectedBackgroundColor = this._scbs.backgroundColor;
    this._scbs.selectedBorderColor = this._scbs.borderColor;
}

// Authenticate an existing session (does not expose the session to JS)
parsegraph_LoginWidget.prototype.authenticate = function()
{
    if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
        parsegraph_authenticate(this.onAuthenticate, this);
    }
}

// Log out.
parsegraph_LoginWidget.prototype.logout = function()
{
    parsegraph_endUserLogin(this.onLogout, this);
}

parsegraph_LoginWidget.prototype.onLogout = function(res, result)
{
    if(res === true) {
        localStorage.removeItem("parsegraph_LoginWidget_remember");
        this._containerNode.disconnectNode(parsegraph_INWARD);
        this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
        this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        this._graph.scheduleRepaint();

        if(this._logoutListener) {
            this._logoutListener.call(this._logoutListenerThisArg, true, result, this._containerNode);
        }
    }
    else if(res === false) {
        console.log("Logout failed: " + result);
    }
    else {
        console.log("Exception occurred during logout:", arguments);
    }
};

// Log in.
parsegraph_LoginWidget.prototype.login = function()
{
    //console.log(new Error("Logging in"));
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
    this._loginListener = listener;
    this._loginListenerThisArg = listenerThisArg;
};

parsegraph_LoginWidget.prototype.setLogoutListener = function(listener, listenerThisArg)
{
    if(!listenerThisArg) {
        listenerThisArg = this;
    }
    this._logoutListener = listener;
    this._logoutListenerThisArg = listenerThisArg;
};

parsegraph_LoginWidget.prototype.onLogin = function(res, userLogin)
{
    //console.log(new Error("onLogin"));
    var resNode;
    if(res === true) {
        this._loginForm = null;

        this._containerNode.disconnectNode(parsegraph_INWARD);
        resNode = this.loggedInForm();
        resNode.setLabel(userLogin.username, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_INWARD, resNode);
        this._graph.input().setFocusedNode(null);
        this._graph.scheduleRepaint();

        if(localStorage.getItem("parsegraph_LoginWidget_remember") !== null) {
            localStorage.setItem("parsegraph_LoginWidget_remember", userLogin.username);
        }

        if(this._loginListener) {
            return this._loginListener.call(this._loginListenerThisArg, res, userLogin, this._containerNode);
        }
    }
    else if(res === false) {
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.input().setFocusedNode(null);
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

parsegraph_LoginWidget.prototype.loggedInForm = function()
{
    if(this._loggedInForm) {
        return this._loggedInForm;
    }

    var car = new parsegraph_Caret(parsegraph_BLOCK);
    car.setGlyphAtlas(this._graph.glyphAtlas());

    var logOut = car.spawn(parsegraph_FORWARD, parsegraph_BLOCK);
    logOut.setClickListener(this.logout, this);
    logOut.setKeyListener(this.logout, this);
    logOut.setBlockStyle(this._bbs);
    logOut.setLabel("Log out", this._graph.glyphAtlas());

    this._loggedInForm = car.root();

    return this._loggedInForm;
}

parsegraph_LoginWidget.prototype.onAuthenticate = function(res, userLogin)
{
    var resNode;
    if(res === true) {
        this._containerNode.disconnectNode(parsegraph_INWARD);
        resNode = this.loggedInForm();
        resNode.setLabel(userLogin.username, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_INWARD, resNode);
        this._graph.input().setFocusedNode(null);
        this._graph.scheduleRepaint();

        if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            localStorage.setItem("parsegraph_LoginWidget_remember", userLogin.username);
        }
        if(this._loginListener) {
            return this._loginListener.call(this._loginListenerThisArg, res, userLogin, this._containerNode);
        }
    }
    else if(res === false) {
        localStorage.removeItem("parsegraph_LoginWidget_remember");
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
    else {
        localStorage.removeItem("parsegraph_LoginWidget_remember");
        // Exception.
        //console.log(res);
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

        var car = new parsegraph_Caret(parsegraph_SLOT);
        car.setGlyphAtlas(this.glyphAtlas());
        car.label('Iñtërnâtiônàlizætiøn☃💩 for Parsegraph.com');
        this._containerNode = car.root();
        if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            this._containerNode.connectNode(parsegraph_INWARD, this.authenticateForm());
            this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        }
        else {
            this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
            this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        }
        this._root = car.root();
    }
    return this._root;
};

parsegraph_LoginWidget.prototype.authenticateForm = function()
{
    if(this._authenticateForm) {
        return this._authenticateForm;
    }

    var car = new parsegraph_Caret(parsegraph_BLOCK);
    var remembered = localStorage.getItem("parsegraph_LoginWidget_remember");
    if(remembered !== "1" && remembered !== "0") {
        car.label(remembered);
    }
    else {
        car.label("Authenticate");
    }
    car.node().setKeyListener(this.authenticate, this);
    car.node().setClickListener(this.authenticate, this);
    this._authenticateForm = car.root();

    return this._authenticateForm;
};

parsegraph_LoginWidget.prototype.loginForm = function()
{
    if(this._loginForm) {
        return this._loginForm;
    }

    var nbs = parsegraph_copyStyle(parsegraph_BLOCK);
    nbs.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    nbs.borderColor = new parsegraph_Color(.5, .5, .5, 1);
    nbs.minWidth = parsegraph_BUD_RADIUS * 80;

    var car = new parsegraph_Caret(parsegraph_BUD);
    car.setGlyphAtlas(this.glyphAtlas());

    this._loginForm = car.root();
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

    car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
    car.push();

    this._rememberCheck = car.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    car.node().setBlockStyle(this._cbs);

    car.node().setClickListener(this.toggleRemember, this);
    car.node().setKeyListener(function(key) {
        if(key === "Enter" || key === " ") {
            this.toggleRemember();
        }
    }, this);

    car.pull(parsegraph_FORWARD);
    car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    car.label("Remember log in");
    car.pop();

    car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
    this._loginButton = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    car.node().setBlockStyle(this._bbs);
    car.label('Log in');
    car.node().setClickListener(this.login, this);
    car.node().setKeyListener(this.login, this);


    this._createUserButton = car.spawnMove(parsegraph_FORWARD, parsegraph_BLOCK);
    car.node().setBlockStyle(this._bbs);
    car.label('Create user');
    car.node().setClickListener(this.createNewUser, this);
    car.node().setKeyListener(this.createNewUser, this);

    parsegraph_chainAllTabs(
        this._usernameField, this._passwordField, this._rememberCheck,
        this._loginButton, this._createUserButton
    );

    return this._loginForm;
}

parsegraph_LoginWidget.prototype.toggleRemember = function()
{
    var reminding = this._rememberCheck.blockStyle() === this._scbs;
    this._rememberCheck.setBlockStyle(reminding ? this._cbs : this._scbs);
    reminding = !reminding;
    if(reminding) {
        localStorage.setItem("parsegraph_LoginWidget_remember", "1");
    }
    else {
        localStorage.removeItem("parsegraph_LoginWidget_remember");
    }
    this._graph.scheduleRepaint();
    return false;
};
