function parsegraph_EnvironmentProtocol(ws, eventFunc, eventFuncThisArg) {
    if(!eventFunc) {
        throw new Error("An eventFunc must be provided");
    }
    var opened = false;

    ws.onopen = function() {
        //console.log("Connection opened");
        opened = true;
    };

    ws.onclose = function() {
        opened = false;
        //timer.cancel();
    };

    this.opened = function() {
        return opened;
    };

    this._lexer = new parsegraph_json_Lexer();
    this._errors = [];
    this._tokens = [];
    this._tokenIndex = 0;
    this._printState = {
        stage:0,
        valueStack:[],
        objects:[]
    };

    var that = this;
    ws.onmessage = function(event) {
        if(that.errored()) {
            return;
        }
        that.feedInitialData(event.data);
    };
};

parsegraph_EnvironmentProtocol.prototype.nextToken = function()
{
    if(this._tokenIndex >= this._tokens.length) {
        var nt = this._lexer.nextToken();
        if(nt !== null) {
            this._tokens.push(nt);
        }
        else {
            return null;
        }
    }
    return this._tokens[this._tokenIndex++];
};

parsegraph_EnvironmentProtocol.prototype.rollbackToken = function()
{
    this._tokenIndex = 0;
};

parsegraph_EnvironmentProtocol.prototype.commitToken = function()
{
    while(this._tokenIndex > 0) {
        this._tokens.shift();
        this._tokenIndex--;
    }
};

parsegraph_EnvironmentProtocol.prototype.errored = function()
{
    return this._errors.length > 0;
};

parsegraph_EnvironmentProtocol.prototype.error = function(msg)
{
    this._errors.push(msg);
};

parsegraph_EnvironmentProtocol.prototype.feedInitialData = function(eventData)
{
    var printState = this._printState;
    var lexer = this._lexer;
    lexer.feed(event.data);
process:while(true) {
        if(this.errored()) {
            return;
        }
        if(printState.stage === 0) {
            var t = this.nextToken();
            if(t == null) {
                return;
            }
            switch(t._type) {
            case parsegraph_json_LBRACK:
                printState.valueStack.push([]);
                break;
            case parsegraph_json_LCURLY:
                printState.valueStack.push({});
                break;
            default:
                this.error("Encountered unexpected " + parsegraph_nameTokenType(t._type) + " while looking for start of object or array.");
                return;
            }
            printState.stage = 1;
            this.commitToken();
        }
        if(printState.stage === 1) {
            var value = printState.valueStack[printState.valueStack.length - 1];
            if(Array.isArray(value)) {
                var jsonArray = value;
                var value = this.nextToken();
                if(value === null) {
                    this.rollbackToken();
                    return;
                }

                // Beginning of array of [a, b, c].
                switch(value._type) {
                case parsegraph_json_RBRACK:
                    printState.valueStack.pop();
                    printState.stage = 2;
                    if(printState.valueStack.length === 0) {
                        printState.stage = 3;
                    }
                    continue process;
                case parsegraph_json_LBRACK:
                    jsonArray.push([]);
                    printState.valueStack.push(jsonArray[jsonArray.length - 1]);
                    printState.stage = 1;
                    break;
                case parsegraph_json_LCURLY:
                    jsonArray.push({});
                    printState.valueStack.push(jsonArray[jsonArray.length - 1]);
                    printState.stage = 1;
                    break;
                case parsegraph_json_STRING:
                    jsonArray.push(value._value);
                    printState.stage = 2;
                    break;
                case parsegraph_json_NUMBER:
                    jsonArray.push(parseFloat(value._value));
                    printState.stage = 2;
                    break;
                case parsegraph_json_TRUE:
                    jsonArray.push(true);
                    printState.stage = 2;
                    break;
                case parsegraph_json_FALSE:
                    jsonArray.push(false);
                    printState.stage = 2;
                    break;
                case parsegraph_json_NULL:
                    jsonArray.push(null);
                    printState.stage = 2;
                    break;
                default:
                    this.error("Encountered unexpected " + parsegraph_nameTokenType(value._type) + " while looking for array value.");
                    return;
                }
                this.commitToken();
            }
            else {
                var jsonObj = value;
                var key = this.nextToken();
                if(key === null) {
                    this.rollbackToken();
                    return;
                }
                switch(key._type) {
                case parsegraph_json_STRING:
                    break;
                case parsegraph_json_RCURLY:
                    printState.valueStack.pop();
                    printState.stage = 2;
                    if(printState.valueStack.length === 0) {
                        printState.stage = 3;
                    }
                    continue process;
                default:
                    this.error("Encountered unexpected " + parsegraph_nameTokenType(key._type) + " while looking for string key.");
                    return;
                }
                var sepToken = this.nextToken();
                if(sepToken === null) {
                    this.rollbackToken();
                    return;
                }
                if(sepToken._type !== parsegraph_json_COLON) {
                    this.error("Encountered unexpected " + parsegraph_nameTokenType(key._type) + " while looking for colon separator.");
                    return;
                }
                var value = this.nextToken();
                if(value === null) {
                    this.rollbackToken();
                    return;
                }
                switch(value._type) {
                case parsegraph_json_LBRACK:
                    jsonObj[key._value] = [];
                    printState.valueStack.push(jsonObj[key._value]);
                    printState.stage = 1;
                    break;
                case parsegraph_json_LCURLY:
                    jsonObj[key._value] = {};
                    printState.valueStack.push(jsonObj[key._value]);
                    printState.stage = 1;
                    break;
                case parsegraph_json_STRING:
                    jsonObj[key._value] = value._value;
                    printState.stage = 2;
                    break;
                case parsegraph_json_NUMBER:
                    jsonObj[key._value] = parseFloat(value._value);
                    printState.stage = 2;
                    break;
                case parsegraph_json_TRUE:
                    jsonObj[key._value] = true;
                    printState.stage = 2;
                    break;
                case parsegraph_json_FALSE:
                    jsonObj[key._value] = false;
                    printState.stage = 2;
                    break;
                case parsegraph_json_NULL:
                    jsonObj[key._value] = null;
                    printState.stage = 2;
                    break;
                default:
                    this.error("Encountered unexpected " + parsegraph_nameTokenType(value._type) + " while looking for value.");
                    return;
                }

                this.commitToken();
            }
        }
        if(printState.stage === 2) {
            var comma = this.nextToken();
            if(comma === null) {
                this.rollbackToken();
                return;
            }
            switch(comma._type) {
            case parsegraph_json_COMMA:
                printState.stage = 1;
                this.commitToken();
                break;
            case parsegraph_json_RCURLY:
                if(Array.isArray(printState.valueStack[printState.valueStack.length - 1])) {
                    this.error("Encountered } while being within an array.");
                    return;
                }
                printState.valueStack.pop();
                if(printState.valueStack.length === 0) {
                    printState.stage = 3;
                }
                this.commitToken();
                break;
            case parsegraph_json_RBRACK:
                if(!Array.isArray(printState.valueStack[printState.valueStack.length - 1])) {
                    this.error("Encountered ] without being within an array.");
                    return;
                }
                printState.valueStack.pop();
                if(printState.valueStack.length === 0) {
                    printState.stage = 3;
                }
                this.commitToken();
                break;
            default:
                this.error("Encountered unexpected " + parsegraph_nameTokenType(comma._type) + " while looking for comma.");
                return;
            }
        }
        if(printState.stage === 3) {
            printState.objects.push(this._rootValue);
            break;
        }
    }
};
