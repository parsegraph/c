function showFlowchartTemplate(graph)
{
    var caret = new parsegraph_Caret(graph, 'b');

    var clickChild = function() {
        // Spawn a reasonable child in an allowed direction.
        var child;

        var dirs;
        switch(this.type()) {
        case parsegraph_BLOCK:
        dirs = [
            parsegraph_FORWARD,
            parsegraph_DOWNWARD,
            parsegraph_UPWARD,
            parsegraph_BACKWARD,
            parsegraph_INWARD
        ];
        break;
        case parsegraph_SLOT:
        if(this.parentDirection() && this.parentDirection() != parsegraph_OUTWARD) {
            dirs = [
                parsegraph_reverseNodeDirection(this.parentDirection()),
                parsegraph_FORWARD,
                parsegraph_BACKWARD,
                parsegraph_UPWARD,
                parsegraph_DOWNWARD,
                parsegraph_INWARD
            ];
        }
        else {
            dirs = [
                parsegraph_FORWARD,
                parsegraph_BACKWARD,
                parsegraph_UPWARD,
                parsegraph_DOWNWARD,
                parsegraph_INWARD
            ];
        }
        break;
        case parsegraph_BUD:
        dirs = [
            parsegraph_DOWNWARD,
            parsegraph_FORWARD,
            parsegraph_BACKWARD,
            parsegraph_UPWARD
        ];
        break;
        }

        for(var i in dirs) {
            var dir = dirs[i];
            if(this.hasNode(dir)) {
                continue;
            }
            if(this.type() == parsegraph_BUD && dir == parsegraph_INWARD) {
                continue;
            }
            var t = parsegraph_BLOCK;
            switch(this.type()) {
            case parsegraph_BLOCK:
                t = dir == parsegraph_INWARD ? parsegraph_SLOT : parsegraph_BUD;
                break;
            case parsegraph_SLOT:
                t = dir == parsegraph_INWARD ? parsegraph_BLOCK : parsegraph_SLOT;
                break;
            case parsegraph_BUD:
                t = parsegraph_BLOCK;
                break;
            }
            child = this.spawnNode(dir, t);
            if(dir == parsegraph_INWARD) {
                child.setScale(parsegraph_SHRINK_SCALE);
            }
            break;
            }

        // Was a new child created?
        if(!child) {
            // Totally occupied; nothing can be done.
            this.setSelected(!this.isSelected());
        }
        else {
            // Set up the child.
            child.setClickListener(clickChild);
        }
        graph.scheduleRepaint();
    };
    caret.onClick(clickChild);
    return caret;
};
