#include "NodeDirection.h"
#include "log.h"

int parsegraph_readNodeDirection(const char* given)
{
    switch(given[0]) {
    case 'f':
    case 'F':
        return parsegraph_FORWARD;
    case 'b':
    case 'B':
        return parsegraph_BACKWARD;
    case 'u':
    case 'U':
        return parsegraph_UPWARD;
    case 'd':
    case 'D':
        return parsegraph_DOWNWARD;
    case 'i':
    case 'I':
        return parsegraph_INWARD;
    case 'o':
    case 'O':
        return parsegraph_OUTWARD;
    }

    return parsegraph_NULL_NODE_DIRECTION;
}

const char* parsegraph_nameNodeDirection(int given)
{
    switch(given) {
        case parsegraph_NULL_NODE_DIRECTION:
            return "NULL_NODE_DIRECTION";
        case parsegraph_FORWARD:
            return "FORWARD";
        case parsegraph_BACKWARD:
            return "BACKWARD";
        case parsegraph_DOWNWARD:
            return "DOWNWARD";
        case parsegraph_UPWARD:
            return "UPWARD";
        case parsegraph_INWARD:
            return "INWARD";
        case parsegraph_OUTWARD:
            return "OUTWARD";
    }
    parsegraph_log("Unknown node direction: %d", given);
    return "NULL_NODE_DIRECTION";
}

int parsegraph_isNodeDirection(int given)
{
    return parsegraph_nameNodeDirection(given) != 0;
}

int parsegraph_reverseNodeDirection(int given)
{
    switch(given) {
        case parsegraph_NULL_NODE_DIRECTION:
            return parsegraph_NULL_NODE_DIRECTION;
        case parsegraph_FORWARD:
            return parsegraph_BACKWARD;
        case parsegraph_BACKWARD:
            return parsegraph_FORWARD;
        case parsegraph_DOWNWARD:
            return parsegraph_UPWARD;
        case parsegraph_UPWARD:
            return parsegraph_DOWNWARD;
        case parsegraph_INWARD:
            return parsegraph_OUTWARD;
        case parsegraph_OUTWARD:
            return parsegraph_INWARD;
    }
    parsegraph_log("Unknown node direction: %d", given);
    return parsegraph_NULL_NODE_DIRECTION;
}

int parsegraph_turnLeft(int given)
{
    switch(given) {
        case parsegraph_FORWARD:
            return parsegraph_UPWARD;
        case parsegraph_BACKWARD:
            return parsegraph_DOWNWARD;
        case parsegraph_DOWNWARD:
            return parsegraph_FORWARD;
        case parsegraph_UPWARD:
            return parsegraph_BACKWARD;
        default:
            parsegraph_log("Unknown node direction: %d", given);
            return parsegraph_NULL_NODE_DIRECTION;
    }
}

int parsegraph_turnRight(int given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnLeft(given)
    );
}

int parsegraph_turnPositive(int direction)
{
    return parsegraph_getPositiveNodeDirection(
        parsegraph_getPerpendicularAxis(direction)
    );
}

int parsegraph_turnNegative(int direction)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnPositive(direction)
    );
}

int parsegraph_isCardinalDirection(int given)
{
    switch(given) {
    case parsegraph_NULL_NODE_DIRECTION:
    case parsegraph_INWARD:
    case parsegraph_OUTWARD:
        return 0;
    case parsegraph_UPWARD:
    case parsegraph_DOWNWARD:
    case parsegraph_BACKWARD:
    case parsegraph_FORWARD:
        return 1;
    }
    parsegraph_log("Unknown node direction: %d", given);
    return -1;
}

const char* parsegraph_nameAxis(int given)
{
    switch(given) {
    case parsegraph_NULL_AXIS:
        return "NULL_AXIS";
    case parsegraph_VERTICAL_AXIS:
        return "VERTICAL_AXIS";
    case parsegraph_HORIZONTAL_AXIS:
        return "HORIZONTAL_AXIS";
    }
    parsegraph_log("Unknown node axis: %d", given);
    return 0;
}

int parsegraph_getNodeDirectionAxis(int given)
{
    switch(given) {
        case parsegraph_FORWARD:
        case parsegraph_BACKWARD:
            return parsegraph_HORIZONTAL_AXIS;
        case parsegraph_DOWNWARD:
        case parsegraph_UPWARD:
            return parsegraph_VERTICAL_AXIS;
        case parsegraph_INWARD:
        case parsegraph_OUTWARD:
        case parsegraph_NULL_NODE_DIRECTION:
            return parsegraph_NULL_AXIS;
    }
    parsegraph_log("Unknown node direction: %d", given);
    return 0;
}

int parsegraph_isVerticalNodeDirection(int given)
{
    return parsegraph_getNodeDirectionAxis(given) == parsegraph_VERTICAL_AXIS;
}

int parsegraph_isHorizontalNodeDirection(int given)
{
    return parsegraph_getNodeDirectionAxis(given) == parsegraph_HORIZONTAL_AXIS;
}

int parsegraph_getPerpendicularAxis(int axisOrDirection)
{
    switch(axisOrDirection) {
        case parsegraph_HORIZONTAL_AXIS:
            return parsegraph_VERTICAL_AXIS;
            break;
        case parsegraph_VERTICAL_AXIS:
            return parsegraph_HORIZONTAL_AXIS;
        case parsegraph_NULL_AXIS:
            return parsegraph_NULL_AXIS;
        default:
            // Assume it's a direction.
            return parsegraph_getPerpendicularAxis(
                parsegraph_getNodeDirectionAxis(axisOrDirection)
            );
    }
    parsegraph_log("Unknown node axis: %d", axisOrDirection);
    return parsegraph_NULL_AXIS;
}

int parsegraph_getPositiveNodeDirection(int given)
{
    switch(given) {
        case parsegraph_HORIZONTAL_AXIS:
            return parsegraph_FORWARD;
            break;
        case parsegraph_VERTICAL_AXIS:
            return parsegraph_DOWNWARD;
    }
    parsegraph_log("Unknown node axis: %d", given);
    return parsegraph_NULL_AXIS;
}

void parsegraph_forEachCardinalNodeDirection(void(*func)(void*, int), void* thisArg)
{
    func(thisArg, parsegraph_DOWNWARD);
    func(thisArg, parsegraph_UPWARD);
    func(thisArg, parsegraph_FORWARD);
    func(thisArg, parsegraph_BACKWARD);
}

int parsegraph_getNegativeNodeDirection(int given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_getPositiveNodeDirection(given)
    );
}

int parsegraph_isPositiveNodeDirection(int given)
{
    int positiveNodeDirection = parsegraph_getPositiveNodeDirection(
        parsegraph_getNodeDirectionAxis(given)
    );
    return given == positiveNodeDirection;
}

int parsegraph_isNegativeNodeDirection(int given)
{
    return parsegraph_isPositiveNodeDirection(
        parsegraph_reverseNodeDirection(given)
    );
}

int parsegraph_nodeDirectionSign(int given)
{
    if(parsegraph_isPositiveNodeDirection(given)) {
        return 1;
    }
    return -1;
}

int parsegraph_alternateNodeDirection(int given)
{
    switch(given) {
    case parsegraph_DOWNWARD:
    case parsegraph_INWARD:
        return parsegraph_FORWARD;
    case parsegraph_FORWARD:
        return parsegraph_DOWNWARD;
    default:
        parsegraph_log("NYI");
        return parsegraph_NULL_NODE_DIRECTION;
    }
}
