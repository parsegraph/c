#!/bin/bash

TARGET=${*:-$HOME/src/parsegraph/server/public_html}

mkdir -p $TARGET
mkdir -p $TARGET/doc

make && make install && /bin/cp -vuf *.js www/*.html www/*.css $TARGET && /bin/cp -vuf www/doc/*.html www/doc/*.css $TARGET/doc
