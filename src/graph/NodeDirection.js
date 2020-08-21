import {
    parsegraph_createException,
    parsegraph_BAD_NODE_DIRECTION
} from './Exception.js';

// Node Direction
export const parsegraph_NULL_NODE_DIRECTION = -1;
export const parsegraph_INWARD = 0;
export const parsegraph_OUTWARD = 1;
export const parsegraph_DOWNWARD = 2;
export const parsegraph_UPWARD = 3;
export const parsegraph_BACKWARD = 4;
export const parsegraph_FORWARD = 5;

export const parsegraph_NUM_DIRECTIONS = 6;

export const parsegraph_NULL_AXIS = 6;
export const parsegraph_HORIZONTAL_AXIS = 7;
export const parsegraph_VERTICAL_AXIS = 8;

export const parsegraph_HORIZONTAL_ORDER = [
    parsegraph_BACKWARD,
    parsegraph_FORWARD,
    parsegraph_DOWNWARD,
    parsegraph_UPWARD,
    parsegraph_INWARD,
    parsegraph_OUTWARD
];

export const parsegraph_VERTICAL_ORDER = [
    parsegraph_DOWNWARD,
    parsegraph_UPWARD,
    parsegraph_BACKWARD,
    parsegraph_FORWARD,
    parsegraph_INWARD,
    parsegraph_OUTWARD
];

export function parsegraph_readNodeDirection(given)
{
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        switch(given.charAt(0)) {
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
    }

    return parsegraph_NULL_NODE_DIRECTION;
}

export function parsegraph_nameNodeDirection(given)
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
export const parsegraph_isNodeDirection = parsegraph_nameNodeDirection;

export function parsegraph_reverseNodeDirection(given)
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

export function parsegraph_turnLeft(given)
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

export function parsegraph_turnRight(given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnLeft(given)
    );
}

export function parsegraph_turnPositive(direction)
{
    return parsegraph_getPositiveNodeDirection(
        parsegraph_getPerpendicularAxis(direction)
    );
}

export function parsegraph_turnNegative(direction)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_turnPositive(direction)
    );
}

export function parsegraph_isCardinalDirection(given)
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

export function parsegraph_nameAxis(given)
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

export function parsegraph_getNodeDirectionAxis(given)
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

export function parsegraph_isVerticalNodeDirection(given)
{
    return parsegraph_getNodeDirectionAxis(given) === parsegraph_VERTICAL_AXIS;
}

export function parsegraph_isHorizontalNodeDirection(given)
{
    return parsegraph_getNodeDirectionAxis(given) === parsegraph_HORIZONTAL_AXIS;
}

export function parsegraph_getPerpendicularAxis(axisOrDirection)
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

export function parsegraph_getPositiveNodeDirection(given)
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

export function parsegraph_forEachCardinalNodeDirection(func, thisArg)
{
    func.call(thisArg, parsegraph_DOWNWARD);
    func.call(thisArg, parsegraph_UPWARD);
    func.call(thisArg, parsegraph_FORWARD);
    func.call(thisArg, parsegraph_BACKWARD);
}

export function parsegraph_getNegativeNodeDirection(given)
{
    return parsegraph_reverseNodeDirection(
        parsegraph_getPositiveNodeDirection(given)
    );
}

export function parsegraph_isPositiveNodeDirection(given)
{
    var positiveNodeDirection = parsegraph_getPositiveNodeDirection(
        parsegraph_getNodeDirectionAxis(given)
    );
    return given == positiveNodeDirection;
}

export function parsegraph_isNegativeNodeDirection(given)
{
    return parsegraph_isPositiveNodeDirection(
        parsegraph_reverseNodeDirection(given)
    );
}

export function parsegraph_nodeDirectionSign(given)
{
    if(parsegraph_isPositiveNodeDirection(given)) {
        return 1;
    }
    return -1;
}

export function parsegraph_alternateNodeDirection(given)
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
