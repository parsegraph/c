// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
function getWholeChar(str, i) {
  const code = str.charCodeAt(i);

  if (Number.isNaN(code)) {
    return ''; // Position not found
  }
  if (code < 0xd800 || code > 0xdfff) {
    return str.charAt(i);
  }

  // High surrogate (could change last hex to 0xDB7F to treat high private
  // surrogates as single characters)
  if (0xd800 <= code && code <= 0xdbff) {
    if (str.length <= i + 1) {
      throw 'High surrogate without following low surrogate';
    }
    const next = str.charCodeAt(i + 1);
    if (0xdc00 > next || next > 0xdfff) {
      throw 'High surrogate without following low surrogate';
    }
    return str.charAt(i) + str.charAt(i + 1);
  }
  // Low surrogate (0xDC00 <= code && code <= 0xDFFF)
  if (i === 0) {
    throw 'Low surrogate without preceding high surrogate';
  }
  const prev = str.charCodeAt(i - 1);

  // (could change last hex to 0xDB7F to treat high private
  // surrogates as single characters)
  if (0xd800 > prev || prev > 0xdbff) {
    throw 'Low surrogate without preceding high surrogate';
  }
  // We can pass over low surrogates now as the second component
  // in a pair which we have already processed
  return false;
}

parsegraph_json_EOF = 0;
parsegraph_json_EOL = 1;
parsegraph_json_LCURLY = 2;
parsegraph_json_RCURLY = 3;
parsegraph_json_LBRACK = 4;
parsegraph_json_RBRACK = 5;
parsegraph_json_COLON = 6;
parsegraph_json_COMMA = 7;
parsegraph_json_STRING = 8;
parsegraph_json_NUMBER = 9;
parsegraph_json_NULL = 10;
parsegraph_json_TRUE = 11;
parsegraph_json_FALSE = 12;

function parsegraph_json_Token(type, value) {
  this._type = type;
  this._value = value;
}

function parsegraph_json_error() {
  this._errorType = 0;
  this._listId = 0;
  this._message = '';
  this._next = null;
}

function parsegraph_nameTokenType(tokenType) {
  switch (tokenType) {
    case parsegraph_json_TRUE:
      return 'TRUE';
    case parsegraph_json_FALSE:
      return 'FALSE';
    case parsegraph_json_NULL:
      return 'NULL';
    case parsegraph_json_EOF:
      return 'EOF';
    case parsegraph_json_COMMA:
      return 'COMMA';
    case parsegraph_json_COLON:
      return 'COLON';
    case parsegraph_json_LBRACK:
      return 'LBRACK';
    case parsegraph_json_RBRACK:
      return 'RBRACK';
    case parsegraph_json_LCURLY:
      return 'LCURLY';
    case parsegraph_json_RCURLY:
      return 'RCURLY';
    case parsegraph_json_STRING:
      return 'STRING';
    case parsegraph_json_NUMBER:
      return 'NUMBER';
    case parsegraph_json_EOL:
      return 'EOL';
  }
  return 0;
}

function parsegraph_json_Lexer() {
  this._strings = [];
  this._strIndex = 0;
  this._index = 0;
  this._c = null;

  this._firstError = null;
  this._errorHead = null;
}

parsegraph_json_Lexer.prototype.feed = function(str) {
  this._strings.push(str);
  // Prime if the lexer was empty.
  if (this._strings.length === 1 || this._c === null) {
    return this.consume();
  }
};

parsegraph_json_Lexer.prototype.save = function() {
  this._lastIndex = this._index;
  this._lastStrIndex = this._strIndex;
};

parsegraph_json_Lexer.prototype.rollback = function() {
  this._index = this._lastIndex;
  this._strIndex = this._lastStrIndex;
};

parsegraph_json_Lexer.prototype.commit = function() {
  this._lastIndex = null;
  this._lastStrIndex = null;

  while (this._strIndex > 0) {
    this._strIndex--;
    this._strings.shift();
  }
};

parsegraph_json_Lexer.prototype.consume = function() {
  while (true) {
    if (this._strIndex >= this._strings.length) {
      break;
    }
    if (this._index >= this._strings[this._strIndex].length) {
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

parsegraph_json_Lexer.prototype.c = function() {
  return this._c;
};

parsegraph_json_Lexer.prototype.match = function(expected) {
  if (this._c === expected) {
    return this.consume();
  }
  return null;
};

parsegraph_json_Lexer.prototype.error = function(str) {
  const err = new parsegraph_json_error();
  err._message = str;
  err._errorType = 0;
  err._listId = 0;
  err._next = 0;
  if (this._errorHead) {
    this._errorHead._next = err;
  } else {
    this._firstError = err;
  }
  this._errorHead = err;

  return err;
};

parsegraph_json_MAX_NAME_LENGTH = 1024;
parsegraph_json_MAX_STRING_LENGTH = 4096;

parsegraph_json_Lexer.prototype.isLETTER = function() {
  if (this.c() !== null && this.c().match(/[a-zA-Z]/)) {
    return 1;
  }
  return 0;
};

parsegraph_json_Lexer.prototype.isDIGIT = function() {
  if (this.c() !== null && this.c().match(/\d/)) {
    return 1;
  }
  return 0;
};

parsegraph_json_Lexer.prototype.isWS = function() {
  const c = this.c();
  if (c !== null && c.match(/\s/)) {
    return 1;
  }
  return 0;
};

parsegraph_json_Lexer.prototype.isNEWLINE = function() {
  const c = this.c();
  if (c !== null && (c === '\r' || c === '\n')) {
    return 1;
  }
  return 0;
};

parsegraph_json_Lexer.prototype.VALUE = function(expected) {
  let rv = '';
  const i = 0;
  while (this.isLETTER(lexer)) {
    rv += this.c(lexer);
    if (null === this.consume(lexer)) {
      return null;
    }
  }

  if ('true' === rv) {
    return new parsegraph_json_Token(parsegraph_json_TRUE);
  }
  if ('false' === rv) {
    return new parsegraph_json_Token(parsegraph_json_FALSE);
  }
  if ('null' === rv) {
    return new parsegraph_json_Token(parsegraph_json_NULL);
  }

  this.error('Unexpected bareword');
  return null;
};

parsegraph_json_Lexer.prototype.WS = function() {
  while (this.isWS() != 0 && !this.isNEWLINE()) {
    if (null === this.consume(lexer)) {
      return null;
    }
  }
  return true;
};

parsegraph_json_Lexer.prototype.NUMBER = function() {
  this.save();

  let rv = '';
  let i = 0;
  let c = this.c();

  if (c === '-') {
    // Minus sign.
    rv += c;
    ++i;
    if (null === this.consume()) {
      this.rollback();
      return null;
    }
    c = this.c();
  }

  if (c.match(/\d/)) {
    // Nonzero integer part.
    while (c.match(/\d/)) {
      rv += c;
      ++i;
      if (null === this.consume()) {
        this.rollback();
        return null;
      }
      c = this.c();
    }
  } else if (c === '0') {
    // Zero integer part.
    rv += c;
    ++i;
    if (null === this.consume()) {
      this.rollback();
      return null;
    }
    c = this.c();
  } else {
    this.error('Unexpected start of numeric literal');
    return null;
  }

  if (c === '.') {
    // Fractional part.
    rv += c;
    ++i;
    if (!this.consume()) {
      this.error('Unexpected end of fractional part');
      return null;
    }
    while (1) {
      c = this.c();
      if (!c.match(/\d/)) {
        break;
      }
      rv += c;
      ++i;
      if (null === this.consume()) {
        this.rollback();
        return null;
      }
    }
  }

  if (c === 'e' || c === 'E') {
    // Scientific notation.
    rv += c;
    ++i;
    if (!this.consume()) {
      this.error('Unexpected end of scientific notation');
      return null;
    }
    c = this.c();
    if (c === '+' || c === '-') {
      rv += c;
      ++i;
      if (!this.consume()) {
        this.error('Unexpected end of scientific notation');
        return null;
      }
    }
    while (c.match(/\d/)) {
      rv += c;
      ++i;
      if (null === this.consume()) {
        this.rollback();
        return null;
      }
      c = this.c();
    }
  }

  this.commit();
  return new parsegraph_json_Token(parsegraph_json_NUMBER, rv);
};

parsegraph_json_Lexer.prototype.STRING = function() {
  this.save();
  const quote = this.c();
  if (null === this.consume()) {
    this.rollback();
    return null;
  }
  let str = '';
  let i = 0;
  while (i < parsegraph_json_MAX_STRING_LENGTH) {
    const c = this.c();
    if (c == quote) {
      this.consume();
      break;
    }
    if (c == '\\') {
      // Skip the next two symbols.
      str[i++] = c;
      if (null === this.consume()) {
        this.rollback();
        return null;
      }
      if (i >= parsegraph_json_MAX_STRING_LENGTH) {
        this.error('String too long');
        return null;
      }
      str += this.c();
      ++i;
      if (null === this.consume()) {
        this.rollback();
        return null;
      }
      continue;
    }
    str += this.c();
    ++i;
    if (null === this.consume()) {
      this.rollback();
      return null;
    }
  }
  this.commit();
  return new parsegraph_json_Token(parsegraph_json_STRING, str);
};

parsegraph_json_Lexer.prototype.nextToken = function() {
  let matched;
  var c;
  while ((c = this.c()) != null) {
    switch (c) {
      case '"':
        return this.STRING();
      case ' ':
      case '\t':
        {
          var c = this.c();
          while (c !== null && (c === ' ' || c === '\t')) {
            if (null === this.consume()) {
              return null;
            }
            c = this.c();
          }
        }
        continue;
      case '\r':
      case '\n': {
        this.save();
        var c = this.c();
        while (c !== 0 && (c === '\r' || c === '\n')) {
          if (null === this.consume()) {
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
        if (this.c() === '-' || this.isDIGIT()) {
          return this.NUMBER();
        }
        if (this.isLETTER()) {
          return this.NAME(0);
        }
        this.error('Invalid character: ' + this.c());
        return null;
    }
  }
  return null;
};

/*

typedef struct parsegraph_fileReloaderData {
    int fd;
    char* buf;
    size_t bufsize;
} parsegraph_fileReloaderData;

int parsegraph_fileReloader(void* reloaderData, parsegraph_json_Lexer* lexer)
{
    parsegraph_fileReloaderData* d = (parsegraph_fileReloaderData*)reloaderData;
    ssize_t numRead = read(d->fd, d->buf, d->bufsize);
    if(numRead < 0) {
        fprintf(stderr, "Error %d during read: %s\n", errno, strerror(errno));
        return 0;
    }
    if(numRead == 0) {
        // EOF
        return 0;
    }
    lexer->input = d->buf;
    lexer->len = numRead;
    return 1;
}

void parsegraph_json_parseObject(parsegraph_json_Lexer* lexer, int* listId)
{
    if(parsegraph_List_OK != parsegraph_List_appendItem(lexer->pool, lexer->dbd, parentId, parsegraph_json_ARRAY, "", arrayId)) {
        parsegraph_json_Lexer_error(lexer, "Failed to create object");
        return -1;
    }

    while(1) {
        parsegraph_json_Lexer* t = parsegraph_json_Lexer_nextToken(lexer);
        if(!t) {
            parsegraph_json_Lexer_error(lexer, "No token found");
            return -1;
        }

        switch(t->type) {
        case parsegraph_json_RCURLY:
            return 0;
        }
    }

end:
}

int parsegraph_json_parseArray(parsegraph_json_Lexer* lexer, int parentId, int* arrayId)
{
    if(parsegraph_List_OK != parsegraph_List_appendItem(lexer->pool, lexer->dbd, parentId, parsegraph_json_ARRAY, "", arrayId)) {
        parsegraph_json_Lexer_error(lexer, "Failed to create array");
        return -1;
    }

    while(1) {
        parsegraph_json_Token* t = parsegraph_json_Lexer_nextToken(lexer);
        if(!t) {
            parsegraph_json_Lexer_error(lexer, "No token found");
            return -1;
        }

        int childId;
        switch(t->type) {
        case parsegraph_json_EOF:
            parsegraph_json_Lexer_error(lexer, "Unexpected end of array");
            return 0;
        case parsegraph_json_LCURLY:
            if(!parsegraph_json_parseObject(lexer, *arrayId, &childId)) {
                return 0;
            }
            break;
        case parsegraph_json_RBRACK:
            // Complete.
            goto end;
        case parsegraph_json_LBRACK:
            if(!parsegraph_json_parseArray(lexer, *arrayId, &childId)) {
                return 0;
            }
            break;
        case parsegraph_json_EOL:
        case parsegraph_json_NULL:
        case parsegraph_json_TRUE:
        case parsegraph_json_FALSE:
            parsegraph_List_appendItem(lexer->pool, lexer->dbd, *arrayId, t->type, "", &childId);
            break;
        case parsegraph_json_STRING:
        case parsegraph_json_NUMBER:
            parsegraph_List_appendItem(lexer->pool, lexer->dbd, *arrayId, t->type, t->value, &childId);
            break;
        default:
            parsegraph_json_Lexer_error(lexer, "Unexpected token");
            return -1;
        }

        while(1) {
            t = parsegraph_json_Lexer_nextToken(lexer);
            if(!t) {
                parsegraph_json_Lexer_error(lexer, "Unexpected end of array");
                return -1;
            }
            if(t->type != parsegraph_json_EOL) {
                break;
            }
        }
        switch(t->type) {
        case parsegraph_json_COMMA:
            // Expected, continue.
            continue;
        case parsegraph_json_RBRACK:
            // End of array.
            return 0;
        default:
            parsegraph_json_Lexer_error(lexer, "Unexpected token");
            return -1;
        }
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
*/
