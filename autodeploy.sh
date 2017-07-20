#!/bin/bash

while true; do
    ./deploy.sh
    inotifywait -e modify -r deploy.sh src www www/doc www/sitemap --format '%w %e' | read file event;
done
