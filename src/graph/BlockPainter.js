import { parsegraph_createColor } from './Color';
import parsegraph_Rect from './Rect';
import {
    parsegraph_compileProgram
} from '../gl';

const parsegraph_BlockPainter_VertexShader =
"uniform mat3 u_world;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec2 a_texCoord;\n" +
"attribute vec4 a_color;\n" +
"attribute vec4 a_borderColor;\n" +
"attribute highp float a_borderRoundedness;\n" +
"attribute highp float a_borderThickness;\n" +
"attribute highp float a_aspectRatio;\n" +
"\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp vec4 contentColor;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);\n" +
    "contentColor = a_color;\n" +
    "borderColor = a_borderColor;\n" +
    "borderRoundedness = max(0.001, a_borderRoundedness);\n" +
    "texCoord = a_texCoord;\n" +
    "borderThickness = a_borderThickness;\n" +
    "aspectRatio = a_aspectRatio;\n" +
"}";

const parsegraph_BlockPainter_VertexShader_Simple =
"uniform mat3 u_world;\n" +
"\n" +
"attribute vec2 a_position;\n" +
"attribute vec4 a_color;\n" +
"\n" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
    "contentColor = a_color;" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_FragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));" +

    // Default antialias implementation.
    "highp float borderTolerance = 0.0;" +
    "highp float inBorder = 1.0 - smoothstep(" +
        "borderRoundedness - borderTolerance, " +
        "borderRoundedness + borderTolerance, " +
        "d" +
    ");" +
    "highp float edgeWidth = 0.0;" +
    "highp float inContent = 1.0 - smoothstep(" +
        "(borderRoundedness - borderThickness) - edgeWidth," +
        "(borderRoundedness - borderThickness) + edgeWidth," +
        "d" +
    ");" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

// Same as above, but using a better antialiasing technique.
const parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"highp float aastep(float threshold, float value)\n" +
"{\n" +
    "highp float afwidth = 0.9 * length(vec2(dFdx(value), dFdy(value)));\n" +
    "return smoothstep(threshold - afwidth, threshold + afwidth, value);\n" +
    //"return step(threshold, value);\n" +
"}\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +

    // Calculate the distance function.
    "highp float d = length(max(abs(st) - (1.0 - borderRoundedness), 0.0));" +

    // Using 'OpenGL insights' antialias implementation
    "highp float inBorder = 1.0 - aastep(borderRoundedness, d);\n" +
    "highp float inContent = 1.0 - aastep(borderRoundedness - borderThickness, d);\n" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

const parsegraph_BlockPainter_FragmentShader_Simple =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = contentColor;" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_SquareFragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "\n"+
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +
    "if(st.y < 1.0 - borderThickness && st.x < 1.0 - borderThickness) {" +
        "gl_FragColor = contentColor;" +
    "} else {" +
        "gl_FragColor = borderColor;" +
    "}" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_ShadyFragmentShader =
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
// Plot a line on Y using a value between 0.0-1.0
"float plot(vec2 st, float pct) {" +
  "return smoothstep(pct-0.02, pct, st.y) - smoothstep(pct, pct+0.02, st.y);" +
"}" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "\n" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "\n"+
    "gl_FragColor = vec4(vec3(0.5 - (0.3 * st.y)), 1.0);" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_AngleFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;" +
    "highp float insideYContent = 1.0 - step(1.0 - t, st.y);" +
    "highp float insideXBorder = step(1.0 - t, st.x);" +

    // y = y1 + m(x - x1)
    "highp float insideBorderAngle = 1.0 - step((st.x - 1.0)/-t, st.y);" +
    "highp float insideContentAngle = 1.0 - step((st.x - 1.0)/-t - aspectRatio, st.y);" +

    "highp float inBorder = step(1.0, insideBorderAngle);\n" +
    "highp float inContent = step(1.0, insideContentAngle * insideYContent);\n" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_ParenthesisFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    // Adjust for the aspect ratio.
    "st.x = mix(st.x, pow(abs(st.x), 1.0/aspectRatio), step(aspectRatio, 1.0));\n" +
    "st.y = mix(st.y, pow(abs(st.y), aspectRatio), 1.0 - step(aspectRatio, 1.0));\n" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    // 1.0 if st is inside the X-axis border.
    "highp float t = borderThickness;" +
    "highp float insideYContent = step(1.0 - t, st.y);" +
    "highp float insideXBorder = step(1.0 - t, st.x/(1.0 - t/2.0));" +

    "highp float inBorder = step(1.0, 1.0 - insideXBorder + 1.0 - step(1.0, length(vec2((st.x - (1.0 - t))/t, st.y/(1.0 + 2.0*t)))));" +
    "highp float inContent = step(1.0, 1.0 - step(1.0 - t, st.x)*(1.0 - insideYContent) + 1.0 - step(1.0 - t, length(vec2((st.x/(1.0 - t) - (1.0 - t))/t, st.y/(1.0 + 3.0*t)))));" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inContent);" +
"}";

// Derived from https://thebookofshaders.com/07/
const parsegraph_BlockPainter_CurlyFragmentShader =
"#extension GL_OES_standard_derivatives : enable\n" +
"\n" +
"#ifdef GL_ES\n" +
"precision mediump float;\n" +
"#endif\n" +
"" +
"varying highp vec4 contentColor;\n" +
"varying highp vec4 borderColor;\n" +
"varying highp float borderRoundedness;\n" +
"varying highp vec2 texCoord;\n" +
// borderThickness is in [0, 1] terms.
"varying highp float borderThickness;\n" +
"varying highp float aspectRatio;\n" +
"\n" +
"void main() {\n" +
    // Adjust for the aspect ratio.
    "highp vec2 st = texCoord;\n" +
    "st = st * 2.0 - 1.0;" +
    "st.x = abs(st.x);" +
    "st.y = abs(st.y);" +

    "highp float t = borderThickness;" +
    "highp float inBorder = step(st.y, smoothstep(0.0, t, 1.0 - st.x));" +
    "highp float inContent = step(1.0, step(st.y, (1.0-t)*smoothstep(0.0, t, 1.0 - (st.x + t*aspectRatio))));" +

    // Map the two calculated indicators to their colors.
    "gl_FragColor = vec4(borderColor.rgb, borderColor.a * inBorder);" +
    "gl_FragColor = mix(gl_FragColor, contentColor, inBorder * inContent);" +
"}";

var parsegraph_BlockPainter_COUNT = 0;

export default function parsegraph_BlockPainter(window)
{
    this._id = parsegraph_BlockPainter_COUNT++;
    this._window = window;
    if(!this._window) {
        throw new Error("Window must be provided");
    }

    // Prepare buffer using prepare(numBlocks). BlockPainter supports a fixed number of blocks.
    this._blockBuffer = null;
    this._blockBufferNumVertices = null;
    this._blockBufferVertexIndex = 0;

    // Setup initial uniform values.
    this._backgroundColor = parsegraph_createColor(1, 1, 1, .15);
    this._borderColor = parsegraph_createColor(parsegraph_createColor(1, 1, 1, 1));

    this._bounds = new parsegraph_Rect(NaN, NaN, NaN, NaN);

    this._blockProgram = null;
    this._blockProgramSimple = null;

    // Position: 2 * 4 (two floats)  0-7
    // TexCoord: 2 * 4 (two floats)  8-15
    // Color:    4 * 4 (four floats) 16-31
    // BorColor: 4 * 4 (four floats) 32-47
    // BorRound: 1 * 4 (one float)   48-51
    // BorThick: 1 * 4 (one float)   52-55
    // AspectRa: 1 * 4 (one float)   56-59
    this._stride = 60;
    this._vertexBuffer = new Float32Array(this._stride / 4);
    this._dataBufferVertexIndex = 0;
    this._dataBufferNumVertices = 6;
    this._dataBuffer = new Float32Array(this._dataBufferNumVertices*this._stride/4);

    this._maxSize = 0;
};

parsegraph_BlockPainter.prototype.bounds = function()
{
    return this._bounds;
};

parsegraph_BlockPainter.prototype.borderColor = function()
{
    return this._borderColor;
};

parsegraph_BlockPainter.prototype.setBorderColor = function(borderColor)
{
    this._borderColor = borderColor;
};

parsegraph_BlockPainter.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_BlockPainter.prototype.setBackgroundColor = function(backgroundColor)
{
    this._backgroundColor = backgroundColor;
};

parsegraph_BlockPainter.prototype.initBuffer = function(numBlocks)
{
    if(this._blockBufferNumVertices/6 === numBlocks) {
        // Same number of blocks, so just reset the counters and overwrite.
        this._blockBufferVertexIndex = 0;
        this._dataBufferVertexIndex = 0;
        return;
    }
    if(this._blockBuffer) {
        this.clear();
    }
    var gl = this._window.gl();
    this._blockBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._blockBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this._stride*6*numBlocks, gl.STATIC_DRAW);
    this._blockBufferNumVertices = numBlocks*6;
};

parsegraph_BlockPainter.prototype.clear = function()
{
    if(!this._window) {
        return;
    }
    var gl = this._window.gl();
    if(this._blockBuffer && !gl.isContextLost()) {
        gl.deleteBuffer(this._blockBuffer);
    }
    this._blockBuffer = null;
    this._bounds.toNaN();
    this._blockBufferNumVertices = null;
    this._dataBufferVertexIndex = 0;
    this._blockBufferVertexIndex = 0;
    this._maxSize = 0;
};

parsegraph_BlockPainter.prototype.writeVertex = function()
{
    var pos = this._dataBufferVertexIndex++ * this._stride/4;
    this._dataBuffer.set(this._vertexBuffer, pos);
    if(this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
        this.flush();
    }
};

parsegraph_BlockPainter.prototype.flush = function()
{
    if(this._dataBufferVertexIndex === 0) {
        return;
    }
    var gl = this._window.gl();
    var stride = this._stride;
    gl.bindBuffer(gl.ARRAY_BUFFER, this._blockBuffer);

    if(this._dataBufferVertexIndex + this._blockBufferVertexIndex > this._blockBufferNumVertices) {
        throw new Error("GL buffer of " + this._blockBufferNumVertices + " vertices is full; cannot flush all " + this._dataBufferVertexIndex + " vertices because the GL buffer already has " + this._blockBufferVertexIndex + " vertices.");
    }
    if(this._dataBufferVertexIndex >= this._dataBufferNumVertices) {
        //console.log("Writing " + this._dataBufferNumVertices + " vertices to offset " + this._blockBufferVertexIndex + " of " + this._blockBufferNumVertices + " vertices");
        gl.bufferSubData(gl.ARRAY_BUFFER, this._blockBufferVertexIndex*stride, this._dataBuffer);
    }
    else {
        //console.log("Partial flush (" + this._blockBufferVertexIndex + "/" + this._blockBufferNumVertices + " from " + (this._dataBufferVertexIndex*stride/4) + ")");
        gl.bufferSubData(gl.ARRAY_BUFFER, this._blockBufferVertexIndex*stride, this._dataBuffer.slice(0, this._dataBufferVertexIndex*stride/4));
    }
    this._blockBufferVertexIndex += this._dataBufferVertexIndex;
    this._dataBufferVertexIndex = 0;
};

parsegraph_BlockPainter.prototype.drawBlock = function(
    cx, cy, width, height, borderRoundedness, borderThickness, borderScale)
{
    var gl = this._window.gl();
    if(gl.isContextLost()) {
        return;
    }
    if(!this._blockBuffer) {
        throw new Error("BlockPainter.initBuffer(numBlocks) must be called first.");
    }
    if(this._blockBufferVertexIndex >= this._blockBufferNumVertices) {
        throw new Error("BlockPainter is full and cannot draw any more blocks.");
    }
    this._bounds.include(cx, cy, width, height);
    if(typeof cx !== "number" || Number.isNaN(cx)) {
        throw new Error("cx must be a number, but was " + cx);
    }
    if(typeof cy !== "number" || Number.isNaN(cy)) {
        throw new Error("cy must be a number, but was " + cy);
    }
    if(typeof width !== "number" || Number.isNaN(width)) {
        throw new Error("width must be a number, but was " + width);
    }
    if(typeof height !== "number" || Number.isNaN(height)) {
        throw new Error("height must be a number, but was " + height);
    }
    if(typeof borderRoundedness !== "number" || Number.isNaN(borderRoundedness)) {
        throw new Error("borderRoundedness must be a number, but was " + borderRoundedness);
    }
    if(typeof borderThickness !== "number" || Number.isNaN(borderThickness)) {
        throw new Error("borderThickness must be a number, but was " + borderThickness);
    }
    if(typeof borderScale !== "number" || Number.isNaN(borderScale)) {
        throw new Error("borderScale must be a number, but was " + borderScale);
    }

    var buf = this._vertexBuffer;

    // Append color data.
    var bg = this.backgroundColor();
    buf[4] = bg.r();
    buf[5] = bg.g();
    buf[6] = bg.b();
    buf[7] = bg.a();

    // Append border color data.
    var borC = this.borderColor();
    buf[8] = borC.r();
    buf[9] = borC.g();
    buf[10] = borC.b();
    buf[11] = borC.a();

    // Append border radius data.
    if(height < width) {
        buf[12] = borderScale * borderRoundedness / height;
        buf[13] = borderScale * borderThickness / height;
    }
    else {
        // height > width
        buf[12] = borderScale * borderRoundedness / width;
        buf[13] = borderScale * borderThickness / width;
    }
    buf[14] = height/width;

    // Append position and texture coordinate data.
    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    this.writeVertex();

    buf[0] = cx + width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 1;
    buf[3] = 0;
    this.writeVertex();

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    this.writeVertex();

    buf[0] = cx - width / 2;
    buf[1] = cy - height / 2;
    buf[2] = 0;
    buf[3] = 0;
    this.writeVertex();

    buf[0] = cx + width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 1;
    buf[3] = 1;
    this.writeVertex();

    buf[0] = cx - width / 2;
    buf[1] = cy + height / 2;
    buf[2] = 0;
    buf[3] = 1;
    this.writeVertex();

    this._maxSize = Math.max(this._maxSize, Math.max(width, height));
};

parsegraph_BlockPainter.prototype.toString = function()
{
    return "[parsegraph_BlockPainter " + this._id + "]";
};

parsegraph_BlockPainter.prototype.contextChanged = function(isLost)
{
    this.clear();
    this._blockProgram = null;
    this._blockProgramSimple = null;
};

parsegraph_BlockPainter.prototype.render = function(world, scale, forceSimple)
{
    this.flush();
    if(this._blockBufferVertexIndex === 0) {
        return;
    }
    var gl = this._window.gl();
    var usingSimple = forceSimple || (this._maxSize * scale) < 5;
    //console.log(this._id, this._maxSize * scale, usingSimple);

    if(this._blockProgram === null) {
        var fragProgram = parsegraph_BlockPainter_FragmentShader;
        // Avoid OES_standard_derivatives on Firefox.
        if(navigator.userAgent.indexOf("Firefox") == -1
            && gl.getExtension("OES_standard_derivatives") != null
        ) {
            fragProgram = parsegraph_BlockPainter_FragmentShader_OES_standard_derivatives;
        }
        this._blockProgram = parsegraph_compileProgram(this._window,
            "parsegraph_BlockPainter",
            parsegraph_BlockPainter_VertexShader,
            fragProgram
        );

        // Cache program locations.
        this.u_world = gl.getUniformLocation(this._blockProgram, "u_world");

        this.a_position = gl.getAttribLocation(this._blockProgram, "a_position");
        this.a_texCoord = gl.getAttribLocation(this._blockProgram, "a_texCoord");
        this.a_color = gl.getAttribLocation(this._blockProgram, "a_color");
        this.a_borderColor = gl.getAttribLocation(this._blockProgram, "a_borderColor");
        this.a_borderRoundedness = gl.getAttribLocation(this._blockProgram, "a_borderRoundedness");
        this.a_borderThickness = gl.getAttribLocation(this._blockProgram, "a_borderThickness");
        this.a_aspectRatio = gl.getAttribLocation(this._blockProgram, "a_aspectRatio");
    }
    if(this._blockProgramSimple === null) {
        this._blockProgramSimple = parsegraph_compileProgram(this._window,
            "parsegraph_BlockPainter_Simple",
            parsegraph_BlockPainter_VertexShader_Simple,
            parsegraph_BlockPainter_FragmentShader_Simple
        );
        this.simple_u_world = gl.getUniformLocation(this._blockProgramSimple, "u_world");
        this.simple_a_position = gl.getAttribLocation(this._blockProgramSimple, "a_position");
        this.simple_a_color = gl.getAttribLocation(this._blockProgramSimple, "a_color");
    }

    if(usingSimple) {
        gl.useProgram(this._blockProgramSimple);
        gl.uniformMatrix3fv(this.simple_u_world, false, world);
        gl.enableVertexAttribArray(this.simple_a_position);
        gl.enableVertexAttribArray(this.simple_a_color);
    }
    else {
        gl.useProgram(this._blockProgram);
        gl.uniformMatrix3fv(this.u_world, false, world);
        gl.enableVertexAttribArray(this.a_position);
        gl.enableVertexAttribArray(this.a_texCoord);
        gl.enableVertexAttribArray(this.a_color);
        gl.enableVertexAttribArray(this.a_borderColor);
        gl.enableVertexAttribArray(this.a_borderRoundedness);
        gl.enableVertexAttribArray(this.a_borderThickness);
        gl.enableVertexAttribArray(this.a_aspectRatio);
    }

    var stride = this._stride;
    if(!this._blockBuffer) {
        throw new Error("No block buffer to render; BlockPainter.initBuffer(numBlocks) must be called first.");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._blockBuffer);

    // Position: 2 * 4 (two floats)  0-7
    // TexCoord: 2 * 4 (two floats)  8-15
    // Color:    4 * 4 (four floats) 16-31
    // BorColor: 4 * 4 (four floats) 32-47
    // BorRound: 1 * 4 (one float)   48-51
    // BorThick: 1 * 4 (one float)   52-55
    // AspectRa: 1 * 4 (one float)   56-59
    if(usingSimple) {
        gl.vertexAttribPointer(this.simple_a_position,          2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(this.simple_a_color,             4, gl.FLOAT, false, stride, 16);
    }
    else {
        gl.vertexAttribPointer(this.a_position,          2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(this.a_texCoord,          2, gl.FLOAT, false, stride, 8);
        gl.vertexAttribPointer(this.a_color,             4, gl.FLOAT, false, stride, 16);
        gl.vertexAttribPointer(this.a_borderColor,       4, gl.FLOAT, false, stride, 32);
        gl.vertexAttribPointer(this.a_borderRoundedness, 1, gl.FLOAT, false, stride, 48);
        gl.vertexAttribPointer(this.a_borderThickness,   1, gl.FLOAT, false, stride, 52);
        gl.vertexAttribPointer(this.a_aspectRatio,       1, gl.FLOAT, false, stride, 56);
    }

    //console.log(this._blockBufferVertexIndex);
    gl.drawArrays(gl.TRIANGLES, 0, this._blockBufferVertexIndex);

    if(usingSimple) {
        gl.disableVertexAttribArray(this.simple_a_position);
        gl.disableVertexAttribArray(this.simple_a_color);
    }
    else {
        gl.disableVertexAttribArray(this.a_position);
        gl.disableVertexAttribArray(this.a_texCoord);
        gl.disableVertexAttribArray(this.a_color);
        gl.disableVertexAttribArray(this.a_borderColor);
        gl.disableVertexAttribArray(this.a_borderRoundedness);
        gl.disableVertexAttribArray(this.a_borderThickness);
        gl.disableVertexAttribArray(this.a_aspectRatio);
    }
};
