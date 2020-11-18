{
  const ltrChars =
    'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' +
    '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';
  const rtlChars = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
  const rtlDirCheck = new RegExp('^[^' + ltrChars + ']*[' + rtlChars + ']');

  // eslint-disable-next-line require-jsdoc, no-unused-vars
  function isRTL(s) {
    return rtlDirCheck.test(s);
  }
}

// eslint-disable-next-line require-jsdoc
export default function Unicode() {
  this.unicodeProperties = {};
  this.unicodeBidiCounts = {};
  this.unicodeCategoryCounts = {};
}

let UNICODE_INSTANCE = null;
const UNICODE_STORAGE = localStorage;

// eslint-disable-next-line require-jsdoc
export function defaultUnicode() {
  if (!UNICODE_INSTANCE) {
    UNICODE_INSTANCE = new Unicode();
    // UNICODE_INSTANCE.load();
    UNICODE_INSTANCE.load(null, UNICODE_STORAGE);
  }
  return UNICODE_INSTANCE;
}

// eslint-disable-next-line require-jsdoc
export function setDefaultUnicode(unicode) {
  UNICODE_INSTANCE = unicode;
}

Unicode.prototype.get = function(codeOrLetter) {
  if (typeof codeOrLetter === 'number') {
    return this.unicodeProperties[codeOrLetter];
  }
  return this.unicodeProperties[codeOrLetter.charCodeAt(0)];
};

{
  // SemanticCodeValue:[Isolated, Initial, Medial, Final].
  // Use null for non-applicable.
  const unicodeCursiveMap = {
    0x627: [0xfe8d, null, null, 0xfe8e], // ALEF
    0x628: [0xfe8f, 0xfe91, 0xfe92, 0xfe90], // BEH
    0x629: [0xfe93, null, null, 0xfe94], // MARBUTA
    0x62a: [0xfe95, 0xfe97, 0xfe98, 0xfe96], // TEH
    0x62b: [0xfe99, 0xfe9b, 0xfe9c, 0xfe9a], // THEH
    0x62c: [0xfe9d, 0xfe9f, 0xfea0, 0xfe9e], // JEEM
    0x62d: [0xfea1, 0xfea3, 0xfea4, 0xfea2], // HAH
    0x62e: [0xfea5, 0xfea7, 0xfea8, 0xfea6], // KHAH
    0x62f: [0xfea9, null, null, 0xfeaa], // DAL
    0x630: [0xfeab, null, null, 0xfeac], // THAL
    0x631: [0xfead, null, null, 0xfeae], // REH
    0x632: [0xfeaf, null, null, 0xfeb0], // ZAIN
    0x633: [0xfeb1, 0xfeb3, 0xfeb4, 0xfeb2], // SEEN
    0x634: [0xfeb5, 0xfeb7, 0xfeb8, 0xfeb6], // SHEEN
    0x635: [0xfeb9, 0xfebb, 0xfebc, 0xfeba], // SAD
    0x636: [0xfebd, 0xfebf, 0xfec0, 0xfebe], // DAD
    0x637: [0xfec1, 0xfec3, 0xfec4, 0xfec2], // TAH
    0x638: [0xfec5, 0xfec7, 0xfec8, 0xfec6], // ZAH
    0x639: [0xfec9, 0xfecb, 0xfecc, 0xfeca], // AIN
    0x63a: [0xfecd, 0xfecf, 0xfed0, 0xfece], // GHAIN
    0x641: [0xfed1, 0xfed3, 0xfed4, 0xfed2], // FEH
    0x642: [0xfed5, 0xfed7, 0xfed8, 0xfed6], // QAF
    0x643: [0xfed9, 0xfedb, 0xfedc, 0xfeda], // KAF
    0x644: [0xfedd, 0xfedf, 0xfee0, 0xfede], // LAM
    0x645: [0xfee1, 0xfee3, 0xfee4, 0xfee2], // MEEM
    0x646: [0xfee5, 0xfee7, 0xfee8, 0xfee6], // NOON
    0x647: [0xfee9, 0xfeeb, 0xfeec, 0xfeea], // HEH
    0x648: [0xfeed, null, null, 0xfeee], // WAW
    0x64a: [0xfef1, 0xfef3, 0xfef4, 0xfef2], // YEH,
  };

  Unicode.prototype.getCursiveMapping = function(t) {
    if (typeof t !== 'number') {
      t = t.charCodeAt(0);
    }
    return unicodeCursiveMap[t];
  };
}

Unicode.prototype.getGlyphDirection = function(text) {
  const directions = {};
  'L LRE LRO EN ES ET'.split(' ').forEach((cat)=>{
    // Left-to-right.
    directions[cat] = 'L';
  });
  'R AL AN RLE RLO'.split(' ').forEach((cat)=>{
    // Right-to-left
    directions[cat] = 'R';
  });
  'PDF CS ON WS BN S NSM B'.split(' ').forEach((cat)=>{
    // Neutral characters
    directions[cat] = null;
  });
  const data = this.get(text);
  if (!data) {
    return null;
  }
  const dir = directions[data[UNICODE_bidirectionalCategory]];
  if (dir === undefined) {
    throw new Error(
        'Unrecognized character: \\u' +
      glyphData.letter.charCodeAt(0).toString(16),
    );
  }
  return dir;
};

Unicode.prototype.cursive = function(
    givenLetter,
    prevLetter,
    nextLetter,
) {
  const cursiveMapping = this.getCursiveMapping(givenLetter);
  if (!cursiveMapping) {
    return null;
  }
  let prevCursiveMapping = null;
  if (prevLetter) {
    prevCursiveMapping = this.getCursiveMapping(prevLetter);
  }
  if (!prevCursiveMapping) {
    prevLetter = null;
  }
  let nextCursiveMapping = null;
  if (nextLetter) {
    nextCursiveMapping = this.getCursiveMapping(nextLetter);
  }
  if (!nextCursiveMapping) {
    nextLetter = null;
  }

  if (nextLetter) {
    if (prevLetter && prevCursiveMapping[1]) {
      if (cursiveMapping[2]) {
        givenLetter = cursiveMapping[2]; // medial
      } else {
        givenLetter = cursiveMapping[0]; // isolated
      }
    } else {
      // Next is, but previous wasn't.
      if (cursiveMapping[1]) {
        givenLetter = cursiveMapping[1]; // initial
      } else {
        givenLetter = cursiveMapping[0]; // isolated
      }
    }
  } else if (prevLetter) {
    if (cursiveMapping[3]) {
      givenLetter = cursiveMapping[3]; // final
    } else {
      givenLetter = cursiveMapping[0]; // isolated
    }
  } else {
    givenLetter = cursiveMapping[0]; // isolated
  }

  return givenLetter;
};

let i = 0;
const UNICODE_CODE_VALUE = i++;
// const UNICODE_characterName = i++;
const UNICODE_GENERAL_CATEGORY = i++;
// const UNICODE_canonicalCombiningClasses = i++;
const UNICODE_BIDIRECTIONAL_CATEGORY = i++;
// const UNICODE_decompositionMapping = i++;
// const UNICODE_decimalDigitValue = i++;
// const UNICODE_digitValue = i++;
// const UNICODE_numericValue = i++;
// const UNICODE_mirrored = i++;
// const UNICODE_unicode10Name = i++;
// const UNICODE_commentField = i++;
// const UNICODE_uppercaseMapping = i++;
// const UNICODE_lowercaseMapping = i++;
// const UNICODE_titlecaseMapping = i++;

Unicode.prototype.loadFromString = function(t) {
  let lines = 0;
  let start = 0;
  const ws = /[\n\r]/;
  for (let i = 0; i < t.length; ++i) {
    if (ws.test(t[i])) {
      const charData = t.substring(start, i).split(';');
      if (lines < 100) {
        // console.log(charData);
      }
      start = i + 1;
      ++lines;

      const charNamedData = [
        parseInt(charData[0], 16), // codeValue
        // charData[1], // characterName
        charData[2], // generalCategory
        // charData[3], // canonicalCombiningClasses
        charData[4], // bidirectionalCategory
        // charData[5], // decompositionMapping
        // parseInt(charData[6]), // decimalDigitValue
        // parseFloat(charData[7]), // digitValue
        // charData[8], // numericValue
        // charData[9], // mirrored
        // charData[10], // unicode10Name
        // charData[11], // commentField
        // parseInt(charData[12], 16), // uppercaseMapping
        // parseInt(charData[13], 16), // lowercaseMapping
        // parseInt(charData[14], 16) // titlecaseMapping
      ];
      this.unicodeProperties[charNamedData[UNICODE_CODE_VALUE]] = charNamedData;

      if (!(charNamedData.bidirectionalCategory in this.unicodeBidiCounts)) {
        this.unicodeBidiCounts[
            charNamedData[UNICODE_BIDIRECTIONAL_CATEGORY]
        ] = 1;
      } else {
        ++this.unicodeBidiCounts[charNamedData[UNICODE_BIDIRECTIONAL_CATEGORY]];
      }
      if (!(charNamedData.generalCategory in this.unicodeCategoryCounts)) {
        this.unicodeCategoryCounts[charNamedData[UNICODE_GENERAL_CATEGORY]] = 1;
      } else {
        ++this.unicodeCategoryCounts[charNamedData[UNICODE_GENERAL_CATEGORY]];
      }
    }
  }
  // console.log("Text received: " + t.length + " bytes, " + lines + " lines");
};

Unicode.prototype.isArabic = function(letter) {
  if (typeof letter !== 'number') {
    letter = letter.charCodeAt(0);
  }
  const data = this.get(letter);
  if (!data) {
    return false;
  }
  const cv = data[UNICODE_codeValue];
  return cv >= 0x621 && cv <= 0x64a;
};

Unicode.prototype.isMark = function(letter) {
  if (typeof letter !== 'number') {
    letter = letter.charCodeAt(0);
  }
  const data = this.get(letter);
  if (!data) {
    return false;
  }
  const cat = data[UNICODE_generalCategory];
  return cat === 'Mn' || cat === 'Mc' || cat === 'Me';
};

Unicode.prototype.isArabicDiacritic = function(letter) {
  if (typeof letter !== 'number') {
    letter = letter.charCodeAt(0);
  }
  const data = this.get(letter);
  if (!data) {
    return false;
  }
  const cv = data[UNICODE_codeValue];
  return cv >= 0x621 && cv <= 0x64a;
};

Unicode.prototype.load = function(dbURL, storage) {
  if (this._loaded) {
    return;
  }
  // console.log(new Error("LOADING UNICODE"));
  if (!dbURL) {
    dbURL = '/UnicodeData.txt';
  }
  const storageKey = 'UNICODE@' + dbURL;
  const that = this;
  const complete = function() {
    // console.log("Time till unicode parsed: " +
    // parsegraph_elapsed(parsegraph_START_TIME));
    that._loaded = true;
    if (that.onLoad) {
      that.onLoad();
    }
    if (that._onLoad) {
      that._onLoad.call(that._onLoadThisArg || this);
    }
  };
  if (storage) {
    let unicode = storage.getItem(storageKey);
    if (unicode) {
      try {
        unicode = JSON.parse(unicode);
        this.unicodeProperties = unicode.unicodeProperties;
        this.unicodeBidiCounts = unicode.unicodeBidiCounts;
        this.unicodeCategorycounts = unicode.unicodeCategorycounts;
        complete.call(this);
        return;
      } catch (ex) {
        console.log('Failed to read stored Unicode data');
        console.log(ex);
        storage.removeItem(storageKey);
      }
    }
  }
  const xhr = new XMLHttpRequest();
  xhr.open('GET', dbURL);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4 && xhr.status == 200) {
      // console.log("Time till unicode received: " +
      // parsegraph_elapsed(parsegraph_START_TIME));
      that.loadFromString(xhr.responseText);
      complete.call(that);
      if (storage) {
        const unicodeData = {
          unicodeCategoryCounts: that.unicodeCategoryCounts,
          unicodeBidiCounts: that.unicodeBidiCounts,
          unicodeProperties: that.unicodeProperties,
        };
        try {
          storage.setItem(storageKey, JSON.stringify(unicodeData));
        } catch (ex) {
          console.log(ex);
        }
      }
    } else {
      // console.log("Receiving " + xhr.readyState + "\n" +
      // xhr.responseText.length + " bytes received.\nTime: "
      // + new Date().getTime()/1000);
    }
  };
  xhr.send();
};

Unicode.prototype.loaded = function() {
  return this._loaded;
};

Unicode.prototype.setOnLoad = function(onLoad, onLoadThisArg) {
  if (this._loaded) {
    throw new Error('Unicode character database is already loaded');
  }
  this._onLoad = onLoad;
  this._onLoadThisArg = onLoadThisArg;
};
