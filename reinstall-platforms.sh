#!/bin/bash

#
# Helper script to reinstall platforms
#

# remove and reinstall the platforms:
ionic cordova platform remove ios
ionic cordova platform remove android

rm -rf platforms/
rm -rf node_modules/
rm -rf plugins/
npm cache clean --force
rm package-lock.json

npm install

ionic cordova platform add ios@6.2.0
ionic cordova platform add android@9.0.0