function parsegraph_ChatProtocol(ws, eventFunc, eventFuncThisArg) {
    if(!eventFunc) {
        throw new Error("An eventFunc must be provided");
    }
    var opened = false;

    this.send = function(text) {
        // Closed socket appears often as server down.
        if(ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING || !ws.readyState) {
            //console.log("WebSocket closing, ignoring: " + text);
            return;
        }
        //console.log("Sending", ws.readyState, text);
        ws.send(JSON.stringify({data:text}));
    };

    ws.onopen = function() {
        //console.log("Connection opened");
        opened = true;
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
    };

    this.opened = function() {
        return opened;
    };
};

