#!/bin/sh

echo "start testing..."
docker run -d -p 4444:4444 -v /dev/shm:/dev/shm selenium/standalone-chrome:3.141.59-xenon
python3 testQiita.py 
echo "...end testing"
