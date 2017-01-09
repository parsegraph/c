function alpha_GLWidget()
{
    this._backgroundColor = new alpha_Color(0, 47/255, 57/255);

    this._container = document.createElement("div");
    this._container.className = "alpha_GLWidget";

    // The canvas that will be drawn to.
    this._canvas = document.createElement("canvas");
    this._canvas.style.display = "block";
    this._container.tabIndex = 0;
    this._gl = this._canvas.getContext("experimental-webgl");
    if(this._gl == null) {
        this._gl = this._canvas.getContext("webgl");
        if(this._gl == null) {
            throw new Error("GL context is not supported");
        }
    }

    this._container.appendChild(this._canvas);

    this.camera = new alpha_Camera(this);

    // The identifier used to cancel a pending Render.
    this._pendingRender = null;
    this._needsRepaint = true;

    this._done = false;

var BlockTypes = new alpha_BlockTypes();
alpha_standardBlockTypes(BlockTypes);
alpha_CubeMan(BlockTypes);


// test version 1.0
var cubeman = BlockTypes.Get("blank", "cubeman");

var testCluster = new alpha_Cluster(BlockTypes);
testCluster.AddBlock(new alpha_Block(cubeman, 0,5,0,1));
testCluster.CalculateVertices();

var stone = BlockTypes.Get("stone", "cube");
var grass = BlockTypes.Get("grass", "cube");
var dirt = BlockTypes.Get( "dirt", "cube");

var platform = new alpha_Cluster(BlockTypes);
var world = new alpha_Cluster(BlockTypes)

var playerCluster = new alpha_Cluster(BlockTypes);

for(var i = 0; i <= 2; ++i) {
    playerCluster.AddBlock(new alpha_Block(grass,0,i,0,1));
}

playerCluster.AddBlock(new alpha_Block(grass,-1,3,0,17)); // left

playerCluster.AddBlock(new alpha_Block(grass, 0,4,0, 13)); // head

playerCluster.AddBlock(new alpha_Block(grass, 1, 3, 0,9)); // right
playerCluster.CalculateVertices();


for(var i = -15; i <= 15; ++i) {
    for(var j = 1; j <= 30; ++j) {
        var r = alpha_random(0, 23);
        world.AddBlock(new alpha_Block(stone, i,-1,-j,r));
    }
}

for(var i = -15; i <= 15; ++i) {
    for(var j = 0; j <= 8; ++j) {
        var r = alpha_random(0, 23);
        world.AddBlock(new alpha_Block(stone, i,-1,-30,r));
    }
}
world.CalculateVertices();

// build a platform

for(var i = -3; i <= 3; ++i) {
    for(var j = -4; j <= 4; ++j) {
        platform.AddBlock(new alpha_Block(grass,j,0,-i,1));
    }
}
platform.CalculateVertices();


var evPlatform = new alpha_Cluster(BlockTypes);
for(var i = -2; i <= 2; ++i) {
    for(var j = 3; j <= 4; ++j) {
        evPlatform.AddBlock(new alpha_Block(dirt, j, 1, i, 1));
    }
}
evPlatform.CalculateVertices();

this.input = new alpha_Input(this);
this.input.SetMouseSensitivity(.4);


var radius = 8;

this.camera.SetFovX(60);
// this.camera.SetProperFOV(2,2);
this.camera.SetNearDistance(.01);
this.camera.SetFarDistance(150);
this.camera.SetNearDistance(1);
this.camera.SetPosition(0,0,0);
this.camera.SetOffset(0,4,0);

//this.camera.PitchDown(40 * Math.PI / 180);




var orbit = new alpha_Physical(this.camera);
orbit.SetPosition(0,0, 0);
var elevator = new alpha_Physical(this.camera);
elevator.SetPosition(0,5,0);


this.camera.SetParent(this.camera);
var playerA = new alpha_Physical( this.camera );
var playerB = new alpha_Physical( this.camera );
var offsetPlatform = new alpha_Physical( this.camera );



offsetPlatform.SetParent( this.camera );
playerA.SetParent( offsetPlatform );
playerB.SetParent( this.camera );

this.camera.SetParent( playerB );

playerA.SetPosition(10,1,0);



playerB.SetPosition(0,0,-3);

offsetPlatform.SetPosition(0,0,-25);
offsetPlatform.YawLeft(0);
offsetPlatform.RollRight(0);


var sphere = new alpha_Physical(this.camera);
sphere.SetPosition(45,0,0);

var sphereC = new alpha_Cluster(BlockTypes);

// first circle about the x-axis
var rot = 0;
for(var i=0; i < 24; ++i) {
    var q = alpha_QuaternionFromAxisAndAngle(1,0,0,rot * Math.PI / 180);
    rot += 15;
    var p = q.RotatedVector(0,0,-radius);
    sphereC.AddBlock(new alpha_Block(stone, p, 1));
}

rot = 0;
for(var i=0; i < 24; ++i) {
    var q = alpha_QuaternionFromAxisAndAngle(0,1,0,rot * Math.PI / 180);
    rot += 15;

    var p = q.RotatedVector(0,0,-radius);
    sphereC.AddBlock(new alpha_Block(stone, p, 1));
}

sphereC.CalculateVertices();


var spot = new alpha_Vector(0,15,35);
var swarm = [];
for(var i = 0; i <= 100; ++i) {
    swarm.push(new alpha_Physical(this.camera));
    var x = alpha_random(1, 30);
    var y = alpha_random(1, 30);
    var z = alpha_random(1, 30);
    swarm[i].SetPosition(spot.Added(x, y, z));

    var x = alpha_random(-100,100)/100;
    var y = alpha_random(-100,100)/100;
    var z = alpha_random(-100,100)/100;
    var w = alpha_random(-100,100)/100;
    var q = new alpha_Quaternion(x,y,z,w);
    q.Normalize();
    swarm[i].SetOrientation(q);
}


var fov = this.camera.GetFovX() * 180 / Math.PI;
var timer = 0;
this.Tick = function(elapsed)
{
    timer = timer + elapsed;
    if(this.input.Get("SHIFT") > 0) {
        elapsed = elapsed * 10;
    }

    if(this.input.Get("SHIFT") > 0) {
        elapsed = elapsed / 10;
    }



    this.camera.TurnLeft(this.input.Get("LeftMouseButton") * this.input.MouseLeft() * elapsed);
    this.camera.TurnRight(this.input.Get("LeftMouseButton") * this.input.MouseRight() * elapsed );
    this.camera.PitchUp(this.input.Get("LeftMouseButton") * this.input.MouseUp() * elapsed );
    this.camera.PitchDown(this.input.Get("LeftMouseButton") * this.input.MouseDown() * elapsed );
    this.camera.MoveForward(this.input.MouseWheelDegreesUp() * elapsed);
    this.camera.MoveBackward(this.input.MouseWheelDegreesDown() * elapsed);
    this.camera.ZoomIn(this.input.Get("Y"), elapsed);
    this.camera.ZoomOut(this.input.Get("H"), elapsed);



    this.camera.GetParent().MoveForward( this.input.Get("W") * elapsed );
    this.camera.GetParent().MoveBackward( this.input.Get("S") * elapsed );
    this.camera.GetParent().MoveLeft( this.input.Get("A") * elapsed );
    this.camera.GetParent().MoveRight( this.input.Get("D") * elapsed );
    this.camera.GetParent().MoveUp( this.input.Get("SPACE") * elapsed );
    this.camera.GetParent().MoveDown( this.input.Get("SHIFT") * elapsed );


    this.camera.GetParent().YawLeft( this.input.Get("J") * elapsed );
    this.camera.GetParent().YawRight( this.input.Get("L") * elapsed );
    this.camera.GetParent().PitchUp( this.input.Get("K") * elapsed );
    this.camera.GetParent().PitchDown( this.input.Get("I") * elapsed );
    this.camera.GetParent().RollLeft( this.input.Get("U") * elapsed );
    this.camera.GetParent().RollRight(this.input.Get("O") * elapsed );


    if(this.input.Get("RightMouseButton") > 0) {
        if(!this._done) {
            this.camera.AlignParentToMy(false, true);
            this._done = true;
        }
    }
    else {
        this._done = false;
    }


    this.printOnce(this.input.Get("RETURN"));




    var ymin;
    for(var i = 0; i < swarm.length; ++i) {
        var v = swarm[i];
        if(timer < 6) {
            v.MoveForward(elapsed);
            v.YawRight(2 * Math.PI / 180);
        }
        else {
            v.PitchDown(1 * Math.PI / 180);
            v.YawRight(2 * Math.PI / 180);
            var y = v.GetPosition()[1];
            v.ChangePosition(0, -.2 ,0);
        }
    }



    orbit.Rotate(-.01, 0, 1, 0);
    offsetPlatform.MoveLeft( elapsed );
    offsetPlatform.YawLeft(.1 * Math.PI / 180);


    // print("Cam", this.camera.orientation);
    // print(offsetPlatform.position);


    this.scheduleRepaint();

    this.input.Update();
}; // Tick

}; // alpha_GLWidget

alpha_GLWidget.prototype.setBackground = function()
{
    if(arguments.length > 1) {
        var c = new alpha_Color();
        c.Set.apply(c, arguments);
        return this.setBackground(c);
    }
    this._backgroundColor = arguments[0];

    // Make it simple to change the background color; do not require a
    // separate call to scheduleRepaint.
    this.scheduleRepaint();
};

/**
 * Retrieves the current background color.
 */
alpha_GLWidget.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

alpha_GLWidget.prototype.camera = function()
{
    return this._camera;
};

alpha_GLWidget.prototype.canvas = function()
{
    return this._canvas;
};

alpha_GLWidget.prototype.gl = function()
{
    return this._gl;
};

/**
 * Returns the container for this scene.
 */
alpha_GLWidget.prototype.container = function()
{
    return this._container;
};

alpha_GLWidget.prototype.connect = function(eventName, callback, thisArg)
{

};

/**
 * Schedules a repaint. Painting causes the scene
 * graph to be rebuilt.
 */
alpha_GLWidget.prototype.scheduleRepaint = function()
{
    this.scheduleRender();
    this._needsRepaint = true;
};

alpha_GLWidget.prototype.cancelRepaint = function()
{
    this._needsRepaint = false;
};

/**
 * Schedules a render. Rendering draws the scene.
 *
 * Rendering will cause repainting if needed.
 */
alpha_GLWidget.prototype.scheduleRender = function()
{
    this._container.style.backgroundColor = this._backgroundColor.asRGB();

    if(this._pendingRender != null) {
        return;
    }
    var graph = this;
    this._pendingRender = requestAnimationFrame(function() {
        graph._pendingRender = null;
        if(graph._needsRepaint) {
            graph.paint();
            graph._needsRepaint = false;
        }

        graph.render();
    });
};

alpha_GLWidget.prototype.cancelRender = function()
{
    if(this._pendingRender != null) {
        cancelAnimationFrame(this._pendingRender);
        this._pendingRender = null;
    }
};

alpha_GLWidget.prototype.printOnce = function(bind)
{
    if(bind == 0) {
        this._done = false;
        return
    }
    if(this._done) {
        return;
    }
    this._done = true;

    playerA.SetScale(2,2,2);

    // print(player)

    // print(alpha_MatrixFromQuaternionAtVector(playerB.orientation, playerB.position ));

    // print( playerB.GetPosition() )
    // print( translation )
    // print( player.Multiplied(rotation.Inverse()) ); -- works;
    // print( player.Multiplied((cam.Multiplied(player)).Inverse()).Multiplied(rotation.Inverse()) );

    // print( rotation * translation * (cam * player):Inverse() )
    // print( player * cam )
};

/**
 * Fill memory buffers to prepare for rendering.
 */
alpha_GLWidget.prototype.paint = function()
{
};

/**
 * Render painted memory buffers.
 */
alpha_GLWidget.prototype.render = function()
{
    this.camera.UpdateProjection();

    this._gl.clearColor(
        0, 0, 0, 0
    );
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);

    // local fullcam = boat:Inverse() * player:Inverse() * Bplayer:Inverse() * cam:Inverse()



    this._gl.enable(this._gl.DEPTH_TEST);


    /*glLoadMatrix(camera.GetViewMatrix());
    world.Draw();
    for(var i = 0; i <= swarm.length; ++i) {
        var v = swarm[i];
        glLoadMatrix(v.GetViewMatrix());
        testCluster.Draw();
    }

    glLoadMatrix(offsetPlatform.GetViewMatrix());


    platform.Draw();
    evPlatform.Draw();


    glLoadMatrix(playerA.GetViewMatrix());
    playerCluster.Draw();


    glLoadMatrix(playerB.GetViewMatrix());
    testCluster.Draw();

    glLoadMatrix(sphere.GetViewMatrix());
    sphereC.Draw();*/

    if(typeof(this.afterRender) == "function") {
        this.afterRender();
    }
};

var alpha_startTime = new Date();
function alpha_GetTime()
{
    return new Date().getTime() - alpha_startTime.getTime();
};

