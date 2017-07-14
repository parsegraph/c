#!/bin/bash

./deploy.sh
while inotifywait -e modify -r deploy.sh src www www/doc www/sitemap; do
    ./deploy.sh
done
