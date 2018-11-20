#include "Parser.h"

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

int parsegraph_json_EOF = 0;
int parsegraph_json_EOL = 1;
int parsegraph_json_LCURLY = 2;
int parsegraph_json_RCURLY = 3;
int parsegraph_json_LBRACK = 4;
int parsegraph_json_RBRACK = 5;
int parsegraph_json_COLON = 6;
int parsegraph_json_COMMA = 7;
int parsegraph_json_STRING = 8;
int parsegraph_json_NUMBER = 9;
int parsegraph_json_NULL = 10;
int parsegraph_json_TRUE = 11;
int parsegraph_json_FALSE = 12;

parsegraph_json_Token* parsegraph_json_Token_new(apr_pool_t* pool, int type, char* value)
{
    parsegraph_json_Token* token = apr_palloc(pool, sizeof(*token));
    token->_type = type;
    token->_value = value;
    return token;
}

parsegraph_json_error* parsegraph_json_error_new(apr_pool_t* pool, int errorType, int listId, const char* message)
{
    parsegraph_json_error* err = apr_palloc(pool, sizeof(*err));
    err->_errorType = errorType;
    err->_listId = listId;
    err->_message = message;
    err->_next = 0;
    return err;
}

const char* parsegraph_nameTokenType(int tokenType)
{
    switch(tokenType) {
    case parsegraph_json_TRUE:
        return "TRUE";
    case parsegraph_json_FALSE:
        return "FALSE";
    case parsegraph_json_NULL:
        return "NULL";
    case parsegraph_json_EOF:
        return "EOF";
    case parsegraph_json_COMMA:
        return "COMMA";
    case parsegraph_json_COLON:
        return "COLON";
    case parsegraph_json_LBRACK:
        return "LBRACK";
    case parsegraph_json_RBRACK:
        return "RBRACK";
    case parsegraph_json_LCURLY:
        return "LCURLY";
    case parsegraph_json_RCURLY:
        return "RCURLY";
    case parsegraph_json_STRING:
        return "STRING";
    case parsegraph_json_NUMBER:
        return "NUMBER";
    case parsegraph_json_EOL:
        return "EOL";
    }
    return 0;
}

parsegraph_json_Lexer* parsegraph_json_Lexer_new(apr_pool_t* pool)
{
    parsegraph_json_Lexer* lexer = apr_palloc(pool, sizeof(*lexer));
    lexer->_strings = [];
    lexer->_strIndex = 0;
    lexer->_index = 0;
    lexer->_c = 0;

    lexer->_firstError = 0;
    lexer->_errorHead = 0;
    return lexer;
}

parsegraph_json_Lexer.prototype.feed = function(str)
{
    this._strings.push(str);
    // Prime if the lexer was empty.
    if(this._strings.length === 1 || this._c === null) {
        return this.consume();
    }
}

parsegraph_json_Lexer.prototype.save = function()
{
    this._lastIndex = this._index;
    this._lastStrIndex = this._strIndex;
};

parsegraph_json_Lexer.prototype.rollback = function()
{
    this._index = this._lastIndex;
    this._strIndex = this._lastStrIndex;
};

parsegraph_json_Lexer.prototype.commit = function()
{
    this._lastIndex = null;
    this._lastStrIndex = null;

    while(this._strIndex > 0) {
        this._strIndex--;
        this._strings.shift();
    }
};

parsegraph_json_Lexer.prototype.consume = function()
{
    while(true) {
        if(this._strIndex >= this._strings.length) {
            break;
        }
        if(this._index >= this._strings[this._strIndex].length) {
            // Index exceeds string.
            ++this._strIndex;
            this._index = 0;
            continue;
        }
        this._c = this._strings[this._strIndex].charAt(this._index++);
        return this._c;
    }
    this._c = null;
    return null;
};

parsegraph_json_Lexer.prototype.c = function()
{
    return this._c;
};

parsegraph_json_Lexer.prototype.match = function(expected)
{
    if(this._c === expected) {
        return this.consume();
    }
    return null;
};

parsegraph_json_Lexer.prototype.error = function(str)
{
    var err = new parsegraph_json_error();
    err._message = str;
    err._errorType = 0;
    err._listId = 0;
    err._next = 0;
    if(this._errorHead) {
        this._errorHead._next = err;
    }
    else {
        this._firstError = err;
    }
    this._errorHead = err;

    return err;
};

parsegraph_json_MAX_NAME_LENGTH = 1024;
parsegraph_json_MAX_STRING_LENGTH = 4096;

parsegraph_json_Lexer.prototype.isLETTER = function()
{
    if(this.c() !== null && this.c().match(/[a-zA-Z]/)) {
        return 1;
    }
    return 0;
};

parsegraph_json_Lexer.prototype.isDIGIT = function()
{
    if(this.c() !== null && this.c().match(/\d/)) {
        return 1;
    }
    return 0;
};

parsegraph_json_Lexer.prototype.isWS = function()
{
    var c = this.c();
    if(c !== null && c.match(/\s/)) {
        return 1;
    }
    return 0;
};

parsegraph_json_Lexer.prototype.isNEWLINE = function()
{
    var c = this.c();
    if(c !== null && (c === '\r' || c === '\n')) {
        return 1;
    }
    return 0;
};

parsegraph_json_Lexer.prototype.VALUE = function(expected)
{
    var rv = "";
    var i = 0;
    while(this.isLETTER(lexer)) {
        rv += this.c(lexer);
        if(null === this.consume(lexer)) {
            return null;
        }
    }

    if("true" === rv) {
        return new parsegraph_json_Token(parsegraph_json_TRUE);
    }
    if("false" === rv) {
        return new parsegraph_json_Token(parsegraph_json_FALSE);
    }
    if("null" === rv) {
        return new parsegraph_json_Token(parsegraph_json_NULL);
    }

    this.error("Unexpected bareword");
    return null;
};

parsegraph_json_Lexer.prototype.WS = function()
{
    while(this.isWS() != 0 && !this.isNEWLINE()) {
        if(null === this.consume(lexer)) {
            return null;
        }
    }
    return true;
};

parsegraph_json_Lexer.prototype.NUMBER = function()
{
    this.save();

    var rv = "";
    var i = 0;
    var c = this.c();

    if(c === '-') {
        // Minus sign.
        rv += c;
        ++i;
        if(null === this.consume()) {
            this.rollback();
            return null;
        }
        c = this.c();
    }

    if(c.match(/\d/)) {
        // Nonzero integer part.
        while(c.match(/\d/)) {
            rv += c;
            ++i;
            if(null === this.consume()) {
                this.rollback();
                return null;
            }
            c = this.c();
        }
    }
    else if(c === '0') {
        // Zero integer part.
        rv += c;
        ++i;
        if(null === this.consume()) {
            this.rollback();
            return null;
        }
        c = this.c();
    }
    else {
        this.error("Unexpected start of numeric literal");
        return null;
    }

    if(c === '.') {
        // Fractional part.
        rv += c;
        ++i;
        if(!this.consume()) {
            this.error("Unexpected end of fractional part");
            return null;
        }
        while(1) {
            c = this.c();
            if(!c.match(/\d/)) {
                break;
            }
            rv += c;
            ++i;
            if(null === this.consume()) {
                this.rollback();
                return null;
            }
        }
    }

    if(c === 'e' || c === 'E') {
        // Scientific notation.
        rv += c;
        ++i;
        if(!this.consume()) {
            this.error("Unexpected end of scientific notation");
            return null;
        }
        c = this.c();
        if(c === '+' || c === '-') {
            rv += c;
            ++i;
            if(!this.consume()) {
                this.error("Unexpected end of scientific notation");
                return null;
            }
        }
        while(c.match(/\d/)) {
            rv += c;
            ++i;
            if(null === this.consume()) {
                this.rollback();
                return null;
            }
            c = this.c();
        }
    }

    this.commit();
    return new parsegraph_json_Token(parsegraph_json_NUMBER, rv);
};

parsegraph_json_Lexer.prototype.STRING = function()
{
    this.save();
    var quote = this.c();
    if(null === this.consume()) {
        this.rollback();
        return null;
    }
    var str = "";
    var i = 0;
    while(i < parsegraph_json_MAX_STRING_LENGTH) {
        var c = this.c();
        if(c == quote) {
            this.consume();
            break;
        }
        if(c == '\\') {
            // Skip the next two symbols.
            str[i++] = c;
            if(null === this.consume()) {
                this.rollback();
                return null;
            }
            if(i >= parsegraph_json_MAX_STRING_LENGTH) {
                this.error("String too long");
                return null;
            }
            str += this.c();
            ++i;
            if(null === this.consume()) {
                this.rollback();
                return null;
            }
            continue;
        }
        str += this.c();
        ++i;
        if(null === this.consume()) {
            this.rollback();
            return null;
        }
    }
    this.commit();
    return new parsegraph_json_Token(parsegraph_json_STRING, str);
};

parsegraph_json_Lexer.prototype.nextToken = function()
{
    var matched;
    var c;
    while((c = this.c()) != null) {
        switch(c) {
        case '"':
            return this.STRING();
        case ' ':
        case '\t':
            {
                var c = this.c();
                while(c !== null && (c === ' ' || c === '\t')) {
                    if(null === this.consume()) {
                        return null;
                    }
                    c = this.c();
                }
            }
            continue;
        case '\r':
        case '\n':
            {
                this.save();
                var c = this.c();
                while(c !== 0 && (c === '\r' || c === '\n')) {
                    if(null === this.consume()) {
                        this.rollback();
                        return null;
                    }
                    c = this.c();
                }
                this.commit();
                return new parsegraph_json_Token(parsegraph_json_EOL);
            }
        case ',':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_COMMA);
        case '[':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_LBRACK);
        case ']':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_RBRACK);
        case '{':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_LCURLY);
        case '}':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_RCURLY);
        case ':':
            this.consume();
            return new parsegraph_json_Token(parsegraph_json_COLON);
        default:
            if(this.c() === '-' || this.isDIGIT()) {
                return this.NUMBER();
            }
            if(this.isLETTER()) {
                return this.NAME(0);
            }
            this.error("Invalid character: " + this.c());
            return null;
        }
    }
    return null;
};
