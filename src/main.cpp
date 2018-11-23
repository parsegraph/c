extern "C" {

#include "graph/log.h"
#include <apr_pools.h>
#include "graph/Input.h"
#include "die.h"
#include <apr_strings.h>

parsegraph_Surface* init(void*, int, int);
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
    case Qt::Key_Left: return "ArrowLeft";
    case Qt::Key_Up: return "ArrowUp";
    case Qt::Key_Right: return "ArrowRight";
    case Qt::Key_Down: return "ArrowDown";
    case Qt::Key_Shift: return "Shift";
    case Qt::Key_Space: return " ";
    case Qt::Key_0: return "0";
    }
    return 0;
}

protected:

virtual void keyPressEvent(QKeyEvent* ev) {
    //fprintf(stderr, "KEYPRESS EVENT\n");
    if(!input) {
        return;
    }
    const char* kname = keyToName(ev->key());
    if(!kname) {
        QByteArray kval = ev->text().toLower().toUtf8();
        kname = apr_pstrdup(pool, kval.constData());
    }

    if(parsegraph_Input_Get(input, kname)) {
        // Already pressed, ignore it.
        //return;
    }

    //fprintf(stderr, "Pressed %s\n", kname);
    parsegraph_Input_keydown(input, kname, ev->key(),
        ev->modifiers() & Qt::AltModifier,
        ev->modifiers() & Qt::MetaModifier,
        ev->modifiers() & Qt::ControlModifier,
        ev->modifiers() & Qt::ShiftModifier
    );
}

virtual void keyReleaseEvent(QKeyEvent* ev) {
    if(!input) {
        return;
    }
    const char* kname = keyToName(ev->key());
    if(!kname) {
        QByteArray kval = ev->text().toLower().toUtf8();
        kname = apr_pstrdup(pool, kval.constData());
    }

    if(!parsegraph_Input_Get(input, kname)) {
        // Already released, ignore it.
        //return;
    }
    //fprintf(stderr, "Releasing %s\n", kname);
    parsegraph_Input_keyup(input, kname, ev->key());
}

virtual void focusInEvent(QFocusEvent* ev) {
    if(!input) {
        return;
    }
    parsegraph_Input_onfocus(input);
}

virtual void focusOutEvent(QFocusEvent* ev) {
    if(!input) {
        return;
    }
    parsegraph_Input_onblur(input);
}

virtual void mouseMoveEvent(QMouseEvent* ev) {
    if(!input) {
        return;
    }
    parsegraph_Input_mousemove(input, ev->x(), ev->y());
}

virtual void mousePressEvent(QMouseEvent* ev) {
    if(!input) {
        return;
    }
    parsegraph_Input_mousedown(input, ev->x(), ev->y());
}

virtual void mouseReleaseEvent(QMouseEvent* ev) {
    if(!input) {
        return;
    }
    parsegraph_Input_removeMouseListener(input);
}

virtual void touchEvent(QTouchEvent* ev) {
    if(!input) {
        return;
    }
    apr_pool_t* spool;
    if(APR_SUCCESS != apr_pool_create(&spool, pool)) {
        parsegraph_die("Failed to create pool for touch event");
    }
    parsegraph_ArrayList* movedTouches = parsegraph_ArrayList_new(spool);
    parsegraph_ArrayList* pressedTouches = parsegraph_ArrayList_new(spool);
    parsegraph_ArrayList* releasedTouches = parsegraph_ArrayList_new(spool);
    for(QTouchEvent::TouchPoint p : ev->touchPoints()) {
        parsegraph_TouchEvent* te = static_cast<parsegraph_TouchEvent*>(apr_palloc(spool, sizeof(*te)));
        te->clientX = p.pos().x();
        te->clientY = p.pos().y();
        snprintf(te->identifier, sizeof(te->identifier), "%lld", p.uniqueId().numericId());
        if(p.state() & Qt::TouchPointPressed) {
            parsegraph_log("Touch PRESS\n");
            parsegraph_ArrayList_push(pressedTouches, te);
        }
        if(p.state() & Qt::TouchPointReleased) {
            parsegraph_log("Touch RELEASE\n");
            parsegraph_ArrayList_push(releasedTouches, te);
        }
        if(p.state() & Qt::TouchPointMoved) {
            parsegraph_log("Touch MOVE\n");
            parsegraph_ArrayList_push(movedTouches, te);
        }
    }
    if(parsegraph_ArrayList_length(pressedTouches) > 0) {
        parsegraph_Input_touchstart(input, pressedTouches);
    }
    if(parsegraph_ArrayList_length(movedTouches) > 0) {
        parsegraph_Input_touchmove(input, movedTouches);
    }
    if(parsegraph_ArrayList_length(releasedTouches) > 0) {
        parsegraph_Input_removeTouchListener(input, releasedTouches);
    }
    apr_pool_destroy(spool);
}

virtual void wheelEvent(QWheelEvent* ev) {
    if(!input) {
        return;
    }
    //fprintf(stderr, "Wheel at %d, %d\n", ev->x(), height() - ev->y());
    parsegraph_Input_onWheel(input, ev->x(), ev->y(), -ev->angleDelta().y()/60);
}

public:

MainWindow(QOpenGLContext* shareContext) :
    QOpenGLWindow(shareContext)
{
    connect(this, &MainWindow::frameSwapped, [this]() {
        update();
    });
}

parsegraph_Input* input = 0;
QTime frameElapsedTime;
struct parsegraph_Surface* surface = 0;
GLint w = 0;
GLint h = 0;
virtual void initializeGL() {
    glEnable(GL_MULTISAMPLE);
    // Invoke global init function.
    w = width();
    h = height();
    surface = init(this, w, h);
    //fprintf(stderr, "Window size: %d, %d\n", w, h);
    frameElapsedTime.start();
}
virtual void resizeGL(int w, int h) {
    float dx = w - this->w;
    float dy = h - this->h;
    this->w = w;
    this->h = h;
    parsegraph_Surface_setDisplaySize(surface, w, h);
    if(input) {
        float scale = parsegraph_Camera_scale(input->_camera);
        parsegraph_Camera_adjustOrigin(input->_camera, 0.5*dx/scale, 0.5*dy/scale);
    }
    parsegraph_Surface_scheduleRepaint(surface);
}
virtual void paintGL() {
    parsegraph_Surface_runAnimationCallbacks(surface, ((float)frameElapsedTime.restart())/1000.0);
    glFlush();
}
};

extern "C" {

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface)
{
    MainWindow* win = (MainWindow*)surface->peer;
    win->update();
}

void parsegraph_Surface_install(parsegraph_Surface* surface, parsegraph_Input* input)
{
    MainWindow* win = static_cast<MainWindow*>(surface->peer);
    if(win->input) {
        parsegraph_Surface_uninstall(surface);
        return;
    }
    win->input = input;
}

void parsegraph_Surface_uninstall(parsegraph_Surface* surface)
{
    MainWindow* win = static_cast<MainWindow*>(surface->peer);
    if(!win->input) {
        return;
    }
    win->input = 0;
}

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
