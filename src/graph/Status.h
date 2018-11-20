#ifndef parsegraph_Status_INCLUDED
#define parsegraph_Status_INCLUDED

enum parsegraph_Status {
parsegraph_NULL_STATUS = 0,
parsegraph_OK = 1,
parsegraph_BAD_STATUS = 2,
parsegraph_NO_NODE_FOUND = 3,
parsegraph_ALREADY_OCCUPIED = 4,
parsegraph_BAD_NODE_DIRECTION = 5,
parsegraph_BAD_NODE_CONTENT = 6,
parsegraph_BAD_AXIS = 7,
parsegraph_BAD_LAYOUT_STATE = 8,
parsegraph_BAD_NODE_ALIGNMENT = 9,
parsegraph_CANNOT_AFFECT_PARENT = 10,
parsegraph_OFFSET_IS_NEGATIVE = 11,
parsegraph_NODE_IS_ROOT = 12,
parsegraph_BAD_LAYOUT_PREFERENCE = 13
};
typedef enum parsegraph_Status parsegraph_Status;

const char* parsegraph_nameStatus(parsegraph_Status given);
void parsegraph_abort(parsegraph_Status given) __attribute__ ((noreturn));

#endif // parsegraph_Status_INCLUDED
