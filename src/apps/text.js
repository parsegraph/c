import parsegraph_Caret from '../graph/Caret';
import {
    parsegraph_BUD,
    parsegraph_BLOCK,
    parsegraph_SLOT
} from '../graph/NodeType';

var englishSentences = [
"Hello.",
"Good morning.",
"Good evening.",
"One, two, three.",
"Goodbye.",
];

var russianSentences = [
"Привет.",
"доброе утро.",
"Добрый вечер.",
"один, два, три",
"Прощай.",
];

var arabicSentences = [
"مرحبا",
"صباح الخير",
"مساء الخير",
"واحد اثنين ثلاثة",
"إلى اللقاء",
];

var hebrewSentences = [
"שלום",
"בוקר טוב",
"ערב טוב",
"אחת שתיים שלוש",
"לְהִתְרָאוֹת",
];

var devanagariSentences = [
"नमस्ते",
"शुभ प्रभात",
"सुसंध्या",
"एक दो तीन।",
"अलविदा"
];

var greekSentences = [
"γεια σας",
"Καλημέρα.",
"Καλό απόγευμα.",
"ένα δύο τρία.",
"αντιο σας"
];

var hanSentences = [
"你好",
"早上好",
"晚上好",
"一二三。",
"再见"
];

var hangulSentences = [
"여보세요",
"좋은 아침.",
"안녕하세요.",
"하나 둘 셋",
"안녕"
];

var japaneseSentences = [
"こんにちは",
"おはようございます",
"こんばんは",
"一二三",
"さようなら"
];

var thaiSentences = [
"สวัสดี",
"สวัสดีตอนเช้า",
"สวัสดีตอนเย็น",
"หนึ่งสองสาม",
"ลาก่อน"
];

var hungarianSentences = [
"Szia.",
"jó reggelt",
"jó estét",
"egy kettő három",
"viszontlátásra."
];

var testLanguages = [
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
];

var testLanguageNames = [
"English",
"Russian",
"Arabic",
"Hebrew",
"Hindi",
"Greek",
"Chinese (simplified)",
"Korean",
"Japanese",
"Thai",
"Hungarian",
];

export default function buildTextDemo()
{
    var caret = new parsegraph_Caret(parsegraph_BUD);

    for(var i = 0; i < testLanguages.length; ++i) {
        if(i > 0) {
            caret.spawnMove("f", "u");
        }
        caret.push();
        caret.pull("d");
        caret.spawnMove("d", "b");
        caret.label(testLanguageNames[i]);
        var testSentences = testLanguages[i];
        for(var j = 0; j < testSentences.length; ++j) {
            caret.spawnMove("d", "s");
            caret.label(testSentences[j]);
            caret.move("u");
            caret.pull("d");
            caret.move("d");
        }
        caret.pop();
    }

    return caret.root();
};
