#ifndef parsegraph_unicode_INCLUDED
#define parsegraph_unicode_INCLUDED

#include <apr_pools.h>
#include <apr_hash.h>
#include <unicode/ustring.h>

struct parsegraph_Unicode {
apr_pool_t* pool;
apr_hash_t* unicodeProperties;
apr_hash_t* unicodeBidiCounts;
apr_hash_t* unicodeCategoryCounts;
apr_hash_t* unicodeCursiveMap;
int _loaded;
void(*onLoad)(void*, struct parsegraph_Unicode*);
void* onLoadThisArg;
};
typedef struct parsegraph_Unicode parsegraph_Unicode;
extern parsegraph_Unicode* parsegraph_UNICODE_INSTANCE;

struct parsegraph_CharProperties {
int codeValue;
UChar characterName[128];
UChar generalCategory[128];
UChar canonicalCombiningClasses[128];
UChar bidirectionalCategory[128];
UChar decompositionMapping[128];
long decimalDigitValue;
double digitValue;
UChar numericValue[128];
int mirrored;
UChar unicode10Name[128];
UChar commentField[128];
int uppercaseMapping;
int lowercaseMapping;
int titlecaseMapping;
};
typedef struct parsegraph_CharProperties parsegraph_CharProperties;

parsegraph_Unicode* parsegraph_Unicode_new(apr_pool_t* pool);
parsegraph_Unicode* parsegraph_defaultUnicode(const char* dbURL);
parsegraph_CharProperties* parsegraph_Unicode_get(parsegraph_Unicode* unicode, const char* codeOrLetter);
int parsegraph_Unicode_loaded(parsegraph_Unicode* unicode);
void parsegraph_Unicode_loadFromString(parsegraph_Unicode*, const char* t);
void parsegraph_Unicode_setOnLoad(parsegraph_Unicode* unicode, void(*onLoad)(void*, struct parsegraph_Unicode*), void* onLoadThisArg);
void parsegraph_Unicode_load(parsegraph_Unicode* unicode, const char* dbURL);
int parsegraph_Unicode_isArabicUTF8(parsegraph_Unicode* unicode, const char* letter, int len);
int parsegraph_Unicode_isArabic(parsegraph_Unicode* unicode, UChar* letter, int len);
int parsegraph_Unicode_isMarkUTF8(parsegraph_Unicode* unicode, const char* letter, int len);
int parsegraph_Unicode_isMark(parsegraph_Unicode* unicode, UChar* letter, int len);
int parsegraph_Unicode_isArabicDiacriticUTF8(parsegraph_Unicode* unicode, const char* letter, int len);
int parsegraph_Unicode_isArabicDiacritic(parsegraph_Unicode* unicode, UChar* letter, int len);
UChar* parsegraph_Unicode_getCursiveMapping(parsegraph_Unicode* unicode, UChar v);
UChar* parsegraph_Unicode_getCursiveMappingUTF8(parsegraph_Unicode* unicode, const char* t);
UChar parsegraph_Unicode_cursive(parsegraph_Unicode* u, UChar givenLetter, UChar prevLetter, UChar nextLetter);

#endif // parsegraph_unicode_INCLUDED
