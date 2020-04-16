function parsegraph_BibleWidget(belt, world)
{
    this.belt = belt;
    this.world = world;
    this._nextRequest = null;
    this._requestInProgress = false;
}

parsegraph_BibleWidget.prototype.tick = function()
{
    if(!this._nextRequest && !this._requestInProgress) {
        console.log("No next request");
        return false;
    }
    if(this._requestInProgress) {
        return true;
    }
    if(this._nextRequest) {
        this._nextRequest.send();
        this._requestInProgress = true;
    }
    return true;
};

parsegraph_BibleWidget.prototype.getChapter = function(caret, book, chap, callback, callbackThisArg) {
    var xhr = new XMLHttpRequest();
    var belt = this.belt;
    var world = this.world;
    var that = this;
    xhr.addEventListener("load", function() {
        var verseCount = 1;
        caret.push();
        this.responseText.split("¶").forEach(function(paragraph, paraIndex) {
            var lines = paragraph.split("\n");
            if(paraIndex === 0) {
                var title = lines[0];
                var chapterTitle = lines[1];
                lines.splice(0, 2);
                caret.spawnMove('d', 'b');
                caret.label(title);
                caret.spawnMove('d', 'b');
                caret.label(chapterTitle);
            }
            caret.spawnMove('d', 'u');
            caret.push();
            caret.spawnMove('f', 'u');
            lines.forEach(function(line, i) {
                if(line.match(/^\s*$/)) {
                    return;
                }
                if(i > 0) {
                    caret.spawnMove('d', 'u');
                }
                caret.label(verseCount++);
                caret.push();
                caret.pull('f');
                caret.spawnMove('f', paraIndex % 2 === 0 ? 's' : 'b');
                caret.label(line);
                caret.pop();
            });
            caret.pop();
        });
        caret.pop();
        belt.scheduleUpdate();
        world.scheduleRepaint();
        that._nextRequest = null;
        that._requestInProgress = false;
        if(callback) {
            callback.call(callbackThisArg);
        }
    });

    if(typeof chap === "number" && chap < 10) {
        chap = "0" + chap;
    }
    xhr.open("GET", "/bible/eng-kjv2006_" + book + "_" + chap + "_read.txt");
    if(this._nextRequest) {
        throw new Error("Request already in progress");
    }
    this._nextRequest = xhr;
    return xhr;
};

parsegraph_BibleWidget.prototype.getAllChapters = function(caret, book, maxChaps, callback, callbackThisArg)
{
    var chapNum = 1;
    var cont = function() {
        if(chapNum > maxChaps) {
            if(callback) {
                callback.call(callbackThisArg);
            }
            return;
        }
        if(chapNum > 1) {
            caret.spawnMove('f', 'u');
        }
        caret.crease();
        caret.pull('d');
        var chap = chapNum;
        if(maxChaps > 99) {
            if(chapNum < 10) {
                chap = "00" + chapNum;
            }
            else if(chapNum < 100) {
                chap = "0" + chapNum;
            }
            else {
                chap = "" + chapNum;
            }
        }
        ++chapNum;
        this.getChapter(caret, book, chap, cont, this);
    };
    cont.call(this);
    return function() {
        chap = maxChaps + 1;
    }
};

parsegraph_BibleWidget.prototype.getAllBooks = function(caret, booksAndChaps, callback, callbackThisArg)
{
    var bookIndex = 0;
    var cont = function() {
        if(bookIndex >= booksAndChaps.length) {
            caret.pop();
            if(callback) {
                callback.call(callbackThisArg);
            }
            return;
        }
        var book = booksAndChaps[bookIndex][0];
        var maxChaps = booksAndChaps[bookIndex][1];
        if(bookIndex > 0) {
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
    }
};

parsegraph_BibleWidget.prototype.getOldTestament = function(caret, callback, callbackThisArg)
{
    return this.getAllBooks(caret, [
        ["002_GEN", 50],
        ["003_EXO", 40],
        ["004_LEV", 27],
        ["005_NUM", 36],
        ["006_DEU", 34],
        ["007_JOS", 24],
        ["008_JDG", 21],
        ["009_RUT", 4],
        ["010_1SA", 31],
        ["011_2SA", 24],
        ["012_1KI", 22],
        ["013_2KI", 25],
        ["014_1CH", 29],
        ["015_2CH", 36],
        ["016_EZR", 10],
        ["017_NEH", 13],
        ["018_EST", 10],
        ["019_JOB", 42],
        ["020_PSA", 150],
        ["021_PRO", 31],
        ["022_ECC", 12],
        ["023_SNG", 8],
        ["024_ISA", 66],
        ["025_JER", 52],
        ["026_LAM", 5],
        ["027_EZK", 48],
        ["028_DAN", 12],
        ["029_HOS", 14],
        ["030_JOL", 3],
        ["031_AMO", 9],
        ["032_OBA", 1],
        ["033_JON", 4],
        ["034_MIC", 7],
        ["035_NAM", 3],
        ["036_HAB", 3],
        ["037_ZEP", 3],
        ["038_HAG", 2],
        ["039_ZEC", 14],
        ["040_MAL", 4],
    ], callback, callbackThisArg);
};

parsegraph_BibleWidget.prototype.getNewTestament = function(caret, callback, callbackThisArg)
{
    return this.getAllBooks(caret, [
        ["070_MAT", 28],
        ["071_MRK", 16],
        ["072_LUK", 24],
        ["073_JHN", 21],
        ["074_ACT", 28],
        ["075_ROM", 16],
        ["076_1CO", 16],
        ["077_2CO", 13],
        ["078_GAL", 6],
        ["079_EPH", 6],
        ["080_PHP", 4],
        ["081_COL", 4],
        ["082_1TH", 5],
        ["083_2TH", 3],
        ["084_1TI", 6],
        ["085_2TI", 4],
        ["086_TIT", 3],
        ["087_PHM", 1],
        ["088_HEB", 13],
        ["089_JAS", 5],
        ["090_1PE", 5],
        ["091_2PE", 3],
        ["092_1JN", 5],
        ["093_2JN", 1],
        ["094_3JN", 1],
        ["095_JUD", 1],
        ["096_REV", 22]
    ], callback, callbackThisArg);
};

