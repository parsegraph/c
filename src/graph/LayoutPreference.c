#include "LayoutPreference.h"
#include "log.h"

const char* parsegraph_nameLayoutPreference(int given)
{
    switch(given) {
        case parsegraph_NULL_LAYOUT_PREFERENCE:
            return "NULL_LAYOUT_PREFERENCE";
        case parsegraph_PREFER_PARENT_AXIS:
            return "PREFER_PARENT_AXIS";
        case parsegraph_PREFER_PERPENDICULAR_AXIS:
            return "PREFER_PERPENDICULAR_AXIS";
        case parsegraph_PREFER_HORIZONTAL_AXIS:
            return "PREFER_HORIZONTAL_AXIS";
        case parsegraph_PREFER_VERTICAL_AXIS:
            return "PREFER_VERTICAL_AXIS";
    };
    parsegraph_log("Bad layout preference: %d", given);
    return parsegraph_NULL_LAYOUT_PREFERENCE;
}
