#!/bin/bash
PATH=/usr/bin

RPMDIR=$HOME/rpmbuild
mkdir -p $RPMDIR
cd $RPMDIR && mkdir -p SOURCES SPECS BUILD RPMS SRPMS && cd -

RPMFLAGS=--ba
SRCRPM=parsegraph-1.0-1.src.rpm

make dist-gzip
cp -u parsegraph-1.0.tar.gz $RPMDIR/SOURCES
cp -u src/rpm.spec $RPMDIR/SPECS/parsegraph.spec
rpmbuild $RPMFLAGS $RPMDIR/SPECS/parsegraph.spec

for package in `rpm -q --specfile src/rpm.spec`; do
    arch=`echo $package | grep -E -o '[^.]+$$'`;
    filename="$RPMDIR/RPMS/$arch/$package.rpm";
    [ -e `basename $filename` ] || ln -v -s $filename;
done
[ -e $SRCRPM ] || ln -v -s $RPMDIR/SRPMS/parsegraph-1.0-1`rpmbuild -E '%{?dist}' src/rpm.spec`.src.rpm $SRCRPM
