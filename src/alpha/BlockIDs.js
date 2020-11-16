// Version 1.3

// vertices!
function alpha_BuildCubeStructure() {
  return [
    new alpha_Vector(-0.5, 0.5, 0.5), // 0
    new alpha_Vector(0.5, 0.5, 0.5), // 1
    new alpha_Vector(0.5, 0.5, -0.5), // 2
    new alpha_Vector(-0.5, 0.5, -0.5), // 3
    new alpha_Vector(0.5, -0.5, 0.5), // 4
    new alpha_Vector(-0.5, -0.5, 0.5), // 5
    new alpha_Vector(-0.5, -0.5, -0.5), // 6
    new alpha_Vector(0.5, -0.5, -0.5), // 7
  ];
}

function alpha_BuildSlabStructure() {
  const slabStructure = alpha_BuildCubeStructure();
  for (let i = 0; i <= 3; ++i) {
    slabStructure[i].Add(0, -0.5, 0);
  }
  return slabStructure;
}

function alpha_standardBlockTypes(BlockTypes) {
  if (!BlockTypes) {
    throw new Error('BlockTypes must not be null');
  }

  // skins
  const white = new alpha_Color(1, 1, 1);
  const dbrown = new alpha_Color('#3b2921');
  const lbrown = new alpha_Color('#604b42');
  const ggreen = new alpha_Color('#0b9615');
  const gray = new alpha_Color('#5e5a5e');
  const lgray = new alpha_Color('#726f72');

  // top to bottom
  // counter-clockwise
  // front to back
  const dirt = new alpha_Skin(
      [lbrown, lbrown, lbrown, lbrown], // top
      [lbrown, lbrown, dbrown, dbrown], // front
      [lbrown, lbrown, dbrown, dbrown], // left
      [lbrown, lbrown, dbrown, dbrown], // back
      [lbrown, lbrown, dbrown, dbrown], // right
      [dbrown, dbrown, dbrown, dbrown], // bottom
  );

  const grass = new alpha_Skin(
      [ggreen, ggreen, ggreen, ggreen], // top
      [lbrown, lbrown, dbrown, dbrown], // front
      [lbrown, lbrown, dbrown, dbrown], // left
      [lbrown, lbrown, dbrown, dbrown], // back
      [lbrown, lbrown, dbrown, dbrown], // right
      [dbrown, dbrown, dbrown, dbrown], // bottom
  );

  const stone = new alpha_Skin(
      [lgray, gray, lgray, gray], // top
      [lgray, gray, lgray, gray], // front
      [lgray, gray, lgray, gray], // left
      [lgray, gray, lgray, gray], // back
      [lgray, gray, lgray, gray], // right
      [lgray, gray, lgray, gray], // bottom
      [lgray, gray, lgray, gray], // misc
      [lgray, gray, lgray, gray], // misc
      [lgray, gray, lgray, gray], // misc
      [lgray, gray, lgray, gray], // misc
  );

  // draw everthing in a face:
  // top to bottom
  // counter-clockwise ( facing the face )
  // front to back

  // with that priority;

  //        v4___________ v3
  //        |\ FRONT   |\   TOP
  //        | \v1______|_\  v2
  // LEFT   |__|_______|  |
  //        \v7|     v8\  | RIGHT
  //         \ | BOTTOM \ |
  //          \|_________\| v5
  //          v6  BACK

  // the relative directions are pretty messy

  // right now our cubes are centered on their position
  // later we may offset them so a cubes vertices are always an int;
  // of course that means for each rotation we will have to translate by .5
  // rotate, then translate back

  // cube faces;
  var v = alpha_BuildCubeStructure();
  var Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  // turn the faces into shapes

  // top to bottom
  // counter-clockwise
  // front to back
  const CUBE = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);

  BlockTypes.Create('stone', 'cube', stone, CUBE);
  BlockTypes.Create('dirt', 'cube', dirt, CUBE);
  BlockTypes.Create('grass', 'cube', grass, CUBE);

  // a slope lowers vertices 1 and 2 to 6 and 5;
  var slopeStructure = alpha_BuildCubeStructure();
  v = slopeStructure;
  for (var i = 0; i <= 1; ++i) {
    v[i].Add(0, -1, 0);
  }

  // this causes left and right to become triangles
  Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  Right = new alpha_Face(alpha_TRIANGLES, v[2], v[1], v[7]);
  Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SLOPE = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'slope', stone, SLOPE);

  // there are 4 simple sloped corners for a fullsized cube;
  // split the top face into two triangles
  // with the triangle split top vs slant
  // ( better names to come in time)
  // a beveled corner  (1 top, 3 bottom -- actually 2 )
  // an inverted beveled corner ( 3 top, 1 bottom )

  // with the top split along the path downwards
  // a pyramid corner (1 top, 3 bottom)
  // an inverted pyramid corner ( 3 top, 1 bottom )

  // the beveled corner slope
  // lower 1, 2, and 3 to the bottom;
  var bcslopeStructure = alpha_BuildCubeStructure();
  v = bcslopeStructure;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -1, 0);
  }

  // now top, right
  var Top = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[2]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  var Bottom = new alpha_Face(alpha_TRIANGLES, v[6], v[7], v[5]);

  const CORNER_SLOPE = new alpha_Shape(Top, Front, Left, Bottom);
  BlockTypes.Load('stone', 'corner_slope', stone, CORNER_SLOPE);

  var ibcslopeStructure = alpha_BuildCubeStructure();
  v = ibcslopeStructure;
  // 3 top, 1 bottom;
  v[1].Add(0, -1, 0);

  var Top = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[0]);
  var Slope = new alpha_Face(alpha_TRIANGLES, v[2], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const INVERTED_CORNER_SLOPE = new alpha_Shape(
      Top,
      Slope,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'inverted_corner_slope',
      stone,
      INVERTED_CORNER_SLOPE,
  );

  // pyramid corner ( 1 top, 3 bottom )
  var pcorner = alpha_BuildCubeStructure();
  var v = pcorner;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -1, 0);
  }

  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);
  const PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Bottom,
  );
  BlockTypes.Load('stone', 'pyramid_corner', stone, PYRAMID_CORNER);

  // inverted pyramid corner ( 3 top, 1 bottom )
  var ipcorner = alpha_BuildCubeStructure();
  var v = ipcorner;
  v[1].Add(0, -1, 0);

  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const INVERTED_PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'inverted_pyramid_corner',
      stone,
      INVERTED_PYRAMID_CORNER,
  );

  var v = alpha_BuildSlabStructure();
  var Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);
  const SLAB = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);

  BlockTypes.Load('stone', 'slab', stone, SLAB);

  // a slope lowers vertices 1 and 2 to 6 and 5;
  var slopeStructure = alpha_BuildCubeStructure();
  var v = slopeStructure;
  for (var i = 0; i <= 1; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // this causes left and right to become triangles
  var Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_TRIANGLES, v[2], v[1], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SLAB_SLOPE = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'slab_slope', stone, SLAB_SLOPE);

  var bcslopeStructure = alpha_BuildCubeStructure();
  var v = bcslopeStructure;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // now top, right
  var Top = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[2]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  var Bottom = new alpha_Face(alpha_TRIANGLES, v[6], v[7], v[5]);

  const SLAB_CORNER = new alpha_Shape(Top, Front, Left, Bottom);
  BlockTypes.Load('stone', 'slab_corner', stone, SLAB_CORNER);

  var ibcslopeStructure = alpha_BuildCubeStructure();
  var v = ibcslopeStructure;
  // 3 top, 1 bottom;
  v[1].Add(0, -0.5, 0);
  var Top = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[0]);
  var Slope = new alpha_Face(alpha_TRIANGLES, v[2], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SLAB_INVERTED_CORNER = new alpha_Shape(
      Top,
      Slope,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load('stone', 'slab_inverted_corner', stone, SLAB_INVERTED_CORNER);

  // pyramid corner ( 1 top, 3 bottom )
  var pcorner = alpha_BuildCubeStructure();
  var v = pcorner;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_TRIANGLES, v[3], v[6], v[5]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);
  const SLAB_PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Bottom,
  );
  BlockTypes.Load('stone', 'slab_pyramid_corner', stone, SLAB_PYRAMID_CORNER);

  // inverted pyramid corner ( 3 top, 1 bottom )
  var ipcorner = alpha_BuildSlabStructure();
  var v = ipcorner;
  v[2].Add(0, -0.5, 0);
  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SLAB_INVERTED_PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'slab_inverted_pyramid_corner',
      stone,
      SLAB_INVERTED_PYRAMID_CORNER,
  );

  // a slope lowers vertices 1 and 2 to 6 and 5;
  var v = alpha_BuildCubeStructure();
  for (var i = 0; i <= 1; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // this causes left and right to become triangles
  var Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SHALLOW_SLOPE = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'shallow_slope', stone, SHALLOW_SLOPE);

  // there are 4 simple sloped corners for a fullsized cube;
  // split the top face into two triangles
  // with the triangle split top vs slant
  // ( better names to come in time)
  // a beveled corner  (1 top, 3 bottom -- actually 2 )
  // an inverted beveled corner ( 3 top, 1 bottom )

  // with the top split along the path downwards
  // a pyramid corner (1 top, 3 bottom)
  // an inverted pyramid corner ( 3 top, 1 bottom )

  // the beveled corner slope
  // lower 1, 2, and 3 to the bottom;
  var bcslopeStructure = alpha_BuildCubeStructure();
  var v = bcslopeStructure;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // now top, right
  var Top = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[0]);
  var Slope = new alpha_Face(alpha_TRIANGLES, v[2], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[2], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SHALLOW_CORNER = new alpha_Shape(
      Top,
      Slope,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load('stone', 'shallow_corner', stone, SHALLOW_CORNER);

  var v = alpha_BuildCubeStructure();
  // 3 top, 1 bottom;
  v[2].Add(0, -0.5, 0);
  var Top = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[0]);
  var Slope = new alpha_Face(alpha_TRIANGLES, v[2], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SHALLOW_INVERTED_CORNER = new alpha_Shape(
      Top,
      Slope,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'shallow_inverted_corner',
      stone,
      SHALLOW_INVERTED_CORNER,
  );

  // pyramid corner ( 1 top, 3 bottom )
  var pcorner = alpha_BuildCubeStructure();
  var v = pcorner;
  for (var i = 0; i <= 2; ++i) {
    v[i].Add(0, -0.5, 0);
  }
  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);
  const SHALLOW_PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'shallow_pyramid_corner',
      stone,
      SHALLOW_PYRAMID_CORNER,
  );

  // inverted pyramid corner ( 3 top, 1 bottom )
  var ipcorner = alpha_BuildCubeStructure();
  var v = ipcorner;
  v[1].Add(0, -0.5, 0);
  // now top, right
  var TopLeft = new alpha_Face(alpha_TRIANGLES, v[3], v[0], v[1]);
  var TopRight = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const SHALLOW_INVERTED_PYRAMID_CORNER = new alpha_Shape(
      TopLeft,
      TopRight,
      Front,
      Left,
      Back,
      Right,
      Bottom,
  );
  BlockTypes.Load(
      'stone',
      'shallow_inverted_pyramid_corner',
      stone,
      SHALLOW_INVERTED_PYRAMID_CORNER,
  );

  // an angled slab is a half slab cut in a right triangle
  var v = alpha_BuildSlabStructure();
  v[1].Add(0, 0, -1);
  v[4].Add(0, 0, -1);
  var Top = new alpha_Face(alpha_TRIANGLES, v[2], v[3], v[0]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Bottom = new alpha_Face(alpha_TRIANGLES, v[6], v[7], v[5]);
  const ANGLED_SLAB = new alpha_Shape(Top, Front, Left, Back, Bottom);

  BlockTypes.Load('stone', 'angled_slab', stone, ANGLED_SLAB);

  // half-slab
  var v = alpha_BuildSlabStructure();
  v[0].Add(0, 0, -0.5);
  v[1].Add(0, 0, -0.5);
  v[4].Add(0, 0, -0.5);
  v[5].Add(0, 0, -0.5);

  var Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  var Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  var Back = new alpha_Face(alpha_QUADS, v[1], v[0], v[5], v[4]);
  var Right = new alpha_Face(alpha_QUADS, v[2], v[1], v[4], v[7]);
  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);
  const HALF_SLAB = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);

  BlockTypes.Load('stone', 'half_slab', stone, HALF_SLAB);

  // stairs
  const stairStructure = [
    new alpha_Vector(-0.5, 0.5, 0), // 0 -- top
    new alpha_Vector(0.5, 0.5, 0), // 1 -- top
    new alpha_Vector(0.5, 0.5, -0.5), // 2 -- top
    new alpha_Vector(-0.5, 0.5, -0.5), // 3 -- top
    new alpha_Vector(0.5, -0.5, 0.5), // 4 -- bottom
    new alpha_Vector(-0.5, -0.5, 0.5), // 5 -- bottom
    new alpha_Vector(-0.5, -0.5, -0.5), // 6 -- bottom
    new alpha_Vector(0.5, -0.5, -0.5), // 7 -- bottom
    new alpha_Vector(-0.5, 0, 0), // 8 -- mid
    new alpha_Vector(0.5, 0, 0), // 9 -- mid
    new alpha_Vector(-0.5, 0, 0.5), // 10 -- mid
    new alpha_Vector(0.5, 0, 0.5), // 11 -- mid
  ];
  var v = stairStructure;
  const Flight1Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  const Flight1Front = new alpha_Face(alpha_QUADS, v[1], v[0], v[8], v[9]);
  const Flight2Top = new alpha_Face(alpha_QUADS, v[9], v[8], v[10], v[11]);
  const Flight2Front = new alpha_Face(alpha_QUADS, v[11], v[10], v[5], v[4]);
  var Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  const LeftTop = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[8]);
  const LeftBot = new alpha_Face(alpha_QUADS, v[8], v[6], v[5], v[10]);

  const RightTop = new alpha_Face(alpha_QUADS, v[2], v[1], v[9], v[7]);
  const RightBot = new alpha_Face(alpha_QUADS, v[9], v[11], v[4], v[7]);

  var Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const STAIRS = new alpha_Shape(
      Flight1Top,
      Flight1Front,
      Flight2Top,
      Flight2Front,
      Front,
      LeftTop,
      LeftBot,

      RightTop,
      RightBot,
      Bottom,
  );

  BlockTypes.Load('stone', 'stairs', stone, STAIRS);

  // medium corner; lowers 1 and 3 to mid range
  // and 2 to bottom
  var v = alpha_BuildCubeStructure();
  v[0].Add(0, -0.5, 0);
  v[2].Add(0, -0.5, 0);
  v[1].Add(0, -1, 0);
  // this causes left and right to become triangles
  Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const MED_CORNER = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'med_corner', stone, MED_CORNER);

  // medium corner; lowers 1 to midrange
  // and 2 to bottom
  var v = alpha_BuildCubeStructure();
  v[0].Add(0, -0.5, 0);
  v[1].Add(0, -1, 0);
  // this causes left and right to become triangles
  Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const MED_CORNER2 = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'med_corner2', stone, MED_CORNER2);

  // medium corner; lowers 1 and 3 to mid range
  // and 2 to bottom
  var v = alpha_BuildCubeStructure();
  v[2].Add(0, -0.5, 0);
  v[1].Add(0, -1, 0);
  // this causes left and right to become triangles
  Top = new alpha_Face(alpha_QUADS, v[2], v[3], v[0], v[1]);
  Front = new alpha_Face(alpha_QUADS, v[3], v[2], v[7], v[6]);
  Left = new alpha_Face(alpha_QUADS, v[0], v[3], v[6], v[5]);
  Back = new alpha_Face(alpha_TRIANGLES, v[0], v[5], v[4]);
  Right = new alpha_Face(alpha_TRIANGLES, v[2], v[4], v[7]);
  Bottom = new alpha_Face(alpha_QUADS, v[6], v[7], v[4], v[5]);

  const MED_CORNER3 = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);
  BlockTypes.Load('stone', 'med_corner3', stone, MED_CORNER3);
}
