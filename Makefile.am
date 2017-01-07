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
	parsegraph-$(PACKAGE_VERSION).js

CLEANFILES = \
	parsegraph-$(PACKAGE_VERSION).js

parsegraph_SCRIPT_FILES = \
	src/TestSuite.js \
	src/date.js \
	src/dom.js \
	src/event.js \
	src/Form.js \
	src/id.js \
	src/list.js \
	src/gl.js \
	src/pagingbuffer.js \
	src/CommandClient.js \
	src/graph/Color.js \
	src/graph/DirectionData.js \
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
	src/graph/Graph.js \
	src/graph/BlockPainter.js \
	src/graph/SpotlightPainter.js \
	src/graph/GlyphAtlas.js \
	src/graph/TextPainter.js \
	src/graph/LinePainter.js \
	src/graph/Node_commitLayout.js \
	src/graph/constants.js \
	src/graph/NodePainter.js \
	src/graph/Caret.js \
	src/graph/LayoutPreference.js \
	src/graph/LayoutState.js \
	src/graph/Neighbors.js \
	src/graph/Node.js \
	src/alpha/Maths.js \
	src/alpha/Physical.js \
	src/alpha/Cam.js \
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
