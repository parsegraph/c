function parsegraph_SingleGraphApplication(guid)
{
    this._cameraName = "parsegraph_login_camera";
    this._guid = guid || null;
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

    if(!this._environmentProtocol && this._guid) {
        this._environmentProtocol = new parsegraph_EnvironmentProtocol(new WebSocket(
            "ws://localhost:8080/environment/live", "parsegraph-environment-protocol"
        ), this._guid, function(name, obj) {
                if(name === "initialData") {
                    this.loadEnvironment(obj);
                }
            }, this
        );
    }
};

parsegraph_SingleGraphApplication.prototype.loadEnvironment = function(initialData)
{
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

    var metaList = initialData.items[0].items;
    var worldList = initialData.items[1].items;
    var car = new parsegraph_Caret(this._loginNode);
    car.setGlyphAtlas(this.glyphAtlas());

    for(var worldIndex = 0; worldIndex < worldList.length; ++worldIndex) {
        if(worldIndex > 0) {
            car.spawnMove('f', 'b');
        }
        else {
            car.disconnect('d');
            car.align('d', 'c');
            car.spawnMove('d', 'b');
        }
        //car.crease();
        var bs = parsegraph_copyStyle('b');
        bs.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
        //car.node().setBlockStyle(bs);
        car.push();
        var child = worldList[worldIndex];
        switch(child.type) {
        case 4: // multislot
            try {
                var childDims = JSON.parse(child.value);
                var subtype = childDims[0];
                var rowSize = childDims[1];
                var columnSize = childDims[2];
                var r = childDims[3];
                var g = childDims[4];
                var b = childDims[5];
            }
            catch(ex) {
                console.log(ex);
                return;
            }

            if(subtype === 0) {
                for(var y = 0; y < columnSize; ++y) {
                    if(y === 0) {
                        car.pull('d');
                        car.align('d', parsegraph_ALIGN_CENTER);
                        car.spawnMove('d', 'u');
                        car.shrink();
                    }
                    else {
                        car.spawnMove('d', 'u');
                    }
                    car.pull('f');
                    var us = parsegraph_copyStyle('u');
                    us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                    car.node().setBlockStyle(us);
                    if(y === 0) {
                        car.shrink();
                    }
                    car.push();
                    for(var x = 0; x < rowSize; ++x) {
                        car.spawnMove('f', 's');
                        var s = parsegraph_copyStyle('s');
                        s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                        car.node().setBlockStyle(s);
                        car.spawnMove('d', 'u');
                        car.onClick(createClickListener.call(this, car.node()), this);
                        car.move('u');
                        car.pull('d');
                    }
                    car.pop();
                }
            }
            else if(subtype === 1) {
                car.align('d', 'c');
                car.pull('d');
                car.spawnMove('d', 'u');

                for(var y = 0; y < columnSize; ++y) {
                    if(y === 0) {
                        //car.align('d', parsegraph_ALIGN_CENTER);
                        car.shrink();
                    }
                    else {
                        car.spawnMove('f', 'u');
                    }
                    var us = parsegraph_copyStyle('u');
                    us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                    car.node().setBlockStyle(us);
                    if(y === 0) {
                        car.shrink();
                    }
                    car.push();
                    for(var x = 0; x < rowSize; ++x) {
                        car.spawnMove('d', 'u');
                        var s = parsegraph_copyStyle('u');
                        s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                        car.node().setBlockStyle(s);
                        car.pull('f');
                        var bsty = parsegraph_copyStyle('b');
                        bsty.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                        car.spawnMove('f', 'b');
                        car.node().setBlockStyle(bsty);
                        car.spawnMove('d', 'u');
                        car.onClick(createClickListener.call(this, car.node()), this);
                        car.move('u');
                        car.pull('d');
                        car.move('b');
                    }
                    car.pop();
                    car.pull('d');
                }
            }
            else if(subtype === 2) {
                car.align('d', 'c');
                car.pull('d');
                //car.spawnMove('d', 'u');

                for(var y = 0; y < columnSize; ++y) {
                    if(y === 0) {
                        car.align('d', parsegraph_ALIGN_CENTER);
                        car.spawnMove('d', 'u');
                        car.shrink();
                    }
                    else {
                        car.spawnMove('f', 'u');
                    }
                    var us = parsegraph_copyStyle('u');
                    us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                    car.node().setBlockStyle(us);
                    if(y === 0) {
                        car.shrink();
                    }
                    car.push();
                    for(var x = 0; x < rowSize; ++x) {
                        if(x > 0) {
                            car.spawnMove('d', 'u');
                            car.node().setBlockStyle(us);
                        }
                        car.spawnMove('d', 's');
                        var s = parsegraph_copyStyle('s');
                        s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                        car.node().setBlockStyle(s);
                        car.spawnMove('f', 'u');
                        car.onClick(createClickListener.call(this, car.node()), this);
                        car.move('b');
                        car.pull('f');
                    }
                    car.pop();
                    car.pull('d');
                }
            }
            else if(subtype === 3) {
                car.align('d', 'c');
                car.pull('d');
                //car.spawnMove('d', 'u');

                for(var y = 0; y < columnSize; ++y) {
                    if(y === 0) {
                        car.align('d', parsegraph_ALIGN_CENTER);
                        car.spawnMove('d', 'u');
                        car.shrink();
                    }
                    else {
                        car.spawnMove('f', 'u');
                    }
                    var us = parsegraph_copyStyle('u');
                    us.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                    car.node().setBlockStyle(us);
                    if(y === 0) {
                        car.shrink();
                    }
                    car.push();
                    for(var x = 0; x < rowSize; ++x) {
                        if(x > 0) {
                            car.spawnMove('d', 'u');
                            car.node().setBlockStyle(us);
                        }
                        car.spawnMove('d', 's');
                        var s = parsegraph_copyStyle('s');
                        s.backgroundColor = new parsegraph_Color(r/255, g/255, b/255);
                        car.node().setBlockStyle(s);
                        car.pull('b');
                        car.spawnMove('b', 'u');
                        car.onClick(createClickListener.call(this, car.node()), this);
                        car.move('f');
                    }
                    car.pop();
                    car.pull('d');
                }
            }
            break;
        }
        car.pop();
    }

    console.log("Graph reconstructed");
    this.scheduleRepaint();
    this.scheduleRender();
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

    var cameraProtocol;

    this._loginWidget.setLoginListener(function(res, userLogin, node) {
        console.log("Logged in")
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
    this._graph.setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);
    this._graph.carousel().setOnScheduleRepaint(function() {
        this.scheduleRender();
    }, this);
};
