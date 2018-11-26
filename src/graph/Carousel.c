#include "Carousel.h"
#include "Color.h"
#include "../die.h"
#include "../timing.h"
#include "PaintGroup.h"
#include "initialize.h"
#include <math.h>

parsegraph_Carousel* parsegraph_Carousel_new(parsegraph_Camera* camera, float* backgroundColor)
{
    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, camera->surface->pool)) {
        parsegraph_die("Failed to create carousel memory pool.");
    }
    parsegraph_Carousel* carousel = apr_palloc(pool, sizeof(*carousel));
    carousel->pool = pool;
    carousel->_updateRepeatedly = 0;
    carousel->_showScale = 1;

    carousel->onScheduleRepaint = 0;
    carousel->onScheduleRepaintThisArg = 0;

    // Carousel-rendered carets.
    carousel->_carouselPaintingDirty = 1;
    carousel->_carouselPlots = parsegraph_ArrayList_new(pool);
    carousel->_carouselCallbacks = parsegraph_ArrayList_new(pool);

    parsegraph_Color_copy(carousel->_backgroundColor, backgroundColor);
    carousel->_camera = camera;

    carousel->_showTime.tv_sec = 0;
    carousel->_hideTime.tv_sec = 0;

    // Location of the carousel, in world coordinates.
    carousel->_carouselX = 0;
    carousel->_carouselY = 0;
    carousel->_carouselSize = 50;

    carousel->_showCarousel = 0;
    carousel->_selectedCarouselPlot = 0;
    carousel->_selectedCarouselPlotIndex = 0;

    carousel->_glyphAtlas = 0;
    carousel->_shaders = 0;

    // GL painters are not created until needed.
    carousel->_fanPainter = 0;

    carousel->_selectedPlot = 0;
    return carousel;
}

void parsegraph_Carousel_destroy(parsegraph_Carousel* carousel)
{
    if(carousel->_fanPainter) {
        parsegraph_FanPainter_destroy(carousel->_fanPainter);
    }
    parsegraph_ArrayList_destroy(carousel->_carouselPlots);
    parsegraph_ArrayList_destroy(carousel->_carouselCallbacks);
    apr_pool_destroy(carousel->pool);
}

parsegraph_Camera* parsegraph_Carousel_camera(parsegraph_Carousel* carousel)
{
    return carousel->_camera;
};

int parsegraph_Carousel_needsRepaint(parsegraph_Carousel* carousel)
{
    return carousel->_carouselPaintingDirty;
};

void parsegraph_Carousel_prepare(parsegraph_Carousel* carousel, parsegraph_GlyphAtlas* glyphAtlas, apr_hash_t* shaders)
{
    carousel->_glyphAtlas = glyphAtlas;
    carousel->_shaders = shaders;
}

void parsegraph_Carousel_moveCarousel(parsegraph_Carousel* carousel, float worldX, float worldY)
{
    carousel->_carouselX = worldX;
    carousel->_carouselY = worldY;
}

void parsegraph_Carousel_setCarouselSize(parsegraph_Carousel* carousel, float size)
{
    carousel->_carouselSize = size;
}

void parsegraph_Carousel_showCarousel(parsegraph_Carousel* carousel)
{
    carousel->_showCarousel = 1;
    carousel->_updateRepeatedly = 1;
    clock_gettime(CLOCK_REALTIME, &carousel->_showTime);
};

int parsegraph_Carousel_isCarouselShown(parsegraph_Carousel* carousel)
{
    return carousel->_showCarousel;
};

int parsegraph_Carousel_isShown(parsegraph_Carousel* carousel)
{
    return parsegraph_Carousel_isCarouselShown(carousel);
}

void parsegraph_Carousel_hideCarousel(parsegraph_Carousel* carousel)
{
    carousel->_selectedCarouselPlot = 0;
    carousel->_selectedCarouselPlotIndex = -1;
    carousel->_showCarousel = 0;
    clock_gettime(CLOCK_REALTIME, &carousel->_hideTime);
};

void parsegraph_Carousel_addToCarousel(parsegraph_Carousel* carousel, parsegraph_Node* node, void(*callback)(void*), void* thisArg)
{
    if(!node) {
        parsegraph_die("Node must not be null");
    }
    struct parsegraph_CarouselCallback* cb = apr_palloc(carousel->pool, sizeof(*cb));
    cb->callback = callback;
    cb->thisArg = thisArg;
    parsegraph_ArrayList_push(carousel->_carouselCallbacks, cb);

    parsegraph_PaintGroup* pg = parsegraph_Node_localPaintGroup(node);
    if(!pg) {
        pg = parsegraph_PaintGroup_new(carousel->_camera->surface, node, 0, 0, 1);
        parsegraph_Node_setPaintGroup(node, pg);
        parsegraph_PaintGroup_unref(pg);
    }
    parsegraph_ArrayList_push(carousel->_carouselPlots, node);
    //parsegraph_log("Added to carousel");
}

void parsegraph_Carousel_clearCarousel(parsegraph_Carousel* carousel)
{
    //console.log("carousel cleared");
    parsegraph_ArrayList_clear(carousel->_carouselPlots);
    parsegraph_ArrayList_clear(carousel->_carouselCallbacks);
    carousel->_selectedCarouselPlot = 0;
    carousel->_selectedCarouselPlotIndex = 0;
}

int parsegraph_Carousel_removeFromCarousel(parsegraph_Carousel* carousel, parsegraph_Node* node)
{
    if(!node) {
        parsegraph_die("Node must not be null");
    }

    int rem = parsegraph_ArrayList_remove(carousel->_carouselPlots, node);
    if(rem >= 0) {
        parsegraph_ArrayList_splice(carousel->_carouselCallbacks, rem, 1);
        if(carousel->_selectedCarouselPlot == node) {
            carousel->_selectedCarouselPlot = 0;
            carousel->_selectedCarouselPlotIndex = 0;
        }
    }
    return rem;
}

int parsegraph_Carousel_updateRepeatedly(parsegraph_Carousel* carousel)
{
    return carousel->_updateRepeatedly;
}

static float absf(float x)
{
    return x < 0 ? -x : x;
}

int parsegraph_Carousel_clickCarousel(parsegraph_Carousel* carousel, float x, float y, int asDown)
{
    if(!parsegraph_Carousel_isCarouselShown(carousel)) {
        return 0;
    }

    if(carousel->_showTime.tv_sec > 0) {
        struct timespec ts;
        clock_gettime(CLOCK_REALTIME, &ts);
        if(parsegraph_timediffMs(&ts, &carousel->_showTime) < 200) {
            // Ignore events that occur so early.
            return 1;
        }
    }

    // Transform client coords to world coords.
    float* mouseInWorld = matrixTransform2D(
        carousel->pool,
        makeInverse3x3(carousel->pool, parsegraph_Camera_worldMatrix(parsegraph_Carousel_camera(carousel), carousel->pool)),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    float dist = sqrtf(
        powf(absf(x - carousel->_carouselX), 2) +
        powf(absf(y - carousel->_carouselY), 2)
    );
    if(dist < carousel->_carouselSize * .75) {
        if(asDown) {
            //console.log("Down events within the inner region are treated as 'cancel.'");
            parsegraph_Carousel_hideCarousel(carousel);
            parsegraph_Carousel_scheduleCarouselRepaint(carousel);
            return 1;
        }

        //console.log("Up events within the inner region are ignored.");
        return 0;
    }
    else if(dist > carousel->_carouselSize * 4) {
        parsegraph_Carousel_hideCarousel(carousel);
        parsegraph_Carousel_scheduleCarouselRepaint(carousel);
        //console.log("Click occurred so far outside that it is considered its own event.");
        return 1;
    }

    float angleSpan = 2 * 3.14159 / parsegraph_ArrayList_length(carousel->_carouselPlots);
    float mouseAngle = 3.14159 + atan2f(y - carousel->_carouselY, x - carousel->_carouselX);
    float i = floorf(mouseAngle / angleSpan);

    // Click was within a carousel caret; invoke the listener.
    //console.log(alpha_ToDegrees(mouseAngle) + " degrees = caret " + i);
    parsegraph_Carousel_hideCarousel(carousel);

    struct parsegraph_CarouselCallback* cb = parsegraph_ArrayList_at(carousel->_carouselCallbacks, i);
    cb->callback(cb->thisArg);

    parsegraph_Carousel_scheduleCarouselRepaint(carousel);
    return 1;
};

int parsegraph_Carousel_mouseOverCarousel(parsegraph_Carousel* carousel, float x, float y)
{
    if(!parsegraph_Carousel_isCarouselShown(carousel)) {
        return 0;
    }

    apr_pool_t* pool = 0;
    if(APR_SUCCESS != apr_pool_create(&pool, carousel->pool)) {
        parsegraph_die("Failed to create Carousel mouseover pool");
    }

    float* mouseInWorld = matrixTransform2D(
        pool,
        makeInverse3x3(pool,
            parsegraph_Camera_worldMatrix(parsegraph_Carousel_camera(carousel), pool)
        ),
        x, y
    );
    x = mouseInWorld[0];
    y = mouseInWorld[1];

    float angleSpan = 2 * 3.14159 / parsegraph_ArrayList_length(carousel->_carouselPlots);
    float mouseAngle = 3.14159 + atan2f(y - carousel->_carouselY, x - carousel->_carouselX);
    float dist = sqrtf(
        powf(absf(x - carousel->_carouselX), 2) +
        powf(absf(y - carousel->_carouselY), 2)
    );

    if(dist < carousel->_carouselSize*4 && dist > parsegraph_BUD_RADIUS*4) {
        float i = floorf(mouseAngle / angleSpan);
        float selectionAngle = (angleSpan/2 + i * angleSpan) - 3.14159;
        if(i != carousel->_selectedCarouselPlotIndex) {
            carousel->_selectedCarouselPlotIndex = i;
            carousel->_selectedCarouselPlot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        }
        if(carousel->_fanPainter) {
            parsegraph_FanPainter_setSelectionAngle(carousel->_fanPainter, selectionAngle);
            parsegraph_FanPainter_setSelectionSize(carousel->_fanPainter, angleSpan);
        }
    }
    else if(carousel->_fanPainter) {
        parsegraph_FanPainter_setSelectionAngle(carousel->_fanPainter, 0);
        parsegraph_FanPainter_setSelectionSize(carousel->_fanPainter, 0);
        carousel->_selectedCarouselPlotIndex = -1;
        carousel->_selectedCarouselPlot = 0;
    }
    parsegraph_Carousel_scheduleCarouselRepaint(carousel);
    return 1;
}

int parsegraph_Carousel_showScale(parsegraph_Carousel* carousel)
{
    return carousel->_showScale;
}

void parsegraph_Carousel_arrangeCarousel(parsegraph_Carousel* carousel)
{
    size_t numPlots = parsegraph_ArrayList_length(carousel->_carouselPlots);
    if(numPlots == 0) {
        return;
    }

    float angleSpan = 2.0*3.14159/((float)numPlots);

    float parsegraph_MAX_CAROUSEL_SIZE = 150.0f;

    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);
    // Milliseconds
    float showDuration = 200;
    if(carousel->_showTime.tv_sec > 0) {
        float ms = parsegraph_timediffMs(&now, &carousel->_showTime);
        if(ms < showDuration) {
            ms /= showDuration/2.0f;
            if(ms < 1.0f) {
                carousel->_showScale = 0.5f*ms*ms;
            }
            else {
                ms--;
                carousel->_showScale = -0.5f*(ms*(ms-2.0f)-1.0f);
            }
        }
        else {
            carousel->_showScale = 1;
            carousel->_showTime.tv_sec = 0;
            carousel->_updateRepeatedly = 0;
        }
    }

    float minScale = 1;
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_Node* root = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(root);
        float bodySize[2];
        parsegraph_Node_commitLayout(root, bodySize);

        // Set the origin.
        float caretRad = 3.14159 + angleSpan/2.0f + (i / numPlots) * (2.0f * 3.14159);
        parsegraph_PaintGroup_setOrigin(
            paintGroup,
            2*carousel->_carouselSize * carousel->_showScale * cosf(caretRad),
            2*carousel->_carouselSize * carousel->_showScale * sinf(caretRad)
        );

        // Set the scale.
        float extentSize[2];
        parsegraph_Node_extentSize(root, extentSize);
        float xMax = parsegraph_MAX_CAROUSEL_SIZE;
        float yMax = parsegraph_MAX_CAROUSEL_SIZE;
        float xShrinkFactor = 1.0f;
        float yShrinkFactor = 1.0f;
        if(extentSize[0] > xMax) {
            xShrinkFactor = extentSize[0] / xMax;
        }
        if(extentSize[1] > yMax) {
            yShrinkFactor = extentSize[1] / yMax;
        }
        float maxShrinkFactor = (xShrinkFactor > yShrinkFactor) ? xShrinkFactor : yShrinkFactor;
        //fprintf(stderr, "%f %f %f\n", extentWidth, extentHeight, 1/maxShrinkFactor);
        float thisScale = carousel->_showScale/maxShrinkFactor;
        if(minScale > thisScale) {
            minScale = thisScale;
        }
    }

    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_Node* root = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(root);
        if(i == carousel->_selectedCarouselPlotIndex) {
            parsegraph_PaintGroup_setScale(paintGroup, 1.25f*minScale);
        }
        else {
            parsegraph_PaintGroup_setScale(paintGroup, minScale);
        }
    }
}

void parsegraph_Carousel_setOnScheduleRepaint(parsegraph_Carousel* carousel, void(*func)(void*), void* thisArg)
{
    if(!thisArg) {
        thisArg = carousel;
    }
    carousel->onScheduleRepaint = func;
    carousel->onScheduleRepaintThisArg = thisArg;
}

void parsegraph_Carousel_scheduleCarouselRepaint(parsegraph_Carousel* carousel)
{
    //fprintf(stderr, "Scheduling carousel repaint.\n");
    carousel->_carouselPaintingDirty = 1;
    if(carousel->onScheduleRepaint) {
        carousel->onScheduleRepaint(carousel->onScheduleRepaintThisArg);
    }
}

parsegraph_GlyphAtlas* parsegraph_Carousel_glyphAtlas(parsegraph_Carousel* carousel)
{
    return carousel->_glyphAtlas;
}

float* parsegraph_Carousel_backgroundColor(parsegraph_Carousel* carousel)
{
    return carousel->_backgroundColor;
}

void parsegraph_Carousel_setBackgroundColor(parsegraph_Carousel* carousel, float* backgroundColor)
{
    parsegraph_Color_copy(carousel->_backgroundColor, backgroundColor);
    parsegraph_Carousel_scheduleCarouselRepaint(carousel);
}

void parsegraph_Carousel_paint(parsegraph_Carousel* carousel)
{
    if(!carousel->_updateRepeatedly && (!carousel->_carouselPaintingDirty || !carousel->_showCarousel)) {
        return;
    }

    // Paint the carousel.
    //console.log("Painting the carousel");
    parsegraph_Carousel_arrangeCarousel(carousel);
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_Node* plot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(plot);
        if(!paintGroup) {
            parsegraph_die("Plot must have a paint group.");
        }
        parsegraph_PAINTING_GLYPH_ATLAS = parsegraph_Carousel_glyphAtlas(carousel);
        parsegraph_PaintGroup_paint(
            paintGroup,
            parsegraph_Carousel_backgroundColor(carousel),
            parsegraph_Carousel_glyphAtlas(carousel),
            carousel->_shaders,
            0
        );
        parsegraph_PAINTING_GLYPH_ATLAS = 0;
    }

    // Paint the background highlighting fan.
    if(!carousel->_fanPainter) {
        carousel->_fanPainter = parsegraph_FanPainter_new(carousel->pool, carousel->_shaders);
    }
    else {
        parsegraph_FanPainter_clear(carousel->_fanPainter);
    }
    float fanPadding = 1.2;
    parsegraph_FanPainter* fanPainter = carousel->_fanPainter;
    parsegraph_FanPainter_setAscendingRadius(fanPainter, parsegraph_Carousel_showScale(carousel) * fanPadding * carousel->_carouselSize);
    parsegraph_FanPainter_setDescendingRadius(fanPainter, parsegraph_Carousel_showScale(carousel) * fanPadding * 2 * carousel->_carouselSize);

    float startColor[] = {1, 1, 1, 1};
    float endColor[] = {.5, .5, .5, .4};
    parsegraph_FanPainter_selectRad(
        fanPainter,
        carousel->_carouselX, carousel->_carouselY,
        0, 3.14159 * 2.0f,
        startColor, endColor
    );

    carousel->_carouselPaintingDirty = 0;
}

void parsegraph_Carousel_render(parsegraph_Carousel* carousel, float* world)
{
    if(!carousel->_showCarousel) {
        return;
    }
    if(carousel->_updateRepeatedly || carousel->_carouselPaintingDirty) {
        parsegraph_Carousel_paint(carousel);
    }

    parsegraph_FanPainter_render(carousel->_fanPainter, world);

    // Render the carousel if requested.
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_Node* plot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_PaintGroup* paintGroup = parsegraph_Node_localPaintGroup(plot);
        parsegraph_PaintGroup_render(paintGroup,
            matrixMultiply3x3(carousel->pool,
                makeTranslation3x3(carousel->pool, carousel->_carouselX, carousel->_carouselY),
                world
            ),
            carousel->_camera
        );
    }
}
