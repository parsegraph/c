#!/bin/bash

./deploy.sh
while inotifywait -e modify -r deploy.sh src www www/doc; do
    ./deploy.sh
done
