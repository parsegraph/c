import Color from './Color';
import Font from './Font';

// ////////////////////////////////////////////////////////////////////////////
//
// Internationalization
//
// ////////////////////////////////////////////////////////////////////////////

// Whether Node's forward and backward are switched.
export const RIGHT_TO_LEFT = false;

// ////////////////////////////////////////////////////////////////////////////
//
// Rendering settings
//
// ////////////////////////////////////////////////////////////////////////////

// Whether the viewport is flipped vertically when rendered.
export const VFLIP = false;

// Whether GL errors are checked or not; disabling this improves performance.
export const IGNORE_GL_ERRORS = true;

// How long painting is done, and optionally, how fast idle loops will render.
export const INTERVAL = 15;

// How often the idle timer is run when the application is not being rendered.
export const BACKGROUND_INTERVAL = INTERVAL * 4;

// Whether idle loops are limited to being called only as
// often as parsegraph_INTERVAL.
export const GOVERNOR = true;

// Where the idle loop is called multiple times per frame if time remains.
export const BURST_IDLE = false;

// The width in pixels of any texture.
export const MAX_TEXTURE_SIZE = 512;

// The width in pixels of a font's glyph page.
export const MAX_PAGE_WIDTH = 512;

// The largest scale at which nodes are shown in camera.
export const NATURAL_VIEWPORT_SCALE = 0.5;

// The maximum scale where nodes will be rendered from a cache.
export const FREEZER_TEXTURE_SCALE = 0.01;
export const CACHE_ACTIVATION_SCALE = 0.01;

// ////////////////////////////////////////////////////////////////////////////
//
// User input settings
//
// ////////////////////////////////////////////////////////////////////////////

export const CLICK_DELAY_MILLIS = 500;

// The amount by which a slider is adjusted by keyboard and mouse events.
export const SLIDER_NUDGE = 0.01;

// How long the carousel takes, in milliseconds, to open.
export const CAROUSEL_SHOW_DURATION = 200;

export const TOUCH_SENSITIVITY = 1;
export const MOUSE_SENSITIVITY = 1;

// How many milliseconds to commit a layout if an input event is detected.
export const INPUT_LAYOUT_TIME = INTERVAL;

// Amount of time, in milliseconds, reserved for idling.
export const IDLE_MARGIN = 1;

// ////////////////////////////////////////////////////////////////////////////
//
// Text settings
//
// ////////////////////////////////////////////////////////////////////////////

export const FONT_SIZE = 72;
export const FONT_UPSCALE = 1;
export const UPSCALED_FONT_SIZE =
  FONT_UPSCALE * FONT_SIZE;
export const LETTER_HEIGHT = 2.0;
export const SDF_RADIUS = 8;

let DEFAULT_FONT = null;
// eslint-disable-next-line require-jsdoc
export function defaultFont() {
  if (!DEFAULT_FONT) {
    DEFAULT_FONT = new Font(
        UPSCALED_FONT_SIZE,
        'sans-serif',
        'white',
    );
  }
  return DEFAULT_FONT;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Optimization hints.
//
// ////////////////////////////////////////////////////////////////////////////

// The size used to split large number of nodes into creased graphs.
export const NATURAL_GROUP_SIZE = 250;

// Use a faster combining algorithm to speed layout calculation.
export const FIT_LOOSE = false;

// Whether graphs should be creased.
export const CREASE = false;

export const MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

// The scale at which shrunk nodes are shrunk.
export const SHRINK_SCALE = 0.85;

// Background color.
export const BACKGROUND_COLOR = new Color(
    0,
    47 / 255,
    57 / 255,
    1,
    // 256/255, 255/255, 255/255, 1
    // 45/255, 84/255, 127/255, 1
);

// ////////////////////////////////////////////////////////////////////////////
//
// Mathematical settings
//
// ////////////////////////////////////////////////////////////////////////////

// Values are considered equal if their difference is less than this value.
export const FUZZINESS = 1e-6;
