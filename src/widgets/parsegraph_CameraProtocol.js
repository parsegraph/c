function parsegraph_CameraProtocol(ws, camera, eventFunc, eventFuncThisArg) {
    if(!eventFunc) {
        throw new Error("An eventFunc must be provided");
    }
    var opened = false;

    var timer = new parsegraph_IntervalTimer();
    timer.setDelay(50);

    timer.setListener(function() {
        if(!opened) {
            return;
        }
        //console.log("Sending camera");
        ws.send(JSON.stringify(camera.toJSON()));
        timer.cancel();
    });

    this.update = function() {
        if(!opened) {
            return;
        }
        timer.schedule();
    };

    ws.onopen = function() {
        //console.log("Connection opened");
        opened = true;
        timer.schedule();
    };

    var state = "begin";
    var composed = "";
    ws.onmessage = function(event) {
        var msg = event.data;
        //console.log(msg);
        while(msg.length > 0) {
            if(state === "begin") {
                // Ensure the message begins as we expect.
                if(msg.charAt(0) != '{') {
                    ws.close();
                    throw new Error("Invalid start received");
                }
                state = "collecting";
            }
            if(state === "collecting") {
                var eol = msg.indexOf('}');
                if(eol != -1) {
                    // Message contains an end.
                    composed += msg.slice(0, eol + 1);
                    //console.log(composed);
                    eventFunc.call(
                        eventFuncThisArg,
                        JSON.parse(composed)
                    );

                    // Process the remaining message.
                    msg = msg.slice(eol + 1);
                    state = "begin";
                    composed = "";
                }
                else {
                    // Message continues.
                    composed += msg;
                    msg = "";
                }
            }
        }
    };

    ws.onclose = function() {
        opened = false;
        timer.cancel();
    };

    this.opened = function() {
        return opened;
    };
};

