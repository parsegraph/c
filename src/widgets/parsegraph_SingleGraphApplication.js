parsegraph_listClasses = {};

parsegraph_SingleGraphApplication.prototype.showModal = function(elem) {
};

function parsegraph_SingleGraphApplication(guid)
{
    this._itemListeners = {};
    this._items = {};
    this._cameraName = "parsegraph_login_camera";
    this._guid = guid || "";
    if(window.location.protocol == "https:") {
        this._hostname = "https://" + location.host;
    }
    else {
        this._hostname = "http://" + location.host;
    }
}

parsegraph_SingleGraphApplication.prototype.guid = function() {
    return this._guid;
};

parsegraph_SingleGraphApplication.prototype.showModal = function(elem) {
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

parsegraph_SingleGraphApplication.prototype.createSessionNode = function(graph, userLogin, node) {
    var car = new parsegraph_Caret('b');
    car.setGlyphAtlas(graph.glyphAtlas());
    car.label("Hello, " + userLogin.username + ".");
    return car.node();
};

parsegraph_SingleGraphApplication.prototype.onLogout = function() {
    //console.log("onLogout");
    //this._sessionNode.disconnectNode();
    this._sessionNode = null;
    this._loginNode = null;

    if(this._environmentProtocol) {
        this._environmentProtocol.close();
        this._environmentProtocol = null;
    }
};

parsegraph_SingleGraphApplication.prototype.onLogin = function(userLogin, node) {
    var graph = this.graph();

    try {
        this._loginNode = node;
        /*var createdNode = this.createSessionNode(graph, userLogin, node);
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
        this._sessionNode = createdNode;*/
    }
    catch(ex) {
        console.log("Crashed during login construction: ", ex);
    }

    if(!this._environmentProtocol && this._guid) {
        this._environmentProtocol = new EventSource(this.hostname() + '/@' + this._guid + "/live");
        var that = this;
        this._environmentProtocol.onmessage = function(e) {
            try {
                var obj = JSON.parse(e.data);
                //console.log("Found message!", obj);
                if(obj.event === "sessionStarted") {
                    that.setLiveSession(obj.guid);
                    if(!that._cameraProtocol) {
                        that._cameraProtocol = new parsegraph_InputProtocol(that._guid, that._sessionId, that.graph().input());
                    }
                }
                else if(obj.event === "initialData") {
                    that.loadEnvironment(obj.root);
                }
                else if(obj.event === "camera_move") {
                    if(userLogin.username === obj.username) {
                        return;
                    }
                    var cb = that._graph.cameraBox();
                    cb.setCamera(obj.username, {
                        "cameraX":obj.x,
                        "cameraY":obj.y,
                        "height":obj.height,
                        "scale":obj.scale,
                        "width":obj.width,
                    });
                }
                else if(obj.event == "mouse_move") {
                    if(userLogin.username === obj.username) {
                        return;
                    }
                    var cb = that._graph.cameraBox();
                    cb.setCameraMouse(obj.username, obj.x, obj.y);
                }
                else if(obj.event == "parsegraph_editItem") {
                    that.onItemEvent(obj.item_id, obj);
                }
                else if(obj.event == "pushListItem") {
                    that.onItemEvent(obj.list_id, obj);
                }
                else if(obj.event == "destroyListItem") {
                    that.onItemEvent(obj.item_id, obj);
                }
                else if(obj.event == "prepopulate") {
                    window.location.replace(window.location);
                }
                else {
                    //console.log("Unknown event: " + obj.event);
                }
            }
            catch(ex) {
                console.log("Failed to read message. Error: ", ex, "Message:", e.data);
            }
        };
    }
};

parsegraph_SingleGraphApplication.prototype.spawn = function(car, id, type, value, items)
{
    if(arguments.length === 2 && typeof id === "object") {
        items = id.items;
        value = id.value;
        type = id.type;
        id = id.id;
    }
    var klass = parsegraph_listClasses[type];
    if(!klass) {
        console.log("Block type not recognized: " + type);
        return;
    }
    car = car.clone();
    klass.spawn.call(klass, this, car, id, value, items);
    return car.node();
};

parsegraph_SingleGraphApplication.prototype.onItemEvent = function(id, event)
{
    var listeners = this._itemListeners[id];
    if(listeners) {
        //console.log("Listeners for item: " + id);
        for(var i in listeners) {
            var cb = listeners[i];
            cb[0].call(cb[1], event);
        }
        if(event.event === "destroyListItem") {
            delete this._itemListeners[id];
        }
    }
    else {
        //console.log("No listeners for item: " + id);
    }
};

parsegraph_SingleGraphApplication.prototype.listen = function(id, listener, listenerThisArg)
{
    //console.log("Listening for " + id);
    if(!this._itemListeners[id]) {
        this._itemListeners[id] = [];
    }
    this._itemListeners[id].push([listener, listenerThisArg]);
};

parsegraph_SingleGraphApplication.prototype.setLiveSession = function(sessionId)
{
    this._sessionId = sessionId;
};

parsegraph_SingleGraphApplication.prototype.loadEnvironment = function(initialData)
{
    var startTime = new Date();
    var createClickListener = function(node, index) {
        if(!node) {
            throw new Error("No node given");
        }
        return function() {
            //console.log("Creating carousel");
            var carousel = this.graph().carousel();
            carousel.clearCarousel();
            carousel.moveCarousel(
                node.absoluteX(),
                node.absoluteY()
            );
            carousel.showCarousel();

            // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
            var actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Create link", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_createLink(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Clear slot", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_clearSlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Place storage item", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_placeStorageItemInMultislot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Simplify", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_simplifySlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Replace Slot", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_replaceSlot(index);
            }, this);
            actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Release", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_releaseSlot(index);
            }, this);
            this.graph().carousel().scheduleCarouselRepaint();
        };
    };

    var worldList = initialData.items;
    var car = new parsegraph_Caret(this._loginNode);
    car.setGlyphAtlas(this.glyphAtlas());
    //console.log(worldList);

    if(worldList.length === 0) {
        car.disconnect('d');
        car.align('d', 'c');
        var node = car.spawnMove('d', 'bu');
        car.onClick(function() {
            //console.log("Creating carousel");
            var carousel = this.graph().carousel();
            carousel.clearCarousel();
            carousel.moveCarousel(
                node.absoluteX(),
                node.absoluteY()
            );
            carousel.showCarousel();

            // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
            var actionNode = new parsegraph_Node(parsegraph_BLOCK);
            actionNode.setLabel("Prepopulate", this.glyphAtlas());
            carousel.addToCarousel(actionNode, function() {
                parsegraph_prepopulate(this._guid, this._sessionId, function(success, resp) {
                    //console.log(success, resp);
                }, this);
            }, this);
            this.graph().carousel().scheduleCarouselRepaint();
        }, this);
        car.move('u');
        car.pull('d');
    }

    for(var worldIndex = 0; worldIndex < worldList.length; ++worldIndex) {
        if(worldIndex > 0) {
            car.spawnMove('f', 'b');
        }
        else {
            car.disconnect('d');
            car.align('d', 'c');
            car.spawnMove('d', 'b');
        }
        car.push();
        parsegraph_FIT_LOOSE && car.fitLoose();
        var child = worldList[worldIndex];
        this.spawn(car, child.id, child.type, child.value, child.items);
        car.pop();
        parsegraph_CREASE && car.crease();
    }

    //console.log("Graph reconstructed in " + parsegraph_elapsed(startTime) + "ms");
    this.scheduleRepaint();
    this.scheduleRender();
};

parsegraph_SingleGraphApplication.prototype.onRender = function() {
    var graph = this.graph();
    var surface = this.surface();

    var startTime = new Date();
    graph.input().Update(startTime);
    var t = alpha_GetTime();
    start = t;
    if(graph.needsRepaint()) {
        //console.log("Repainting");
        surface.paint(50);
    }
    //console.log("Rendering");
    surface.render();
    if(graph.input().UpdateRepeatedly() || graph.needsRepaint()) {
        if(this._cameraProtocol && graph.input().UpdateRepeatedly()) {
            this._cameraProtocol.update();
        }
        this._renderTimer.schedule();
    }
    //console.log("Done rendering in " + parsegraph_elapsed(startTime) + "ms");
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
    this._loginWidget.setTitle(this._guid);
    graph.world().plot(this._loginWidget.root());

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
};

parsegraph_SingleGraphApplication.prototype.hostname = function()
{
    return this._hostname;
};

/**
 * Creates a new parsegraph_Surface.
 */
parsegraph_SingleGraphApplication.prototype.createSurface = function() {
    return new parsegraph_Surface();
};

parsegraph_SingleGraphApplication.prototype.sessionNode = function() {
    return this._sessionNode;
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

parsegraph_SingleGraphApplication.prototype.cameraName = function() {
    return this._cameraName;
};

parsegraph_SingleGraphApplication.prototype.setCameraName = function(name) {
    this._cameraName = name;
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
