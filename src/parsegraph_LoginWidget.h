#ifndef parsegraph_LoginWidget_INCLUDED
#define parsegraph_LoginWidget_INCLUDED
#include "graph/Surface.h"
#include "graph/Graph.h"
#include "graph/initialize.h"
#include <apr_pools.h>

struct parsegraph_LoginResult {
int succeeded;
const char* message;
};
typedef struct parsegraph_LoginResult parsegraph_LoginResult;

struct parsegraph_UserLogin {
const char* selector;
const char* token;
int userId;
const char* username;
};
typedef struct parsegraph_UserLogin parsegraph_UserLogin;

void parsegraph_UserLogin_init(parsegraph_UserLogin* userLogin);

struct parsegraph_LoginWidget {
apr_pool_t* pool;
parsegraph_Graph* _graph;
parsegraph_Surface* _surface;
parsegraph_UserLogin _userLogin;
const char* _title;
parsegraph_Node* _root;
void(*_loginListener)(void*, parsegraph_LoginResult*, parsegraph_UserLogin*, parsegraph_Node*);
void* _loginListenerThisArg;
void(*_logoutListener)(void*, parsegraph_LoginResult*, parsegraph_Node*);
void* _logoutListenerThisArg;
parsegraph_Node* _containerNode;
parsegraph_Node* _authenticateForm;
parsegraph_Node* _rememberCheck;
parsegraph_Node* _createUserButton;
parsegraph_Node* _leaveButton;
parsegraph_Node* _loginButton;
parsegraph_Node* _loginForm;
parsegraph_Node* _usernameField;
parsegraph_Node* _passwordField;
parsegraph_Node* _loggedInForm;
parsegraph_Style* _bbs;
parsegraph_Style* _nbs;
parsegraph_Style* _cbs;
parsegraph_Style* _scbs;
};
typedef struct parsegraph_LoginWidget parsegraph_LoginWidget;

parsegraph_LoginWidget* parsegraph_LoginWidget_new(parsegraph_Surface* surface, parsegraph_Graph* graph);
void parsegraph_LoginWidget_authenticate(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_logout(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_onLogout(parsegraph_LoginWidget* widget, parsegraph_LoginResult* result);
void parsegraph_LoginWidget_login(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_createNewUser(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_setLoginListener(parsegraph_LoginWidget* widget, void(*listener)(void*, parsegraph_LoginResult*, parsegraph_UserLogin*, parsegraph_Node*), void* listenerThisArg);
void parsegraph_LoginWidget_setLogoutListener(parsegraph_LoginWidget* widget, void(*listener)(void*, parsegraph_LoginResult*, parsegraph_Node*), void* listenerThisArg);
void parsegraph_LoginWidget_onLogin(parsegraph_LoginWidget* widget, parsegraph_LoginResult* result);
int parsegraph_LoginWidget_isRemembering(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_toggleRemember(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_setTitle(parsegraph_LoginWidget* widget, const char* guid);
parsegraph_Node* parsegraph_LoginWidget_root(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_destroy(parsegraph_LoginWidget* widget);
parsegraph_Node* parsegraph_LoginWidget_loggedInForm(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_leave(parsegraph_LoginWidget* widget);
parsegraph_Graph* parsegraph_LoginWidget_graph(parsegraph_LoginWidget* widget);
void parsegraph_LoginWidget_onAuthenticate(parsegraph_LoginWidget* widget, parsegraph_LoginResult* res);
parsegraph_GlyphAtlas* parsegraph_LoginWidget_glyphAtlas(parsegraph_LoginWidget* widget);
parsegraph_Node* parsegraph_LoginWidget_authenticateForm(parsegraph_LoginWidget* widget);

#endif // parsegraph_LoginWidget_INCLUDED
