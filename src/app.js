function parsegraph_Application(window)
{
    this._window = window;
    if(!this._window) {
        throw new Error("A Window must be provided to this Application");
    }
    this._world = new parsegraph_World();
    this._viewport = new parsegraph_Viewport(this._window, this._world);
    this._viewport.setLayout(new parsegraph_PercentAnchorLayout(parsegraph_LEFT));
    this._window.addWidget(this._viewport);
    this._viewport2 = new parsegraph_Viewport(this._window, this._world);
    this._viewport2.setLayout(new parsegraph_PercentAnchorLayout(parsegraph_RIGHT));
    this._window.addWidget(this._viewport2);
    this._viewports = [
        this._viewport, this._viewport2
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

parsegraph_Application.prototype.start = function(initFunc, initFuncThisArg) {

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
        for(var i in this._viewports) {
            var viewport = this._viewports[i];
            viewport.camera().restore(defaultCam);
        }
    }

    // Schedule the repaint.
    var start = alpha_GetTime();
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
    }

    this.scheduleRepaint();
};

parsegraph_Application.prototype.hostname = function()
{
    return this._hostname;
};

parsegraph_Application.prototype.unicode = function() {
    return this._unicode;
};

parsegraph_Application.prototype.font = function() {
    return this._font;
};

parsegraph_Application.prototype.cameraName = function() {
    return this._cameraName;
};

parsegraph_Application.prototype.setCameraName = function(name) {
    this._cameraName = name;
};
