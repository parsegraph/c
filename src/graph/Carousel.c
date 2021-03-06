#include "Carousel.h"
#include "Color.h"
#include "../die.h"
#include "../timing.h"
#include "log.h"
#include "initialize.h"
#include <math.h>
#include <stdlib.h>

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
    parsegraph_Carousel_clearCarousel(carousel);
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

    if(!parsegraph_Node_localPaintGroup(node)) {
        parsegraph_Node_setPaintGroup(node, 1);
    }

    parsegraph_CarouselPlot* carouselPlot = malloc(sizeof(parsegraph_CarouselPlot));
    carouselPlot->node = node;
    carouselPlot->x = 0;
    carouselPlot->y = 0;
    carouselPlot->scale = 0;
    parsegraph_ArrayList_push(carousel->_carouselPlots, carouselPlot);
    //parsegraph_log("Added to carousel");
}

void parsegraph_Carousel_clearCarousel(parsegraph_Carousel* carousel)
{
    //console.log("carousel cleared");
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselPlot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        free(carouselPlot);
    }
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

    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselPlot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        if(carouselPlot->node == node) {
            parsegraph_ArrayList_splice(carousel->_carouselPlots, i, 1);
            if(carousel->_selectedCarouselPlot == carouselPlot) {
                carousel->_selectedCarouselPlot = 0;
                carousel->_selectedCarouselPlotIndex = -1;
            }
            free(carouselPlot);
            return 1;
        }
    }

    return 0;
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
        if(parsegraph_timediffMs(&ts, &carousel->_showTime) < parsegraph_CAROUSEL_SHOW_DURATION) {
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
    if(dist < carousel->_carouselSize * .75/parsegraph_Camera_scale(carousel->_camera)) {
        if(asDown) {
            parsegraph_log("Hiding carousel\n");
            parsegraph_Carousel_hideCarousel(carousel);
            parsegraph_Carousel_scheduleCarouselRepaint(carousel);
            return 1;
        }

        //console.log("Up events within the inner region are ignored.");
        return 0;
    }
    else if(dist > carousel->_carouselSize * 4/parsegraph_Camera_scale(carousel->_camera)) {
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

    float camScale = parsegraph_Camera_scale(carousel->_camera);
    if(dist < carousel->_carouselSize*4/camScale && dist > parsegraph_BUD_RADIUS*4/camScale) {
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
        parsegraph_Carousel_scheduleCarouselRepaint(carousel);
        return 2;
    }
    else if(carousel->_fanPainter) {
        parsegraph_FanPainter_setSelectionAngle(carousel->_fanPainter, 0);
        parsegraph_FanPainter_setSelectionSize(carousel->_fanPainter, 0);
        carousel->_selectedCarouselPlotIndex = -1;
        carousel->_selectedCarouselPlot = 0;
        parsegraph_Carousel_scheduleCarouselRepaint(carousel);
    }
    return 0;
}

float parsegraph_Carousel_showScale(parsegraph_Carousel* carousel)
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
    float showDuration = parsegraph_CAROUSEL_SHOW_DURATION;
    if(carousel->_showTime.tv_sec > 0) {
        float ms = parsegraph_timediffMs(&carousel->_showTime, &now);
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
        parsegraph_log("Carousel shown for %fms has show scale of %f\n", ms, carousel->_showScale);
    }

    float minScale = 1;
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselData = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_Node* root = carouselData->node;
        parsegraph_Node_commitLayoutIteratively(root, 0);

        // Set the origin.
        float caretRad = 3.14159 + angleSpan/2.0f + ((float)i / (float)numPlots) * (2.0f * 3.14159);
        carouselData->x = 2.0f*carousel->_carouselSize * carousel->_showScale * cosf(caretRad);
        carouselData->y = 2.0f*carousel->_carouselSize * carousel->_showScale * sinf(caretRad);
        parsegraph_log("Placing carousel node %d's root at (%f, %f)\n", i, carouselData->x, carouselData->y);

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
        if(thisScale < minScale) {
            minScale = thisScale;
        }
    }

    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselData = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        if(i == carousel->_selectedCarouselPlotIndex) {
            carouselData->scale = 1.25f*minScale;
        }
        else {
            carouselData->scale = minScale;
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
    parsegraph_logEntercf("Repaint scheduling", "Scheduling carousel repaint.\n");
    carousel->_carouselPaintingDirty = 1;
    if(carousel->onScheduleRepaint) {
        carousel->onScheduleRepaint(carousel->onScheduleRepaintThisArg);
    }
    parsegraph_logLeave();
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
    parsegraph_logEntercf("Carousel paints", "Painting the carousel");
    parsegraph_Carousel_arrangeCarousel(carousel);
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselData = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_Node* paintGroup = carouselData->node;
        parsegraph_PAINTING_GLYPH_ATLAS = parsegraph_Carousel_glyphAtlas(carousel);
        parsegraph_Node_paint(
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
    parsegraph_log("Carousel show scale currently %f\n", parsegraph_Carousel_showScale(carousel));
    float ascRadius = parsegraph_Carousel_showScale(carousel) * fanPadding * carousel->_carouselSize;
    parsegraph_log("Ascending radius is %f\n", ascRadius);
    parsegraph_FanPainter_setAscendingRadius(fanPainter, ascRadius);
    float descRadius = parsegraph_Carousel_showScale(carousel) * fanPadding * 2 * carousel->_carouselSize;
    parsegraph_FanPainter_setDescendingRadius(fanPainter, descRadius);
    parsegraph_log("Descending radius is %f\n", descRadius);

    float startColor[] = {1, 1, 1, 1};
    float endColor[] = {.5, .5, .5, .4};
    parsegraph_FanPainter_selectRad(
        fanPainter,
        0, 0,
        0, 3.14159 * 2.0f,
        startColor, endColor
    );

    parsegraph_log("Carousel show scale is %f\n", carousel->_showScale);
    carousel->_carouselPaintingDirty = 0;
    parsegraph_logLeave();
}

void parsegraph_Carousel_render(parsegraph_Carousel* carousel, float* world)
{
    if(!carousel->_showCarousel) {
        return;
    }
    if(carousel->_updateRepeatedly || carousel->_carouselPaintingDirty) {
        parsegraph_Carousel_paint(carousel);
    }

    float dest[9];
    float trans[9];
    // translation * scale * world
    makeScale3x3I(dest, 1.0f/parsegraph_Camera_scale(carousel->_camera), 1.0f/parsegraph_Camera_scale(carousel->_camera));
    makeTranslation3x3I(trans, carousel->_carouselX, carousel->_carouselY);
    matrixMultiply3x3I(dest, dest, trans);
    matrixMultiply3x3I(dest, dest, world);
    world = dest;

    parsegraph_FanPainter_render(carousel->_fanPainter, world);

    // Render the carousel if requested.
    for(int i = 0; i < parsegraph_ArrayList_length(carousel->_carouselPlots); ++i) {
        parsegraph_CarouselPlot* carouselPlot = parsegraph_ArrayList_at(carousel->_carouselPlots, i);
        parsegraph_Node* root = carouselPlot->node;

        makeTranslation3x3I(trans, carouselPlot->x, carouselPlot->y);
        parsegraph_log("Carousel plot at (%f, %f)\n", carouselPlot->x, carouselPlot->y);
        float sc[9];
        makeScale3x3I(sc, carouselPlot->scale, carouselPlot->scale);
        float carouselNodeMat[9];
        matrixMultiply3x3I(carouselNodeMat, sc, trans);
        matrixMultiply3x3I(carouselNodeMat, carouselNodeMat, world);

        parsegraph_Node_renderIteratively(root, carouselNodeMat, 0);
    }
}
