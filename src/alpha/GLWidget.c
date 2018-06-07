#include "GLWidget.h"
#include "graph/Surface.h"
#include "graph/Color.h"
#include "alpha/CubeMan.h"
#include "alpha/Maths.h"
// TODO Blocks in foreground are rendered improperly relative to the projection matrix.
#include <stdio.h>
#include <stdlib.h>
#include <GL/gl.h>
#include <GL/glext.h>

static void renderWidget(void* widgetPtr, void* renderData)
{
    alpha_RenderData* rd = renderData;
    alpha_GLWidget_render(widgetPtr, rd->width, rd->height);
}

static void paintWidget(void* widgetPtr, void* renderData)
{
    alpha_GLWidget_paint(widgetPtr);
}

#define SWARM_SIZE 100

// test version 1.0
alpha_GLWidget* alpha_GLWidget_new(parsegraph_Surface* surface)
{
    if(!surface) {
        fprintf(stderr, "alpha_GLWidget_new must be given a non-null parsegraph_Surface.\n");
        abort();
    }

    alpha_GLWidget* widget = malloc(sizeof(*widget));
    widget->surface = surface;
    parsegraph_Surface_addPainter(surface, paintWidget, widget);
    parsegraph_Surface_addRenderer(surface, renderWidget, widget);

    parsegraph_Color_SetRGBA(widget->backgroundColor, 0, 47/255, 57/255, 1);

    widget->camera = alpha_Camera_new(surface->pool);

    // Set the field of view.
    alpha_Camera_SetFovX(widget->camera, 60);
    //alpha_Camera_SetProperFOV(widget->camera, 2, 2);

    // Set the camera's near and far distance.
    alpha_Camera_SetFarDistance(widget->camera, 150);
    alpha_Camera_SetNearDistance(widget->camera, 1);

    widget->paintingDirty = 1;

    //alpha_Camera_PitchDown(widget->camera, 40 * 3.14159 / 180);

    widget->input = alpha_Input_new(surface, widget->camera);
    alpha_Input_SetMouseSensitivity(widget->input, .4);

    widget->done = 0;
    widget->time = 0;

    widget->BlockTypes = alpha_BlockTypes_new(surface->pool);
    alpha_standardBlockTypes(surface->pool, widget->BlockTypes);
    alpha_CubeMan(widget->BlockTypes);

    alpha_BlockType* cubeman = alpha_BlockTypes_GetByName(widget->BlockTypes, "blank", "cubeman");

    widget->testCluster = alpha_Cluster_new(surface->pool, widget);
    float cubemanpos[] = {0, 5, 0};
    alpha_Cluster_CreateBlock(widget->testCluster, cubeman, cubemanpos, 0);

    alpha_BlockType* stone = alpha_BlockTypes_GetByName(widget->BlockTypes, "stone", "cube");
    alpha_BlockType* grass = alpha_BlockTypes_GetByName(widget->BlockTypes, "grass", "cube");
    alpha_BlockType* dirt = alpha_BlockTypes_GetByName(widget->BlockTypes, "dirt", "cube");

    widget->originCluster = alpha_Cluster_new(surface->pool, widget);
    //float stonepos[4] = float[]{0, 0, -50};
    //alpha_Cluster_CreateBlock(widget->originCluster, stone, stonepos, 0);

    widget->platformCluster = alpha_Cluster_new(surface->pool, widget);
    widget->worldCluster = alpha_Cluster_new(surface->pool, widget);

    widget->playerCluster = alpha_Cluster_new(surface->pool, widget);

    for(int i = 0; i <= 2; ++i) {
        float pos[3] = {0, i, 0};
        alpha_Cluster_CreateBlock(widget->playerCluster, grass, pos, 0);
    }

    {
        float playerpos[4] = {-1, 3, 0};
        alpha_Cluster_CreateBlock(widget->playerCluster, grass, playerpos, 16); // left
    }

    {
        float playerpos[4] = {0, 4, 0};
        alpha_Cluster_CreateBlock(widget->playerCluster, grass, playerpos, 12); // head
    }

    {
        float playerpos[4] = {1, 3, 0};
        alpha_Cluster_CreateBlock(widget->playerCluster, grass, playerpos, 8); // right
    }

    int WORLD_SIZE = 30;
    for(int i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(int j = 1; j <= WORLD_SIZE * 2; ++j) {
            int r = alpha_random(0, 23);
            alpha_BlockType* bt = alpha_random(0, 1) == 0 ? grass : stone;
            float pos[3] = {i, -1, -j};
            alpha_Cluster_CreateBlock(widget->worldCluster, bt, pos, r);
        }
    }

    for(int i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(int j = 1; j <= WORLD_SIZE * 2; ++j) {
            int r = alpha_random(0, 23);
            float pos[3] = {i, -1, -30};
            alpha_Cluster_CreateBlock(widget->worldCluster, stone, pos, r);
        }
    }

    // build a platform

    for(int i = -3; i <= 3; ++i) {
        for(int j = -4; j <= 4; ++j) {
            float pos[3] = {j, 0, -i};
            alpha_Cluster_CreateBlock(widget->platformCluster, grass, pos, 0);
        }
    }

    widget->evPlatformCluster = alpha_Cluster_new(surface->pool, widget);
    for(int i = -2; i <= 2; ++i) {
        for(int j = 3; j <= 4; ++j) {
            float pos[3] = {j, 1, i};
            alpha_Cluster_CreateBlock(widget->evPlatformCluster, dirt, pos, 0);
        }
    }

    widget->orbit = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
    alpha_Physical_SetPosition(widget->orbit, 0, 0, 0);
    alpha_Physical* elevator = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
    alpha_Physical_SetPosition(elevator, 0, 5, 0);

    alpha_Camera_SetParent(widget->camera, alpha_PhysicalType_CAMERA, widget->camera);
    widget->playerAPhysical = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
    widget->playerBPhysical = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
    widget->offsetPlatformPhysical = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);



    alpha_Physical_SetParent(widget->offsetPlatformPhysical, alpha_PhysicalType_CAMERA, widget->camera);
    alpha_Physical_SetParent(widget->playerAPhysical, alpha_PhysicalType_PHYSICAL, widget->offsetPlatformPhysical);
    alpha_Physical_SetParent(widget->playerBPhysical, alpha_PhysicalType_CAMERA, widget->camera );

    alpha_Camera_SetParent(widget->camera, alpha_PhysicalType_PHYSICAL, widget->playerBPhysical);

    alpha_Physical_SetPosition(widget->playerAPhysical, 10,1,0);

    alpha_Physical_SetPosition(widget->playerBPhysical, 0,0,-3);

    alpha_Physical_SetPosition(widget->offsetPlatformPhysical, 0,0,-25);
    alpha_Physical_YawLeft(widget->offsetPlatformPhysical, 0);
    alpha_Physical_RollRight(widget->offsetPlatformPhysical, 0);


    widget->spherePhysical = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
    alpha_Physical_SetPosition(widget->spherePhysical, 45,0,0);

    float radius = 8;
    widget->sphereCluster = alpha_Cluster_new(surface->pool, widget);

    // first circle about the x-axis
    float rot = 0;
    for(int i=0; i < 24; ++i) {
        float pos[] = {1, 0, 0};
        float* q = alpha_QuaternionFromAxisAndAngle(surface->pool, pos, rot * 3.14159 / 180);
        rot += 15;
        float* p = alpha_Quaternion_RotatedVectorEach(q, surface->pool, 0,0,-radius);
        alpha_Cluster_CreateBlock(widget->sphereCluster, stone, p, 0);
    }

    rot = 0;
    for(int i=0; i < 24; ++i) {
        float pos[] = {0, 1, 0};
        float* q = alpha_QuaternionFromAxisAndAngle(surface->pool, pos, rot * 3.14159 / 180);
        rot += 15;

        float* p = alpha_Quaternion_RotatedVectorEach(q, surface->pool, 0,0,-radius);
        alpha_Cluster_CreateBlock(widget->sphereCluster, stone, p, 0);
    }

    float* spot = alpha_Vector_create(surface->pool, 0,15,35);
    widget->swarm = malloc(sizeof(alpha_Physical*)*SWARM_SIZE);
    for(int i = 0; i < 100; ++i) {
        widget->swarm[i] = alpha_Physical_new(surface->pool, alpha_PhysicalType_CAMERA, widget->camera);
        float x = alpha_random(1, 30);
        float y = alpha_random(1, 30);
        float z = alpha_random(1, 30);
        alpha_Physical_CopyPosition(widget->swarm[i], alpha_Vector_AddedEach(surface->pool, spot, x, y, z));

        x = alpha_random(-100,100)/100;
        y = alpha_random(-100,100)/100;
        z = alpha_random(-100,100)/100;
        float w = alpha_random(-100,100)/100;
        float* q = alpha_QuaternionFromAxisAndAngleEach(surface->pool, x, y, z, w);

        alpha_Quaternion_Normalize(q);
        alpha_Physical_SetOrientation(widget->swarm[i], q[3], q[0], q[1], q[2]);
    }

    widget->time = 0;
    return widget;
}; // alpha_GLWidget_new

void alpha_GLWidget_paint(alpha_GLWidget* widget)
{
    if(!widget->paintingDirty) {
        return;
    }
    alpha_Cluster_CalculateVertices(widget->evPlatformCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->testCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->originCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->playerCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->worldCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->platformCluster, widget->BlockTypes);
    alpha_Cluster_CalculateVertices(widget->sphereCluster, widget->BlockTypes);
    widget->paintingDirty = 0;
}

void alpha_GLWidget_Tick(alpha_GLWidget* widget, float elapsed)
{
    widget->time += elapsed;
    alpha_Input_Update(widget->input, elapsed);

    for(int i = 0; i < SWARM_SIZE; ++i) {
        alpha_Physical* v = widget->swarm[i];
        if(widget->time < 6) {
            alpha_Physical_MoveForward(v, elapsed);
            alpha_Physical_YawRight(v, 2 * 3.14159 / 180);
        }
        else {
            alpha_Physical_PitchDown(v, 1 * 3.14159 / 180);
            alpha_Physical_YawRight(v, 2 * 3.14159 / 180);
            alpha_Physical_GetPosition(v);
            alpha_Physical_ChangeEachPosition(v, 0, -.2 ,0);
        }
    }

    alpha_Physical_Rotate(widget->orbit, -.01, 0, 1, 0);
    //alpha_Physical_Dump(widget->offsetPlatformPhysical);
    alpha_Physical_MoveLeft(widget->offsetPlatformPhysical, elapsed );
    alpha_Physical_YawLeft(widget->offsetPlatformPhysical, .1 * 3.14159 / 180.0f);
    //alpha_Physical_Dump(widget->offsetPlatformPhysical);

    //fprintf(stderr, "Cam: %d\n", alpha_Camera_GetOrientation(widget->camera));
}

void alpha_GLWidget_setBackground(alpha_GLWidget* widget, float* c)
{
    alpha_Color_Copy(widget->backgroundColor, c);

    // Make it simple to change the background color; do not require a
    // separate call to scheduleRepaint.
    alpha_GLWidget_scheduleRepaint(widget);
}

void alpha_GLWidget_setBackgroundRGBA(alpha_GLWidget* widget, float r, float g, float b, float a)
{
    float c[4] = {r, g, b, a};
    alpha_GLWidget_setBackground(widget, c);
}

void alpha_GLWidget_scheduleRepaint(alpha_GLWidget* widget)
{
    widget->paintingDirty = 1;
    parsegraph_Surface_scheduleRepaint(widget->surface);
}

float* alpha_GLWidget_backgroundColor(alpha_GLWidget* widget)
{
    return widget->backgroundColor;
}

alpha_Camera* alpha_GLWidget_Camera(alpha_GLWidget* widget)
{
    return widget->camera;
}

void alpha_GLWidget_render(alpha_GLWidget* widget, int renderWidth, int renderHeight)
{
    //fprintf(stderr, "RENDERING %d %d. \n[", renderWidth, renderHeight);
    float* projection = alpha_Camera_UpdateProjection(widget->camera, renderWidth, renderHeight);
    /*for(int i = 0; i < 16; ++i) {
        fprintf(stderr, "%f", projection[i]);
        if(i < 15) {
            fprintf(stderr, ", ");
            if((1+i) % 4 == 0 && i > 0) {
                fprintf(stderr, "\n");
            }
        }
    }
    fprintf(stderr, "]\n");*/

    // float* fullcam = boat:Inverse() * player:Inverse() * Bplayer:Inverse() * cam:Inverse()

    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);

    parsegraph_Surface* surface = widget->surface;

    alpha_Cluster_Draw(widget->playerCluster, widget->BlockTypes,
        alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(widget->playerAPhysical, 0), projection)
    );

    //fprintf(stderr, "this.camera.GetViewMatrix() * projection:\n" + viewMatrix.toString());
    //console.log(this.camera.GetViewMatrix().toString());
    float* viewMatrix = alpha_RMatrix4_Multiplied(surface->pool, alpha_Camera_GetViewMatrix(widget->camera, 0), projection);
    alpha_Cluster_Draw(widget->worldCluster, widget->BlockTypes, viewMatrix);

    for(int i = 0; i < SWARM_SIZE; ++i) {
        alpha_Physical* v = widget->swarm[i];
        alpha_Cluster_Draw(
            widget->testCluster, widget->BlockTypes,
            alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(v, 0), projection)
        );
        //widget->worldCluster.Draw(v.GetViewMatrix().Multiplied(projection));
    }


    //console.log(projection.toString());
    //console.log(this.offsetPlatformPhysical.GetViewMatrix().toString());
    float* platformMatrix = alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(widget->offsetPlatformPhysical, 0), projection);
    alpha_Cluster_Draw(
        widget->platformCluster, widget->BlockTypes,
        platformMatrix
    );
    alpha_Cluster_Draw(
        widget->evPlatformCluster, widget->BlockTypes,
        platformMatrix
    );


    alpha_Cluster_Draw(
        widget->playerCluster, widget->BlockTypes,
        alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(widget->playerAPhysical, 0), projection)
    );
    alpha_Cluster_Draw(
        widget->testCluster, widget->BlockTypes,
        alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(widget->playerBPhysical, 0), projection)
    );

    alpha_Cluster_Draw(
        widget->sphereCluster, widget->BlockTypes,
        alpha_RMatrix4_Multiplied(surface->pool, alpha_Physical_GetViewMatrix(widget->spherePhysical, 0), projection)
    );
}
