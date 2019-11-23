#include "LayoutList.h"
#include "initialize.h"
#include "die.h"
#include "Rect.h"

parsegraph_LayoutList* parsegraph_LayoutList_new(apr_pool_t* pool, int layoutType, parsegraph_LayoutList* parent)
{
    parsegraph_LayoutList* layout = apr_palloc(pool, sizeof(parsegraph_LayoutList));

    layout->pool = pool;
    layout->_type = layoutType;
    layout->_parent = parent;
    layout->_entries = parsegraph_ArrayList_new(layout->pool);

    return layout;
}

void parsegraph_LayoutList_setEntry(parsegraph_LayoutList* list, parsegraph_Component* comp)
{
    if(parsegraph_ArrayList_length(list->_entries) > 0) {
        parsegraph_die("A layout list must not change its entry once set\n");
    }
    parsegraph_ArrayList_push(list->_entries, comp);
}

parsegraph_Component* parsegraph_LayoutList_component(parsegraph_LayoutList* list)
{
    return parsegraph_ArrayList_at(list->_entries, 0);
}

int parsegraph_LayoutList_type(parsegraph_LayoutList* list)
{
    return list->_type;
}

void parsegraph_LayoutList_addWithType(parsegraph_LayoutList* list, parsegraph_Component* comp, int layoutType)
{
    if(layoutType != parsegraph_COMPONENT_LAYOUT_HORIZONTAL && layoutType != parsegraph_COMPONENT_LAYOUT_VERTICAL) {
        parsegraph_die("LayoutList type must be horizontal or vertical when adding with type.\n");
    }
    parsegraph_LayoutList* entry = 0;
    if(list->_type == parsegraph_COMPONENT_LAYOUT_ENTRY) {
        if(list->_parent && layoutType == parsegraph_LayoutList_type(list->_parent)) {
            parsegraph_LayoutList* entry = parsegraph_LayoutList_new(list->pool, parsegraph_COMPONENT_LAYOUT_ENTRY, list->_parent);
            parsegraph_LayoutList_setEntry(entry, comp);
            for(int i = 0; i < parsegraph_ArrayList_length(list->_parent->_entries); ++i) {
                if(parsegraph_ArrayList_at(list->_parent->_entries, i) == list) {
                    parsegraph_ArrayList_insert(list->_parent->_entries, i+1, entry);
                    return;
                }
            }
            parsegraph_die("Failed to insert entry into parent\n");
        }
        //parsegraph_log("Changing list from entry");
        list->_type = layoutType;
        parsegraph_LayoutList* firstEntry = parsegraph_LayoutList_new(list->pool, parsegraph_COMPONENT_LAYOUT_ENTRY, list);
        parsegraph_LayoutList_setEntry(firstEntry, parsegraph_LayoutList_component(list));
        entry = parsegraph_LayoutList_new(list->pool, parsegraph_COMPONENT_LAYOUT_ENTRY, list);
        parsegraph_LayoutList_setEntry(entry, comp);
        parsegraph_ArrayList_replace(list->_entries, 0, firstEntry);
        parsegraph_ArrayList_push(list->_entries, entry);
        return;
    }
    if(list->_type == layoutType
        || (parsegraph_ArrayList_length(list->_entries) == 0)
        || (parsegraph_ArrayList_length(list->_entries) == 1 && parsegraph_LayoutList_type(parsegraph_ArrayList_at(list->_entries, 0)) == parsegraph_COMPONENT_LAYOUT_ENTRY)
    ) {
        //parsegraph_log("Repurposing list\n");
        list->_type = layoutType;
        entry = parsegraph_LayoutList_new(list->pool, parsegraph_COMPONENT_LAYOUT_ENTRY, list);
        parsegraph_LayoutList_setEntry(entry, comp);
        parsegraph_ArrayList_push(list->_entries, entry);
    }
    else {
        //parsegraph_log("Creating nested list\n");
        parsegraph_LayoutList* firstEntry = parsegraph_LayoutList_new(list->pool, layoutType, list);
        parsegraph_LayoutList_addWithType(firstEntry, comp, layoutType);
        parsegraph_ArrayList_push(list->_entries, firstEntry);
    }
}

void parsegraph_LayoutList_addVertical(parsegraph_LayoutList* list, parsegraph_Component* comp)
{
    parsegraph_LayoutList_addWithType(list, comp, parsegraph_COMPONENT_LAYOUT_VERTICAL);
}

void parsegraph_LayoutList_addHorizontal(parsegraph_LayoutList* list, parsegraph_Component* comp)
{
    parsegraph_LayoutList_addWithType(list, comp, parsegraph_COMPONENT_LAYOUT_HORIZONTAL);
}

int parsegraph_LayoutList_forEach(parsegraph_LayoutList* list, int(*func)(void*, parsegraph_Component*, float*), void* funcThisArg, float* compSize)
{
    if(list->_type == parsegraph_COMPONENT_LAYOUT_ENTRY) {
        return func(funcThisArg, parsegraph_LayoutList_component(list), compSize);
    }
    float entrySize[4];
    if(compSize) {
        parsegraph_Rect_copyFrom(entrySize, compSize);
    }
    for(int i = 0; i < parsegraph_ArrayList_length(list->_entries); ++i) {
        if(compSize) {
            if(list->_type == parsegraph_COMPONENT_LAYOUT_HORIZONTAL) {
                parsegraph_Rect_setWidth(entrySize, parsegraph_Rect_width(compSize)/parsegraph_ArrayList_length(list->_entries));
                parsegraph_Rect_setX(entrySize, parsegraph_Rect_x(compSize)+i*parsegraph_Rect_width(entrySize));
            }
            else {
                parsegraph_Rect_setHeight(entrySize, parsegraph_Rect_height(compSize)/parsegraph_ArrayList_length(list->_entries));
                parsegraph_Rect_setX(entrySize, parsegraph_Rect_y(compSize)+(parsegraph_ArrayList_length(list->_entries)-1-i)*parsegraph_Rect_height(entrySize));
            }
        }
        parsegraph_LayoutList* entry = parsegraph_ArrayList_at(list->_entries, i);
        if(parsegraph_LayoutList_forEach(entry, func, funcThisArg, compSize ? entrySize : 0)) {
            return 1;
        }
    }
    return 0;
}

int parsegraph_LayoutList_isEmpty(parsegraph_LayoutList* list)
{
    return parsegraph_ArrayList_length(list->_entries) == 0;
}

struct LayoutListSearch {
parsegraph_Component* found;
parsegraph_Component* target;
int flag;
};

static int findPrevious(void* data, parsegraph_Component* comp, float* entrySize)
{
    struct LayoutListSearch* search = data;
    if(comp == search->target) {
        return 1;
    }
    search->found = comp;
    return 0;
}

parsegraph_Component* parsegraph_LayoutList_getPrevious(parsegraph_LayoutList* list, parsegraph_Component* target)
{
    struct LayoutListSearch search;
    search.found = 0;
    search.target = target;
    if(parsegraph_LayoutList_forEach(list, findPrevious, &search, 0)) {
        return search.found;
    }
    return 0;
}

static int findNext(void* data, parsegraph_Component* comp, float* entrySize)
{
    struct LayoutListSearch* search = data;
    if(search->flag) {
        search->found = comp;
        return 1;
    }
    if(search->target == comp) {
        search->flag = 1;
    }
    return 0;
}

parsegraph_Component* parsegraph_LayoutList_getNext(parsegraph_LayoutList* list, parsegraph_Component* target)
{
    struct LayoutListSearch search;
    search.target = target;
    search.found = 0;
    search.flag = 0;
    if(parsegraph_LayoutList_forEach(list, findNext, &search, 0)) {
        return search.found;
    }
    return 0;
}

int parsegraph_LayoutList_remove(parsegraph_LayoutList* list, parsegraph_Component* comp)
{
    if(list->_type == parsegraph_COMPONENT_LAYOUT_ENTRY) {
        parsegraph_die("A LayoutList entry cannot remove itself\n");
    }
    for(int i = 0; i < parsegraph_ArrayList_length(list->_entries); ++i) {
        parsegraph_LayoutList* entry = parsegraph_ArrayList_at(list->_entries, i);
        if(parsegraph_LayoutList_type(entry) == parsegraph_COMPONENT_LAYOUT_ENTRY) {
            if(parsegraph_LayoutList_component(entry) == comp) {
                parsegraph_ArrayList_splice(list->_entries, i, 1);
                return 1;
            }
        }
        else {
            if(parsegraph_LayoutList_remove(entry, comp)) {
                if(parsegraph_LayoutList_isEmpty(entry)) {
                    parsegraph_ArrayList_splice(list->_entries, i, 1);
                }
                return 1;
            }
        }
    }
    return 0;
}

parsegraph_LayoutList* parsegraph_LayoutList_contains(parsegraph_LayoutList* list, parsegraph_Component* comp)
{
    if(list->_type == parsegraph_COMPONENT_LAYOUT_ENTRY) {
        return parsegraph_LayoutList_component(list) == comp ? list : 0;
    }
    for(int i = 0; i < parsegraph_ArrayList_length(list->_entries); ++i) {
        parsegraph_LayoutList* entry = parsegraph_ArrayList_at(list->_entries, i);
        parsegraph_LayoutList* found = parsegraph_LayoutList_contains(entry, comp);
        if(found) {
            return found;
        }
    }
    return 0;
}

int parsegraph_LayoutList_count(parsegraph_LayoutList* list)
{
    if(list->_type == parsegraph_COMPONENT_LAYOUT_ENTRY) {
        return parsegraph_LayoutList_component(list) ? 1 : 0;
    }
    int c = 0;
    for(int i = 0; i < parsegraph_ArrayList_length(list->_entries); ++i) {
        parsegraph_LayoutList* entry = parsegraph_ArrayList_at(list->_entries, i);
        c += parsegraph_LayoutList_count(entry);
    }
    return c;
}
