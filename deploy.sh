#!/bin/bash

TARGET=${*:-../public_html}

mkdir -p $TARGET
mkdir -p $TARGET/doc
mkdir -p $TARGET/sitemap

make && make install && /bin/cp -vuf *.js www/*.html www/*.css UnicodeData.txt $TARGET && /bin/cp -vuf www/doc/*.html $TARGET/doc && /bin/cp -vuf www/sitemap/*.html $TARGET/sitemap
