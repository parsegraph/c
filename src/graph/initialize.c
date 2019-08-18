#include "initialize.h"
#include "die.h"
#include "Color.h"
#include "Node.h"
#include <stdlib.h>

int parsegraph_NATURAL_GROUP_SIZE;
struct parsegraph_GlyphAtlas* parsegraph_GLYPH_ATLAS = 0;
float parsegraph_MIN_BLOCK_HEIGHT;
float parsegraph_MIN_BLOCK_WIDTH;
float parsegraph_BUD_RADIUS;
float parsegraph_LINE_COLOR[4];
float parsegraph_SELECTED_LINE_COLOR[4];
float parsegraph_SHRINK_SCALE;
float parsegraph_FONT_SIZE;
struct parsegraph_Style* parsegraph_BUD_STYLE;
struct parsegraph_Style* parsegraph_SLIDER_STYLE;
struct parsegraph_Style* parsegraph_BLOCK_STYLE;
struct parsegraph_Style* parsegraph_SCENE_STYLE;
struct parsegraph_Style* parsegraph_SLOT_STYLE;
int parsegraph_WRAP_WIDTH;
float parsegraph_TOUCH_SENSITIVITY;
float parsegraph_MOUSE_SENSITIVITY;
int parsegraph_RIGHT_TO_LEFT;
float parsegraph_MAX_PRESS_RELEASE_DELAY;
float parsegraph_UPSCALED_FONT_SIZE;
float parsegraph_RENDERED_FONT_SIZE;
int parsegraph_WRAP_WIDTH;
float parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION;
float parsegraph_HORIZONTAL_SEPARATION_PADDING;
float parsegraph_VERTICAL_SEPARATION_PADDING;
float parsegraph_EXTENT_BORDER_ROUNDEDNESS;
float parsegraph_EXTENT_BORDER_THICKNESS;
float parsegraph_EXTENT_BORDER_COLOR[4];
float parsegraph_EXTENT_BORDER_THICKNESS;
float parsegraph_EXTENT_BACKGROUND_COLOR[4];
float parsegraph_BUD_LEAF_SEPARATION;
int parsegraph_LINE_THICKNESS;
int parsegraph_FIT_LOOSE;
int parsegraph_CREASE;
int parsegraph_INPUT_LAYOUT_TIME;
int parsegraph_GOVERNOR;
int parsegraph_IDLE_MARGIN;
int parsegraph_BURST_IDLE;
int parsegraph_INTERVAL;

int parsegraph_LAYOUT_ORDER_MAX;
int parsegraph_VERTICAL_ORDER[7];
int parsegraph_HORIZONTAL_ORDER[7];

struct parsegraph_GlyphAtlas* parsegraph_buildGlyphAtlas(apr_pool_t* ppool)
{
    const char* parsegraph_DEFAULT_FONT_NAME = "sans-serif";

    if(!parsegraph_GLYPH_ATLAS) {
        UChar fontName16[256];
        u_memset(fontName16, 0, 256);
        UErrorCode uerr = U_ZERO_ERROR;
        int len;
        u_strFromUTF8(fontName16, 255, &len, parsegraph_DEFAULT_FONT_NAME, -1, &uerr);
        if(uerr != U_ZERO_ERROR) {
            parsegraph_die("Failed to convert font name to UTF-16");
        }
        parsegraph_GLYPH_ATLAS = parsegraph_GlyphAtlas_new(ppool,
            parsegraph_UPSCALED_FONT_SIZE, fontName16, len, "white"
        );
    }
    return parsegraph_GLYPH_ATLAS;
}

void parsegraph_initialize(apr_pool_t* pool, int mathMode)
{
    parsegraph_NATURAL_GROUP_SIZE = 250;

    parsegraph_TOUCH_SENSITIVITY = 1;
    parsegraph_MOUSE_SENSITIVITY = 1;

    // How long painting is done, and optionally, how fast idle loops will render.
    parsegraph_INTERVAL = 10;

    // Whether idle loops are limited to being called only as often as parsegraph_INTERVAL.
    parsegraph_GOVERNOR = 1;

    // Where the idle loop is called multiple times per frame if time remains.
    parsegraph_BURST_IDLE = 1;

    // Whether Node's forward and backward are switched.
    parsegraph_RIGHT_TO_LEFT = 0;

    // How many milliseconds to commit a layout if an input event is detected.
    parsegraph_INPUT_LAYOUT_TIME = 500;

    parsegraph_IDLE_MARGIN = 0;

    parsegraph_LAYOUT_ORDER_MAX = 5;

    parsegraph_HORIZONTAL_ORDER[0] = parsegraph_BACKWARD;
    parsegraph_HORIZONTAL_ORDER[1] = parsegraph_FORWARD;
    parsegraph_HORIZONTAL_ORDER[2] = parsegraph_DOWNWARD;
    parsegraph_HORIZONTAL_ORDER[3] = parsegraph_UPWARD;
    parsegraph_HORIZONTAL_ORDER[4] = parsegraph_INWARD;
    parsegraph_HORIZONTAL_ORDER[5] = parsegraph_OUTWARD;
    parsegraph_HORIZONTAL_ORDER[6] = parsegraph_NULL_NODE_DIRECTION;

    parsegraph_VERTICAL_ORDER[0] = parsegraph_DOWNWARD;
    parsegraph_VERTICAL_ORDER[1] = parsegraph_UPWARD;
    parsegraph_VERTICAL_ORDER[2] = parsegraph_BACKWARD;
    parsegraph_VERTICAL_ORDER[3] = parsegraph_FORWARD;
    parsegraph_VERTICAL_ORDER[4] = parsegraph_INWARD;
    parsegraph_VERTICAL_ORDER[5] = parsegraph_OUTWARD;
    parsegraph_VERTICAL_ORDER[6] = parsegraph_NULL_NODE_DIRECTION;

    // Optimization hints.
    parsegraph_FIT_LOOSE = 0;
    parsegraph_CREASE = 1;

    parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

    // Background
    parsegraph_Color_SetRGBA(parsegraph_BACKGROUND_COLOR,
        0, 47.0/255.0, 57.0/255.0, 1
        //256.0/255.0, 1, 1, 1
        //45.0/255.0, 84.0/255.0, 127.0/255.0, 1
    );

    // Font
    parsegraph_FONT_SIZE = 72;
    parsegraph_UPSCALED_FONT_SIZE = parsegraph_FONT_SIZE;
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

    parsegraph_Color_SetRGBA(parsegraph_LINE_COLOR, .8, .8, .8, .6);
    parsegraph_Color_SetRGBA(parsegraph_SELECTED_LINE_COLOR, .8, .8, .8, .1);

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

    parsegraph_BUD_STYLE = apr_palloc(pool, sizeof(struct parsegraph_Style));
    parsegraph_BUD_STYLE->minWidth = parsegraph_BUD_RADIUS*3;
    parsegraph_BUD_STYLE->minHeight = parsegraph_BUD_RADIUS*3;
    parsegraph_BUD_STYLE->horizontalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_BUD_STYLE->verticalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->borderColor, .8, .8, .5, 1);
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->backgroundColor, 1, 1, .1, 1);
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->selectedBorderColor, 1, 1, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->selectedBackgroundColor, 1, 1, .7, 1);
    parsegraph_BUD_STYLE->brightness = 1.5;
    parsegraph_BUD_STYLE->borderRoundness = parsegraph_BUD_RADIUS*8;
    parsegraph_BUD_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_BUD_STYLE->maxLabelChars = 0;
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->fontColor, 0, 0, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_BUD_STYLE->selectedFontColor, 0, 0, 0, 1);
    parsegraph_BUD_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_BUD_STYLE->letterWidth = .61;
    parsegraph_BUD_STYLE->verticalSeparation = 10.5 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_BUD_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_SLIDER_STYLE = apr_palloc(pool, sizeof(parsegraph_Style));
    parsegraph_SLIDER_STYLE->minWidth = 2*parsegraph_BUD_RADIUS*64;
    parsegraph_SLIDER_STYLE->minHeight = 2*parsegraph_BUD_RADIUS*3;
    parsegraph_SLIDER_STYLE->horizontalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_SLIDER_STYLE->verticalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->borderColor, .9, .6, .6, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->backgroundColor, 1, .4, .4, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->selectedBorderColor, 1, .7, .7, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->selectedBackgroundColor, 1, .5, .5, 1);
    parsegraph_SLIDER_STYLE->brightness = 0.5;
    parsegraph_SLIDER_STYLE->borderRoundness = parsegraph_BUD_RADIUS*8;
    parsegraph_SLIDER_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_SLIDER_STYLE->maxLabelChars = 0;
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->fontColor, 0, 0, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLIDER_STYLE->selectedFontColor, 0, 0, 0, 1);
    parsegraph_SLIDER_STYLE->fontSize = (int)((float)parsegraph_FONT_SIZE * (32.0/48));
    parsegraph_SLIDER_STYLE->letterWidth = .61;
    parsegraph_SLIDER_STYLE->verticalSeparation = 9 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_SLIDER_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_BLOCK_STYLE = apr_palloc(pool, sizeof(parsegraph_Style));
    parsegraph_BLOCK_STYLE->minWidth = parsegraph_MIN_BLOCK_WIDTH;
    parsegraph_BLOCK_STYLE->minHeight = parsegraph_MIN_BLOCK_HEIGHT;
    parsegraph_BLOCK_STYLE->horizontalPadding = 3*parsegraph_BUD_RADIUS;
    parsegraph_BLOCK_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->borderColor, .6, 1, .6, 1);
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->backgroundColor, .75, 1, .75, 1);
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->selectedBorderColor, .8, .8, 1, 1);
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->selectedBackgroundColor, .75, .75, 1, 1);
    parsegraph_BLOCK_STYLE->brightness = 0.75;
    parsegraph_BLOCK_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_BLOCK_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_BLOCK_STYLE->maxLabelChars = 0;
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->fontColor, 0, 0, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_BLOCK_STYLE->selectedFontColor, 0, 0, 0, 1);
    parsegraph_BLOCK_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_BLOCK_STYLE->letterWidth = .61;
    parsegraph_BLOCK_STYLE->verticalSeparation = 6 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_BLOCK_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    if(mathMode) {
        parsegraph_BLOCK_STYLE->horizontalPadding = 2*parsegraph_BUD_RADIUS;
        parsegraph_BLOCK_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    }

    parsegraph_SCENE_STYLE = apr_palloc(pool, sizeof(parsegraph_Style));
    parsegraph_SCENE_STYLE->minWidth = 2048;
    parsegraph_SCENE_STYLE->minHeight = 1024;
    parsegraph_SCENE_STYLE->horizontalPadding = 0;
    parsegraph_SCENE_STYLE->verticalPadding = 0;
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->borderColor, .4, .4, .4, 1);
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->backgroundColor, .5, .5, .5, 1);
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->selectedBorderColor, .9, .9, 1, 1);
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->selectedBackgroundColor, .8, .8, 1, 1);
    parsegraph_SCENE_STYLE->brightness = 0.75;
    parsegraph_SCENE_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_SCENE_STYLE->borderThickness = parsegraph_BUD_RADIUS*1;
    parsegraph_SCENE_STYLE->maxLabelChars = 0;
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->fontColor, 0, 0, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_SCENE_STYLE->selectedFontColor, 0, 0, 0, 1);
    parsegraph_SCENE_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_SCENE_STYLE->letterWidth = .61;
    parsegraph_SCENE_STYLE->verticalSeparation = 6 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_SCENE_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_SLOT_STYLE = apr_palloc(pool, sizeof(parsegraph_Style));
    parsegraph_SLOT_STYLE->minWidth = parsegraph_MIN_BLOCK_WIDTH;
    parsegraph_SLOT_STYLE->minHeight = parsegraph_MIN_BLOCK_HEIGHT;
    parsegraph_SLOT_STYLE->horizontalPadding = 3*parsegraph_BUD_RADIUS;
    parsegraph_SLOT_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->borderColor, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->backgroundColor, .75, .75, 1, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->selectedBorderColor, .95, 1, .95, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->selectedBackgroundColor, .9, 1, .9, 1);
    parsegraph_SLOT_STYLE->brightness = 0.75;
    parsegraph_SLOT_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_SLOT_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_SLOT_STYLE->maxLabelChars = 0;
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->fontColor, 0, 0, 0, 1);
    parsegraph_Color_SetRGBA(parsegraph_SLOT_STYLE->selectedFontColor, 0, 0, 0, 1);
    parsegraph_SLOT_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_SLOT_STYLE->letterWidth = .61;
    parsegraph_SLOT_STYLE->verticalSeparation = 6 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_SLOT_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    if(mathMode) {
        parsegraph_SLOT_STYLE->horizontalPadding = 2*parsegraph_BUD_RADIUS;
        parsegraph_SLOT_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    }

    if(mathMode) {
        //parsegraph_BLOCK_STYLE.verticalPadding = parsegraph_SLOT_STYLE.verticalPadding;
        parsegraph_SLOT_STYLE->borderColor[3] = 1;
    }

    parsegraph_Color_SetRGBA(parsegraph_EXTENT_BORDER_COLOR, 1, 1, 0, .1);
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_LINE_THICKNESS;
    parsegraph_Color_SetRGBA(parsegraph_EXTENT_BACKGROUND_COLOR, 1, 0, 0, .5);

    parsegraph_EXTENT_BORDER_ROUNDEDNESS = parsegraph_BUD_RADIUS;
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_BUD_RADIUS;
}

parsegraph_Style* parsegraph_copyStyle(apr_pool_t* pool, int type)
{
    parsegraph_Style* style;
    if(pool) {
        style = apr_palloc(pool, sizeof(*style));
    }
    else {
        style = malloc(sizeof(*style));
    }
    parsegraph_Style* copiedStyle = parsegraph_style(type);
    memcpy(style, copiedStyle, sizeof(*style));
    return style;
}

parsegraph_Style* parsegraph_style(int type)
{
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
        return 0;
    }
}
