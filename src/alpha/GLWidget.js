// TODO Blocks in foreground are rendered improperly relative to the projection matrix.

// TODO Mouse input appears to be... strangely interpreted.

// test version 1.0
function alpha_GLWidget()
{
    // Allow surface to be created implicitly.
    var surface;
    if(arguments.length == 0) {
        surface = new parsegraph_Surface();
    }
    else {
        surface = arguments[0];
    }
    if(!surface) {
        throw new Error("Surface must be given");
    }
    this._surface = surface;

    this._canvas = surface._canvas;
    this._container = surface._container;

    this._surface.addPainter(this.paint, this);
    this._surface.addRenderer(this.render, this);

    this._backgroundColor = new alpha_Color(0, 47/255, 57/255);

    this.camera = new alpha_Camera(this);

    this.input = new alpha_Input(this);
    this.input.SetMouseSensitivity(.4);

    // Set the field of view.
    this.camera.SetFovX(60);
    // this.camera.SetProperFOV(2,2);

    // Set the camera's near and far distance.
    this.camera.SetFarDistance(150);
    this.camera.SetNearDistance(1);

    this.paintingDirty = true;

//this.camera.PitchDown(40 * Math.PI / 180);

    this._done = false;

    this.BlockTypes = new alpha_BlockTypes();
    alpha_standardBlockTypes(this.BlockTypes);
    alpha_CubeMan(this.BlockTypes);

    var cubeman = this.BlockTypes.Get("blank", "cubeman");

    this.testCluster = new alpha_Cluster(this);
    this.testCluster.AddBlock(cubeman, 0,5,0,0);

    var stone = this.BlockTypes.Get("stone", "cube");
    var grass = this.BlockTypes.Get("grass", "cube");
    var dirt = this.BlockTypes.Get("dirt", "cube");

    this.originCluster = new alpha_Cluster(this);
    //this.originCluster.AddBlock(stone,0,0,-50,0);

    this.platformCluster = new alpha_Cluster(this);
    this.worldCluster = new alpha_Cluster(this);

    this.playerCluster = new alpha_Cluster(this);

    for(var i = 0; i <= 2; ++i) {
        this.playerCluster.AddBlock(grass,0,i,0,0);
    }

    this.playerCluster.AddBlock(grass,-1,3,0,16); // left

    this.playerCluster.AddBlock(grass, 0,4,0, 12); // head

    this.playerCluster.AddBlock(grass, 1, 3, 0,8); // right

    var WORLD_SIZE = 30;
    for(var i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(var j = 1; j <= WORLD_SIZE * 2; ++j) {
            var r = alpha_random(0, 23);
            this.worldCluster.AddBlock([grass, stone][alpha_random(0, 1)], i,-1,-j,r);
        }
    }

    for(var i = -WORLD_SIZE; i <= WORLD_SIZE; ++i) {
        for(var j = 0; j <= WORLD_SIZE * 2; ++j) {
            var r = alpha_random(0, 23);
            this.worldCluster.AddBlock(stone, i,-1,-30,r);
        }
    }

    // build a platform

    for(var i = -3; i <= 3; ++i) {
        for(var j = -4; j <= 4; ++j) {
            this.platformCluster.AddBlock(grass,j,0,-i,0);
        }
    }


    this.evPlatformCluster = new alpha_Cluster(this);
    for(var i = -2; i <= 2; ++i) {
        for(var j = 3; j <= 4; ++j) {
            this.evPlatformCluster.AddBlock(dirt, j, 1, i, 0);
        }
    }




    this.orbit = new alpha_Physical(this.camera);
    this.orbit.SetPosition(0,0, 0);
    var elevator = new alpha_Physical(this.camera);
    elevator.SetPosition(0,5,0);


    this.camera.SetParent(this.camera);
    this.playerAPhysical = new alpha_Physical( this.camera );
    this.playerBPhysical = new alpha_Physical( this.camera );
    this.offsetPlatformPhysical = new alpha_Physical( this.camera );



    this.offsetPlatformPhysical.SetParent( this.camera );
    this.playerAPhysical.SetParent( this.offsetPlatformPhysical );
    this.playerBPhysical.SetParent( this.camera );

    this.camera.SetParent( this.playerBPhysical );

    this.playerAPhysical.SetPosition(10,1,0);



    this.playerBPhysical.SetPosition(0,0,-3);

    this.offsetPlatformPhysical.SetPosition(0,0,-25);
    this.offsetPlatformPhysical.YawLeft(0);
    this.offsetPlatformPhysical.RollRight(0);


    this.spherePhysical = new alpha_Physical(this.camera);
    this.spherePhysical.SetPosition(45,0,0);

    var radius = 8;
    this.sphereCluster = new alpha_Cluster(this);

    // first circle about the x-axis
    var rot = 0;
    for(var i=0; i < 24; ++i) {
        var q = alpha_QuaternionFromAxisAndAngle(1,0,0,rot * Math.PI / 180);
        rot += 15;
        var p = q.RotatedVector(0,0,-radius);
        this.sphereCluster.AddBlock(stone, p, 0);
    }

    rot = 0;
    for(var i=0; i < 24; ++i) {
        var q = alpha_QuaternionFromAxisAndAngle(0,1,0,rot * Math.PI / 180);
        rot += 15;

        var p = q.RotatedVector(0,0,-radius);
        this.sphereCluster.AddBlock(stone, p, 0);
    }



    var spot = new alpha_Vector(0,15,35);
    this.swarm = [];
    for(var i = 0; i < 100; ++i) {
        this.swarm.push(new alpha_Physical(this.camera));
        var x = alpha_random(1, 30);
        var y = alpha_random(1, 30);
        var z = alpha_random(1, 30);
        this.swarm[i].SetPosition(spot.Added(x, y, z));

        var x = alpha_random(-100,100)/100;
        var y = alpha_random(-100,100)/100;
        var z = alpha_random(-100,100)/100;
        var w = alpha_random(-100,100)/100;
        var q = new alpha_Quaternion(x,y,z,w);
        q.Normalize();
        this.swarm[i].SetOrientation(q);
    }

    this.time = 0;
}; // alpha_GLWidget

alpha_GLWidget.prototype.paint = function()
{
    if(!this.paintingDirty) {
        return;
    }
    this.evPlatformCluster.CalculateVertices();
    this.testCluster.CalculateVertices();
    this.originCluster.CalculateVertices();
    this.playerCluster.CalculateVertices();
    this.worldCluster.CalculateVertices();
    this.platformCluster.CalculateVertices();
    this.sphereCluster.CalculateVertices();
    this.paintingDirty = false;
};

alpha_GLWidget.prototype.Tick = function(elapsed)
{
    this.time += elapsed;

    if(this.input.Get("Shift") > 0) {
        elapsed = elapsed * 10;
    }

    if(this.input.Get("Shift") > 0) {
        elapsed = elapsed / 10;
    }

    //console.log("LeftMouseButton: " + this.input.Get("LeftMouseButton"));
    //console.log("MouseLeft: " + this.input.MouseLeft() * elapsed);
    //console.log("MouseLeft: " + (this.input.Get("LeftMouseButton") * this.input.MouseLeft() * elapsed));
    //console.log("LeftMouse: " + this.input.Get("LeftMouseButton"));
    //console.log("TurnLeft: " + this.input.MouseLeft() * elapsed);
    this.camera.TurnLeft(
        this.input.Get("LeftMouseButton") * this.input.MouseLeft() * elapsed
    );
    this.camera.TurnRight(
        this.input.Get("LeftMouseButton") * this.input.MouseRight() * elapsed
    );
    this.camera.PitchUp(
        this.input.Get("LeftMouseButton") * this.input.MouseUp() * elapsed
    );
    this.camera.PitchDown(
        this.input.Get("LeftMouseButton") * this.input.MouseDown() * elapsed
    );
    this.camera.MoveForward(this.input.MouseWheelDegreesUp() * elapsed);
    this.camera.MoveBackward(this.input.MouseWheelDegreesDown() * elapsed);
    this.camera.ZoomIn(this.input.Get("y"), elapsed);
    this.camera.ZoomOut(this.input.Get("h"), elapsed);



    this.camera.GetParent().MoveForward( this.input.Get("w") * elapsed );
    this.camera.GetParent().MoveBackward( this.input.Get("s") * elapsed );
    this.camera.GetParent().MoveLeft( this.input.Get("a") * elapsed );
    this.camera.GetParent().MoveRight( this.input.Get("d") * elapsed );
    this.camera.GetParent().MoveUp( this.input.Get(" ") * elapsed );
    this.camera.GetParent().MoveDown( this.input.Get("Shift") * elapsed );


    this.camera.GetParent().YawLeft( this.input.Get("j") * elapsed );
    this.camera.GetParent().YawRight( this.input.Get("l") * elapsed );
    this.camera.GetParent().PitchUp( this.input.Get("k") * elapsed );
    this.camera.GetParent().PitchDown( this.input.Get("i") * elapsed );
    this.camera.GetParent().RollLeft( this.input.Get("u") * elapsed );
    this.camera.GetParent().RollRight(this.input.Get("o") * elapsed );


    if(this.input.Get("RightMouseButton") > 0) {
        if(!this._done) {
            this.camera.AlignParentToMy(false, true);
            this._done = true;
        }
    }
    else {
        this._done = false;
    }

    var ymin;
    for(var i = 0; i < this.swarm.length; ++i) {
        var v = this.swarm[i];
        if(this.time < 6) {
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

    this.orbit.Rotate(-.01, 0, 1, 0);
    //console.log(this.offsetPlatformPhysical.position.toString());
    this.offsetPlatformPhysical.MoveLeft( elapsed );
    this.offsetPlatformPhysical.YawLeft(.1 * Math.PI / 180);
    //console.log(this.offsetPlatformPhysical.position.toString());

    this.printOnce(this.input.Get("Enter"));
    this.input.Update();
    //console.log("Cam: " + this.camera.GetOrientation());
};

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
 * Marks this GLWidget as dirty and schedules a surface repaint.
 */
alpha_GLWidget.prototype.scheduleRepaint = function()
{
    this.paintingDirty = true;
    this._surface.scheduleRepaint();
};

/**
 * Retrieves the current background color.
 */
alpha_GLWidget.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

alpha_GLWidget.prototype.Camera = function()
{
    return this.camera;
};

alpha_GLWidget.prototype.canvas = function()
{
    return this.surface().canvas();
};

alpha_GLWidget.prototype.gl = function()
{
    return this.surface().gl();
};

alpha_GLWidget.prototype.surface = function()
{
    return this._surface;
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
    var widget = this;
    switch(eventName) {
    case "keyPressed": {
        return parsegraph_addEventListener(document, "keydown", function(event) {
            //console.log(event.key);
            callback.call(thisArg, event.key);
        });
        break;
    }
    case "keyReleased": {
        return parsegraph_addEventListener(document, "keyup", function(event) {
            callback.call(thisArg, event.key);
        });
        break;
    }
    case "mousePressed": {
        return parsegraph_addEventListener(this.canvas(), "mousedown", function(event) {
            callback.call(thisArg, event.button, event.clientX, event.clientY);
        });
        break;
    }
    case "mouseReleased": {
        return [
            parsegraph_addEventListener(this.canvas(), "mouseup", function(event) {
                callback.call(thisArg, event.button, event.clientX, event.clientY);
            }),
            parsegraph_addEventListener(this.canvas(), "mouseout", function(event) {
                callback.call(thisArg, event.button, event.clientX, event.clientY);
            })
        ];
        break;
    }
    case "mouseMoved": {
        return parsegraph_addEventListener(this.canvas(), "mousemove", function(event) {
            callback.call(thisArg, event.clientX, event.clientY);
        });
        break;
    }
    case "mouseWheelMoved": {
        var onWheel = function(event) {
            event.preventDefault();
            var wheel = normalizeWheel(event);
            callback.call(thisArg, wheel);
        };
        parsegraph_addEventListener(widget.canvas(), "DOMMouseScroll", onWheel, false);
        parsegraph_addEventListener(widget.canvas(), "mousewheel", onWheel, false);
        break;
    }
    default: {
        throw new Error("Unhandled eventName: " + eventName);
    }
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

    this.playerAPhysical.SetScale(2,2,2);

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
 * Render painted memory buffers.
 */
alpha_GLWidget.prototype.render = function()
{
    var projection = this.camera.UpdateProjection();

    // local fullcam = boat:Inverse() * player:Inverse() * Bplayer:Inverse() * cam:Inverse()

    var gl = this.gl();
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //this.playerCluster.Draw(this.playerAPhysical.GetViewMatrix().Multiplied(projection));

    //console.log("this.camera.GetViewMatrix() * projection:\n" + viewMatrix.toString());
    //console.log(this.camera.GetViewMatrix().toString());
    var viewMatrix = this.camera.GetViewMatrix().Multiplied(projection);
    this.worldCluster.Draw(viewMatrix);


    for(var i = 0; i < this.swarm.length; ++i) {
        var v = this.swarm[i];
        this.testCluster.Draw(v.GetViewMatrix().Multiplied(projection));
        //this.worldCluster.Draw(v.GetViewMatrix().Multiplied(projection));
    }


    //console.log(projection.toString());
    //console.log(this.offsetPlatformPhysical.GetViewMatrix().toString());
    var platformMatrix = this.offsetPlatformPhysical.GetViewMatrix().Multiplied(projection);
    this.platformCluster.Draw(platformMatrix);
    this.evPlatformCluster.Draw(platformMatrix);


    //this.playerCluster.Draw(this.playerAPhysical.GetViewMatrix().Multiplied(projection));


    this.testCluster.Draw(this.playerBPhysical.GetViewMatrix().Multiplied(projection));

    this.sphereCluster.Draw(this.spherePhysical.GetViewMatrix().Multiplied(projection));
};

var alpha_startTime = new Date();
function alpha_GetTime()
{
    return (new Date().getTime() - alpha_startTime.getTime()) / 1000;
};

