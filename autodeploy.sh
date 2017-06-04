#!/bin/bash

./deploy.sh
while inotifywait -e modify -r src www; do
    ./deploy.sh
done
