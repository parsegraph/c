PROG = cxx_parsegraph
run:
	./$(PROG)
.PHONY: run

VALGRIND = valgrind -v --num-callers=40 --leak-check=full --trace-children=yes

valgrind:
	$(VALGRIND) .libs/lt-$(PROG)
.PHONY: valgrind

lib_LTLIBRARIES = libparsegraph.la
libparsegraph_la_CFLAGS = -Wall @httpd_CFLAGS@ @openssl_CFLAGS@ @parsegraph_CFLAGS@
libparsegraph_la_LDFLAGS = -lm @httpd_LIBS@ @openssl_LIBS@ @parsegraph_LIBS@

nobase_include_HEADERS = \
	graph/LayoutPreference.h \
	graph/LayoutState.h \
	graph/NodeAlignment.h \
	graph/NodeDirection.h \
	graph/NodeFit.h \
	graph/GlyphAtlas.h \
	graph/NodeType.h \
	graph/NodePainter.h \
	graph/PaintGroup.h \
	graph/Rect.h \
	graph/Size.h \
	graph/TexturePainter.h \
	graph/Camera.h \
	graph/Surface.h \
	graph/Node.h \
	graph/Caret.h \
	graph/Color.h \
	graph/Graph.h \
	graph/World.h \
	pagingbuffer.h \
	graph/Extent.h \
	alpha/Cam.h \
	alpha/Cluster.h \
	alpha/CubeMan.h \
	alpha/FacePainter.h \
	graph/Input.h \
	graph/log.h \
	graph/initialize.h \
	alpha/GLWidget.h \
	alpha/Input.h \
	alpha/Maths.h \
	alpha/BlockIDs.h \
	alpha/BlockStuff.h \
	alpha/WeetPainter.h \
	alpha/Physical.h \
	widgets/alpha_WeetCubeWidget.h \
	gl.h

libparsegraph_la_SOURCES = \
	graph/GlyphAtlas.c \
	graph/LayoutPreference.c \
	graph/LayoutState.c \
	graph/NodeFit.c \
	graph/NodeType.c \
	graph/NodePainter.c \
	graph/PaintGroup.c \
	graph/Rect.c \
	graph/Size.c \
	graph/log.c \
	graph/TexturePainter.c \
	graph/NodeAlignment.c \
	graph/NodeDirection.c \
	graph/Camera.c \
	graph/Surface.c \
	graph/Caret.c \
	graph/Color.c \
	graph/Graph.c \
	graph/World.c \
	graph/Input.c \
	graph/initialize.c \
	pagingbuffer.c \
	graph/Extent.c \
	alpha/Maths.c \
	alpha/BlockIDs.c \
	alpha/BlockStuff.c \
	alpha/WeetPainter.c \
	alpha/Physical.c \
	alpha/Cam.c \
	alpha/FacePainter.c \
	alpha/Cluster.c \
	alpha/GLWidget.c \
	alpha/Input.c \
	alpha/CubeMan.c \
	widgets/alpha_WeetCubeWidget.c \
	gl.c

#graph/Node.c

bin_PROGRAMS = parsegraph cxx_parsegraph

parsegraph_CFLAGS = \
	$(libparsegraph_la_CFLAGS) \
	-I$(top_SRCDIR)
parsegraph_LDFLAGS = $(libparsegraph_la_LDFLAGS)
parsegraph_LDADD = libparsegraph.la

parsegraph_SOURCES = \
	main.c

cxx_parsegraph_CXXFLAGS = \
	-fPIC \
	$(libparsegraph_la_CFLAGS) \
	$(parsegraph_cxx_CFLAGS) \
	-I$(top_SRCDIR)
cxx_parsegraph_LDFLAGS = $(libparsegraph_la_LDFLAGS) @parsegraph_cxx_LIBS@
cxx_parsegraph_LDADD = libparsegraph.la
cxx_parsegraph_SOURCES = \
	main.cpp

noinst_HEADERS = tests/unity.h tests/unity_internals.h tests/testpool.h

check_PROGRAMS = runtest
runtest_CFLAGS = $(libparsegraph_la_CFLAGS) -I$(top_SRCDIR)
runtest_LDFLAGS = $(libparsegraph_la_LDFLAGS)
runtest_LDADD = libparsegraph.la
runtest_SOURCES = \
	tests/graph/Extent.c \
	tests/alpha/Maths.c \
	tests/alpha/BlockStuff.c \
	tests/alpha/Physical.c \
	tests/alpha/Cam.c \
	tests/pagingbuffer.c \
	tests/unity.c \
	tests/main.c

TESTS = $(check_PROGRAMS)
