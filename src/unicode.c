#include "unicode.h"
#include <unicode/uregex.h>
#include "die.h"
#include <stdlib.h>
#include <unicode/ustring.h>

static URegularExpression* rtlDirCheck = 0;
int parsegraph_isRTL(const char* s)
{
    int len;
    UErrorCode uerr;
    u_strFromUTF8(0, 0, &len, s, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while converting UTF8 string to UTF16 (preflight)");
    }
    UChar* dest = malloc(len*sizeof(UChar));
    u_strFromUTF8(dest, len, 0, s, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while converting UTF8 string to UTF16 (convert)");
    }

    const char* ltrChars = "^[^A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF]*[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]";
    if(!rtlDirCheck) {
        rtlDirCheck = uregex_openC(ltrChars, 0, 0, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while compiling regex to test for RTL");
        }
    }
    uregex_setText(rtlDirCheck, dest, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while setting text for RTL test");
    }
    int rv = uregex_matches(rtlDirCheck, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while testing for RTL");
    }
    free(dest);
    return rv;
}

parsegraph_Unicode* parsegraph_UNICODE_INSTANCE = 0;

parsegraph_Unicode* parsegraph_Unicode_new(apr_pool_t* pool)
{
    parsegraph_Unicode* unicode = apr_palloc(pool, sizeof(*unicode));
    unicode->pool = pool;
    unicode->unicodeProperties = apr_hash_make(pool);
    unicode->unicodeBidiCounts = apr_hash_make(pool);
    unicode->unicodeCategoryCounts = apr_hash_make(pool);
    unicode->unicodeCursiveMap = apr_hash_make(pool);
    unicode->_loaded = 0;
    unicode->onLoad = 0;
    unicode->onLoadThisArg = 0;
    return unicode;
};

parsegraph_Unicode* parsegraph_defaultUnicode(const char* dbURL)
{
    if(!parsegraph_UNICODE_INSTANCE) {
        apr_pool_t* unicodePool;
        apr_pool_create(&unicodePool, 0);
        parsegraph_UNICODE_INSTANCE = parsegraph_Unicode_new(unicodePool);
        if(dbURL) {
            parsegraph_Unicode_load(parsegraph_UNICODE_INSTANCE, dbURL);
        }
    }
    return parsegraph_UNICODE_INSTANCE;
}

parsegraph_CharProperties* parsegraph_Unicode_get(parsegraph_Unicode* unicode, const char* codeOrLetter)
{
    return apr_hash_get(unicode->unicodeProperties, codeOrLetter, APR_HASH_KEY_STRING);
};


static UChar unicodeCursiveMapKeys[] = {
    0x627, // ALEF
    0x628, // BEH
    0x629, // MARBUTA
    0x62a, // TEH
    0x62b, // THEH
    0x62c, // JEEM
    0x62d, // HAH
    0x62e, // KHAH
    0x62f, // DAL
    0x630, // THAL
    0x631, // REH
    0x632, // ZAIN
    0x633,// SEEN
    0x634, // SHEEN
    0x635, // SAD
    0x636, // DAD
    0x637, // TAH
    0x638, // ZAH
    0x639, // AIN
    0x63a, // GHAIN
    0x641, // FEH
    0x642, // QAF
    0x643, // KAF
    0x644, // LAM
    0x645, // MEEM
    0x646, // NOON
    0x647, // HEH
    0x648, // WAW
    0x64a, // YEH
    0
};

// SemanticCodeValue:[Isolated, Initial, Medial, Final]. Use null for non-applicable.
static UChar unicodeCursiveMapValues[] = {
    0xfe8d, 0, 0, 0xfe8e, // ALEF
    0xfe8f, 0xfe91, 0xfe92, 0xfe90, // BEH
    0xfe93, 0, 0, 0xfe94, // MARBUTA
    0xfe95,0xfe97, 0xfe98, 0xfe96, // TEH
    0xfe99,0xfe9b,0xfe9c,0xfe9a, // THEH
    0xfe9d,0xfe9f,0xfea0,0xfe9e,// JEEM
    0xfea1,0xfea3, 0xfea4, 0xfea2, // HAH
    0xfea5,0xfea7,0xfea8,0xfea6, // KHAH
    0xfea9,0, 0, 0xfeaa, // DAL
    0xfeab,0, 0, 0xfeac, // THAL
    0xfead,0,0,0xfeae, // REH
    0xfeaf,0,0,0xfeb0, // ZAIN
    0xfeb1,0xfeb3,0xfeb4,0xfeb2,// SEEN
    0xfeb5,0xfeb7,0xfeb8,0xfeb6, // SHEEN
    0xfeb9,0xfebb,0xfebc,0xfeba, // SAD
    0xfebd,0xfebf,0xfec0,0xfebe, // DAD
    0xfec1,0xfec3,0xfec4,0xfec2, // TAH
    0xfec5,0xfec7,0xfec8,0xfec6, // ZAH
    0xfec9,0xfecb,0xfecc,0xfeca, // AIN
    0xfecd,0xfecf,0xfed0,0xfece, // GHAIN
    0xfed1,0xfed3,0xfed4,0xfed2, // FEH
    0xfed5,0xfed7,0xfed8,0xfed6, // QAF
    0xfed9,0xfedb,0xfedc,0xfeda, // KAF
    0xfedd,0xfedf,0xfee0, 0xfede, // LAM
    0xfee1, 0xfee3,0xfee4,0xfee2, // MEEM
    0xfee5, 0xfee7, 0xfee8, 0xfee6, // NOON
    0xfee9, 0xfeeb, 0xfeec, 0xfeea, // HEH
    0xfeed,0, 0, 0xfeee, // WAW
    0xfef1, 0xfef3, 0xfef4, 0xfef2 // YEH,
};

UChar* parsegraph_Unicode_getCursiveMapping(parsegraph_Unicode* unicode, UChar v)
{
    for(int i = 0; unicodeCursiveMapKeys[i]; ++i) {
        if(unicodeCursiveMapKeys[i] == v) {
            return unicodeCursiveMapValues + 4*i;
        }
    }
    return 0;
}

UChar parsegraph_Unicode_cursive(parsegraph_Unicode* u, UChar givenLetter, UChar prevLetter, UChar nextLetter)
{
    UChar* cursiveMapping = parsegraph_Unicode_getCursiveMapping(u, givenLetter);
    if(!cursiveMapping) {
        return 0;
    }
    UChar* prevCursiveMapping = 0;
    if(prevLetter) {
        prevCursiveMapping = parsegraph_Unicode_getCursiveMapping(u, prevLetter);
    }   
    if(!prevCursiveMapping) {
        prevLetter = 0;
    }
    UChar* nextCursiveMapping = 0;
    if(nextLetter) {
        nextCursiveMapping = parsegraph_Unicode_getCursiveMapping(u, nextLetter);
    }   
    if(!nextCursiveMapping) {
        nextLetter = 0;
    }

    if(nextLetter) {
        if(prevLetter && prevCursiveMapping[1]) {
            if(cursiveMapping[2]) {
                givenLetter = cursiveMapping[2]; // medial
            }
            //else if(cursiveMapping[3]) {
                //givenLetter = cursiveMapping[3]; // final
            //}
            else {
                givenLetter = cursiveMapping[0]; // isolated
            }
        }
        else {
            // Next is, but previous wasn't.
            if(cursiveMapping[1]) {
                givenLetter = cursiveMapping[1]; // initial
            }
            else {
                givenLetter = cursiveMapping[0]; // isolated
            }
        }
    }
    else if(prevLetter) {
        if(cursiveMapping[3]) {
            givenLetter = cursiveMapping[3]; // final
        }
        else {
            givenLetter = cursiveMapping[0]; // isolated
        }
    }
    else {
        givenLetter = cursiveMapping[0]; // isolated
    }

    return givenLetter;
}

UChar* parsegraph_Unicode_getCursiveMappingUTF8(parsegraph_Unicode* unicode, const char* t)
{
    UErrorCode uerr;
    UChar v;
    u_strFromUTF8(&v, 1, 0, t, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while testing for RTL");
    }
    return parsegraph_Unicode_getCursiveMapping(unicode, v);
}

void parsegraph_Unicode_loadFromString(parsegraph_Unicode* unicode, const char* t)
{
    int lines = 0;
    int startIndex = 0;
    UErrorCode uerr;
    URegularExpression* ws = 0;
    URegularExpression* semicolonRegex = 0;
    URegularExpression* nRegex = 0;
    const char* wsRegex = "[\\n\\r]";

    ws = uregex_openC(wsRegex, 0, 0, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while compiling ws regex");
    }

    semicolonRegex = uregex_openC(";", 0, 0, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while compiling semicolon regex");
    }

    nRegex = uregex_openC("N", 0, 0, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while compiling N regex");
    }

    int len;
    u_strFromUTF8(0, 0, &len, t, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while converting UTF8 string to UTF16 (preflight)");
    }
    UChar* dest = malloc(len*sizeof(UChar));
    u_strFromUTF8(dest, len, 0, t, -1, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while converting UTF8 string to UTF16 (convert)");
    }

    uregex_setText(ws, dest, len, &uerr);
    uregex_setText(semicolonRegex, dest, len, &uerr);

    startIndex = 0;
    while(uregex_find(ws, startIndex, &uerr)) {
        int32_t wsStart = uregex_start(ws, 0, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting ws start");
        }
        int32_t wsEnd = uregex_end(ws, 0, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting ws end");
        }
        if(startIndex == wsStart) {
            // Whitespace at the beginning of the string.
            startIndex = wsEnd;
            continue;
        }
        if(startIndex > wsStart) {
            parsegraph_die("Impossible");
        }
        // Assert startIndex < wsStart, therefore the boundaries of that line are [startIndex, wsStart - 1].
        ++lines;

        uregex_setRegion(semicolonRegex, wsStart, wsEnd, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting semicolon region");
        }

        parsegraph_CharProperties* charNamedData = apr_palloc(unicode->pool, sizeof(*charNamedData));

        UChar charBuf[1024];
        int32_t actualLen;
        UChar* charData[14];
        int32_t numSplit = uregex_split(semicolonRegex, charBuf, 1024, &actualLen, charData, 14, &uerr);

        if(numSplit != 14) {
            parsegraph_die("Unexpected number of Unicode splits: %d", numSplit);
        }

        u_sscanf(charData[0], "%x", &charNamedData->codeValue);
        u_strcpy(charNamedData->characterName, charData[1]);
        u_strcpy(charNamedData->generalCategory, charData[2]);
        u_strcpy(charNamedData->canonicalCombiningClasses, charData[3]);
        u_strcpy(charNamedData->bidirectionalCategory, charData[4]);
        u_strcpy(charNamedData->decompositionMapping, charData[5]);
        u_sscanf(charData[6], "%x", &charNamedData->decimalDigitValue);
        u_sscanf(charData[7], "%f", &charNamedData->digitValue);
        u_strcpy(charNamedData->numericValue, charData[8]);

        uregex_setText(nRegex, charData[9], 1, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while setting mirrored regex text");
        }
        if(!uregex_matches(nRegex, -1, &uerr)) {
            charNamedData->mirrored = 1;
        }
        else {
            charNamedData->mirrored = 0;
        }
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Unicode error while running mirrored regex on text");
        }
        u_strcpy(charNamedData->unicode10Name, charData[10]);
        u_strcpy(charNamedData->commentField, charData[11]);
        u_sscanf(charData[12], "%x", &charNamedData->uppercaseMapping);
        u_sscanf(charData[13], "%x", &charNamedData->lowercaseMapping);
        u_sscanf(charData[14], "%x", &charNamedData->titlecaseMapping);

        apr_hash_set(unicode->unicodeProperties, &charNamedData->codeValue, sizeof(charNamedData->codeValue), charNamedData);

        if(NULL == apr_hash_get(unicode->unicodeBidiCounts, charNamedData->bidirectionalCategory, u_strlen(charNamedData->bidirectionalCategory)*sizeof(UChar))) {
            int32_t* val = apr_palloc(unicode->pool, sizeof(int32_t));
            *val = 1;
            apr_hash_set(unicode->unicodeBidiCounts, charNamedData->bidirectionalCategory, u_strlen(charNamedData->bidirectionalCategory)*sizeof(UChar), val);
        }
        else {
            int32_t* val = apr_hash_get(unicode->unicodeBidiCounts, charNamedData->bidirectionalCategory, u_strlen(charNamedData->bidirectionalCategory)*sizeof(UChar));
            (*val)++;
        }

        if(NULL == apr_hash_get(unicode->unicodeCategoryCounts, charNamedData->generalCategory, u_strlen(charNamedData->generalCategory)*sizeof(UChar))) {
            int32_t* val = apr_palloc(unicode->pool, sizeof(int32_t));
            *val = 1;
            apr_hash_set(unicode->unicodeCategoryCounts, charNamedData->generalCategory, u_strlen(charNamedData->generalCategory)*sizeof(UChar), val);
        }
        else {
            int32_t* val = apr_hash_get(unicode->unicodeCategoryCounts, charNamedData->generalCategory, u_strlen(charNamedData->generalCategory)*sizeof(UChar));
            (*val)++;
        }

        // Loop.
        startIndex = wsEnd;
    }
    //console.log("Text received: " + t.length + " bytes, " + lines + " lines");
}

static int run_UTF16_test(parsegraph_Unicode* unicode, UChar* letter, int len, int(*iter)(UChar32, void*), void* iterData)
{
    UErrorCode uerr;
    apr_pool_t* cpool;
    if(APR_SUCCESS != apr_pool_create(&cpool, unicode->pool)) {
        parsegraph_die("Failed to create pool for Unicode test");
    }

    // Convert from UTF-16 to UTF-32.
    int32_t len32;
    u_strToUTF32(0, 0, &len32, letter, len, &uerr);
    if(uerr != U_ZERO_ERROR && uerr != U_BUFFER_OVERFLOW_ERROR) {
        parsegraph_die("Unicode error while running preflight conversion to UTF32");
    }
    uerr = U_ZERO_ERROR;
    UChar32* dest32 = apr_palloc(cpool, len32*sizeof(UChar32)+1);
    u_strToUTF32(dest32, len32+1, 0, letter, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while running conversion to UTF32");
    }

    // Iterate the UTF-32 string, checking for each Unicode character.
    int rv = 0;
    for(int i = 0; i < len32; ++i) {
        UChar32 c = dest32[i];
        rv = iter(c, iterData);
        if(rv != 0) {
            break;
        }
    }
    apr_pool_destroy(cpool);
    return rv;
}

static int run_UTF8_test(parsegraph_Unicode* unicode, const char* letter, int len, int(*iter)(UChar32, void*), void* iterData)
{
    UErrorCode uerr;
    apr_pool_t* cpool;
    if(APR_SUCCESS != apr_pool_create(&cpool, unicode->pool)) {
        parsegraph_die("Failed to create pool for Unicode test");
    }

    // Convert from UTF-8 to UTF-16.
    int32_t destLen;
    u_strFromUTF8(0, 0, &destLen, letter, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while running preflight conversion to UTF16");
    }
    UChar* dest = apr_palloc(cpool, destLen*sizeof(UChar)+1);
    u_strFromUTF8(dest, destLen, 0, letter, len, &uerr);
    if(uerr != U_ZERO_ERROR) {
        parsegraph_die("Unicode error while running conversion to UTF16");
    }

    int rv = run_UTF16_test(unicode, dest, destLen, iter, iterData);

    apr_pool_destroy(cpool);
    return rv;
}

static int arabicIterator(UChar32 c, void* iterData)
{
    return ublock_getCode(c) == UBLOCK_ARABIC;
}

int parsegraph_Unicode_isArabicUTF8(parsegraph_Unicode* unicode, const char* letter, int len)
{
    return run_UTF8_test(unicode, letter, len, arabicIterator, 0);
}

int parsegraph_Unicode_isArabic(parsegraph_Unicode* unicode, UChar* letter, int len)
{
    return run_UTF16_test(unicode, letter, len, arabicIterator, 0);
}

static int markIterator (UChar32 c, void* iterData)
{
    int8_t cat = u_charType(c);
    return cat == U_NON_SPACING_MARK || cat == U_COMBINING_SPACING_MARK || cat == U_ENCLOSING_MARK;
}

int parsegraph_Unicode_isMarkUTF8(parsegraph_Unicode* unicode, const char* letter, int len)
{
    return run_UTF8_test(unicode, letter, len, markIterator, 0);
}

int parsegraph_Unicode_isMark(parsegraph_Unicode* unicode, UChar* letter, int len)
{
    return run_UTF16_test(unicode, letter, len, markIterator, 0);
}

int parsegraph_Unicode_isArabicDiacriticUTF8(parsegraph_Unicode* unicode, const char* letter, int len)
{
    return parsegraph_Unicode_isArabicUTF8(unicode, letter, len);
}

int parsegraph_Unicode_isArabicDiacritic(parsegraph_Unicode* unicode, UChar* letter, int len)
{
    return parsegraph_Unicode_isArabic(unicode, letter, len);
}

void parsegraph_Unicode_load(parsegraph_Unicode* unicode, const char* dbURL)
{
    if(!unicode->_loaded) {
        unicode->_loaded = 1;
    }
    if(unicode->onLoad) {
        unicode->onLoad(unicode->onLoadThisArg, unicode);
    }
    /*if(arguments.length === 0) {
        dbURL = "/UnicodeData.txt";
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", dbURL);
    var that = this;
    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200) {
            that.loadFromString(xhr.responseText);
            that._loaded = true;
            if(that.onLoad) {
                that.onLoad();
            }
            if(that._onLoad) {
                that._onLoad.call(that._onLoadThisArg || this);
            }
        }
        else {
            console.log("Receiving " + xhr.readyState + "\n" + xhr.responseText.length + " bytes received.\nTime: " + new Date().getTime()/1000);
        }
    };
    xhr.send();
    return xhr;*/
};

int parsegraph_Unicode_loaded(parsegraph_Unicode* unicode)
{
    return unicode->_loaded;
};

void parsegraph_Unicode_setOnLoad(parsegraph_Unicode* unicode, void(*onLoad)(void*, struct parsegraph_Unicode*), void* onLoadThisArg)
{
    if(unicode->_loaded) {
        parsegraph_die("Unicode character database is already loaded");
    }
    unicode->onLoad = onLoad;
    unicode->onLoadThisArg = onLoadThisArg;
};
