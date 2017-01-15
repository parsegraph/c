function parsegraph_initialize(mathMode) {
    parsegraph_TOUCH_SENSITIVITY = 1;
    parsegraph_MOUSE_SENSITIVITY = 1;

    // Node Direction
    parsegraph_NULL_NODE_DIRECTION = -1;
    parsegraph_FORWARD = 0;
    parsegraph_BACKWARD = 1;
    parsegraph_DOWNWARD = 2;
    parsegraph_UPWARD = 3;
    parsegraph_INWARD = 4;
    parsegraph_OUTWARD = 5;

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

    parsegraph_NULL_NODE_FIT = 14;
    parsegraph_NODE_FIT_EXACT = 15;
    parsegraph_NODE_FIT_LOOSE = 16;

    parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

    // Background
    parsegraph_BACKGROUND_COLOR = parsegraph_createColor(
        0, 47/255, 57/255, 1
        //256/255, 255/255, 255/255, 1
        //45/255, 84/255, 127/255, 1
    );

    // Font
    parsegraph_TextPainter_UPSCALED_FONT_SIZE = 144;
    parsegraph_TextPainter_RENDERED_FONT_SIZE = parsegraph_TextPainter_UPSCALED_FONT_SIZE/4;
    parsegraph_TextPainter_WRAP_WIDTH = 80 * parsegraph_TextPainter_RENDERED_FONT_SIZE;

    /**
     * The scale at which shrunk nodes are shrunk.
     */
    parsegraph_SHRINK_SCALE = .75;

    /**
     * Base font size.
     */
    parsegraph_FONT_SIZE = 48;

    /**
     * The thickness (diameter) of the line.
     */
    parsegraph_LINE_THICKNESS = 12;

    parsegraph_LINE_COLOR = parsegraph_createColor(.8, .8, .8, 1);
    parsegraph_SELECTED_LINE_COLOR = parsegraph_createColor(.8, .8, .8, 1);

    parsegraph_BUD_RADIUS = 8;

    parsegraph_MIN_BLOCK_HEIGHT = parsegraph_BUD_RADIUS*9;
    parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*15;

    // Inter-node spacing
    parsegraph_HORIZONTAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;
    parsegraph_VERTICAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;

    // Configures graphs to appear grid-like; I call it 'math-mode'.
    if(mathMode) {
        parsegraph_MIN_BLOCK_HEIGHT = parsegraph_MIN_BLOCK_WIDTH;
        parsegraph_HORIZONTAL_SEPARATION_PADDING = 0;
        parsegraph_VERTICAL_SEPARATION_PADDING = 0;
    }

    /**
     * The separation between leaf buds and their parents.
     */
    parsegraph_BUD_LEAF_SEPARATION = 4.2;

    parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION = parsegraph_BUD_RADIUS*3;

    parsegraph_BUD_STYLE = {
        minWidth: parsegraph_BUD_RADIUS*3,
        minHeight: parsegraph_BUD_RADIUS*3,
        horizontalPadding: parsegraph_BUD_RADIUS/2,
        verticalPadding: parsegraph_BUD_RADIUS/2,
        borderColor: parsegraph_createColor(.8, .8, .5, 1),
        backgroundColor: parsegraph_createColor(1, 1, .1, 1),
        selectedBorderColor: parsegraph_createColor(1, 1, 0, 1),
        selectedBackgroundColor: parsegraph_createColor(1, 1, .7, 1),
        borderRoundness: parsegraph_BUD_RADIUS*8,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: 40,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE * (32/48),
        letterWidth: .61,
        verticalSeparation: 9 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_SLIDER_STYLE = {
        minWidth: parsegraph_BUD_RADIUS*24,
        minHeight: parsegraph_BUD_RADIUS*3,
        horizontalPadding: parsegraph_BUD_RADIUS/2,
        verticalPadding: parsegraph_BUD_RADIUS/2,
        borderColor: parsegraph_createColor(.8, .8, .5, 1),
        backgroundColor: parsegraph_createColor(1, 1, .1, 1),
        selectedBorderColor: parsegraph_createColor(1, 1, 0, 1),
        selectedBackgroundColor: parsegraph_createColor(1, 1, .7, 1),
        borderRoundness: parsegraph_BUD_RADIUS*8,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: 40,
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
        borderColor: parsegraph_createColor(.8, .8, 1, 1),
        backgroundColor: parsegraph_createColor(.75, .75, 1, 1),
        selectedBorderColor: parsegraph_createColor(.9, .9, 1, 1),
        selectedBackgroundColor: parsegraph_createColor(.8, .8, 1, 1),
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: 40,
        fontColor: new parsegraph_Color(0, 0, 0, 1),
        selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_SCENE_STYLE = {
        minWidth: parsegraph_MIN_BLOCK_WIDTH,
        minHeight: parsegraph_MIN_BLOCK_HEIGHT,
        horizontalPadding: 3*parsegraph_BUD_RADIUS,
        verticalPadding: .5*parsegraph_BUD_RADIUS,
        borderColor: parsegraph_createColor(.8, .8, 1, 1),
        backgroundColor: parsegraph_createColor(.75, .75, 1, .2),
        selectedBorderColor: parsegraph_createColor(.9, .9, 1, 1),
        selectedBackgroundColor: parsegraph_createColor(.8, .8, 1, 1),
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*1,
        maxLabelChars: 40,
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
        borderColor: parsegraph_createColor(.6, 1, .6, 1),
        backgroundColor: parsegraph_createColor(.75, 1, .75, 1),
        selectedBorderColor: parsegraph_createColor(.95, 1, .95, 1),
        selectedBackgroundColor: parsegraph_createColor(.9, 1, .9, 1),
        borderRoundness: parsegraph_BUD_RADIUS*3,
        borderThickness: parsegraph_BUD_RADIUS*2,
        maxLabelChars: 40,
        fontColor: parsegraph_createColor(0, 0, 0, 1),
        selectedFontColor: parsegraph_createColor(0, 0, 0, 1),
        fontSize: parsegraph_FONT_SIZE,
        letterWidth: .61,
        verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
        horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
    };

    parsegraph_EXTENT_BORDER_COLOR = parsegraph_createColor(1, 1, 0, .2);
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_LINE_THICKNESS;
    parsegraph_EXTENT_BACKGROUND_COLOR = parsegraph_createColor(1, 0, 0, .1);

    parsegraph_EXTENT_BORDER_ROUNDEDNESS = parsegraph_BUD_RADIUS;
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_BUD_RADIUS;
}
