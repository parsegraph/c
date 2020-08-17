/**
 * Returns a list of 2-D vertex coordinates that will create
 * a rectangle, centered at the specified position.
 */
function parsegraph_generateRectangleVertices(x, y, w, h)
{
    return [
        x - w / 2, y - h / 2,
        x + w / 2, y - h / 2,
        x + w / 2, y + h / 2,

        x - w / 2, y - h / 2,
        x + w / 2, y + h / 2,
        x - w / 2, y + h / 2
    ];
}

function parsegraph_getTextureSize(gl)
{
    return Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
}

function getVerts(width, length, height)
{
    return [
        // Front
        [-width, length, height], // v0
        [ width, length, height], // v1
        [ width, length,-height], // v2
        [-width, length,-height], // v3

        // Back
        [ width,-length, height], // v4
        [-width,-length, height], // v5
        [-width,-length,-height], // v6
        [ width,-length,-height], // v7

        // Left
        [width, length, height], // v1
        [width,-length, height], // v4
        [width,-length,-height], // v7
        [width, length,-height], // v2

        // Right
        [-width,-length, height], // v5
        [-width, length, height], // v0
        [-width, length,-height], // v3
        [-width,-length,-height], // v6

        // Top
        [ width, length, height], // v1
        [-width, length, height], // v0
        [-width,-length, height], // v5
        [ width,-length, height], // v4

        // Bottom
        [ width,-length,-height], // v7
        [-width,-length,-height], // v6
        [-width, length,-height], // v3
        [ width, length,-height] //v2
    ];
}

function parsegraph_generateRectangleTexcoords()
{
    return [
        0, 0,
        1, 0,
        1, 1,

        0, 0,
        1, 1,
        0, 1
    ];
}

// The following methods were copied from webglfundamentals.org:

/**
 * Creates and compiles a shader.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} shaderSource The GLSL source code for the shader.
 * @param {number} shaderType The type of shader, VERTEX_SHADER or
 *     FRAGMENT_SHADER.
 * @return {!WebGLShader} The shader.
 */
function compileShader(gl, shaderSource, shaderType, shaderName) {
  // Create the shader object
  var shader = gl.createShader(shaderType);
 
  // Set the shader source code.
  gl.shaderSource(shader, shaderSource);
 
  // Compile the shader
  gl.compileShader(shader);
 
  // Check if it compiled
  if(!parsegraph_IGNORE_GL_ERRORS) {
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    // Something went wrong during compilation; get the error
      throw new Error("Could not compile " + (shaderType === gl.FRAGMENT_SHADER ? "fragment" : "vertex") + " shader " + shaderName + ": " + gl.getShaderInfoLog(shader));
  }
  }
 
  return shader;
}

/**
 * Creates a program from 2 shaders.
 *
 * @param {!WebGLRenderingContext) gl The WebGL context.
 * @param {!WebGLShader} vertexShader A vertex shader.
 * @param {!WebGLShader} fragmentShader A fragment shader.
 * @return {!WebGLProgram} A program.
 */
function createProgram(gl, vertexShader, fragmentShader) {
  // create a program.
  var program = gl.createProgram();
 
  // attach the shaders.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
 
  // link the program.
  gl.linkProgram(program);
 
  // Check if it linked.
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
      // something went wrong with the link
      throw ("program filed to link:" + gl.getProgramInfoLog (program));
  }
 
  return program;
};

function parsegraph_glErrorString(gl, err)
{
    if(arguments.length < 2) {
        throw new Error("A GL context must be provided with the error");
    }
    switch(0 + err) {
    case gl.NO_ERROR: return "NO_ERROR";
    case gl.INVALID_ENUM: return "INVALID_ENUM";
    case gl.INVALID_VALUE: return "INVALID_VALUE";
    case gl.INVALID_OPERATION: return "INVALID_OPERATION";
    case gl.INVALID_FRAMEBUFFER_OPERATION: return "INVALID_FRAMEBUFFER_OPERATION";
    case gl.OUT_OF_MEMORY: return "OUT_OF_MEMORY";
    case gl.CONTEXT_LOST_WEBGL: return "CONTEXT_LOST_WEBGL";
    default: return err;
    }
}

function parsegraph_checkGLError()
{
    if(parsegraph_IGNORE_GL_ERRORS) {
        return;
    }
    var gl = arguments[0];
    var msg;
    if(arguments.length > 1) {
        msg = arguments[1];
        for(var i=2; i < arguments.length; ++i) {
            msg += arguments[i];
        }
    }
    var err;
    if((err = gl.getError()) != gl.NO_ERROR && err != gl.CONTEXT_LOST_WEBGL) {
        if(msg) {
            throw new Error("WebGL error during " + msg + ": " + parsegraph_glErrorString(gl, err));
        }
        else {
            throw new Error("WebGL error: " + parsegraph_glErrorString(gl, err));
        }
    }
}

function parsegraph_compileProgram(window, shaderName, vertexShader, fragShader)
{
    var gl = window.gl();
    var shaders = window.shaders();
    if(gl.isContextLost()) {
        return;
    }
    if(shaders[shaderName]) {
        return shaders[shaderName];
    }

    var program = gl.createProgram();
    parsegraph_checkGLError(gl, "compileProgram.createProgram(shaderName='", shaderName, ")");

    var compiledVertexShader = compileShader(gl, vertexShader, gl.VERTEX_SHADER, shaderName);
    parsegraph_checkGLError(gl, "compileProgram.compile vertex shader(shaderName='", shaderName, ")");

    gl.attachShader(program, compiledVertexShader);
    parsegraph_checkGLError(gl, "compileProgram.attach vertex shader(shaderName='", shaderName, ")");

    var compiledFragmentShader = compileShader(gl, fragShader, gl.FRAGMENT_SHADER, shaderName);
    parsegraph_checkGLError(gl, "compileProgram.compile fragment shader(shaderName='", shaderName, ")");
    gl.attachShader(program, compiledFragmentShader);
    parsegraph_checkGLError(gl, "compileProgram.attach fragment shader(shaderName='", shaderName, ")");

    gl.linkProgram(program);
    if(!parsegraph_IGNORE_GL_ERRORS) {
        var st = gl.getProgramParameter(program, gl.LINK_STATUS);
        if(!st) {
            throw new Error("'" + shaderName + "' shader program failed to link:\n" + gl.getProgramInfoLog (program));
        }
        if((err = gl.getError()) != gl.NO_ERROR && err != gl.CONTEXT_LOST_WEBGL) {
            throw new Error("'" + shaderName + "' shader program failed to link: " + err);
        }
    }

    shaders[shaderName] = program;
    console.log("Created shader for " + shaderName + ": " + program);
    return program;
}

/**
 * Creates a shader from the content of a script tag.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} scriptId The id of the script tag.
 * @param {string} opt_shaderType. The type of shader to create.
 *     If not passed in will use the type attribute from the
 *     script tag.
 * @return {!WebGLShader} A shader.
 */
function createShaderFromScriptTag(gl, scriptId, opt_shaderType) {
  // look up the script tag by id.
  var shaderScript = document.getElementById(scriptId);
  if (!shaderScript) {
    throw("*** Error: unknown script element: " + scriptId);
  }
 
  // extract the contents of the script tag.
  var shaderSource = shaderScript.text;
 
  // If we didn't pass in a type, use the 'type' from
  // the script tag.
  if (!opt_shaderType) {
    if (shaderScript.type == "x-shader/x-vertex") {
      opt_shaderType = gl.VERTEX_SHADER;
    } else if (shaderScript.type == "x-shader/x-fragment") {
      opt_shaderType = gl.FRAGMENT_SHADER;
    } else if (!opt_shaderType) {
      throw("*** Error: shader type not set");
    }
  }
 
  return compileShader(gl, shaderSource, opt_shaderType);
};

/**
 * Creates a program from 2 script tags.
 *
 * @param {!WebGLRenderingContext} gl The WebGL Context.
 * @param {string} vertexShaderId The id of the vertex shader script tag.
 * @param {string} fragmentShaderId The id of the fragment shader script tag.
 * @return {!WebGLProgram} A program
 */
function createProgramFromScripts(
    gl, vertexShaderId, fragmentShaderId) {
  var vertexShader = createShaderFromScriptTag(gl, vertexShaderId);
  var fragmentShader = createShaderFromScriptTag(gl, fragmentShaderId);
  return createProgram(gl, vertexShader, fragmentShader);
}

function resize(gl) {
  // Get the canvas from the WebGL context
  var canvas = gl.canvas;

  // Lookup the size the browser is displaying the canvas.
  var displayWidth  = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  if (canvas.width  != displayWidth ||
      canvas.height != displayHeight) {

    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    // Set the viewport to match
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function matrixIdentity3x3()
{
    var arr = new Float32Array(9);
    arr[0] = 1;
    arr[4] = 1;
    arr[8] = 1;
    return arr;
}

function matrixCopy3x3(src)
{
    return [
        src[0], src[1], src[2],
        src[3], src[4], src[5],
        src[6], src[7], src[8]
    ];
}

function matrixMultiply3x3()
{
    if(arguments.length === 0) {
        throw new Error("At least two matrices must be provided.");
    }
    if(arguments.length === 1) {
        return arguments[0];
    }
    var rv = matrixCopy3x3(arguments[0]);
    for(var i = 1; i < arguments.length; ++i) {
        var a = rv;
        var b = arguments[i];
        rv = [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
            a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
            a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

            a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
            a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
            a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

            a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
            a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
            a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
        ];
    }

    return rv;
}

function matrixMultiply3x3I(dest, a, b)
{
    return matrixSet3x3(dest,
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
        a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
        a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
        a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
        a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
        a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
        a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
        a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
        a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    );
}

function matrixTransform2D(world, x, y)
{
    return [
        world[0] * x + world[1] * y + world[2],
        world[3] * x + world[4] * y + world[5]
    ];
}

function makeTranslation3x3(tx, ty) {
    return makeTranslation3x3I(matrixIdentity3x3(), tx, ty);
}

function makeTranslation3x3I(dest, tx, ty) {
    return matrixSet3x3(dest,
        1, 0, 0,
        0, 1, 0,
        tx, ty, 1
    );
}

function makeRotation3x3(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
        c,-s, 0,
        s, c, 0,
        0, 0, 1
    ];
}

function makeScale3x3(sx, sy) {
    if(arguments.length === 1) {
        sy = sx;
    }
    return makeScale3x3I(matrixIdentity3x3(), sx, sy);
}

function matrixSet3x3(dest, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
    dest[0] = a1;
    dest[1] = a2;
    dest[2] = a3;
    dest[3] = a4;
    dest[4] = a5;
    dest[5] = a6;
    dest[6] = a7;
    dest[7] = a8;
    dest[8] = a9;
    return dest;
}

function makeScale3x3I(dest, sx, sy) {
    if(arguments.length === 2) {
        sy = sx;
    }
    return matrixSet3x3(dest,
        sx, 0, 0,
        0, sy, 0,
        0, 0, 1
    );
}

// http://stackoverflow.com/questions/983999/simple-3x3-matrix-inverse-code-c
function makeInverse3x3(input)
{
    var m = function(col, row) {
        return input[row * 3 + col];
    };
    // computes the inverse of a matrix m
    var det = m(0, 0) * (m(1, 1) * m(2, 2) - m(2, 1) * m(1, 2)) -
                 m(0, 1) * (m(1, 0) * m(2, 2) - m(1, 2) * m(2, 0)) +
                 m(0, 2) * (m(1, 0) * m(2, 1) - m(1, 1) * m(2, 0));

    var invdet = 1 / det;

    return [
        (m(1, 1) * m(2, 2) - m(2, 1) * m(1, 2)) * invdet,
        (m(0, 2) * m(2, 1) - m(0, 1) * m(2, 2)) * invdet,
        (m(0, 1) * m(1, 2) - m(0, 2) * m(1, 1)) * invdet,
        (m(1, 2) * m(2, 0) - m(1, 0) * m(2, 2)) * invdet,
        (m(0, 0) * m(2, 2) - m(0, 2) * m(2, 0)) * invdet,
        (m(1, 0) * m(0, 2) - m(0, 0) * m(1, 2)) * invdet,
        (m(1, 0) * m(2, 1) - m(2, 0) * m(1, 1)) * invdet,
        (m(2, 0) * m(0, 1) - m(0, 0) * m(2, 1)) * invdet,
        (m(0, 0) * m(1, 1) - m(1, 0) * m(0, 1)) * invdet
    ];
}

function midPoint(x1, y1, x2, y2)
{
    return [
        x1 + (x2 - x1) * .5,
        y1 + (y2 - y1) * .5
    ];
}

function make2DProjection(width, height, flipVertical)
{
    if(flipVertical === undefined) {
        flipVertical = parsegraph_VFLIP;
    }
    flipVertical = flipVertical === true;
    //console.log("Making 2D projection (flipVertical=" + flipVertical + ")");
    flipVertical = flipVertical ? -1 : 1;
    return [
        2 / width, 0, 0,
        0, -2 / (flipVertical * height), 0,
        -1, flipVertical, 1
    ];
};

function subtractVectors3D(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize3D(v) {
  var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  // make sure we don't divide by 0.
  if (length > 0.00001) {
    return [v[0] / length, v[1] / length, v[2] / length];
  } else {
    return [0, 0, 0];
  }
}

function cross3D(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

function makePerspective(fieldOfViewInRadians, aspect, near, far)
{
  var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
  var rangeInv = 1.0 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ];
};

function makeTranslation4x4(tx, ty, tz) {
  return [
     1,  0,  0,  0,
     0,  1,  0,  0,
     0,  0,  1,  0,
    tx, ty, tz,  1
  ];
}

function makeXRotation(angleInRadians) {
  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);

  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1
  ];
};

function makeYRotation(angleInRadians) {
  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);

  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1
  ];
};

function makeZRotation(angleInRadians) {
  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);
  return [
     c, s, 0, 0,
    -s, c, 0, 0,
     0, 0, 1, 0,
     0, 0, 0, 1,
  ];
}

function makeScale4x4(sx, sy, sz) {
  return [
    sx, 0,  0,  0,
    0, sy,  0,  0,
    0,  0, sz,  0,
    0,  0,  0,  1,
  ];
}

function matrixMultiply4x4(a, b) {
  var a00 = a[0*4+0];
  var a01 = a[0*4+1];
  var a02 = a[0*4+2];
  var a03 = a[0*4+3];
  var a10 = a[1*4+0];
  var a11 = a[1*4+1];
  var a12 = a[1*4+2];
  var a13 = a[1*4+3];
  var a20 = a[2*4+0];
  var a21 = a[2*4+1];
  var a22 = a[2*4+2];
  var a23 = a[2*4+3];
  var a30 = a[3*4+0];
  var a31 = a[3*4+1];
  var a32 = a[3*4+2];
  var a33 = a[3*4+3];
  var b00 = b[0*4+0];
  var b01 = b[0*4+1];
  var b02 = b[0*4+2];
  var b03 = b[0*4+3];
  var b10 = b[1*4+0];
  var b11 = b[1*4+1];
  var b12 = b[1*4+2];
  var b13 = b[1*4+3];
  var b20 = b[2*4+0];
  var b21 = b[2*4+1];
  var b22 = b[2*4+2];
  var b23 = b[2*4+3];
  var b30 = b[3*4+0];
  var b31 = b[3*4+1];
  var b32 = b[3*4+2];
  var b33 = b[3*4+3];
  return [a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
          a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
          a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
          a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
          a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
          a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
          a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
          a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
          a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
          a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
          a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
          a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
          a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,
          a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,
          a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,
          a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33];
}

function makeInverse4x4(m) {
  var m00 = m[0 * 4 + 0];
  var m01 = m[0 * 4 + 1];
  var m02 = m[0 * 4 + 2];
  var m03 = m[0 * 4 + 3];
  var m10 = m[1 * 4 + 0];
  var m11 = m[1 * 4 + 1];
  var m12 = m[1 * 4 + 2];
  var m13 = m[1 * 4 + 3];
  var m20 = m[2 * 4 + 0];
  var m21 = m[2 * 4 + 1];
  var m22 = m[2 * 4 + 2];
  var m23 = m[2 * 4 + 3];
  var m30 = m[3 * 4 + 0];
  var m31 = m[3 * 4 + 1];
  var m32 = m[3 * 4 + 2];
  var m33 = m[3 * 4 + 3];
  var tmp_0  = m22 * m33;
  var tmp_1  = m32 * m23;
  var tmp_2  = m12 * m33;
  var tmp_3  = m32 * m13;
  var tmp_4  = m12 * m23;
  var tmp_5  = m22 * m13;
  var tmp_6  = m02 * m33;
  var tmp_7  = m32 * m03;
  var tmp_8  = m02 * m23;
  var tmp_9  = m22 * m03;
  var tmp_10 = m02 * m13;
  var tmp_11 = m12 * m03;
  var tmp_12 = m20 * m31;
  var tmp_13 = m30 * m21;
  var tmp_14 = m10 * m31;
  var tmp_15 = m30 * m11;
  var tmp_16 = m10 * m21;
  var tmp_17 = m20 * m11;
  var tmp_18 = m00 * m31;
  var tmp_19 = m30 * m01;
  var tmp_20 = m00 * m21;
  var tmp_21 = m20 * m01;
  var tmp_22 = m00 * m11;
  var tmp_23 = m10 * m01;

  var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
      (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
  var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
      (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
  var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
      (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
  var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
      (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

  var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

  return [
    d * t0,
    d * t1,
    d * t2,
    d * t3,
    d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
          (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
    d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
          (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
    d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
          (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
    d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
          (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
    d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
          (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
    d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
          (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
    d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
          (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
    d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
          (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
    d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
          (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
    d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
          (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
    d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
          (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
    d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
          (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02))
  ];
}

function matrixVectorMultiply4x4(v, m) {
  var dst = [];
  for (var i = 0; i < 4; ++i) {
    dst[i] = 0.0;
    for (var j = 0; j < 4; ++j)
      dst[i] += v[j] * m[j * 4 + i];
  }
  return dst;
};

/**
 * Returns a 4x4 matrix that, positioned from the camera position,
 * looks at the target, a position in 3-space, angled using the
 * up vector.
 */
function makeLookAt(cameraPosition, target, up) {
  var zAxis = normalize3D(
      subtractVectors3D(cameraPosition, target));
  var xAxis = cross3D(up, zAxis);
  var yAxis = cross3D(zAxis, xAxis);

  return [
     xAxis[0], xAxis[1], xAxis[2], 0,
     yAxis[0], yAxis[1], yAxis[2], 0,
     zAxis[0], zAxis[1], zAxis[2], 0,
     cameraPosition[0],
     cameraPosition[1],
     cameraPosition[2],
     1];
}

// End methods from webglfundamentals.org
