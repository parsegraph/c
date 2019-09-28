function parsegraph_Application(window)
{
    this._window = window;
    if(!this._window) {
        throw new Error("A Window must be provided to this Application");
    }
    this._world = new parsegraph_World();
    this._viewport = new parsegraph_Viewport(this._window, this._world);
    //this._viewport.setLayout(new parsegraph_PercentAnchorLayout(parsegraph_TOP));
    this._window.addWidget(this._viewport);
    //this._viewport2 = new parsegraph_Viewport(this._window, this._world);
    //this._viewport2.setLayout(new parsegraph_PercentAnchorLayout(parsegraph_BOTTOM));
    //this._window.addWidget(this._viewport2);
    this._viewports = [
        this._viewport//, this._viewport2
    ];

    this._cameraName = "parsegraph_camera";
    if(top.location.protocol == "https:") {
        this._hostname = "https://" + location.host;
    }
    else {
        this._hostname = "http://" + location.host;
    }
    this._rootNode = null;
    this._titleNode = null;

    this._idleFunc = null;
    this._idleFuncThisArg = null;
    this._renderTimer = null;

    this._governor = null;
    this._burstIdle = null;
    this._interval = null;
    this._forceRender = false;

    this._lastRender = null;
    this._idleTimer = null;

    this._renderedMouse = {};
}

parsegraph_Application.prototype.window = function()
{
    return this._window;
};

parsegraph_Application.prototype.world = function()
{
    return this._world;
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

parsegraph_Application.prototype.start = function(initFunc, initFuncThisArg) {
    // Always immediately initialize constants for use by application objects.
    this._governor = this._governor === null ? parsegraph_GOVERNOR : this._governor;
    this._burstIdle = this._burstIdle === null ? parsegraph_BURST_IDLE : this._burstIdle;
    this._interval = this._interval === null ? parsegraph_INTERVAL : this._interval;

    // Create and globalize the graph.
    this._font = null;

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
    var uni = this.unicode();
    if(!uni) {
        throw new Error("A Unicode object must have already been constructed.");
    }

    // Create and set the font if necessary.
    if(!this._font) {
        this._font = parsegraph_defaultFont();
    }

    this._titleNode = new parsegraph_Node(parsegraph_BLOCK);
    var rootStyle = new parsegraph_copyStyle(parsegraph_BLOCK);
    rootStyle.backgroundColor = new parsegraph_Color(1, 1, 1, 1);
    rootStyle.borderColor = new parsegraph_Color(.7, .7, .7, 1);
    this._titleNode.setBlockStyle(rootStyle);
    this._titleNode.setLabel("Rainback", this._font);
    this._world.plot(this._titleNode);

    var cameraName = this.cameraName();
    if(typeof cameraName === "string" && localStorage.getItem(cameraName) != null) {
        try {
            var camData = JSON.parse(localStorage.getItem(cameraName));
            for(var i in camData) {
                if(!this._viewports[i]) {
                    break;
                }
                this._viewports[i].camera().restore(camData[i]);
            }
        } catch(e) {
            console.log(
                "Failed to parse saved camera state.\n" + parsegraph_writeError(e)
            );
        }
    }
    else {
        var defaultCam = {
            cameraX:this.window().width()/2,
            cameraY:this.window().height()/2,
            scale:1,
            width:this.window().width(),
            height:this.window().height()
        }
        this._viewport.camera().restore(defaultCam);
        this._viewport2.camera().restore(defaultCam);
    }

    // Schedule the repaint.
    this._renderTimer = new parsegraph_AnimationTimer();
    var start = alpha_GetTime();
    this._renderTimer.setListener(function() {
        this.onRender();
    }, this);
    this._viewports.forEach(function(viewport) {
        viewport.input().SetListener(function(affectedPaint, eventSource, inputAffectedCamera) {
            if(affectedPaint) {
                //console.log(new Error("Affected paint"));
                this.scheduleRepaint();
            }
            this.scheduleRender();
            viewport.component().setNeedsRender();
            if(this._cameraProtocol) {
                this._cameraProtocol.update();
            }
            if(inputAffectedCamera) {
                if(typeof cameraName === "string") {
                    var camData = [];
                    for(var i in this._viewports) {
                        camData.push(this._viewports[i].camera().toJSON());
                    }
                    localStorage.setItem(cameraName, JSON.stringify(camData));
                }
            }
        }, this);
        viewport.setOnScheduleRepaint(this.scheduleRender, this);
        viewport.carousel().setOnScheduleRepaint(this.scheduleRender, this);
    }, this);

    if(this._initFunc) {
        if(typeof this._initFunc != "function") {
            this._rootNode = null;
            var worldNode = this._initFunc;
            while(typeof worldNode.node === "function") {
                worldNode = worldNode.node();
            }
            if(worldNode.isRoot()) {
                this._titleNode.connectNode(parsegraph_DOWNWARD, worldNode);
            }
        }
        else {
            this._rootNode = this._initFunc.call(this._initFuncThisArg, this, this._titleNode)
            if(!this._titleNode.hasAnyNodes()) {
                var worldNode = this._rootNode;
                while(typeof worldNode.node === "function") {
                    worldNode = worldNode.node();
                }
                if(worldNode.isRoot()) {
                    //console.log("Connecting " + this._titleNode + " to " + worldNode);
                    this._titleNode.connectNode(parsegraph_DOWNWARD, worldNode);
                }
            }
        }
        this._idleTimer = new parsegraph_IntervalTimer();
        this._idleTimer.setDelay(parsegraph_INTERVAL);
        this._idleTimer.setListener(this.onIdleTimer, this);
        this._idleTimer.schedule();
    }

    this.scheduleRepaint();
};

parsegraph_Application.prototype.onIdleTimer = function() {
    if(this._lastRender && parsegraph_elapsed(this._lastRender) < parsegraph_BACKGROUND_INTERVAL) {
        // The scene has been recently rendered, so there is no need to idle.
        return;
    }
    //console.log("Running app in background");
    this.onRender();
};

parsegraph_Application.prototype.onRender = function() {
    //console.log("onRender");
    var window = this.window();
    if(window.gl().isContextLost()) {
        return;
    }

    var startTime = new Date();
    var inputChangedScene = false;
    for(var i in this._viewports) {
        var viewport = this._viewports[i];
        inputChangedScene = viewport.input().Update(startTime) || inputChangedScene;
        inputChangedScene = this._renderedMouse[viewport.id()] !== viewport.input().mouseVersion() || inputChangedScene;
        inputChangedScene = viewport.input().UpdateRepeatedly() || inputChangedScene;
    }
    var t = alpha_GetTime();
    start = t;

    var interval = this._interval;
    if(inputChangedScene) {
        //console.log("Render and paint");
        window.render();
        window.paint(Math.max(0, interval - parsegraph_elapsed(startTime)));
        for(var i in this._viewports) {
            var viewport = this._viewports[i];
            this._renderedMouse[viewport.id()] = viewport.input().mouseVersion();
        }
    }
    else {
        var needsRepaint = this._world.needsRepaint();
        for(var i in this._viewports) {
            var viewport = this._viewports[i];
            needsRepaint = needsRepaint || viewport.needsRepaint();
        }
        if(needsRepaint) {
            var timeout = interval - 5 - parsegraph_elapsed(startTime);
            //console.log("Paint and render: " + timeout);
            window.paint(Math.max(0, timeout));
            //console.log("Paint and render took " + parsegraph_elapsed(startTime));
        }
        if(needsRepaint || this._forceRender) {
            window.render();
            if(!needsRepaint && this._forceRender) {
                this._forceRender = false;
            }
        }
    }
    interval = interval - parsegraph_IDLE_MARGIN;
    if(interval > 0 && this._idleFunc
        && parsegraph_elapsed(startTime) < interval
        && (!this._governor || !this._lastIdle || parsegraph_elapsed(this._lastIdle) > interval)
    ) {
        //console.log("Idle looping");
        do {
            //console.log("Idling");
            var r = this._idleFunc.call(this._idleFuncThisArg, interval - parsegraph_elapsed(startTime));
            if(r !== true) {
                this.onIdle(null, null);
                this._idleTimer.cancel();
                this._idleTimer = null;
            }
        } while(this._burstIdle && interval - parsegraph_elapsed(startTime) > 0 && this._idleFunc);
        if(this._idleFunc && this._governor) {
            this._lastIdle = new Date();
        }
    }
    else if(this._idleFunc) {
        if(parsegraph_elapsed(startTime) >= interval) {
            //console.log("Idle suppressed because there is no remaining time in the render loop.");
        }
        else if(this._governor && this._lastIdle && parsegraph_elapsed(this._lastIdle) > interval) {
            //console.log("Idle suppressed because the last idle was too recent.");
        }
    }
    var needsRepaint = this._idleFunc;
    for(var i in this._viewports) {
        var viewport = this._viewports[i];
        needsRepaint = needsRepaint || viewport.input().UpdateRepeatedly() || viewport.needsRepaint();
    }
    if(needsRepaint || inputChangedScene) {
        if(inputChangedScene) {
            this._forceRender = true;
        }
        if(this._cameraProtocol && this._viewport.input().UpdateRepeatedly()) {
            this._cameraProtocol.update();
        }
        //console.log("Rescheduling render");
        this._renderTimer.schedule();
    }
    this._lastRender = new Date();
    //console.log("Done rendering in " + parsegraph_elapsed(startTime, this._lastRender) + "ms");
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

parsegraph_Application.prototype.unicode = function() {
    return this._unicode;
};

parsegraph_Application.prototype.surface = function() {
    return this._surface;
};

parsegraph_Application.prototype.font = function() {
    return this._font;
};

parsegraph_Application.prototype.scheduleRepaint = function() {
    for(var i in this._viewports) {
        var viewport = this._viewports[i];
        //console.log("Scheduling viewport render");
        viewport.scheduleRepaint();
    }
};

parsegraph_Application.prototype.scheduleRender = function() {
    //console.log(new Error("Scheduling render"));
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
