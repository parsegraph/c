function parsegraph_readNodeDirection(given)
{
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        switch(given.charAt(0)) {
        case 'f':
        case 'F':
            return parsegraph_FORWARD;
            break;
        case 'b':
        case 'B':
            return parsegraph_BACKWARD;
            break;
        case 'u':
        case 'U':
            return parsegraph_UPWARD;
            break;
        case 'd':
        case 'D':
            return parsegraph_DOWNWARD;
            break;
        case 'i':
        case 'I':
            return parsegraph_INWARD;
            break;
        case 'o':
        case 'O':
            return parsegraph_OUTWARD;
            break;
        }
    }

    return parsegraph_NULL_NODE_DIRECTION;
}

function parsegraph_nameNodeDirection(given)
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
    throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION, given);
}
parsegraph_isNodeDirection = parsegraph_nameNodeDirection;

function parsegraph_reverseNodeDirection(given)
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
    throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION, given);
}

function parsegraph_turnLeft(given)
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
            throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION, given);
    }
}

function parsegraph_turnRight(given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnLeft(given)
    );
}

function parsegraph_turnPositive(direction)
{
    return parsegraph_getPositiveNodeDirection(
        parsegraph_getPerpendicularAxis(direction)
    );
}

function parsegraph_turnNegative(direction)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnPositive(direction)
    );
}

function parsegraph_isCardinalDirection(given)
{
    switch(given) {
    case parsegraph_NULL_NODE_DIRECTION:
    case parsegraph_INWARD:
    case parsegraph_OUTWARD:
        return false;
    case parsegraph_UPWARD:
    case parsegraph_DOWNWARD:
    case parsegraph_BACKWARD:
    case parsegraph_FORWARD:
        return true;
    }
    throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION, given);
}

function parsegraph_nameAxis(given)
{
    switch(given) {
    case parsegraph_NULL_AXIS:
        return "NULL_AXIS";
    case parsegraph_VERTICAL_AXIS:
        return "VERTICAL_AXIS";
    case parsegraph_HORIZONTAL_AXIS:
        return "HORIZONTAL_AXIS";
    }
}

function parsegraph_getNodeDirectionAxis(given)
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
    throw parsegraph_createException(parsegraph_BAD_NODE_DIRECTION, given);
}

function parsegraph_isVerticalNodeDirection(given)
{
    return parsegraph_getNodeDirectionAxis(given) === parsegraph_VERTICAL_AXIS;
}

function parsegraph_isHorizontalNodeDirection(given)
{
    return parsegraph_getNodeDirectionAxis(given) === parsegraph_HORIZONTAL_AXIS;
}

function parsegraph_getPerpendicularAxis(axisOrDirection)
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
    throw parsegraph_createException(parsegraph_BAD_AXIS, axisOrDirection);
}

function parsegraph_getPositiveNodeDirection(given)
{
    switch(given) {
        case parsegraph_HORIZONTAL_AXIS:
            return parsegraph_FORWARD;
            break;
        case parsegraph_VERTICAL_AXIS:
            return parsegraph_DOWNWARD;
        case parsegraph_NULL_AXIS:
            throw parsegraph_createException(parsegraph_BAD_AXIS, given);
    }
    throw parsegraph_createException(parsegraph_BAD_AXIS, given);
}

function parsegraph_forEachCardinalNodeDirection(func, thisArg)
{
    func.call(thisArg, parsegraph_DOWNWARD);
    func.call(thisArg, parsegraph_UPWARD);
    func.call(thisArg, parsegraph_FORWARD);
    func.call(thisArg, parsegraph_BACKWARD);
}

function parsegraph_getNegativeNodeDirection(given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_getPositiveNodeDirection(given)
    );
}

function parsegraph_isPositiveNodeDirection(given)
{
    var positiveNodeDirection = parsegraph_getPositiveNodeDirection(
        parsegraph_getNodeDirectionAxis(given)
    );
    return given == positiveNodeDirection;
}

function parsegraph_isNegativeNodeDirection(given)
{
    return parsegraph_isPositiveNodeDirection(
        parsegraph_reverseNodeDirection(given)
    );
}

function parsegraph_nodeDirectionSign(given)
{
    if(parsegraph_isPositiveNodeDirection(given)) {
        return 1;
    }
    return -1;
}

function parsegraph_alternateNodeDirection(given)
{
    switch(given) {
    case parsegraph_DOWNWARD:
    case parsegraph_INWARD:
        return parsegraph_FORWARD;
    case parsegraph_FORWARD:
        return parsegraph_DOWNWARD;
    default:
        throw new Error("NYI");
    }
}
