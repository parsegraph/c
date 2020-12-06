// Version 1.5

/*
			[Vector]    [Color]
			  |         |
			 [Face]     [Skin]
			  |         |
			 [Shape] ---BlockType
			            |
			            ID -- just a number in a table with the BlockType as its value
			            |
		[alpha_Block(id, x, y, z, orientation)]
			            |
		    [alpha_Cluster(blockTypes)]

some of the above classes are really basic
really nothing but tables
they exist to make it easier to piece things together
hopefully
*/

const TestSuite = require('parsegraph-testsuite').default;

// --------------------------------------------
// --------------------------------------------
// ---------------  Colors  -------------------
// --------------------------------------------
// --------------------------------------------
// a simple class to make it easier to create colors;
// usage:
// local brown = Color( {.5,.25,1} ) or Color( .5,.25,1)
// local tan = Color( 203, 133, 63);
// local darkbrown = Color( "#3b2921")

function alpha_Color() {
  this[0] = 0;
  this[1] = 0;
  this[2] = 0;
  this.length = 3;

  if (arguments.length > 0) {
    this.Set.apply(this, arguments);
  }
}

alpha_Color.prototype.asRGB = function() {
  return (
    'rgb(' +
    Math.round(this[0] * 255) +
    ', ' +
    Math.round(this[1] * 255) +
    ', ' +
    Math.round(this[2] * 255) +
    ')'
  );
};

alpha_Color_Tests = new TestSuite('alpha_Color');

alpha_Color_Tests.addTest('alpha_Color.<constructor>', function(resultDom) {
  let v = new alpha_Color(0.1, 0.2, 0.3);
  if (v[0] != 0.1 || v[1] != 0.2 || v[2] != 0.3) {
    resultDom.appendChild(document.createTextNode(v));
    return 'Constructor must accept arguments.';
  }

  v = new alpha_Color();
  if (v[0] != 0 || v[1] != 0 || v[2] != 0) {
    resultDom.appendChild(document.createTextNode(v));
    return 'Constructor must allow zero-arguments.';
  }
});

alpha_Color.prototype.Set = function() {
  let r;
  let g;
  let b;
  if (arguments.length > 1) {
    r = arguments[0];
    g = arguments[1];
    b = arguments[2];
  } else if (typeof arguments[0] === 'number') {
    r = arguments[0];
    g = arguments[0];
    b = arguments[0];
  } else if (typeof arguments[0] === 'string') {
    // passed a hex color (hopefully)
    let start = 0;
    if (arguments[0].charAt(0) === '#') {
      // strip the # from it
      start = 1;
    }
    r = Number.parseInt(arguments[0].substring(start, start + 2), 16);
    g = Number.parseInt(arguments[0].substring(start + 2, start + 4), 16);
    b = Number.parseInt(arguments[0].substring(start + 4, start + 6), 16);
  } else {
    r = arguments[0][0];
    g = arguments[0][1];
    b = arguments[0][2];
  }

  if (r > 1) {
    r = r / 255;
  }
  if (g > 1) {
    g = g / 255;
  }
  if (b > 1) {
    b = b / 255;
  }

  this[0] = r;
  this[1] = g;
  this[2] = b;
};

alpha_Color_Tests.addTest('alpha_Color.Set', function() {
  const v = new alpha_Color(1);
  v.Set(0.2);
  if (!v.Equals(new alpha_Color(0.2, 0.2, 0.2))) {
    console.log(v);
    return 'Set must allow single arguments.';
  }

  v.Set(0.2, 0.3, 0.4);
  if (!v.Equals(new alpha_Color(0.2, 0.3, 0.4))) {
    console.log(v);
    return 'Set must allow multiple arguments.';
  }

  v.Set(new alpha_Color(0.2, 0.3, 0.4));
  if (!v.Equals(new alpha_Color(0.2, 0.3, 0.4))) {
    console.log(v);
    return 'Set must allow alpha_Colors as arguments.';
  }
});

alpha_Color.prototype.Equals = function() {
  if (arguments.length > 1) {
    for (var i = 0; i < this.length; ++i) {
      if (this[i] != arguments[i]) {
        return false;
      }
    }
  } else if (typeof arguments[0] === 'number') {
    for (var i = 0; i < this.length; ++i) {
      if (this[i] != arguments[0]) {
        return false;
      }
    }
  } else {
    for (var i = 0; i < this.length; ++i) {
      if (this[i] != arguments[0][i]) {
        return false;
      }
    }
  }
  return true;
};

alpha_Color_Tests.addTest('alpha_Color.Equals', function() {
  const v = new alpha_Color(1);
  v.Set(0.2);
  if (!v.Equals(0.2)) {
    console.log(v);
    return 'Equals must accept a single numeric argument.';
  }

  v.Set(0.2, 0.3, 0.4);
  if (!v.Equals(0.2, 0.3, 0.4)) {
    console.log(v);
    return 'Equals must accept mulitple arguments.';
  }

  v.Set(new alpha_Color(0.2, 0.3, 0.4));
  if (!v.Equals(new alpha_Color(0.2, 0.3, 0.4))) {
    console.log(v);
    return 'Equals accepts single alpha_Color arguments.';
  }
});

alpha_Color.prototype.toString = function() {
  return '{' + this[0] + ', ' + this[1] + ', ' + this[2] + '}';
};

// --------------------------------------------
// --------------------------------------------
// ---------------  Skin  ---------------------
// --------------------------------------------
// --------------------------------------------
// the skin object is simply an ordered list of colors
// one for each vertex of each face of a shape.
// a skin can only be applied to a shape with
// the same number of vertices
// you create a skin by passing it a nested table of colors
// skins aren't designed to be edited once created
// Skin( {
// 	{ green, green, green, green }, -- skin 1 has 4 vertices
// 	{ brown, brown, brown, brown }, -- skin 2
// 	{ brown, brown, brown, brown }, -- skin 3
// 		--and so on until you have the full skin
// })
function alpha_Skin() {
  if (arguments.length > 1) {
    // Passed colors directly.
    this.length = arguments.length;
    for (var i = 0; i < arguments.length; ++i) {
      var color = arguments[i];
      this[i] = [];
      for (var j = 0; j < color.length; ++j) {
        this[i].push(new alpha_Color(color[j]));
        var c = color[j];
      }
    }
  } else if (arguments.length > 0) {
    // Passed a single array of colors.
    this.length = arguments[0].length;
    for (var i = 0; i < arguments[0].length; ++i) {
      var color = arguments[0][i];
      this[i] = [];
      for (var j = 0; j < color.length; ++j) {
        this[i].push(new alpha_Color(color[j]));
        var c = color[j];
      }
    }
  } else {
    // An empty skin?
    this.length = 0;
  }
}

alpha_Skin_Tests = new TestSuite('alpha_Skin');

alpha_Skin_Tests.addTest('alpha_Skin.<constructor>', function(resultDom) {
  const green = new alpha_Color(0, 1, 0);
  const brown = new alpha_Color(0.5, 0.5, 0);
  const skin = new alpha_Skin([
    [green, green, green, green], // color 1 has 4 vertices
    [brown, brown, brown, brown], // color 2
    [brown, brown, brown, brown], // color 3
  ]);
});

alpha_Skin.prototype.forEach = function(callback, thisArg) {
  thisArg = thisArg || this;
  for (let i = 0; i < this.length; ++i) {
    callback.call(thisArg, this[i], i, this);
  }
};

alpha_Skin_Tests.addTest('alpha_Skin.forEach', function(resultDom) {
  const green = new alpha_Color(0, 1, 0);
  const brown = new alpha_Color(0.5, 0.5, 0);
  const skin = new alpha_Skin([
    [green, green, green, green], // color 1 has 4 vertices
    [brown, brown, brown, brown], // color 2
    [brown, brown, brown, brown], // color 3
  ]);

  let maxRow = 0;
  skin.forEach(function(color, i) {
    maxRow = Math.max(maxRow, i);
    switch (i) {
      case 0:
        if (
          !color[0].Equals(green) ||
          !color[1].Equals(green) ||
          !color[2].Equals(green) ||
          !color[3].Equals(green)
        ) {
          console.log(color);
          throw new Error('Face 0 does not match');
        }
        break;
      case 1:
        if (
          !color[0].Equals(brown) ||
          !color[1].Equals(brown) ||
          !color[2].Equals(brown) ||
          !color[3].Equals(brown)
        ) {
          console.log(color);
          throw new Error('Face 1 does not match');
        }
        break;
      case 2:
        if (
          !color[0].Equals(brown) ||
          !color[1].Equals(brown) ||
          !color[2].Equals(brown) ||
          !color[3].Equals(brown)
        ) {
          console.log(color);
          throw new Error('Face 2 does not match');
        }
        break;
    }
  });

  if (maxRow != 2) {
    return 'Unexpected number of rows iterated: ' + maxRow;
  }
});

alpha_TRIANGLES = 0;
alpha_QUADS = 1;

// --------------------------------------------
// --------------------------------------------
// ---------------  Face  ---------------------
// --------------------------------------------
// --------------------------------------------
// face is a simple grouping of vertices
// designed to be rendered by 1 call of GL_QUADS
// or its ilk
// local cubeTop = new alpha_Face(alpha_QUADS, vector, vector, vector, vector);
//
// Face does not copy the vectors.
// because its a temporary construction
// Once it is passed to a shape the shape will copy it
// DO NOT REUSE ( until after the face is applied to a shape )
function alpha_Face() {
  this.drawType = arguments[0];

  if (arguments.length > 2) {
    this.length = arguments.length - 1;
    for (var i = 1; i < arguments.length; ++i) {
      this[i - 1] = arguments[i];
    }
  } else {
    this.length = arguments[1].length;
    for (var i = 0; i < arguments[1].length; ++i) {
      this[i] = arguments[1][i];
    }
  }
}

alpha_Face.prototype.Clone = function() {
  const values = [];
  for (let i = 0; i < this.length; ++i) {
    values.push(this[i].Clone());
  }
  return new alpha_Face(this.drawType, values);
};

alpha_Face.prototype.toString = function() {
  let rv = '';
  for (let i = 0; i < this.length; ++i) {
    if (i > 0) {
      rv += ', ';
    }
    rv += this[i].toString();
  }
  return rv;
};

// --------------------------------------------
// --------------------------------------------
// --------------  Shape  ---------------------
// --------------------------------------------
// --------------------------------------------
// shape is a list of faces
// tha when all drawn will make some sort of ...
// SHAPE -- SURPISE!
// initialize it with a list of faces;
// var CUBE = new alpha_Shape(
// cubeTop,
// cubeBottom,
// cubeLeft,
// cubeRight,
// cubeFront,
// cubeBack
// )
function alpha_Shape() {
  this.length = arguments.length;
  for (let i = 0; i < arguments.length; ++i) {
    this[i] = arguments[i].Clone();
  }
}

// --------------------------------------------
// --------------------------------------------
// ----------- BlockTypes  --------------------
// --------------------------------------------
// --------------------------------------------
// Blocktype is where you combine a Shape(pos vec) with A Skin(color vec)
// var stone = new alpha_BlockType("stone", "cube", Stone, graySkin)
// BlockType automatically loads created BlockTypes into the BlockIDs table
// it is some sort of hybrid object / masterlist

function alpha_BlockTypes() {
  this.blockIDs = [];
  this.descriptions = [];
}

alpha_BlockTypes.prototype.Load = function(descSkin, descShape, skin, shape) {
  return this.Create(descSkin, descShape, skin, shape);
};

/**
 * creates a blocktype and returns the id.
 */
alpha_BlockTypes.prototype.Create = function(
    descSkin,
    descShape,
    skin,
    shape,
) {
  for (let i = 0; i < shape.length; ++i) {
    const face = shape[i];
    for (let j = 0; j < face.length; ++j) {
      if (!skin[i] || !skin[i][j]) {
        throw new Error('Skin is too damn small');
        // however I will let you wear it if its a little large!
      }
    }
  }
  if (!this.descriptions[descSkin]) {
    // these descriptions aren't already in use
    this.descriptions[descSkin] = {};
    this.descriptions[descSkin][descShape] = {};
  } else if (this.descriptions[descSkin][descShape]) {
    throw new Error('This Shape and Skin description combo is already in use');
  } else {
    this.descriptions[descSkin][descShape] = {};
  }

  const blockType = [shape, skin];
  this.blockIDs.push(blockType);
  this.descriptions[descSkin][descShape] = this.blockIDs.length - 1;
  return this.descriptions[descSkin][descShape];
};

alpha_BlockTypes.prototype.Get = function() {
  if (arguments.length == 1) {
    const id = arguments[0];
    return this.blockIDs[id];
  }
  let descSkin;
  let descShape;
  descSkin = arguments[0];
  descShape = arguments[1];
  if (this.descriptions[descSkin] == undefined) {
    console.log(this.descriptions);
    throw new Error(
        'No such skin description exists for \'' + (descSkin || '') + '\'',
    );
  } else if (this.descriptions[descSkin][descShape] == undefined) {
    throw new Error(
        'No such shape description exists for \'' + (descShape || '') + '\'',
    );
  }
  return this.descriptions[descSkin][descShape];
};

alpha_BlockTypes_Tests = new TestSuite('alpha_BlockTypes');

alpha_BlockTypes_Tests.addTest('alpha_BlockTypes', function(resultDom) {
  const types = new alpha_BlockTypes();

  const white = new alpha_Color(1, 1, 1);
  const dbrown = new alpha_Color('#3b2921');
  const lbrown = new alpha_Color('#604b42');
  const ggreen = new alpha_Color('#0b9615');
  const gray = new alpha_Color('#5e5a5e');
  const lgray = new alpha_Color('#726f72');

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

  // vertices!
  const cubeStructure = [
    new alpha_Vector(-0.5, 0.5, 0.5), // 1
    new alpha_Vector(0.5, 0.5, 0.5), // 2
    new alpha_Vector(0.5, 0.5, -0.5), // 3
    new alpha_Vector(-0.5, 0.5, -0.5), // 4
    new alpha_Vector(0.5, -0.5, 0.5), // 5
    new alpha_Vector(-0.5, -0.5, 0.5), // 6
    new alpha_Vector(-0.5, -0.5, -0.5), // 7
    new alpha_Vector(0.5, -0.5, -0.5), // 8
  ];
  const v = cubeStructure;

  // cube faces;
  const Top = new alpha_Face(v[2], v[3], v[0], v[1]);
  const Front = new alpha_Face(v[3], v[2], v[7], v[6]);
  const Left = new alpha_Face(v[0], v[3], v[6], v[5]);
  const Back = new alpha_Face(v[1], v[0], v[5], v[4]);
  const Right = new alpha_Face(v[2], v[1], v[4], v[7]);
  const Bottom = new alpha_Face(v[6], v[7], v[4], v[5]);

  // turn the faces into shapes

  // top to bottom
  // counter-clockwise
  // front to back
  const CUBE = new alpha_Shape(Top, Front, Left, Back, Right, Bottom);

  types.Create('stone', 'cube', stone, CUBE);
  if (types.Get('stone', 'cube') != types.Get('stone', 'cube')) {
    return 'Types do not match.';
  }
});

// --------------------------------------------
// --------------------------------------------
// --------------  Blocks ---------------------
// --------------------------------------------
// --------------------------------------------

function alpha_Block() {
  let id;
  let x;
  let y;
  let z;
  let orientation;
  if (arguments.length > 3) {
    id = arguments[0];
    x = arguments[1];
    y = arguments[2];
    z = arguments[3];
    orientation = arguments[4];
  } else if (arguments.length === 3) {
    id = arguments[0];
    x = arguments[1][0];
    y = arguments[1][1];
    z = arguments[1][2];
    orientation = arguments[2];
  } else {
    throw new Error('Unexpected number of arguments: ' + arguments.length);
  }

  this.id = id || 0;
  this.orientation = orientation || 0;
  if (this.orientation >= 24 || this.orientation < 0) {
    throw new Error('Orientation cannot be out of bounds: ' + this.orientation);
  }

  this[0] = x;
  this[1] = y;
  this[2] = z;

  if (
    typeof this[0] !== 'number' ||
    typeof this[1] !== 'number' ||
    typeof this[2] !== 'number'
  ) {
    throw new Error('All block components must be numeric.');
  }
}

function alpha_createBlock() {
  if (arguments.length > 3) {
    return new alpha_Block(
        arguments[0],
        arguments[1],
        arguments[2],
        arguments[3],
        arguments[4],
    );
  } else if (arguments.length == 3) {
    return new alpha_Block(arguments[0], arguments[1], arguments[2]);
  }
  throw new Error('Unexpected number of arguments: ' + arguments.length);
}

alpha_Block.prototype.Equals = function(other) {
  const fuzziness = 1e-10;
  for (let i = 0; i < this.length; ++i) {
    if (Math.abs(this[n] - other[n]) > fuzziness) {
      // Found a significant difference.
      return false;
    }
  }

  // Equal.
  return true;
};

alpha_Block.prototype.GetAngleAxis = function() {
  return alpha_BlockOrientations[this.orientation].ToAxisAndAngle();
};

// naively calling this function results in a quaternion that you can
// manipulate but not  destroy the Block.Orienations
// passing something to actual lets you avoid the overhead of making a new
// quaternion; and returns the same quaternion for the same rotation
// for better comparing
// in C these values would be const static
alpha_Block.prototype.GetQuaternion = function(actual) {
  if (actual) {
    return alpha_BlockOrientations[this.orientation];
  }
  return new alpha_Quaternion(alpha_BlockOrientations[this.orientation]);
};

const s45 = Math.sin(Math.PI / 4); // Math.sqrt(2) / 2 or Math.sin(45)

alpha_BlockOrientations = [
  // BOTTOM
  // X( 0 )  Y( 0 )  Z( 0 )
  new alpha_Quaternion(0, 0, 0, 1), // 0
  // X( 0 )  Y( 90 )  Z( 0 )
  new alpha_Quaternion(0, s45, 0, s45), // 1
  // X( 0 )  Y( 180 )  Z( 0 )
  new alpha_Quaternion(0, 1, 0, 0), // 2
  // X( 0 )  Y( 270 )  Z( 0 )
  new alpha_Quaternion(0, s45, 0, -s45), // 3

  // FRONT
  // X( 90 )  Y( 0 )  Z( 0 )
  new alpha_Quaternion(-s45, 0, 0, -s45), // 4
  // X( 90 )  Y( 90 )  Z( 0 )
  new alpha_Quaternion(-0.5, -0.5, -0.5, -0.5), // 5
  // X( 90 )  Y( 180 )  Z( 0 )
  new alpha_Quaternion(0, -s45, -s45, 0), // 6
  // X( 90 )  Y( 270 )  Z( 0 )
  new alpha_Quaternion(0.5, -0.5, -0.5, 0.5), // 7

  // LEFT
  // X( 0 )  Y( 0 )  Z( 270 )
  new alpha_Quaternion(0, 0, -s45, s45), // 8
  // X( 0 )  Y( 90 )  Z( 270 )
  new alpha_Quaternion(0.5, 0.5, -0.5, 0.5), // 9
  // X( 0 )  Y( 180 )  Z( 270 )
  new alpha_Quaternion(s45, s45, 0, 0), // 10
  // X( 0 )  Y( 270 )  Z( 270 )
  new alpha_Quaternion(0.5, 0.5, 0.5, -0.5), // 11

  // BACK
  // X( 270 )  Y( 0 )  Z( 0 )
  new alpha_Quaternion(-s45, 0, 0, s45), // 12
  // X( 270 )  Y( 90 )  Z( 0 )
  new alpha_Quaternion(-0.5, 0.5, -0.5, 0.5), // 13
  // X( 270 )  Y( 180 )  Z( 0 )
  new alpha_Quaternion(0, s45, -s45, 0), // 14
  // X( 270 )  Y( 270 )  Z( 0 )
  new alpha_Quaternion(0.5, 0.5, -0.5, -0.5), // 15

  // RIGHT
  // X( 0 )  Y( 0 )  Z( 90 )
  new alpha_Quaternion(0, 0, -s45, -s45), // 16
  // X( 0 )  Y( 90 )  Z( 90 )
  new alpha_Quaternion(0.5, -0.5, -0.5, -0.5), // 17
  // X( 0 )  Y( 180 )  Z( 90 )
  new alpha_Quaternion(s45, -s45, 0, 0), // 18
  // X( 0 )  Y( 270 )  Z( 90 )
  new alpha_Quaternion(0.5, -0.5, 0.5, 0.5), // 19

  // TOP
  // X( 180 )  Y( 0 )  Z( 0 )
  new alpha_Quaternion(1, 0, 0, 0), // 20
  // X( 180 )  Y( 90 )  Z( 0 )
  new alpha_Quaternion(s45, 0, s45, 0), // 21
  // X( 180 )  Y( 180 )  Z( 0 )
  new alpha_Quaternion(0, 0, 1, 0), // 22
  // X( 180 )  Y( 270 )  Z( 0 )
  new alpha_Quaternion(-s45, 0, s45, 0), // 23
];
