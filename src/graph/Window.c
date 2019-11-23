#include "Window.h"
#include "initialize.h"
#include "die.h"
#include "Color.h"
#include "LayoutList.h"
#include <math.h>
#include <stdlib.h>
#include <dlfcn.h>

static int parsegraph_WINDOW_COUNT = 0;

parsegraph_Window* parsegraph_Window_new(apr_pool_t* ppool)
{
    if(!parsegraph_INITIALIZED) {
        parsegraph_die("Parsegraph must be initialized using parsegraph_initialize()\n");
    }
    apr_pool_t* pool;
    if(APR_SUCCESS != apr_pool_create(&pool, ppool)) {
        parsegraph_die("Failed to create Window memory pool.\n");
    }
    parsegraph_Window* window = apr_palloc(pool, sizeof(parsegraph_Window));
    window->pool = pool;
    window->_id = ++parsegraph_WINDOW_COUNT;
    parsegraph_Color_copy(window->_backgroundColor, parsegraph_BACKGROUND_COLOR);

    window->_framebuffer = 0;
    window->_renderbuffer = 0;
    window->_glTexture = 0;
    window->_program = 0;

    window->_shaders = apr_hash_make(window->pool);

    window->_layoutList = parsegraph_LayoutList_new(window->pool, parsegraph_COMPONENT_LAYOUT_HORIZONTAL, 0);

    window->_textureSize = NAN;

    window->_focused = 0;
    window->_isDoubleClick = 0;
    window->_isDoubleTouch = 0;

    window->_lastMouseX = 0;
    window->_lastMouseY = 0;

    window->_peer = parsegraph_getBackend()->installWindow(window);

    return window;
}
