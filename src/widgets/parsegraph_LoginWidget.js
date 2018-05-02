function parsegraph_authenticate(listener, listenerThisArg)
{
    if(!listener) {
        throw new Error("Refusing to fire without a non-null listener");
    }

    var xhr = new XMLHttpRequest();
    if(!listenerThisArg) {
        listenerThisArg = xhr;
    }
    xhr.open("POST", "/authenticate/", true);
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

function parsegraph_beginUserLogin(username, password, remember, listener, listenerThisArg)
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
    loginRequest.send("username=" + username + "&password=" + password + "&remember=" + (!!remember ? "1": "0"));

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
    xhr.open("POST", "/logout");
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
                node.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
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
    //if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
        parsegraph_authenticate(this.onAuthenticate, this);
    //}
}

// Log out.
parsegraph_LoginWidget.prototype.logout = function()
{
    parsegraph_endUserLogin(this.onLogout, this);
}

parsegraph_LoginWidget.prototype.onLogout = function(res, result)
{
    if(res === true) {
        if(this._logoutListener) {
            this._logoutListener.call(this._logoutListenerThisArg, true, result, this._containerNode);
        }
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);

        //localStorage.removeItem("parsegraph_LoginWidget_remember");
        this._containerNode.disconnectNode(parsegraph_INWARD);
        this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
        this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        this._graph.scheduleRepaint();
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
    parsegraph_beginUserLogin(username, password, this.isRemembering(), this.onLogin, this);
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
    console.log(new Error("onLogin"), res, userLogin);
    var resNode;
    if(res === true) {
        this._loginForm = null;

        this._containerNode.disconnectNode(parsegraph_INWARD);
        resNode = this.loggedInForm();
        resNode.setLabel(userLogin.username, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_INWARD, resNode);
        this._graph.input().setFocusedNode(null);
        this._graph.scheduleRepaint();

        /*if(localStorage.getItem("parsegraph_LoginWidget_remember") !== null) {
            localStorage.setItem("parsegraph_LoginWidget_remember", userLogin.username);
        }*/

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

    car.root().setClickListener(function() {
        var node = car.root();
        var carousel = this.graph().carousel();
        carousel.clearCarousel();
        carousel.moveCarousel(
            node.absoluteX(),
            node.absoluteY()
        );
        carousel.showCarousel();

        // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
        var actionNode = new parsegraph_Node(parsegraph_BLOCK);
        actionNode.setLabel("Leave", this.glyphAtlas());
        carousel.addToCarousel(actionNode, this.leave, this);
        actionNode = new parsegraph_Node(parsegraph_BLOCK);
        actionNode.setLabel("Log out", this.glyphAtlas());
        carousel.addToCarousel(actionNode, this.logout, this);
        this.graph().carousel().scheduleCarouselRepaint();
    }, this);

    this._loggedInForm = car.root();

    return this._loggedInForm;
}

parsegraph_LoginWidget.prototype.leave = function()
{
    window.location = "/";
};

parsegraph_LoginWidget.prototype.graph = function()
{
    return this._graph;
};

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

        /*if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            localStorage.setItem("parsegraph_LoginWidget_remember", userLogin.username);
        }*/
        if(this._loginListener) {
            return this._loginListener.call(this._loginListenerThisArg, res, userLogin, this._containerNode);
        }
    }
    else if(res === false) {
        //localStorage.removeItem("parsegraph_LoginWidget_remember");
        this._containerNode.disconnectNode(parsegraph_DOWNWARD);
        resNode = new parsegraph_Node(parsegraph_BLOCK);
        resNode.setLabel(userLogin.result, this._graph.glyphAtlas());
        this._containerNode.connectNode(parsegraph_DOWNWARD, resNode);
        this._graph.scheduleRepaint();
    }
    else {
        //localStorage.removeItem("parsegraph_LoginWidget_remember");
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

parsegraph_LoginWidget.prototype.setTitle = function(title)
{
    this._title = title;
};

parsegraph_LoginWidget.prototype.title = function()
{
    return this._title;
};

parsegraph_LoginWidget.prototype.root = function()
{
    if(!this._root) {

        var car = new parsegraph_Caret(parsegraph_SLOT);
        car.setGlyphAtlas(this.glyphAtlas());
        car.label(this.title());
        this._containerNode = car.root();
        this._containerNode.setIgnoreMouse(true);
        //if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            this._containerNode.connectNode(parsegraph_INWARD, this.authenticateForm());
            this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        //}
        //else {
            //this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
            //this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        //}
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
    car.setGlyphAtlas(this.glyphAtlas());
    var remembered = "1"; // localStorage.getItem("parsegraph_LoginWidget_remember");
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
    car.node().setClickListener(function() {
        this.graph().input().setFocusedNode(this._usernameField);
        return true;
    }, this);
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
    car.node().setClickListener(this.toggleRemember, this);
    car.pop();

    car.spawnMove(parsegraph_DOWNWARD, parsegraph_BUD);
    this._leaveButton = car.spawnMove(parsegraph_BACKWARD, parsegraph_BLOCK);
    car.node().setBlockStyle(this._bbs);
    car.label('Leave');
    car.node().setClickListener(this.leave, this);
    car.node().setKeyListener(this.leave, this);
    car.move('f');

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

parsegraph_LoginWidget.prototype.isRemembering = function()
{
    return this._rememberCheck.blockStyle() === this._scbs;
};

parsegraph_LoginWidget.prototype.toggleRemember = function()
{
    this._rememberCheck.setBlockStyle(this.isRemembering() ? this._cbs : this._scbs);
    if(this.isRemembering()) {
        //localStorage.setItem("parsegraph_LoginWidget_remember", "1");
    }
    else {
        //localStorage.removeItem("parsegraph_LoginWidget_remember");
    }
    this._graph.scheduleRepaint();
    return false;
};
