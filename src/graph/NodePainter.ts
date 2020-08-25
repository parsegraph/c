import {
    parsegraph_checkGLError,
    parsegraph_getTextureSize,
} from "../gl";
import Node, {
    Type,
    Direction,
    forEachCardinalDirection,
    isVerticalDirection,
    directionSign
} from './Node';
import BlockPainter from './BlockPainter';
import {
    parsegraph_BACKGROUND_COLOR,
} from './settings';
import {
    parsegraph_SELECTED_LINE_COLOR,
    parsegraph_LINE_COLOR,
    parsegraph_LINE_THICKNESS,
    parsegraph_EXTENT_BORDER_ROUNDEDNESS,
    parsegraph_EXTENT_BORDER_THICKNESS,
    parsegraph_EXTENT_BORDER_COLOR,
    parsegraph_EXTENT_BACKGROUND_COLOR
} from './NodeStyle';
import Size from './Size';
import parsegraph_GlyphPainter from './GlyphPainter';
import Rect from './Rect';
import parsegraph_Window from './Window';
import Color from './Color';
import parsegraph_Font from './Font';
import TexturePainter from './TexturePainter';

export default class NodePainter
{
    _window:parsegraph_Window;
    _backgroundColor:Color;
    _blockPainter:BlockPainter;
    _renderBlocks:boolean;
    _extentPainter:BlockPainter;
    _renderExtents:boolean;
    _fontPainters:{[key:string]:parsegraph_GlyphPainter};
    _renderText:boolean;
    _textures:TexturePainter[];
    _pagesPerGlyphTexture:number;
    _mass:number;
    _consecutiveRenders:number;
    _renderLines:boolean;
    _renderScenes:boolean;
    bodySize:Size;

    constructor(window:parsegraph_Window) {
        this._window = window;

        this._backgroundColor = parsegraph_BACKGROUND_COLOR;

        this._blockPainter = new BlockPainter(window);
        this._renderBlocks = true;

        this._extentPainter = new BlockPainter(window);
        //this._renderExtents = true;

        this._fontPainters = {};

        this._renderText = true;

        this._textures = [];

        this._pagesPerGlyphTexture = NaN;

        this.bodySize = new Size();
    }

    contextChanged(isLost:boolean):void {
        this._blockPainter.contextChanged(isLost);
        this._extentPainter.contextChanged(isLost);
        for(var fontName in this._fontPainters) {
            var fontPainter = this._fontPainters[fontName];
            fontPainter.contextChanged(isLost);
        }
        this._textures.forEach(function(t) {
            t.contextChanged(isLost);
        });
        this._pagesPerGlyphTexture = NaN;
    }

    bounds():Rect {
        return this._blockPainter.bounds();
    }

    getFontPainter(font:parsegraph_Font):parsegraph_GlyphPainter {
        const fullFontName:string = font.fullName();
        let painter:parsegraph_GlyphPainter = this._fontPainters[fullFontName];
        if(!painter) {
            painter = new parsegraph_GlyphPainter(this.window(), font);
            this._fontPainters[fullFontName] = painter;
        }
        return painter;
    }

    window():parsegraph_Window {
        return this._window;
    }

    gl() {
        return this._window.gl();
    }

    setBackground(...args:any[]):void {
        if(args.length > 1) {
            return this.setBackground(new Color(...args));
        }
        this._backgroundColor = args[0];
    }

    backgroundColor():Color {
        return this._backgroundColor;
    }

    clear():void {
        this._blockPainter.clear();
        this._extentPainter.clear();
        for(let fontName in this._fontPainters) {
            const fontPainter:parsegraph_GlyphPainter = this._fontPainters[fontName];
            fontPainter.clear();
        }

        //const gl = this.gl();
        this._textures.forEach(function(t) {
            t.clear();
            //gl.deleteTexture(t._texture);
        });
        this._textures = [];
    }

    drawSlider(node:Node):void {
        const style = node.blockStyle();
        const painter = this._blockPainter;

        const drawLine:Function = function(x1:number, y1:number, x2:number, y2:number, thickness:number, color:Color) {
            const cx = x1 + (x2 - x1) / 2;
            const cy = y1 + (y2 - y1) / 2;

            let size;
            if(x1 == x2) {
                // Vertical line.
                size = new Size(
                    parsegraph_LINE_THICKNESS * node.groupScale() * thickness,
                    Math.abs(y2 - y1)
                );
            }
            else {
                // Horizontal line.
                size = new Size(
                    Math.abs(x2 - x1),
                    parsegraph_LINE_THICKNESS * node.groupScale() * thickness
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
                node.groupX() + cx,
                node.groupY() + cy,
                size.width(),
                size.height(),
                0,
                0,
                node.groupScale()
            );
        };

        const groupSize = node.groupSize(this.bodySize);

        // Draw the connecting line into the slider.
        switch(node.parentDirection()) {
        case Direction.UPWARD:
            // Draw downward connecting line into the horizontal slider.
            drawLine(
                0, -groupSize.height() / 2,
                0, 0,
                1
            );

            break;
        case Direction.DOWNWARD:
            // Draw upward connecting line into the horizontal slider.
            break;
        }

        // Draw the bar that the slider bud is on.
        drawLine(
            -groupSize.width() / 2, 0,
            groupSize.width() / 2, 0,
            1.5
        );

        // Draw the first and last ticks.

        // If snapping, show the intermediate ticks.

        //if(isVerticalDirection(node.parentDirection())) {
            let value = node.value();
            if(value == null) {
                value = 0.5;
            }

            let sliderWidth = groupSize.width();

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
            if(isNaN(value)) {
                value = 0;
            }
            const thumbWidth = groupSize.height()/1.5;
            painter.drawBlock(
                node.groupX() - sliderWidth/2 + thumbWidth/2 + (sliderWidth - thumbWidth) * value,
                node.groupY(),
                groupSize.height()/1.5,
                groupSize.height()/1.5,
                style.borderRoundness/1.5,
                style.borderThickness/1.5,
                node.groupScale()
            );
        //}

        if(!node.label()) {
            return;
        }

        //var fontScale = .7;
        const fontPainter = this.getFontPainter(node.realLabel().font());
    //    fontPainter.setFontSize(
    //        fontScale * style.fontSize * node.groupScale()
    //    );
        fontPainter.setColor(
            node.isSelected() ?
                style.selectedFontColor :
                style.fontColor
        );

        //fontPainter.setFontSize(
    //        fontScale * style.fontSize * node.groupScale()
    //    );
        /*if(style.maxLabelChars) {
            fontPainter.setWrapWidth(
                fontScale * style.fontSize * style.maxLabelChars * style.letterWidth * node.groupScale()
            );
        }*/

        var textMetrics = fontPainter.measureText(node.label());
        node._label[0] = node.groupX() - sliderWidth / 2 + sliderWidth * value - textMetrics[0]/2;
        node._label[1] = node.groupY() - textMetrics[1]/2;
        fontPainter.setPosition(node._label[0], node._label[1]);
        fontPainter.drawText(node.label());
    }

    drawScene(node:Node):void {
        if(!node.scene()) {
            return;
        }

        const sceneSize = node.sizeWithoutPadding(this.bodySize);
        const sceneX = node.groupX();
        const sceneY = node.groupY();

        // Render and draw the scene texture.
        const shaders:{[key:string]:number} = this._window.shaders();
        const gl = this.gl();
        if(!shaders.framebuffer) {
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

            shaders.framebuffer = framebuffer;

            // Thanks to http://learningwebgl.com/blog/?p=1786
            const t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sceneSize.width(), sceneSize.height(), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            const renderbuffer = gl.createRenderbuffer();
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

        gl.clearColor(parsegraph_BACKGROUND_COLOR.r(),
        parsegraph_BACKGROUND_COLOR.g(),
        parsegraph_BACKGROUND_COLOR.b(),
        parsegraph_BACKGROUND_COLOR.a());
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.BLEND);

        const s = node.scene();
        s.paint();
        s.render(sceneSize.width(), sceneSize.height());

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const p = new TexturePainter(
            gl, shaders.framebufferTexture, sceneSize.width(), sceneSize.height()
        );
        p.drawWholeTexture(sceneX - sceneSize.width()/2, sceneY - sceneSize.height()/2, sceneSize.width(), sceneSize.height(), node.groupScale());
        this._textures.push(p);
    }

    weight():number {
        return this._mass * this._consecutiveRenders;
    }

    initBlockBuffer(counts) {
        this._consecutiveRenders = 0;
        this._mass = counts.numBlocks;
        this._blockPainter.initBuffer(counts.numBlocks);
        if(counts.numExtents) {
            this._extentPainter.initBuffer(counts.numExtents);
        }
        if(counts.numGlyphs) {
            for(var fullFontName in counts.numGlyphs) {
                var numGlyphs = counts.numGlyphs[fullFontName];
                var fontPainter = this._fontPainters[fullFontName];
                if(!fontPainter) {
                    fontPainter = new parsegraph_FontPainter(numGlyphs.font);
                    this._fontPainters[fullFontName] = fontPainter;
                }
                fontPainter.initBuffer(numGlyphs);
            }
        }
    }

    countNode(node, counts) {
        if(!counts.numBlocks) {
            counts.numBlocks = 0;
        }

        if(this.isExtentRenderingEnabled()) {
            if(!counts.numExtents) {
                counts.numExtents = 0;
            }
            forEachCardinalDirection(function(direction) {
                var extent = node.extentsAt(direction);
                counts.numExtents += extent.numBounds();
            }, this);
        }

        if(node.type() === Type.SLIDER) {
            if(node.parentDirection() === Direction.UPWARD) {
                // Only downward direction is currently supported.
                ++counts.numBlocks;
            }
            // One for the joining line.
            ++counts.numBlocks;
            // One for the block.
            ++counts.numBlocks;
        }
        else {
            forEachCardinalDirection(function(direction) {
                if(node.parentDirection() == direction) {
                    return;
                }
                if(node.hasChild(direction)) {
                    // Count one for the line
                    ++counts.numBlocks;
                }
            }, this);

            // One for the block.
            ++counts.numBlocks;
        }

        if(!node.realLabel()) {
            return;
        }

        var font = node.realLabel().font();
        var fontPainter = this.getFontPainter(font);

        if(isNaN(this._pagesPerGlyphTexture)) {
            var glTextureSize = parsegraph_getTextureSize(this.gl());
            if(this.gl().isContextLost()) {
                return;
            }
            var pagesPerRow = glTextureSize / fontPainter.font().pageTextureSize();
            this._pagesPerGlyphTexture = Math.pow(pagesPerRow, 2);
        }
        if(isNaN(this._pagesPerGlyphTexture)) {
            return;
        }

        if(!counts.numGlyphs) {
            counts.numGlyphs = {};
        }

        var numGlyphs = counts.numGlyphs[font.fullName()];
        if(!numGlyphs) {
            numGlyphs = {font:font};
            counts.numGlyphs[font.fullName()] = numGlyphs;
        }

        node.glyphCount(numGlyphs, this._pagesPerGlyphTexture);
        //console.log(node + " Count=" + counts.numBlocks);
    }

    drawNode(node) {
        var gl = this.gl();
        if(gl.isContextLost()) {
            return;
        }
        if(this.isExtentRenderingEnabled() && !node.isRoot()) {
            this.paintExtent(node);
        }
        parsegraph_checkGLError(gl, "Before Node drawNode");

        switch(node.type()) {
        case Type.SLIDER:
            return this.drawSlider(node);
        case Type.SCENE:
            this.paintLines(node);
            this.paintBlock(node);
            return this.drawScene(node);
        default:
            this.paintLines(node);
            this.paintBlock(node);
        }
        parsegraph_checkGLError(gl, "After Node drawNode");
    }

    paintLines(node) {
        var drawLine = function(direction) {
            if(node.parentDirection() == direction) {
                return;
            }
            if(!node.hasChild(direction)) {
                // Do not draw lines unless there is a node.
                return;
            }
            var directionData = node.neighborAt(direction);

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

            var parentScale = node.groupScale();
            var scale = directionData.node.groupScale();
            if(typeof scale !== "number" || isNaN(scale)) {
                console.log(directionData.node);
                throw new Error(directionData.node + "'s groupScale must be a number but was " + scale);
            }

            var thickness = parsegraph_LINE_THICKNESS * scale * directionData.node.scale();
            //console.log(thickness, scale);
            if(isVerticalDirection(direction)) {
                var length = directionSign(direction)
                    * parentScale * (directionData.lineLength + parsegraph_LINE_THICKNESS / 2);
                painter.drawBlock(
                    node.groupX(),
                    node.groupY() + length / 2,
                    thickness,
                    Math.abs(length),
                    0,
                    0,
                    scale
                );
            }
            else {
                // Horizontal line.
                var length = directionSign(direction)
                    * parentScale * (directionData.lineLength + parsegraph_LINE_THICKNESS / 2);
                painter.drawBlock(
                    node.groupX() + length / 2,
                    node.groupY(),
                    Math.abs(length),
                    thickness,
                    0,
                    0,
                    scale
                );
            }
        };
        forEachCardinalDirection(drawLine, this);
    }

    paintExtent(node) {
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
                rect.x() + rect.width() / 2,
                rect.y() + rect.height() / 2,
                rect.width(),
                rect.height(),
                parsegraph_EXTENT_BORDER_ROUNDEDNESS,
                parsegraph_EXTENT_BORDER_THICKNESS,
                node.groupScale()
            );
        };

        var paintDownwardExtent = function() {
            var extent = node.extentsAt(Direction.DOWNWARD);
            var rect = new Rect(
                node.groupX() - node.groupScale() * node.extentOffsetAt(Direction.DOWNWARD),
                node.groupY(),
                0, 0
            );

            extent.forEach(function(length, size) {
                length *= node.groupScale();
                size *= node.groupScale();
                rect.setWidth(length);
                rect.setHeight(size);
                paintBound(rect);
                rect.setX(rect.x() + length);
            });
        };

        var paintUpwardExtent = function() {
            var extent = node.extentsAt(Direction.UPWARD);
            var rect = new Rect(
                node.groupX() - node.groupScale() * node.extentOffsetAt(Direction.UPWARD),
                0,
                0, 0
            );

            extent.forEach(function(length, size) {
                length *= node.groupScale();
                size *= node.groupScale();
                rect.setY(node.groupY() - size);
                rect.setWidth(length);
                rect.setHeight(size);
                paintBound(rect);
                rect.setX(rect.x() + length);
            });
        };

        var paintBackwardExtent = function() {
            var extent = node.extentsAt(Direction.BACKWARD);
            var rect = new Rect(
                0,
                node.groupY() - node.groupScale() * node.extentOffsetAt(Direction.BACKWARD),
                0, 0
            );

            extent.forEach(function(length, size) {
                length *= node.groupScale();
                size *= node.groupScale();
                rect.setHeight(length);
                rect.setX(node.groupX() - size);
                rect.setWidth(size);
                paintBound(rect);
                rect.setY(rect.y() + length);
            });
        };

        var paintForwardExtent = function() {
            var extent = node.extentsAt(Direction.FORWARD);
            var rect = new Rect(
                node.groupX(),
                node.groupY() - node.extentOffsetAt(Direction.FORWARD) * node.groupScale(),
                0, 0
            );

            extent.forEach(function(length, size, i) {
                length *= node.groupScale();
                size *= node.groupScale();
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
    }

    paintBlock(node) {
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
        var size = node.groupSize(this.bodySize);
        //console.log(nameType(node.type()) + " x=" + node.groupX() + ", " + node.groupY());
        painter.drawBlock(
            node.groupX(),
            node.groupY(),
            size.width(),
            size.height(),
            style.borderRoundness,
            style.borderThickness,
            node.groupScale()
        );

        // Draw the label.
        var label = node.realLabel();
        if(!label) {
            return;
        }
        var fontScale = (style.fontSize * node.groupScale()) / label.fontSize();
        var labelX, labelY;
        var fontPainter = this.getFontPainter(label.font());
        fontPainter.setColor(
            node.isSelected() ?
                style.selectedFontColor :
                style.fontColor
        );
        if(node.hasNode(Direction.INWARD)) {
            var nestedNode = node.nodeAt(Direction.INWARD);
            var nodeSize = node.sizeWithoutPadding(this.bodySize);
            if(node.nodeAlignmentMode(Direction.INWARD) == Alignment.VERTICAL) {
                // Align vertical.
                labelX = node.groupX() - fontScale * label.width()/2;
                labelY = node.groupY() - node.groupScale() * nodeSize.height()/2;
            }
            else {
                // Align horizontal.
                labelX = node.groupX() - node.groupScale() * nodeSize.width()/2;
                labelY = node.groupY() - fontScale * label.height()/2;
            }
        }
        else {
            labelX = node.groupX() - fontScale * label.width()/2;
            labelY = node.groupY() - fontScale * label.height()/2;
        }
        node._label._x = labelX;
        node._label._y = labelY;
        node._label._scale = fontScale;
        label.paint(fontPainter, labelX, labelY, fontScale);
    }

    render(world:number[], scale:number, forceSimple:boolean):void {
        //console.log("RENDERING THE NODE from nodepainter");
        ++this._consecutiveRenders;
        var gl = this.gl();
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        if(this._renderBlocks) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._blockPainter.render(world, scale, forceSimple);
        }
        if(this._renderExtents) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_DST_ALPHA);
            this._extentPainter.render(world, scale);
        }

        if(!forceSimple && this._renderText) {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            for(var fontName in this._fontPainters) {
                var fontPainter = this._fontPainters[fontName];
                fontPainter.render(world, scale);
            }
        }

        if(this._textures.length > 0) {
            this._textures.forEach(function(t) {
                t.render(world);
            });
        }
    }

    enableExtentRendering():void {
        this._renderExtents = true;
    }

    disableExtentRendering():void {
        this._renderExtents = false;
    }

    isExtentRenderingEnabled():boolean {
        return this._renderExtents;
    }

    enableBlockRendering():void {
        this._renderBlocks = true;
    }

    disableBlockRendering():void {
        this._renderBlocks = false;
    }

    isBlockRenderingEnabled():boolean {
        return this._renderBlocks;
    }

    enableLineRendering():void {
        this._renderLines = true;
    }

    disableLineRendering():void {
        this._renderLines = false;
    }

    isLineRenderingEnabled():boolean {
        return this._renderLines;
    }

    enableTextRendering():void {
        this._renderText = true;
    }

    disableTextRendering():void {
        this._renderText = false;
    }

    isTextRenderingEnabled():boolean {
        return this._renderText;
    }

    enableSceneRendering():void {
        this._renderScenes = true;
    }

    disableSceneRendering():void {
        this._renderScenes = false;
    }

    isSceneRenderingEnabled():boolean {
        return this._renderScenes;
    }
}
