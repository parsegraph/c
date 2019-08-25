function parsegraph_buildGlyphAtlas()
{
    var ga = new parsegraph_GlyphAtlas(
        parsegraph_UPSCALED_FONT_SIZE, "sans-serif", "white"
    );
    ga.setUnicode(parsegraph_defaultUnicode());
    return ga;
}

parsegraph_glBufferData_BYTES = 0;
function parsegraph_clearPerformanceCounters()
{
    parsegraph_glBufferData_BYTES = 0;
}

/**
 * Show a basic graph given a parsegraph_Node.
 */
function parsegraph_showGraph(rootNode)
{
    var surface = new parsegraph_Surface();
    var graph = new parsegraph_Graph(surface);
    graph.world().plot(rootNode, 0, 0, 0.5);
    graph.scheduleRepaint();

    var renderTimer = new parsegraph_AnimationTimer();
    renderTimer.setListener(function() {
        graph.input().Update(new Date());
        if(graph.needsRepaint()) {
            surface.paint(10);
        }
        surface.render();
        if(graph.input().UpdateRepeatedly() || graph.needsRepaint()) {
            renderTimer.schedule();
        }
    });

    graph.input().SetListener(function(affectedPaint) {
        if(affectedPaint) {
            graph.scheduleRepaint();
        }
        renderTimer.schedule();
    });
    renderTimer.schedule();

    return graph.surface().container();
}

function parsegraph_initialize(mathMode) {
    //console.log("Initializing parsegraph. Math mode: ", mathMode);
    parsegraph_NATURAL_GROUP_SIZE = 250;

    // The width in pixels of a glyph atlas's page.
    parsegraph_MAX_TEXTURE_WIDTH = 512;

    // How long the carousel takes, in milliseconds, to open.
    parsegraph_CAROUSEL_SHOW_DURATION = 200;

    parsegraph_TOUCH_SENSITIVITY = 1;
    parsegraph_MOUSE_SENSITIVITY = 1;

    // How long painting is done, and optionally, how fast idle loops will render.
    parsegraph_INTERVAL = 10;

    // How often the idle timer is run when the application is not being rendered.
    parsegraph_BACKGROUND_INTERVAL = parsegraph_INTERVAL*4;

    // Whether idle loops are limited to being called only as often as parsegraph_INTERVAL.
    parsegraph_GOVERNOR = true;

    // Where the idle loop is called multiple times per frame if time remains.
    parsegraph_BURST_IDLE = false;

    // Whether Node's forward and backward are switched.
    parsegraph_RIGHT_TO_LEFT = false;

    // How many milliseconds to commit a layout if an input event is detected.
    parsegraph_INPUT_LAYOUT_TIME = 500;

    parsegraph_IDLE_MARGIN = 0;

    // Node Direction
    parsegraph_NULL_NODE_DIRECTION = -1;
    parsegraph_INWARD = 0;
    parsegraph_OUTWARD = 1;
    parsegraph_DOWNWARD = 2;
    parsegraph_UPWARD = 3;
    parsegraph_BACKWARD = 4;
    parsegraph_FORWARD = 5;

    parsegraph_NUM_DIRECTIONS = 6;

    parsegraph_HORIZONTAL_ORDER = [
    parsegraph_BACKWARD,
    parsegraph_FORWARD,
    parsegraph_DOWNWARD,
    parsegraph_UPWARD,
    parsegraph_INWARD,
    parsegraph_OUTWARD
    ];

    parsegraph_VERTICAL_ORDER = [
    parsegraph_DOWNWARD,
    parsegraph_UPWARD,
    parsegraph_BACKWARD,
    parsegraph_FORWARD,
    parsegraph_INWARD,
    parsegraph_OUTWARD
    ];

    // Node Axis
    parsegraph_NULL_AXIS = 6;
    parsegraph_HORIZONTAL_AXIS = 7;
    parsegraph_VERTICAL_AXIS = 8;

    // Node Type
    parsegraph_NULL_NODE_TYPE = 9;
    parsegraph_BUD = 10;
    parsegraph_SLOT = 11;
    parsegraph_BLOCK = 12;
    parsegraph_SLIDER = 13;
    parsegraph_SCENE = 14;

    parsegraph_DEFAULT_NODE_TYPE = parsegraph_BLOCK;

    parsegraph_NULL_NODE_FIT = 14;
    parsegraph_NODE_FIT_EXACT = 15;
    parsegraph_NODE_FIT_LOOSE = 16;
    parsegraph_NODE_FIT_NAIVE = 17;

    // Optimization hints.
    parsegraph_FIT_LOOSE = false;
    parsegraph_CREASE = true;

    parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

    // Background
    parsegraph_BACKGROUND_COLOR = new parsegraph_Color(
        0, 47/255, 57/255, 1
        //256/255, 255/255, 255/255, 1
        //45/255, 84/255, 127/255, 1
    );

    // Font
    parsegraph_FONT_SIZE = 72;
    parsegraph_UPSCALED_FONT_SIZE = 72;
    parsegraph_RENDERED_FONT_SIZE = parsegraph_UPSCALED_FONT_SIZE/4;
    parsegraph_WRAP_WIDTH = 80 * parsegraph_RENDERED_FONT_SIZE;

    /**
     * The scale at which shrunk nodes are shrunk.
     */
    parsegraph_SHRINK_SCALE = .85;

    /**
     * The thickness (diameter) of the line.
     */
    parsegraph_LINE_THICKNESS = 12;

    parsegraph_LINE_COLOR = new parsegraph_Color(.8, .8, .8, .6);
    parsegraph_SELECTED_LINE_COLOR = new parsegraph_Color(.8, .8, .8, 1);

    parsegraph_BUD_RADIUS = 8;

    parsegraph_MIN_BLOCK_HEIGHT = parsegraph_BUD_RADIUS*12;
    parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*15;

    // Inter-node spacing
    parsegraph_HORIZONTAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;
    parsegraph_VERTICAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;

    // Configures graphs to appear grid-like; I call it 'math-mode'.
    if(mathMode) {
        parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*40;
        parsegraph_MIN_BLOCK_HEIGHT = parsegraph_MIN_BLOCK_WIDTH;
        parsegraph_HORIZONTAL_SEPARATION_PADDING = 2;
        parsegraph_VERTICAL_SEPARATION_PADDING = 2;
    }

    /**
     * The separation between leaf buds and their parents.
     */
    parsegraph_BUD_LEAF_SEPARATION = 4.2;

    parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION = parsegraph_BUD_RADIUS*4.5;

    parsegraph_BUD_STYLE = {
        minWidth: parsegraph_BUD_RADIUS*3,
        minHeight: parsegraph_BUD_RADIUS*3,
        horizontalPadding: parsegraph_BUD_RADIUS/2,
        verticalPadding: parsegraph_BUD_RADIUS/2,
        borderColor: new parsegraph_Color(.8, .8, .5, 1),
        backgroundColor: new parsegraph_Color(1, 1, .1, 1),
        selectedBorderColor: new parsegraph_Color(1, 1, 0, 1),
        selectedBackgroundColor: new parsegraph_Color(1, 1, .7, 1),
        brightness: 1.5,
        borderRoundness: parsegraph_BUD_RADIUS*8,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: null,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 10.5 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_SLIDER_STYLE = {
        minWidth: 2*parsegraph_BUD_RADIUS*64,
        minHeight: 2*parsegraph_BUD_RADIUS*3,
        horizontalPadding: parsegraph_BUD_RADIUS/2,
        verticalPadding: parsegraph_BUD_RADIUS/2,
        borderColor: new parsegraph_Color(.9, .6, .6, 1),
        backgroundColor: new parsegraph_Color(1, .4, .4, 1),
        selectedBorderColor: new parsegraph_Color(1, .7, .7, 1),
        selectedBackgroundColor: new parsegraph_Color(1, .5, .5, 1),
        brightness: 0.5,
        borderRoundness: parsegraph_BUD_RADIUS*8,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: null,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE * (32/48),
        letterWidth: .61,
        verticalSeparation: 9 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_BLOCK_STYLE = {
        minWidth: parsegraph_MIN_BLOCK_WIDTH,
        minHeight: parsegraph_MIN_BLOCK_HEIGHT,
        horizontalPadding: 3*parsegraph_BUD_RADIUS,
        verticalPadding: .5*parsegraph_BUD_RADIUS,
        borderColor: new parsegraph_Color(.6, 1, .6, 1),
        backgroundColor: new parsegraph_Color(.75, 1, .75, 1),
        selectedBorderColor: new parsegraph_Color(.8, .8, 1, 1),
        selectedBackgroundColor: new parsegraph_Color(.75, .75, 1, 1),
        brightness: 0.75,
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: null,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    if(mathMode) {
        parsegraph_BLOCK_STYLE.horizontalPadding = 2*parsegraph_BUD_RADIUS;
        parsegraph_BLOCK_STYLE.verticalPadding = .5*parsegraph_BUD_RADIUS;
    }

    parsegraph_SCENE_STYLE = {
        minWidth: 2048,
        minHeight: 1024,
        horizontalPadding: 0,
        verticalPadding: 0,
        borderColor: new parsegraph_Color(.4, .4, .4, 1),
        backgroundColor: new parsegraph_Color(.5, .5, .5, 1),
        selectedBorderColor: new parsegraph_Color(.9, .9, 1, 1),
        selectedBackgroundColor: new parsegraph_Color(.8, .8, 1, 1),
        brightness: 0.75,
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*1,
        maxLabelChars: null,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_SLOT_STYLE = {
        minWidth: parsegraph_MIN_BLOCK_WIDTH,
        minHeight: parsegraph_MIN_BLOCK_HEIGHT,
        horizontalPadding: 3*parsegraph_BUD_RADIUS,
        verticalPadding: .5*parsegraph_BUD_RADIUS,
        borderColor: new parsegraph_Color(1, 1, 1, 1),
        backgroundColor: new parsegraph_Color(.75, .75, 1, 1),
        selectedBorderColor: new parsegraph_Color(.95, 1, .95, 1),
        selectedBackgroundColor: new parsegraph_Color(.9, 1, .9, 1),
        brightness: 0.75,
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: null,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    if(mathMode) {
        parsegraph_SLOT_STYLE.horizontalPadding = 2*parsegraph_BUD_RADIUS;
        parsegraph_SLOT_STYLE.verticalPadding = .5*parsegraph_BUD_RADIUS;
    }

    if(mathMode) {
        //parsegraph_BLOCK_STYLE.verticalPadding = parsegraph_SLOT_STYLE.verticalPadding;
        parsegraph_SLOT_STYLE.borderColor.setA(1);
    }

    parsegraph_EXTENT_BORDER_COLOR = new parsegraph_Color(1, 1, 0, .1);
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_LINE_THICKNESS;
    parsegraph_EXTENT_BACKGROUND_COLOR = new parsegraph_Color(1, 0, 0, .5);

    parsegraph_EXTENT_BORDER_ROUNDEDNESS = parsegraph_BUD_RADIUS;
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_BUD_RADIUS;
}

function parsegraph_copyStyle(type)
{
    var rv = {};
    var copiedStyle = parsegraph_style(type);

    for(var styleName in copiedStyle) {
        rv[styleName] = copiedStyle[styleName];
    }

    return rv;
}

function parsegraph_style(type)
{
    type = parsegraph_readNodeType(type);

    switch(type) {
    case parsegraph_BUD:
    {
        return parsegraph_BUD_STYLE;
    }
    case parsegraph_SLOT:
    {
        return parsegraph_SLOT_STYLE;
    }
    case parsegraph_BLOCK:
    {
        return parsegraph_BLOCK_STYLE;
    }
    case parsegraph_SLIDER:
    {
        return parsegraph_SLIDER_STYLE;
    }
    case parsegraph_SCENE:
    {
        return parsegraph_SCENE_STYLE;
    }
    case parsegraph_NULL_NODE_TYPE:
    default:
        return null;
    }
};
