function parsegraph_Application(guid)
{
    this._cameraName = "parsegraph_login_camera";
    this._guid = guid || "";
    if(window.location.protocol == "https:") {
        this._hostname = "https://" + location.host;
    }
    else {
        this._hostname = "http://" + location.host;
    }
    this._world = null;
    this._graph = null;

    this._idleFunc = null;
    this._idleFuncThisArg = null;
    this._renderTimer = null;
    this._mathMode = false;
}

parsegraph_Application.prototype.setMathMode = function(mathMode)
{
    this._mathMode = mathMode;
};

parsegraph_Application.prototype.start = function(container, initFunc, initFuncThisArg) {
    // Always immediately initialize constants for use by application objects.
    parsegraph_initialize(this._mathMode);

    // Create and globalize the graph.
    this._surface = new parsegraph_Surface();
    this._graph = new parsegraph_Graph(this._surface);
    GRAPH = this._graph;
    this._container = container;
    this._glyphAtlas = null;

    // Start initializing by loading Unicode for text.
    var uni = new parsegraph_Unicode();
    this._unicode = uni;
    this._initFunc = initFunc;
    this._initFuncThisArg = initFuncThisArg || this;

    var that = this;
    uni.onLoad = function() {
        console.log("Time till unicode loaded: " + parsegraph_elapsed(parsegraph_START_TIME));
        that.onUnicodeLoaded.call(that);
    };
    // Export the Unicode instance.
    parsegraph_UNICODE_INSTANCE = uni;
    uni.load(null, localStorage);
};

parsegraph_Application.prototype.onLogout = function() {
    //console.log("onLogout");
    if(this._world) {
        this._world.close();
        this._loginNode.disconnectNode(parsegraph_DOWNWARD);
        this._world = null;
    }
    this._userLogin = null;
    this._sessionNode = null;
    this._loginNode = null;

};

parsegraph_Application.prototype.onLogin = function(userLogin, loginNode) {
    var graph = this.graph();
    this._userLogin = userLogin;
    this._loginNode = loginNode;

    if(!this._initFunc) {
        return;
    }
    if(typeof this._initFunc != "function") {
        this._world = null;
        var worldNode = this._initFunc;
        while(typeof worldNode.node === "function") {
            worldNode = worldNode.node();
        }
        if(worldNode.isRoot()) {
            loginNode.connectNode(parsegraph_DOWNWARD, worldNode);
        }
    }
    else {
        this._world = this._initFunc.call(this._initFuncThisArg, this, userLogin, loginNode)
        if(loginNode.hasNode(parsegraph_DOWNWARD)) {
            // Creator attached node.
            return;
        }
        var worldNode = this._world;
        while(typeof worldNode.node === "function") {
            worldNode = worldNode.node();
        }
        if(worldNode.isRoot()) {
            loginNode.connectNode(parsegraph_DOWNWARD, worldNode);
        }
    }
};

parsegraph_Application.prototype.username = function() {
    if(!this._userLogin) {
        return null;
    }
    return this._userLogin.username;
};

parsegraph_Application.prototype.onUnicodeLoaded = function() {
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
    this._loginWidget.setTitle(this._guid);
    graph.world().plot(this._loginWidget.root());
    this._loginWidget.setLoginListener(function(res, userLogin, node) {
        console.log("Time till authenticated: " + parsegraph_elapsed(parsegraph_START_TIME));
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
    else {
        graph.camera().restore({
            cameraX:this.surface().container().clientWidth/2,
            cameraY:this.surface().container().clientHeight/2,
            scale:1,
            width:this.surface().container().clientWidth,
            height:this.surface().container().clientHeight
        });
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

    this._loginWidget.authenticate();
};

parsegraph_Application.prototype.onRender = function() {
    var graph = this.graph();
    var surface = this.surface();

    var startTime = new Date();
    var inputChangedScene = graph.input().Update(startTime);
    var t = alpha_GetTime();
    start = t;


    var interval = 50;
    inputChangedScene = graph.needsRepaint() || inputChangedScene;
    inputChangedScene = inputChangedScene || this._renderedMouse !== graph.input().mouseVersion();
    if(graph.needsRepaint()) {
        //console.log("Repainting");
        surface.paint(interval);
    }
    if(graph.input().UpdateRepeatedly() || inputChangedScene) {
        //console.log("Rendering");
        surface.render();
        this._renderedMouse = graph.input().mouseVersion();
    }
    else {
        //console.log("Avoid rerender");
    }
    if(this._idleFunc && parsegraph_elapsed(startTime) < interval/2) {
        var r = this._idleFunc.call(this._idleFuncThisArg, interval - parsegraph_elapsed(startTime));
        if(r !== true) {
            this.onIdle(null, null);
        }
    }
    if(graph.input().UpdateRepeatedly() || graph.needsRepaint() || this._idleFunc) {
        if(this._cameraProtocol && graph.input().UpdateRepeatedly()) {
            this._cameraProtocol.update();
        }
        this._renderTimer.schedule();
    }
    //console.log("Done rendering in " + parsegraph_elapsed(startTime) + "ms");
};

parsegraph_Application.prototype.hostname = function()
{
    return this._hostname;
};

parsegraph_Application.prototype.onIdle = function(idleFunc, idleFuncThisArg)
{
    this._idleFunc = idleFunc;
    this._idleFuncThisArg = idleFuncThisArg;
};

parsegraph_Application.prototype.graph = function() {
    return this._graph;
};

parsegraph_Application.prototype.unicode = function() {
    return this._unicode;
};

parsegraph_Application.prototype.surface = function() {
    return this._surface;
};

parsegraph_Application.prototype.glyphAtlas = function() {
    return this._glyphAtlas;
};

parsegraph_Application.prototype.scheduleRepaint = function() {
    this._graph.scheduleRepaint();
};

parsegraph_Application.prototype.scheduleRender = function() {
    if(this._renderTimer) {
        this._renderTimer.schedule();
    }
};

parsegraph_Application.prototype.cameraName = function() {
    return this._cameraName;
};

parsegraph_Application.prototype.setCameraName = function(name) {
    this._cameraName = name;
};

parsegraph_Application.prototype.container = function() {
    return this._container;
};

parsegraph_Application.prototype.guid = function() {
    return this._guid;
};
