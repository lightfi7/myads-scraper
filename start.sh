#!/bin/bash
(cd crawler&&npm i&&node main.js)
sleep 5m
(cd ../scheduler&&npm i&&node main.js)