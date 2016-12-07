function parsegraph_Graph(rootType)

CANVAS API:

    parsegraph_Graph.prototype.setBackground = function(color)
    parsegraph_Graph.prototype.backgroundColor = function()

    parsegraph_Graph.prototype.paint = function()
    parsegraph_Graph.prototype.render = function()
    parsegraph_Graph.prototype.scheduleRepaint = function()
    parsegraph_Graph.prototype.scheduleRender = function()
    parsegraph_Graph.prototype.cancelRepaint = function()
    parsegraph_Graph.prototype.cancelRender = function()

    parsegraph_Graph.prototype.isExtentRenderingEnabled = function()
    parsegraph_Graph.prototype.isOriginRenderingEnabled = function()
    parsegraph_Graph.prototype.isBlockRenderingEnabled = function()
    parsegraph_Graph.prototype.isSpotlightRenderingEnabled = function()
    parsegraph_Graph.prototype.isTextRenderingEnabled = function()
    parsegraph_Graph.prototype.isLineRenderingEnabled = function()

    parsegraph_Graph.prototype.enableExtentRendering = function()
    parsegraph_Graph.prototype.disableExtentRendering = function()
    parsegraph_Graph.prototype.enableOriginRendering = function()
    parsegraph_Graph.prototype.disableOriginRendering = function()
    parsegraph_Graph.prototype.enableBlockRendering = function()
    parsegraph_Graph.prototype.disableBlockRendering = function()
    parsegraph_Graph.prototype.enableSpotlightRendering = function()
    parsegraph_Graph.prototype.disableSpotlightRendering = function()
    parsegraph_Graph.prototype.enableLineRendering = function()
    parsegraph_Graph.prototype.disableLineRendering = function()
    parsegraph_Graph.prototype.enableTextRendering = function()
    parsegraph_Graph.prototype.disableTextRendering = function()

    parsegraph_Graph.prototype.container = function()
    parsegraph_Graph.prototype.camera = function()
    parsegraph_Graph.prototype.gl = function()
    parsegraph_Graph.prototype.canvas = function()

    parsegraph_Graph.prototype.subgraph = function(rootType)

    parsegraph_Graph.prototype.mouseDown = function(x, y)
    parsegraph_Graph.prototype.nodeUnderCoords = function(x, y)

CARET API:

    parsegraph_Graph.prototype.node = function()

    parsegraph_Graph.prototype.has = function(inDirection)
    parsegraph_Graph.prototype.spawn = function(inDirection, newContent, newAlignmentMode)
    parsegraph_Graph.prototype.spawnMove = function(inDirection, newContent, newAlignmentMode)
    parsegraph_Graph.prototype.erase = function(inDirection)
    parsegraph_Graph.prototype.move = function(toDirection)

    parsegraph_Graph.prototype.content = function()
    parsegraph_Graph.prototype.replace = function()
    parsegraph_Graph.prototype.at = function(inDirection)
    parsegraph_Graph.prototype.align = function(inDirection, newAlignmentMode)
    parsegraph_Graph.prototype.pull = function(given)
    parsegraph_Graph.prototype.shrink = function()
    parsegraph_Graph.prototype.grow = function()
    parsegraph_Graph.prototype.fitExact = function()
    parsegraph_Graph.prototype.fitLoose = function()
    parsegraph_Graph.prototype.grow = function(/* ... */)
    parsegraph_Graph.prototype.label = function(/* ... */)
    parsegraph_Graph.prototype.select = function()
    parsegraph_Graph.prototype.selected = function()
    parsegraph_Graph.prototype.deselect = function()

    parsegraph_Graph.prototype.getNodeById = function(id)
    parsegraph_Graph.prototype.save = function(id)
    parsegraph_Graph.prototype.clearSave = function(id)
    parsegraph_Graph.prototype.restore = function(id)
    parsegraph_Graph.prototype.moveTo = parsegraph_Graph.prototype.restore;
    parsegraph_Graph.prototype.push = function()
    parsegraph_Graph.prototype.pop = function()
    parsegraph_Graph.prototype.changedId = function(changedNode)

    parsegraph_Graph.prototype.moveToRoot = function()
    parsegraph_Graph.prototype.root = function()
