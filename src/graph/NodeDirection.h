#ifndef parsegraph_NodeDirection_INCLUDED
#define parsegraph_NodeDirection_INCLUDED

// Node Direction
#define parsegraph_NULL_NODE_DIRECTION -1
#define parsegraph_FORWARD 0
#define parsegraph_BACKWARD 1
#define parsegraph_DOWNWARD 2
#define parsegraph_UPWARD 3
#define parsegraph_INWARD 4
#define parsegraph_OUTWARD 5
#define parsegraph_NUM_DIRECTIONS 6

// Node Axis
#define parsegraph_NULL_AXIS 6
#define parsegraph_HORIZONTAL_AXIS 7
#define parsegraph_VERTICAL_AXIS 8

int parsegraph_readNodeDirection(const char* given);
const char* parsegraph_nameNodeDirection(int given);
int parsegraph_isNodeDirection(int given);
int parsegraph_reverseNodeDirection(int given);
int parsegraph_turnLeft(int given);
int parsegraph_turnRight(int given);
int parsegraph_turnPositive(int direction);
int parsegraph_turnNegative(int direction);
int parsegraph_isCardinalDirection(int given);
const char* parsegraph_nameAxis(int given);
int parsegraph_getNodeDirectionAxis(int given);
int parsegraph_isVerticalNodeDirection(int given);
int parsegraph_isHorizontalNodeDirection(int given);
int parsegraph_getPerpendicularAxis(int axisOrDirection);
int parsegraph_getPositiveNodeDirection(int given);
void parsegraph_forEachCardinalNodeDirection(void(*func)(void*, int), void* thisArg);
int parsegraph_getNegativeNodeDirection(int given);
int parsegraph_isPositiveNodeDirection(int given);
int parsegraph_isNegativeNodeDirection(int given);
int parsegraph_nodeDirectionSign(int given);
int parsegraph_alternateNodeDirection(int given);

#endif // parsegraph_NodeDirection_INCLUDED
