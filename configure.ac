# Process this file with autoconf to produce a configure script.
AC_PREREQ([2.68])
AC_INIT([parsegraph-js], [1.3], [dafrito@gmail.com], [parsegraph-js], [https//parsegraph.com])
AC_SUBST([PACKAGE_RELEASE], [10])
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
httpd_CFLAGS="-I/usr/include/httpd -I/usr/include/apache2 -I/usr/include/apr-1"
httpd_LIBS="-lapr-1 -laprutil-1 -fPIC"

# Include pthreads
AC_SUBST(pthread_CFLAGS)
AC_SUBST(pthread_LIBS)
pthread_CFLAGS=""
pthread_LIBS="-lpthread"

PKG_CHECK_MODULES(openssl, [openssl],
    [],
    [AC_MSG_ERROR([parsegraph requires openssl-devel])]
)

PKG_CHECK_MODULES(parsegraph_common, [apr-1 egl gl ncurses icu-uc icu-io icu-i18n libcurl glu],
    [],
    [AC_MSG_ERROR([parsegraph requires make httpd-devel apr-devel apr-util-devel autoconf automake libtool mesa-libEGL-devel mesa-libGL-devel ncurses-devel libicu-devel mesa-libGLU-devel])]
)

PKG_CHECK_MODULES(parsegraph, [cairo pango pangocairo libdrm egl gl gbm libudev libinput libevdev ncurses icu-uc icu-io icu-i18n harfbuzz osmesa],
    [],
    [AC_MSG_ERROR([parsegraph KMS requires make httpd-devel apr-devel apr-util-devel autoconf automake libtool pango-devel libdrm-devel mesa-libgbm-devel mesa-libEGL-devel mesa-libGL-devel libudev-devel libinput-devel libevdev-devel ncurses-devel libicu-devel harfbuzz-devel mesa-libOSMesa-devel])]
)
AC_PROG_CXX

PKG_CHECK_MODULES(parsegraph_cxx, [Qt5Core Qt5Gui],
    [],
    [AC_MSG_ERROR([parsegraph Qt requires make httpd-devel apr-devel apr-util-devel autoconf automake libtool mesa-libEGL-devel mesa-libGL-devel ncurses-devel libicu-devel qt5-qtbase-devel])]
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
