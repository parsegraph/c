function parsegraph_NodePainter(gl, glyphAtlas, shaders)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._blockPainter = new parsegraph_BlockPainter(this._gl, shaders);
    this._renderBlocks = true;

    this._extentPainter = new parsegraph_BlockPainter(this._gl, shaders);
    this._renderExtents = true;

    this._glyphPainter = new parsegraph_GlyphPainter(this._gl, glyphAtlas, shaders);

    this._renderText = true;

    this._textures = [];

    var glTextureSize = parsegraph_getGlyphTextureSize(this._gl);
    var pagesPerRow = glTextureSize / this._glyphPainter.glyphAtlas().pageTextureSize();
    this._pagesPerGlyphTexture = Math.pow(pagesPerRow, 2);
};

parsegraph_NodePainter.prototype.bounds = function()
{
    return this._blockPainter.bounds();
};

parsegraph_NodePainter.prototype.gl = function()
{
    return this._gl;
};

parsegraph_NodePainter.prototype.glyphPainter = function()
{
    return this._glyphPainter;
};

parsegraph_NodePainter.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;
};

parsegraph_NodePainter.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

parsegraph_NodePainter.prototype.clear = function()
{
    this._blockPainter.clear();
    this._extentPainter.clear();
    this._glyphPainter.clear();

    var gl = this._gl;
    this._textures.forEach(function(t) {
        t.clear();
        //gl.deleteTexture(t._texture);
    });
    this._textures = [];
};

parsegraph_NodePainter.prototype.drawSlider = function(node, worldX, worldY, userScale)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

    var drawLine = function(x1, y1, x2, y2, thickness, color) {
        var cx = x1 + (x2 - x1) / 2;
        var cy = y1 + (y2 - y1) / 2;

        var size;
        if(x1 == x2) {
            // Vertical line.
            size = new parsegraph_Size(
                parsegraph_LINE_THICKNESS * userScale * node.absoluteScale() * thickness,
                Math.abs(y2 - y1)
            );
        }
        else {
            // Horizontal line.
            size = new parsegraph_Size(
                Math.abs(x2 - x1),
                parsegraph_LINE_THICKNESS * userScale * node.absoluteScale() * thickness
            );
        }

        if(color === undefined) {
            if(node.isSelected()) {
                color = parsegraph_SELECTED_LINE_COLOR.premultiply(
                    style.backgroundColor
                );
            }
            else {
                color = parsegraph_LINE_COLOR.premultiply(
                    style.backgroundColor
                );
            }
        }
        painter.setBorderColor(color);
        painter.setBackgroundColor(color);
        painter.drawBlock(
            worldX + node.absoluteX() + cx,
            worldY + node.absoluteY() + cy,
            size.width(),
            size.height(),
            0,
            0,
            userScale * node.absoluteScale()
        );
    };

    // Draw the connecting line into the slider.
    switch(node.parentDirection()) {
    case parsegraph_UPWARD:
        // Draw downward connecting line into the horizontal slider.
        drawLine(
            0, -node.absoluteSize().height() / 2,
            0, 0,
            1
        );

        break;
    case parsegraph_DOWNWARD:
        // Draw upward connecting line into the horizontal slider.
        break;
    }

    // Draw the bar that the slider bud is on.
    drawLine(
        -node.absoluteSize().width() / 2, 0,
        node.absoluteSize().width() / 2, 0,
        1.5
    );

    // Draw the first and last ticks.

    // If snapping, show the intermediate ticks.

    //if(parsegraph_isVerticalNodeDirection(node.parentDirection())) {
        var value = node.value();
        if(value == null) {
            value = 0.5;
        }

        var sliderWidth = userScale * node.absoluteSize().width();

        if(node.isSelected()) {
            painter.setBorderColor(
                style.selectedBorderColor.premultiply(
                    node.backdropColor()
                )
            );
            painter.setBackgroundColor(
                style.selectedBackgroundColor.premultiply(
                    node.backdropColor()
                )
            );
        }
        else {
            painter.setBorderColor(
                style.borderColor.premultiply(
                    node.backdropColor()
                )
            );
            painter.setBackgroundColor(
                style.backgroundColor.premultiply(
                    node.backdropColor()
                )
            );
        }

        // Draw the slider bud.
        if(Number.isNaN(value)) {
            value = 0;
        }
        var thumbWidth = userScale * node.absoluteSize().height()/1.5;
        painter.drawBlock(
            worldX + node.absoluteX() - sliderWidth / 2 + thumbWidth/2 + (sliderWidth - thumbWidth) * value,
            worldY + node.absoluteY(),
            userScale * node.absoluteSize().height()/1.5,
            userScale * node.absoluteSize().height()/1.5,
            style.borderRoundness/1.5,
            style.borderThickness/1.5,
            userScale * node.absoluteScale()
        );
    //}

    if(!node.label()) {
        return;
    }

    var fontScale = .7;
//    this._glyphPainter.setFontSize(
//        fontScale * style.fontSize * userScale * node.absoluteScale()
//    );
    this._glyphPainter.setColor(
        node.isSelected() ?
            style.selectedFontColor :
            style.fontColor
    );

    var sliderWidth = userScale * node.absoluteSize().width();
    var value = node.value();
    if(value == null) {
        value = 0.5;
    }
    //this._glyphPainter.setFontSize(
//        fontScale * style.fontSize * userScale * node.absoluteScale()
//    );
    /*if(style.maxLabelChars) {
        this._glyphPainter.setWrapWidth(
            fontScale * style.fontSize * style.maxLabelChars * style.letterWidth * userScale * node.absoluteScale()
        );
    }*/

    var textMetrics = this._glyphPainter.measureText(node.label());
    node._label[0] = worldX + node.absoluteX() - sliderWidth / 2 + sliderWidth * value - textMetrics[0]/2;
    node._label[1] = worldY + node.absoluteY() - textMetrics[1]/2;
    this._glyphPainter.setPosition(node._label[0], node._label[1]);
    this._glyphPainter.drawText(node.label());
};

parsegraph_NodePainter.prototype.drawScene = function(node, worldX, worldY, userScale, shaders)
{
    if(!node.scene()) {
        return;
    }

    var sceneSize = node.sizeWithoutPadding();
    var sceneX = worldX + node.absoluteX();
    var sceneY = worldY + node.absoluteY();

    // Render and draw the scene texture.
    var gl = shaders.gl;
    if(!shaders.framebuffer) {
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        shaders.framebuffer = framebuffer;

        // Thanks to http://learningwebgl.com/blog/?p=1786
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sceneSize.width(), sceneSize.height(), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        var renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, sceneSize.width(), sceneSize.height());
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

        shaders.framebufferTexture = t;
        shaders.framebufferRenderBuffer = renderbuffer;

    }
    else {
        gl.bindTexture(gl.TEXTURE_2D, shaders.framebufferTexture);
        gl.bindRenderbuffer(gl.RENDERBUFFER, shaders.framebufferRenderBuffer);
        gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.framebuffer);

        this._textures.forEach(function(t) {
            //gl.deleteTexture(t._texture);
            t.clear();
        });
        this._textures = [];
    }

    var gl = this.gl();
    gl.clearColor(parsegraph_BACKGROUND_COLOR.r(),
    parsegraph_BACKGROUND_COLOR.g(),
    parsegraph_BACKGROUND_COLOR.b(),
    parsegraph_BACKGROUND_COLOR.a());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);

    var s = node.scene();
    s.paint();
    s.render(sceneSize.width(), sceneSize.height());

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    var p = new parsegraph_TexturePainter(
        gl, shaders.framebufferTexture, sceneSize.width(), sceneSize.height(), shaders
    );
    p.drawWholeTexture(sceneX - sceneSize.width()/2, sceneY - sceneSize.height()/2, sceneSize.width(), sceneSize.height(), userScale * node.absoluteScale());
    this._textures.push(p);
};

parsegraph_NodePainter.prototype.initBlockBuffer = function(counts)
{
    this._blockPainter.initBuffer(counts.numBlocks);
    this._extentPainter.initBuffer(counts.numExtents);
    this._glyphPainter.initBuffer(counts.numGlyphs);
};

parsegraph_NodePainter.prototype.countNode = function(node, counts)
{
    if(!counts.numBlocks) {
        counts.numBlocks = 0;
    }
    if(!counts.numGlyphs) {
        counts.numGlyphs = {};
    }

    if(this.isExtentRenderingEnabled()) {
        if(!counts.numExtents) {
            counts.numExtents = 0;
        }
        parsegraph_forEachCardinalNodeDirection(function(direction) {
            var extent = node.extentsAt(direction);
            counts.numExtents += extent.numBounds();
        }, this);
    }

    node.glyphCount(counts.numGlyphs, this._pagesPerGlyphTexture);

    if(node.type() === parsegraph_SLIDER) {
        if(node.parentDirection() === parsegraph_UPWARD) {
            // Only downward direction is currently supported.
            ++counts.numBlocks;
        }
        // One for the joining line.
        ++counts.numBlocks;
        // One for the block.
        ++counts.numBlocks;
    }
    else {
        parsegraph_forEachCardinalNodeDirection(function(direction) {
            if(node.parentDirection() == direction) {
                return;
            }
            var directionData = node._neighbors[direction];
            // Do not draw lines unless there is a node.
            if(!directionData.node) {
                return;
            }
            // One for the line
            ++counts.numBlocks;
        }, this);

        // One for the block.
        ++counts.numBlocks;
    }
};

parsegraph_NodePainter.prototype.drawNode = function(node, shaders)
{
    var worldX = 0;
    var worldY = 0;
    var userScale = 1;
    if(this.isExtentRenderingEnabled() && node.isRoot()) {
        //this.paintExtent(node, worldX, worldY, userScale);
    }

    switch(node.type()) {
    case parsegraph_SLIDER:
        return this.drawSlider(node, worldX, worldY, userScale);
    case parsegraph_SCENE:
        this.paintLines(node, worldX, worldY, userScale);
        this.paintBlock(node, worldX, worldY, userScale);
        return this.drawScene(node, worldX, worldY, userScale, shaders);
    default:
        this.paintLines(node, worldX, worldY, userScale);
        this.paintBlock(node, worldX, worldY, userScale);
    }
};

parsegraph_NodePainter.prototype.paintLines = function(node, worldX, worldY, userScale)
{
    var bodySize = node.size();

    var drawLine = function(direction) {
        if(node.parentDirection() == direction) {
            return;
        }
        var directionData = node._neighbors[direction];
        // Do not draw lines unless there is a node.
        if(!directionData.node) {
            return;
        }

        var selectedColor = parsegraph_SELECTED_LINE_COLOR.premultiply(
            this.backgroundColor()
        );
        var color = parsegraph_LINE_COLOR.premultiply(
            this.backgroundColor()
        );

        var painter = this._blockPainter;
        if(node.isSelected() && node.isSelectedAt(direction)) {
            painter.setBorderColor(selectedColor);
            painter.setBackgroundColor(selectedColor);
        }
        else {
            // Not selected.
            painter.setBorderColor(color);
            painter.setBackgroundColor(color);
        }

        var parentScale = userScale * node.absoluteScale();
        var scale = userScale * directionData.node.absoluteScale();

        if(parsegraph_isVerticalNodeDirection(direction)) {
            var length = parsegraph_nodeDirectionSign(direction)
                * parentScale * (directionData.lineLength + parsegraph_LINE_THICKNESS / 2);
            var thickness = parsegraph_LINE_THICKNESS * scale;
            painter.drawBlock(
                worldX + node.absoluteX(),
                worldY + node.absoluteY() + length / 2,
                thickness,
                Math.abs(length),
                0,
                0,
                scale
            );
        }
        else {
            // Horizontal line.
            var length = parsegraph_nodeDirectionSign(direction)
                * parentScale * (directionData.lineLength + parsegraph_LINE_THICKNESS / 2);
            var thickness = parsegraph_LINE_THICKNESS * scale;
            painter.drawBlock(
                worldX + node.absoluteX() + length / 2,
                worldY + node.absoluteY(),
                Math.abs(length),
                thickness,
                0,
                0,
                scale
            );
        }
    };
    parsegraph_forEachCardinalNodeDirection(drawLine, this);
};

parsegraph_NodePainter.prototype.paintExtent = function(node, worldX, worldY, userScale)
{
    var painter = this._extentPainter;
    painter.setBorderColor(
        parsegraph_EXTENT_BORDER_COLOR
    );
    painter.setBackgroundColor(
        parsegraph_EXTENT_BACKGROUND_COLOR
    );

    var paintBound = function(rect) {
        if(isNaN(rect.height()) || isNaN(rect.width())) {
            return;
        }
        painter.drawBlock(
            worldX + rect.x() + rect.width() / 2,
            worldY + rect.y() + rect.height() / 2,
            rect.width(),
            rect.height(),
            parsegraph_EXTENT_BORDER_ROUNDEDNESS,
            parsegraph_EXTENT_BORDER_THICKNESS,
            userScale * node.absoluteScale()
        );
    };

    var paintDownwardExtent = function() {
        var extent = node.extentsAt(parsegraph_DOWNWARD);
        var rect = parsegraph_createRect(
            node.absoluteX() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_DOWNWARD),
            node.absoluteY(),
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= userScale * node.absoluteScale();
            size *= userScale * node.absoluteScale();
            rect.setWidth(length);
            rect.setHeight(size);
            paintBound(rect);
            rect.setX(rect.x() + length);
        });
    };

    var paintUpwardExtent = function() {
        var extent = node.extentsAt(parsegraph_UPWARD);
        var rect = parsegraph_createRect(
            node.absoluteX() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_UPWARD),
            0,
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= userScale * node.absoluteScale();
            size *= userScale * node.absoluteScale();
            rect.setY(node.absoluteY() - size);
            rect.setWidth(length);
            rect.setHeight(size);
            paintBound(rect);
            rect.setX(rect.x() + length);
        });
    };

    var paintBackwardExtent = function() {
        var extent = node.extentsAt(parsegraph_BACKWARD);
        var rect = parsegraph_createRect(
            0,
            node.absoluteY() - userScale * node.absoluteScale() * node.extentOffsetAt(parsegraph_BACKWARD),
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= userScale * node.absoluteScale();
            size *= userScale * node.absoluteScale();
            rect.setHeight(length);
            rect.setX(node.absoluteX() - size);
            rect.setWidth(size);
            paintBound(rect);
            rect.setY(rect.y() + length);
        });
    };

    var paintForwardExtent = function() {
        var extent = node.extentsAt(parsegraph_FORWARD);
        var rect = parsegraph_createRect(
            node.absoluteX(),
            node.absoluteY() - node.extentOffsetAt(parsegraph_FORWARD) * userScale * node.absoluteScale(),
            0, 0
        );

        extent.forEach(function(length, size, i) {
            length *= userScale * node.absoluteScale();
            size *= userScale * node.absoluteScale();
            rect.setHeight(length);
            rect.setWidth(size);
            paintBound(rect);
            rect.setY(rect.y() + length);
        });
    };

    paintDownwardExtent();
    paintUpwardExtent();
    //paintBackwardExtent();
    //paintForwardExtent();
};

parsegraph_NodePainter.prototype.paintBlock = function(node, worldX, worldY, userScale)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

    /*// Set colors if selected.
    if(node.isSelected()) {
        painter.setBorderColor(
            style.selectedBorderColor.premultiply(
                node.backdropColor()
            )
        );
        painter.setBackgroundColor(
            style.selectedBackgroundColor.premultiply(
                node.backdropColor()
            )
        );
    } else */{
        painter.setBorderColor(
            style.borderColor.premultiply(
                node.backdropColor()
            )
        );
        painter.setBackgroundColor(
            style.backgroundColor.premultiply(
                node.backdropColor()
            )
        );
    }

    // Draw the block.
    var size = node.absoluteSize().scaled(userScale);
    painter.drawBlock(
        worldX + userScale * node.absoluteX(),
        worldY + userScale * node.absoluteY(),
        size.width(),
        size.height(),
        style.borderRoundness,
        style.borderThickness,
        node.absoluteScale() * userScale
    );

    // Draw the label.
    var label = node._label;
    if(!label) {
        return;
    }
    var fontScale = (style.fontSize * userScale * node.absoluteScale()) / label.fontSize();
    var labelX, labelY;
    this._glyphPainter.setColor(
        node.isSelected() ?
            style.selectedFontColor :
            style.fontColor
    );
    if(node.hasNode(parsegraph_INWARD)) {
        var nestedNode = node.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();
        var nodeSize = node.sizeWithoutPadding();
        if(node.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            labelX = worldX + userScale * node.absoluteX() - fontScale * label.width()/2;
            labelY = worldY + userScale * node.absoluteY() - userScale * node.absoluteScale() * nodeSize.height()/2;
        }
        else {
            // Align horizontal.
            labelX = worldX + userScale * node.absoluteX() - userScale * node.absoluteScale() * nodeSize.width()/2;
            labelY = worldY + userScale * node.absoluteY() - fontScale * label.height()/2;
        }
    }
    else {
        labelX = worldX + userScale * node.absoluteX() - fontScale * label.width()/2;
        labelY = worldY + userScale * node.absoluteY() - fontScale * label.height()/2;
    }
    node._labelX = labelX;
    node._labelY = labelY;
    node._labelScale = fontScale;
    label.paint(this._glyphPainter, labelX, labelY, fontScale);
};

parsegraph_NodePainter.prototype.render = function(world, scale)
{
    this._gl.disable(this._gl.CULL_FACE);
    this._gl.disable(this._gl.DEPTH_TEST);

    this._gl.enable(this._gl.BLEND);
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.DST_ALPHA
    );
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA
    );
    if(this._renderBlocks) {
        this._blockPainter.render(world, scale);
    }
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA
    );

    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_DST_ALPHA
    );
    this._gl.blendFunc(
        this._gl.DST_ALPHA, this._gl.SRC_ALPHA
    );
    if(this._renderExtents) {
        this._extentPainter.render(world, scale);
    }
    this._gl.disable(this._gl.CULL_FACE);
    this._gl.disable(this._gl.DEPTH_TEST);
    this._gl.enable(this._gl.BLEND);
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA
    );

    if(this._renderText) {
        this._glyphPainter.render(world, scale);
    }

    this._textures.forEach(function(t) {
        t.render(world);
    });
};

parsegraph_NodePainter.prototype.enableExtentRendering = function()
{
    this._renderExtents = true;
};

parsegraph_NodePainter.prototype.disableExtentRendering = function()
{
    this._renderExtents = false;
};

parsegraph_NodePainter.prototype.isExtentRenderingEnabled = function()
{
    return this._renderExtents;
};

parsegraph_NodePainter.prototype.enableBlockRendering = function()
{
    this._renderBlocks = true;
};

parsegraph_NodePainter.prototype.disableBlockRendering = function()
{
    this._renderBlocks = false;
};

parsegraph_NodePainter.prototype.isBlockRenderingEnabled = function()
{
    return this._renderBlocks;
};

parsegraph_NodePainter.prototype.enableLineRendering = function()
{
    this._renderLines = true;
};

parsegraph_NodePainter.prototype.disableLineRendering = function()
{
    this._renderLines = false;
};

parsegraph_NodePainter.prototype.isLineRenderingEnabled = function()
{
    return this._renderLines;
};

parsegraph_NodePainter.prototype.enableTextRendering = function()
{
    this._renderText = true;
};

parsegraph_NodePainter.prototype.disableTextRendering = function()
{
    this._renderText = false;
};

parsegraph_NodePainter.prototype.isTextRenderingEnabled = function()
{
    return this._renderText;
};

parsegraph_NodePainter.prototype.enableSceneRendering = function()
{
    this._renderScenes = true;
};

parsegraph_NodePainter.prototype.disableSceneRendering = function()
{
    this._renderScenes = false;
};

parsegraph_NodePainter.prototype.isSceneRenderingEnabled = function()
{
    return this._renderScenes;
};
