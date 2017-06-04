#!/bin/bash

TARGET=${*:-$HOME/src/parsegraph/server/public_html}

mkdir -p $TARGET

make && make install && /bin/cp -vuf *.js www/* $TARGET
