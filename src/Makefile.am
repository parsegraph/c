PROG = parsegraph_proportion

run:
	./$(PROG)
.PHONY: run

VALGRIND = valgrind -v --num-callers=40 --leak-check=full --trace-children=yes --suppressions=suppressions.valgrind

valgrind:
	$(VALGRIND) .libs/lt-$(PROG) -- tmpdir
.PHONY: valgrind

lib_LTLIBRARIES = libparsegraph.la
libparsegraph_la_CFLAGS = -DHIGHP="\"\"" -g -fPIC -Wall @pthread_CFLAGS@ @httpd_CFLAGS@ @parsegraph_common_CFLAGS@
libparsegraph_la_LDFLAGS = -fPIC -lm @pthread_LIBS@ @httpd_LIBS@ @parsegraph_common_LIBS@

lib_LTLIBRARIES += libparsegraph-Qt.la
libparsegraph_Qt_la_CFLAGS = -DHIGHP="\"\"" -g -fPIC -Wall @pthread_CFLAGS@ @httpd_CFLAGS@ @parsegraph_common_CFLAGS@
libparsegraph_Qt_la_LDFLAGS = -fPIC -lm @pthread_LIBS@ @httpd_LIBS@ @parsegraph_cxx_LIBS@ @parsegraph_common_LIBS@
#libparsegraph_Qt_la_LIBADD = graph/libparsegraph-GlyphAtlas.a libparsegraph-timing.a

#lib_LTLIBRARIES += libparsegraph-kms.la
#libparsegraph_kms_la_CFLAGS = -g -fPIC -Wall @pthread_CFLAGS@ @httpd_CFLAGS@ @parsegraph_common_CFLAGS@ @parsegraph_CFLAGS@
#libparsegraph_kms_la_LDFLAGS = -fPIC -lm -lrt @pthread_LIBS@ @httpd_LIBS@ @parsegraph_LIBS@ @parsegraph_common_LIBS@
#libparsegraph_kms_la_LIBADD =

#lib_LTLIBRARIES += libparsegraph-osmesa.la
#libparsegraph_osmesa_la_CFLAGS = -g -fPIC -Wall @pthread_CFLAGS@ @httpd_CFLAGS@ @parsegraph_common_CFLAGS@ @parsegraph_CFLAGS@
#libparsegraph_osmesa_la_LDFLAGS = -fPIC -lm -lrt @pthread_LIBS@ @httpd_LIBS@ @parsegraph_LIBS@ @parsegraph_common_LIBS@
#libparsegraph_osmesa_la_LIBADD =

nobase_include_HEADERS = \
	die.h \
	ArrayList.h \
	Float32List.h \
	id.h \
	parsegraph_math.h \
	graph/LayoutPreference.h \
	graph/LayoutState.h \
	graph/NodeAlignment.h \
	graph/NodeDirection.h \
	graph/NodeFit.h \
	graph/GlyphAtlas.h \
	graph/NodeType.h \
	graph/NodePainter.h \
	graph/NodeList.h \
	graph/Rect.h \
	graph/Size.h \
	graph/TexturePainter.h \
	graph/Camera.h \
	graph/LayoutList.h \
	graph/Window.h \
	graph/Node.h \
	graph/Caret.h \
	graph/Color.h \
	graph/Viewport.h \
	graph/World.h \
	graph/Status.h \
	pagingbuffer.h \
	graph/Extent.h \
	alpha/Cam.h \
	alpha/Cluster.h \
	alpha/CubeMan.h \
	alpha/FacePainter.h \
	graph/Input.h \
	graph/log.h \
	graph/initialize.h \
	graph/CameraBox.h \
	graph/SpotlightPainter.h \
	graph/CameraBoxPainter.h \
	graph/BlockPainter.h \
	graph/GlyphPainter.h \
	graph/Label.h \
	graph/FanPainter.h \
	graph/Carousel.h \
	alpha/GLWidget.h \
	alpha/Input.h \
	alpha/Maths.h \
	alpha/BlockIDs.h \
	alpha/BlockStuff.h \
	alpha/WeetPainter.h \
	alpha/Physical.h \
	alpha_WeetCubeWidget.h \
	apps/buildPrimesDemo.h \
	apps/showProportionTest.h \
	apps/buildTextDemo.h \
	AudioKeyboard.h \
	apps/showDirectory.h \
	gl.h \
	unicode.h \
	parsegraph_LoginWidget.h \
	app.h

libparsegraph_la_SOURCES = \
	die.c \
	ArrayList.c \
	Float32List.c \
	id.c \
	parsegraph_math.c \
	graph/Color.c \
	graph/LayoutPreference.c \
	graph/LayoutState.c \
	graph/Caret.c \
	graph/NodeFit.c \
	graph/NodeType.c \
	graph/Node.c \
	graph/NodeList.c \
	graph/CameraBox.c \
	graph/Carousel.c \
	graph/Rect.c \
	graph/Size.c \
	graph/Status.c \
	graph/log.c \
	graph/Label.c \
	graph/NodeAlignment.c \
	graph/NodeDirection.c \
	graph/Camera.c \
	graph/LayoutList.c \
	graph/Window.c \
	graph/Viewport.c \
	graph/World.c \
	graph/Input.c \
	graph/initialize.c \
	pagingbuffer.c \
	graph/Extent.c \
	alpha/Maths.c \
	alpha/BlockIDs.c \
	alpha/BlockStuff.c \
	alpha/Physical.c \
	alpha/Cam.c \
	alpha/Cluster.c \
	alpha/GLWidget.c \
	alpha/Input.c \
	alpha/CubeMan.c \
	alpha_WeetCubeWidget.c \
	apps/buildPrimesDemo.c \
	apps/showProportionTest.c \
	apps/buildTextDemo.c \
	apps/showDirectory.c \
	AudioKeyboard.c \
	gl.c \
	unicode.c \
	graph/BlockPainter.c \
	graph/GlyphPainter.c \
	graph/TexturePainter.c \
	graph/NodePainter.c \
	graph/CameraBoxPainter.c \
	graph/SpotlightPainter.c \
	graph/FanPainter.c \
	alpha/WeetPainter.c \
	alpha/FacePainter.c \
	parsegraph_PasswordNode.c \
	parsegraph_LoginWidget.c \
	app.c

libparsegraph_Qt_la_SOURCES = Qt.cpp

#libparsegraph_kms_la_SOURCES = $(parsegraph_common_SOURCES) \
#	graph/Camera-vflip.c \
#	graph/GlyphAtlas.c \
#	graph/GlyphAtlas-pango.c \
#	timing.c \
#	timing-linux.c

#libparsegraph_osmesa_la_SOURCES = $(libparsegraph_kms_la_SOURCES)

#graph/libparsegraph-GlyphAtlas.a: graph/GlyphAtlas.cpp graph/GlyphAtlas.c graph/GlyphAtlas.h Makefile
#	gcc -fPIC -c $(libparsegraph_Qt_la_CFLAGS) -I. graph/GlyphAtlas.c -ograph/GlyphAtlas-c.o
#	g++ -fPIC -c $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I. graph/GlyphAtlas.cpp -ograph/GlyphAtlas-cxx.o
#	ar rc graph/libparsegraph-GlyphAtlas.a graph/GlyphAtlas-c.o graph/GlyphAtlas-cxx.o
#	ranlib graph/libparsegraph-GlyphAtlas.a

#libparsegraph-timing.a: timing.cpp timing.c timing.h Makefile
#	gcc -fPIC -c $(libparsegraph_Qt_la_CFLAGS) -I. timing.c -otiming-c.o
#	g++ -fPIC -c $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I. timing.cpp -otiming-cxx.o
#	ar rc libparsegraph-timing.a timing-c.o timing-cxx.o
#	ranlib libparsegraph-timing.a

bin_PROGRAMS = parsegraph_proportion
#bin_PROGRAMS = parsegraph_kms_proportion parsegraph_kms_primes cxx_alpha cxx_weetcubes cxx_primes cxx_proportion cxx_text parsegraph_kms_text cxx_dir parsegraph_kms_dir parsegraph_osmesa_proportion parsegraph_osmesa_text

parsegraph_proportion_CFLAGS = \
	$(libparsegraph_la_CFLAGS) \
	-I$(top_SRCDIR)
parsegraph_proportion_LDADD = libparsegraph.la
parsegraph_proportion_SOURCES = \
	apps/proportion.c

#parsegraph_osmesa_extra = -DHIGHP="\"\""

#parsegraph_osmesa_proportion_CFLAGS = \
#	$(parsegraph_osmesa_extra) \
#	$(libparsegraph_osmesa_la_CFLAGS) \
#	-I$(top_SRCDIR)
#parsegraph_osmesa_proportion_LDFLAGS = $(libparsegraph_osmesa_la_LDFLAGS)
#parsegraph_osmesa_proportion_LDADD = libparsegraph-osmesa.la
#parsegraph_osmesa_proportion_SOURCES = \
#	osmesa.c apps/proportion.c

#parsegraph_kms_text_CFLAGS = \
#	$(libparsegraph_kms_la_CFLAGS) \
#	-I$(top_SRCDIR)
#parsegraph_kms_text_LDFLAGS = $(libparsegraph_kms_la_LDFLAGS)
#parsegraph_kms_text_LDADD = libparsegraph-kms.la
#parsegraph_kms_text_SOURCES = \
#	main.c apps/text.c
#
#parsegraph_osmesa_text_CFLAGS = \
#	$(parsegraph_osmesa_extra) \
#	$(libparsegraph_osmesa_la_CFLAGS) \
#	-I$(top_SRCDIR)
#parsegraph_osmesa_text_LDFLAGS = $(libparsegraph_osmesa_la_LDFLAGS)
#parsegraph_osmesa_text_LDADD = libparsegraph-osmesa.la
#parsegraph_osmesa_text_SOURCES = \
#	osmesa.c apps/text.c
#
#parsegraph_kms_dir_CFLAGS = \
#	$(libparsegraph_kms_la_CFLAGS) \
#	-I$(top_SRCDIR)
#parsegraph_kms_dir_LDFLAGS = -ldl $(libparsegraph_kms_la_LDFLAGS)
#parsegraph_kms_dir_LDADD = libparsegraph-kms.la
#parsegraph_kms_dir_SOURCES = \
#	main.c apps/dir.c
#
#parsegraph_kms_primes_CFLAGS = \
#	$(libparsegraph_kms_la_CFLAGS) \
#	-I$(top_SRCDIR)
#parsegraph_kms_primes_LDFLAGS = $(libparsegraph_kms_la_LDFLAGS)
#parsegraph_kms_primes_LDADD = libparsegraph-kms.la
#parsegraph_kms_primes_SOURCES = \
#	main.c apps/primes.c
#
#cxx_primes_CFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_primes_CXXFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_primes_LDFLAGS = $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_primes_LDADD = libparsegraph-Qt.la
#cxx_primes_SOURCES = \
#	main.cpp \
#	apps/primes.c
#
#cxx_proportion_CFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_proportion_CXXFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_proportion_LDFLAGS = $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_proportion_LDADD = libparsegraph-Qt.la
#cxx_proportion_SOURCES = \
#	main.cpp \
#	apps/proportion.c
#
#cxx_text_CFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_text_CXXFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_text_LDFLAGS = $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_text_LDADD = libparsegraph-Qt.la
#cxx_text_SOURCES = \
#	main.cpp \
#	apps/text.c
#
#cxx_dir_CFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_dir_CXXFLAGS = \
#	-fPIC $(libparsegraph_Qt_la_CFLAGS) $(parsegraph_cxx_CFLAGS) -I$(top_SRCDIR) -g
#cxx_dir_LDFLAGS = -ldl $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_dir_LDADD = libparsegraph-Qt.la
#cxx_dir_SOURCES = \
#	main.cpp \
#	apps/dir.c
#
#cxx_alpha_CXXFLAGS = \
#	-fPIC \
#	$(libparsegraph_Qt_la_CFLAGS) \
#	$(parsegraph_cxx_CFLAGS) \
#	-I$(top_SRCDIR) \
#	-g
#cxx_alpha_LDFLAGS = $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_alpha_LDADD = libparsegraph-Qt.la
#cxx_alpha_SOURCES = \
#	alpha.cpp
#
#cxx_weetcubes_CXXFLAGS = \
#	-fPIC \
#	$(libparsegraph_Qt_la_CFLAGS) \
#	$(parsegraph_cxx_CFLAGS) \
#	-I$(top_SRCDIR) \
#	-g
#cxx_weetcubes_LDFLAGS = $(libparsegraph_Qt_la_LDFLAGS) @parsegraph_cxx_LIBS@
#cxx_weetcubes_LDADD = libparsegraph-Qt.la
#cxx_weetcubes_SOURCES = \
#	weetcubes.cpp

noinst_HEADERS = tests/unity.h tests/unity_internals.h tests/testpool.h

check_PROGRAMS = runtest
runtest_CFLAGS = $(libparsegraph_la_CFLAGS) -I$(top_SRCDIR) -DGL_GLEXT_PROTOTYPES
runtest_LDFLAGS = $(libparsegraph_la_LDFLAGS) -lwayland-client -lwayland-egl -lEGL -lGL
runtest_LDADD = libparsegraph.la
runtest_SOURCES = \
	tests/graph/Extent.c \
	tests/alpha/Maths.c \
	tests/alpha/BlockStuff.c \
	tests/alpha/Physical.c \
	tests/alpha/Cam.c \
	tests/alpha/Cluster.c \
	tests/pagingbuffer.c \
	tests/unity.c \
	tests/main.c

TESTS = $(check_PROGRAMS)
