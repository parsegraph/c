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
#include "alpha/Maths.h"
#include "alpha/GLWidget.h"
#include <apr_strings.h>

}

#include <QTime>
#include <QGuiApplication>
#include <QOpenGLWindow>
#include <QKeyEvent>
#include <QTouchEvent>
#include <QMouseEvent>

static apr_pool_t* pool;

class MainWindow : public QOpenGLWindow {

static const char* keyToName(int key) {
    switch(key) {
    case Qt::Key_Escape: return "Escape";
    case Qt::Key_Tab: return "Tab";
    case Qt::Key_Return: return "Return";
    case Qt::Key_Left: return "Left";
    case Qt::Key_Shift: return "Shift";
    case Qt::Key_Space: return " ";
    case Qt::Key_0: return "0";
    }
    return 0;
}

protected:


virtual void keyPressEvent(QKeyEvent* ev) {
    const char* kname = keyToName(ev->key());
    if(!kname) {
        QByteArray kval = ev->text().toLower().toUtf8();
        kname = apr_pstrdup(pool, kval.constData());
    }

    if(alpha_Input_Get(widget->input, kname)) {
        // Already pressed, ignore it.
        return;
    }

    //fprintf(stderr, "Pressed %s\n", kname);
    if(ev->key() == Qt::Key_Escape) {
        frozen = !frozen;
    }
    else {
        alpha_Input_keydown(widget->input, kname,
            ev->modifiers() & Qt::ControlModifier,
            ev->modifiers() & Qt::AltModifier,
            ev->modifiers() & Qt::MetaModifier
        );
    }
}

virtual void keyReleaseEvent(QKeyEvent* ev) {
    const char* kname = keyToName(ev->key());
    if(!kname) {
        QByteArray kval = ev->text().toLower().toUtf8();
        kname = apr_pstrdup(pool, kval.constData());
    }

    if(!alpha_Input_Get(widget->input, kname)) {
        // Already released, ignore it.
        return;
    }
    //fprintf(stderr, "Releasing %s\n", kname);
    alpha_Input_keyup(widget->input, kname);
}

virtual void mouseMoveEvent(QMouseEvent* ev) {
}

virtual void mousePressEvent(QMouseEvent* ev) {
}

virtual void mouseReleaseEvent(QMouseEvent* ev) {
}

virtual void touchEvent(QTouchEvent* ev) {
}

virtual void wheelEvent(QTouchEvent* ev) {
}

public:

MainWindow(QOpenGLContext* shareContext) :
    QOpenGLWindow(shareContext)
{
    connect(this, &MainWindow::frameSwapped, [this]() {
        update();
    });
}

QTime frameElapsedTime;
struct parsegraph_Surface* surface = 0;
struct alpha_GLWidget* widget = 0;
GLint w;
GLint h;
int hasEverPainted = 0;
int frozen = 0;
virtual void initializeGL() {
    frameElapsedTime.start();
}
virtual void resizeGL(int w, int h) {
    this->w = w;
    this->h = h;
}
virtual void paintGL() {
    struct alpha_RenderData rd;
    rd.width = w;
    rd.height = h;
    if(!widget) {
        surface = parsegraph_Surface_new(this);
        float bg[] = {0, 47.0/255, 57.0/255, 1.0};
        parsegraph_Surface_setBackground(surface, bg);
        widget = alpha_GLWidget_new(surface);
        parsegraph_Surface_paint(surface, &rd);
    }
    alpha_GLWidget_Tick(widget, ((float)frameElapsedTime.restart())/1000.0);
    if(!frozen){
        parsegraph_Surface_paint(surface, &rd);
    }
    glViewport(0, 0, this->w, this->h);
    parsegraph_Surface_render(surface, &rd);
    glFlush();
}
};

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface)
{
    MainWindow* win = (MainWindow*)surface->peer;
    surface->needsRepaint = 1;
    win->update();
}

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
    format.setSamples(4);
    format.setMajorVersion(4);
    format.setMinorVersion(4);
    format.setDepthBufferSize(24);
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
