import { parsegraph_createException, parsegraph_BAD_LAYOUT_PREFERENCE } from './Exception.js';

export const parsegraph_NULL_LAYOUT_PREFERENCE = 0;
export const parsegraph_PREFER_PARENT_AXIS = 1;
export const parsegraph_PREFER_PERPENDICULAR_AXIS = 2;
export const parsegraph_PREFER_HORIZONTAL_AXIS = 3;
export const parsegraph_PREFER_VERTICAL_AXIS = 4;

export function parsegraph_nameLayoutPreference(given)
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
    throw parsegraph_createException(parsegraph_BAD_LAYOUT_PREFERENCE, given);
}
