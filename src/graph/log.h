#ifndef parsegraph_log_INCLUDED
#define parsegraph_log_INCLUDED

#include <stdarg.h>

extern void(*parsegraph_log_func)(const char* fmt, va_list);
void parsegraph_log_stderr(const char* fmt, va_list ap);
void parsegraph_log(const char* fmt, ...);

#endif // parsegraph_log_INCLUDED
