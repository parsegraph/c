#include "id.h"
#include <stdio.h>
#include <stdlib.h>

static int count = 0;

int parsegraph_generateID(char* buf, int len, const char* prefix)
{
    if(!prefix) {
        prefix = "parsegraph-unique";
    }
    return snprintf(buf, len, "%s-%d", prefix, (++count));
}
