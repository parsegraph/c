#include <QObject>
#include <QTimer>

extern "C" {

#include "timing.h"
#include "graph/Surface.h"

void* parsegraph_setTimeout(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data)
{
    QObject* win = (QObject*)surface->peer;
    auto timer = new QTimer(win);
    QObject::connect(timer, &QTimer::timeout, [=]{
        listener(data);
    });
    timer->setSingleShot(true);
    timer->start(durMs);
    return timer;
}

void parsegraph_clearTimeout(parsegraph_Surface* surface, void* timer)
{
    delete (QTimer*)timer;
}

void* parsegraph_setInterval(parsegraph_Surface* surface, void(*listener)(void*), int durMs, void* data)
{
    QObject* win = (QObject*)surface->peer;
    auto timer = new QTimer(win);
    QObject::connect(timer, &QTimer::timeout, [=]{
        listener(data);
    });
    timer->start(durMs);
    return timer;
}

void parsegraph_clearInterval(parsegraph_Surface* surface, void* timer)
{
    delete (QTimer*)timer;
}

}
