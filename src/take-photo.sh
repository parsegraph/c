#!/bin/bash

SIZE=3200x2400
DOWNSIZE=800x600
if test $# -eq 0; then
SCREENSHOT=screen.$$
elif test $# -eq 1; then
SCREENSHOT=$*
elif test $# -eq 2; then
SIZE=$1
shift
SCREENSHOT=$*
else
SIZE=$1
shift
DOWNSIZE=$1
shift
SCREENSHOT=$*
fi

echo size=$SIZE
echo downsize=$DOWNSIZE
echo shot=$SCREENSHOT

./parsegraph_osmesa_text $SIZE $SCREENSHOT.tga
if test $SIZE != $DOWNSIZE; then
    convert -scale $DOWNSIZE -format png $SCREENSHOT.tga $SCREENSHOT.png
else
    convert -format png $SCREENSHOT.tga $SCREENSHOT.png
fi;
rm $SCREENSHOT.tga
