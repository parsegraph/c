#!/bin/bash

while true; do
    ./deploy.sh
    inotifywait -e modify -r .babelrc webpack.config.js package.json autodeploy.sh deploy.sh src www www/doc www/sitemap --format '%w %e' | read file event;
done
