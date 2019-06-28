#include "buildTextDemo.h"
#include "../graph/Graph.h"
#include "../graph/initialize.h"
#include "../graph/Caret.h"
#include <stdio.h>

const char* englishSentences[] = {
"Hello.",
"Good morning.",
"Good evening.",
"One, two, three.",
"Goodbye.",
0
};

const char* russianSentences[] = {
"Привет.",
"доброе утро.",
"Добрый вечер.",
"один, два, три",
"Прощай.",
0
};

const char* arabicSentences[] = {
"مرحبا",
"صباح الخير",
"مساء الخير",
"واحد اثنين ثلاثة",
"إلى اللقاء",
0
};

const char* hebrewSentences[] = {
"שלום",
"בוקר טוב",
"ערב טוב",
"אחת שתיים שלוש",
"לְהִתְרָאוֹת",
0
};

const char* devanagariSentences[] = {
"नमस्ते",
"शुभ प्रभात",
"सुसंध्या",
"एक दो तीन।",
"अलविदा"
,0
};

const char* greekSentences[] = {
"γεια σας",
"Καλημέρα.",
"Καλό απόγευμα.",
"ένα δύο τρία.",
"αντιο σας"
,0
};

const char* hanSentences[] = {
"你好",
"早上好",
"晚上好",
"一二三。",
"再见"
,0
};

const char* hangulSentences[] = {
"여보세요",
"좋은 아침.",
"안녕하세요.",
"하나 둘 셋",
"안녕"
,0
};

const char* japaneseSentences[] = {
"こんにちは",
"おはようございます",
"こんばんは",
"一二三",
"さようなら"
,0
};

const char* thaiSentences[] = {
"สวัสดี",
"สวัสดีตอนเช้า",
"สวัสดีตอนเย็น",
"หนึ่งสองสาม",
"ลาก่อน"
,0
};

const char* hungarianSentences[] = {
"Szia.",
"jó reggelt",
"jó estét",
"egy kettő három",
"viszontlátásra."
,0
};

const char** testLanguages[] = {
englishSentences,
russianSentences,
arabicSentences,
hebrewSentences,
devanagariSentences,
greekSentences,
hanSentences,
hangulSentences,
japaneseSentences,
thaiSentences,
hungarianSentences,
0
};

const char* testLanguageNames[] = {
"English",
"Russian",
"Arabic",
"Hebrew",
"Hindu",
"Greek",
"Chinese (simplified)",
"Korean",
"Japanese",
"Thai",
"Hungarian",
0
};

parsegraph_Node* buildTextDemo(parsegraph_Graph* graph)
{
    apr_pool_t* pool = graph->_surface->pool;
    parsegraph_Caret* caret = parsegraph_Caret_new(graph->_surface, 
        parsegraph_Node_new(pool, parsegraph_BUD, 0, 0)
    );
    parsegraph_GlyphAtlas* glyphAtlas = parsegraph_Graph_glyphAtlas(graph);
    parsegraph_Caret_setGlyphAtlas(caret, glyphAtlas);

    for(int i = 0; testLanguages[i]; ++i) {
        parsegraph_Caret_spawnMove(caret, "f", "bud", 0);
        parsegraph_Caret_push(caret);
        parsegraph_Caret_pull(caret, "d");
        parsegraph_Caret_spawnMove(caret, "d", "b", 0);
        parsegraph_Caret_label(caret, testLanguageNames[i], 0, 0);
        const char** testSentences = testLanguages[i];
        for(int j = 0; testSentences[j]; ++j) {
            parsegraph_Caret_spawnMove(caret, "d", "s", 0);
            parsegraph_Caret_label(caret, testSentences[j], 0, 0);
            parsegraph_Caret_move(caret, "u");
            parsegraph_Caret_pull(caret, "d");
            parsegraph_Caret_move(caret, "d");
        }
        parsegraph_Caret_pop(caret);
    }

    parsegraph_Node* node = parsegraph_Caret_root(caret);
    parsegraph_Caret_destroy(caret);
    return node;
}
