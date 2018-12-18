/*
based on: 
 
https://github.com/JoakimSoderberg/mesademos/blob/master/src/osdemos/osdemo32.c
*/

#include <stdio.h>
#include <stdlib.h>
#include <GL/osmesa.h>
#include <GL/glu.h>     //replaced by default header in linux
#include "graph/log.h"
#include "graph/Surface.h"
#include "graph/Input.h"
#include "die.h"
#include "timing.h"

#define SAVE_TARGA

int WIDTH = 1600;
int HEIGHT = 1200;

struct parsegraph_Environment {
apr_pool_t* pool;
parsegraph_Surface* surface;
int needsRender;
int needInit;
int needToFocus;
int needToBlur;
int width;
int height;
parsegraph_Input* input;
struct timespec start;
int argc;
const char* const* argv;
OSMesaContext ctx;
GLfloat* buffer;
};
typedef struct parsegraph_Environment parsegraph_Environment;

// These functions must be defined by applications; they are not defined here.
parsegraph_Surface* parsegraph_init(void*, int, int, int, const char* const*);
void parsegraph_stop(parsegraph_Surface* surf);

static volatile int quit = 0;

parsegraph_Environment* parsegraph_Environment_new(int width, int height, int argc, const char* const* argv)
{
    parsegraph_VFLIP = 0;

    apr_pool_t* pool;
    if(APR_SUCCESS != apr_pool_create(&pool, 0)) {
        parsegraph_die("Failed to create environment pool");
    }
    parsegraph_Environment* env = apr_palloc(pool, sizeof(*env));
    env->pool = pool;
    env->argc = argc;
    env->argv = argv;
    env->surface = 0;
    env->input = 0;
    env->needInit = 1;

    env->width = width;
    env->height = height;

    env->needToFocus = 0;
    env->needToBlur = 0;
    env->needsRender = 1;

    env->ctx = OSMesaCreateContextExt( GL_RGBA, 24, 0, 0, NULL );
    if(!env->ctx) {
        parsegraph_die("Failed to create OSMesa context.");
    }

    env->buffer = (GLfloat*)apr_palloc(pool, env->width * env->height * 4 * sizeof(GLfloat));

    return env;
}

void parsegraph_Environment_destroy(parsegraph_Environment* env)
{
    if(env->surface) {
        parsegraph_stop(env->surface);
    }

    /* destroy the context */
    OSMesaDestroyContext(env->ctx );

    apr_pool_destroy(env->pool);
}

void parsegraph_Surface_scheduleRepaint(parsegraph_Surface* surface)
{
    parsegraph_Environment* env = surface->peer;
    env->needsRender = 1;
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

    if(env->input) {
        parsegraph_Input_setNoInput(env->input);
    }

    float defaultScale = .25;
    parsegraph_Camera* cam = givenInput->_camera;
    //parsegraph_Camera_project(cam);
    parsegraph_Camera_setDefaultOrigin(cam,
        parsegraph_Surface_getWidth(surface) / (2 * defaultScale),
        parsegraph_Surface_getHeight(surface) / (2 * defaultScale)
    );
    parsegraph_Camera_setScale(cam, defaultScale);
    givenInput->cursorScreenPos[0] = parsegraph_Surface_getWidth(surface) / 2;
    givenInput->cursorScreenPos[1] = parsegraph_Surface_getHeight(surface) / 2;
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
render_stuff(parsegraph_Environment* env)
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

    //parsegraph_log("Running animation callbacks\n");
    if(env->needsRender) {
        //glFramebufferRenderbuffer(
            //GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, fb->color_rb
        //);
        //int ret;
        //if((ret = glCheckFramebufferStatus(GL_FRAMEBUFFER)) != GL_FRAMEBUFFER_COMPLETE) {
            //parsegraph_die("Framebuffer must be complete: %x\n", ret);
        //}
        if(env->surface) {
            parsegraph_Surface_runAnimationCallbacks(env->surface, elapsed);
            parsegraph_Surface_render(env->surface, 0);
        }
        glFinish();
        //glFinish();
        env->needsRender = 0;
    }
}

void parsegraph_logcurses(const char* fmt, va_list ap)
{
    vfprintf(stderr, fmt, ap);
    //vwprintw(stdscr, fmt, ap);
    //refresh();
}

static void
write_targa(const char *filename, const GLfloat *buffer, int width, int height)
{
   FILE *f = fopen( filename, "w" );
   if (f) {
      int i, x, y;
      const GLfloat *ptr = buffer;
      printf ("osdemo, writing tga file \n");
      fputc (0x00, f);	/* ID Length, 0 => No ID	*/
      fputc (0x00, f);	/* Color Map Type, 0 => No color map included	*/
      fputc (0x02, f);	/* Image Type, 2 => Uncompressed, True-color Image */
      fputc (0x00, f);	/* Next five bytes are about the color map entries */
      fputc (0x00, f);	/* 2 bytes Index, 2 bytes length, 1 byte size */
      fputc (0x00, f);
      fputc (0x00, f);
      fputc (0x00, f);
      fputc (0x00, f);	/* X-origin of Image	*/
      fputc (0x00, f);
      fputc (0x00, f);	/* Y-origin of Image	*/
      fputc (0x00, f);
      fputc (WIDTH & 0xff, f);      /* Image Width	*/
      fputc ((WIDTH>>8) & 0xff, f);
      fputc (HEIGHT & 0xff, f);     /* Image Height	*/
      fputc ((HEIGHT>>8) & 0xff, f);
      fputc (0x18, f);		/* Pixel Depth, 0x18 => 24 Bits	*/
      fputc (0x20, f);		/* Image Descriptor	*/
      fclose(f);
      f = fopen( filename, "ab" );  /* reopen in binary append mode */
      for (y=height-1; y>=0; y--) {
         for (x=0; x<width; x++) { int r, g, b; i = (y*width + x) * 4; r = (int) (ptr[i+0] * 255.0); g = (int) (ptr[i+1] * 255.0); b = (int) (ptr[i+2] * 255.0); if (r > 255) r = 255;
            if (g > 255) g = 255;
            if (b > 255) b = 255;
            fputc(b, f); /* write blue */
            fputc(g, f); /* write green */
            fputc(r, f); /* write red */
         }
      }
   }
}

void draw_dev(parsegraph_Environment* env)
{
    if (!OSMesaMakeCurrent( env->ctx, env->buffer, GL_FLOAT, env->width, env->height)) {
      printf("OSMesaMakeCurrent failed!\n");
      return;
    }
    glEnable(GL_MULTISAMPLE);

    //printf("GL Vendor: %s\n", glGetString(GL_VENDOR));
    //printf("GL Renderer: %s\n", glGetString(GL_RENDERER));
    //printf("GL Version: %s\n", glGetString(GL_VERSION));
    //printf("GL Shader language: %s\n", glGetString(GL_SHADING_LANGUAGE_VERSION));
    //printf("GL Extensions: %s\n", glGetString(GL_EXTENSIONS));
    //printf("\n");

    if(env->needInit) {
        env->surface = parsegraph_init(env, env->width, env->height, env->argc, env->argv);
        env->needInit = 0;
    }

    // Actually render this environment.
    if(env->surface) {
        parsegraph_Surface_setDisplaySize(env->surface, env->width, env->height);
    }
    render_stuff(env);
}

void loop(parsegraph_Environment* env)
{
    // Start the environment's loop.
    clock_gettime(CLOCK_REALTIME, &env->start);
    draw_dev(env);
}

static parsegraph_Environment* env = 0;

static int has_shutdown = 0;

void parsegraph_shutdown()
{
    //parsegraph_log("Quitting\n");
    if(has_shutdown) {
        return;
    }
    has_shutdown = 1;

    // Destroy the environment.
    parsegraph_Environment_destroy(env);

    // Close APR.
    apr_terminate();
    exit(0);
}

int main( int argc, const char * const argv[] )
{
    // Initialize the APR.
    apr_status_t rv;
    rv = apr_app_initialize(&argc, &argv, NULL);
    if(rv != APR_SUCCESS) {
        parsegraph_die("Failed initializing APR. APR status of %d.\n", rv);
    }

    int argp = 1;
    if(argc > 2) {
        sscanf(argv[1], "%dx%d", &WIDTH, &HEIGHT);
        ++argp;
    }

    // Create the environment.
    env = parsegraph_Environment_new(WIDTH, HEIGHT, argc, argv);

    // Run the environment's loop.
    loop(env);
 
   if (argc>1) {
#ifdef SAVE_TARGA
      write_targa(argv[argp], env->buffer, WIDTH, HEIGHT);
#else
      write_ppm(argv[argp], env->buffer, WIDTH, HEIGHT);
#endif
   }
   else {
      printf("Specify a filename if you want to make an image file\n");
   }
 
   printf("all done\n");
 
    parsegraph_shutdown();
 
   return 0;
}
