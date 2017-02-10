#!/bin/bash

TARGET=${*:-$HOME/public_html/parsegraph}

mkdir -p $TARGET

watch -n1 "make && make install && /bin/cp -vuf *.js www/* $TARGET"
