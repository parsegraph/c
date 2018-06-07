# TODO Allow tests to be excluded for production uses.

ACLOCAL_AMFLAGS = -I m4
#SUBDIRS = src

VALGRIND = valgrind -v --num-callers=40 --leak-check=full --trace-children=yes --show-leak-kinds=all

checkvalgrind:
	cd src; $(VALGRIND) .libs/lt-parsegraph

run: src/parsegraph
	$<
.PHONY: run

debug:
	cd src; gdb .libs/lt-parsegraph
.PHONY: debug

dist_bin_SCRIPTS = parsegraph-$(PACKAGE_VERSION).js \
	parsegraph-widgets-$(PACKAGE_VERSION).js \
	esprima.js \
	UnicodeData.txt \
	www

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
	parsegraph-widgets-$(PACKAGE_VERSION).js \
	esprima.js \
	UnicodeData.txt \
	www/sga.css

CLEANFILES = \
	parsegraph-$(PACKAGE_VERSION).js \
	parsegraph-widgets-$(PACKAGE_VERSION).js

parsegraph_SCRIPT_FILES = \
	src/TestSuite.js \
	src/math.js \
	src/date.js \
	src/dom.js \
	src/unicode.js \
	src/event.js \
	src/Form.js \
	src/id.js \
	src/list.js \
	src/gl.js \
	src/widgets/parsegraph_SingleGraphApplication.js \
	src/ArrayList.js \
	src/Float32List.js \
	src/widgets/alpha_WeetCubeWidget.js \
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
	src/timeline/VSunrisePainter.js

parsegraph-$(PACKAGE_VERSION).js: $(parsegraph_SCRIPT_FILES)
	rm -f $@
	cat $^ >$@
	echo >>$@
	echo "/* Generated `date` */" >>$@
	chmod 0444 $@

parsegraph_WIDGET_FILES = \
	src/widgets/parsegraph_JavaScriptWidget.js \
	src/widgets/parsegraph_CameraProtocol.js \
	src/widgets/parsegraph_ChatProtocol.js \
	src/widgets/parsegraph_EnvironmentProtocol.js \
	src/widgets/parsegraph_LoginWidget.js \
	src/widgets/parsegraph_ProfileWidget.js \
	src/widgets/parsegraph_OscillatorWidget.js \
	src/widgets/parsegraph_SingleOscillatorWidget.js \
	src/widgets/parsegraph_OnOffWidget.js \
	src/widgets/parsegraph_EnvelopeGeneratorWidget.js \
	src/widgets/parsegraph_FilterWidget.js \
	src/widgets/parsegraph_SynthWidget.js \
	src/widgets/parsegraph_SequencerWidget.js \
	src/widgets/parsegraph_DelayWidget.js \
	src/widgets/parsegraph_FlangerWidget.js \
	src/widgets/parsegraph_ConvolverWidget.js \
	src/widgets/parsegraph_WaveShaperWidget.js \
	src/widgets/parsegraph_8BitWidget.js \
	src/widgets/createSliderDemo.js \
	src/widgets/showCorporateStructure.js \
	src/widgets/showHardTest.js \
	src/widgets/showStatements.js \
	src/widgets/buildSelection.js \
	src/widgets/showFunction.js \
	src/widgets/showIPAddresses.js \
	src/widgets/showMemoryBlocks.js \
	src/widgets/showProportionTest.js \
	src/widgets/showFlowchartTemplate.js \
	src/widgets/showUlam.js \
	src/widgets/showSpiral.js \
	src/widgets/showCalendar.js \
	src/widgets/buildPrimesDemo.js \
	src/widgets/LinearWidget.js \
	src/widgets/buildTextDemo.js

parsegraph-widgets-$(PACKAGE_VERSION).js: $(parsegraph_WIDGET_FILES)
	rm -f $@
	cat $^ >$@
	echo >>$@
	echo "/* Generated `date` */" >>$@
	chmod 0444 $@

rpm:
	chmod +x ./rpm.sh
	./rpm.sh
.PHONY: rpm
