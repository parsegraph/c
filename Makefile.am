# TODO Allow tests to be excluded for production uses.

ACLOCAL_AMFLAGS = -I m4

dist_bin_SCRIPTS = parsegraph-$(PACKAGE_VERSION).js

# Distribute the pkg-config file.
pkgconfigdir = $(libdir)/pkgconfig

pkgconfig_DATA = \
	parsegraph.pc

parsegraph.pc: parsegraph.pc.head
	cat $< >$@
	echo "script=$(pkgdatadir)/parsegraph-$(PACKAGE_VERSION).js" >>$@

# Distribute the core Javascript library.
pkgdata_DATA = \
	parsegraph-$(PACKAGE_VERSION).js \
	parsegraph-examples-$(PACKAGE_VERSION).js \
	esprima.js

CLEANFILES = \
	parsegraph-$(PACKAGE_VERSION).js \
	parsegraph-examples-$(PACKAGE_VERSION).js

parsegraph_SCRIPT_FILES = \
	src/TestSuite.js \
	src/date.js \
	src/dom.js \
	src/event.js \
	src/Form.js \
	src/id.js \
	src/list.js \
	src/gl.js \
	src/ArrayList.js \
	src/Float32List.js \
	src/timing.js \
	src/pagingbuffer.js \
	src/CommandClient.js \
	src/DepthTraversal.js \
	src/graph/Label.js \
	src/graph/Color.js \
	src/graph/Exception.js \
	src/graph/Extent.js \
	src/graph/NodeAlignment.js \
	src/graph/NodeDirection.js \
	src/graph/NodeType.js \
	src/graph/NodeFit.js \
	src/graph/Rect.js \
	src/graph/Size.js \
	src/graph/Status.js \
	src/graph/initialize.js \
	src/graph/log.js \
	src/graph/PaintGroup.js \
	src/graph/Carousel.js \
	src/graph/CameraBox.js \
	src/graph/Graph.js \
	src/graph/World.js \
	src/graph/parsegraph_Graph_Tests.js \
	src/graph/Input.js \
	src/graph/BlockPainter.js \
	src/graph/SpotlightPainter.js \
	src/graph/GlyphAtlas.js \
	src/graph/GlyphPainter.js \
	src/graph/LinePainter.js \
	src/graph/FanPainter.js \
	src/graph/NodePainter.js \
	src/graph/TexturePainter.js \
	src/graph/Caret.js \
	src/graph/LayoutPreference.js \
	src/graph/LayoutState.js \
	src/graph/Node.js \
	src/graph/Surface.js \
	src/graph/CameraBoxPainter.js \
	src/alpha/Maths.js \
	src/alpha/Physical.js \
	src/alpha/Input.js \
	src/alpha/Cam.js \
	src/alpha/BlockStuff.js \
	src/alpha/FacePainter.js \
	src/alpha/Cluster.js \
	src/alpha/BlockIDs.js \
	src/alpha/CubeMan.js \
	src/alpha/GLWidget.js \
	src/alpha/WeetPainter.js \
	src/Parser.js \
	src/user.js \
	src/graph/Camera.js \
	src/timeline/HTimeline.js \
	src/timeline/VTimeline.js \
	src/timeline/HSlicePainter.js \
	src/timeline/VSlicePainter.js \
	src/timeline/HSunrisePainter.js \
	src/timeline/VSunrisePainter.js \
	src/graph/refactor.js

parsegraph-$(PACKAGE_VERSION).js: $(parsegraph_SCRIPT_FILES)
	rm -f $@
	cat $^ >$@
	echo >>$@
	echo "/* Generated `date` */" >>$@
	chmod 0444 $@

parsegraph_EXAMPLE_FILES = \
	src/examples/createSliderDemo.js \
	src/examples/showCorporateStructure.js \
	src/examples/showHardTest.js \
	src/examples/showStatements.js \
	src/examples/buildSelection.js \
	src/examples/showFunction.js \
	src/examples/showIPAddresses.js \
	src/examples/showMemoryBlocks.js \
	src/examples/showProportionTest.js \
	src/examples/showFlowchartTemplate.js \
	src/examples/showUlam.js \
	src/examples/showSpiral.js \
	src/examples/showCalendar.js \
	src/examples/buildPrimesDemo.js \
	src/examples/LinearWidget.js \
	src/examples/buildTextDemo.js

parsegraph-examples-$(PACKAGE_VERSION).js: $(parsegraph_EXAMPLE_FILES)
	rm -f $@
	cat $^ >$@
	echo >>$@
	echo "/* Generated `date` */" >>$@
	chmod 0444 $@
