#include "log.h"
#include <stdarg.h>
#include <stdio.h>
#include <time.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <stdlib.h>
#include <string.h>

#define parsegraph_LOGBUFSIZE 524288

int parsegraph_DONT_LOG = 0;

static int create_and_connect(const char* node, const char* port)
{
   struct addrinfo *result, *rp;
   int sfd, s;

   /* Obtain address(es) matching host/port */

    struct addrinfo hints;
    memset(&hints, 0, sizeof(struct addrinfo));
    hints.ai_family = AF_INET;    /* Allow IPv4 or IPv6 */
    hints.ai_socktype = SOCK_STREAM; /* TCP socket */
    hints.ai_flags = 0;
    hints.ai_protocol = 0;          /* Any protocol */

    s = getaddrinfo(node, port, &hints, &result);
    if (s != 0) {
       fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(s));
       exit(EXIT_FAILURE);
    }

    /* getaddrinfo() returns a list of address structures.
      Try each address until we successfully connect(2).
      If socket(2) (or connect(2)) fails, we (close the socket
      and) try the next address. */

    for (rp = result; rp != NULL; rp = rp->ai_next) {
        sfd = socket(rp->ai_family, rp->ai_socktype,
                rp->ai_protocol);
        if (sfd == -1)
            continue;

        if (connect(sfd, rp->ai_addr, rp->ai_addrlen) != -1)
            break;                  /* Success */

        close(sfd);
    }
    freeaddrinfo(result);           /* No longer needed */


    if (rp == NULL) {               /* No address succeeded */
        return -1;
    }

    return sfd;
}

static int LOGFD = -1;

void(*orig_parsegraph_log_func)(const char* fmt, va_list) = 0;

static void redirect_log_func(const char* msg, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, msg);
    if(orig_parsegraph_log_func) {
        orig_parsegraph_log_func(msg, ap);
    }
    else {
        parsegraph_log_func(msg, ap);
    }
    va_end(ap);
}

void parsegraph_logAction(const char* scope, const char* category, const char* message)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    if(!message || *message == 0) {
        message = "";
    }
    struct timespec now;
    if(0 != clock_gettime(CLOCK_MONOTONIC, &now)) {
        fprintf(stderr, "Failed to get time for logging\n");
        abort();
    }
    char buf[parsegraph_LOGBUFSIZE];
    int nwritten;
    if(!scope || *scope == 0) {
        if(!category || *category == 0) {
            nwritten = snprintf(buf, sizeof buf, "%ld %s\n", now.tv_sec, message);
        }
        else {
            nwritten = snprintf(buf, sizeof buf, "%ld (%s) %s\n", now.tv_sec, category, message);
        }
    }
    else {
        if(!category || *category == 0) {
            nwritten = snprintf(buf, sizeof buf, "%s %ld %s\n", scope, now.tv_sec, message);
        }
        else {
            nwritten = snprintf(buf, sizeof buf, "%s %ld (%s) %s\n", scope, now.tv_sec, category, message);
        }
    }
    if(nwritten < 0) {
        perror("parsegraph_logAction");
        abort();
    }
    if(nwritten >= sizeof buf) {
        buf[1019] = '.';
        buf[1020] = '.';
        buf[1021] = '.';
        buf[1022] = '\n';
        buf[1023] = 0;
    }

    if(LOGFD == -1) {
        redirect_log_func(message);
        return;
    }
    write(LOGFD, buf, nwritten);
}

void parsegraph_logMessagevf(const char* fmt, va_list ap)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logAction("", "", buf);
}

void parsegraph_stopLog()
{
    parsegraph_DONT_LOG = 1;
}

int parsegraph_isLogging()
{
    return parsegraph_DONT_LOG == 1 ? 0 : 1;
}

void parsegraph_resumeLog()
{
    parsegraph_DONT_LOG = 0;
}

int parsegraph_connectLog(const char* host, const char* port)
{
    parsegraph_disconnectLog();
    LOGFD = create_and_connect(host, port);
    if(LOGFD != -1) {
        orig_parsegraph_log_func = parsegraph_log_func;
        parsegraph_log_func = parsegraph_logMessagevf;
        return 1;
    }
    return 0;
}

void parsegraph_disconnectLog()
{
    if(LOGFD != -1) {
        const char* l = "CLOSE\n";
        write(LOGFD, l, strlen(l));
        close(LOGFD);
        parsegraph_log_func = orig_parsegraph_log_func;
        orig_parsegraph_log_func = 0;
    }
}

void parsegraph_logEnter(const char* message)
{
    parsegraph_logEnterc("", message);
}

void parsegraph_logEnterc(const char* category, const char* message)
{
    parsegraph_logAction(">", category, message);
}

void parsegraph_logEntercf(const char* category, const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logEnterc(category, buf);
}

void parsegraph_logReset(const char* message)
{
    parsegraph_logResetc("", message);
}

void parsegraph_logResetc(const char* category, const char* message)
{
    parsegraph_logAction("!", category, message);
}

void parsegraph_logMessage(const char* message)
{
    parsegraph_logMessagec("", message);
}

void parsegraph_logMessagec(const char* category, const char* message)
{
    parsegraph_logAction("", category, message);
}

void parsegraph_logMessagecf(const char* category, const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logAction("", category, buf);
}

void parsegraph_logcf(const char* category, const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logAction("", category, buf);
}

void parsegraph_logLeave()
{
    parsegraph_logAction("<", 0, 0);
}

void parsegraph_logLeavec(const char* category, const char* message)
{
    parsegraph_logLeavecf("<", category, message);
}

void parsegraph_logLeavecf(const char* category, const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logAction("<", category, buf);
}

void parsegraph_logLeavef(const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    parsegraph_logMessagevf(fmt, ap);
    va_end(ap);
    parsegraph_logLeave();
}

void parsegraph_logEnterf(const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logEnter(buf);
}

void parsegraph_logMessagef(const char* fmt, ...)
{
    if(!parsegraph_isLogging()) {
        return;
    }
    va_list ap;
    va_start(ap, fmt);
    char buf[parsegraph_LOGBUFSIZE];
    int true_written = vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if(true_written >= sizeof buf) {
        buf[parsegraph_LOGBUFSIZE - 5] = '.';
        buf[parsegraph_LOGBUFSIZE - 4] = '.';
        buf[parsegraph_LOGBUFSIZE - 3] = '.';
        buf[parsegraph_LOGBUFSIZE - 2] = '\n';
        buf[parsegraph_LOGBUFSIZE - 1] = 0;
    }
    parsegraph_logAction("", "", buf);
}

void parsegraph_log_stderr(const char* fmt, va_list ap)
{
    if(parsegraph_isLogging()) {
        vfprintf(stderr, fmt, ap);
    }
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
