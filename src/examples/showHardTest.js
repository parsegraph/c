function showHardTest(graph, server)
{
    var caret = new parsegraph_Caret(graph, parsegraph_BLOCK);

    caret.replace('block');

    caret.label("No time.");
    caret.spawn('u', 'bud');
    caret.spawn('b', 'bud');
    caret.spawn('f', 'bud');
    caret.spawn('i', 'slot', 'v');
    caret.move('i');
    caret.label("value");
    caret.move('o');

    caret.spawnMove('d', 's');
    caret.label('System.IO.Stream');
    caret.shrink();
    caret.push();
    caret.spawnMove('i', 'block', 'v');
    caret.shrink();
    caret.label('"A"');
    caret.spawnMove('f', 'bud');
    caret.label("|");
    caret.shrink();
    caret.spawnMove('f', 'block');
    caret.label('"B"');
    caret.spawnMove('f', 'bud');
    caret.label("|");
    caret.shrink();
    caret.spawnMove('f', 'block');
    caret.label('"C"');
    caret.pop();

    caret.moveToRoot();
    caret.move('u');
    caret.spawnMove('f', 'block');
    caret.label("Create user");
    var letterID = caret.save();
    caret.spawnMove('i', 'slot', 'v');
    var username = "test" + Math.floor(50 * Math.random());

    caret.label(username);
    caret.spawnMove('f', 'slot');
    caret.label("*****");

    server.createUser(username, "secret" + username + Math.floor(4096 * Math.random()), function(response) {
        caret.moveTo(letterID);
        caret.spawnMove('d', 'bud');
        caret.shrink();

        var i = 0;
        for(var key in response) {
            var value = response[key];
            caret.push();
            caret.spawnMove('f', 'slot');
            caret.label(key);
            caret.spawnMove('i', 'block');
            caret.label(value);
            caret.pop();
            caret.spawnMove('d', 'bud');
        }

        graph.scheduleRepaint();
    }, this);

    return caret;
}
