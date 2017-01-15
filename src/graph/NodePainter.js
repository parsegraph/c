/**
 * Constructs a parsegraph. Use parsegraph.container() to place it
 * in the DOM.
 *
 * The constants used here are in Node_paint.js
 */
function parsegraph_NodePainter(gl)
{
    this._gl = gl;

    this._backgroundColor = parsegraph_BACKGROUND_COLOR;

    this._blockPainter = parsegraph_createBlockPainter(this._gl);
    this._renderBlocks = true;

    this._originPainter = parsegraph_createBlockPainter(this._gl);
    this._renderOrigin = false;

    this._extentPainter = parsegraph_createBlockPainter(this._gl);
    this._renderExtents = false;

    this._spotlightPainter = new parsegraph_SpotlightPainter(this._gl);
    this._renderSpotlights = true;

    this._textPainter = parsegraph_createTextPainter(this._gl);

    //this._textPainter._glyphAtlas.setAfterUpdate(this.scheduleRender, this);
    this._renderText = true;
};

parsegraph_NodePainter.prototype.gl = function()
{
    return this._gl;
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
        this._textPainter.render(world, scale);
    }
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
};

parsegraph_NodePainter.prototype.drawSlider = function(node, worldX, worldY)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

    var selectedColor = parsegraph_SELECTED_LINE_COLOR.premultiply(
        this.backgroundColor()
    );
    var color = parsegraph_LINE_COLOR.premultiply(
        this.backgroundColor()
    );
    if(node.isSelected()) {
        painter.setBorderColor(selectedColor);
        painter.setBackgroundColor(selectedColor);
    }
    else {
        // Not selected.
        painter.setBorderColor(color);
        painter.setBackgroundColor(color);
    }

    var drawLine = function(x1, y1, x2, y2, thickness) {
        var cx = x1 + (x2 - x1) / 2;
        var cy = y1 + (y2 - y1) / 2;

        var size = 0;
        if(x1 == x2) {
            // Vertical line.
            size = new parsegraph_Size(
                parsegraph_LINE_THICKNESS * node.absoluteScale() * thickness,
                Math.abs(y2 - y1)
            );
        }
        else {
            // Horizontal line.
            size = new parsegraph_Size(
                Math.abs(x2 - x1),
                parsegraph_LINE_THICKNESS * node.absoluteScale() * thickness
            );
        }
        painter.drawBlock(
            worldX + node.absoluteX() + cx,
            worldY + node.absoluteY() + cy,
            size,
            0,
            0,
            node.absoluteScale()
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
    this._blockPainter

    // Draw the first and last ticks.

    // If snapping, show the intermediate ticks.

    // Draw the bud's selection.
    if(node.isSelected()) {
        painter.setBorderColor(
            style.selectedBorderColor.premultiply(
                this.backgroundColor()
            )
        );
        painter.setBackgroundColor(
            style.selectedBackgroundColor.premultiply(
                this.backgroundColor()
            )
        );

        this._spotlightPainter.drawSpotlight(
            worldX + node.absoluteX(),
            worldY + node.absoluteY(),
            2 * node.brightness() * Math.max(
                node.absoluteSize().width(),
                node.absoluteSize().height()
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
                this.backgroundColor()
            )
        );
        painter.setBackgroundColor(
            style.backgroundColor.premultiply(
                this.backgroundColor()
            )
        );

        this._spotlightPainter.drawSpotlight(
            worldX + node.absoluteX() + node.absoluteSize().width()*0,
            worldY + node.absoluteY() + node.absoluteSize().height()*.1,
            2 * node.brightness() * Math.max(
                node.absoluteSize().width(),
                node.absoluteSize().height()
            ),
            new parsegraph_Color(0, 0, 0, 1)
            /*style.backgroundColor.premultiply(
                this.backgroundColor()
            )*/
        );
    }
    // Draw the slider bud.
    painter.drawBlock(
        worldX + node.absoluteX(),
        worldY + node.absoluteY(),
        parsegraph_createSize(node.absoluteSize().height()/1.5, node.absoluteSize().height()/1.5),
        style.borderRoundness/1.5,
        style.borderThickness/1.5,
        node.absoluteScale()
    );

    if(node.label() === undefined) {
        return;
    }

    var textMetrics = this._textPainter.measureText(
        node.label(),
        style.fontSize * node.absoluteScale(),
        style.maxLabelChars * style.fontSize * style.letterWidth * node.absoluteScale()
    );
    this._textPainter.setColor(
        node.isSelected() ?
            style.selectedFontColor :
            style.fontColor
    );
    this._textPainter.drawText(
        node.label(),
        worldX + node.absoluteX() - textMetrics[0]/2,
        worldY + node.absoluteY() + node.sizeWithoutPadding().scaled(node.absoluteScale()).height() / 2 - textMetrics[1]/2,
        style.fontSize * node.absoluteScale(),
        style.fontSize * style.maxLabelChars * style.letterWidth * node.absoluteScale(),
        node.absoluteScale()
    );
};

parsegraph_NodePainter.prototype.drawScene = function(node, worldX, worldY)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

    var sceneSize = node.sizeWithoutPadding().scaled(node.absoluteScale());
    var sceneX = worldX + node.absoluteX();
    var sceneY = worldY + node.absoluteY();

    // Render and draw the scene texture.
};

parsegraph_NodePainter.prototype.drawNode = function(node, worldX, worldY)
{
    if(this.isExtentRenderingEnabled()) {
        this.paintExtent(node, worldX, worldY);
    }

    switch(node.type()) {
    case parsegraph_SLIDER:
        return this.drawSlider(node, worldX, worldY);
        break;
    case parsegraph_SCENE:
        this.paintLines(node, worldX, worldY);
        this.paintStyledBlock(node, worldX, worldY);
        return this.drawScene(node, worldX, worldY);
        break;
    default:
        this.paintLines(node, worldX, worldY);
        this.paintStyledBlock(node, worldX, worldY);
    }
};

parsegraph_NodePainter.prototype.drawCaret = function(caret, worldX, worldY)
{
    caret.root().commitLayoutIteratively();

    var ordering = [caret.root()];

    var addNode = function(node, direction) {
        // Do not add the parent.
        if(!node.isRoot() && node.parentDirection() == direction) {
            return;
        }
        // Add the node to the ordering if it exists and needs a layout.
        if(node.hasNode(direction)) {
            var child = node.nodeAt(direction);
            ordering.push(child);
        }
    };

    // Build the node list.
    for(var i = 0; i < ordering.length; ++i) {
        var node = ordering[i];
        addNode(node, parsegraph_INWARD);
        addNode(node, parsegraph_DOWNWARD);
        addNode(node, parsegraph_UPWARD);
        addNode(node, parsegraph_BACKWARD);
        addNode(node, parsegraph_FORWARD);

        this.drawNode(node, worldX, worldY);
    }
}

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
        parsegraph_createSize(originSize, originSize),
        1,
        originBorderSize,
        1
    );
    this._originPainter.drawBlock(
        0, 0,
        parsegraph_createSize(originSize * 10, originSize * 10),
        1,
        originBorderSize,
        1
    );
    this._originPainter.drawBlock(
        0, 0,
        parsegraph_createSize(originSize * 100, originSize * 100),
        1,
        originBorderSize,
        1
    );
};

parsegraph_NodePainter.prototype.paintLines = function(node, worldX, worldY)
{
    var bodySize = node.size();

    var drawLine = function(direction) {
        if(node.parentDirection() == direction) {
            return;
        }
        var directionData = node._neighbors[direction];
        // Do not draw lines unless there is a node.
        if(!directionData.hasNode()) {
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

        var parentScale = node.absoluteScale();
        var scale = directionData.node().absoluteScale();

        if(parsegraph_isVerticalNodeDirection(direction)) {
            var length = parsegraph_nodeDirectionSign(direction)
                * parentScale * (directionData.lineLength() + parsegraph_LINE_THICKNESS / 2);
            var thickness = parsegraph_LINE_THICKNESS * scale;
            painter.drawBlock(
                worldX + node.absoluteX(),
                worldY + node.absoluteY() + length / 2,
                new parsegraph_Size(thickness, Math.abs(length)),
                0,
                0,
                scale
            );
        }
        else {
            // Horizontal line.
            var length = parsegraph_nodeDirectionSign(direction)
                * parentScale * (directionData.lineLength() + parsegraph_LINE_THICKNESS / 2);
            var thickness = parsegraph_LINE_THICKNESS * scale;
            painter.drawBlock(
                worldX + node.absoluteX() + length / 2,
                worldY + node.absoluteY(),
                new parsegraph_Size(Math.abs(length), thickness),
                0,
                0,
                scale
            );
        }
    };
    parsegraph_forEachCardinalNodeDirection(drawLine, this);
};

parsegraph_NodePainter.prototype.paintExtent = function(node, worldX, worldY)
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
            rect,
            parsegraph_EXTENT_BORDER_ROUNDEDNESS,
            parsegraph_EXTENT_BORDER_THICKNESS,
            node.absoluteScale()
        );
    };

    var paintDownwardExtent = function() {
        var extent = node.extentsAt(parsegraph_DOWNWARD);
        var rect = parsegraph_createRect(
            node.absoluteX() - node.absoluteScale() * node.extentOffsetAt(parsegraph_DOWNWARD),
            node.absoluteY(),
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= node.absoluteScale();
            size *= node.absoluteScale();
            rect.setWidth(length);
            rect.setHeight(size);
            paintBound(rect);
            rect.setX(rect.x() + length);
        });
    };
    paintDownwardExtent();

    var paintUpwardExtent = function() {
        var extent = node.extentsAt(parsegraph_UPWARD);
        var rect = parsegraph_createRect(
            node.absoluteX() - node.absoluteScale() * node.extentOffsetAt(parsegraph_UPWARD),
            0,
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= node.absoluteScale();
            size *= node.absoluteScale();
            rect.setY(node.absoluteY() - size);
            rect.setWidth(length);
            rect.setHeight(size);
            paintBound(rect);
            rect.setX(rect.x() + length);
        });
    };
    paintUpwardExtent();

    var paintBackwardExtent = function() {
        var extent = node.extentsAt(parsegraph_BACKWARD);
        var rect = parsegraph_createRect(
            0,
            node.absoluteY() - node.absoluteScale() * node.extentOffsetAt(parsegraph_BACKWARD),
            0, 0
        );

        extent.forEach(function(length, size) {
            length *= node.absoluteScale();
            size *= node.absoluteScale();
            rect.setHeight(length);
            rect.setX(node.absoluteX() - size);
            rect.setWidth(size);
            paintBound(rect);
            rect.setY(rect.y() + length);
        });
    };
    paintBackwardExtent();

    var paintForwardExtent = function() {
        var extent = node.extentsAt(parsegraph_FORWARD);
        var rect = parsegraph_createRect(
            node.absoluteX(),
            node.absoluteY() - node.extentOffsetAt(parsegraph_FORWARD) * node.absoluteScale(),
            0, 0
        );

        extent.forEach(function(length, size, i) {
            length *= node.absoluteScale();
            size *= node.absoluteScale();
            rect.setHeight(length);
            rect.setWidth(size);
            paintBound(rect);
            rect.setY(rect.y() + length);
        });
    };
    paintForwardExtent();
};

parsegraph_NodePainter.prototype.paintStyledBlock = function(node, worldX, worldY)
{
    var style = node.blockStyle();
    var painter = this._blockPainter;

    if(node.isSelected()) {
        painter.setBorderColor(
            style.selectedBorderColor.premultiply(
                this.backgroundColor()
            )
        );
        painter.setBackgroundColor(
            style.selectedBackgroundColor.premultiply(
                this.backgroundColor()
            )
        );

        this._spotlightPainter.drawSpotlight(
            worldX + node.absoluteX(),
            worldY + node.absoluteY(),
            2 * node.brightness() * Math.max(
                node.absoluteSize().width(),
                node.absoluteSize().height()
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
                this.backgroundColor()
            )
        );
        painter.setBackgroundColor(
            style.backgroundColor.premultiply(
                this.backgroundColor()
            )
        );

        this._spotlightPainter.drawSpotlight(
            worldX + node.absoluteX() + node.absoluteSize().width()*0,
            worldY + node.absoluteY() + node.absoluteSize().height()*.1,
            2 * node.brightness() * Math.max(
                node.absoluteSize().width(),
                node.absoluteSize().height()
            ),
            new parsegraph_Color(0, 0, 0, 1)
            /*style.backgroundColor.premultiply(
                this.backgroundColor()
            )*/
        );
    }

    painter.drawBlock(
        worldX + node.absoluteX(),
        worldY + node.absoluteY(),
        node.absoluteSize(),
        style.borderRoundness,
        style.borderThickness,
        node.absoluteScale()
    );

    if(node.label() === undefined) {
        return;
    }

    var textMetrics = this._textPainter.measureText(
        node.label(),
        style.fontSize * node.absoluteScale(),
        style.maxLabelChars * style.fontSize * style.letterWidth * node.absoluteScale()
    );
    this._textPainter.setColor(
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
            this._textPainter.drawText(
                node.label(),
                worldX + node.absoluteX() - textMetrics[0]/2,
                worldY + node.absoluteY() - node.absoluteScale() * nodeSize.height()/2,
                style.fontSize * node.absoluteScale(),
                style.fontSize * style.letterWidth * style.maxLabelChars * node.absoluteScale(),
                node.absoluteScale()
            );
        }
        else {
            // Align horizontal.
            this._textPainter.drawText(
                node.label(),
                worldX + node.absoluteX() - node.absoluteScale() * nodeSize.width()/2,
                worldY + node.absoluteY() - textMetrics[1]/2,
                style.fontSize * node.absoluteScale(),
                style.fontSize * style.letterWidth * style.maxLabelChars * node.absoluteScale(),
                node.absoluteScale()
            );
        }
    }
    else {
        this._textPainter.drawText(
            node.label(),
            worldX + node.absoluteX() - textMetrics[0]/2,
            worldY + node.absoluteY() - textMetrics[1]/2,
            style.fontSize * node.absoluteScale(),
            style.fontSize * style.maxLabelChars * style.letterWidth * node.absoluteScale(),
            node.absoluteScale()
        );
    }
};
