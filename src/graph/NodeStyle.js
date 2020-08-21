import * as NodeType from './NodeType';
import parsegraph_Color from './Color';
import * as Settings from './settings';

/**
 * The thickness (diameter) of the line.
 */
export const parsegraph_LINE_THICKNESS = 12;

export const parsegraph_LINE_COLOR = new parsegraph_Color(.8, .8, .8, .6);
export const parsegraph_SELECTED_LINE_COLOR = new parsegraph_Color(.8, .8, .8, 1);

export const parsegraph_BUD_RADIUS = 8;

export const parsegraph_MIN_BLOCK_HEIGHT = parsegraph_BUD_RADIUS*12;
export const parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*15;

// Inter-node spacing
export const parsegraph_HORIZONTAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;
export const parsegraph_VERTICAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;

// Configures graphs to appear grid-like; I call it 'math-mode'.
const parsegraph_MIN_BLOCK_WIDTH_MATH = parsegraph_BUD_RADIUS*40;
const parsegraph_MIN_BLOCK_HEIGHT_MATH = parsegraph_MIN_BLOCK_WIDTH_MATH;
const parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH = 2;
const parsegraph_VERTICAL_SEPARATION_PADDING_MATH = 2;

/**
 * The separation between leaf buds and their parents.
 */
export const parsegraph_BUD_LEAF_SEPARATION = 4.2;

export const parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION = parsegraph_BUD_RADIUS*4.5;

const parsegraph_BUD_STYLE = {
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 10.5 * parsegraph_VERTICAL_SEPARATION_PADDING,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
};

const parsegraph_SLIDER_STYLE = {
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
    fontSize: Settings.parsegraph_FONT_SIZE * (32/48),
    letterWidth: .61,
    verticalSeparation: 9 * parsegraph_VERTICAL_SEPARATION_PADDING,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
};

const parsegraph_BLOCK_STYLE = {
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
};

export const parsegraph_BLOCK_MATH_STYLE = {
    minWidth: parsegraph_MIN_BLOCK_WIDTH_MATH,
    minHeight: parsegraph_MIN_BLOCK_HEIGHT_MATH,
    horizontalPadding: 2*parsegraph_BUD_RADIUS,
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING_MATH,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH
};

const parsegraph_SCENE_STYLE = {
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
};

const parsegraph_SLOT_STYLE = {
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING
};

export const parsegraph_SLOT_MATH_STYLE = {
    minWidth: parsegraph_MIN_BLOCK_WIDTH_MATH,
    minHeight: parsegraph_MIN_BLOCK_HEIGHT_MATH,
    horizontalPadding: 2*parsegraph_BUD_RADIUS,
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
    fontSize: Settings.parsegraph_FONT_SIZE,
    letterWidth: .61,
    verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING_MATH,
    horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH
};
parsegraph_SLOT_MATH_STYLE.borderColor.setA(1);

export const parsegraph_EXTENT_BORDER_COLOR = new parsegraph_Color(1, 1, 0, .1);
export const parsegraph_EXTENT_BACKGROUND_COLOR = new parsegraph_Color(1, 0, 0, .5);

export const parsegraph_EXTENT_BORDER_ROUNDEDNESS = parsegraph_BUD_RADIUS;
export const parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_BUD_RADIUS;

export function parsegraph_cloneStyle(style)
{
    var rv = {};
    for(var styleName in style) {
        rv[styleName] = style[styleName];
    }
    return rv;
}

export function parsegraph_copyStyle(type)
{
    var rv = {};
    var copiedStyle = parsegraph_style(type);

    for(var styleName in copiedStyle) {
        rv[styleName] = copiedStyle[styleName];
    }

    return rv;
}

export default function parsegraph_style(type)
{
    type = NodeType.parsegraph_readNodeType(type);

    switch(type) {
    case NodeType.parsegraph_BUD:
    {
        return parsegraph_BUD_STYLE;
    }
    case NodeType.parsegraph_SLOT:
    {
        return parsegraph_SLOT_STYLE;
    }
    case NodeType.parsegraph_BLOCK:
    {
        return parsegraph_BLOCK_STYLE;
    }
    case NodeType.parsegraph_SLIDER:
    {
        return parsegraph_SLIDER_STYLE;
    }
    case NodeType.parsegraph_SCENE:
    {
        return parsegraph_SCENE_STYLE;
    }
    case NodeType.parsegraph_NULL_NODE_TYPE:
    default:
        return null;
    }
};
