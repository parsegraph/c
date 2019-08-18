extern "C" {

#include "graph/log.h"
#include <apr_pools.h>
#include "graph/Input.h"
#include "die.h"
#include <apr_strings.h>
#include "app.h"

void parsegraph_init(void* data, parsegraph_Application* app, parsegraph_UserLogin* login, parsegraph_Node* loginNode);
void parsegraph_stop(parsegraph_Application* app);
}

#include <QTime>
#include <QGuiApplication>
#include <QOpenGLWindow>
#include <QKeyEvent>
#include <QTouchEvent>
#include <QMouseEvent>

static apr_pool_t* pool;

static void onInit(void* data, parsegraph_Application* app, parsegraph_UserLogin* login, parsegraph_Node* loginNode);

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
    case Qt::Key_F12: return "F12";
    case Qt::Key_F11: return "F11";
    case Qt::Key_F10: return "F10";
    case Qt::Key_F9: return "F9";
    case Qt::Key_F8: return "F8";
    case Qt::Key_F7: return "F7";
    case Qt::Key_F6: return "F6";
    case Qt::Key_F5: return "F5";
    case Qt::Key_F4: return "F4";
    case Qt::Key_F3: return "F3";
    case Qt::Key_F2: return "F2";
    case Qt::Key_F1: return "F1";
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

    parsegraph_logEntercf("Key Presses", "Pressed %s\n", kname);
    parsegraph_Input_keydown(input, kname, ev->key(),
        ev->modifiers() & Qt::AltModifier,
        ev->modifiers() & Qt::MetaModifier,
        ev->modifiers() & Qt::ControlModifier,
        ev->modifiers() & Qt::ShiftModifier
    );
    parsegraph_logLeave();
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

bool hasCursorScreenPos = false;
float cursorScreenPos[2] = {0, 0};

virtual void mouseMoveEvent(QMouseEvent* ev) {
    if(!input) {
        return;
    }
    if(hasCursorScreenPos) {
        parsegraph_Input_mousemove(input, ev->x(), ev->y(), 1);
    }
    hasCursorScreenPos = true;
    cursorScreenPos[0] = ev->x();
    cursorScreenPos[1] = ev->y();
}

virtual void mousePressEvent(QMouseEvent* ev) {
    if(!input) {
        return;
    }
    if(hasCursorScreenPos && (ev->x() != cursorScreenPos[0] || ev->y() != cursorScreenPos[1])) {
        parsegraph_Input_mousemove(input, ev->x(), ev->y(), 1);
    }
    parsegraph_Input_mousedown(input);
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
            cursorScreenPos[0] = p.pos().x();
            cursorScreenPos[1] = p.pos().y();
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
    parsegraph_ArrayList_destroy(pressedTouches);
    parsegraph_ArrayList_destroy(releasedTouches);
    parsegraph_ArrayList_destroy(movedTouches);
    apr_pool_destroy(spool);
}

virtual void wheelEvent(QWheelEvent* ev) {
    if(!input) {
        return;
    }
    //fprintf(stderr, "Wheel at %d, %d\n", ev->x(), height() - ev->y());
    parsegraph_Input_onWheel(input, -ev->angleDelta().y()/120);
}

public:
struct parsegraph_Application* app = 0;
struct parsegraph_Surface* surface = 0;
struct parsegraph_Input* input = 0;

MainWindow(QOpenGLContext* shareContext) :
    QOpenGLWindow(shareContext)
{
    connect(this, &MainWindow::frameSwapped, [this]() {
        update();
    });
}

QTime frameElapsedTime;
GLint w = 0;
GLint h = 0;
virtual void initializeGL() {
    glEnable(GL_MULTISAMPLE);
    // Invoke global init function.
    w = width();
    h = height();

    parsegraph_ArrayList* argumentList = parsegraph_ArrayList_new(pool);
    auto qtArgs = QCoreApplication::arguments();
    for(int i = 0; i < qtArgs.count(); ++i) {
        parsegraph_ArrayList_push(argumentList, apr_pstrdup(pool, qtArgs[i].toUtf8().constData()));
    }
    app = parsegraph_Application_new(pool, 0);
    parsegraph_Application_start(app, this, w, h, argumentList, onInit, 0);
    //parsegraph_log("Window size: %d, %d\n", w, h);
    frameElapsedTime.start();
}
virtual void resizeGL(int w, int h) {
    float dx = w - this->w;
    float dy = h - this->h;
    this->w = w;
    this->h = h;
    if(surface) {
        parsegraph_Surface_setDisplaySize(surface, w, h);
    }
    if(input) {
        float scale = parsegraph_Camera_scale(input->_camera);
        parsegraph_Camera_adjustOrigin(input->_camera, 0.5*dx/scale, 0.5*dy/scale);
    }
    if(app) {
        parsegraph_Application_scheduleRepaint(app);
    }
}
virtual void paintGL() {
    parsegraph_logEntercf("GL Paints", "Painting GL\n");
    if(!surface) {
        parsegraph_logLeave();
        return;
    }
    parsegraph_Surface_runAnimationCallbacks(surface, ((float)frameElapsedTime.restart())/1000.0);
    parsegraph_Surface_render(surface, 0);
    glFlush();
    parsegraph_logLeave();
}
};

static void onClose(void* data, parsegraph_Application* app)
{
    parsegraph_stop(app);
}

static void onInit(void* data, parsegraph_Application* app, parsegraph_UserLogin* login, parsegraph_Node* loginNode)
{
    parsegraph_Surface* surface = parsegraph_Application_surface(app);
    MainWindow* win = static_cast<MainWindow*>(surface->peer);
    win->surface = surface;
    if(win->w) {
        parsegraph_Surface_setDisplaySize(surface, win->w, win->h);
    }
    parsegraph_Application_setOnClose(app, onClose, win);
    parsegraph_Input* input = parsegraph_Application_input(app);
    win->input = input;

    float defaultScale = .25;
    parsegraph_Camera* cam = input->_camera;
    //parsegraph_Camera_project(cam);
    parsegraph_Camera_setDefaultOrigin(cam,
        parsegraph_Surface_getWidth(surface) / (2 * defaultScale),
        parsegraph_Surface_getHeight(surface) / (2 * defaultScale)
    );
    parsegraph_Camera_setScale(cam, defaultScale);
    input->cursorScreenPos[0] = parsegraph_Camera_x(cam);
    input->cursorScreenPos[1] = parsegraph_Camera_y(cam);

    parsegraph_Input_setCursorShown(input, 0);
    parsegraph_init(data, app, login, loginNode);
}

extern "C" {

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface)
{
    MainWindow* win = (MainWindow*)surface->peer;
    win->update();
}

}

int main(int argc, char**argv)
{
    if(!parsegraph_connectLog("localhost", "28122")) {
        parsegraph_stopLog();
    }

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, (const char* const**)&argv, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_log("Failed initializing APR. APR status of %d.\n", rv);
        return -1;
    }
    rv = apr_pool_create(&pool, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_log("Failed creating memory pool. APR status of %d.\n", rv);
        return -1;
    }

    QGuiApplication mainApp(argc, argv);

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

    rv = mainApp.exec();
    // Destroy the pool for cleanliness.
    parsegraph_Application_close(window.app);
    apr_pool_destroy(pool);
    pool = NULL;
    apr_terminate();

    parsegraph_disconnectLog();
    return rv;
}
