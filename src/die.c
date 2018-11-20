#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>

void  __attribute__ ((noreturn)) parsegraph_die(const char* err, ...)
{
    va_list ap;
    va_start(ap, err);
    vfprintf(stderr, err, ap);
    va_end(ap);
    fprintf(stderr, "\n");
    abort();
}
