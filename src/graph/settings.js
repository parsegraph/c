import parsegraph_Color from './Color';
import parsegraph_Font from './Font';

// ////////////////////////////////////////////////////////////////////////////
//
// Internationalization
//
// ////////////////////////////////////////////////////////////////////////////

// Whether Node's forward and backward are switched.
export const parsegraph_RIGHT_TO_LEFT = false;

// ////////////////////////////////////////////////////////////////////////////
//
// Rendering settings
//
// ////////////////////////////////////////////////////////////////////////////

// Whether the viewport is flipped vertically when rendered.
export const parsegraph_VFLIP = false;

// Whether GL errors are checked or not; disabling this improves performance.
export const parsegraph_IGNORE_GL_ERRORS = true;

// How long painting is done, and optionally, how fast idle loops will render.
export const parsegraph_INTERVAL = 15;

// How often the idle timer is run when the application is not being rendered.
export const parsegraph_BACKGROUND_INTERVAL = parsegraph_INTERVAL * 4;

// Whether idle loops are limited to being called only as often as parsegraph_INTERVAL.
export const parsegraph_GOVERNOR = true;

// Where the idle loop is called multiple times per frame if time remains.
export const parsegraph_BURST_IDLE = false;

// The width in pixels of any texture.
export const parsegraph_MAX_TEXTURE_SIZE = 512;

// The width in pixels of a font's glyph page.
export const parsegraph_MAX_PAGE_WIDTH = 512;

// The largest scale at which nodes are shown in camera.
export const parsegraph_NATURAL_VIEWPORT_SCALE = 0.5;

// The maximum scale where nodes will be rendered from a cache.
export const parsegraph_FREEZER_TEXTURE_SCALE = 0.01;
export const parsegraph_CACHE_ACTIVATION_SCALE = 0.01;

// ////////////////////////////////////////////////////////////////////////////
//
// User input settings
//
// ////////////////////////////////////////////////////////////////////////////

export const parsegraph_CLICK_DELAY_MILLIS = 500;

// The amount by which a slider is adjusted by keyboard and mouse events.
export const parsegraph_SLIDER_NUDGE = 0.01;

// How long the carousel takes, in milliseconds, to open.
export const parsegraph_CAROUSEL_SHOW_DURATION = 200;

export const parsegraph_TOUCH_SENSITIVITY = 1;
export const parsegraph_MOUSE_SENSITIVITY = 1;

// How many milliseconds to commit a layout if an input event is detected.
export const parsegraph_INPUT_LAYOUT_TIME = parsegraph_INTERVAL;

// Amount of time, in milliseconds, reserved for idling.
export const parsegraph_IDLE_MARGIN = 1;

// ////////////////////////////////////////////////////////////////////////////
//
// Text settings
//
// ////////////////////////////////////////////////////////////////////////////

export const parsegraph_FONT_SIZE = 72;
export const parsegraph_FONT_UPSCALE = 1;
export const parsegraph_UPSCALED_FONT_SIZE =
  parsegraph_FONT_UPSCALE * parsegraph_FONT_SIZE;
export const parsegraph_LETTER_HEIGHT = 2.0;
export const parsegraph_SDF_RADIUS = 8;

let parsegraph_DEFAULT_FONT = null;
export function parsegraph_defaultFont() {
  if (!parsegraph_DEFAULT_FONT) {
    parsegraph_DEFAULT_FONT = new parsegraph_Font(
        parsegraph_UPSCALED_FONT_SIZE,
        'sans-serif',
        'white',
    );
  }
  return parsegraph_DEFAULT_FONT;
}

// ////////////////////////////////////////////////////////////////////////////
//
// Optimization hints.
//
// ////////////////////////////////////////////////////////////////////////////

// The size used to split large number of nodes into creased graphs.
export const parsegraph_NATURAL_GROUP_SIZE = 250;

// Use a faster combining algorithm to speed layout calculation.
export const parsegraph_FIT_LOOSE = false;

// Whether graphs should be creased.
export const CREASE = false;

export const parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

// The scale at which shrunk nodes are shrunk.
export const parsegraph_SHRINK_SCALE = 0.85;

// Background color.
export const parsegraph_BACKGROUND_COLOR = new parsegraph_Color(
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
export const parsegraph_FUZZINESS = 1e-6;
