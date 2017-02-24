#!/bin/bash

TARGET=${*:-$HOME/public_html/parsegraph}

mkdir -p $TARGET

deploy() {
    make && make install && /bin/cp -vuf *.js www/* $TARGET
}

deploy
while inotifywait -e modify -r src www; do
    deploy
done
