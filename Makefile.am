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
	www/UnicodeData.txt \
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
	www/UnicodeData.txt \
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
	src/function.js \
	src/id.js \
	src/list.js \
	src/gl.js \
	src/types/permissions.js \
	src/app.js \
	src/types/environment.js \
	src/types/event_processor.js \
	src/types/multislot.js \
	src/types/multislot_plot.js \
	src/parsegraph_ActionCarousel.js \
	src/ArrayList.js \
	src/Float32List.js \
	src/alpha_WeetCubeWidget.js \
	src/timing.js \
	src/pagingbuffer.js \
	src/CommandClient.js \
	src/DepthTraversal.js \
	src/graph/Label.js \
	src/graph/Color.js \
	src/graph/Exception.js \
	src/graph/Extent.js \
	src/graph/AxisOverlap.js \
	src/graph/NodeAlignment.js \
	src/graph/NodeDirection.js \
	src/graph/NodeType.js \
	src/graph/NodeFit.js \
	src/graph/Rect.js \
	src/graph/Size.js \
	src/graph/Status.js \
	src/graph/initialize.js \
	src/graph/log.js \
	src/graph/Carousel.js \
	src/graph/BurgerMenu.js \
	src/graph/CameraBox.js \
	src/graph/Viewport.js \
	src/graph/World.js \
	src/graph/parsegraph_Graph_Tests.js \
	src/graph/Input.js \
	src/graph/BlockPainter.js \
	src/graph/SpotlightPainter.js \
	src/graph/Font.js \
	src/graph/GlyphPainter.js \
	src/graph/FanPainter.js \
	src/graph/NodePainter.js \
	src/graph/TexturePainter.js \
	src/graph/Caret.js \
	src/graph/LayoutPreference.js \
	src/graph/LayoutState.js \
	src/graph/TimingBelt.js \
	src/graph/Node.js \
	src/graph/Component.js \
	src/graph/layout.js \
	src/graph/Freezer.js \
	src/graph/Window.js \
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
	src/types/parsegraph_JavaScriptWidget.js \
	src/parsegraph_CameraProtocol.js \
	src/types/parsegraph_ChatProtocol.js \
	src/parsegraph_LoginWidget.js \
	src/parsegraph_ProfileWidget.js \
	src/types/audio/parsegraph_OscillatorWidget.js \
	src/AudioKeyboard.js \
	src/types/audio/parsegraph_SingleOscillatorWidget.js \
	src/types/parsegraph_OnOffWidget.js \
	src/types/audio/parsegraph_EnvelopeGeneratorWidget.js \
	src/types/audio/parsegraph_FilterWidget.js \
	src/types/audio/parsegraph_SynthWidget.js \
	src/types/audio/parsegraph_SequencerWidget.js \
	src/types/audio/parsegraph_DelayWidget.js \
	src/types/audio/parsegraph_FlangerWidget.js \
	src/types/audio/parsegraph_ConvolverWidget.js \
	src/types/audio/parsegraph_WaveShaperWidget.js \
	src/types/audio/parsegraph_8BitWidget.js \
	src/types/anthonylisp.js \
	src/apps/createSliderDemo.js \
	src/apps/showCorporateStructure.js \
	src/apps/showHardTest.js \
	src/apps/showStatements.js \
	src/apps/buildSelection.js \
	src/apps/showFunction.js \
	src/apps/showIPAddresses.js \
	src/apps/piers.js \
	src/apps/proportion.js \
	src/apps/chess.js \
	src/apps/bible.js \
	src/apps/builder.js \
	src/apps/ulam.js \
	src/apps/showSpiral.js \
	src/apps/showCalendar.js \
	src/apps/primes.js \
	src/apps/crease.js \
	src/LinearWidget.js \
	src/apps/text.js

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
