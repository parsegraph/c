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
#include "alpha/WeetPainter.h"
#include "widgets/alpha_WeetCubeWidget.h"
#include "alpha/Maths.h"

static apr_pool_t* pool;

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
      fprintf(stderr, "drmModeGetResources failed\n");
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
      fprintf(stderr, "No currently active connector found.\n");
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

static struct alpha_WeetCubeWidget* widget = 0;

static void
render_stuff(int width, int height)
{
    if(!widget) {
        widget = alpha_WeetCubeWidget_new(pool);
        alpha_WeetCubeWidget_paint(widget);
    }
    glViewport(0, 0, (GLint) width, (GLint) height);
    glClearColor(0, 47.0/255, 57.0/255, 1.0);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    alpha_WeetCubeWidget_render(widget, width, height);
    glFlush();
    if(x <= 0 || x >= width - rsize) {
        xstep *= -1;
    }
    if(y <= 0 || y >= height - rsize) {
        ystep *= -1;
    }
    x += xstep;
    y += ystep;
}

static const char device_name[] = "/dev/dri/card0";
static void
page_flip_handler(int fd, unsigned int frame,
		  unsigned int sec, unsigned int usec, void *data)
{
  ;
}
void quit_handler(int signum)
{
  quit = 1;
  printf("Quitting!\n");
}

int main(int argc, const char * const *argv)
{
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

    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed initializing APR. APR status of %d.\n", rv);
        return -1;
    }
    rv = apr_pool_create(&pool, NULL);
    if(rv != APR_SUCCESS) {
        fprintf(stderr, "Failed creating memory pool. APR status of %d.\n", rv);
        return -1;
    }

   signal (SIGINT, quit_handler);
   fd = open(device_name, O_RDWR);
   if (fd < 0) {
      /* Probably permissions error */
      fprintf(stderr, "couldn't open %s, skipping\n", device_name);
      return -1;
   }

   gbm = gbm_create_device(fd);
   if(!gbm) {
	   ret = -1;
	   goto close_fd;
   }

dpy = eglGetPlatformDisplay(EGL_PLATFORM_GBM_MESA, gbm, NULL);
   if (dpy == EGL_NO_DISPLAY) {
      fprintf(stderr, "eglGetDisplay() failed with EGL_NO_DISPLAY\n");
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
        EGL_RENDERABLE_TYPE, EGL_OPENGL_ES2_BIT,
        EGL_NONE
    };
   eglBindAPI(EGL_OPENGL_ES_API);
    EGLint n;
    if(!eglChooseConfig(dpy, config_attribs, &config, 1, &n)) {
      ret = -1;
      goto egl_terminate;
    }
   ctx = eglCreateContext(dpy, 0, EGL_NO_CONTEXT, context_attribs);
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
	      fprintf(stderr, "failed to create context: %s\n", ename);
	   }
	   else {
	      fprintf(stderr, "failed to create context: %d\n", eglGetError());
	   }
      ret = -1;
      goto egl_terminate;
   }
   if (!eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, ctx)) {
      fprintf(stderr, "failed to make context current\n");
      ret = -1;
      goto destroy_context;
   }
#ifdef GL_OES_EGL_image
   glEGLImageTargetRenderbufferStorageOES_func =
      (PFNGLEGLIMAGETARGETRENDERBUFFERSTORAGEOESPROC)
      eglGetProcAddress("glEGLImageTargetRenderbufferStorageOES");
#else
   fprintf(stderr, "GL_OES_EGL_image not supported at compile time\n");
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
       fprintf(stderr, "failed to create gbm bo\n");
       ret = -1;
       goto unmake_current;
     }
     handle = gbm_bo_get_handle(bo[i]).u32;
     stride = gbm_bo_get_stride(bo[i]);
     image[i] = eglCreateImage(dpy, NULL, EGL_NATIVE_PIXMAP_KHR,
				  bo[i], NULL);
     if (image[i] == EGL_NO_IMAGE) {
       fprintf(stderr, "failed to create egl image\n");
       ret = -1;
       goto destroy_gbm_bo;
     }
#ifdef GL_OES_EGL_image
     glEGLImageTargetRenderbufferStorageOES(GL_RENDERBUFFER, image[i]);
#else
     fprintf(stderr, "GL_OES_EGL_image was not found at compile time\n");
#endif
     ret = drmModeAddFB(fd,
			kms.mode.hdisplay, kms.mode.vdisplay,
			24, 32, stride, handle, &kms.fb_id[i]);
     if (ret) {
       fprintf(stderr, "failed to create fb\n");
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
       fprintf(stderr, "framebuffer not complete: %x\n", ret);
       ret = 1;
       goto rm_rb;
     }
     render_stuff(kms.mode.hdisplay, kms.mode.vdisplay);
     ret = drmModePageFlip(fd, kms.encoder->crtc_id,
			   kms.fb_id[current],
			   DRM_MODE_PAGE_FLIP_EVENT, 0);
     if (ret) {
       fprintf(stderr, "failed to page flip: %m\n");
       goto free_saved_crtc;
     }
     FD_ZERO(&rfds);
     FD_SET(fd, &rfds);
     while (select(fd + 1, &rfds, NULL, NULL, NULL) == -1)
       NULL;
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
      fprintf(stderr, "failed to restore crtc: %m\n");
   }
free_saved_crtc:
   drmModeFreeCrtc(saved_crtc);
rm_rb:
   glFramebufferRenderbuffer(GL_FRAMEBUFFER,
			     GL_COLOR_ATTACHMENT0,
			     GL_RENDERBUFFER, 0);
   glBindRenderbuffer(GL_RENDERBUFFER, 0);
   glDeleteRenderbuffers(2, color_rb);
rm_fb:
   for (i = 0; i < 2; i++) {
     drmModeRmFB(fd, kms.fb_id[i]);
     eglDestroyImage(dpy, image[i]);
   }
destroy_gbm_bo:
   for (i = 0; i < 2; i++)
     gbm_bo_destroy(bo[i]);
unmake_current:
   eglMakeCurrent(dpy, EGL_NO_SURFACE, EGL_NO_SURFACE, EGL_NO_CONTEXT);
destroy_context:
   eglDestroyContext(dpy, ctx);
egl_terminate:
   eglTerminate(dpy);
close_fd:
   close(fd);

    // Destroy the pool for cleanliness.
    apr_pool_destroy(pool);
    pool = NULL;

    apr_terminate();
   return ret;
}
