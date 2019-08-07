function parsegraph_CreaseWidget(app)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.setGlyphAtlas(app.glyphAtlas());
    this._root = caret.root();

    var addActions = function(id) {
        var node = caret.node();
        node.setLabel(id, app.glyphAtlas());
        var uninstall = null;
        var reinstall;
        var timer = new parsegraph_AnimationTimer();
        //timer.setDelay(15);
        var startTime;
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
                    startTime = new Date();
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
                    console.log(n);
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

    caret.pull('d');
    caret.push();
    var size = 100;
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('d', 'b');
        addActions("Center");
    }
    caret.pop();
    caret.push();
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('b', 'b');
        addActions("Backward");
    }
    caret.pop();
    caret.push();
    for(var i = 0; i < size; ++i) {
        caret.spawnMove('f', 'b');
        addActions("Forward");
    }
    caret.pop();
};

parsegraph_CreaseWidget.prototype.node = function()
{
    return this._root;
};

