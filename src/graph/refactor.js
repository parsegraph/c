{
    var ts = new parsegraph_TestSuite("refactor");
    parsegraph_AllTests.addTest(ts);

    ts.AddTest("", function() {
        var car = new parsegraph_Caret('s');


    });

    ts.AddTest("", function() {
    });


    // Caret uses parsegraph_readNodeType to get the real type converted from
    // the caller's argument.
    //
    // Caret's layout methods are not affected by the content change.
    //
    // Caret label methods can be removed.
    // Caret selection methods can be removed.
    //
    // Caret.content refers to node.content
    //
    // Caret methods and the expected effect
    // ctor: readNodeType
    // node: none
    // has: none
    // spawn: readNodeType
    // connect: none
    // crease: none
    // erase: none
    // onClick: none
    // move: none
    // push: none
    // save: none
    // clearSave: none
    // restore: none
    // moveToRoot: none
    // pop: none
    // spawnMove: spawn
    // content: content
    // replace: readNodeType, setType
    // at: node.type
    // align: none
    // pull: none
    // shrink: none
    // grow: none
    // fitExact: none
    // fitLoose: none
    // label: setLabel
    // select: setSelected
    // selected: isSelected
    // deselect: setSelected
    // graph: none
    // root: none

    // To summarize:

    // spawnMove: spawn
    // ctor: readNodeType
    // spawn: readNodeType
    // replace: readNodeType, setType
    // at: node.type
    // content: node.content
    // label: setLabel
    // select: setSelected
    // selected: isSelected
    // deselect: setSelected

    // And within Node, how is each method affected by this refactor?
    // ctor:


    // Goal is to:
    //
    // Decouple GlyphAtlas from Node.
    // Allow alpha_Scene to be viewed as a Node's content.
    //
    // Pathway is to move label stuff into a separate label class that, for the time being,
    // will still be always used within node.
}
