#ifndef alpha_GLWidget_INCLUDED
#define alpha_GLWidget_INCLUDED

#include <apr_pools.h>
#include "graph/Surface.h"
#include "alpha/Cam.h"
#include "alpha/Input.h"
#include "alpha/BlockIDs.h"
#include "alpha/Cluster.h"

struct alpha_GLWidget {
int done;
alpha_Physical* orbit;
alpha_Physical* playerAPhysical;
alpha_Physical* playerBPhysical;
alpha_Physical* offsetPlatformPhysical;
alpha_Physical* spherePhysical;
parsegraph_Surface* surface;
int paintingDirty;
float backgroundColor[4];
alpha_Camera* camera;
alpha_Input* input;
alpha_BlockTypes* BlockTypes;
alpha_Cluster* sphereCluster;
alpha_Cluster* testCluster;
alpha_Cluster* originCluster;
alpha_Cluster* platformCluster;
alpha_Cluster* worldCluster;
alpha_Cluster* playerCluster;
alpha_Cluster* evPlatformCluster;
alpha_Physical** swarm;
float time;
};
typedef struct alpha_GLWidget alpha_GLWidget;

alpha_GLWidget* alpha_GLWidget_new(parsegraph_Surface* surface);
void alpha_GLWidget_destroy(alpha_GLWidget* widget);
void alpha_GLWidget_paint(alpha_GLWidget* widget);
void alpha_GLWidget_Tick(alpha_GLWidget* widget, float elapsed);
void alpha_GLWidget_setBackground(alpha_GLWidget* widget, float* c);
void alpha_GLWidget_setBackgroundRGBA(alpha_GLWidget* widget, float r, float g, float b, float a);
void alpha_GLWidget_scheduleRepaint(alpha_GLWidget* widget);
float* alpha_GLWidget_backgroundColor(alpha_GLWidget* widget);
alpha_Camera* alpha_GLWidget_Camera(alpha_GLWidget* widget);
void alpha_GLWidget_render(alpha_GLWidget* widget, int renderWidth, int renderHeight);

struct alpha_RenderData {
float width;
float height;
};
typedef struct alpha_RenderData alpha_RenderData;

#endif // alpha_GLWidget_INCLUDED
