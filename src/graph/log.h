#ifndef parsegraph_log_INCLUDED
#define parsegraph_log_INCLUDED

#include <stdarg.h>

extern void(*parsegraph_log_func)(const char* fmt, va_list);
void parsegraph_log_stderr(const char* fmt, va_list ap);
void parsegraph_log(const char* fmt, ...);
void parsegraph_logEntercf(const char* category, const char* fmt, ...);
void parsegraph_logEnterc(const char* category, const char* message);
void parsegraph_logEnter(const char* message);
void parsegraph_logLeave();
void parsegraph_logLeavec(const char* category, const char* message);
void parsegraph_logLeavef(const char* fmt, ...);
void parsegraph_logLeavecf(const char* category, const char* fmt, ...);
void parsegraph_logReset(const char* message);
void parsegraph_logResetc(const char* category, const char* message);
void parsegraph_logMessagec(const char* category, const char* message);
void parsegraph_logMessage(const char* message);
void parsegraph_logMessagecf(const char* category, const char* fmt, ...);
void parsegraph_logMessagef(const char* fmt, ...);
void parsegraph_logEnterf(const char* fmt, ...);
int parsegraph_connectLog(const char* host, const char* port);
void parsegraph_stopLog();
void parsegraph_resumeLog();
int parsegraph_isLogging();
void parsegraph_disconnectLog();
extern int parsegraph_DONT_LOG;

#endif // parsegraph_log_INCLUDED
