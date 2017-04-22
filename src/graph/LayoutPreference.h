#ifndef parsegraph_LayoutPreference_INCLUDED
#define parsegraph_LayoutPreference_INCLUDED

#define parsegraph_NULL_LAYOUT_PREFERENCE 0
#define parsegraph_PREFER_PARENT_AXIS 1
#define parsegraph_PREFER_PERPENDICULAR_AXIS 2
#define parsegraph_PREFER_HORIZONTAL_AXIS 3
#define parsegraph_PREFER_VERTICAL_AXIS 4
const char* parsegraph_nameLayoutPreference(int given);

#endif // parsegraph_LayoutPreference_INCLUDED
