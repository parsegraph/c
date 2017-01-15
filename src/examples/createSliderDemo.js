function createSliderDemo(graph)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);
    caret.fitExact();
    caret.label("Slider");
    caret.spawnMove('d', 'slider');
    caret.label(3);
    caret.move('u');
    caret.spawnMove('f', 'block');
    caret.label("Scene");
    caret.spawn('d', 'scene');
    return caret;
}
