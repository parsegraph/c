{
  var ltrChars =
      "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF" +
      "\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF",
    rtlChars = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC",
    rtlDirCheck = new RegExp("^[^" + ltrChars + "]*[" + rtlChars + "]");
  function isRTL(s) {
    return rtlDirCheck.test(s);
  }
}

export default function parsegraph_Unicode() {
  this.unicodeProperties = {};
  this.unicodeBidiCounts = {};
  this.unicodeCategoryCounts = {};
}

let parsegraph_UNICODE_INSTANCE = null;
let parsegraph_UNICODE_STORAGE = localStorage;
export function parsegraph_defaultUnicode() {
  if (!parsegraph_UNICODE_INSTANCE) {
    parsegraph_UNICODE_INSTANCE = new parsegraph_Unicode();
    //parsegraph_UNICODE_INSTANCE.load();
    parsegraph_UNICODE_INSTANCE.load(null, parsegraph_UNICODE_STORAGE);
  }
  return parsegraph_UNICODE_INSTANCE;
}

export function parsegraph_setDefaultUnicode(unicode) {
  parsegraph_UNICODE_INSTANCE = unicode;
}

parsegraph_Unicode.prototype.get = function (codeOrLetter) {
  if (typeof codeOrLetter === "number") {
    return this.unicodeProperties[codeOrLetter];
  }
  return this.unicodeProperties[codeOrLetter.charCodeAt(0)];
};

{
  // SemanticCodeValue:[Isolated, Initial, Medial, Final]. Use null for non-applicable.
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

  parsegraph_Unicode.prototype.getCursiveMapping = function (t) {
    if (typeof t !== "number") {
      t = t.charCodeAt(0);
    }
    return unicodeCursiveMap[t];
  };
}

parsegraph_Unicode.prototype.getGlyphDirection = function (text) {
  var data = this.get(text);
  if (!data) {
    return null;
  }
  switch (data[UNICODE_bidirectionalCategory]) {
    case "L":
    case "LRE":
    case "LRO":
    case "EN":
    case "ES":
    case "ET":
      // Left-to-right.
      return "L";
    case "R":
    case "AL":
    case "AN":
    case "RLE":
    case "RLO":
      // Right-to-left
      return "R";
    case "PDF":
    case "CS":
    case "ON":
    case "WS":
    case "BN":
    case "S":
    case "NSM":
    case "B":
      // Neutral characters
      return null;
    default:
      throw new Error(
        "Unrecognized character: \\u" +
          glyphData.letter.charCodeAt(0).toString(16)
      );
  }
};

parsegraph_Unicode.prototype.cursive = function (
  givenLetter,
  prevLetter,
  nextLetter
) {
  var cursiveMapping = this.getCursiveMapping(givenLetter);
  if (!cursiveMapping) {
    return null;
  }
  var prevCursiveMapping = null;
  if (prevLetter) {
    prevCursiveMapping = this.getCursiveMapping(prevLetter);
  }
  if (!prevCursiveMapping) {
    prevLetter = null;
  }
  var nextCursiveMapping = null;
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
      }
      //else if(cursiveMapping[3]) {
      //givenLetter = cursiveMapping[3]; // final
      //}
      else {
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
const UNICODE_codeValue = i++;
//const UNICODE_characterName = i++;
const UNICODE_generalCategory = i++;
//const UNICODE_canonicalCombiningClasses = i++;
const UNICODE_bidirectionalCategory = i++;
//const UNICODE_decompositionMapping = i++;
//const UNICODE_decimalDigitValue = i++;
//const UNICODE_digitValue = i++;
//const UNICODE_numericValue = i++;
//const UNICODE_mirrored = i++;
//const UNICODE_unicode10Name = i++;
//const UNICODE_commentField = i++;
//const UNICODE_uppercaseMapping = i++;
//const UNICODE_lowercaseMapping = i++;
//const UNICODE_titlecaseMapping = i++;

parsegraph_Unicode.prototype.loadFromString = function (t) {
  var lines = 0;
  var start = 0;
  var ws = /[\n\r]/;
  for (var i = 0; i < t.length; ++i) {
    if (ws.test(t[i])) {
      var charData = t.substring(start, i).split(";");
      if (lines < 100) {
        //console.log(charData);
      }
      start = i + 1;
      ++lines;

      var charNamedData = [
        parseInt(charData[0], 16), // codeValue
        //charData[1], // characterName
        charData[2], // generalCategory
        //charData[3], // canonicalCombiningClasses
        charData[4], // bidirectionalCategory
        //charData[5], // decompositionMapping
        //parseInt(charData[6]), // decimalDigitValue
        //parseFloat(charData[7]), // digitValue
        //charData[8], // numericValue
        //charData[9], // mirrored
        //charData[10], // unicode10Name
        //charData[11], // commentField
        //parseInt(charData[12], 16), // uppercaseMapping
        //parseInt(charData[13], 16), // lowercaseMapping
        //parseInt(charData[14], 16) // titlecaseMapping
      ];
      this.unicodeProperties[charNamedData[UNICODE_codeValue]] = charNamedData;

      if (!(charNamedData.bidirectionalCategory in this.unicodeBidiCounts)) {
        this.unicodeBidiCounts[
          charNamedData[UNICODE_bidirectionalCategory]
        ] = 1;
      } else {
        ++this.unicodeBidiCounts[charNamedData[UNICODE_bidirectionalCategory]];
      }
      if (!(charNamedData.generalCategory in this.unicodeCategoryCounts)) {
        this.unicodeCategoryCounts[charNamedData[UNICODE_generalCategory]] = 1;
      } else {
        ++this.unicodeCategoryCounts[charNamedData[UNICODE_generalCategory]];
      }
    }
  }
  //console.log("Text received: " + t.length + " bytes, " + lines + " lines");
};

parsegraph_Unicode.prototype.isArabic = function (letter) {
  if (typeof letter !== "number") {
    letter = letter.charCodeAt(0);
  }
  var data = this.get(letter);
  if (!data) {
    return false;
  }
  var cv = data[UNICODE_codeValue];
  return cv >= 0x621 && cv <= 0x64a;
};

parsegraph_Unicode.prototype.isMark = function (letter) {
  if (typeof letter !== "number") {
    letter = letter.charCodeAt(0);
  }
  var data = this.get(letter);
  if (!data) {
    return false;
  }
  var cat = data[UNICODE_generalCategory];
  return cat === "Mn" || cat === "Mc" || cat === "Me";
};

parsegraph_Unicode.prototype.isArabicDiacritic = function (letter) {
  if (typeof letter !== "number") {
    letter = letter.charCodeAt(0);
  }
  var data = this.get(letter);
  if (!data) {
    return false;
  }
  var cv = data[UNICODE_codeValue];
  return cv >= 0x621 && cv <= 0x64a;
};

parsegraph_Unicode.prototype.load = function (dbURL, storage) {
  if (this._loaded) {
    return;
  }
  //console.log(new Error("LOADING UNICODE"));
  if (!dbURL) {
    dbURL = "/UnicodeData.txt";
  }
  var storageKey = "UNICODE@" + dbURL;
  var that = this;
  var complete = function () {
    //console.log("Time till unicode parsed: " + parsegraph_elapsed(parsegraph_START_TIME));
    that._loaded = true;
    if (that.onLoad) {
      that.onLoad();
    }
    if (that._onLoad) {
      that._onLoad.call(that._onLoadThisArg || this);
    }
  };
  if (storage) {
    var unicode = storage.getItem(storageKey);
    if (unicode) {
      try {
        unicode = JSON.parse(unicode);
        this.unicodeProperties = unicode.unicodeProperties;
        this.unicodeBidiCounts = unicode.unicodeBidiCounts;
        this.unicodeCategorycounts = unicode.unicodeCategorycounts;
        complete.call(this);
        return;
      } catch (ex) {
        console.log("Failed to read stored Unicode data");
        console.log(ex);
        storage.removeItem(storageKey);
      }
    }
  }
  var xhr = new XMLHttpRequest();
  xhr.open("GET", dbURL);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      //console.log("Time till unicode received: " + parsegraph_elapsed(parsegraph_START_TIME));
      that.loadFromString(xhr.responseText);
      complete.call(that);
      if (storage) {
        var unicodeData = {
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
      //console.log("Receiving " + xhr.readyState + "\n" + xhr.responseText.length + " bytes received.\nTime: " + new Date().getTime()/1000);
    }
  };
  xhr.send();
};

parsegraph_Unicode.prototype.loaded = function () {
  return this._loaded;
};

parsegraph_Unicode.prototype.setOnLoad = function (onLoad, onLoadThisArg) {
  if (this._loaded) {
    throw new Error("Unicode character database is already loaded");
  }
  this._onLoad = onLoad;
  this._onLoadThisArg = onLoadThisArg;
};

/*
0	Code value	normative	Code value in 4-digit hexadecimal format.
1	Character name	normative	These names match exactly the names published in Chapter 14 of the Unicode Standard, Version 3.0.
2	General Category	normative / informative
(see below)	This is a useful breakdown into various "character types" which can be used as a default categorization in implementations. See below for a brief explanation.

General Category

The values in this field are abbreviations for the following. Some of the values are normative, and some are informative. For more information, see the Unicode Standard.

Note: the standard does not assign information to control characters (except for certain cases in the Bidirectional Algorithm). Implementations will generally also assign categories to certain control characters, notably CR and LF, according to platform conventions.

Normative Categories

Abbr.

Description

Lu	Letter, Uppercase
Ll	Letter, Lowercase
Lt	Letter, Titlecase
Mn	Mark, Non-Spacing
Mc	Mark, Spacing Combining
Me	Mark, Enclosing
Nd	Number, Decimal Digit
Nl	Number, Letter
No	Number, Other
Zs	Separator, Space
Zl	Separator, Line
Zp	Separator, Paragraph
Cc	Other, Control
Cf	Other, Format
Cs	Other, Surrogate
Co	Other, Private Use
Cn	Other, Not Assigned (no characters in the file have this property)
Informative Categories

Abbr.

Description

Lm	Letter, Modifier
Lo	Letter, Other
Pc	Punctuation, Connector
Pd	Punctuation, Dash
Ps	Punctuation, Open
Pe	Punctuation, Close
Pi	Punctuation, Initial quote (may behave like Ps or Pe depending on usage)
Pf	Punctuation, Final quote (may behave like Ps or Pe depending on usage)
Po	Punctuation, Other
Sm	Symbol, Math
Sc	Symbol, Currency
Sk	Symbol, Modifier
So	Symbol, Other

3	Canonical Combining Classes	normative	The classes used for the Canonical Ordering Algorithm in the Unicode Standard. These classes are also printed in Chapter 4 of the Unicode Standard.
4	Bidirectional Category	normative	See the list below for an explanation of the abbreviations used in this field. These are the categories required by the Bidirectional Behavior Algorithm in the Unicode Standard. These categories are summarized in Chapter 3 of the Unicode Standard.


Type

Description

L	Left-to-Right
LRE	Left-to-Right Embedding
LRO	Left-to-Right Override
R	Right-to-Left
AL	Right-to-Left Arabic
RLE	Right-to-Left Embedding
RLO	Right-to-Left Override
PDF	Pop Directional Format
EN	European Number
ES	European Number Separator
ET	European Number Terminator
AN	Arabic Number
CS	Common Number Separator
NSM	Non-Spacing Mark
BN	Boundary Neutral
B	Paragraph Separator
S	Segment Separator
WS	Whitespace
ON	Other Neutrals

5	Character Decomposition Mapping	normative	In the Unicode Standard, not all of the mappings are full (maximal) decompositions. Recursive application of look-up for decompositions will, in all cases, lead to a maximal decomposition. The decomposition mappings match exactly the decomposition mappings published with the character names in the Unicode Standard.
6	Decimal digit value	normative	This is a numeric field. If the character has the decimal digit property, as specified in Chapter 4 of the Unicode Standard, the value of that digit is represented with an integer value in this field
7	Digit value	normative	This is a numeric field. If the character represents a digit, not necessarily a decimal digit, the value is here. This covers digits which do not form decimal radix forms, such as the compatibility superscript digits
8	Numeric value	normative	This is a numeric field. If the character has the numeric property, as specified in Chapter 4 of the Unicode Standard, the value of that character is represented with an integer or rational number in this field. This includes fractions as, e.g., "1/5" for U+2155 VULGAR FRACTION ONE FIFTH Also included are numerical values for compatibility characters such as circled numbers.
9	Mirrored	normative	If the character has been identified as a "mirrored" character in bidirectional text, this field has the value "Y"; otherwise "N". The list of mirrored characters is also printed in Chapter 4 of the Unicode Standard.
10	Unicode 1.0 Name	informative	This is the old name as published in Unicode 1.0. This name is only provided when it is significantly different from the Unicode 3.0 name for the character.
11	10646 comment field	informative	This is the ISO 10646 comment field. It is in parantheses in the 10646 names list.
12	Uppercase Mapping	informative	Upper case equivalent mapping. If a character is part of an alphabet with case distinctions, and has an upper case equivalent, then the upper case equivalent is in this field. See the explanation below on case distinctions. These mappings are always one-to-one, not one-to-many or many-to-one. This field is informative.
13	Lowercase Mapping	informative	Similar to Uppercase mapping
14	Titlecase Mapping	informative	Similar to Uppercase mapping
*/
