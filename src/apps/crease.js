function parsegraph_CreaseWidget(app)
{
    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.setGlyphAtlas(app.glyphAtlas());
    this._root = caret.root();

    var addActions = function(id) {
        caret.label(id);
        caret.save(id);
        var uninstall = null;
        var reinstall;
        var timer = new parsegraph_AnimationTimer();
        //timer.setDelay(15);
        var startTime;
        timer.setListener(function() {
            caret.restore(id);
            var s = parsegraph_copyStyle(parsegraph_BLOCK);
            s.horizontalPadding = 10*parsegraph_BUD_RADIUS*(1+Math.sin(parsegraph_elapsed(startTime)/1000));
            caret.node().setBlockStyle(s);
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
                    caret.restore(id);
                    var s = parsegraph_copyStyle(parsegraph_BLOCK);
                    caret.node().setBlockStyle(s);
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
            caret.restore(id);
            caret.move('u');
            if(!caret.isCreased()) {
                carousel.addAction("Crease", function() {
                    caret.restore(id);
                    caret.move('u');
                    caret.crease();
                    reinstall();
                });
            }
            else {
                carousel.addAction("Uncrease", function() {
                    caret.restore(id);
                    caret.move('u');
                    caret.uncrease();
                    reinstall();
                });
            }
            caret.move('d');
            var uninstallCarousel = carousel.install(caret.node());
            return function() {
                uninstallCarousel();
            };
        };
        caret.move('u');
        if(id !== "Center") {
            caret.crease();
        }
        caret.move('d');
        uninstall = reinstall();
    };

    caret.pull('d');
    caret.spawnMove('d', 'b');
    addActions("Center");
    caret.move('u');
    caret.spawnMove('b', 'u');
    caret.spawnMove('d', 'b');
    addActions("Backward");
    caret.move('u');
    caret.move('f');
    caret.spawnMove('f', 'u');
    caret.spawnMove('d', 'b');
    addActions("Forward");
};

parsegraph_CreaseWidget.prototype.node = function()
{
    return this._root;
};

