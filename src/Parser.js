// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
function getWholeChar(str, i) {
  var code = str.charCodeAt(i);

  if (Number.isNaN(code)) {
    return ''; // Position not found
  }
  if (code < 0xD800 || code > 0xDFFF) {
    return str.charAt(i);
  }

  // High surrogate (could change last hex to 0xDB7F to treat high private
  // surrogates as single characters)
  if (0xD800 <= code && code <= 0xDBFF) {
    if (str.length <= (i + 1)) {
      throw 'High surrogate without following low surrogate';
    }
    var next = str.charCodeAt(i + 1);
      if (0xDC00 > next || next > 0xDFFF) {
        throw 'High surrogate without following low surrogate';
      }
      return str.charAt(i) + str.charAt(i + 1);
  }
  // Low surrogate (0xDC00 <= code && code <= 0xDFFF)
  if (i === 0) {
    throw 'Low surrogate without preceding high surrogate';
  }
  var prev = str.charCodeAt(i - 1);

  // (could change last hex to 0xDB7F to treat high private
  // surrogates as single characters)
  if (0xD800 > prev || prev > 0xDBFF) {
    throw 'Low surrogate without preceding high surrogate';
  }
  // We can pass over low surrogates now as the second component
  // in a pair which we have already processed
  return false;
}

function parsegraph_Token()
{
    this._type = arguments[0];
    if(arguments.length > 1) {
        this._text = arguments[1];
    }
    else {
        this._text = null;
    }
}

parsegraph_Token.prototype.type = function()
{
    return this._type;
};

parsegraph_Token.prototype.text = function()
{
    return this._text;
};

parsegraph_EOF = 1;
parsegraph_NAME = 2;
parsegraph_COMMA = 3;
parsegraph_LBRACK = 4;
parsegraph_RBRACK = 5;
parsegraph_DIVIDE = 6;
parsegraph_SINGLE_QUOTE = 7;
parsegraph_DOUBLE_QUOTE = 8;
parsegraph_BACK_QUOTE = 9;
parsegraph_DOT = 10;
parsegraph_ASSIGNMENT = 11;
parsegraph_EQUALS = 12;
parsegraph_IDENTITY = 13;
parsegraph_NOT = 14;
parsegraph_NOT_EQUALS = 15;
parsegraph_NOT_IDENTICAL = 16;
parsegraph_LPAREN = 17;
parsegraph_RPAREN = 18;
parsegraph_INTEGER = 19;

function parsegraph_nameTokenType(tokenType)
{
    switch(tokenType) {
    case parsegraph_EOF:
        return "EOF";
    case parsegraph_NAME:
        return "NAME";
    case parsegraph_COMMA:
        return "COMMA";
    case parsegraph_LBRACK:
        return "LBRACK";
    case parsegraph_RBRACK:
        return "RBRACK";
    case parsegraph_LPAREN:
        return "LPAREN";
    case parsegraph_RPAREN:
        return "RPAREN";
    case parsegraph_DIVIDE:
        return "DIVIDE";
    case parsegraph_SINGLE_QUOTE:
        return "SINGLE_QUOTE";
    case parsegraph_DOUBLE_QUOTE:
        return "DOUBLE_QUOTE";
    case parsegraph_BACK_QUOTE:
        return "BACKQUOTE";
    case parsegraph_DOT:
        return "DOT";
    case parsegraph_ASSIGNMENT:
        return "ASSIGNMENT";
    case parsegraph_EQUALS:
        return "EQUALS";
    case parsegraph_IDENTITY:
        return "IDENTITY";
    case parsegraph_NOT:
        return "NOT";
    case parsegraph_NOT_EQUALS:
        return "NOT_EQUALS";
    case parsegraph_NOT_IDENTICAL:
        return "NOT_IDENTICAL";
    case parsegraph_INTEGER:
        return "INTEGER";
    }
    throw new Error("Unknown type " + tokenType);
};

parsegraph_Token.prototype.equals = function(other)
{
    if(!other) {
        return false;
    }
    if(typeof other.type !== "function") {
        return false;
    }
    if(typeof other.text !== "function") {
        return false;
    }
    return this.type() == other.type() && this.text() == other.text();
};

parsegraph_Token.prototype.toString = function()
{
    var rv = parsegraph_nameTokenType(this.type());
    if(this.text() !== null) {
        rv += "=\"" + this.text() + "\"";
    }
    return rv;
};

// Based on 'Language Implementation Patterns' by Terence Parr
function parsegraph_Lexer(input)
{
    this._input = input;
    this._index = 0;

    // Prime the lookahead.
    this._char = getWholeChar(this._input, this._index);
    this._charCode = this._char.charCodeAt(0);
}

parsegraph_Lexer.prototype.consume = function()
{
    // Increment to the next index.
    this._index += this._char.length;

    // Check if there's no more characters.
    if(this._index >= this._input.length) {
        this._char = null;
        this._charCode = null;
        return false;
    }

    this._char = getWholeChar(this._input, this._index);
    this._charCode = this._char.charCodeAt(0);
    return true;
};

parsegraph_Lexer.prototype.c = function()
{
    return this._char;
};

parsegraph_Lexer.prototype.cc = function()
{
    return this._charCode;
};

parsegraph_Lexer.prototype.match = function(candidate)
{
    if(this._char == candidate) {
        this.consume();
    }
    else {
        throw new Error("Expected " + candidate + ", but found " + this._char);
    }
};

function parsegraph_parse(str, callback, thisArg)
{
    var lexer = new parsegraph_Lexer(str);
    lexer.NAME = function() {
        var rv = "";
        do {
            rv += this.c();
            this.consume();
        }
        while(this.isLETTER());

        return new parsegraph_Token(parsegraph_NAME, rv);
    };

    lexer.isWS = function() {
        return this.c() != null && this.c().match(/\s/);
    };

    lexer.WS = function() {
        while(this.isWS()) {
            this.consume();
        }
    };

    lexer.isLETTER = function() {
        return this.c() != null && this.c().match(/[a-zA-Z]/);
    };

    lexer.isDIGIT = function() {
        return this.c() != null && this.c().match(/\d/);
    };

    lexer.NUMBER = function() {
        var num = "";
        while(this.isDIGIT()) {
            num += this.c();
            if(!this.consume()) {
                break;
            }
        }
        return new parsegraph_Token(parsegraph_INTEGER, num);
    };

    lexer.nextToken = function() {
        while(this.c() != null) {
            switch(this.c()) {
            case '/':
                this.consume();
                if(this.c() == '/') {
                    // Comment.
                    this.consume();
                    while(this.c() != '\n') {
                        if(!this.consume()) {
                            // EOF.
                            break;
                        }
                    }

                    continue;
                }
                else if(this.c() == '*') {
                    // Multi-line comment.
                    this.consume();
                    while(true) {
                        while(this.c() != '*') {
                            this.consume();
                        }
                        this.consume();
                        if(this.c() == '/') {
                            // Comment ended.
                            break;
                        }

                        // Still in the multi-line comment.
                    }

                    continue;
                }
                return new parsegraph_Token(parsegraph_DIVIDE, "/");
            case '\'':
            case '"':
            case '`':
                var quote = this.c();
                if(!this.consume()) {
                    throw new Error("Unexpected start of string");
                }
                var str = "";
                while(true) {
                    if(this.c() == quote) {
                        this.consume();
                        switch(quote) {
                        case '\'':
                            return new parsegraph_Token(parsegraph_SINGLE_QUOTE, str);
                        case '"':
                            return new parsegraph_Token(parsegraph_DOUBLE_QUOTE, str);
                        case '`':
                            return new parsegraph_Token(parsegraph_BACK_QUOTE, str);
                        default:
                            throw new Error("Unrecognized quote symbol: " + quote);
                        }
                    }

                    str += this.c();
                    if(!this.consume()) {
                        throw new Error("Unterminated string");
                    }
                }
                continue;
            case ' ':
            case '\t':
            case '\n':
            case '\r':
                this.WS();
                continue;
            case ',':
                this.consume();
                return new parsegraph_Token(parsegraph_COMMA);
            case '.':
                this.consume();
                return new parsegraph_Token(parsegraph_DOT);
            case '(':
                this.consume();
                return new parsegraph_Token(parsegraph_LPAREN);
            case ')':
                this.consume();
                return new parsegraph_Token(parsegraph_RPAREN);
            case '!':
                this.consume();
                if(this.c() == '=') {
                    this.consume();
                    if(this.c() == '=') {
                        // Identity
                        return new parsegraph_Token(parsegraph_NOT_IDENTICAL);
                    }
                    // Equality
                    return new parsegraph_Token(parsegraph_NOT_EQUALS);
                }
                // Assignment
                return new parsegraph_Token(parsegraph_NOT);
            case '=':
                this.consume();
                if(this.c() == '=') {
                    this.consume();
                    if(this.c() == '=') {
                        // Identity
                        return new parsegraph_Token(parsegraph_IDENTITY);
                    }
                    // Equality
                    return new parsegraph_Token(parsegraph_EQUALS);
                }
                // Assignment
                return new parsegraph_Token(parsegraph_ASSIGNMENT);
            case '[':
                this.consume();
                return new parsegraph_Token(parsegraph_LBRACK);
            case ']':
                this.consume();
                return new parsegraph_Token(parsegraph_RBRACK);
            default:
                if(this.c() == '-' || this.isDIGIT()) {
                    return this.NUMBER();
                }
                if(this.isLETTER()) {
                    return this.NAME();
                }
                throw new Error("Invalid character: " + this.c());
            }
        }

        return new parsegraph_Token(parsegraph_EOF, "<EOF>");
    };

    if(callback == undefined) {
        var results = [];
        for(var t = lexer.nextToken(); t.type() != parsegraph_EOF; t = lexer.nextToken()) {
            results.push(t);
        }
        return results;
    }

    for(var t = lexer.nextToken(); t.type() != parsegraph_EOF; t = lexer.nextToken()) {
        callback.call(thisArg, t);
    }
}

parsegraph_Parser_Tests = new parsegraph_TestSuite("parsegraph_Parser");

parsegraph_Parser_Tests.addTest("parsegraph_Parser", function(resultDom) {
    var assertEquals = function(given, expected) {
        if(expected.length === 0) {
            if(given.length !== 0) {
                throw new Error("Expected no tokens, but received " + given.length + ".");
            }
            return;
        }
        if(given.length === 0) {
            throw new Error("Given tokens must not be empty");
        }
        for(var i = 0; i < expected.length; ++i) {
            if(i >= given.length) {
                var remTokens = expected.length - given.length;
                if(remTokens > 1) {
                    throw new Error("Expected " + remTokens + " more tokens");
                }
                throw new Error("Expected " + expected[i].toString() + ", but parsed nothing.");
            }
            if(!given[i].equals(expected[i])) {
                throw new Error("Expected " + expected[i].toString() + ", but parsed " + given[i].toString());
            }
        }
    };

    assertEquals(parsegraph_parse("[AB]"), [
        new parsegraph_Token(parsegraph_LBRACK),
        new parsegraph_Token(parsegraph_NAME, "AB"),
        new parsegraph_Token(parsegraph_RBRACK)
    ]);

    assertEquals(parsegraph_parse("[AB, CD]"), [
        new parsegraph_Token(parsegraph_LBRACK),
        new parsegraph_Token(parsegraph_NAME, "AB"),
        new parsegraph_Token(parsegraph_COMMA),
        new parsegraph_Token(parsegraph_NAME, "CD"),
        new parsegraph_Token(parsegraph_RBRACK)
    ]);
});
