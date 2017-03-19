function parsegraph_NodePainter(gl, glyphAtlas, shaders)
{
    this._gl = gl;
    if(!this._gl || !this._gl.createProgram) {
        throw new Error("A GL interface must be given");
    }

    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._blockPainter = new parsegraph_BlockPainter(this._gl, shaders);
    this._renderBlocks = true;

    this._originPainter = new parsegraph_BlockPainter(this._gl, shaders);
    this._renderOrigin = false;

    this._extentPainter = new parsegraph_BlockPainter(this._gl, shaders);
    this._renderExtents = false;

    this._spotlightPainter = new parsegraph_SpotlightPainter(this._gl, shaders);
    this._renderSpotlights = true;

    this._textPainter = new parsegraph_TextPainter(this._gl, glyphAtlas, shaders);

    this._renderText = true;

    this._textures = [];
};

parsegraph_NodePainter.prototype.gl = function()
{
    return this._gl;
};

parsegraph_NodePainter.prototype.textPainter = function()
{
    return this._textPainter;
};

/**
 * Sets the background color to the given value. This supports a second
 * call that creates the color from the provided arguments.
 *
 * // Sets the background to white.
 * painter.setBackground(1, 1, 1);
 *
 * // Sets the background to red.
 * painter.setBackground(1, 0, 0);
 *
 * // Sets the background to green.
 * painter.setBackground(0, 1, 0);
 *
 * // Sets the background to blue.
 * painter.setBackground(0, 0, 1);
 *
 * // Sets the background to transparent.
 * painter.setBackground(1, 1, 1, 0);
 */
parsegraph_NodePainter.prototype.setBackground = function(color)
{
    if(arguments.length > 1) {
        return this.setBackground(
            parsegraph_createColor.apply(this, arguments)
        );
    }
    this._backgroundColor = color;
};

/**
 * Retrieves the current background color.
 */
parsegraph_NodePainter.prototype.backgroundColor = function()
{
    return this._backgroundColor;
};

/**
 * Renders the painted scene graph.
 */
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
    if(this._renderSpotlights) {
        this._spotlightPainter.render(world);
    }
    if(this._renderBlocks) {
        this._blockPainter.render(world, scale);
    }
    this._gl.blendFunc(
        this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA
    );

    if(this._renderExtents) {
        this._extentPainter.render(world, scale);
    }

    if(this._renderOrigin) {
        this._originPainter.render(world, scale);
    }

    if(this._renderText) {
        this._textPainter.render(world);
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

parsegraph_NodePainter.prototype.enableOriginRendering = function()
{
    this._renderOrigin = true;
};

parsegraph_NodePainter.prototype.disableOriginRendering = function()
{
    this._renderOrigin = false;
};

parsegraph_NodePainter.prototype.isOriginRenderingEnabled = function()
{
    return this._renderOrigin;
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

parsegraph_NodePainter.prototype.enableSpotlightRendering = function()
{
    this._renderSpotlights = true;
};

parsegraph_NodePainter.prototype.disableSpotlightRendering = function()
{
    this._renderSpotlights = false;
};

parsegraph_NodePainter.prototype.isSpotlightRenderingEnabled = function()
{
    return this._renderSpotlights;
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

parsegraph_NodePainter.prototype.clear = function()
{
    this._blockPainter.clear();
    this._spotlightPainter.clear();
    this._extentPainter.clear();
    this._originPainter.clear();
    this._textPainter.clear();

    var gl = this._gl;
    this._textures.forEach(function(t) {
        t.clear();
        gl.deleteTexture(t._texture);
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

        // Draw the bar that the slider bud is on.
        drawLine(
            -node.absoluteSize().width() / 2, 0,
            node.absoluteSize().width() / 2, 0,
            .8
        );

        break;
    case parsegraph_DOWNWARD:
        // Draw upward connecting line into the horizontal slider.
        break;
    }

    // Draw the first and last ticks.

    // If snapping, show the intermediate ticks.

    if(parsegraph_isVerticalNodeDirection(node.parentDirection())) {
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
//            this._spotlightPainter.drawSpotlight(
//                worldX + node.absoluteX() - sliderWidth / 2 + sliderWidth * value,
//                worldY + node.absoluteY(),
//                2 * style.brightness * userScale * node.absoluteSize().height(),
//                new parsegraph_Color(
//                    style.selectedBorderColor.r(),
//                    style.selectedBorderColor.g(),
//                    style.selectedBorderColor.b(),
//                    1
//                )
//            );
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
        painter.drawBlock(
            worldX + node.absoluteX() - sliderWidth / 2 + sliderWidth * value,
            worldY + node.absoluteY(),
            userScale * node.absoluteSize().height()/1.5,
            userScale * node.absoluteSize().height()/1.5,
            style.borderRoundness/1.5,
            style.borderThickness/1.5,
            userScale * node.absoluteScale()
        );
    }

    if(!node.label()) {
        return;
    }

    var fontScale = .7;
    this._textPainter.setFontSize(
        fontScale * style.fontSize * userScale * node.absoluteScale()
    );
    if(style.maxLabelChars) {
        this._textPainter.setWrapWidth(
            style.maxLabelChars * fontScale * style.fontSize * style.letterWidth * userScale * node.absoluteScale()
        );
    }
    this._textPainter.setColor(
        node.isSelected() ?
            style.selectedFontColor :
            style.fontColor
    );

    var sliderWidth = userScale * node.absoluteSize().width();
    var value = node.value();
    if(value == null) {
        value = 0.5;
    }
    this._textPainter.setFontSize(
        fontScale * style.fontSize * userScale * node.absoluteScale()
    );
    if(style.maxLabelChars) {
        this._textPainter.setWrapWidth(
            fontScale * style.fontSize * style.maxLabelChars * style.letterWidth * userScale * node.absoluteScale()
        );
    }

    var textMetrics = this._textPainter.measureText(node.label());
    node._labelX = worldX + node.absoluteX() - sliderWidth / 2 + sliderWidth * value - textMetrics[0]/2;
    node._labelY = worldY + node.absoluteY() - textMetrics[1]/2;
    this._textPainter.setPosition(node._labelX, node._labelY);
    this._textPainter.drawText(node.label());
};

parsegraph_NodePainter.prototype.drawScene = function(node, worldX, worldY, userScale, shaders)
{
    if(!node.scene()) {
        return;
    }

    var style = node.blockStyle();
    var painter = this._blockPainter;

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
            gl.deleteTexture(t._texture);
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

/**
 * Draws a single node, and the lines extending from it.
 */
parsegraph_NodePainter.prototype.drawNode = function(node, shaders)
{
    var worldX = 0;
    var worldY = 0;
    var userScale = 1;
    if(this.isExtentRenderingEnabled()) {
        this.paintExtent(node, worldX, worldY, userScale);
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

/**
 * Paints a circle around the origin.
 */
parsegraph_NodePainter.prototype.drawOrigin = function()
{
    this._originPainter.setBackgroundColor(
        parsegraph_createColor(1, 1, 1, .05)
    );
    this._originPainter.setBorderColor(
        parsegraph_createColor(1, 1, 1, .1)
    );
    var originSize = 2.5;
    var originBorderSize = .01;

    this._originPainter.drawBlock(
        0, 0,
        originSize,
        originSize,
        1,
        originBorderSize,
        1
    );
    this._originPainter.drawBlock(
        0, 0,
        originSize * 10,
        originSize * 10,
        1,
        originBorderSize,
        1
    );
    this._originPainter.drawBlock(
        0, 0,
        originSize * 100,
        originSize * 100,
        1,
        originBorderSize,
        1
    );
};

/**
 * Paints the given node's lines extending to its neighbors.
 */
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

/**
 * Paints the given node's extents.
 */
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
    paintBackwardExtent();
    paintForwardExtent();
};

/**
 * Paints the block that comprises the given node.
 */
parsegraph_NodePainter.prototype.paintBlock = function(node, worldX, worldY, userScale)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

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

        this._spotlightPainter.drawSpotlight(
            worldX + userScale * node.absoluteX(),
            worldY + userScale * node.absoluteY(),
            2 * style.brightness * Math.max(
                userScale * node.absoluteSize().width(),
                userScale * node.absoluteSize().height()
            ),
            new parsegraph_Color(
                style.selectedBorderColor.r(),
                style.selectedBorderColor.g(),
                style.selectedBorderColor.b(),
                1
            )
            //
            //new parsegraph_Color(0, 0, 0, .5)
        );
    } else {
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

    if(!node.label()) {
        return;
    }

    this._textPainter.setFontSize(
        style.fontSize * userScale * node.absoluteScale()
    );
    if(style.maxLabelChars) {
        this._textPainter.setWrapWidth(
            style.maxLabelChars * style.fontSize * style.letterWidth * userScale * node.absoluteScale()
        );
    }
    this._textPainter.setColor(
        node.isSelected() ?
            style.selectedFontColor :
            style.fontColor
    );
    var textMetrics = this._textPainter.measureText(node.label());

    if(node.hasNode(parsegraph_INWARD)) {
        var nestedNode = node.nodeAt(parsegraph_INWARD);
        var nestedSize = nestedNode.extentSize();

        var nodeSize = node.sizeWithoutPadding();

        if(node.nodeAlignmentMode(parsegraph_INWARD) == parsegraph_ALIGN_VERTICAL) {
            // Align vertical.
            node._labelX = worldX + userScale * node.absoluteX() - textMetrics[0]/2;
            node._labelY = worldY + userScale * node.absoluteY() - userScale * node.absoluteScale() * nodeSize.height()/2;
            this._textPainter.setPosition(node._labelX, node._labelY);
            this._textPainter.drawText(node.label());
        }
        else {
            // Align horizontal.
            node._labelX = worldX + userScale * node.absoluteX() - userScale * node.absoluteScale() * nodeSize.width()/2;
            node._labelY = worldY + userScale * node.absoluteY() - textMetrics[1]/2;
            this._textPainter.setPosition(node._labelX, node._labelY);
            this._textPainter.drawText(node.label());
        }
    }
    else {
        node._labelX = worldX + userScale * node.absoluteX() - textMetrics[0]/2,
        node._labelY = worldY + userScale * node.absoluteY() - textMetrics[1]/2
        this._textPainter.setPosition(node._labelX, node._labelY);
        this._textPainter.drawText(node.label());
    }
};
