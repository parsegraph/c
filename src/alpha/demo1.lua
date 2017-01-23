
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
camera:SetPosition(-5,6, -2);
camera:PitchDown(math.rad(45));



local function Dirt( x,y,z, r)
	local id = GetBlockID("dirt", "cube")
	return Block(id, x,y,z, r or 1)
end
local function grass( x, y, z, r )
	local id = GetBlockID("grass", "cube")
	return Block(id,x,y,z, r or 1)
end
local function stone( x,y,z, r)
	local id = GetBlockID("stone", "cube")
	return Block(id,x,y,z,r or 1)
end

local function GrassSlope( x,y,z, r)
	local id = GetBlockID("grass", "slope")
	return Block(id, x,y,z,r or 1)
end
local function GrassPCorner( x,y,z,r)
	local id = GetBlockID("grass", "pcorner")
	return Block(id, x,y,z, r or 1)
end
local function GrassCorner( x,y,z,r)
	local id = GetBlockID("grass", "corner")
	return Block(id, x,y,z, r or 1)
end

local function GrassBCorner(x,y,z,r)
	local id = GetBlockID("grass", "bcorner")
	return Block(id, x,y,z,r or 1)
end



local function StonePCorner( x,y,z,r)
	local id = GetBlockID("stone", "pcorner")
	return Block(id, x,y,z, r or 1)
end
local function StoneCorner( x,y,z,r)
	local id = GetBlockID("stone", "corner")
	return Block(id, x,y,z, r or 1)
end

local function StoneBCorner(x,y,z,r)
	local id = GetBlockID("stone", "bcorner")
	return Block(id, x,y,z,r or 1)
end
local function StoneSlope( x,y,z, r)
	local id = GetBlockID("stone", "slope")
	return Block(id, x,y,z,r or 1)
end


local function StoneSlab( x,y,z, r)
	local id = GetBlockID("stone", "slab")
	return Block( id, x,y,z,r or 1)
end

local hillblocks = {}
local h = hillblocks;
local function ins( b )
	h[#h+1] = b;
end

local function MakeALittleHill( x,y,z, side, corner, invert )
	corner = corner or GrassCorner
	side = side or GrassSlope
	local yc = y
	local rs = 1;
	local re = 2;
	local rn = 3;
	local rw = 4;
	if invert then
		yc = y-1;
		rs = 3;
		re = 4;
		rn = 1;
		rw = 2;
	end

	-- the center block
	-- its dirt so you can see wtf is going on
	ins(SCENE:AddBlock( Dirt(x, yc, z, 1) ) );


	-- south
	ins(SCENE:AddBlock( side(x, y, z+1 ,rs)) );
	-- east
	ins(SCENE:AddBlock( side(x+1, y, z ,re)) );
	-- north
	ins(SCENE:AddBlock( side(x, y, z-1 ,rn)) );
	-- west
	ins(SCENE:AddBlock( side(x-1, y, z ,rw) ));

	-- southwest;
	ins(SCENE:AddBlock( corner(x-1,y, z+1, rs )) );
	-- southeast
	ins( SCENE:AddBlock( corner(x+1,y, z+1, re )));

	ins( SCENE:AddBlock( corner(x+1,y, z-1, rn ) ));
	ins( SCENE:AddBlock( corner(x-1,y, z-1, rw )) );
end



for x=0,10 do
	for z=0,20 do
		SCENE:AddBlock( grass(x,1,-z) )
		SCENE:AddBlock( stone(x,0,-z) )
	end
end

SCENE:AddBlock( StoneSlab( 0,2,0, 5 ) );

MakeALittleHill(-5,3,-5, StoneSlope, GrassCorner);

SCENE:AddBlock( GrassBCorner(0,4,0,1) );






if showspeed then


local GetTime = Rainback.GetTime;
print("#Blocks: " .. #SCENE.blocks);
local start = GetTime()
SCENE:CalculateVertices();
local stop = GetTime();

local quadsX = SCENE.drawTypes[GL_QUADS][1];
local trianglesX = SCENE.drawTypes[GL_TRIANGLES][1];
local numVerts = #quadsX + #trianglesX;


print(stop - start .. " ms for " .. numVerts .. " vertices");


local start = GetTime()
SCENE:Draw()
print(GetTime() - start .. " ms for one draw");

print("Quads: ", #quadsX)
print("Trianglse: ", #trianglesX)

end


SCENE:CalculateVertices();

-- this is so crude
local function cycle( num, m)
	if num == m then return 1 end
	return num + 1
end

local sides = { StoneSlope, GrassSlope, StoneSlope }
local corners = { GrassCorner, StonePCorner, GrassBCorner }

local side = 1 
local corner = 1
local done = false;
local function ChangeHill( elapsed )
	if elapsed == 0 then
		done = false;
		return
	
	end
	if done then return end;
	done = true;
	-- this is not the correct way to be doing this

	for i,block in ipairs(hillblocks) do
		SCENE:RemoveBlock(block)
	end
	
	side = cycle(side,#sides);
	corner = cycle(corner, #corners);
	local invert = false;
	if corner == 3 then
		invert = true;
	end
	MakeALittleHill(-5,3,-5, sides[side], corners[corner], invert);
	print("Changing pyramid thing")
	SCENE:CalculateVertices()
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

	ChangeHill( input:RETURN() * elapsed)

	input:Update()
	widget:update();
end;


Tick(0);
Undoer(Timing.Every(Tick));



widget:setRenderer(function()
	
	
	glEnable(GL_DEPTH_TEST);

	camera:Update()
	
	
	glPushMatrix();
		SCENE:Draw();
	glPopMatrix();

	
end);