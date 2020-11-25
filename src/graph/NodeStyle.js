import {Type, readType} from './Node';
import Color from './Color';
import * as Settings from './settings';
/* eslint-disable require-jsdoc */

/**
 * The thickness (diameter) of the line.
 */
export const LINE_THICKNESS = 12;

export const LINE_COLOR = new Color(0.8, 0.8, 0.8, 0.6);
export const SELECTED_LINE_COLOR = new Color(
    0.8,
    0.8,
    0.8,
    1,
);

export const BUD_RADIUS = 8;

export const MIN_BLOCK_HEIGHT = BUD_RADIUS * 12;
export const MIN_BLOCK_WIDTH = BUD_RADIUS * 15;

// Inter-node spacing
export const HORIZONTAL_SEPARATION_PADDING = BUD_RADIUS;
export const VERTICAL_SEPARATION_PADDING = BUD_RADIUS;

// Configures graphs to appear grid-like; I call it 'math-mode'.
const MIN_BLOCK_WIDTH_MATH = BUD_RADIUS * 40;
const MIN_BLOCK_HEIGHT_MATH = MIN_BLOCK_WIDTH_MATH;
const HORIZONTAL_SEPARATION_PADDING_MATH = 2;
const VERTICAL_SEPARATION_PADDING_MATH = 2;

/**
 * The separation between leaf buds and their parents.
 */
export const BUD_LEAF_SEPARATION = 4.2;

export const BUD_TO_BUD_VERTICAL_SEPARATION =
  BUD_RADIUS * 4.5;

const BUD_STYLE = {
  minWidth: BUD_RADIUS * 3,
  minHeight: BUD_RADIUS * 3,
  horizontalPadding: BUD_RADIUS / 2,
  verticalPadding: BUD_RADIUS / 2,
  borderColor: new Color(0.8, 0.8, 0.5, 1),
  backgroundColor: new Color(1, 1, 0.1, 1),
  selectedBorderColor: new Color(1, 1, 0, 1),
  selectedBackgroundColor: new Color(1, 1, 0.7, 1),
  brightness: 1.5,
  borderRoundness: BUD_RADIUS * 8,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 10.5 * VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
};

const SLIDER_STYLE = {
  minWidth: 2 * BUD_RADIUS * 64,
  minHeight: 2 * BUD_RADIUS * 3,
  horizontalPadding: BUD_RADIUS / 2,
  verticalPadding: BUD_RADIUS / 2,
  borderColor: new Color(0.9, 0.6, 0.6, 1),
  backgroundColor: new Color(1, 0.4, 0.4, 1),
  selectedBorderColor: new Color(1, 0.7, 0.7, 1),
  selectedBackgroundColor: new Color(1, 0.5, 0.5, 1),
  brightness: 0.5,
  borderRoundness: BUD_RADIUS * 8,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE * (32 / 48),
  letterWidth: 0.61,
  verticalSeparation: 9 * VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
};

const BLOCK_STYLE = {
  minWidth: MIN_BLOCK_WIDTH,
  minHeight: MIN_BLOCK_HEIGHT,
  horizontalPadding: 3 * BUD_RADIUS,
  verticalPadding: 0.5 * BUD_RADIUS,
  borderColor: new Color(0.6, 1, 0.6, 1),
  backgroundColor: new Color(0.75, 1, 0.75, 1),
  selectedBorderColor: new Color(0.8, 0.8, 1, 1),
  selectedBackgroundColor: new Color(0.75, 0.75, 1, 1),
  brightness: 0.75,
  borderRoundness: BUD_RADIUS * 3,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
};

export const BLOCK_MATH_STYLE = {
  minWidth: MIN_BLOCK_WIDTH_MATH,
  minHeight: MIN_BLOCK_HEIGHT_MATH,
  horizontalPadding: 2 * BUD_RADIUS,
  verticalPadding: 0.5 * BUD_RADIUS,
  borderColor: new Color(0.6, 1, 0.6, 1),
  backgroundColor: new Color(0.75, 1, 0.75, 1),
  selectedBorderColor: new Color(0.8, 0.8, 1, 1),
  selectedBackgroundColor: new Color(0.75, 0.75, 1, 1),
  brightness: 0.75,
  borderRoundness: BUD_RADIUS * 3,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING_MATH,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING_MATH,
};

const SCENE_STYLE = {
  minWidth: 2048,
  minHeight: 1024,
  horizontalPadding: 0,
  verticalPadding: 0,
  borderColor: new Color(0.4, 0.4, 0.4, 1),
  backgroundColor: new Color(0.5, 0.5, 0.5, 1),
  selectedBorderColor: new Color(0.9, 0.9, 1, 1),
  selectedBackgroundColor: new Color(0.8, 0.8, 1, 1),
  brightness: 0.75,
  borderRoundness: BUD_RADIUS * 3,
  borderThickness: BUD_RADIUS * 1,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
};

const SLOT_STYLE = {
  minWidth: MIN_BLOCK_WIDTH,
  minHeight: MIN_BLOCK_HEIGHT,
  horizontalPadding: 3 * BUD_RADIUS,
  verticalPadding: 0.5 * BUD_RADIUS,
  borderColor: new Color(1, 1, 1, 1),
  backgroundColor: new Color(0.75, 0.75, 1, 1),
  selectedBorderColor: new Color(0.95, 1, 0.95, 1),
  selectedBackgroundColor: new Color(0.9, 1, 0.9, 1),
  brightness: 0.75,
  borderRoundness: BUD_RADIUS * 3,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING,
};

export const SLOT_MATH_STYLE = {
  minWidth: MIN_BLOCK_WIDTH_MATH,
  minHeight: MIN_BLOCK_HEIGHT_MATH,
  horizontalPadding: 2 * BUD_RADIUS,
  verticalPadding: 0.5 * BUD_RADIUS,
  borderColor: new Color(1, 1, 1, 1),
  backgroundColor: new Color(0.75, 0.75, 1, 1),
  selectedBorderColor: new Color(0.95, 1, 0.95, 1),
  selectedBackgroundColor: new Color(0.9, 1, 0.9, 1),
  brightness: 0.75,
  borderRoundness: BUD_RADIUS * 3,
  borderThickness: BUD_RADIUS * 2,
  maxLabelChars: null,
  fontColor: new Color(0, 0, 0, 1),
  selectedFontColor: new Color(0, 0, 0, 1),
  fontSize: Settings.FONT_SIZE,
  letterWidth: 0.61,
  verticalSeparation: 6 * VERTICAL_SEPARATION_PADDING_MATH,
  horizontalSeparation: 7 * HORIZONTAL_SEPARATION_PADDING_MATH,
};
SLOT_MATH_STYLE.borderColor.setA(1);

export const EXTENT_BORDER_COLOR = new Color(
    1,
    1,
    0,
    0.1,
);
export const EXTENT_BACKGROUND_COLOR = new Color(
    1,
    0,
    0,
    0.5,
);

export const EXTENT_BORDER_ROUNDEDNESS = BUD_RADIUS;
export const EXTENT_BORDER_THICKNESS = BUD_RADIUS;

export function cloneStyle(style) {
  const rv = {};
  for (const styleName in style) {
    if (Object.prototype.hasOwnProperty.call(copiedStyle, styleName)) {
      rv[styleName] = style[styleName];
    }
  }
  return rv;
}

export function copyStyle(type) {
  const rv = {};
  const copiedStyle = style(type);

  for (const styleName in copiedStyle) {
    if (Object.prototype.hasOwnProperty.call(copiedStyle, styleName)) {
      rv[styleName] = copiedStyle[styleName];
    }
  }

  return rv;
}

export default function style(type, ...args) {
  type = readType(type);

  switch (type) {
    case Type.BUD: {
      return BUD_STYLE;
    }
    case Type.SLOT: {
      return SLOT_STYLE;
    }
    case Type.BLOCK: {
      return BLOCK_STYLE;
    }
    case Type.SLIDER: {
      return SLIDER_STYLE;
    }
    case Type.SCENE: {
      return SCENE_STYLE;
    }
    case Type.NULL:
    default:
      throw new Error('Failed to read Node style: ' + args[0]);
  }
}
