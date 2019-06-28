function buildTextDemo(graph, COUNT, text)
{
    if(COUNT === undefined) {
        COUNT = 10;
    }
    if(text === undefined) {
        text = "";
    }

    var caret = new parsegraph_Caret(parsegraph_BUD);
    caret.setGlyphAtlas(graph.glyphAtlas());

    [
        "क्या चल रहा हैं?",,
        "नमस्ते",
        "اَلْقَهْوَةُ",
        "اَلْمِلْعَقَةُ",
        //"هل بإمكانك مساعدتي؟",
        //"سلام",
        //"سلام",
        //"بيع سلم",
        //"مَسْجِدٌ",
        //"سلام",
        //"بَيْتٌ",
        //"وَعَلَيْكُم السَّلَام",
        //"הלו חבר."
        //"بَيْتٌ"
        "مَسْجِدٌ"
    ].forEach(function(l) {
        caret.spawnMove(parsegraph_DOWNWARD, parsegraph_BLOCK);
        caret.label(l);
        caret.move('u');
        caret.pull('d');
        caret.spawnMove(parsegraph_FORWARD, parsegraph_BUD);
    }, this);

    return caret.root();
};
