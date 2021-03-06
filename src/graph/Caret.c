#include "Caret.h"
#include "initialize.h"
#include "LayoutPreference.h"
#include "id.h"
#include "NodeFit.h"
#include "Surface.h"
#include "../die.h"
#include "Status.h"
#include "NodeAlignment.h"

parsegraph_Caret* parsegraph_Caret_new(parsegraph_Surface* surface, parsegraph_Node* nodeRoot)
{
    apr_pool_t* pool = 0;
    if(!nodeRoot) {
        if(APR_SUCCESS != apr_pool_create(&pool, surface->pool)) {
            parsegraph_die("Failed to create APR pool for parsegraph_Caret");
        }
        nodeRoot = parsegraph_Node_new(pool, parsegraph_DEFAULT_NODE_TYPE, 0, 0);
    }
    else {
        if(APR_SUCCESS != apr_pool_create(&pool, nodeRoot->pool)) {
            parsegraph_die("Failed to create APR pool for parsegraph_Caret");
        }
    }
    parsegraph_Caret* caret = apr_palloc(pool, sizeof(*caret));
    caret->surface = surface;
    caret->pool = pool;

    caret->_mathMode = 0;

    caret->_nodeRoot = nodeRoot;

    // Stack of nodes.
    caret->_nodes = parsegraph_ArrayList_new(pool);
    if(caret->_nodeRoot) {
        parsegraph_ArrayList_push(caret->_nodes, caret->_nodeRoot);
    }

    // A mapping of nodes to their saved names.
    caret->_savedNodes = 0;

    caret->_labels = parsegraph_ArrayList_new(pool);

    caret->_glyphAtlas = 0;
    return caret;
}

void parsegraph_Caret_destroy(parsegraph_Caret* caret)
{
    parsegraph_ArrayList_destroy(caret->_nodes);
    if(caret->_savedNodes) {
        parsegraph_ArrayList_destroy(caret->_savedNodes);
    }
    parsegraph_ArrayList_destroy(caret->_labels);
    apr_pool_destroy(caret->pool);
}

void parsegraph_Caret_setMathMode(parsegraph_Caret* caret, int mathMode)
{
    caret->_mathMode = mathMode;
    parsegraph_Node* curr = parsegraph_Caret_node(caret);
    if(mathMode) {
        switch(parsegraph_Node_type(curr)) {
        case parsegraph_BLOCK:
            parsegraph_Node_setBlockStyle(curr, parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            parsegraph_Node_setBlockStyle(curr, parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }
}

int parsegraph_Caret_mathMode(parsegraph_Caret* caret)
{
    return caret->_mathMode;
}

void parsegraph_Caret_setGlyphAtlas(parsegraph_Caret* caret, parsegraph_GlyphAtlas* glyphAtlas)
{
    caret->_glyphAtlas = glyphAtlas;
}

parsegraph_GlyphAtlas* parsegraph_Caret_glyphAtlas(parsegraph_Caret* caret)
{
    if(!caret->_glyphAtlas) {
        parsegraph_die("Caret does not have a GlyphAtlas");
    }
    return caret->_glyphAtlas;
}

parsegraph_Node* parsegraph_Caret_node(parsegraph_Caret* caret)
{
    if(parsegraph_ArrayList_length(caret->_nodes) == 0) {
        parsegraph_abort(parsegraph_NO_NODE_FOUND);
    }
    return parsegraph_ArrayList_at(caret->_nodes, parsegraph_ArrayList_length(caret->_nodes) - 1);
}

int parsegraph_Caret_has(parsegraph_Caret* caret, const char* inDirection)
{
    return parsegraph_Node_hasNode(parsegraph_Caret_node(caret), parsegraph_readNodeDirection(inDirection));
}

void parsegraph_Caret_spawn(parsegraph_Caret* caret, const char* inDirection, const char* newType, const char* newAlignmentMode)
{
    // Interpret the given direction and type for ease-of-use.
    int inDirectionVal = parsegraph_readNodeDirection(inDirection);
    int newTypeVal = parsegraph_readNodeType(newType);

    // Spawn a node in the given direction.
    parsegraph_Node* created = parsegraph_Node_spawnNode(parsegraph_Caret_node(caret), inDirectionVal, newTypeVal);

    // Use the given alignment mode.
    if(newAlignmentMode) {
        int newAlignmentModeVal = parsegraph_readNodeAlignment(newAlignmentMode);
        parsegraph_Caret_align(caret, inDirection, newAlignmentMode);
        if(newAlignmentModeVal != parsegraph_DO_NOT_ALIGN) {
            parsegraph_Node_setNodeFit(parsegraph_Caret_node(caret), parsegraph_NODE_FIT_EXACT);
        }
    }

    if(caret->_mathMode) {
        switch(newTypeVal) {
        case parsegraph_BLOCK:
            parsegraph_Node_setBlockStyle(created, parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            parsegraph_Node_setBlockStyle(created, parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }

    parsegraph_Node_unref(created);
};

parsegraph_Node* parsegraph_Caret_connect(parsegraph_Caret* caret, const char* inDirection, parsegraph_Node* node)
{
    // Interpret the given direction for ease-of-use.
    int inDirectionVal = parsegraph_readNodeDirection(inDirection);

    parsegraph_Node_connectNode(parsegraph_Caret_node(caret), inDirectionVal, node);

    return node;
};

parsegraph_Node* parsegraph_Caret_disconnect(parsegraph_Caret* caret, const char* inDirection)
{
    if(inDirection) {
        // Interpret the given direction for ease-of-use.
        int inDirectionVal = parsegraph_readNodeDirection(inDirection);
        return parsegraph_Node_disconnectNode(parsegraph_Caret_node(caret), inDirectionVal);
    }

    if(parsegraph_Node_isRoot(parsegraph_Caret_node(caret))) {
        parsegraph_die("A root node cannot be disconnected.");
    }

    return parsegraph_Node_disconnectNode(parsegraph_Node_parentNode(parsegraph_Caret_node(caret)), parsegraph_reverseNodeDirection(parsegraph_Node_parentDirection(parsegraph_Caret_node(caret))));
}

void parsegraph_Caret_crease(parsegraph_Caret* caret, const char* inDirection)
{
    // Interpret the given direction for ease-of-use.
    parsegraph_Node* node;
    if(!inDirection) {
        node = parsegraph_Caret_node(caret);
    }
    else {
        int inDirectionVal = parsegraph_readNodeDirection(inDirection);
        node = parsegraph_Node_nodeAt(parsegraph_Caret_node(caret), inDirectionVal);
    }

    // Create a new paint group for the connection.
    if(!parsegraph_Node_localPaintGroup(node)) {
        parsegraph_Node_setPaintGroup(node, 1);
    }
}

void parsegraph_Caret_uncrease(parsegraph_Caret* caret, const char* inDirection)
{
    // Interpret the given direction for ease-of-use.
    parsegraph_Node* node;
    if(!inDirection) {
        node = parsegraph_Caret_node(caret);
    }
    else {
        int inDirectionVal = parsegraph_readNodeDirection(inDirection);
        node = parsegraph_Node_nodeAt(parsegraph_Caret_node(caret), inDirectionVal);
    }

    // Remove the paint group.
    parsegraph_Node_setPaintGroup(node, 0);
}

int parsegraph_Caret_isCreased(parsegraph_Caret* caret, const char* inDirection)
{
    // Interpret the given direction for ease-of-use.
    int readDirection = parsegraph_readNodeDirection(inDirection);

    parsegraph_Node* node;
    if(!inDirection) {
        node = parsegraph_Caret_node(caret);
    }
    else {
        node = parsegraph_Node_nodeAt(parsegraph_Caret_node(caret), readDirection);
    }

    return parsegraph_Node_localPaintGroup(node);
}

int parsegraph_Caret_creased(parsegraph_Caret* caret, const char* inDirection)
{
    return parsegraph_Caret_isCreased(caret, inDirection);
}

void parsegraph_Caret_erase(parsegraph_Caret* caret, const char* inDirection)
{
    int inDirectionVal = parsegraph_readNodeDirection(inDirection);
    parsegraph_Node_eraseNode(parsegraph_Caret_node(caret), inDirectionVal);
};

void parsegraph_Caret_onClick(parsegraph_Caret* caret, int(*clickListener)(parsegraph_Node*, const char*, void*), void* thisArg)
{
    parsegraph_Node_setClickListener(parsegraph_Caret_node(caret), clickListener, thisArg);
}

void parsegraph_Caret_onChange(parsegraph_Caret* caret, void(*changeListener)(void*, parsegraph_Node*), void* thisArg)
{
    parsegraph_Node_setChangeListener(parsegraph_Caret_node(caret), changeListener, thisArg);
}

void parsegraph_Caret_onKey(parsegraph_Caret* caret, int(*keyListener)(parsegraph_Node*, const char*, void*), void* thisArg)
{
    parsegraph_Node_setKeyListener(parsegraph_Caret_node(caret), keyListener, thisArg);
}

void parsegraph_Caret_move(parsegraph_Caret* caret, const char* toDirection)
{
    int toDirectionVal = parsegraph_readNodeDirection(toDirection);
    parsegraph_Node* dest = parsegraph_Node_nodeAt(parsegraph_Caret_node(caret), toDirectionVal);
    if(!dest) {
        parsegraph_abort(parsegraph_NO_NODE_FOUND);
    }
    parsegraph_ArrayList_replace(caret->_nodes, parsegraph_ArrayList_length(caret->_nodes) -1, dest);
}

void parsegraph_Caret_push(parsegraph_Caret* caret)
{
    parsegraph_ArrayList_push(caret->_nodes, parsegraph_Caret_node(caret));
}

static parsegraph_SavedCaret* parsegraph_Caret_find(parsegraph_Caret* caret, const char* id)
{
    for(int i = 0; i < parsegraph_ArrayList_length(caret->_savedNodes); ++i) {
        parsegraph_SavedCaret* sc = parsegraph_ArrayList_at(caret->_savedNodes, i);
        if(!strcmp(sc->id, id)) {
            return sc;
        }
    }
    return 0;
}

const char* parsegraph_Caret_save(parsegraph_Caret* caret, const char* id)
{
    if(id && strlen(id) > 254) {
        parsegraph_die("Caret ID is too large");
    }

    if(!caret->_savedNodes) {
        caret->_savedNodes = parsegraph_ArrayList_new(caret->pool);
    }

    parsegraph_SavedCaret* sc;
    char buf[255];
    memset(buf, 0, sizeof(char)*255);
    if(!id) {
        parsegraph_generateID(buf, 255, "Caret");
    }
    else {
        sc = parsegraph_Caret_find(caret, id);
        if(sc) {
            sc->node = parsegraph_Caret_node(caret);
            return sc->id;
        }
    }

    sc = apr_palloc(caret->pool, sizeof(*sc));
    strncpy(sc->id, id ? id : buf, 255);
    sc->node = parsegraph_Caret_node(caret);
    parsegraph_ArrayList_push(caret->_savedNodes, sc);
    return sc->id;
}

void parsegraph_Caret_clearSave(parsegraph_Caret* caret, const char* id)
{
    if(!caret->_savedNodes) {
        return;
    }
    for(int i = 0; i < parsegraph_ArrayList_length(caret->_savedNodes); ++i) {
        parsegraph_SavedCaret* sc = parsegraph_ArrayList_at(caret->_savedNodes, i);
        if(!strcmp(sc->id, id)) {
            parsegraph_ArrayList_splice(caret->_savedNodes, i, 1);
            return;
        }
    }
}

void parsegraph_Caret_restore(parsegraph_Caret* caret, const char* id)
{
    if(!caret->_savedNodes) {
        parsegraph_die("No saved nodes were found for the provided ID '%s'", id);
    }

    parsegraph_SavedCaret* sc = parsegraph_Caret_find(caret, id);
    if(!sc) {
        parsegraph_die("No node found for the provided ID '%s'", id);
    }
    parsegraph_Node* loadedNode = sc->node;
    parsegraph_ArrayList_replace(caret->_nodes, parsegraph_ArrayList_length(caret->_nodes) - 1, loadedNode);
}

void parsegraph_Caret_moveTo(parsegraph_Caret* caret, const char* id)
{
    parsegraph_Caret_restore(caret, id);
}

void parsegraph_Caret_moveToRoot(parsegraph_Caret* caret)
{
    parsegraph_ArrayList_replace(caret->_nodes, parsegraph_ArrayList_length(caret->_nodes) - 1, caret->_nodeRoot);
}

void parsegraph_Caret_pop(parsegraph_Caret* caret)
{
    if(parsegraph_ArrayList_length(caret->_nodes) <= 1) {
        parsegraph_abort(parsegraph_NO_NODE_FOUND);
    }
    parsegraph_ArrayList_pop(caret->_nodes);
};

parsegraph_Node* parsegraph_Caret_spawnMove(parsegraph_Caret* caret, const char* inDirection, const char* newContent, const char* newAlignmentMode)
{
    parsegraph_Caret_spawn(caret, inDirection, newContent, newAlignmentMode);
    parsegraph_Caret_move(caret, inDirection);
    return parsegraph_Caret_node(caret);
}

void parsegraph_Caret_replace(parsegraph_Caret* caret, const char* arg1, const char* arg2)
{
    // Retrieve the arguments.
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    const char* withContent = arg1;
    if(arg2) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(arg1));
        withContent = arg2;
    }

    // Set the node type.
    int withContentVal = parsegraph_readNodeType(withContent);

    parsegraph_Node_setType(node, withContentVal);
    if(caret->_mathMode) {
        switch(withContentVal) {
        case parsegraph_BLOCK:
            parsegraph_Node_setBlockStyle(node, parsegraph_BLOCK_MATH_STYLE);
            break;
        case parsegraph_SLOT:
            parsegraph_Node_setBlockStyle(node, parsegraph_SLOT_MATH_STYLE);
            break;
        }
    }
}

int parsegraph_Caret_at(parsegraph_Caret* caret, const char* inDirection)
{
    int inDirectionVal = parsegraph_readNodeDirection(inDirection);
    if(parsegraph_Node_hasNode(parsegraph_Caret_node(caret), inDirectionVal)) {
        return parsegraph_Node_type(parsegraph_Node_nodeAt(parsegraph_Caret_node(caret), inDirectionVal));
    }
    parsegraph_abort(parsegraph_NO_NODE_FOUND);
};

void parsegraph_Caret_align(parsegraph_Caret* caret, const char* inDirection, const char* newAlignmentMode)
{
    // Interpret the arguments.
    int inDirectionVal = parsegraph_readNodeDirection(inDirection);
    int newAlignmentModeVal = parsegraph_readNodeAlignment(newAlignmentMode);

    parsegraph_Node_setNodeAlignmentMode(parsegraph_Caret_node(caret), inDirectionVal, newAlignmentModeVal);
    if(newAlignmentModeVal != parsegraph_DO_NOT_ALIGN) {
        parsegraph_Node_setNodeFit(parsegraph_Caret_node(caret), parsegraph_NODE_FIT_EXACT);
    }
}

void parsegraph_Caret_pull(parsegraph_Caret* caret, const char* given)
{
    int givenVal = parsegraph_readNodeDirection(given);
    if(parsegraph_Node_isRoot(parsegraph_Caret_node(caret)) || parsegraph_Node_parentDirection(parsegraph_Caret_node(caret)) == parsegraph_OUTWARD) {
        if(parsegraph_isVerticalNodeDirection(givenVal)) {
            parsegraph_Node_setLayoutPreference(parsegraph_Caret_node(caret), parsegraph_PREFER_VERTICAL_AXIS);
        }
        else {
            parsegraph_Node_setLayoutPreference(parsegraph_Caret_node(caret), parsegraph_PREFER_HORIZONTAL_AXIS);
        }
        return;
    }
    if(
        parsegraph_getNodeDirectionAxis(givenVal)
        == parsegraph_getNodeDirectionAxis(parsegraph_Node_parentDirection(parsegraph_Caret_node(caret)))
    ) {
        parsegraph_Node_setLayoutPreference(parsegraph_Caret_node(caret), parsegraph_PREFER_PARENT_AXIS);
    }
    else {
        parsegraph_Node_setLayoutPreference(parsegraph_Caret_node(caret), parsegraph_PREFER_PERPENDICULAR_AXIS);
    }
}

void parsegraph_Caret_shrink(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    if(node) {
        parsegraph_Node_setScale(node, parsegraph_SHRINK_SCALE);
    }
};

void parsegraph_Caret_grow(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    if(node) {
        parsegraph_Node_setScale(node, 1.0);
    }
};

void parsegraph_Caret_fitExact(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    parsegraph_Node_setNodeFit(node, parsegraph_NODE_FIT_EXACT);
};

void parsegraph_Caret_fitLoose(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    parsegraph_Node_setNodeFit(node, parsegraph_NODE_FIT_LOOSE);
};

void parsegraph_Caret_label(parsegraph_Caret* caret, const char* text, parsegraph_GlyphAtlas* glyphAtlas, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    if(!glyphAtlas) {
        glyphAtlas = parsegraph_Caret_glyphAtlas(caret);
    }
    parsegraph_Node_setLabelUTF8(node, text, strlen(text), glyphAtlas);
}

void parsegraph_Caret_select(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    parsegraph_Node_setSelected(node, 1);
};

int parsegraph_Caret_selected(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    return parsegraph_Node_isSelected(node);
};

void parsegraph_Caret_deselect(parsegraph_Caret* caret, const char* inDir)
{
    parsegraph_Node* node = parsegraph_Caret_node(caret);
    if(inDir) {
        node = parsegraph_Node_nodeAt(node, parsegraph_readNodeDirection(inDir));
    }
    parsegraph_Node_setSelected(node, 0);
};

parsegraph_Node* parsegraph_Caret_root(parsegraph_Caret* caret)
{
    return caret->_nodeRoot;
};
