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

// TODO Add libinput
// TODO Add pthread
// TODO Add cairo/pango/harfbuzz for text rendering in GlyphAtlas

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
#include "alpha/WeetPainter.h"
#include "widgets/alpha_WeetCubeWidget.h"
#include "alpha/Maths.h"
#include <libevdev/libevdev.h>
#include <ncurses.h>
#include <stdarg.h>
#include "graph/log.h"
#include "graph/Surface.h"
#include "alpha/GLWidget.h"

static apr_pool_t* pool = 0;

static struct alpha_GLWidget* widget = 0;
static struct parsegraph_Surface* surface = 0;

#ifdef GL_OES_EGL_image
static PFNGLEGLIMAGETARGETRENDERBUFFERSTORAGEOESPROC glEGLImageTargetRenderbufferStorageOES_func;
#endif

struct kms {
   drmModeConnector *connector;
   drmModeEncoder *encoder;
   drmModeModeInfo mode;
   uint32_t fb_id[2];
};
GLfloat x = 1.0;
GLfloat y = 1.0;
GLfloat xstep = 1.0f;
GLfloat ystep = 1.0f;
GLfloat rsize = 50;
int quit = 0;
static EGLBoolean
setup_kms(int fd, struct kms *kms)
{
   drmModeRes *resources;
   drmModeConnector *connector;
   drmModeEncoder *encoder;
   int i;
   resources = drmModeGetResources(fd);
   if (!resources) {
      parsegraph_log("drmModeGetResources failed\n");
      return EGL_FALSE;
   }

   connector = 0;
   for (i = 0; i < resources->count_connectors; i++) {
      connector = drmModeGetConnector(fd, resources->connectors[i]);
      if (connector == NULL)
	 continue;
      if (connector->connection == DRM_MODE_CONNECTED &&
	  connector->count_modes > 0)
	 break;
      drmModeFreeConnector(connector);
   }
   if (i == resources->count_connectors) {
      parsegraph_log("No currently active connector found.\n");
      return EGL_FALSE;
   }

   encoder = 0;
   for (i = 0; i < resources->count_encoders; i++) {
      encoder = drmModeGetEncoder(fd, resources->encoders[i]);
      if (encoder == NULL)
	 continue;
      if (encoder->encoder_id == connector->encoder_id)
	 break;
      drmModeFreeEncoder(encoder);
   }
   kms->connector = connector;
   kms->encoder = encoder;
   kms->mode = connector->modes[0];
   return EGL_TRUE;
}

static float start = 0;
static int frozen = 0;

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* sched)
{
    sched->needsRepaint = 1;
}

static void
render_stuff(int width, int height)
{
    struct alpha_RenderData rd;
    rd.width = width;
    rd.height = height;
    if(!widget) {
        surface = parsegraph_Surface_new(0);
        widget = alpha_GLWidget_new(surface);
        parsegraph_Surface_paint(surface, &rd);
    }

    float t = alpha_GetTime();
    float elapsed = t - start;
    //parsegraph_log("Elapsed: %f\n", elapsed);
    alpha_GLWidget_Tick(widget, elapsed/1000.0);
    start = t;
    if(!frozen) {
        parsegraph_Surface_paint(surface, &rd);
    }
    glViewport(0, 0, (GLint) width, (GLint) height);
    glClearColor(0, 47.0/255, 57.0/255, 1.0);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    parsegraph_Surface_render(surface, &rd);
    glFlush();
}

static const char device_name[] = "/dev/dri/card0";
static void
page_flip_handler(int fd, unsigned int frame,
		  unsigned int sec, unsigned int usec, void *data)
{
}
void quit_handler(int signum)
{
  quit = 1;
  parsegraph_log("Quitting!\n");
}

 int open_restricted(const char *path, int flags, void *user_data)
 {
    return open(path, flags);
 }

 void close_restricted(int fd, void *user_data)
 {
    close(fd);
 }

static apr_hash_t* keyNames = 0;

static void
print_key_event(struct libinput *li, struct libinput_event *ev)
{
    if(!keyNames) {
        keyNames = apr_hash_make(pool);
        apr_hash_set(keyNames, "KEY_ESC", APR_HASH_KEY_STRING, "Escape");
        apr_hash_set(keyNames, "KEY_TAB", APR_HASH_KEY_STRING, "Tab");
        apr_hash_set(keyNames, "KEY_RETURN", APR_HASH_KEY_STRING, "Return");
        apr_hash_set(keyNames, "KEY_LEFT", APR_HASH_KEY_STRING, "Left");
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
    }
	struct libinput_event_keyboard *k = libinput_event_get_keyboard_event(ev);
	enum libinput_key_state state;
	uint32_t key;

	state = libinput_event_keyboard_get_key_state(k);

    key = libinput_event_keyboard_get_key(k);
    const char* keyname = libevdev_event_code_get_name(EV_KEY, key);
    keyname = keyname ? keyname : "???";
    const char* formalKeyName = apr_hash_get(keyNames, keyname, APR_HASH_KEY_STRING);
    if(!formalKeyName) {
        formalKeyName = keyname;
    }

    if(state == LIBINPUT_KEY_STATE_PRESSED) {
        if(!strcmp(formalKeyName, "c") && alpha_Input_Get(widget->input, "Control")) {
            quit_handler(0);
            return;
        }
        if(!strcmp(formalKeyName, "F4") && alpha_Input_Get(widget->input, "Alt")) {
            quit_handler(0);
            return;
        }
        if(!strcmp(formalKeyName, "Escape")) {
            frozen = !frozen;
            if(!frozen) {
                start = alpha_GetTime();
            }
        }
        alpha_Input_keydown(widget->input, formalKeyName, 0, 0, 0);
    }
    else {
        alpha_Input_keyup(widget->input, formalKeyName);
    }
}

void parsegraph_logcurses(const char* fmt, va_list ap)
{
    vprintf(fmt, ap);
    //vwprintw(stdscr, fmt, ap);
    //refresh();
}

int main(int argc, const char * const *argv)
{
   if(geteuid() != 0) {
    fprintf(stderr, "This program must be run as root.\n");
    return -1;
    }
   EGLDisplay dpy;
   EGLContext ctx;
   EGLImage image[2];
   EGLint major, minor;
   const char *ver, *extensions;
   GLuint fb, color_rb[2];
   uint32_t handle, stride;
   struct kms kms;
   int ret, fd, i, frames = 0, current = 0;
   struct gbm_device *gbm;
   struct gbm_bo *bo[2];
   drmModeCrtcPtr saved_crtc;
   time_t start, end;

    initscr();
    raw();
    keypad(stdscr, TRUE);
    noecho();
    nodelay(stdscr, TRUE);
    parsegraph_log_func = parsegraph_logcurses;

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_log("Failed initializing APR. APR status of %d.\n", rv);
        return -1;
    }
    rv = apr_pool_create(&pool, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_log("Failed creating memory pool. APR status of %d.\n", rv);
        return -1;
    }

    struct udev* udev = udev_new();
    if(!udev) {
      parsegraph_log("udev couldn't open");
      return -1;
    }

    if(!start) {
        start = alpha_GetTime();
    }

    struct libinput_interface libinput_interface;
    libinput_interface.open_restricted = open_restricted;
    libinput_interface.close_restricted = close_restricted;

    struct libinput* libinput = libinput_udev_create_context(&libinput_interface, 0, udev);
    if(!libinput) {
      parsegraph_log("libinput couldn't open");
      return -1;
    }

    if(0 != libinput_udev_assign_seat(libinput, "seat0")) {
      parsegraph_log("libinput couldn't assign seat");
      return -1;
    }

   signal (SIGINT, quit_handler);
   fd = open(device_name, O_RDWR);
   if (fd < 0) {
      /* Probably permissions error */
      parsegraph_log("couldn't open %s, skipping\n", device_name);
      return -1;
   }

    gbm = gbm_create_device(fd);
    if(!gbm) {
        ret = -1;
        goto close_fd;
    }

    dpy = eglGetPlatformDisplay(EGL_PLATFORM_GBM_MESA, gbm, NULL);
   if (dpy == EGL_NO_DISPLAY) {
      parsegraph_log("eglGetDisplay() failed with EGL_NO_DISPLAY\n");
      ret = -1;
      goto close_fd;
   }
   if (!eglInitialize(dpy, &major, &minor)) {
      printf("eglInitialize() failed\n");
      ret = -1;
      goto egl_terminate;
   }
   ver = eglQueryString(dpy, EGL_VERSION);
   printf("EGL_VERSION = %s\n", ver);
   extensions = eglQueryString(dpy, EGL_EXTENSIONS);
   printf("EGL_EXTENSIONS: %s\n", extensions);
   if (!strstr(extensions, "EGL_KHR_surfaceless_context")) {
      printf("No support for EGL_KHR_surfaceless_context\n");
      ret = -1;
      goto egl_terminate;
   }
   if (!setup_kms(fd, &kms)) {
      ret = -1;
      goto egl_terminate;
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
    if(!eglChooseConfig(dpy, config_attribs, &config, 1, &n)) {
      ret = -1;
      goto egl_terminate;
    }
   ctx = eglCreateContext(dpy, config, EGL_NO_CONTEXT, context_attribs);
   if (ctx == NULL) {
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
	   if(ename) {
	      parsegraph_log("failed to create context: %s\n", ename);
	   }
	   else {
	      parsegraph_log("failed to create context: %d\n", eglGetError());
	   }
      ret = -1;
      goto egl_terminate;
   }
   if (!eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, ctx)) {
      parsegraph_log("failed to make context current\n");
      ret = -1;
      goto destroy_context;
   }
#ifdef GL_OES_EGL_image
   glEGLImageTargetRenderbufferStorageOES_func =
      (PFNGLEGLIMAGETARGETRENDERBUFFERSTORAGEOESPROC)
      eglGetProcAddress("glEGLImageTargetRenderbufferStorageOES");
#else
   parsegraph_log("GL_OES_EGL_image not supported at compile time\n");
#endif
   glGenFramebuffers(1, &fb);
   glBindFramebuffer(GL_FRAMEBUFFER, fb);
   glGenRenderbuffers(2, color_rb);
   for (i = 0; i < 2; i++) {
     glBindRenderbuffer(GL_RENDERBUFFER, color_rb[i]);
     bo[i]  = gbm_bo_create(gbm, kms.mode.hdisplay, kms.mode.vdisplay,
			    GBM_BO_FORMAT_XRGB8888,
			    GBM_BO_USE_SCANOUT | GBM_BO_USE_RENDERING);
     if (bo[i] == NULL) {
       parsegraph_log("failed to create gbm bo\n");
       ret = -1;
       goto unmake_current;
     }
     handle = gbm_bo_get_handle(bo[i]).u32;
     stride = gbm_bo_get_stride(bo[i]);
     image[i] = eglCreateImage(dpy, NULL, EGL_NATIVE_PIXMAP_KHR,
				  bo[i], NULL);
     if (image[i] == EGL_NO_IMAGE) {
       parsegraph_log("failed to create egl image\n");
       ret = -1;
       goto destroy_gbm_bo;
     }
#ifdef GL_OES_EGL_image
     glEGLImageTargetRenderbufferStorageOES(GL_RENDERBUFFER, image[i]);
#else
     parsegraph_log("GL_OES_EGL_image was not found at compile time\n");
#endif

     GLuint depth_rb;
     glGenRenderbuffers(1, &depth_rb);
     glBindRenderbuffer(GL_RENDERBUFFER, depth_rb);
     glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT24, kms.mode.hdisplay, kms.mode.vdisplay);
     glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, depth_rb);

     ret = drmModeAddFB(fd,
			kms.mode.hdisplay, kms.mode.vdisplay,
			24, 32, stride, handle, &kms.fb_id[i]);
     if (ret) {
       parsegraph_log("failed to create fb\n");
       goto rm_rb;
     }
   }
   saved_crtc = drmModeGetCrtc(fd, kms.encoder->crtc_id);
   if (saved_crtc == NULL)
      goto rm_fb;
   time(&start);

   do {
     drmEventContext evctx;
     fd_set rfds;
     glFramebufferRenderbuffer(GL_FRAMEBUFFER,
			       GL_COLOR_ATTACHMENT0,
			       GL_RENDERBUFFER,
			       color_rb[current]);
     if ((ret = glCheckFramebufferStatus(GL_FRAMEBUFFER)) !=
	 GL_FRAMEBUFFER_COMPLETE) {
       parsegraph_log("framebuffer not complete: %x\n", ret);
       ret = 1;
       goto rm_rb;
     }
     render_stuff(kms.mode.hdisplay, kms.mode.vdisplay);
     ret = drmModePageFlip(fd, kms.encoder->crtc_id,
			   kms.fb_id[current],
			   DRM_MODE_PAGE_FLIP_EVENT, 0);
     if (ret) {
       parsegraph_log("failed to page flip: %m\n");
       goto free_saved_crtc;
     }
listen_to_fds:
     FD_ZERO(&rfds);
     FD_SET(fd, &rfds);
     FD_SET(libinput_get_fd(libinput), &rfds);

     int maxfd = libinput_get_fd(libinput);
     if(maxfd < fd) {
        maxfd = fd;
     }
     while (select(maxfd + 1, &rfds, NULL, NULL, NULL) == -1) {
   }
    libinput_dispatch(libinput);
     if(FD_ISSET(libinput_get_fd(libinput), &rfds)) {
        // Input had an event.
        struct libinput_event *ev;
        while ((ev = libinput_get_event(libinput))) {
            switch (libinput_event_get_type(ev)) {
            case LIBINPUT_EVENT_NONE:
                break;
            case LIBINPUT_EVENT_KEYBOARD_KEY:
                print_key_event(libinput, ev);
                //quit = 1;
                break;
            default:
                break;
            }
            libinput_event_destroy(ev);
        }
     }

        // Consume terminal input.
        char c;
        while((c = getch()) != ERR) {
            if(c == 'q') {
                quit = 1;
            }
        }

        if(!FD_ISSET(fd, &rfds)) {
            // Only the input (or nothing) had events, so don't page flip.
            if(quit) {
                break;
            }
            goto listen_to_fds;
         }

        // DRM has events.
         memset(&evctx, 0, sizeof evctx);
         evctx.version = DRM_EVENT_CONTEXT_VERSION;
         evctx.page_flip_handler = page_flip_handler;
         drmHandleEvent(fd, &evctx);
         current ^= 1;
         frames++;
   } while (!quit);
   time(&end);
   printf("Frames per second: %.2lf\n", frames / difftime(end, start));
   ret = drmModeSetCrtc(fd, saved_crtc->crtc_id, saved_crtc->buffer_id,
                        saved_crtc->x, saved_crtc->y,
                        &kms.connector->connector_id, 1, &saved_crtc->mode);
   if (ret) {
      parsegraph_log("failed to restore crtc: %m\n");
   }
free_saved_crtc:
   //drmModeFreeCrtc(saved_crtc);
rm_rb:
   //glFramebufferRenderbuffer(GL_FRAMEBUFFER,
			     //GL_COLOR_ATTACHMENT0,
			     //GL_RENDERBUFFER, 0);
   //glBindRenderbuffer(GL_RENDERBUFFER, 0);
   //glDeleteRenderbuffers(2, color_rb);
rm_fb:
   for (int i = 0; i < 2; i++) {
     //drmModeRmFB(fd, kms.fb_id[i]);
     //eglDestroyImage(dpy, image[i]);
   }
destroy_gbm_bo:
   for (int i = 0; i < 2; i++)
     //gbm_bo_destroy(bo[i]);
unmake_current:
   //eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
destroy_context:
   //eglDestroyContext(dpy, ctx);
egl_terminate:
   //eglTerminate(dpy);
close_fd:
   //close(fd);

    // Destroy the pool for cleanliness.
    //apr_pool_destroy(pool);
    pool = NULL;

    //apr_terminate();

    noraw();
    echo();
    endwin();

   return ret;
}
