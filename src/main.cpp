/*
 * Copyright © 2011 Kristian Høgsberg
 * Copyright © 2011 Benjamin Franzke
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that copyright
 * notice and this permission notice appear in supporting documentation, and
 * that the name of the copyright holders not be used in advertising or
 * publicity pertaining to distribution of the software without specific,
 * written prior permission.  The copyright holders make no representations
 * about the suitability of this software for any purpose.  It is provided "as
 * is" without express or implied warranty.
 *
 * THE COPYRIGHT HOLDERS DISCLAIM ALL WARRANTIES WITH REGARD TO THIS SOFTWARE,
 * INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS, IN NO
 * EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE FOR ANY SPECIAL, INDIRECT OR
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
 * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
 * OF THIS SOFTWARE.
 */

// TODO Add libinput
// TODO Add pthread
// TODO Add cairo/pango/harfbuzz for text rendering in GlyphAtlas

extern "C" {

#include <apr_pools.h>
#include <stdio.h>
#include <stdlib.h>
#define EGL_EGLEXT_PROTOTYPES
#define GL_GLEXT_PROTOTYPES
#include <gbm.h>
#include <GL/gl.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <drm.h>
#include <xf86drm.h>
#include <xf86drmMode.h>
#include <fcntl.h>
#include <signal.h>
#include <unistd.h>
#include <string.h>
#include <time.h>
#include <cairo.h>
#include "alpha/WeetPainter.h"
#include "widgets/alpha_WeetCubeWidget.h"
#include "alpha/Maths.h"

}

#include <QGuiApplication>
#include <QOpenGLWindow>

static apr_pool_t* pool;

class MainWindow : public QOpenGLWindow {
public:

MainWindow(QOpenGLContext* shareContext) :
    QOpenGLWindow(shareContext)
{
}


struct alpha_WeetCubeWidget* widget = 0;
GLint w;
GLint h;
virtual void initializeGL() {
}
virtual void resizeGL(int w, int h) {
    this->w = w;
    this->h = h;
}
virtual void paintGL() {
    if(!widget) {
        widget = alpha_WeetCubeWidget_new(pool);
        alpha_WeetCubeWidget_paint(widget);
    }
    glViewport(0, 0, this->w, this->h);
    glClearColor(0, 47.0/255, 57.0/255, 1.0);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    alpha_WeetCubeWidget_render(widget, this->w, this->h);
    glFlush();
}
};

int main(int argc, char**argv)
{
    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, (const char* const**)&argv, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed initializing APR. APR status of %d.\n", rv);
        return -1;
    }
    rv = apr_pool_create(&pool, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed creating memory pool. APR status of %d.\n", rv);
        return -1;
    }

    QGuiApplication app(argc, argv);

    QSurfaceFormat format;
    format.setSamples(16);
    format.setMajorVersion(4);
    format.setMinorVersion(4);
    format.setProfile(QSurfaceFormat::CoreProfile);
    format.setRenderableType(QSurfaceFormat::OpenGLES);

    QOpenGLContext ctx;
    ctx.setFormat(format);
    ctx.create();

    if(!ctx.isOpenGLES()) {
        return -1;
    }

    MainWindow window(&ctx);
    window.setFormat(format);
    window.resize(640, 480);
    window.show();

    rv = app.exec();
    // Destroy the pool for cleanliness.
    apr_pool_destroy(pool);
    pool = NULL;
    apr_terminate();
    return rv;
}
