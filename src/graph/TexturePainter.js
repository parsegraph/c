parsegraph_TexturePainter_VertexShader =
"uniform mat3 u_world;\n" +
"" +
"attribute vec2 a_position;" +
"attribute vec2 a_texCoord;" +
"" +
"varying highp vec2 texCoord;" +
"" +
"void main() {" +
    "gl_Position = vec4((u_world * vec3(a_position, 1.0)).xy, 0.0, 1.0);" +
   "texCoord = a_texCoord;" +
"}";

parsegraph_TexturePainter_FragmentShader =
"uniform sampler2D u_texture;\n" +
"varying highp vec2 texCoord;\n" +
"\n" +
"void main() {\n" +
    "gl_FragColor = texture2D(u_texture, texCoord.st);" +
"}";

function parsegraph_TexturePainter(gl, textureId, texWidth, texHeight, shaders)
{
    this._gl = gl;

    // Compile the shader program.
    var shaderName = "parsegraph_TexturePainter";
    if(!shaders[shaderName]) {
        var program = gl.createProgram();

        gl.attachShader(
            program, compileShader(
                gl, parsegraph_TexturePainter_VertexShader, gl.VERTEX_SHADER
            )
        );

        var fragProgram = parsegraph_TexturePainter_FragmentShader;
        gl.attachShader(
            program, compileShader(gl, fragProgram, gl.FRAGMENT_SHADER)
        );

        gl.linkProgram(program);
        if(!gl.getProgramParameter(
            program, gl.LINK_STATUS
        )) {
            throw new Error("'" + shaderName + "' shader program failed to link.");
        }

        shaders[shaderName] = program;
    }
    this._textureProgram = shaders[shaderName];
    this._texture = textureId;
    this._texWidth = texWidth;
    this._texHeight = texHeight;

    // Prepare attribute buffers.
    this._buffer = parsegraph_createPagingBuffer(this._gl, this._textureProgram);
    this.a_position = this._buffer.defineAttrib("a_position", 2);
    this.a_color = this._buffer.defineAttrib("a_color", 4);
    this.a_backgroundColor = this._buffer.defineAttrib("a_backgroundColor", 4);
    this.a_texCoord = this._buffer.defineAttrib("a_texCoord", 2);

    // Cache program locations.
    this.u_world = this._gl.getUniformLocation(
        this._textureProgram, "u_world"
    );
    this.u_texture = this._gl.getUniformLocation(
        this._textureProgram, "u_texture"
    );

    this._color = parsegraph_createColor(1, 1, 1, 1);
    this._backgroundColor = parsegraph_createColor(0, 0, 0, 0);

    this._buffer.addPage();
};

parsegraph_TexturePainter.prototype.texture = function()
{
    return this._texture;
};

parsegraph_TexturePainter.prototype.drawWholeTexture = function(x, y, width, height, scale)
{
    return this.drawTexture(
        0, 0, this._texWidth, this._texHeight,
        x, y, width, height, scale
    );
};

parsegraph_TexturePainter.prototype.drawTexture = function(
    iconX, iconY, iconWidth, iconHeight,
    x, y, width, height,
    scale)
{
    // Append position data.
    this._buffer.appendData(
        this.a_position,
        [
            x, y,
            x + width * scale, y,
            x + width * scale, y + height * scale,

            x, y,
            x + width * scale, y + height * scale,
            x, y + height * scale
        ]
    );

    // Append texture coordinate data.
    this._buffer.appendData(
        this.a_texCoord,
        [
            iconX / this._texWidth,
            (iconY + iconHeight) / this._texHeight,

            (iconX + iconWidth) / this._texWidth,
            (iconY + iconHeight) / this._texHeight,

            (iconX + iconWidth) / this._texWidth,
            iconY / this._texHeight,

            iconX / this._texWidth,
            (iconY + iconHeight) / this._texHeight,

            (iconX + iconWidth) / this._texWidth,
            iconY / this._texHeight,

            iconX / this._texWidth,
            iconY / this._texHeight,
        ]
    );
};

parsegraph_TexturePainter.prototype.clear = function()
{
    this._buffer.clear();
    this._buffer.addPage();
};

parsegraph_TexturePainter.prototype.render = function(world)
{
    var gl = this._gl;

    // Load program.
    this._gl.useProgram(
        this._textureProgram
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.uniform1i(this.u_texture, 0);

    // Render text.
    gl.uniformMatrix3fv(this.u_world, false, world);
    this._buffer.renderPages();
};
