/*
 * Copyright © 2011 Kristian Høgsberg
 * Copyright © 2011 Benjamin Franzke
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that copyright
 * notice and this permission notice appear in supporting documentation, and
 * that the name of the copyright holders not be used in advertising or
 * publicity pertaining to distribution of the software without specific,
 * written prior permission.  The copyright holders make no representations
 * about the suitability of this software for any purpose.  It is provided "as
 * is" without express or implied warranty.
 *
 * THE COPYRIGHT HOLDERS DISCLAIM ALL WARRANTIES WITH REGARD TO THIS SOFTWARE,
 * INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS, IN NO
 * EVENT SHALL THE COPYRIGHT HOLDERS BE LIABLE FOR ANY SPECIAL, INDIRECT OR
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
 * DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 * TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
 * OF THIS SOFTWARE.
 */

#include <stdio.h>
#include <apr_pools.h>
#include <stdlib.h>
#define EGL_EGLEXT_PROTOTYPES
#define GL_GLEXT_PROTOTYPES
#include <gbm.h>
#include <GL/gl.h>
#include <EGL/egl.h>
#include <EGL/eglext.h>
#include <drm.h>
#include <xf86drm.h>
#include <xf86drmMode.h>
#include <fcntl.h>
#include <signal.h>
#include <unistd.h>
#include <string.h>
#include <time.h>
#include <cairo.h>
#include <libudev.h>
#include <libinput.h>
#include <libevdev/libevdev.h>
#include <ncurses.h>
#include <stdarg.h>
#include "graph/log.h"
#include "graph/Surface.h"
#include "graph/Input.h"
#include "die.h"
#include "timing.h"
#include <apr_hash.h>

#define parsegraph_NCURSES

// This function must be defined by applications; it is not defined here.
parsegraph_Surface* init(void*, int, int);

static volatile int quit = 0;

struct parsegraph_Framebuffer {
uint32_t drm_fb;
GLuint fb;
GLuint color_rb;
struct gbm_bo* bo;
EGLImage image;
GLuint depth_rb;
int needsRender;
};
typedef struct parsegraph_Framebuffer parsegraph_Framebuffer;

struct parsegraph_Environment;
struct parsegraph_Display {
struct parsegraph_Environment* env;
drmModeConnector *connector;

drmModeModeInfo mode;
drmModeCrtcPtr saved_crtc;
int crtc;
struct parsegraph_Display* next_display;
int frames;
int front_fb;
parsegraph_Framebuffer framebuffers[2];
int width;
int height;
char color[3];
int color_up[3];
};
typedef struct parsegraph_Display parsegraph_Display;

struct parsegraph_Environment {
apr_pool_t* pool;
parsegraph_Surface* surface;
int needInit;
int needToFocus;
int needToBlur;
parsegraph_Input* input;
struct libinput* libinput;
EGLDisplay dpy;
EGLContext ctx;
struct gbm_device *gbm;
struct udev* udev;
int drm_fd;
struct timespec start;
apr_hash_t* keyNames;
parsegraph_Display* first_display;
parsegraph_Display* last_display;
};
typedef struct parsegraph_Environment parsegraph_Environment;

#ifdef GL_OES_EGL_image
static PFNGLEGLIMAGETARGETRENDERBUFFERSTORAGEOESPROC glEGLImageTargetRenderbufferStorageOES_func;
#endif

static const char device_name[] = "/dev/dri/card0";

static char next_color(int* up, char cur, unsigned int mod)
{
	char next;

	next = cur + (*up == 1 ? 1 : -1) * (rand() % mod);
	if ((*up == 1 && next < cur) || (*up == 0 && next > cur)) {
		*up = *up == 1 ? 0 : 1;
		next = cur;
	}

	return next;
}


void parsegraph_Display_initFramebuffer(parsegraph_Display* disp, parsegraph_Framebuffer* fb)
{
    glGenFramebuffers(1, &fb->fb);
    glBindFramebuffer(GL_FRAMEBUFFER, fb->fb);

    glGenRenderbuffers(1, &fb->color_rb);
    glBindRenderbuffer(GL_RENDERBUFFER, fb->color_rb);

    fb->bo = gbm_bo_create(disp->env->gbm, disp->width, disp->height,
        GBM_BO_FORMAT_XRGB8888,
        GBM_BO_USE_SCANOUT | GBM_BO_USE_RENDERING
    );
    if(!fb->bo) {
        parsegraph_die("failed to create gbm bo\n");
    }
    uint32_t handle = gbm_bo_get_handle(fb->bo).u32;
    uint32_t stride = gbm_bo_get_stride(fb->bo);
    fb->image = eglCreateImage(disp->env->dpy, NULL,
        EGL_NATIVE_PIXMAP_KHR, fb->bo, NULL);
    if(fb->image == EGL_NO_IMAGE) {
        parsegraph_die("failed to create egl image\n");
    }
#ifdef GL_OES_EGL_image
    glEGLImageTargetRenderbufferStorageOES(GL_RENDERBUFFER, fb->image);
#else
     parsegraph_die("GL_OES_EGL_image was not found at compile time\n");
#endif
    int ret;
    glFramebufferRenderbuffer(
        GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, fb->color_rb
    );

    glGenRenderbuffers(1, &fb->depth_rb);
    glBindRenderbuffer(GL_RENDERBUFFER, fb->depth_rb);
    glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, disp->width, disp->height);

    if((ret = glCheckFramebufferStatus(GL_FRAMEBUFFER)) != GL_FRAMEBUFFER_COMPLETE) {
        parsegraph_die("Framebuffer must be complete: %x\n", ret);
    }
    glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, fb->depth_rb);

    ret = drmModeAddFB(disp->env->drm_fd, disp->width, disp->height, 24, 32, stride, handle, &fb->drm_fb);
    if(ret) {
        parsegraph_die("DRM failed to create fb\n");
    }

    fb->needsRender = 1;
}

void parsegraph_Display_destroyFramebuffer(parsegraph_Display* disp, parsegraph_Framebuffer* fb)
{
    glDeleteRenderbuffers(1, &fb->color_rb);
    glDeleteRenderbuffers(1, &fb->depth_rb);
    drmModeRmFB(disp->env->drm_fd, fb->drm_fb);
    eglDestroyImage(disp->env->dpy, fb->image);
    gbm_bo_destroy(fb->bo);
    glDeleteFramebuffers(1, &fb->fb);
}

parsegraph_Display* parsegraph_Display_new(parsegraph_Environment* env, drmModeConnector* connector, drmModeRes* resources)
{
    parsegraph_Display* disp = apr_palloc(env->pool, sizeof(*disp));
    disp->env = env;
    disp->connector = connector;
    disp->crtc = -1;
    disp->mode = connector->modes[0];
    disp->width = disp->mode.hdisplay;
    disp->height = disp->mode.vdisplay;
    disp->front_fb = 0;
    disp->next_display = 0;
    disp->frames = 0;

    memset(disp->color, 0, sizeof(disp->color));
    memset(disp->color_up, 0, sizeof(disp->color_up));

    drmModeEncoder *encoder;
    if(disp->connector->encoder_id) {
        encoder = drmModeGetEncoder(disp->env->drm_fd, disp->connector->encoder_id);
    }
    else {
        encoder = 0;
    }
    if(encoder) {
        int crtc = -1;
        if(encoder->crtc_id) {
            crtc = encoder->crtc_id;
            for(parsegraph_Display* otherDisp = env->first_display; otherDisp; otherDisp = otherDisp->next_display) {
                if(otherDisp->crtc == crtc) {
                    crtc = -1;
                    break;
                }
            }

            if(crtc >= 0) {
                drmModeFreeEncoder(encoder);
                disp->crtc = crtc;
                goto encoder_found;
            }
        }
    }
    
    {
        int crtc = -1;
        for(int i = 0; i < disp->connector->count_encoders; i++) {
            drmModeEncoder* enc = drmModeGetEncoder(disp->env->drm_fd, disp->connector->encoders[i]);
            if(enc == NULL) {
                continue;
            }
            for(int j = 0; j < resources->count_crtcs; ++j) {
                if(!(enc->possible_crtcs & (1 << j))) {
                    continue;
                }
                crtc = resources->crtcs[j];

                for(parsegraph_Display* otherDisp = env->first_display; otherDisp; otherDisp = otherDisp->next_display) {
                    if(otherDisp->crtc == crtc) {
                        crtc = -1;
                        break;
                    }
                }

                if(crtc >= 0) {
                    drmModeFreeEncoder(encoder);
                    disp->crtc = crtc;
                    goto encoder_found;
                }
            }
            drmModeFreeEncoder(enc);
        }
    }

encoder_found:
    if(env->last_display) {
        env->last_display->next_display = disp;
        env->last_display = disp;
    }
    else {
        env->first_display = disp;
        env->last_display = disp;
    }

    // Create frame buffers.
    for (int i = 0; i < 2; i++) {
        parsegraph_Display_initFramebuffer(disp, disp->framebuffers + i);
    }

    // Save the CRTC configuration to restore upon exit.
    disp->saved_crtc = drmModeGetCrtc(env->drm_fd, disp->crtc);
    if(disp->saved_crtc == NULL) {
        parsegraph_die("Failed to save current CRTC");
    }

    return disp;
}

static int open_restricted(const char *path, int flags, void *user_data)
{
    return open(path, flags);
}
static void close_restricted(int fd, void *user_data)
{
    close(fd);
}

static struct libinput_interface libinput_interface = {
open_restricted,
close_restricted
};

const char* get_egl_error(int error)
{
	const char* ename = 0;
	switch(eglGetError()) {
	   case EGL_SUCCESS: ename = "EGL_SUCCESS"; break;
	   case EGL_NOT_INITIALIZED: ename = "EGL_NOT_INITIALIZED"; break;
	   case EGL_BAD_ACCESS: ename = "EGL_BAD_ACCESS"; break;
	   case EGL_BAD_ALLOC: ename = "EGL_BAD_ALLOC"; break;
	   case EGL_BAD_ATTRIBUTE: ename = "EGL_BAD_ATTRIBUTE"; break;
	   case EGL_BAD_CONTEXT: ename = "EGL_BAD_CONTEXT"; break;
	   case EGL_BAD_CONFIG: ename = "EGL_BAD_CONFIG"; break;
	   case EGL_BAD_CURRENT_SURFACE: ename = "EGL_BAD_CURRENT_SURFACE"; break;
	   case EGL_BAD_DISPLAY: ename = "EGL_BAD_DISPLAY"; break;
	   case EGL_BAD_SURFACE: ename = "EGL_BAD_SURFACE"; break;
	   case EGL_BAD_MATCH: ename = "EGL_BAD_MATCH"; break;
	   case EGL_BAD_PARAMETER: ename = "EGL_BAD_PARAMETER"; break;
	   case EGL_BAD_NATIVE_PIXMAP: ename = "EGL_BAD_NATIVE_PIXMAP"; break;
	   case EGL_BAD_NATIVE_WINDOW: ename = "EGL_BAD_NATIVE_WINDOW"; break;
	   case EGL_CONTEXT_LOST: ename = "EGL_CONTEXT_LOST"; break;
	}
	return ename;
}

parsegraph_Environment* parsegraph_Environment_new()
{
    apr_pool_t* pool;
    if(APR_SUCCESS != apr_pool_create(&pool, 0)) {
        parsegraph_die("Failed to create environment pool");
    }
    parsegraph_Environment* env = apr_palloc(pool, sizeof(*env));
    env->pool = pool;
    env->surface = 0;
    env->input = 0;
    env->needInit = 1;
    env->keyNames = 0;

    env->needToFocus = 0;
    env->needToBlur = 0;

    env->first_display = 0;
    env->last_display = 0;

    env->udev = udev_new();
    if(!env->udev) {
        parsegraph_die("udev couldn't open");
    }

    env->libinput = libinput_udev_create_context(&libinput_interface, 0, env->udev);
    if(!env->libinput) {
        parsegraph_die("libinput couldn't open");
    }

    if(0 != libinput_udev_assign_seat(env->libinput, "seat0")) {
        parsegraph_die("libinput couldn't assign seat");
    }

    env->drm_fd = open(device_name, O_RDWR);
    if(env->drm_fd < 0) {
        parsegraph_die("couldn't open DRM %s (probably permissions)\n", device_name);
    }

    env->gbm = gbm_create_device(env->drm_fd);
    if(!env->gbm) {
        parsegraph_die("Failed to create GBM context for parsegraph_Environment");
    }

    // Create the graphics context
    env->dpy = eglGetPlatformDisplay(EGL_PLATFORM_GBM_MESA, env->gbm, NULL);
    if(env->dpy == EGL_NO_DISPLAY) {
        parsegraph_die("eglGetDisplay() failed with EGL_NO_DISPLAY");
    }
    EGLint major, minor;
    if(!eglInitialize(env->dpy, &major, &minor)) {
        parsegraph_die("eglInitialize() failed");
    }
    //const char* ver = eglQueryString(env->dpy, EGL_VERSION);
    //printf("EGL_VERSION = %s\n", ver);

    const char* extensions = eglQueryString(env->dpy, EGL_EXTENSIONS);
    //printf("EGL_EXTENSIONS: %s\n", extensions);
    if(!strstr(extensions, "EGL_KHR_surfaceless_context")) {
        parsegraph_die("No support for EGL_KHR_surfaceless_context\n");
    }

    const EGLint context_attribs[] = {
        EGL_CONTEXT_CLIENT_VERSION, 2, EGL_NONE
    };
    EGLConfig config;
    const EGLint config_attribs[] = {
        EGL_SURFACE_TYPE, EGL_WINDOW_BIT,
        EGL_RED_SIZE, 1,
        EGL_GREEN_SIZE, 1,
        EGL_BLUE_SIZE, 1,
        EGL_ALPHA_SIZE, 0,
        EGL_DEPTH_SIZE, 24,
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES2_BIT,
        EGL_NONE
    };
    eglBindAPI(EGL_OPENGL_ES_API);
    EGLint n;
    if(!eglChooseConfig(env->dpy, config_attribs, &config, 1, &n)) {
        parsegraph_die("Failed to select EGL config");
    }
    env->ctx = eglCreateContext(env->dpy, config, EGL_NO_CONTEXT, context_attribs);
    if(env->ctx == NULL) {
        const char* ename = get_egl_error(eglGetError());
        if(ename) {
            parsegraph_die("Failed to create EGL context: %s\n", ename);
        }
        parsegraph_die("Failed to create EGL context: %d\n", eglGetError());
    }

    if(!eglMakeCurrent(env->dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, env->ctx)) {
        parsegraph_die("failed to make context current");
    }

#ifdef GL_OES_EGL_image
    glEGLImageTargetRenderbufferStorageOES_func =
        (PFNGLEGLIMAGETARGETRENDERBUFFERSTORAGEOESPROC)
        eglGetProcAddress("glEGLImageTargetRenderbufferStorageOES");
#else
    parsegraph_die("GL_OES_EGL_image not supported at compile time\n");
#endif

    drmModeRes* resources = drmModeGetResources(env->drm_fd);
    if(!resources) {
        parsegraph_die("drmModeGetResources failed");
    }

    int i;
    drmModeConnector* connector = 0;
    for(i = 0; i < resources->count_connectors; i++) {
        connector = drmModeGetConnector(env->drm_fd, resources->connectors[i]);
        if(connector == NULL) {
            continue;
        }
        if(connector->connection == DRM_MODE_CONNECTED && connector->count_modes > 0) {
            // Use this connector
            parsegraph_Display_new(env, connector, resources);
            continue;
        }
        drmModeFreeConnector(connector);
    }
    if(!env->first_display) {
        parsegraph_die("No currently active connector found.");
    }

    drmModeFreeResources(resources);

    return env;
}

void parsegraph_Display_destroy(parsegraph_Display* disp)
{
    // Reset the CRTC.
    int ret = drmModeSetCrtc(disp->env->drm_fd, disp->saved_crtc->crtc_id, disp->saved_crtc->buffer_id,
        disp->saved_crtc->x, disp->saved_crtc->y,
        &disp->connector->connector_id, 1, &disp->saved_crtc->mode);
    if(ret) {
        parsegraph_log("failed to restore crtc: %m\n");
    }
    drmModeFreeCrtc(disp->saved_crtc);

    for(int i = 0; i < sizeof(disp->framebuffers)/sizeof(*disp->framebuffers); ++i) {
        parsegraph_Framebuffer* fb = disp->framebuffers + i;
        parsegraph_Display_destroyFramebuffer(disp, fb);
    }

    parsegraph_Display* prev = 0;
    for(parsegraph_Display* test = disp->env->first_display; test;) {
        if(test != disp) {
            prev = test;
            test = test->next_display;
            continue;
        }
        if(prev) {
            prev->next_display = disp->next_display;
            if(!prev->next_display) {
                disp->env->last_display = prev;
            }
        }
        else if(disp->env->first_display == disp) {
            disp->env->first_display = disp->next_display;
            if(!disp->next_display) {
                disp->env->last_display = 0;
            }
        }
        break;
    }

    drmModeFreeConnector(disp->connector);
}

void parsegraph_Environment_destroy(parsegraph_Environment* env)
{
    glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, 0);
    glBindRenderbuffer(GL_RENDERBUFFER, 0);
    eglMakeCurrent(env->dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);

    for(parsegraph_Display* disp = env->first_display; disp;) {
        parsegraph_Display* old = disp;
        disp = old->next_display;
        parsegraph_Display_destroy(old);
    }

    eglDestroyContext(env->dpy, env->ctx);
    eglTerminate(env->dpy);
    gbm_device_destroy(env->gbm);

    close(env->drm_fd);
    libinput_unref(env->libinput);
    udev_unref(env->udev);
    apr_pool_destroy(env->pool);
}

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface)
{
    parsegraph_Environment* env = surface->peer;
    for(parsegraph_Display* disp = env->first_display; disp; disp = disp->next_display) {
        for(int i = 0; i < 2; ++i) {
            parsegraph_Framebuffer* fb = &disp->framebuffers[i];
            fb->needsRender = 1;
        }
    }
}

void parsegraph_Surface_install(parsegraph_Surface* surface, parsegraph_Input* givenInput)
{
    parsegraph_Environment* env = surface->peer;
    if(env->input) {
        parsegraph_Surface_uninstall(surface);
        return;
    }
    env->input = givenInput;
    env->needToBlur = 0;
    env->needToFocus = 1;
}

void parsegraph_Surface_uninstall(parsegraph_Surface* surface)
{
    parsegraph_Environment* env = surface->peer;
    if(env && env->input) {
        env->needToBlur = 0;
        env->needToFocus = 0;
        env->input = 0;
    }
}

static void
render_stuff(parsegraph_Environment* env, parsegraph_Display* disp, int width, int height, parsegraph_Framebuffer* fb)
{
    struct timespec now;
    clock_gettime(CLOCK_REALTIME, &now);

    float elapsed = ((float)parsegraph_timediffMs(&now, &env->start))/1000.0;
    env->start = now;

    if(env->input && env->needToBlur) {
        parsegraph_Input_onblur(env->input);
        env->needToBlur = 0;
    }
    if(env->input && env->needToFocus) {
        parsegraph_Input_onfocus(env->input);
        env->needToFocus = 0;
    }
    //glViewport(0, 0, width, height);

    //parsegraph_log("Old BG: %d, %d, %d\n", disp->color[0], disp->color[1], disp->color[2]);
    disp->color[0] = next_color(&disp->color_up[0], disp->color[0], 10);
    disp->color[1] = next_color(&disp->color_up[1], disp->color[1], 5);
    disp->color[2] = next_color(&disp->color_up[2], disp->color[2], 2);
    //parsegraph_log("New BG: %d, %d, %d\n", disp->color[0], disp->color[1], disp->color[2]);
    //glClearColor(disp->color[0], disp->color[1], disp->color[2], 1);
    //glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    //parsegraph_log("Running animation callbacks\n");
    if(fb->needsRender) {
        glBindFramebuffer(GL_FRAMEBUFFER, fb->fb);
        glFramebufferRenderbuffer(
            GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, fb->color_rb
        );
        parsegraph_Surface_runAnimationCallbacks(env->surface, elapsed);
        int ret;
        if((ret = glCheckFramebufferStatus(GL_FRAMEBUFFER)) != GL_FRAMEBUFFER_COMPLETE) {
            parsegraph_die("Framebuffer must be complete: %x\n", ret);
        }
        parsegraph_Surface_render(env->surface, 0);
        glFlush();
        //glFinish();
        fb->needsRender = 0;
    }
}
void quit_handler(int signum)
{
  quit = 1;
  parsegraph_log("Quitting!\n");
}

void init_keyNames(parsegraph_Environment* env)
{
    if(env->keyNames) {
        return;
    }
    apr_hash_t* keyNames = apr_hash_make(env->pool);
    apr_hash_set(keyNames, "KEY_ESC", APR_HASH_KEY_STRING, "Escape");
    apr_hash_set(keyNames, "KEY_TAB", APR_HASH_KEY_STRING, "Tab");
    apr_hash_set(keyNames, "KEY_RETURN", APR_HASH_KEY_STRING, "Return");
    apr_hash_set(keyNames, "KEY_LEFT", APR_HASH_KEY_STRING, "ArrowLeft");
    apr_hash_set(keyNames, "KEY_UP", APR_HASH_KEY_STRING, "ArrowUp");
    apr_hash_set(keyNames, "KEY_MINUS", APR_HASH_KEY_STRING, "-");
    apr_hash_set(keyNames, "KEY_UNDERSCORE", APR_HASH_KEY_STRING, "_");
    apr_hash_set(keyNames, "KEY_PLUS", APR_HASH_KEY_STRING, "+");
    apr_hash_set(keyNames, "KEY_EQUAL", APR_HASH_KEY_STRING, "=");
    apr_hash_set(keyNames, "KEY_RIGHT", APR_HASH_KEY_STRING, "ArrowRight");
    apr_hash_set(keyNames, "KEY_DOWN", APR_HASH_KEY_STRING, "ArrowDown");
    apr_hash_set(keyNames, "KEY_LEFTSHIFT", APR_HASH_KEY_STRING, "Shift");
    apr_hash_set(keyNames, "KEY_RIGHTSHIFT", APR_HASH_KEY_STRING, "Shift");
    apr_hash_set(keyNames, "KEY_SPACE", APR_HASH_KEY_STRING, " ");
    apr_hash_set(keyNames, "KEY_LEFTCTRL", APR_HASH_KEY_STRING, "Control");
    apr_hash_set(keyNames, "KEY_RIGHTCTRL", APR_HASH_KEY_STRING, "Control");
    apr_hash_set(keyNames, "KEY_LEFTALT", APR_HASH_KEY_STRING, "Alt");
    apr_hash_set(keyNames, "KEY_RIGHTALT", APR_HASH_KEY_STRING, "Alt");
    apr_hash_set(keyNames, "KEY_A", APR_HASH_KEY_STRING, "a");
    apr_hash_set(keyNames, "KEY_B", APR_HASH_KEY_STRING, "b");
    apr_hash_set(keyNames, "KEY_C", APR_HASH_KEY_STRING, "c");
    apr_hash_set(keyNames, "KEY_D", APR_HASH_KEY_STRING, "d");
    apr_hash_set(keyNames, "KEY_E", APR_HASH_KEY_STRING, "e");
    apr_hash_set(keyNames, "KEY_F", APR_HASH_KEY_STRING, "f");
    apr_hash_set(keyNames, "KEY_G", APR_HASH_KEY_STRING, "g");
    apr_hash_set(keyNames, "KEY_H", APR_HASH_KEY_STRING, "h");
    apr_hash_set(keyNames, "KEY_I", APR_HASH_KEY_STRING, "i");
    apr_hash_set(keyNames, "KEY_J", APR_HASH_KEY_STRING, "j");
    apr_hash_set(keyNames, "KEY_K", APR_HASH_KEY_STRING, "k");
    apr_hash_set(keyNames, "KEY_L", APR_HASH_KEY_STRING, "l");
    apr_hash_set(keyNames, "KEY_M", APR_HASH_KEY_STRING, "m");
    apr_hash_set(keyNames, "KEY_N", APR_HASH_KEY_STRING, "n");
    apr_hash_set(keyNames, "KEY_O", APR_HASH_KEY_STRING, "o");
    apr_hash_set(keyNames, "KEY_P", APR_HASH_KEY_STRING, "p");
    apr_hash_set(keyNames, "KEY_Q", APR_HASH_KEY_STRING, "q");
    apr_hash_set(keyNames, "KEY_R", APR_HASH_KEY_STRING, "r");
    apr_hash_set(keyNames, "KEY_S", APR_HASH_KEY_STRING, "s");
    apr_hash_set(keyNames, "KEY_T", APR_HASH_KEY_STRING, "t");
    apr_hash_set(keyNames, "KEY_U", APR_HASH_KEY_STRING, "u");
    apr_hash_set(keyNames, "KEY_V", APR_HASH_KEY_STRING, "v");
    apr_hash_set(keyNames, "KEY_W", APR_HASH_KEY_STRING, "w");
    apr_hash_set(keyNames, "KEY_X", APR_HASH_KEY_STRING, "x");
    apr_hash_set(keyNames, "KEY_Y", APR_HASH_KEY_STRING, "y");
    apr_hash_set(keyNames, "KEY_Z", APR_HASH_KEY_STRING, "z");
    apr_hash_set(keyNames, "KEY_F1", APR_HASH_KEY_STRING, "F1");
    apr_hash_set(keyNames, "KEY_F4", APR_HASH_KEY_STRING, "F4");
    env->keyNames = keyNames;
}

static void
key_event(parsegraph_Environment* env, struct libinput_event *ev)
{
    init_keyNames(env);
    struct libinput_event_keyboard *k = libinput_event_get_keyboard_event(ev);
	enum libinput_key_state state;
	uint32_t key;

	state = libinput_event_keyboard_get_key_state(k);

    key = libinput_event_keyboard_get_key(k);
    const char* keyname = libevdev_event_code_get_name(EV_KEY, key);
    keyname = keyname ? keyname : "???";
    //parsegraph_log("KEYNAME is %s\n", keyname);
    const char* formalKeyName = apr_hash_get(env->keyNames, keyname, APR_HASH_KEY_STRING);
    parsegraph_Input* input = env->input;
    if(!formalKeyName) {
        formalKeyName = keyname;
    }

    if(state == LIBINPUT_KEY_STATE_PRESSED) {
        if(!strcmp(formalKeyName, "x")) {
            quit_handler(0);
            return;
        }
        if(!strcmp(formalKeyName, "c") && parsegraph_Input_Get(input, "Control")) {
            quit_handler(0);
            return;
        }
        if(!strcmp(formalKeyName, "F4") && parsegraph_Input_Get(input, "Alt")) {
            quit_handler(0);
            return;
        }
        if(input) {
            parsegraph_Input_keydown(input, formalKeyName, key, 0, 0, 0, 0);
        }
    }
    else {
        if(input) {
            parsegraph_Input_keyup(input, formalKeyName, key);
        }
    }
}

void parsegraph_logcurses(const char* fmt, va_list ap)
{
    vfprintf(stderr, fmt, ap);

    //vwprintw(stdscr, fmt, ap);
    //refresh();
}

void process_input(parsegraph_Environment* env)
{
    //parsegraph_log("Input had an event.\n");
    struct libinput* libinput = env->libinput;
    parsegraph_Input* input = env->input;
    parsegraph_Surface* surface = env->surface;

    libinput_dispatch(libinput);
    struct libinput_event *ev;
    while((ev = libinput_get_event(libinput))) {
        switch (libinput_event_get_type(ev)) {
        case LIBINPUT_EVENT_NONE:
            break;
        case LIBINPUT_EVENT_KEYBOARD_KEY:
    //fprintf(stderr, "KEYBOARD EVENT!!\n");
            key_event(env, ev);
            //quit = 1;
            continue;
        case LIBINPUT_EVENT_POINTER_MOTION:
            if(input) {
                struct libinput_event_pointer* pev = libinput_event_get_pointer_event(ev);
                parsegraph_Input_mousemove(input,
                    input->lastMouseX + libinput_event_pointer_get_dx(pev),
                    input->lastMouseY + libinput_event_pointer_get_dy(pev)
                );
            }
            break;
        case LIBINPUT_EVENT_POINTER_BUTTON:
            if(input) {
                //fprintf(stderr, "mOUSE click!!\n");
                struct libinput_event_pointer* pev = libinput_event_get_pointer_event(ev);
                int x = 0;//libinput_event_pointer_get_absolute_x_transformed(pev, parsegraph_Surface_getWidth(surface));
                int y = 0;//libinput_event_pointer_get_absolute_y_transformed(pev, parsegraph_Surface_getHeight(surface));
                if(libinput_event_pointer_get_button_state(pev) == LIBINPUT_BUTTON_STATE_PRESSED) {
                    //fprintf(stderr, "mosuedown !!\n");
                    parsegraph_Input_mousedown(input, x, y);
                }
                else {
                    parsegraph_Input_removeMouseListener(input);
                }
            }
            continue;
        case LIBINPUT_EVENT_POINTER_AXIS:
            if(input) {
                struct libinput_event_pointer* pev = libinput_event_get_pointer_event(ev);
                if(libinput_event_pointer_has_axis(pev, LIBINPUT_POINTER_AXIS_SCROLL_VERTICAL)) {
                    parsegraph_Input_onWheel(input, input->lastMouseX, input->lastMouseY, -libinput_event_pointer_get_axis_value(pev, LIBINPUT_POINTER_AXIS_SCROLL_VERTICAL)/60.0);
                }
            }
            break;
        case LIBINPUT_EVENT_TOUCH_DOWN:
            if(input) {
                struct libinput_event_touch* lte = libinput_event_get_touch_event(ev);
                apr_pool_t* spool;
                if(APR_SUCCESS != apr_pool_create(&spool, env->pool)) {
                    parsegraph_die("Failed to create pool for touch event");
                }
                parsegraph_ArrayList* touches = parsegraph_ArrayList_new(spool);
                parsegraph_TouchEvent* te = apr_palloc(spool, sizeof(*te));
                te->clientX = libinput_event_touch_get_x_transformed(lte, parsegraph_Surface_getWidth(surface));
                te->clientY = libinput_event_touch_get_y_transformed(lte, parsegraph_Surface_getHeight(surface));
                snprintf(te->identifier, sizeof(te->identifier), "%d", libinput_event_touch_get_seat_slot(lte));
                //fprintf(stderr, "TOUCH DOWN %s\n", te->identifier);
                parsegraph_ArrayList_push(touches, te);
                parsegraph_Input_touchstart(input, touches);
                apr_pool_destroy(spool);
            }
            break;
        case LIBINPUT_EVENT_TOUCH_UP:
            if(input) {
                struct libinput_event_touch* lte = libinput_event_get_touch_event(ev);
                apr_pool_t* spool;
                if(APR_SUCCESS != apr_pool_create(&spool, env->pool)) {
                    parsegraph_die("Failed to create pool for touch event");
                }
                parsegraph_ArrayList* touches = parsegraph_ArrayList_new(spool);
                parsegraph_TouchEvent* te = apr_palloc(spool, sizeof(*te));
                sprintf(te->identifier, "%d", libinput_event_touch_get_seat_slot(lte));
                //fprintf(stderr, "TOUCH END '%s' (%lld, %d) %d\n", te->identifier, te, strlen(te->identifier), sizeof(*te));
                parsegraph_ArrayList_push(touches, te);
                parsegraph_Input_removeTouchListener(input, touches);
                apr_pool_destroy(spool);
            }
            break;
        case LIBINPUT_EVENT_TOUCH_MOTION:
            if(input) {
                struct libinput_event_touch* lte = libinput_event_get_touch_event(ev);
                apr_pool_t* spool;
                if(APR_SUCCESS != apr_pool_create(&spool, env->pool)) {
                    parsegraph_die("Failed to create pool for touch event");
                }
                parsegraph_ArrayList* touches = parsegraph_ArrayList_new(spool);
                parsegraph_TouchEvent* te = apr_palloc(spool, sizeof(*te));
                te->clientX = libinput_event_touch_get_x_transformed(lte, parsegraph_Surface_getWidth(surface));
                te->clientY = libinput_event_touch_get_y_transformed(lte, parsegraph_Surface_getHeight(surface));
                snprintf(te->identifier, sizeof(te->identifier), "%d", libinput_event_touch_get_seat_slot(lte));
                //fprintf(stderr, "TOUCH MOTION '%s'\n", te->identifier);
                parsegraph_ArrayList_push(touches, te);
                parsegraph_Input_touchmove(input, touches);
                apr_pool_destroy(spool);
            }
            break;
        case LIBINPUT_EVENT_TOUCH_CANCEL:
            if(input) {
                //fprintf(stderr, "TOUCH CANCEL\n");
                struct libinput_event_touch* lte = libinput_event_get_touch_event(ev);
                apr_pool_t* spool;
                if(APR_SUCCESS != apr_pool_create(&spool, env->pool)) {
                    parsegraph_die("Failed to create pool for touch event");
                }
                parsegraph_ArrayList* touches = parsegraph_ArrayList_new(spool);
                parsegraph_TouchEvent* te = apr_palloc(spool, sizeof(*te));
                //te->clientX = libinput_event_touch_get_x_transformed(lte, parsegraph_Surface_getWidth(surface));
                //te->clientY = libinput_event_touch_get_y_transformed(lte, parsegraph_Surface_getHeight(surface));
                snprintf(te->identifier, sizeof(te->identifier), "%d", libinput_event_touch_get_seat_slot(lte));
                parsegraph_ArrayList_push(touches, te);
                parsegraph_Input_removeTouchListener(input, touches);
                apr_pool_destroy(spool);
            }
            break;
        case LIBINPUT_EVENT_TOUCH_FRAME:
            break;
        default:
            break;
        }
        libinput_event_destroy(ev);
    }
}

void draw_dev(parsegraph_Display* disp)
{
    parsegraph_Environment* env = disp->env;
    parsegraph_Framebuffer* fb = &disp->framebuffers[disp->front_fb^1];
    //parsegraph_log("Using framebuffer %d\n", fb->fb);

    if(env->needInit) {
        env->surface = init(env, disp->width, disp->height);
        env->needInit = 0;
    }

    // Actually render this environment.
    parsegraph_Surface_setDisplaySize(env->surface, disp->width, disp->height);
    render_stuff(env, disp, disp->width, disp->height, fb);

    // Request a page flip.
    int ret = drmModePageFlip(env->drm_fd, disp->crtc, fb->drm_fb, DRM_MODE_PAGE_FLIP_EVENT, disp);
    if(ret) {
        parsegraph_die("failed to page flip: %m\n");
    }
    disp->front_fb ^= 1;
    ++disp->frames;
}

static void
page_flip_handler(int fd, unsigned int frame,
		  unsigned int sec, unsigned int usec, void *data)
{
    parsegraph_Display* disp = data;
    draw_dev(disp);
}

void loop(parsegraph_Environment* env)
{

    // Start the environment's loop.
    clock_gettime(CLOCK_REALTIME, &env->start);

    // Render the scene.
    for(parsegraph_Display* disp = env->first_display; disp; disp = disp->next_display) {
        disp->color[0] = rand() % 0xff;
        disp->color[1] = rand() % 0xff;
        disp->color[2] = rand() % 0xff;
        parsegraph_log("BG: %d, %d, %d\n", disp->color[0], disp->color[1], disp->color[2]);
        memset(disp->color_up, 1, sizeof(disp->color_up));

        parsegraph_Framebuffer* fb = &disp->framebuffers[disp->front_fb];
        drmModeSetCrtc(env->drm_fd, disp->crtc, fb->drm_fb, 0, 0, &disp->connector->connector_id, 1, &disp->mode);
        draw_dev(disp);
    }

    for(; !quit;) {
        fd_set rfds;
        FD_ZERO(&rfds);
        FD_SET(env->drm_fd, &rfds);
        FD_SET(libinput_get_fd(env->libinput), &rfds);

        int maxfd = libinput_get_fd(env->libinput);
        if(maxfd < env->drm_fd) {
            maxfd = env->drm_fd;
        }
        while(select(maxfd + 1, &rfds, NULL, NULL, NULL) == -1) {
            // Wait for events from DRM or libinput.
        }
        if(env->surface && FD_ISSET(libinput_get_fd(env->libinput), &rfds)) {
            process_input(env);
        }
        if(FD_ISSET(env->drm_fd, &rfds)) {
            // DRM has events.
            drmEventContext evctx;
            memset(&evctx, 0, sizeof evctx);
            evctx.version = DRM_EVENT_CONTEXT_VERSION;
            evctx.page_flip_handler = page_flip_handler;
            drmHandleEvent(env->drm_fd, &evctx);
        }

#ifdef parsegraph_NCURSES
        // Consume terminal input.
        char c;
        while((c = getch()) != ERR) {
            if(c == 'x') {
                quit = 1;
            }
        }
#endif

    }

   //time(&end);
   //printf("Frames per second: %.2lf\n", frames / difftime(end, start));
}


void quit_signal_handler(int sig, siginfo_t* si, void* data)
{
    quit = 1;
}

int main(int argc, const char * const *argv)
{
    if(geteuid() != 0) {
        parsegraph_die("This program must be run as root.");
    }

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_die("Failed initializing APR. APR status of %d.\n", rv);
    }

    // Create the environment.
    parsegraph_Environment* env = parsegraph_Environment_new();

#ifdef parsegraph_NCURSES
    // Start ncurses.
    initscr();
    raw();
    keypad(stdscr, TRUE);
    noecho();
    nodelay(stdscr, TRUE);
    curs_set(0);
    parsegraph_log_func = parsegraph_logcurses;
#endif

    // Interpret SIGINT gracefully.
    {
        struct sigaction sa;
        memset(&sa, 0, sizeof(sa));
        sa.sa_flags = SA_SIGINFO;
        sa.sa_sigaction = quit_signal_handler;
        sigaction(SIGINT, &sa, NULL);
    }

    // Run the environment's loop.
    loop(env);

    // Destroy the environment.
    //parsegraph_log("Quitting\n");
    parsegraph_Environment_destroy(env);

#ifdef parsegraph_NCURSES
    // Close ncurses.
    curs_set(1);
    echo();
    endwin();
#endif

    // Close APR.
    apr_terminate();


    return 0;
}
