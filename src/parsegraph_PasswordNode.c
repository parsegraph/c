#include "parsegraph_PasswordNode.h"
#include <stdlib.h>
#include "graph/initialize.h"
#include "graph/Color.h"

static parsegraph_Style* parsegraph_PASSWORD_STYLE = 0;
static parsegraph_Style* parsegraph_INNER_PASSWORD_STYLE = 0;

static int passwordKeyListener(parsegraph_Node* node, const char* key, void* data)
{
    parsegraph_PasswordNode* pwd = parsegraph_Node_value(node);
    if(pwd->listener && pwd->listener(pwd->listenerThisArg, key)) {
        return 1;
    }
    if(!strcmp(key, "Escape") || !strcmp(key, "Shift") || !strcmp(key, "Control") || !strcmp(key, "Tab") || !strcmp(key, "ArrowUp") || !strcmp(key, "ArrowDown")) {
        return 0;
    }
    if(!strcmp(key, "ArrowLeft")) {
        U8_BACK_1(pwd->password, 0, pwd->pos);
        return 0;
    }
    if(!strcmp(key, "ArrowRight")) {
        U8_FWD_1(pwd->password, pwd->pos, -1);
        return 0;
    }
    /*if(!strcmp(key, "Backspace")) {
        pw = pw.slice(0, pos - 1) + pw.slice(pos);
        pos = Math.max(pos - 1, 0);
       if(last === inner) {
            node.disconnectNode(parsegraph_INWARD);
        }
        else {
            var newLast = last.nodeAt(parsegraph_BACKWARD);
            newLast.disconnectNode(parsegraph_FORWARD);
            last = newLast;
        }
        return 0;
    }
    if(!strcmp(key, "Delete")) {
        pw = pw.slice(0, pos) + pw.slice(pos + 1);
        if(last === inner) {
            node.disconnectNode(parsegraph_INWARD);
        }
        else {
            var newLast = last.nodeAt(parsegraph_BACKWARD);
            newLast.disconnectNode(parsegraph_FORWARD);
            last = newLast;
        }
        return 0;
    }

    pw = pw.slice(0, pos) + key + pw.slice(pos);
    pos += key.length;
    if(last === inner && inner.isRoot()) {
        node.connectNode(parsegraph_INWARD, inner);
        node.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
    }
    else {
        last = last.spawnNode(parsegraph_FORWARD, parsegraph_BLOCK);
        last.setBlockStyle(nbs);
    }
    */
    return 0;
}

static void destroyPassword(void* data, parsegraph_Node* node)
{
    parsegraph_PasswordNode* pwd = parsegraph_Node_value(node);
    parsegraph_Node_setKeyListener(node, 0, 0);
    free(pwd->password);
    free(pwd);
}

parsegraph_Node* parsegraph_PasswordNode_new(apr_pool_t* pool, int maxLength, parsegraph_GlyphAtlas* atlas, int(*listener)(void*, const char*), void* listenerThisArg)
{
    if(!parsegraph_PASSWORD_STYLE) {
        parsegraph_PASSWORD_STYLE = parsegraph_copyStyle(0, parsegraph_BLOCK);
        parsegraph_Color_SetRGBA(parsegraph_PASSWORD_STYLE->backgroundColor, 1, 1, 1, 1);
        parsegraph_Color_SetRGBA(parsegraph_PASSWORD_STYLE->borderColor, .5, .5, .5, 1);
        parsegraph_PASSWORD_STYLE->minWidth = parsegraph_BUD_RADIUS * 80;

    }
    if(!parsegraph_INNER_PASSWORD_STYLE) {
        parsegraph_INNER_PASSWORD_STYLE = parsegraph_copyStyle(0, parsegraph_BUD);
    }
    parsegraph_PasswordNode* pwd;
    pwd = malloc(sizeof(*pwd));
    pwd->atlas = atlas;
    pwd->node = parsegraph_Node_new(pool, parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setBlockStyle(pwd->node, parsegraph_PASSWORD_STYLE);

    pwd->listener = listener;
    pwd->listenerThisArg = listener;
    pwd->pos = 0;
    pwd->password = malloc(maxLength + 1);
    pwd->maxLength = maxLength;
    memset(pwd->password, 0, maxLength + 1);
    parsegraph_Node_setKeyListener(pwd->node, passwordKeyListener, 0);
    parsegraph_Node_setValue(pwd->node, pwd, 1, destroyPassword, 0);

    pwd->inner = parsegraph_Node_new(pool, parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setBlockStyle(pwd->inner, parsegraph_INNER_PASSWORD_STYLE);
    pwd->last = pwd->inner;
    return pwd->node;
}

