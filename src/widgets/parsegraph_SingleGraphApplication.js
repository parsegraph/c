function parsegraph_SingleGraphApplication()
{
}

/**
 * Creates a new parsegraph_Surface.
 */
parsegraph_SingleGraphApplication.prototype.createSurface = function() {
    return new parsegraph_Surface();
};

parsegraph_SingleGraphApplication.prototype.createGraph = function(surface) {
    var graph = new parsegraph_Graph(this._surface);
    GRAPH = graph;
    return graph;
};

parsegraph_SingleGraphApplication.prototype.start = function(container) {
    // Always immediately initialize constants for use by application objects.
    parsegraph_initialize();

    // Create and globalize the graph.
    this._surface = this.createSurface();
    this._graph = this.createGraph();
    this._container = container;
    this._glyphAtlas = null;

    // Start initializing by loading Unicode for text.
    var uni = new parsegraph_Unicode();
    this._unicode = uni;
    var that = this;
    uni.onLoad = function() {
        that.onUnicodeLoaded.call(that);
    };
    uni.load();

    // Export the Unicode instance.
    parsegraph_UNICODE_INSTANCE = uni;
};

parsegraph_SingleGraphApplication.prototype.sessionNode = function() {
    return this._sessionNode;
};

parsegraph_SingleGraphApplication.prototype.createSessionNode = function(graph, userLogin, node) {
    var car = new parsegraph_Caret('b');
    car.setGlyphAtlas(graph.glyphAtlas());
    car.label("Hello, " + userLogin.username + ".");
    return car.node();
};

parsegraph_SingleGraphApplication.prototype.onLogout = function() {
    //console.log("onLogout");
    this._sessionNode.disconnectNode();
    this._sessionNode = null;
};

parsegraph_SingleGraphApplication.prototype.onLogin = function(userLogin, node) {
    var graph = this.graph();

    try {
        var createdNode = this.createSessionNode(graph, userLogin, node);
        if(!createdNode) {
            if(!node.hasNode(parsegraph_DOWNWARD)) {
                throw new Error("Factory function does not return a node, nor did it connect one.");
            }
            else {
                // Check if the created node was already connected.
                createdNode = node.nodeAt(parsegraph_DOWNWARD);
            }
        }
        else {
            node.connectNode(parsegraph_DOWNWARD, createdNode);
        }
        this._sessionNode = createdNode;
    }
    catch(ex) {
        console.log("Crashed during login construction: ", ex);
    }

    if(!this._environmentProtocol) {
        this._environmentProtocol = new parsegraph_EnvironmentProtocol(new WebSocket(
            "ws://localhost:8080/environment/live", "parsegraph-environment-protocol"
        ), graph,
            function(obj) {
                console.log(obj);
                //graph.cameraBox().setCamera(userLogin.username, obj);
            }, this
        );
    }
};

parsegraph_SingleGraphApplication.prototype.graph = function() {
    return this._graph;
};
parsegraph_SingleGraphApplication.prototype.unicode = function() {
    return this._unicode;
};
parsegraph_SingleGraphApplication.prototype.surface = function() {
    return this._surface;
};
parsegraph_SingleGraphApplication.prototype.glyphAtlas = function() {
    return this._glyphAtlas;
};

parsegraph_SingleGraphApplication.prototype.renderTimer = function() {
    return this._renderTimer;
};

parsegraph_SingleGraphApplication.prototype.onRender = function() {
    //console.log("Rendering");
    var graph = this.graph();
    var surface = this.surface();

    graph.input().Update(new Date());
    var t = alpha_GetTime();
    start = t;
    if(graph.needsRepaint()) {
        surface.paint(50);
    }
    surface.render();
    if(graph.input().UpdateRepeatedly() || graph.needsRepaint()) {
        if(this._cameraProtocol && graph.input().UpdateRepeatedly()) {
            this._cameraProtocol.update();
        }
        this._renderTimer.schedule();
    }
    //console.log("Done");
};

parsegraph_SingleGraphApplication.prototype.cameraName = function() {
    return "parsegraph_login_camera";
};

parsegraph_SingleGraphApplication.prototype.container = function() {
    return this._container;
};

parsegraph_SingleGraphApplication.prototype.loginWidget = function() {
    return this._loginWidget;
};

parsegraph_SingleGraphApplication.prototype.scheduleRender = function() {
    if(this._renderTimer) {
        this._renderTimer.schedule();
    }
};

parsegraph_SingleGraphApplication.prototype.scheduleRepaint = function() {
    this._graph.scheduleRepaint();
};

parsegraph_SingleGraphApplication.prototype.onUnicodeLoaded = function() {
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
    this._loginWidget.authenticate();
    graph.world().plot(this._loginWidget.root());

    var cameraProtocol;

    this._loginWidget.setLoginListener(function(res, userLogin, node) {
        //console.log("Logged in")
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
        if(inputAffectedCamera) {
            if(this._cameraProtocol) {
                this._cameraProtocol.update();
            }
            if(typeof cameraName === "string") {
                localStorage.setItem(cameraName, JSON.stringify(this._graph.camera().toJSON()));
            }
        }
    }, this);
    this.scheduleRender();
    this._graph.onScheduleRepaint = function() {
        this.scheduleRender();
    };
    this._graph.onScheduleRepaintThisArg = this;
};
