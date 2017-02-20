#!/bin/bash

TARGET=${*:-$HOME/public_html/parsegraph}

mkdir -p $TARGET

while inotifywait -e modify -r src www; do
    make && make install && /bin/cp -vuf *.js www/* $TARGET
done
