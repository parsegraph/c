#ifndef parsegraph_Window_INCLUDED
#define parsegraph_Window_INCLUDED

#include <apr_pools.h>
#define GL_GLEXT_PROTOTYPES
#include <GL/glcorearb.h>
#include <apr_hash.h>

struct parsegraph_WindowBackend{
};
typedef struct parsegraph_WindowBackend parsegraph_WindowBackend;

struct parsegraph_LayoutList;
struct parsegraph_Window {
apr_pool_t* pool;
int _id;
float _backgroundColor[4];
GLuint _framebuffer;
GLuint _renderbuffer;
GLuint _glTexture;
GLuint _program;
void(*_schedulerFunc)(void*, struct parsegraph_Window*);
void* _schedulerFuncThisArg;
apr_hash_t* _shaders;
struct parsegraph_LayoutList* _layoutList;
float _textureSize;
int _focused;
int _isDoubleClick;
int _isDoubleTouch;
int _lastMouseX;
int _lastMouseY;
parsegraph_WindowBackend* _backend;
};
typedef struct parsegraph_Window parsegraph_Window;

#endif // parsegraph_Window_INCLUDED
