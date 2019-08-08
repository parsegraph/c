function parsegraph_CreaseWidget(app)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.setGlyphAtlas(app.glyphAtlas());

    this._root = caret.root();
    var rs = parsegraph_copyStyle(parsegraph_BUD);
    rs.minWidth *= 20;
    rs.minHeight *= 20;
    rs.borderRoundness *= 18;
    rs.borderThickness *= 20;
    this._root.setBlockStyle(rs);

    var addActions = function(id) {
        var node = caret.node();
        node.setLabel(id, app.glyphAtlas());
        var uninstall = null;
        var reinstall;
        var timer = new parsegraph_AnimationTimer();
        //timer.setDelay(15);
        var startTime = new Date();
        timer.setListener(function() {
            var s = parsegraph_copyStyle(parsegraph_BLOCK);
            if(id === "Center") {
                s.verticalPadding = 10*parsegraph_BUD_RADIUS*(1+Math.sin(parsegraph_elapsed(startTime)/1000));
            }
            else {
                s.horizontalPadding = 10*parsegraph_BUD_RADIUS*(1+Math.sin(parsegraph_elapsed(startTime)/1000));
            }
            node.setBlockStyle(s);
            app.scheduleRepaint();
            timer.schedule();
        });
        reinstall = function() {
            if(uninstall) {
                uninstall();
            }
            var carousel = new parsegraph_ActionCarousel(app.graph());
            node.setValue(timer);
            if(timer.scheduled()) {
                carousel.addAction("Stop", function() {
                    timer.cancel();
                    var s = parsegraph_copyStyle(parsegraph_BLOCK);
                    node.setBlockStyle(s);
                    app.scheduleRepaint();
                    reinstall();
                });
            }
            else {
                carousel.addAction("Grow", function() {
                    timer.schedule();
                    reinstall();
                });
            }
            carousel.addAction("Crease", function() {
                node.setPaintGroup(true);
                app.scheduleRepaint();
                reinstall();
            });
            carousel.addAction("Uncrease", function() {
                node.setPaintGroup(false);
                app.scheduleRepaint();
                reinstall();
            });
            var changeCrease = function(creased) {
                var dir;
                switch(id) {
                case "Center":
                    dir = parsegraph_DOWNWARD;
                    break;
                case "Forward":
                    dir = parsegraph_FORWARD;
                    break;
                case "Backward":
                    dir = parsegraph_BACKWARD;
                    break;
                }
                for(var n = node; n; n = n.nodeAt(dir)) {
                    n.setPaintGroup(creased);
                }
                app.scheduleRepaint();
            };
            carousel.addAction("Crease all", function() {
                changeCrease(true);
            });
            carousel.addAction("Uncrease all", function() {
                changeCrease(false);
            });
            var uninstallCarousel = carousel.install(node);
            return function() {
                uninstallCarousel();
            };
        };
        uninstall = reinstall();
    };

    var creasables = [];
    var size = 50;
    caret.pull('d');

    caret.push();
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('d', 'b');
        addActions("Center");
        caret.node()._id = "Center " + i;
        creasables.push(caret.node());
    }
    caret.pop();
    caret.push();
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('b', 'b');
        addActions("Backward");
        caret.node()._id = "Backward " + i;
        creasables.push(caret.node());
    }
    caret.pop();
    caret.push();
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('f', 'b');
        addActions("Forward");
        caret.node()._id = "Forward " + i;
        creasables.push(caret.node());
    }
    caret.pop();

    var rootActions = new parsegraph_ActionCarousel(app.graph());
    rootActions.addAction("Crease random", function() {
        for(var i in creasables) {
            var n = creasables[i];
            n.setPaintGroup(Math.random() > .5);
        }
        app.scheduleRepaint();
    });
    rootActions.addAction("Grow all", function() {
        for(var i in creasables) {
            var n = creasables[i];
            if(Math.random() > .5) {
                console.log("Scheduled");
                n.value().schedule();
            }
            else {
                n.value().cancel();
            }
        }
        app.scheduleRepaint();
    });
    rootActions.install(caret.node());
};

parsegraph_CreaseWidget.prototype.node = function()
{
    return this._root;
};

