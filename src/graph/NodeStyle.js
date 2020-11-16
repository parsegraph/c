import {Type, readType} from './Node';
import parsegraph_Color from './Color';
import * as Settings from './settings';

/**
 * The thickness (diameter) of the line.
 */
export const parsegraph_LINE_THICKNESS = 12;

export const parsegraph_LINE_COLOR = new parsegraph_Color(0.8, 0.8, 0.8, 0.6);
export const parsegraph_SELECTED_LINE_COLOR = new parsegraph_Color(
    0.8,
    0.8,
    0.8,
    1,
);

export const parsegraph_BUD_RADIUS = 8;

export const parsegraph_MIN_BLOCK_HEIGHT = parsegraph_BUD_RADIUS * 12;
export const parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS * 15;

// Inter-node spacing
export const parsegraph_HORIZONTAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;
export const parsegraph_VERTICAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;

// Configures graphs to appear grid-like; I call it 'math-mode'.
const parsegraph_MIN_BLOCK_WIDTH_MATH = parsegraph_BUD_RADIUS * 40;
const parsegraph_MIN_BLOCK_HEIGHT_MATH = parsegraph_MIN_BLOCK_WIDTH_MATH;
const parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH = 2;
const parsegraph_VERTICAL_SEPARATION_PADDING_MATH = 2;

/**
 * The separation between leaf buds and their parents.
 */
export const parsegraph_BUD_LEAF_SEPARATION = 4.2;

export const parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION =
  parsegraph_BUD_RADIUS * 4.5;

const parsegraph_BUD_STYLE = {
  minWidth: parsegraph_BUD_RADIUS * 3,
  minHeight: parsegraph_BUD_RADIUS * 3,
  horizontalPadding: parsegraph_BUD_RADIUS / 2,
  verticalPadding: parsegraph_BUD_RADIUS / 2,
  borderColor: new parsegraph_Color(0.8, 0.8, 0.5, 1),
  backgroundColor: new parsegraph_Color(1, 1, 0.1, 1),
  selectedBorderColor: new parsegraph_Color(1, 1, 0, 1),
  selectedBackgroundColor: new parsegraph_Color(1, 1, 0.7, 1),
  brightness: 1.5,
  borderRoundness: parsegraph_BUD_RADIUS * 8,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 10.5 * parsegraph_VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING,
};

const parsegraph_SLIDER_STYLE = {
  minWidth: 2 * parsegraph_BUD_RADIUS * 64,
  minHeight: 2 * parsegraph_BUD_RADIUS * 3,
  horizontalPadding: parsegraph_BUD_RADIUS / 2,
  verticalPadding: parsegraph_BUD_RADIUS / 2,
  borderColor: new parsegraph_Color(0.9, 0.6, 0.6, 1),
  backgroundColor: new parsegraph_Color(1, 0.4, 0.4, 1),
  selectedBorderColor: new parsegraph_Color(1, 0.7, 0.7, 1),
  selectedBackgroundColor: new parsegraph_Color(1, 0.5, 0.5, 1),
  brightness: 0.5,
  borderRoundness: parsegraph_BUD_RADIUS * 8,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE * (32 / 48),
  letterWidth: 0.61,
  verticalSeparation: 9 * parsegraph_VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING,
};

const parsegraph_BLOCK_STYLE = {
  minWidth: parsegraph_MIN_BLOCK_WIDTH,
  minHeight: parsegraph_MIN_BLOCK_HEIGHT,
  horizontalPadding: 3 * parsegraph_BUD_RADIUS,
  verticalPadding: 0.5 * parsegraph_BUD_RADIUS,
  borderColor: new parsegraph_Color(0.6, 1, 0.6, 1),
  backgroundColor: new parsegraph_Color(0.75, 1, 0.75, 1),
  selectedBorderColor: new parsegraph_Color(0.8, 0.8, 1, 1),
  selectedBackgroundColor: new parsegraph_Color(0.75, 0.75, 1, 1),
  brightness: 0.75,
  borderRoundness: parsegraph_BUD_RADIUS * 3,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING,
};

export const parsegraph_BLOCK_MATH_STYLE = {
  minWidth: parsegraph_MIN_BLOCK_WIDTH_MATH,
  minHeight: parsegraph_MIN_BLOCK_HEIGHT_MATH,
  horizontalPadding: 2 * parsegraph_BUD_RADIUS,
  verticalPadding: 0.5 * parsegraph_BUD_RADIUS,
  borderColor: new parsegraph_Color(0.6, 1, 0.6, 1),
  backgroundColor: new parsegraph_Color(0.75, 1, 0.75, 1),
  selectedBorderColor: new parsegraph_Color(0.8, 0.8, 1, 1),
  selectedBackgroundColor: new parsegraph_Color(0.75, 0.75, 1, 1),
  brightness: 0.75,
  borderRoundness: parsegraph_BUD_RADIUS * 3,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING_MATH,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH,
};

const parsegraph_SCENE_STYLE = {
  minWidth: 2048,
  minHeight: 1024,
  horizontalPadding: 0,
  verticalPadding: 0,
  borderColor: new parsegraph_Color(0.4, 0.4, 0.4, 1),
  backgroundColor: new parsegraph_Color(0.5, 0.5, 0.5, 1),
  selectedBorderColor: new parsegraph_Color(0.9, 0.9, 1, 1),
  selectedBackgroundColor: new parsegraph_Color(0.8, 0.8, 1, 1),
  brightness: 0.75,
  borderRoundness: parsegraph_BUD_RADIUS * 3,
  borderThickness: parsegraph_BUD_RADIUS * 1,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING,
};

const parsegraph_SLOT_STYLE = {
  minWidth: parsegraph_MIN_BLOCK_WIDTH,
  minHeight: parsegraph_MIN_BLOCK_HEIGHT,
  horizontalPadding: 3 * parsegraph_BUD_RADIUS,
  verticalPadding: 0.5 * parsegraph_BUD_RADIUS,
  borderColor: new parsegraph_Color(1, 1, 1, 1),
  backgroundColor: new parsegraph_Color(0.75, 0.75, 1, 1),
  selectedBorderColor: new parsegraph_Color(0.95, 1, 0.95, 1),
  selectedBackgroundColor: new parsegraph_Color(0.9, 1, 0.9, 1),
  brightness: 0.75,
  borderRoundness: parsegraph_BUD_RADIUS * 3,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING,
};

export const parsegraph_SLOT_MATH_STYLE = {
  minWidth: parsegraph_MIN_BLOCK_WIDTH_MATH,
  minHeight: parsegraph_MIN_BLOCK_HEIGHT_MATH,
  horizontalPadding: 2 * parsegraph_BUD_RADIUS,
  verticalPadding: 0.5 * parsegraph_BUD_RADIUS,
  borderColor: new parsegraph_Color(1, 1, 1, 1),
  backgroundColor: new parsegraph_Color(0.75, 0.75, 1, 1),
  selectedBorderColor: new parsegraph_Color(0.95, 1, 0.95, 1),
  selectedBackgroundColor: new parsegraph_Color(0.9, 1, 0.9, 1),
  brightness: 0.75,
  borderRoundness: parsegraph_BUD_RADIUS * 3,
  borderThickness: parsegraph_BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new parsegraph_Color(0, 0, 0, 1),
  selectedFontColor: new parsegraph_Color(0, 0, 0, 1),
  fontSize: Settings.parsegraph_FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * parsegraph_VERTICAL_SEPARATION_PADDING_MATH,
  horizontalSeparation: 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING_MATH,
};
parsegraph_SLOT_MATH_STYLE.borderColor.setA(1);

export const parsegraph_EXTENT_BORDER_COLOR = new parsegraph_Color(
    1,
    1,
    0,
    0.1,
);
export const parsegraph_EXTENT_BACKGROUND_COLOR = new parsegraph_Color(
    1,
    0,
    0,
    0.5,
);

export const parsegraph_EXTENT_BORDER_ROUNDEDNESS = parsegraph_BUD_RADIUS;
export const parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_BUD_RADIUS;

export function parsegraph_cloneStyle(style) {
  const rv = {};
  for (const styleName in style) {
    rv[styleName] = style[styleName];
  }
  return rv;
}

export function parsegraph_copyStyle(type) {
  const rv = {};
  const copiedStyle = parsegraph_style(type);

  for (const styleName in copiedStyle) {
    rv[styleName] = copiedStyle[styleName];
  }

  return rv;
}

export default function parsegraph_style(type) {
  type = readType(type);

  switch (type) {
    case Type.BUD: {
      return parsegraph_BUD_STYLE;
    }
    case Type.SLOT: {
      return parsegraph_SLOT_STYLE;
    }
    case Type.BLOCK: {
      return parsegraph_BLOCK_STYLE;
    }
    case Type.SLIDER: {
      return parsegraph_SLIDER_STYLE;
    }
    case Type.SCENE: {
      return parsegraph_SCENE_STYLE;
    }
    case Type.NULL:
    default:
      throw new Error('Failed to read Node style: ' + arguments[0]);
  }
}
