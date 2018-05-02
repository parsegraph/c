#!/bin/bash

TARGET=${*:-../public_html}

mkdir -p $TARGET
mkdir -p $TARGET/doc
mkdir -p $TARGET/doc/graph-js
mkdir -p $TARGET/sitemap

make && make install && /bin/cp -vuf *.js www/*.html www/*.css UnicodeData.txt $TARGET && /bin/cp -vuf www/doc/*.html $TARGET/doc/graph-js
