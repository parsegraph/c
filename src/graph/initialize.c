#include "initialize.h"
#include "Color.h"
#include "Node.h"

struct parsegraph_GlyphAtlas* parsegraph_GLYPH_ATLAS = 0;
float parsegraph_MIN_BLOCK_HEIGHT;
float parsegraph_MIN_BLOCK_WIDTH;
float parsegraph_BUD_RADIUS;
float* parsegraph_LINE_COLOR;
float* parsegraph_SELECTED_LINE_COLOR;
float parsegraph_SHRINK_SCALE;
int parsegraph_FONT_SIZE;
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
int parsegraph_UPSCALED_FONT_SIZE;
int parsegraph_RENDERED_FONT_SIZE;
int parsegraph_WRAP_WIDTH;
float parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION;
float parsegraph_HORIZONTAL_SEPARATION_PADDING;
float parsegraph_VERTICAL_SEPARATION_PADDING;
float parsegraph_EXTENT_BORDER_ROUNDEDNESS;
float parsegraph_EXTENT_BORDER_THICKNESS;
float* parsegraph_EXTENT_BORDER_COLOR;
float parsegraph_EXTENT_BORDER_THICKNESS;
float* parsegraph_EXTENT_BACKGROUND_COLOR;
float parsegraph_BUD_LEAF_SEPARATION;
float* parsegraph_BACKGROUND_COLOR;
int parsegraph_LINE_THICKNESS;

struct parsegraph_GlyphAtlas* parsegraph_buildGlyphAtlas()
{
    if(!parsegraph_GLYPH_ATLAS) {
        parsegraph_GLYPH_ATLAS = parsegraph_GlyphAtlas_new(0,
            parsegraph_UPSCALED_FONT_SIZE, "sans-serif", "white"
        );
    }
    return parsegraph_GLYPH_ATLAS;
}

void parsegraph_initialize(apr_pool_t* pool, int mathMode)
{
    parsegraph_TOUCH_SENSITIVITY = 1;
    parsegraph_MOUSE_SENSITIVITY = 1;

    // Whether Node's forward and backward are switched.
    parsegraph_RIGHT_TO_LEFT = 0;

    parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;

    // Background
    parsegraph_BACKGROUND_COLOR = parsegraph_Color_new(pool,
        0, 47/255, 57/255, 1
        //256/255, 255/255, 255/255, 1
        //45/255, 84/255, 127/255, 1
    );

    // Font
    parsegraph_UPSCALED_FONT_SIZE = 144;
    parsegraph_RENDERED_FONT_SIZE = parsegraph_UPSCALED_FONT_SIZE/4;
    parsegraph_WRAP_WIDTH = 80 * parsegraph_RENDERED_FONT_SIZE;

    /**
     * The scale at which shrunk nodes are shrunk.
     */
    parsegraph_SHRINK_SCALE = .85;

    /**
     * Base font size.
     */
    parsegraph_FONT_SIZE = 72;

    /**
     * The thickness (diameter) of the line.
     */
    parsegraph_LINE_THICKNESS = 12;

    parsegraph_LINE_COLOR = parsegraph_Color_new(pool, .8, .8, .8, .6);
    parsegraph_SELECTED_LINE_COLOR = parsegraph_Color_new(pool, .8, .8, .8, 1);

    parsegraph_BUD_RADIUS = 8;

    parsegraph_MIN_BLOCK_HEIGHT = parsegraph_BUD_RADIUS*12;
    parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*15;

    // Inter-node spacing
    parsegraph_HORIZONTAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;
    parsegraph_VERTICAL_SEPARATION_PADDING = parsegraph_BUD_RADIUS;

    // Configures graphs to appear grid-like; I call it 'math-mode'.
    if(mathMode) {
        parsegraph_MIN_BLOCK_WIDTH = parsegraph_BUD_RADIUS*30;
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
    parsegraph_BUD_STYLE->borderColor = parsegraph_Color_new(pool, .8, .8, .5, 1);
    parsegraph_BUD_STYLE->backgroundColor =  parsegraph_Color_new(pool, 1, 1, .1, 1);
    parsegraph_BUD_STYLE->selectedBorderColor = parsegraph_Color_new(pool, 1, 1, 0, 1);
    parsegraph_BUD_STYLE->selectedBackgroundColor = parsegraph_Color_new(pool, 1, 1, .7, 1);
    parsegraph_BUD_STYLE->brightness = 1.5;
    parsegraph_BUD_STYLE->borderRoundness = parsegraph_BUD_RADIUS*8;
    parsegraph_BUD_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_BUD_STYLE->maxLabelChars = 0;
    parsegraph_BUD_STYLE->fontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_BUD_STYLE->selectedFontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_BUD_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_BUD_STYLE->letterWidth = .61;
    parsegraph_BUD_STYLE->verticalSeparation = 10.5 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_BUD_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_SLIDER_STYLE->minWidth = 2*parsegraph_BUD_RADIUS*24;
    parsegraph_SLIDER_STYLE->minHeight = 2*parsegraph_BUD_RADIUS*3;
    parsegraph_SLIDER_STYLE->horizontalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_SLIDER_STYLE->verticalPadding = parsegraph_BUD_RADIUS/2;
    parsegraph_SLIDER_STYLE->borderColor = parsegraph_Color_new(pool, .9, .6, .6, 1);
    parsegraph_SLIDER_STYLE->backgroundColor = parsegraph_Color_new(pool, 1, .4, .4, 1);
    parsegraph_SLIDER_STYLE->selectedBorderColor = parsegraph_Color_new(pool, 1, .7, .7, 1);
    parsegraph_SLIDER_STYLE->selectedBackgroundColor = parsegraph_Color_new(pool, 1, .5, .5, 1);
    parsegraph_SLIDER_STYLE->brightness = 0.5;
    parsegraph_SLIDER_STYLE->borderRoundness = parsegraph_BUD_RADIUS*8;
    parsegraph_SLIDER_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_SLIDER_STYLE->maxLabelChars = 0;
    parsegraph_SLIDER_STYLE->fontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_SLIDER_STYLE->selectedFontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_SLIDER_STYLE->fontSize = parsegraph_FONT_SIZE * (32.0/48);
    parsegraph_SLIDER_STYLE->letterWidth = .61;
    parsegraph_SLIDER_STYLE->verticalSeparation = 9 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_SLIDER_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_BLOCK_STYLE->minWidth = parsegraph_MIN_BLOCK_WIDTH;
    parsegraph_BLOCK_STYLE->minHeight = parsegraph_MIN_BLOCK_HEIGHT;
    parsegraph_BLOCK_STYLE->horizontalPadding = 3*parsegraph_BUD_RADIUS;
    parsegraph_BLOCK_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    parsegraph_BLOCK_STYLE->borderColor = parsegraph_Color_new(pool, .6, 1, .6, 1);
    parsegraph_BLOCK_STYLE->backgroundColor = parsegraph_Color_new(pool, .75, 1, .75, 1);
    parsegraph_BLOCK_STYLE->selectedBorderColor = parsegraph_Color_new(pool, .8, .8, 1, 1);
    parsegraph_BLOCK_STYLE->selectedBackgroundColor = parsegraph_Color_new(pool, .75, .75, 1, 1);
    parsegraph_BLOCK_STYLE->brightness = 0.75;
    parsegraph_BLOCK_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_BLOCK_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_BLOCK_STYLE->maxLabelChars = 0;
    parsegraph_BLOCK_STYLE->fontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_BLOCK_STYLE->selectedFontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_BLOCK_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_BLOCK_STYLE->letterWidth = .61;
    parsegraph_BLOCK_STYLE->verticalSeparation = 6 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_BLOCK_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    if(mathMode) {
        parsegraph_BLOCK_STYLE->horizontalPadding = 2*parsegraph_BUD_RADIUS;
        parsegraph_BLOCK_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    }

    parsegraph_SCENE_STYLE->minWidth = 2048;
    parsegraph_SCENE_STYLE->minHeight = 1024;
    parsegraph_SCENE_STYLE->horizontalPadding = 0;
    parsegraph_SCENE_STYLE->verticalPadding = 0;
    parsegraph_SCENE_STYLE->borderColor = parsegraph_Color_new(pool, .4, .4, .4, 1);
    parsegraph_SCENE_STYLE->backgroundColor = parsegraph_Color_new(pool, .5, .5, .5, 1);
    parsegraph_SCENE_STYLE->selectedBorderColor = parsegraph_Color_new(pool, .9, .9, 1, 1);
    parsegraph_SCENE_STYLE->selectedBackgroundColor = parsegraph_Color_new(pool, .8, .8, 1, 1);
    parsegraph_SCENE_STYLE->brightness = 0.75;
    parsegraph_SCENE_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_SCENE_STYLE->borderThickness = parsegraph_BUD_RADIUS*1;
    parsegraph_SCENE_STYLE->maxLabelChars = 0;
    parsegraph_SCENE_STYLE->fontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_SCENE_STYLE->selectedFontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_SCENE_STYLE->fontSize = parsegraph_FONT_SIZE;
    parsegraph_SCENE_STYLE->letterWidth = .61;
    parsegraph_SCENE_STYLE->verticalSeparation = 6 * parsegraph_VERTICAL_SEPARATION_PADDING;
    parsegraph_SCENE_STYLE->horizontalSeparation = 7 * parsegraph_HORIZONTAL_SEPARATION_PADDING;

    parsegraph_SLOT_STYLE->minWidth = parsegraph_MIN_BLOCK_WIDTH;
    parsegraph_SLOT_STYLE->minHeight = parsegraph_MIN_BLOCK_HEIGHT;
    parsegraph_SLOT_STYLE->horizontalPadding = 3*parsegraph_BUD_RADIUS;
    parsegraph_SLOT_STYLE->verticalPadding = .5*parsegraph_BUD_RADIUS;
    parsegraph_SLOT_STYLE->borderColor = parsegraph_Color_new(pool, 1, 1, 1, 1);
    parsegraph_SLOT_STYLE->backgroundColor = parsegraph_Color_new(pool, .75, .75, 1, 1);
    parsegraph_SLOT_STYLE->selectedBorderColor = parsegraph_Color_new(pool, .95, 1, .95, 1);
    parsegraph_SLOT_STYLE->selectedBackgroundColor = parsegraph_Color_new(pool, .9, 1, .9, 1);
    parsegraph_SLOT_STYLE->brightness = 0.75;
    parsegraph_SLOT_STYLE->borderRoundness = parsegraph_BUD_RADIUS*3;
    parsegraph_SLOT_STYLE->borderThickness = parsegraph_BUD_RADIUS*2;
    parsegraph_SLOT_STYLE->maxLabelChars = 0;
    parsegraph_SLOT_STYLE->fontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
    parsegraph_SLOT_STYLE->selectedFontColor = parsegraph_Color_new(pool, 0, 0, 0, 1);
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

    parsegraph_EXTENT_BORDER_COLOR = parsegraph_Color_new(pool, 1, 1, 0, .2);
    parsegraph_EXTENT_BORDER_THICKNESS = parsegraph_LINE_THICKNESS;
    parsegraph_EXTENT_BACKGROUND_COLOR = parsegraph_Color_new(pool, 1, 0, 0, .1);

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
