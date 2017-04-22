#include "log.h"
#include <stdarg.h>
#include <stdio.h>

void parsegraph_log_stderr(const char* fmt, va_list ap)
{
    vfprintf(stderr, fmt, ap);
}

void(*parsegraph_log_func)(const char* fmt, va_list) = parsegraph_log_stderr;

void parsegraph_log(const char* fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    if(parsegraph_log_func) {
        parsegraph_log_func(fmt, ap);
    }
    va_end(ap);
}
