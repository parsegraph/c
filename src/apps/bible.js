function parsegraph_BibleWidget(belt, world) {
  this.belt = belt;
  this.world = world;
  this._nextRequest = null;
  this._requestSent = false;
  this._loadedData = {};
}

parsegraph_BibleWidget.prototype.setNextRequest = function(nextRequest) {
  if (this._nextRequest) {
    throw new Error('Refusing to overwrite next request');
  }
  this._nextRequest = nextRequest;
};

parsegraph_BibleWidget.prototype.clearNextRequest = function() {
  this._nextRequest = null;
};

parsegraph_BibleWidget.prototype.getNextRequest = function() {
  return this._nextRequest;
};

parsegraph_BibleWidget.prototype.callNextRequest = function() {
  this._nextRequest();
};

parsegraph_BibleWidget.prototype.getRequestSent = function() {
  // console.log("Getting request sent. Value=" + this._requestSent);
  return this._requestSent;
};

parsegraph_BibleWidget.prototype.setRequestSent = function() {
  if (this._requestSent) {
    throw new Error('Sent request flag cannot be set again');
  }
  // console.log("Setting request sent");
  this._requestSent = true;
};

parsegraph_BibleWidget.prototype.clearRequestSent = function() {
  // console.log("Clearing request sent");
  this._requestSent = false;
};

parsegraph_BibleWidget.prototype.tick = function() {
  if (!this.getNextRequest() && !this.getRequestSent()) {
    // console.log("No next request");
    return false;
  }
  if (this.getRequestSent()) {
    // console.log("Awaiting response from request");
    return true;
  }
  if (this.getNextRequest()) {
    // console.log("Invoking request");
    this.callNextRequest();
  }
  return true;
};

parsegraph_BibleWidget.prototype.parseChapter = function(chapterText) {
  const data = {paragraphs: []};
  chapterText.split('¶').forEach(function(paragraph, paraIndex) {
    const lines = paragraph.split('\n');
    if (paraIndex === 0) {
      data.book = lines.shift();
      data.chapter = lines.shift();
    }
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      if (line.match(/^\s*$/)) {
        lines.splice(i--, 1);
        continue;
      }
    }
    data.paragraphs.push(lines);
  });
  return data;
};

parsegraph_BibleWidget.prototype.preload = function(
    callback,
    callbackThisArg,
) {
  if (this.getNextRequest() || this.getRequestSent()) {
    throw new Error('Request already in progress');
  }
  const xhr = new XMLHttpRequest();
  const that = this;
  xhr.addEventListener('load', function() {
    this.responseText.split('@EOB@\n').forEach(function(bookText) {
      bookText.split('@EOC@\n').forEach(function(chapterText) {
        chapterText = chapterText.trim();
        if (chapterText.length === 0) {
          return;
        }
        const filename = chapterText.substring(0, chapterText.indexOf('\n'));
        const bookMatch = filename.match(/^eng-kjv2006_([0-9]+_...)_([0-9]+)/);
        if (!bookMatch) {
          // console.log(chapterText);
          throw new Error('Failed to read book filename: ' + filename);
        }
        const book = bookMatch[1];
        const chap = bookMatch[2];
        chapterText = chapterText.substring(chapterText.indexOf('\n') + 1);
        const data = that.parseChapter(chapterText);
        if (!that._loadedData[book]) {
          that._loadedData[book] = {};
        }
        that._loadedData[book][chap] = data;
      });
    });
    // console.log("Bible preloaded");
    that.clearNextRequest();
    that.clearRequestSent();
    if (callback) {
      callback.call(callbackThisArg);
    }
  });
  xhr.open('GET', '/bible/bible.txt');
  this.setNextRequest(function() {
    xhr.send();
    that.setRequestSent();
  });
};

parsegraph_BibleWidget.prototype.loadChapter = function(
    book,
    chap,
    callback,
    callbackThisArg,
) {
  if (this.getNextRequest() || this.getRequestSent()) {
    throw new Error(
        'Request already in progress: (next=' +
        this.getNextRequest() +
        ', sent=' +
        this.getRequestSent() +
        ')',
    );
  }
  if (typeof chap === 'number' && chap < 10) {
    chap = '0' + chap;
  }
  // console.log("Loading chapter: " + book + ", " + chap);
  const that = this;
  if (this._loadedData[book] && this._loadedData[book][chap]) {
    // console.log("Using cached chapter.");
    that.setNextRequest(function() {
      // console.log("Returning cached chapter");
      if (callback) {
        callback.call(callbackThisArg, that._loadedData[book][chap]);
      }
    });
    return;
  }
  // console.log("Using chapter from web");
  const xhr = new XMLHttpRequest();
  xhr.addEventListener('load', function() {
    const verseCount = 1;
    const data = that.parseChapter(this.responseText);
    if (!that._loadedData[book]) {
      that._loadedData[book] = {};
    }
    that._loadedData[book][chap] = data;
    if (callback) {
      callback.call(callbackThisArg, data);
    }
  });

  xhr.open('GET', '/bible/eng-kjv2006_' + book + '_' + chap + '_read.txt');
  this.setNextRequest(function() {
    // console.log("Retrieving chapter from web");
    xhr.send();
    that.setRequestSent();
  });
  return xhr;
};

parsegraph_BibleWidget.prototype.getChapter = function(
    caret,
    book,
    chap,
    callback,
    callbackThisArg,
) {
  const belt = this.belt;
  const world = this.world;
  const that = this;
  this.loadChapter(book, chap, function(data) {
    // console.log("Received " + book + " " + chap);
    let verseCount = 1;
    caret.push();
    data.paragraphs.forEach(function(paragraph, paraIndex) {
      if (paraIndex === 0) {
        caret.spawnMove('d', 'b');
        caret.label(data.book);
        caret.spawnMove('d', 'b');
        caret.label(data.chapter);
      }
      caret.spawnMove('d', 'u');
      caret.push();
      caret.spawnMove('f', 'u');
      paragraph.forEach(function(verse, i) {
        if (i > 0) {
          caret.spawnMove('d', 'u');
        }
        caret.label(verseCount++);
        caret.push();
        caret.pull('f');
        caret.spawnMove('f', paraIndex % 2 === 0 ? 's' : 'b');
        caret.label(verse);
        caret.pop();
      });
      caret.pop();
    });
    caret.pop();
    belt.scheduleUpdate();
    world.scheduleRepaint();
    that.clearNextRequest();
    that.clearRequestSent();
    if (callback) {
      callback.call(callbackThisArg);
    }
  });
};

parsegraph_BibleWidget.prototype.getAllChapters = function(
    caret,
    book,
    maxChaps,
    callback,
    callbackThisArg,
) {
  let chapNum = 1;
  var cont = function() {
    if (chapNum > maxChaps) {
      if (callback) {
        callback.call(callbackThisArg);
      }
      return;
    }
    if (chapNum > 1) {
      caret.spawnMove('f', 'u');
    }
    caret.crease();
    caret.pull('d');
    let chap = chapNum;
    if (maxChaps > 99) {
      if (chapNum < 10) {
        chap = '00' + chapNum;
      } else if (chapNum < 100) {
        chap = '0' + chapNum;
      } else {
        chap = '' + chapNum;
      }
    }
    ++chapNum;
    this.getChapter(caret, book, chap, cont, this);
  };
  cont.call(this);
  return function() {
    chap = maxChaps + 1;
  };
};

parsegraph_BibleWidget.prototype.getAllBooks = function(
    caret,
    booksAndChaps,
    callback,
    callbackThisArg,
) {
  let bookIndex = 0;
  var cont = function() {
    if (bookIndex >= booksAndChaps.length) {
      caret.pop();
      if (callback) {
        callback.call(callbackThisArg);
      }
      return;
    }
    const book = booksAndChaps[bookIndex][0];
    const maxChaps = booksAndChaps[bookIndex][1];
    if (bookIndex > 0) {
      caret.pop();
      caret.spawnMove('d', 'u');
    }
    ++bookIndex;
    caret.crease();
    caret.pull('f');
    caret.push();
    caret.spawnMove('f', 'u');
    this.getAllChapters(caret, book, maxChaps, cont, this);
  };
  cont.call(this);
  return function() {
    bookIndex = booksAndChaps.length;
  };
};

parsegraph_BibleWidget.prototype.getOldTestament = function(
    caret,
    callback,
    callbackThisArg,
) {
  return this.getAllBooks(
      caret,
      [
        ['002_GEN', 50],
        ['003_EXO', 40],
        ['004_LEV', 27],
        ['005_NUM', 36],
        ['006_DEU', 34],
        ['007_JOS', 24],
        ['008_JDG', 21],
        ['009_RUT', 4],
        ['010_1SA', 31],
        ['011_2SA', 24],
        ['012_1KI', 22],
        ['013_2KI', 25],
        ['014_1CH', 29],
        ['015_2CH', 36],
        ['016_EZR', 10],
        ['017_NEH', 13],
        ['018_EST', 10],
        ['019_JOB', 42],
        ['020_PSA', 150],
        ['021_PRO', 31],
        ['022_ECC', 12],
        ['023_SNG', 8],
        ['024_ISA', 66],
        ['025_JER', 52],
        ['026_LAM', 5],
        ['027_EZK', 48],
        ['028_DAN', 12],
        ['029_HOS', 14],
        ['030_JOL', 3],
        ['031_AMO', 9],
        ['032_OBA', 1],
        ['033_JON', 4],
        ['034_MIC', 7],
        ['035_NAM', 3],
        ['036_HAB', 3],
        ['037_ZEP', 3],
        ['038_HAG', 2],
        ['039_ZEC', 14],
        ['040_MAL', 4],
      ],
      callback,
      callbackThisArg,
  );
};

parsegraph_BibleWidget.prototype.getNewTestament = function(
    caret,
    callback,
    callbackThisArg,
) {
  return this.getAllBooks(
      caret,
      [
        ['070_MAT', 28],
        ['071_MRK', 16],
        ['072_LUK', 24],
        ['073_JHN', 21],
        ['074_ACT', 28],
        ['075_ROM', 16],
        ['076_1CO', 16],
        ['077_2CO', 13],
        ['078_GAL', 6],
        ['079_EPH', 6],
        ['080_PHP', 4],
        ['081_COL', 4],
        ['082_1TH', 5],
        ['083_2TH', 3],
        ['084_1TI', 6],
        ['085_2TI', 4],
        ['086_TIT', 3],
        ['087_PHM', 1],
        ['088_HEB', 13],
        ['089_JAS', 5],
        ['090_1PE', 5],
        ['091_2PE', 3],
        ['092_1JN', 5],
        ['093_2JN', 1],
        ['094_3JN', 1],
        ['095_JUD', 1],
        ['096_REV', 22],
      ],
      callback,
      callbackThisArg,
  );
};
