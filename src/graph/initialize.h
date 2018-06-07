#ifndef parsegraph_initialize_INCLUDED
#define parsegraph_initialize_INCLUDED

#include "GlyphAtlas.h"
#include "NodeType.h"
#include <apr_pools.h>

struct parsegraph_Style {
    float minWidth;
    float minHeight;
    float horizontalPadding;
    float verticalPadding;
    float* borderColor;
    float* backgroundColor;
    float* selectedBorderColor;
    float* selectedBackgroundColor;
    float brightness;
    float borderRoundness;
    float borderThickness;
    int maxLabelChars;
    float* fontColor;
    float* selectedFontColor;
    int fontSize;
    float letterWidth;
    float verticalSeparation;
    float horizontalSeparation;
};
typedef struct parsegraph_Style parsegraph_Style;

extern struct parsegraph_GlyphAtlas* parsegraph_GLYPH_ATLAS;
extern struct parsegraph_GlyphAtlas* parsegraph_buildGlyphAtlas();
parsegraph_Style* parsegraph_copyStyle(apr_pool_t* pool, int nodeType);
parsegraph_Style* parsegraph_style(int nodeType);
void parsegraph_initialize(apr_pool_t* pool, int mathMode);

extern float parsegraph_TOUCH_SENSITIVITY;
extern float parsegraph_MOUSE_SENSITIVITY;

// Whether Node's forward and backward are switched.
extern int parsegraph_RIGHT_TO_LEFT;

extern float parsegraph_MAX_PRESS_RELEASE_DELAY;

// Background
extern float parsegraph_BACKGROUND_COLOR[4];

// Font
extern int parsegraph_UPSCALED_FONT_SIZE;
extern int parsegraph_RENDERED_FONT_SIZE;
extern int parsegraph_WRAP_WIDTH;

/**
 * The scale at which shrunk nodes are shrunk.
 */
extern float parsegraph_SHRINK_SCALE;

/**
 * Base font size.
 */
extern int parsegraph_FONT_SIZE;

/**
 * The thickness (diameter) of the line.
 */
extern int parsegraph_LINE_THICKNESS;

extern float* parsegraph_LINE_COLOR;
extern float* parsegraph_SELECTED_LINE_COLOR;

extern float parsegraph_BUD_RADIUS;

extern float parsegraph_MIN_BLOCK_HEIGHT;
extern float parsegraph_MIN_BLOCK_WIDTH;

// Inter-node spacing
extern float parsegraph_HORIZONTAL_SEPARATION_PADDING;
extern float parsegraph_VERTICAL_SEPARATION_PADDING;

/**
 * The separation between leaf buds and their parents.
 */
extern float parsegraph_BUD_LEAF_SEPARATION;

extern float parsegraph_BUD_TO_BUD_VERTICAL_SEPARATION;

extern struct parsegraph_Style* parsegraph_BUD_STYLE;
extern struct parsegraph_Style* parsegraph_SLIDER_STYLE;
extern struct parsegraph_Style* parsegraph_BLOCK_STYLE;
extern struct parsegraph_Style* parsegraph_SCENE_STYLE;
extern struct parsegraph_Style* parsegraph_SLOT_STYLE;

extern float* parsegraph_EXTENT_BORDER_COLOR;
extern float parsegraph_EXTENT_BORDER_THICKNESS;
extern float* parsegraph_EXTENT_BACKGROUND_COLOR;

extern float parsegraph_EXTENT_BORDER_ROUNDEDNESS;
extern float parsegraph_EXTENT_BORDER_THICKNESS;

#endif // parsegraph_initialize_INCLUDED
