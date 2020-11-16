import parsegraph_Caret from '../graph/Caret';
import {Type} from '../graph/Node';

const englishSentences = [
  'Hello.',
  'Good morning.',
  'Good evening.',
  'One, two, three.',
  'Goodbye.',
];

const russianSentences = [
  'Привет.',
  'доброе утро.',
  'Добрый вечер.',
  'один, два, три',
  'Прощай.',
];

const arabicSentences = [
  'مرحبا',
  'صباح الخير',
  'مساء الخير',
  'واحد اثنين ثلاثة',
  'إلى اللقاء',
];

const hebrewSentences = [
  'שלום',
  'בוקר טוב',
  'ערב טוב',
  'אחת שתיים שלוש',
  'לְהִתְרָאוֹת',
];

const devanagariSentences = [
  'नमस्ते',
  'शुभ प्रभात',
  'सुसंध्या',
  'एक दो तीन।',
  'अलविदा',
];

const greekSentences = [
  'γεια σας',
  'Καλημέρα.',
  'Καλό απόγευμα.',
  'ένα δύο τρία.',
  'αντιο σας',
];

const hanSentences = ['你好', '早上好', '晚上好', '一二三。', '再见'];

const hangulSentences = [
  '여보세요',
  '좋은 아침.',
  '안녕하세요.',
  '하나 둘 셋',
  '안녕',
];

const japaneseSentences = [
  'こんにちは',
  'おはようございます',
  'こんばんは',
  '一二三',
  'さようなら',
];

const thaiSentences = [
  'สวัสดี',
  'สวัสดีตอนเช้า',
  'สวัสดีตอนเย็น',
  'หนึ่งสองสาม',
  'ลาก่อน',
];

const hungarianSentences = [
  'Szia.',
  'jó reggelt',
  'jó estét',
  'egy kettő három',
  'viszontlátásra.',
];

const testLanguages = [
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

const testLanguageNames = [
  'English',
  'Russian',
  'Arabic',
  'Hebrew',
  'Hindi',
  'Greek',
  'Chinese (simplified)',
  'Korean',
  'Japanese',
  'Thai',
  'Hungarian',
];

export default function buildTextDemo() {
  const caret = new parsegraph_Caret(Type.BUD);

  for (let i = 0; i < testLanguages.length; ++i) {
    if (i > 0) {
      caret.spawnMove('f', 'u');
    }
    caret.push();
    caret.pull('d');
    caret.spawnMove('d', 'b');
    caret.label(testLanguageNames[i]);
    const testSentences = testLanguages[i];
    for (let j = 0; j < testSentences.length; ++j) {
      caret.spawnMove('d', 's');
      caret.label(testSentences[j]);
      caret.move('u');
      caret.pull('d');
      caret.move('d');
    }
    caret.pop();
  }

  return caret.root();
}
