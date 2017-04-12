lib_LTLIBRARIES = libparsegraph.la
libparsegraph_la_CFLAGS = -Wall @httpd_CFLAGS@ @openssl_CFLAGS@ @parsegraph_CFLAGS@
libparsegraph_la_LDFLAGS = -lm @httpd_LIBS@ @openssl_LIBS@ @parsegraph_LIBS@ -shared

nobase_include_HEADERS = \
	graph/Node.h \
	graph/Extent.h

libparsegraph_la_SOURCES = \
	graph/Node.c \
	graph/Extent.c

bin_PROGRAMS = parsegraph

parsegraph_CFLAGS = \
	$(libparsegraph_la_CFLAGS) \
	-I$(top_SRCDIR)
parsegraph_LDFLAGS = $(libparsegraph_la_LDFLAGS)
parsegraph_LDADD = libparsegraph.la

parsegraph_SOURCES = \
	main.c

check_PROGRAMS = runtest
runtest_CFLAGS = \
	$(libparsegraph_la_CFLAGS) \
	-I$(top_SRCDIR)
runtest_LDFLAGS = $(libparsegraph_la_LDFLAGS)
runtest_LDADD = libparsegraph.la

noinst_HEADERS = \
	tests/unity.h \
	tests/unity_internals.h

runtest_SOURCES = \
	tests/graph/Extent.c \
	tests/unity.c

TESTS = $(check_PROGRAMS)
