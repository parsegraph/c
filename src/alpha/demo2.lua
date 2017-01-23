
local showspeed = false;

widget = Rainback.GLWidget();
Undoer(widget);
Undoer(widget, "Hide");
local input = Input:New(widget);
Undoer(input) -- dunno what this does
input:SetMouseSensitivity(.4);


widget:Show()
Rainback.ActivateMainWindow();
camera = Camera:New(widget);
camera:Traditional(false)
camera:SetSpeed( 5 );
Undoer(camera)
camera:SetFOV(60) -- defaults to 90; breaks at 180
camera:SetMaxViewDistance(800); -- defaults to 300
camera:SetPosition(3,3,8)
local scene = Cluster();

local stone = BlockType("stone", "cube");
local slab = BlockType("stone", "slab");
local slope = BlockType("stone", "slope");
local corner_slope = BlockType("stone", "corner_slope");
local inverted_corner_slope = BlockType("stone", "inverted_corner_slope");
local pyramid_corner = BlockType("stone", "pyramid_corner");
local inverted_pyramid_corner = BlockType("stone", "inverted_pyramid_corner");
local slab_slope = BlockType("stone", "slab_slope");
local slab_corner = BlockType("stone", "slab_corner");
local slab_inverted_corner = BlockType("stone", "slab_inverted_corner")
local slab_pyramid_corner = BlockType("stone", "slab_pyramid_corner")
local slab_inverted_pyramid_corner = BlockType( "stone", "slab_inverted_pyramid_corner")
local shallow_slope = BlockType("stone", "shallow_slope");
local shallow_corner = BlockType("stone", "shallow_corner");
local shallow_i_corner = BlockType("stone", "shallow_inverted_corner");
local shallow_pyramid_corner = BlockType("stone", "shallow_pyramid_corner");
local shallow_i_pyramid_corner = BlockType("stone", "shallow_inverted_pyramid_corner")


local Y,Z,R = 3,0,1
local function same(y,z,r)
	Y = y or Y;
	Z = z or Z;
	R = r or R;
	return Y,Z,R
end
local counter = -1;
local function x( c )
	counter = c or counter
	counter = counter + 2;
	return counter
end

scene:AddBlock( Block( stone, x(), same() ) );
scene:AddBlock( Block( slope, x(),3,0,1) );
scene:AddBlock( Block( corner_slope, x(),3,0,1) );
scene:AddBlock( Block( inverted_corner_slope, x(), same() ) );
scene:AddBlock( Block( pyramid_corner, x(), same() ) );
scene:AddBlock( Block( inverted_pyramid_corner, x(), same() ) );
x(-1)
same(Y,Z+2,R)
scene:AddBlock( Block( shallow_slope, x(), same() ) );
scene:AddBlock( Block( shallow_corner, x(), same() ) );
scene:AddBlock( Block( shallow_i_corner, x(), same() ) );
scene:AddBlock( Block( shallow_pyramid_corner, x(), same() ) );
scene:AddBlock( Block( shallow_i_pyramid_corner, x(), same() ) );
x(-3)
same(Y,Z+2,R)
scene:AddBlock( Block( slab, x(), same() ) );
scene:AddBlock( Block( slab_slope, x(), same() ) );
scene:AddBlock( Block( slab_corner, x(), same() ) );
scene:AddBlock( Block( slab_inverted_corner, x(), same() ) );
scene:AddBlock( Block( slab_pyramid_corner, x(), same() ) );
scene:AddBlock( Block( slab_inverted_pyramid_corner, x(), same() ) );

scene:CalculateVertices();



local size = 1;
local h = size / 2;
local v = {};
-- construct the vertices for a cube face
v[1] = Vector(0,1,0)
v[2] = v[1] + {h,0,0}
v[3] = v[2] + {h,0,0}

v[4] = v[1] + {0,-h, 0}
v[5] = v[4] + {h,0,0}
v[6] = v[5] + {h,0,0}

v[7] = v[4] + {0,-h,0}
v[8] = v[7] + {h, 0, 0}
v[9] = v[8] + {h, 0, 0}

-- the above vertices were constructed with v[7] at (0,0,0);
-- I need to offset so that they are actually one face of a cube
-- with the cubes center being 0,0,0
-- also increase the z axis just a bit, so that this
-- cube will "cover" a normal cube
for i,vec in ipairs(v) do
	v[i] = vec + {-h,-h, h + .0001};
end




-- now construct the faces from the above vertices


local f = {};
f[1] = Face( { v[2], v[1], v[4] }, GL_TRIANGLES )
f[2] = Face( { v[2], v[4], v[5] }, GL_TRIANGLES )

f[3] = Face( { v[3], v[2], v[5] }, GL_TRIANGLES )
f[4] = Face( { v[3], v[5], v[6] }, GL_TRIANGLES )

f[5] = Face( { v[5], v[4], v[7] }, GL_TRIANGLES )
f[6] = Face( { v[5], v[7], v[8] }, GL_TRIANGLES )

f[7] = Face( { v[6], v[5], v[8] }, GL_TRIANGLES )
f[8] = Face( { v[6], v[8], v[9] }, GL_TRIANGLES )

-- random functions to color the faces
local randcolor = function()
	local r = math.random(0,255);
	local g = math.random(0,255);
	local b = math.random(0,255);
	return Color( r,g,b);
end

local c = {};
for i,v in ipairs(f) do
	c[i] = randcolor();
end


-- now construct another face by rotating about a quaternion
-- these 6 quaternions when given 1 face, can make a cube
local q = {};
local s45 = math.sqrt(2) / 2;
q[1] = Quaternion(    0 ,    0 ,    0 ,    1 ); -- 1
q[2] = Quaternion(    0 ,  s45 ,    0 ,  s45 ); -- 2
q[3] = Quaternion(    0 ,    1 ,    0 ,    0 ); -- 3
q[4] = Quaternion(    0 ,  s45 ,    0 , -s45 ); -- 4
q[5] = Quaternion( -s45 ,    0 ,    0 , -s45 ); -- 5
q[6] = Quaternion( -s45 ,    0 ,    0 ,  s45 ); -- 13



local function createface( quat)
	quat = q[quat];
	local nf = {}
	for i,face in ipairs( f ) do
		local u = {}
		for i,v in ipairs( face ) do
			u[i] =  quat:RotatedVector( v )
		end
		nf[i] = Face( u , GL_TRIANGLES)
	end
	return nf;
end
local cf = {}; -- cube faces
cf[1] = createface( 1 )
cf[2] = createface( 2 )
cf[3] = createface( 3 )
cf[4] = createface( 4 )
cf[5] = createface( 5 )
cf[6] = createface( 6 )

local draw = function()
	for _, side in ipairs(cf) do
		for i,face in ipairs(side) do
			glColor( c[i]() )
			for _,v in ipairs( face ) do
				glVertex( v() )
			end
		end
	end

end




local function Tick(elapsed)
	
		
	camera:MoveForward(input:W() * elapsed);
	camera:MoveBackward(input:S() * elapsed);
	camera:MoveLeft(input:A() * elapsed);
	camera:MoveRight(input:D() * elapsed);
	camera:MoveUp(input:SPACE() * elapsed);
	camera:MoveDown(input:SHIFT() * elapsed);

	camera:RollLeft(input:Q() * elapsed);
	camera:RollRight(input:E() * elapsed);
		
	camera:YawLeft(input:LeftMouseButton() * input:MouseLeft() * elapsed)
	camera:YawRight(input:LeftMouseButton() * input:MouseRight() * elapsed )
	camera:PitchUp(input:LeftMouseButton() * input:MouseUp() * elapsed )
	camera:PitchDown(input:LeftMouseButton() * input:MouseDown() * elapsed );

	camera:MoveForward(input:MouseWheelDegreesUp() * elapsed);



	input:Update()
	widget:update();
end;


Tick(0);
Undoer(Timing.Every(Tick));



widget:setRenderer(function()
	
	
	glEnable(GL_DEPTH_TEST);

	camera:Update()
	
	glPushMatrix()
		-- glTranslate(0,0,-1)
		glBegin(GL_TRIANGLES, draw);
	glPopMatrix()
	glPushMatrix();
		scene:Draw();
	glPopMatrix();

	
end);