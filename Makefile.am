# TODO Allow tests to be excluded for production uses.

ACLOCAL_AMFLAGS = -I m4
SUBDIRS = src

VALGRIND = valgrind -v --num-callers=40 --leak-check=full --trace-children=yes --show-leak-kinds=all

checkvalgrind:
	cd src; $(VALGRIND) .libs/lt-parsegraph

run: src/parsegraph
	$<
.PHONY: run

debug:
	cd src; gdb .libs/lt-parsegraph
.PHONY: debug

# Distribute the pkg-config file.
pkgconfigdir = $(libdir)/pkgconfig

pkgconfig_DATA = \
	parsegraph.pc

parsegraph.pc: parsegraph.pc.head
	cat $< >$@
	echo "script=$(pkgdatadir)/parsegraph-$(PACKAGE_VERSION).js" >>$@

rpm:
	chmod +x ./rpm.sh
	./rpm.sh
.PHONY: rpm
