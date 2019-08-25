function parsegraph_Application()
{
    this._cameraName = "parsegraph_camera";
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

    this._governor = null;
    this._burstIdle = null;
    this._interval = null;
}

parsegraph_Application.prototype.setMathMode = function(mathMode)
{
    this._mathMode = mathMode;
};

parsegraph_Application.prototype.setGovernor = function(governor)
{
    this._governor = governor;
};

parsegraph_Application.prototype.setBurstIdle = function(burstIdle)
{
    this._burstIdle = burstIdle;
};

parsegraph_Application.prototype.setInterval = function(interval)
{
    this._interval = interval;
};

parsegraph_Application.prototype.start = function(container, initFunc, initFuncThisArg) {
    // Always immediately initialize constants for use by application objects.
    parsegraph_initialize(this._mathMode);
    this._governor = this._governor === null ? parsegraph_GOVERNOR : this._governor;
    this._burstIdle = this._burstIdle === null ? parsegraph_BURST_IDLE : this._burstIdle;
    this._interval = this._interval === null ? parsegraph_INTERVAL : this._interval;

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
        //console.log("Time till unicode loaded: " + parsegraph_elapsed(parsegraph_START_TIME));
        that.onUnicodeLoaded.call(that);
    };
    // Export the Unicode instance.
    parsegraph_UNICODE_INSTANCE = uni;
    uni.load(null, localStorage);
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

    this._root = new parsegraph_Node(parsegraph_BLOCK);
    var rootStyle = new parsegraph_copyStyle(parsegraph_BLOCK);
    rootStyle.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    rootStyle.borderColor = new parsegraph_Color(.7, .7, .7, 1);
    this._root.setBlockStyle(rootStyle);
    this._root.setLabel("Rainback", this._glyphAtlas);
    graph.world().plot(this._root);

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
            console.log(new Error("Affected paint"));
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
    this._graph.setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);
    this._graph.carousel().setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);

    if(this._initFunc) {
        if(typeof this._initFunc != "function") {
            this._world = null;
            var worldNode = this._initFunc;
            while(typeof worldNode.node === "function") {
                worldNode = worldNode.node();
            }
            if(worldNode.isRoot()) {
                this._root.connectNode(parsegraph_DOWNWARD, worldNode);
            }
        }
        else {
            this._world = this._initFunc.call(this._initFuncThisArg, this, this._root)
            if(!this._root.hasAnyNodes()) {
                var worldNode = this._world;
                while(typeof worldNode.node === "function") {
                    worldNode = worldNode.node();
                }
                if(worldNode.isRoot()) {
                    //console.log("Connecting " + this._root + " to " + worldNode);
                    this._root.connectNode(parsegraph_DOWNWARD, worldNode);
                }
            }
        }
    }

    this.scheduleRepaint();
};

parsegraph_Application.prototype.onRender = function() {
    var graph = this.graph();
    var surface = this.surface();
    if(surface.gl().isContextLost()) {
        return;
    }

    var startTime = new Date();
    var inputChangedScene = graph.input().Update(startTime);
    var t = alpha_GetTime();
    start = t;

    var interval = this._interval;
    if(inputChangedScene) {
        //console.log("Input changed scene");
    }
    if(!inputChangedScene) {
        inputChangedScene = graph.needsRepaint();
        if(inputChangedScene) {
            if(graph.world().needsRepaint()) {
                //console.log("World needs repaint");
            }
            else {
                //console.log("Graph needs repaint");
            }
        }
    }
    if(!inputChangedScene) {
        inputChangedScene = this._renderedMouse !== graph.input().mouseVersion();
        if(inputChangedScene) {
            //console.log("Mouse changed scene: " + this._renderedMouse + " vs " + graph.input().mouseVersion());
        }
    }
    if(!inputChangedScene) {
        if(graph.input().UpdateRepeatedly()) {
            //console.log("Input updating repeatedly");
        }
    }
    if(graph.needsRepaint()) {
        surface.paint(interval);
    }
    if(graph.input().UpdateRepeatedly() || inputChangedScene) {
        //console.log("Rendering surface");
        surface.render();
        this._renderedMouse = graph.input().mouseVersion();
    }
    else {
        //console.log("Avoid rerender");
    }
    interval = interval - parsegraph_IDLE_MARGIN;
    if(this._idleFunc
        && parsegraph_elapsed(startTime) < interval
        && (!this._governor || !this._lastIdle || parsegraph_elapsed(this._lastIdle) > interval)
    ) {
        //console.log("Idle looping");
        do {
            //console.log("Idling");
            var r = this._idleFunc.call(this._idleFuncThisArg, interval - parsegraph_elapsed(startTime));
            if(r !== true) {
                this.onIdle(null, null);
            }
        } while(this._burstIdle && interval - parsegraph_elapsed(startTime) > 0 && this._idleFunc);
        if(this._idleFunc && this._governor) {
            this._lastIdle = new Date();
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
