import {
    parsegraph_createException,
    parsegraph_BAD_NODE_ALIGNMENT
} from './Exception';
export const parsegraph_NULL_NODE_ALIGNMENT = 0;
export const parsegraph_DO_NOT_ALIGN = 1;
export const parsegraph_ALIGN_NEGATIVE = 2;
export const parsegraph_ALIGN_CENTER = 3;
export const parsegraph_ALIGN_POSITIVE = 4;

// Used to align inward nodes.
export const parsegraph_ALIGN_HORIZONTAL = 5;
export const parsegraph_ALIGN_VERTICAL = 6;

export function parsegraph_nameNodeAlignment(given)
{
    switch(given) {
        case parsegraph_NULL_NODE_ALIGNMENT:
            return "NULL_NODE_ALIGNMENT";
        case parsegraph_DO_NOT_ALIGN:
            return "DO_NOT_ALIGN";
        case parsegraph_ALIGN_NEGATIVE:
            return "ALIGN_NEGATIVE";
        case parsegraph_ALIGN_CENTER:
            return "ALIGN_CENTER";
        case parsegraph_ALIGN_POSITIVE:
            return "ALIGN_POSITIVE";
        case parsegraph_ALIGN_HORIZONTAL:
            return "ALIGN_HORIZONTAL";
        case parsegraph_ALIGN_VERTICAL:
            return "ALIGN_VERTICAL";
    }
    throw parsegraph_createException(parsegraph_BAD_NODE_ALIGNMENT, given);
}

export function parsegraph_readNodeAlignment(given)
{
    if(typeof(given) === "number") {
        return given;
    }
    if(typeof(given) === "string") {
        given = given.toLowerCase();
        switch(given) {
        case 'none':
        case 'no':
            return parsegraph_DO_NOT_ALIGN;
        case 'negative':
        case 'neg':
        case 'n':
            return parsegraph_ALIGN_NEGATIVE;
        case 'positive':
        case 'pos':
        case 'p':
            return parsegraph_ALIGN_POSITIVE;
        case 'center':
        case 'c':
            return parsegraph_ALIGN_CENTER;
        case 'vertical':
        case 'v':
            return parsegraph_ALIGN_VERTICAL;
        case 'horizontal':
        case 'h':
            return parsegraph_ALIGN_HORIZONTAL;
        }
    }

    return parsegraph_NULL_NODE_ALIGNMENT;
}
