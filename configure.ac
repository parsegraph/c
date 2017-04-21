# Process this file with autoconf to produce a configure script.
AC_PREREQ([2.68])
AC_INIT([parsegraph], [1.0], [dafrito@gmail.com], [parsegraph], [https//parsegraph.com])
AC_SUBST([PACKAGE_RELEASE], [1])
AC_SUBST([PACKAGE_DESCRIPTION], ['A toolkit for creating native and browser-hosted Parsegraph applications'])
AC_SUBST([PACKAGE_SUMMARY], ['Parsegraph toolkit for JavaScript and C'])
AC_CONFIG_MACRO_DIR([m4])
AM_INIT_AUTOMAKE([-Wall foreign serial-tests subdir-objects])
AC_CONFIG_SRCDIR([src/graph/Node.c])
AC_CONFIG_HEADERS([src/parsegraph_config.h])

# Check for build programs
AC_PROG_CC
AC_PROG_INSTALL
AC_PROG_LN_S

# Initialize libtool
AM_PROG_AR
LT_PREREQ([2.2])
LT_INIT
AC_PROG_LIBTOOL

# Include Apache
AC_SUBST(httpd_CFLAGS)
AC_SUBST(httpd_LIBS)
httpd_CFLAGS="-I/usr/include/httpd -I/usr/include/apr-1"
httpd_LIBS="-lapr-1 -laprutil-1 -fPIC"

PKG_CHECK_MODULES(openssl, [openssl],
    [],
    [AC_MSG_ERROR([openssl is required])]
)

PKG_CHECK_MODULES(parsegraph, [cairo libdrm egl gl gbm],
    [],
    [AC_MSG_ERROR([parsegraph requires a bunch of low-level C graphics libraries.])]
)

AC_PROG_CXX

PKG_CHECK_MODULES(parsegraph_cxx, [Qt5Core Qt5Gui],
    [],
    [AC_MSG_ERROR([parsegraph for C++ requires Qt.])]
)

# Generate files.
AC_CONFIG_FILES([
    Makefile
    src/Makefile
    parsegraph.pc.head
    src/rpm.spec
    rpm.sh
])
AC_OUTPUT
