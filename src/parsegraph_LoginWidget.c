#include "parsegraph_LoginWidget.h"
#include "graph/Color.h"
#include "graph/Caret.h"
#include "graph/Input.h"
#include "graph/log.h"
#include "graph/NodeAlignment.h"
#include "parsegraph_PasswordNode.h"

#define parsegraph_LoginWidget_USERNAME_MAX 255
#define parsegraph_LoginWidget_PASSWORD_MAX 255

void parsegraph_UserLogin_init(parsegraph_UserLogin* userLogin)
{
    userLogin->selector = 0;
    userLogin->token = 0;
    userLogin->userId = -1;
    userLogin->username = "";
}

parsegraph_LoginWidget* parsegraph_LoginWidget_new(parsegraph_Surface* surface, parsegraph_Graph* graph)
{
    apr_pool_t* pool;
    apr_pool_create(&pool, surface->pool);
    parsegraph_LoginWidget* widget;
    widget = apr_palloc(surface->pool, sizeof(*widget));
    widget->pool = pool;
    widget->_graph = graph;
    widget->_surface = surface;
    widget->_root = 0;

    widget->_containerNode = 0;
    widget->_authenticateForm = 0;
    widget->_rememberCheck = 0;
    widget->_createUserButton = 0;
    widget->_leaveButton = 0;
    widget->_loginButton = 0;
    widget->_loginForm = 0;
    widget->_usernameField = 0;
    widget->_passwordField = 0;
    widget->_loggedInForm = 0;

    widget->_loginListener = 0;
    widget->_loginListenerThisArg = 0;
    widget->_logoutListener = 0;
    widget->_logoutListenerThisArg = 0;

    parsegraph_UserLogin_init(&widget->_userLogin);

    widget->_bbs = parsegraph_copyStyle(pool, parsegraph_BLOCK);
    parsegraph_Color_SetRGBA(widget->_bbs->backgroundColor, 1, 1, .5, 1);
    parsegraph_Color_SetRGBA(widget->_bbs->borderColor, .5, .5, 0, 1);

    widget->_nbs = parsegraph_copyStyle(pool, parsegraph_BLOCK);
    parsegraph_Color_SetRGBA(widget->_nbs->backgroundColor, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(widget->_nbs->borderColor, .5, .5, .5, 1);
    widget->_nbs->minWidth = parsegraph_BUD_RADIUS * 80;

    widget->_cbs = parsegraph_copyStyle(pool, parsegraph_BUD);
    parsegraph_Color_SetRGBA(widget->_cbs->backgroundColor, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(widget->_cbs->borderColor, .5, .5, .5, 1);
    parsegraph_Color_copy(widget->_cbs->selectedBackgroundColor, widget->_cbs->backgroundColor);
    parsegraph_Color_copy(widget->_cbs->selectedBorderColor, widget->_cbs->borderColor);

    widget->_scbs = parsegraph_copyStyle(pool, parsegraph_BUD);
    parsegraph_Color_SetRGBA(widget->_scbs->backgroundColor, .3, 1, .3, 1);
    parsegraph_Color_SetRGBA(widget->_scbs->borderColor, .5, .5, .5, 1);
    parsegraph_Color_copy(widget->_scbs->selectedBackgroundColor, widget->_scbs->backgroundColor);
    parsegraph_Color_copy(widget->_scbs->selectedBorderColor, widget->_scbs->borderColor);

    return widget;
}

static void onAuthenticate(void* data, parsegraph_LoginResult* res)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_LoginWidget_onAuthenticate(widget, res);
}

void parsegraph_authenticate(parsegraph_UserLogin* userLogin, void(*onAuthenticate)(void*, parsegraph_LoginResult*), void* data)
{
    parsegraph_LoginResult res;
    res.succeeded = 1;
    res.message = 0;
    onAuthenticate(data, &res);
}

void parsegraph_LoginWidget_authenticate(parsegraph_LoginWidget* widget)
{
    parsegraph_authenticate(&widget->_userLogin, onAuthenticate, widget);
    //parsegraph_later(function() {
        //this.onAuthenticate.call(this, true, {username:"dafrito"});
    //}, this);
    //parsegraph_authenticate(this.onAuthenticate, this);
    //if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
        //parsegraph_authenticate(this.onAuthenticate, this);
    //}
}

void parsegraph_LoginWidget_logout(parsegraph_LoginWidget* widget)
{
    //parsegraph_endUserLogin(widget->onLogout, widget);
}

void parsegraph_LoginWidget_onLogout(parsegraph_LoginWidget* widget, parsegraph_LoginResult* result)
{
    if(!result->succeeded) {
        //parsegraph_log("Logout failed: %s\n", result->message);
    }
    if(widget->_logoutListener) {
        widget->_logoutListener(widget->_logoutListenerThisArg, result, widget->_containerNode);
    }
    parsegraph_Node_disconnectNode(widget->_containerNode, parsegraph_DOWNWARD);
}

static void onLogin(void* data, parsegraph_LoginResult* res, parsegraph_UserLogin* userLogin)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_LoginWidget_onLogin(widget, res);
}

void parsegraph_beginUserLogin(const char* username, const char* password, int remember, void(*onLogin)(void*, parsegraph_LoginResult*, parsegraph_UserLogin*), void* data, parsegraph_UserLogin* userLogin)
{
    parsegraph_LoginResult res;
    res.succeeded = 1;
    res.message = 0;
    onLogin(data, &res, userLogin);
}

void parsegraph_LoginWidget_login(parsegraph_LoginWidget* widget)
{
    //parsegraph_log(new Error("Logging in"));
    char username[parsegraph_LoginWidget_USERNAME_MAX];
    parsegraph_Node_labelUTF8(widget->_usernameField, username, parsegraph_LoginWidget_USERNAME_MAX);
    const char* password = parsegraph_Node_value(widget->_passwordField);
    parsegraph_beginUserLogin(username, password, parsegraph_LoginWidget_isRemembering(widget), onLogin, widget, &widget->_userLogin);
}

void parsegraph_createNewUser(const char* username, const char* password, void(*onLogin)(void*, parsegraph_LoginResult*, parsegraph_UserLogin*), void* data, parsegraph_UserLogin* userLogin)
{
    parsegraph_LoginResult res;
    res.succeeded = 1;
    res.message = 0;
    onLogin(data, &res, userLogin);
}

// Create new user.
void parsegraph_LoginWidget_createNewUser(parsegraph_LoginWidget* widget)
{
    char username[parsegraph_LoginWidget_USERNAME_MAX];
    parsegraph_Node_labelUTF8(widget->_usernameField, username, parsegraph_LoginWidget_USERNAME_MAX);
    const char* password = parsegraph_Node_value(widget->_passwordField);
    parsegraph_createNewUser(username, password, onLogin, widget, &widget->_userLogin);
}

void parsegraph_LoginWidget_setLoginListener(parsegraph_LoginWidget* widget, void(*listener)(void*, parsegraph_LoginResult*, parsegraph_UserLogin*, parsegraph_Node*), void* listenerThisArg)
{
    if(!listenerThisArg) {
        listenerThisArg = widget;
    }
    widget->_loginListener = listener;
    widget->_loginListenerThisArg = listenerThisArg;
}

void parsegraph_LoginWidget_setLogoutListener(parsegraph_LoginWidget* widget, void(*listener)(void*, parsegraph_LoginResult*, parsegraph_Node*), void* listenerThisArg)
{
    if(!listenerThisArg) {
        listenerThisArg = widget;
    }
    widget->_logoutListener = listener;
    widget->_logoutListenerThisArg = listenerThisArg;
}

void parsegraph_LoginWidget_onLogin(parsegraph_LoginWidget* widget, parsegraph_LoginResult* res)
{
    //parsegraph_log(new Error("onLogin"), res, userLogin);
    if(res->succeeded) {
        widget->_loginForm = 0;

        parsegraph_Node_disconnectNode(widget->_containerNode, parsegraph_INWARD);
        parsegraph_Node* resNode = parsegraph_LoginWidget_loggedInForm(widget);
        parsegraph_Node_setLabelUTF8(resNode, widget->_userLogin.username, -1, parsegraph_Graph_glyphAtlas(widget->_graph));
        parsegraph_Node_connectNode(widget->_containerNode, parsegraph_INWARD, resNode);

        /*if(localStorage.getItem("parsegraph_LoginWidget_remember") !== null) {
            localStorage.setItem("parsegraph_LoginWidget_remember", userLogin.username);
        }*/

        if(widget->_loginListener) {
            return widget->_loginListener(widget->_loginListenerThisArg, res, &widget->_userLogin, widget->_containerNode);
        }
    }
    else {
        parsegraph_Node_disconnectNode(widget->_containerNode, parsegraph_DOWNWARD);
        parsegraph_Node* resNode = 0;
        resNode = parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0);
        parsegraph_Node_setLabelUTF8(resNode, res->message, -1, parsegraph_Graph_glyphAtlas(widget->_graph));
        parsegraph_Node_connectNode(widget->_containerNode, parsegraph_DOWNWARD, resNode);
    }
    parsegraph_Input_setFocusedNode(parsegraph_Graph_input(widget->_graph), 0);
    parsegraph_Graph_scheduleRepaint(widget->_graph);
}

static void toggleFullScreen()
{
/*    var doc = window.document;
    var docEl = this._surface._canvas;

    var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
    requestFullScreen.call(docEl);
    }
    else {
    cancelFullScreen.call(doc);
    }
*/
}

static void loginAction(void* data)
{
    //parsegraph_LoginWidget* widget = data;
}

static void leaveAction(void* data)
{
    //parsegraph_LoginWidget* widget = data;
}

static void logoutAction(void* data)
{
    //parsegraph_LoginWidget* widget = data;
}

static void createNewUserAction(void* data)
{
    //parsegraph_LoginWidget* widget = data;
}

static int leave(parsegraph_Node* node, const char* keyOrButton, void* data)
{
    leaveAction(data);
    return 0;
}

static int logout(parsegraph_Node* node, const char* keyOrButton, void* data)
{
    logoutAction(data);
    return 0;
}

static int login(parsegraph_Node* node, const char* keyOrButton, void* data)
{
    loginAction(data);
    return 0;
}

static int createNewUser(parsegraph_Node* node, const char* keyOrButton, void* data)
{
    createNewUserAction(data);
    return 0;
}

static int rootClick(parsegraph_Node* node, const char* button, void* data)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_Carousel* carousel = parsegraph_Graph_carousel(widget->_graph);
    parsegraph_Carousel_clearCarousel(carousel);
    parsegraph_Carousel_moveCarousel(carousel,
        parsegraph_Node_absoluteX(node),
        parsegraph_Node_absoluteY(node)
    );
    parsegraph_Carousel_showCarousel(carousel);

    // Action actionNode, infoDescription, actionFunc, actionFuncThisArg
    parsegraph_Node* actionNode = parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0);
    parsegraph_GlyphAtlas* atlas = parsegraph_LoginWidget_glyphAtlas(widget);
    parsegraph_Node_setLabelUTF8(actionNode, "Leave", -1, atlas);
    parsegraph_Carousel_addToCarousel(carousel, actionNode, leaveAction, widget);
    actionNode = parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setLabelUTF8(actionNode, "Log out", -1, atlas);
    parsegraph_Carousel_addToCarousel(carousel, actionNode, logoutAction, widget);

    actionNode = parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0);
    parsegraph_Node_setLabelUTF8(actionNode, "Fullscreen", -1, atlas);
    parsegraph_Carousel_addToCarousel(carousel, actionNode, toggleFullScreen, widget);
    parsegraph_Carousel_scheduleCarouselRepaint(carousel);
    return 0;
}

parsegraph_Node* parsegraph_LoginWidget_loggedInForm(parsegraph_LoginWidget* widget)
{
    if(widget->_loggedInForm) {
        return widget->_loggedInForm;
    }

    parsegraph_Caret* car = parsegraph_Caret_new(widget->_surface, parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0));
    parsegraph_Caret_setGlyphAtlas(car, parsegraph_Graph_glyphAtlas(widget->_graph));

    parsegraph_Node_setClickListener(parsegraph_Caret_root(car), rootClick, widget);

    widget->_loggedInForm = parsegraph_Caret_root(car);

    return widget->_loggedInForm;
}

void parsegraph_LoginWidget_leave(parsegraph_LoginWidget* widget)
{
    parsegraph_log("LEAVE NOT IMPLEMENTED\n");
    //window.location = "/";
}

parsegraph_Graph* parsegraph_LoginWidget_graph(parsegraph_LoginWidget* widget)
{
    return widget->_graph;
}

void parsegraph_LoginWidget_onAuthenticate(parsegraph_LoginWidget* widget, parsegraph_LoginResult* res)
{
    parsegraph_Node* resNode = 0;
    if(res->succeeded) {
        parsegraph_Node_disconnectNode(widget->_containerNode, parsegraph_INWARD);
        resNode = parsegraph_LoginWidget_loggedInForm(widget);
        parsegraph_Node_setLabelUTF8(resNode, widget->_userLogin.username, -1, parsegraph_Graph_glyphAtlas(widget->_graph));
        parsegraph_Node_connectNode(widget->_containerNode, parsegraph_INWARD, resNode);
        parsegraph_Input_setFocusedNode(parsegraph_Graph_input(widget->_graph), 0);

        /*if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            localStorage.setItem("parsegraph_LoginWidget_remember", widget->userLogin->username);
        }*/
        if(widget->_loginListener) {
            widget->_loginListener(widget->_loginListenerThisArg, res, &widget->_userLogin, widget->_containerNode);
        }
    }
    else {
        //localStorage.removeItem("parsegraph_LoginWidget_remember");
        parsegraph_Node_disconnectNode(widget->_containerNode, parsegraph_DOWNWARD);
        resNode = parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0);
        parsegraph_Node_setLabelUTF8(resNode, res->message, -1, parsegraph_Graph_glyphAtlas(widget->_graph));
        parsegraph_Node_connectNode(widget->_containerNode, parsegraph_DOWNWARD, resNode);
    }
    parsegraph_Graph_scheduleRepaint(widget->_graph);
}

parsegraph_GlyphAtlas* parsegraph_LoginWidget_glyphAtlas(parsegraph_LoginWidget* widget)
{
    return parsegraph_Graph_glyphAtlas(widget->_graph);
}

void parsegraph_LoginWidget_setTitle(parsegraph_LoginWidget* widget, const char* title)
{
    widget->_title = title;
}

const char* parsegraph_LoginWidget_title(parsegraph_LoginWidget* widget)
{
    return widget->_title;
}

parsegraph_Node* parsegraph_LoginWidget_root(parsegraph_LoginWidget* widget)
{
    if(!widget->_root) {
        parsegraph_Caret* car = parsegraph_Caret_new(widget->_surface, parsegraph_Node_new(widget->pool, parsegraph_SLOT, 0, 0));
        parsegraph_Caret_setGlyphAtlas(car, parsegraph_LoginWidget_glyphAtlas(widget));
        parsegraph_Caret_label(car, parsegraph_LoginWidget_title(widget), parsegraph_LoginWidget_glyphAtlas(widget), 0);
        widget->_containerNode = parsegraph_Caret_root(car);
        parsegraph_Node_setIgnoreMouse(widget->_containerNode, 1);
        //if(localStorage.getItem("parsegraph_LoginWidget_remember")) {
            parsegraph_Node_connectNode(widget->_containerNode, parsegraph_INWARD, parsegraph_LoginWidget_authenticateForm(widget));
            parsegraph_Node_setNodeAlignmentMode(widget->_containerNode, parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        //}
        //else {
            //this._containerNode.connectNode(parsegraph_INWARD, this.loginForm());
            //this._containerNode.setNodeAlignmentMode(parsegraph_INWARD, parsegraph_ALIGN_VERTICAL);
        //}
        widget->_root = parsegraph_Caret_root(car);
        parsegraph_Caret_destroy(car);
    }
    return widget->_root;
}

static int authenticate(parsegraph_Node* node, const char* button, void* data)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_LoginWidget_authenticate(widget);
    return 0;
}

parsegraph_Node* parsegraph_LoginWidget_authenticateForm(parsegraph_LoginWidget* widget)
{
    if(widget->_authenticateForm) {
        return widget->_authenticateForm;
    }

    parsegraph_Caret* car = parsegraph_Caret_new(widget->_surface, parsegraph_Node_new(widget->pool, parsegraph_BLOCK, 0, 0));
    parsegraph_Caret_setGlyphAtlas(car, parsegraph_LoginWidget_glyphAtlas(widget));
    /*var remembered = "1"; // localStorage.getItem("parsegraph_LoginWidget_remember");
    if(remembered != "1" && remembered != "0") {
        car.label(remembered);
    }
    else {*/
        parsegraph_Caret_label(car, "Authenticate", parsegraph_LoginWidget_glyphAtlas(widget), 0);
    //}
    parsegraph_Node* n = parsegraph_Caret_node(car);
    parsegraph_Node_setKeyListener(n, authenticate, widget);
    parsegraph_Node_setClickListener(n, authenticate, widget);
    widget->_authenticateForm = parsegraph_Caret_root(car);

    return widget->_authenticateForm;
}

static int focusUsername(parsegraph_Node* node, const char* button, void* data)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_Input_setFocusedNode(parsegraph_Graph_input(widget->_graph), widget->_usernameField);
    return 1;
}

static int passwordKey(void* data, const char* key)
{
    parsegraph_LoginWidget* widget = data;
    if(!strcmp(key, "ArrowLeft") || !strcmp(key, "ArrowRight") || !strcmp(key, "ArrowUp") || !strcmp(key, "ArrowDown")) {
        return 0;
    }
    parsegraph_Graph_scheduleRepaint(widget->_graph);
    if(!strcmp(key, "Enter")) {
        parsegraph_LoginWidget_login(widget);
        return 1;
    }
    return 0;
}

static int toggleRememberKey(parsegraph_Node* node, const char* key, void* data)
{
    parsegraph_LoginWidget* widget = data;
    if(!strcmp(key, "Enter") || !strcmp(key, " ")) {
        parsegraph_LoginWidget_toggleRemember(widget);
    }
    return 0;
}

static int toggleRememberClick(parsegraph_Node* node, const char* button, void* data)
{
    parsegraph_LoginWidget* widget = data;
    parsegraph_LoginWidget_toggleRemember(widget);
    return 0;
}

parsegraph_Node* parsegraph_LoginWidget_loginForm(parsegraph_LoginWidget* widget)
{
    if(widget->_loginForm) {
        return widget->_loginForm;
    }

    parsegraph_Style* nbs = parsegraph_copyStyle(widget->pool, parsegraph_BLOCK);
    parsegraph_Color_SetRGBA(nbs->backgroundColor, 1, 1, 1, 1);
    parsegraph_Color_SetRGBA(nbs->borderColor, .5, .5, .5, 1);
    nbs->minWidth = parsegraph_BUD_RADIUS * 80;

    parsegraph_Caret* car = parsegraph_Caret_new(widget->_surface, parsegraph_Node_new(widget->pool, parsegraph_BUD, 0, 0));
    parsegraph_GlyphAtlas* atlas = parsegraph_LoginWidget_glyphAtlas(widget);
    parsegraph_Caret_setGlyphAtlas(car, atlas);

    widget->_loginForm = parsegraph_Caret_root(car);
    parsegraph_Caret_spawnMove(car, "b", "b", 0);
    parsegraph_Caret_label(car, "Username", 0, 0);
    parsegraph_Node_setClickListener(parsegraph_Caret_node(car), focusUsername, widget);
    parsegraph_Caret_move(car, "f");
    parsegraph_Caret_pull(car, "b");
    widget->_usernameField  = parsegraph_Caret_spawnMove(car, "f", "b", 0);
    parsegraph_Node* tf = parsegraph_Caret_node(car);
    parsegraph_Node_setBlockStyle(tf, nbs);
    parsegraph_Node_labelUTF8(tf, "", 0);
    parsegraph_Label_setEditable(parsegraph_Node_realLabel(tf), 1);
    parsegraph_Caret_move(car, "b");

    parsegraph_Caret_spawnMove(car, "d", "bu", 0);
    parsegraph_Caret_spawnMove(car, "b", "b", 0);
    parsegraph_Caret_label(car, "Password", atlas, 0);
    parsegraph_Caret_move(car, "f");
    widget->_passwordField = parsegraph_Caret_connect(car, "f", parsegraph_PasswordNode_new(
        widget->pool, parsegraph_LoginWidget_PASSWORD_MAX, atlas, passwordKey, widget
    ));

    parsegraph_Caret_spawnMove(car, "d", "bu", 0);
    parsegraph_Caret_push(car);

    widget->_rememberCheck = parsegraph_Caret_spawnMove(car, "f", "bu", 0);
    parsegraph_Node_setBlockStyle(widget->_rememberCheck, widget->_cbs);
    parsegraph_Node_setClickListener(widget->_rememberCheck, toggleRememberClick, widget);
    parsegraph_Node_setKeyListener(widget->_rememberCheck, toggleRememberKey, widget);

    parsegraph_Caret_pull(car, "f");
    parsegraph_Caret_spawnMove(car, "f", "b", 0);
    parsegraph_Caret_label(car, "Remember log in", atlas, 0);
    parsegraph_Node_setClickListener(parsegraph_Caret_node(car), toggleRememberClick, widget);
    parsegraph_Caret_pop(car);

    parsegraph_Caret_spawnMove(car, "d", "u", 0);
    widget->_leaveButton = parsegraph_Caret_spawnMove(car, "b", "b", 0);
    parsegraph_Node_setBlockStyle(widget->_leaveButton, widget->_bbs);
    parsegraph_Caret_label(car, "Leave", atlas, 0);
    parsegraph_Node_setClickListener(widget->_leaveButton, leave, widget);
    parsegraph_Node_setKeyListener(widget->_leaveButton, leave, widget);
    parsegraph_Caret_move(car, "f");

    widget->_loginButton = parsegraph_Caret_spawnMove(car, "f", "b", 0);
    parsegraph_Node_setBlockStyle(widget->_loginButton, widget->_bbs);
    parsegraph_Caret_label(car, "Log in", atlas, 0);
    parsegraph_Node_setClickListener(widget->_loginButton, login, widget);
    parsegraph_Node_setKeyListener(widget->_loginButton, login, widget);

    widget->_createUserButton = parsegraph_Caret_spawnMove(car, "f", "b", 0);
    parsegraph_Node_setBlockStyle(widget->_createUserButton, widget->_bbs);
    parsegraph_Caret_label(car, "Create user", atlas, 0);
    parsegraph_Node_setClickListener(widget->_loginButton, createNewUser, widget);
    parsegraph_Node_setKeyListener(widget->_loginButton, createNewUser, widget);

    parsegraph_chainAllTabs(widget->pool,
        widget->_usernameField, widget->_passwordField, widget->_rememberCheck,
        widget->_loginButton, widget->_createUserButton, 0
    );

    return widget->_loginForm;
}

int parsegraph_LoginWidget_isRemembering(parsegraph_LoginWidget* widget)
{
    return parsegraph_Node_blockStyle(widget->_rememberCheck) == widget->_scbs;
}

void parsegraph_LoginWidget_toggleRemember(parsegraph_LoginWidget* widget)
{
    parsegraph_Node_setBlockStyle(
        widget->_rememberCheck,
        parsegraph_LoginWidget_isRemembering(widget) ? widget->_cbs : widget->_scbs
    );
    if(parsegraph_LoginWidget_isRemembering(widget)) {
        //localStorage.setItem("parsegraph_LoginWidget_remember", "1");
    }
    else {
        //localStorage.removeItem("parsegraph_LoginWidget_remember");
    }
    parsegraph_Graph_scheduleRepaint(widget->_graph);
}

void parsegraph_LoginWidget_destroy(parsegraph_LoginWidget* widget)
{
    apr_pool_destroy(widget->pool);
}
