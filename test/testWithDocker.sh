#!/bin/sh

echo "start testing..."
docker run --name "meetup_town_testing_with_docker" --rm -d -p 4444:4444 -v /dev/shm:/dev/shm selenium/standalone-chrome:3.141.59-xenon
sleep 2
python3 testWithDocker.py
docker kill "meetup_town_testing_with_docker"
echo "...end testing"
