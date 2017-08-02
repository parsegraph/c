function parsegraph_EnvironmentProtocol(ws, eventFunc, eventFuncThisArg) {
    if(!eventFunc) {
        throw new Error("An eventFunc must be provided");
    }
    var opened = false;

    /*var timer = new parsegraph_IntervalTimer();
    timer.setDelay(50);

    timer.setListener(function() {
        if(!opened) {
            return;
        }

        var buffer = new ArrayBuffer(8 + 8 + 8 + 2 + 2);
        var dataview = new DataView(buffer);
        dataview.setFloat64(0, camera.x());
        dataview.setFloat64(8, camera.y());
        dataview.setFloat64(16, camera.scale());
        dataview.setInt16(24, camera.width());
        dataview.setInt16(26, camera.height());
        ws.send(buffer);
        timer.cancel();
    });
    */

    this.update = function() {
        if(!opened) {
            return;
        }
        //timer.schedule();
    };

    ws.onopen = function() {
        //console.log("Connection opened");
        opened = true;
        //timer.schedule();
    };

    var state = "begin";
    ws.onmessage = function(event) {
        // TODO Change
        console.log(event);
    };

    ws.onclose = function() {
        opened = false;
        //timer.cancel();
    };

    this.opened = function() {
        return opened;
    };
};
