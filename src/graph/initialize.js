function parsegraph_initialize() {
    parsegraph_TOUCH_SENSITIVITY = 1;
    parsegraph_MOUSE_SENSITIVITY = 1;

    // Node Direction
    parsegraph_NULL_NODE_DIRECTION = -1;
    parsegraph_FORWARD = 0;
    parsegraph_BACKWARD = 1;
    parsegraph_DOWNWARD = 2;
    parsegraph_UPWARD = 3;
    parsegraph_INWARD = 4;
    parsegraph_OUTWARD = 5;

    // Node Axis
    parsegraph_NULL_AXIS = 6;
    parsegraph_HORIZONTAL_AXIS = 7;
    parsegraph_VERTICAL_AXIS = 8;

    // Node Type
    parsegraph_NULL_NODE_TYPE = 9;
    parsegraph_BUD = 10;
    parsegraph_SLOT = 11;
    parsegraph_BLOCK = 12;

    parsegraph_NULL_NODE_FIT = 13;
    parsegraph_NODE_FIT_EXACT = 14;
    parsegraph_NODE_FIT_LOOSE = 15;

    parsegraph_MAX_PRESS_RELEASE_DELAY = 1.5 * 1000;
}
